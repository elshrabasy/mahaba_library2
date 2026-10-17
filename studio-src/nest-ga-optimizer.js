// Mahabat GA-NFP Optimizer V1
// Inspired by SVGnest's search strategy (population + rotation mutation), but uses
// Mahabat's own exact polygon validator and production constraints.
// It does NOT alter dieline geometry.

const EPS=1e-6;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const normalize=layout=>{
  if(!layout.length)return layout;
  const minX=Math.min(...layout.map(a=>a.x)),minY=Math.min(...layout.map(a=>a.y));
  return layout.map(a=>({...a,x:a.x-minX,y:a.y-minY}));
};
const sig=layout=>normalize(layout).map(a=>`${a.r}:${a.x.toFixed(2)}:${a.y.toFixed(2)}`).sort().join('|');

function seeded(seed=123456789){let s=seed>>>0;return()=>((s=(1664525*s+1013904223)>>>0)/4294967296);}
function pick(rng,a){return a[Math.floor(rng()*a.length)%a.length];}
function polygonArea(p){return Math.abs((p||[]).reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0]},0)/2);}

function compactScore(engine,layout,vs,c){
  const d=engine.dims(layout,vs),sheet=Math.max(1,c.W*c.H),used=Math.max(1,d.area);
  // Primary goal: more pieces. Secondary: compact envelope and lower height.
  return layout.length*1e9-(used/sheet)*1e6-d.h*100-d.w;
}

function criticalPositions(engine,layout,vs,c,r,limit=900){
  const v=vs[r/90],required=Number(c.clearance||0)+Number(engine.SAFETY||0);
  if(!v||v.w>c.W+EPS||v.h>c.H+EPS)return [];
  const xs=[0,Math.max(0,c.W-v.w)],ys=[0,Math.max(0,c.H-v.h)];
  for(const a of layout){
    const av=vs[a.r/90];
    xs.push(a.x-v.w-required,a.x-v.w,a.x,a.x+av.w,a.x+av.w+required);
    ys.push(a.y-v.h-required,a.y-v.h,a.y,a.y+av.h,a.y+av.h+required);
    // Vertex-to-vertex contact candidates expose concave pockets missed by bbox-only placement.
    const ap=(av.p||[]),bp=(v.p||[]);
    const stepA=Math.max(1,Math.ceil(ap.length/28)),stepB=Math.max(1,Math.ceil(bp.length/28));
    for(let i=0;i<ap.length;i+=stepA){
      const pa=ap[i],gx=a.x+pa[0],gy=a.y+pa[1];
      for(let j=0;j<bp.length;j+=stepB){const pb=bp[j];xs.push(gx-pb[0]-required,gx-pb[0],gx-pb[0]+required);ys.push(gy-pb[1]-required,gy-pb[1],gy-pb[1]+required);}
    }
  }
  const uniq=(arr,min,max)=>[...new Set(arr.filter(Number.isFinite).map(x=>Math.round(x*20)/20).filter(x=>x>=min-EPS&&x<=max+EPS))];
  const xx=uniq(xs,0,c.W-v.w),yy=uniq(ys,0,c.H-v.h),cand=[];
  for(const x of xx)for(const y of yy){
    const p={r,x,y},d=engine.dims([...layout,p],vs);
    cand.push({p,score:d.area*1000+d.h*10+d.w});
  }
  cand.sort((a,b)=>a.score-b.score);
  return cand.slice(0,limit).map(x=>x.p);
}

function placeGenome(engine,T,c,genome){
  const vs=engine.makeVariants(T),layout=[];
  for(const r of genome){
    let best=null,bestScore=Infinity;
    for(const p of criticalPositions(engine,layout,vs,c,r,layout.length<2?1400:900)){
      const q=normalize([...layout,p]);
      if(!engine.validate(q,vs,c,false).ok)continue;
      const d=engine.dims(q,vs),score=d.area*1000+d.h*10+d.w;
      if(score<bestScore){bestScore=score;best=p;}
    }
    if(!best)continue;
    layout.push(best);
  }
  const q=normalize(layout),check=engine.validate(q,vs,c,true),d=engine.dims(q,vs);
  return {layout:q,valid:check.ok,minGap:Number.isFinite(check.min)?check.min:null,...d,fitness:check.ok?compactScore(engine,q,vs,c):-Infinity};
}

function randomGenome(rng,angles,n){return Array.from({length:n},()=>pick(rng,angles));}
function mutate(rng,g,angles,rate){
  const q=[...g];
  for(let i=0;i<q.length;i++)if(rng()<rate)q[i]=pick(rng,angles);
  if(q.length>1&&rng()<rate){const a=Math.floor(rng()*q.length),b=Math.floor(rng()*q.length);[q[a],q[b]]=[q[b],q[a]];}
  return q;
}
function crossover(rng,a,b){const n=Math.min(a.length,b.length),cut=Math.floor(rng()*Math.max(1,n));return a.slice(0,cut).concat(b.slice(cut,n));}

export function gaNestingOptimize(engine,T,c,opts={}){
  const angles=[...new Set((opts.angles||c.angles||[0,180]).filter(a=>[0,90,180,270].includes(a)))];
  const rng=seeded(Number(opts.seed||20261017));
  const popSize=clamp(Number(opts.population||18),6,72),generations=clamp(Number(opts.generations||20),2,120),mutation=clamp(Number(opts.mutation??0.18),0.01,0.7);
  const approx=Math.max(1,Math.floor((c.W*c.H)/Math.max(1,polygonArea(T.polygon))));
  const genomeLength=clamp(Number(opts.maxParts||Math.min(approx+3,14)),1,30);
  const onProgress=typeof opts.onProgress==='function'?opts.onProgress:()=>{};
  const seeds=[];
  // Deterministic production-friendly seeds before random population.
  for(const a of angles)seeds.push(Array(genomeLength).fill(a));
  if(angles.includes(0)&&angles.includes(180))seeds.push(Array.from({length:genomeLength},(_,i)=>i%2?180:0));
  if(angles.includes(90))seeds.push(Array.from({length:genomeLength},(_,i)=>i%3===2?90:0));
  let population=seeds.slice(0,popSize);
  while(population.length<popSize)population.push(randomGenome(rng,angles,genomeLength));
  const bestBySig=new Map();let globalBest=null;
  for(let gen=0;gen<generations;gen++){
    const evaluated=population.map(genome=>({genome,placed:placeGenome(engine,T,c,genome)})).sort((a,b)=>b.placed.fitness-a.placed.fitness);
    for(const e of evaluated){
      if(!e.placed.valid||!e.placed.layout.length)continue;
      const k=sig(e.placed.layout),prev=bestBySig.get(k);if(!prev||e.placed.fitness>prev.placed.fitness)bestBySig.set(k,e);
      if(!globalBest||e.placed.fitness>globalBest.placed.fitness)globalBest=e;
    }
    onProgress({stage:`GA nesting · generation ${gen+1}/${generations}`,done:gen,total:generations,best:globalBest?.placed.layout.length||0,generation:gen+1});
    const elite=evaluated.slice(0,Math.max(2,Math.ceil(popSize*.25)));
    const next=elite.slice(0,2).map(e=>[...e.genome]);
    while(next.length<popSize){const a=pick(rng,elite).genome,b=pick(rng,elite).genome;next.push(mutate(rng,crossover(rng,a,b),angles,mutation));}
    population=next;
  }
  const results=[...bestBySig.values()].map(e=>({layout:e.placed.layout,name:`GA Smart · ${e.placed.layout.length} pcs`,recipe:'ga-nfp',minGap:e.placed.minGap,w:e.placed.w,h:e.placed.h,area:e.placed.area,fitness:e.placed.fitness})).sort((a,b)=>b.layout.length-a.layout.length||a.area-b.area||a.h-b.h).slice(0,10);
  return {results,variants:engine.makeVariants(T),generations,population:popSize,mutation};
}
