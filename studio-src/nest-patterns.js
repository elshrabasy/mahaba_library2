// Mahabat predefined nesting recipes.
// Fast pattern candidates are generated before the heavier NFP solver.
// All accepted layouts are still guarded by NestEngine.validate on true polygons.
import {generate2x2TemplateSolutions} from './nest-layout-templates.js';
import {createInterlockSearch,compareNestingLayouts} from './nest-pair-interlock.js?v=20261017-5';

const signature=layout=>layout.map(a=>`${a.r}:${a.x.toFixed(2)}:${a.y.toFixed(2)}`).join('|');

function result(engine,layout,variants,config,name,recipe){
  const check=engine.validate(layout,variants,config,true);
  return layout.length&&check.ok?{layout,name,recipe,minGap:Number.isFinite(check.min)?check.min:null,...engine.dims(layout,variants)}:null;
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

export function findInterlockPair(engine,T,c,ra=0,rb=180){
  return createInterlockSearch(engine,T,c).findPairs(ra,rb)[0]||null;
}

export function generatePatternSolutions(engine,T,c,{interlockSearch=createInterlockSearch(engine,T,c)}={}){
  const vs=engine.makeVariants(T),all=[];
  all.push(...regular(engine,T,c));
  all.push(...generate2x2TemplateSolutions(engine,T,c));
  all.push(...alternate180(engine,T,c));
  const pairs=[...interlockSearch.findPairs(0,180),...interlockSearch.findPairs(180,0)].sort(compareNestingLayouts);
  const pair=pairs[0]||null;
  const footprints=new Set(),clusters=[];
  const gap=c.clearance+engine.SAFETY;
  const capacity=cluster=>Math.floor((c.W+gap)/(cluster.w+gap))*Math.floor((c.H+gap)/(cluster.h+gap));
  for(const cluster of [...pairs].sort((first,second)=>capacity(second)-capacity(first)||compareNestingLayouts(first,second))){
    const footprint=`${cluster.w.toFixed(2)},${cluster.h.toFixed(2)}`;
    if(footprints.has(footprint))continue;
    footprints.add(footprint);clusters.push(cluster);
    if(clusters.length>=4)break;
  }
  for(const cluster of clusters)all.push(...interlockSearch.repeatCluster(cluster));
  const seen=new Set(),filtered=[];
  for(const x of all){const s=signature(x.layout);if(seen.has(s))continue;seen.add(s);filtered.push(x);}
  filtered.sort(compareNestingLayouts);
  return {results:filtered.slice(0,12),pair,pairs,variants:vs};
}
