import {generateEVC11001 as generateBase} from './EVC11001.js';

const EPS=1e-7;
const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<EPS;

function sampleArc(line){
  if(!line.arc)return [line.a,line.b];
  const {c,r}=line.arc;
  let a0=Math.atan2(line.a[1]-c[1],line.a[0]-c[0]);
  let a1=Math.atan2(line.b[1]-c[1],line.b[0]-c[0]);
  let d=a1-a0;
  while(d>Math.PI)d-=Math.PI*2;
  while(d<-Math.PI)d+=Math.PI*2;
  const n=Math.max(3,Math.ceil(Math.abs(d)/(Math.PI/36))),out=[line.a];
  for(let i=1;i<n;i++){const a=a0+d*i/n;out.push([c[0]+r*Math.cos(a),c[1]+r*Math.sin(a)];}
  out.push(line.b);return out;
}

function exactTuckPolygon(result){
  const tuck=result.panels?.find(p=>p.id==='TUCK');
  if(!tuck?.hinge)return;
  const edge=result.lines?.filter(l=>l.type==='cut'&&l.role==='tuck-edge')||[];
  if(edge.length!==3)return;
  const ordered=[];
  for(const l of edge){const pts=sampleArc(l);if(ordered.length&&same(ordered.at(-1),pts[0]))ordered.push(...pts.slice(1));else ordered.push(...pts);}
  if(ordered.length<4)return;
  const hinge=[...tuck.hinge].sort((a,b)=>a[0]-b[0]),leftH=hinge[0],rightH=hinge[1];
  let outer=ordered;if(outer[0][0]<outer.at(-1)[0])outer=[...outer].reverse();
  const rightOuter=outer[0],leftOuter=outer.at(-1),rightShoulder=[rightH[0],rightOuter[1]],leftShoulder=[leftH[0],leftOuter[1]];
  tuck.poly=[leftH,rightH,rightShoulder,...outer,leftShoulder];
  tuck.nativeSilhouetteSource='exact-cut-path';
}

export function generateEVC11001(input={},options={}){
  const result=generateBase(input,options);
  exactTuckPolygon(result);
  return result;
}
