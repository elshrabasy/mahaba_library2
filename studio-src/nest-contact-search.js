// Mahabat NFP contact beam search.
// Explores multiple contact-position seeds so the solver can find 3-up / 5-up
// layouts that a greedy pair-first strategy can miss.

const EPS=1e-6;
const normalize=layout=>{
  if(!layout.length)return layout;
  const minX=Math.min(...layout.map(a=>a.x)),minY=Math.min(...layout.map(a=>a.y));
  return layout.map(a=>({...a,x:a.x-minX,y:a.y-minY}));
};
const signature=layout=>normalize(layout).map(a=>`${a.r}:${a.x.toFixed(2)}:${a.y.toFixed(2)}`).sort().join('|');

function score(engine,layout,vs){
  const d=engine.dims(layout,vs);
  return d.area*1000+d.h*10+d.w;
}

function contactPoints(edges){
  const out=[];
  for(const e of edges||[]){
    const a=e[0],b=e[1];
    out.push(a,b,[(a[0]+b[0])/2,(a[1]+b[1])/2]);
  }
  return out;
}

function addCandidate(out,seen,layout,engine,vs,c){
  const q=normalize(layout),sig=signature(q);
  if(seen.has(sig))return;
  seen.add(sig);
  const check=engine.validate(q,vs,c,false);
  if(!check.ok)return;
  const d=engine.dims(q,vs);
  if(d.w>c.W+EPS||d.h>c.H+EPS)return;
  out.push({layout:q,score:score(engine,q,vs),w:d.w,h:d.h,area:d.area});
}

function expand(engine,vs,pairs,c,layout,maxPerNode=120){
  const out=[],seen=new Set(),required=Number(c.clearance||0)+Number(engine.SAFETY||0);
  for(const r of c.angles){
    const v=vs[r/90];if(!v||v.w>c.W+EPS||v.h>c.H+EPS)continue;
    const raw=[];
    raw.push({r,x:0,y:0},{r,x:Math.max(0,c.W-v.w),y:0},{r,x:0,y:Math.max(0,c.H-v.h)});
    for(const a of layout){
      const av=vs[a.r/90],edges=pairs[`${a.r},${r}`]||[];
      for(const p of contactPoints(edges)){
        raw.push({r,x:a.x+p[0],y:a.y+p[1]});
        raw.push({r,x:a.x+p[0]+required,y:a.y+p[1]});
        raw.push({r,x:a.x+p[0]-required,y:a.y+p[1]});
        raw.push({r,x:a.x+p[0],y:a.y+p[1]+required});
        raw.push({r,x:a.x+p[0],y:a.y+p[1]-required});
      }
      raw.push({r,x:a.x+av.w+required,y:a.y});
      raw.push({r,x:a.x-v.w-required,y:a.y});
      raw.push({r,x:a.x,y:a.y+av.h+required});
      raw.push({r,x:a.x,y:a.y-v.h-required});
    }
    raw.sort((p,q)=>{
      const dp=engine.dims([...layout,p],vs),dq=engine.dims([...layout,q],vs);
      return dp.area-dq.area||dp.h-dq.h||dp.w-dq.w;
    });
    for(const p of raw.slice(0,maxPerNode))addCandidate(out,seen,[...layout,p],engine,vs,c);
  }
  out.sort((a,b)=>a.score-b.score);
  return out;
}

export function contactBeamSearch(engine,T,N,c,{beamWidth=18,maxDepth=6,onProgress=()=>{}}={}){
  const vs=engine.makeVariants(T),pairs=engine.makePairNFP(N,vs),results=[],globalSeen=new Set();
  let beam=[];
  for(const r of c.angles){
    const v=vs[r/90];if(v&&v.w<=c.W+EPS&&v.h<=c.H+EPS)beam.push({layout:[{r,x:0,y:0}],score:v.w*v.h*1000});
  }
  for(let depth=1;depth<Math.min(maxDepth,12);depth++){
    const next=[];
    for(const node of beam){
      for(const cand of expand(engine,vs,pairs,c,node.layout,140)){
        const sig=signature(cand.layout);if(globalSeen.has(sig))continue;globalSeen.add(sig);next.push(cand);
      }
    }
    if(!next.length)break;
    next.sort((a,b)=>b.layout.length-a.layout.length||a.score-b.score);
    beam=next.slice(0,beamWidth);
    for(const node of beam){
      const check=engine.validate(node.layout,vs,c,true);
      if(!check.ok)continue;
      results.push({layout:node.layout,name:`Contact Beam · ${node.layout.length} pcs`,recipe:'contact-beam',minGap:Number.isFinite(check.min)?check.min:null,...engine.dims(node.layout,vs)});
    }
    onProgress({stage:`بحث نقاط التلامس · ${depth+1} قطع`,done:depth,total:maxDepth-1,best:beam[0]?.layout.length||0});
  }
  const seen=new Set(),unique=[];
  results.sort((a,b)=>b.layout.length-a.layout.length||a.area-b.area||a.h-b.h);
  for(const r of results){const s=signature(r.layout);if(seen.has(s))continue;seen.add(s);unique.push(r);if(unique.length>=8)break;}
  return {results:unique,variants:vs};
}
