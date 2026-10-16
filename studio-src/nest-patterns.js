// Mahabat predefined nesting recipes.
// Fast pattern candidates are generated before the heavier NFP solver.
// All accepted layouts are still guarded by NestEngine.validate on true polygons.
import {generate2x2TemplateSolutions} from './nest-layout-templates.js';

const EPS=1e-6;
const uniq=(arr,eps=.05)=>{
  const out=[];
  for(const v of arr.sort((a,b)=>a-b))if(!out.length||Math.abs(v-out.at(-1))>eps)out.push(v);
  return out;
};
const normalize=layout=>{
  if(!layout.length)return layout;
  const minX=Math.min(...layout.map(a=>a.x)),minY=Math.min(...layout.map(a=>a.y));
  return layout.map(a=>({...a,x:a.x-minX,y:a.y-minY}));
};
const signature=layout=>layout.map(a=>`${a.r}:${a.x.toFixed(2)}:${a.y.toFixed(2)}`).join('|');

function result(engine,layout,vs,c,name,recipe){
  const q=normalize(layout);
  const check=engine.validate(q,vs,c,true);
  if(!q.length||!check.ok)return null;
  return {layout:q,name,recipe,minGap:Number.isFinite(check.min)?check.min:null,...engine.dims(q,vs)};
}

function regular(engine,T,c){
  const out=engine.regularSolution(T,c);
  return (out.results||[]).map(x=>({...x,recipe:'regular'}));
}

function alternate180(engine,T,c){
  if(!c.angles.includes(0)||!c.angles.includes(180))return [];
  const vs=engine.makeVariants(T),gap=c.clearance+engine.SAFETY,a=vs[0],b=vs[2],results=[];
  const pitchX=Math.max(a.w,b.w)+gap,pitchY=Math.max(a.h,b.h)+gap;
  const nx=Math.floor((c.W+gap)/pitchX),ny=Math.floor((c.H+gap)/pitchY);
  if(nx>0&&ny>0){const layout=[];for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)layout.push({r:(x+y)%2?180:0,x:x*pitchX,y:y*pitchY});const r=result(engine,layout,vs,c,'Alternate 180°','alternate-180');if(r)results.push(r);}
  return results;
}

function pairCandidates(va,vb,required){
  const xs=[],ys=[];
  for(const a of va.p)for(const b of vb.p){const dx=a[0]-b[0],dy=a[1]-b[1];xs.push(dx,dx-required,dx+required);ys.push(dy,dy-required,dy+required);}
  xs.push(-vb.w-required,-vb.w,0,va.w,va.w+required);
  ys.push(-vb.h-required,-vb.h,0,va.h,va.h+required);
  const trim=(vals,limit,min,max)=>{
    const clean=uniq(vals).filter(v=>v>=min-EPS&&v<=max+EPS);
    if(clean.length<=limit)return clean;
    const step=(clean.length-1)/(limit-1),out=[];for(let i=0;i<limit;i++)out.push(clean[Math.round(i*step)]);return uniq(out);
  };
  return {xs:trim(xs,72,-vb.w-required,va.w+required),ys:trim(ys,72,-vb.h-required,va.h+required)};
}

export function findInterlockPair(engine,T,c,ra=0,rb=180){
  if(!c.angles.includes(ra)||!c.angles.includes(rb))return null;
  const vs=engine.makeVariants(T),va=vs[ra/90],vb=vs[rb/90],required=c.clearance+engine.SAFETY,{xs,ys}=pairCandidates(va,vb,required);
  let best=null,bestScore=Infinity;
  const temp={...c,W:Math.max(c.W,va.w+vb.w+required)*2,H:Math.max(c.H,va.h+vb.h+required)*2,angles:[ra,rb]};
  for(const x of xs)for(const y of ys){
    const pair=normalize([{r:ra,x:0,y:0},{r:rb,x,y}]);
    const check=engine.validate(pair,vs,temp,true);if(!check.ok)continue;
    const d=engine.dims(pair,vs);if(d.w>c.W+EPS||d.h>c.H+EPS)continue;
    const score=d.area*1000+d.h;
    if(score<bestScore){bestScore=score;best={layout:pair,w:d.w,h:d.h,area:d.area,minGap:check.min};}
  }
  return best;
}

function repeatCluster(engine,T,c,pair){
  if(!pair)return [];
  const vs=engine.makeVariants(T),gap=c.clearance+engine.SAFETY,results=[];
  for(const stagger of [false,true]){
    const pitchX=pair.w+gap,pitchY=pair.h+gap,layout=[];
    const rows=Math.max(1,Math.floor((c.H+gap)/pitchY));
    for(let row=0;row<rows;row++){
      const offset=stagger&&row%2?pitchX/2:0;
      const cols=Math.max(0,Math.floor((c.W-offset+gap)/pitchX));
      for(let col=0;col<cols;col++)for(const p of pair.layout)layout.push({...p,x:p.x+offset+col*pitchX,y:p.y+row*pitchY});
    }
    const r=result(engine,layout,vs,c,stagger?'Interlock Pair · Staggered':'Interlock Pair · 0°/180°','interlock-pair');if(r)results.push(r);
  }
  return results;
}

export function generatePatternSolutions(engine,T,c){
  const vs=engine.makeVariants(T),all=[];
  all.push(...regular(engine,T,c));
  all.push(...generate2x2TemplateSolutions(engine,T,c));
  all.push(...alternate180(engine,T,c));
  const pair=findInterlockPair(engine,T,c,0,180);all.push(...repeatCluster(engine,T,c,pair));
  const seen=new Set(),filtered=[];
  for(const x of all){const s=signature(x.layout);if(seen.has(s))continue;seen.add(s);filtered.push(x);}
  filtered.sort((a,b)=>b.layout.length-a.layout.length||a.area-b.area||a.h-b.h);
  return {results:filtered.slice(0,12),pair,variants:vs};
}
