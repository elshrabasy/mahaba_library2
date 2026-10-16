// Mahabat predefined nesting recipes.
// Fast pattern candidates are generated before the heavier NFP solver.
// All accepted layouts are still guarded by NestEngine.validate on true polygons.
import {generate2x2TemplateSolutions} from './nest-layout-templates.js';

const EPS=1e-6;
const uniq=(arr,eps=.05)=>{const out=[];for(const v of arr.sort((a,b)=>a-b))if(!out.length||Math.abs(v-out.at(-1))>eps)out.push(v);return out;};
const normalize=layout=>{if(!layout.length)return layout;const minX=Math.min(...layout.map(a=>a.x)),minY=Math.min(...layout.map(a=>a.y));return layout.map(a=>({...a,x:a.x-minX,y:a.y-minY}));};
const signature=layout=>layout.map(a=>`${a.r}:${a.x.toFixed(2)}:${a.y.toFixed(2)}`).join('|');
const trim=(vals,limit,min,max)=>{const clean=uniq(vals).filter(v=>v>=min-EPS&&v<=max+EPS);if(clean.length<=limit)return clean;const step=(clean.length-1)/(limit-1),out=[];for(let i=0;i<limit;i++)out.push(clean[Math.round(i*step)]);return uniq(out);};

function result(engine,layout,vs,c,name,recipe){const q=normalize(layout),check=engine.validate(q,vs,c,true);if(!q.length||!check.ok)return null;return {layout:q,name,recipe,minGap:Number.isFinite(check.min)?check.min:null,...engine.dims(q,vs)};}
function regular(engine,T,c){const out=engine.regularSolution(T,c);return (out.results||[]).map(x=>({...x,recipe:'regular'}));}
function alternate180(engine,T,c){if(!c.angles.includes(0)||!c.angles.includes(180))return [];const vs=engine.makeVariants(T),gap=c.clearance+engine.SAFETY,a=vs[0],b=vs[2],results=[],pitchX=Math.max(a.w,b.w)+gap,pitchY=Math.max(a.h,b.h)+gap,nx=Math.floor((c.W+gap)/pitchX),ny=Math.floor((c.H+gap)/pitchY);if(nx>0&&ny>0){const layout=[];for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)layout.push({r:(x+y)%2?180:0,x:x*pitchX,y:y*pitchY});const r=result(engine,layout,vs,c,'Alternate 180°','alternate-180');if(r)results.push(r);}return results;}
function pairCandidates(va,vb,required){const xs=[],ys=[];for(const a of va.p)for(const b of vb.p){const dx=a[0]-b[0],dy=a[1]-b[1];xs.push(dx,dx-required,dx+required);ys.push(dy,dy-required,dy+required);}xs.push(-vb.w-required,-vb.w,0,va.w,va.w+required);ys.push(-vb.h-required,-vb.h,0,va.h,va.h+required);return {xs:trim(xs,72,-vb.w-required,va.w+required),ys:trim(ys,72,-vb.h-required,va.h+required)};}

export function findInterlockPair(engine,T,c,ra=0,rb=180){if(!c.angles.includes(ra)||!c.angles.includes(rb))return null;const vs=engine.makeVariants(T),va=vs[ra/90],vb=vs[rb/90],required=c.clearance+engine.SAFETY,{xs,ys}=pairCandidates(va,vb,required);let best=null,bestScore=Infinity;const temp={...c,W:Math.max(c.W,va.w+vb.w+required)*2,H:Math.max(c.H,va.h+vb.h+required)*2,angles:[ra,rb]};for(const x of xs)for(const y of ys){const pair=normalize([{r:ra,x:0,y:0},{r:rb,x,y}]),check=engine.validate(pair,vs,temp,true);if(!check.ok)continue;const d=engine.dims(pair,vs);if(d.w>c.W+EPS||d.h>c.H+EPS)continue;const score=d.area*1000+d.h;if(score<bestScore){bestScore=score;best={layout:pair,w:d.w,h:d.h,area:d.area,minGap:check.min};}}return best;}

// EngView-style residual-space fill: do not stop after discovering a good 0/180 pair.
// Try to insert one more one-up into the negative/unused area around the validated seed.
function growSeedByOne(engine,T,c,seed){
  if(!seed?.layout?.length)return null;
  const vs=engine.makeVariants(T),required=Number(c.clearance||0)+Number(engine.SAFETY||0),base=normalize(seed.layout),options=[];
  for(const r of c.angles){
    const v=vs[r/90];if(!v||v.w>c.W+EPS||v.h>c.H+EPS)continue;
    const xs=[0,c.W-v.w],ys=[0,c.H-v.h];
    for(const a of base){
      const av=vs[a.r/90];
      xs.push(a.x-v.w-required,a.x-v.w,a.x,a.x+av.w,a.x+av.w+required);
      ys.push(a.y-v.h-required,a.y-v.h,a.y,a.y+av.h,a.y+av.h+required);
      for(const pa of av.p){const gx=pa[0]+a.x,gy=pa[1]+a.y;for(const pb of v.p){xs.push(gx-pb[0]-required,gx-pb[0],gx-pb[0]+required);ys.push(gy-pb[1]-required,gy-pb[1],gy-pb[1]+required);}}
    }
    const xx=trim(xs,96,0,c.W-v.w),yy=trim(ys,96,0,c.H-v.h);
    for(const x of xx)for(const y of yy){
      const p={r,x,y},d=engine.dims([...base,p],vs);
      options.push({p,score:d.area*1000+d.h*10+d.w});
    }
  }
  options.sort((a,b)=>a.score-b.score);
  let best=null,bestScore=Infinity;
  // Validate the most compact critical placements first; this keeps mobile workers responsive.
  for(const o of options.slice(0,6000)){
    const layout=normalize([...base,o.p]),check=engine.validate(layout,vs,c,true);if(!check.ok)continue;
    const d=engine.dims(layout,vs),score=d.area*1000+d.h*10+d.w;
    if(score<bestScore){bestScore=score;best={layout,w:d.w,h:d.h,area:d.area,minGap:check.min};}
  }
  return best;
}

function growSeed(engine,T,c,seed,maxExtra=4){
  let current=seed,best=seed;
  for(let i=0;i<maxExtra;i++){
    const next=growSeedByOne(engine,T,c,current);if(!next||next.layout.length<=current.layout.length)break;
    current=next;best=next;
  }
  return best;
}

function repeatCluster(engine,T,c,pair){if(!pair)return [];const vs=engine.makeVariants(T),gap=c.clearance+engine.SAFETY,results=[];for(const stagger of [false,true]){const pitchX=pair.w+gap,pitchY=pair.h+gap,layout=[],rows=Math.max(1,Math.floor((c.H+gap)/pitchY));for(let row=0;row<rows;row++){const offset=stagger&&row%2?pitchX/2:0,cols=Math.max(0,Math.floor((c.W-offset+gap)/pitchX));for(let col=0;col<cols;col++)for(const p of pair.layout)layout.push({...p,x:p.x+offset+col*pitchX,y:p.y+row*pitchY});}const r=result(engine,layout,vs,c,stagger?'Interlock Pair · Staggered':'Interlock Pair · 0°/180°','interlock-pair');if(r)results.push(r);}return results;}

export function generatePatternSolutions(engine,T,c){
  const vs=engine.makeVariants(T),all=[];
  all.push(...regular(engine,T,c));
  all.push(...generate2x2TemplateSolutions(engine,T,c));
  all.push(...alternate180(engine,T,c));
  const pair=findInterlockPair(engine,T,c,0,180);
  all.push(...repeatCluster(engine,T,c,pair));
  if(pair){
    const grown=growSeed(engine,T,c,pair,4);
    if(grown?.layout?.length>pair.layout.length){
      const g=result(engine,grown.layout,vs,c,`Residual Fill · ${grown.layout.length} pcs`,'residual-fill');
      if(g)all.push(g);
    }
  }
  const seen=new Set(),filtered=[];
  for(const x of all){const s=signature(x.layout);if(seen.has(s))continue;seen.add(s);filtered.push(x);}
  filtered.sort((a,b)=>b.layout.length-a.layout.length||a.area-b.area||a.h-b.h);
  return {results:filtered.slice(0,14),pair,variants:vs};
}
