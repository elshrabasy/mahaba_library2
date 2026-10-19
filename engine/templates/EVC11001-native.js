import {generateEVC11001 as generateBase} from './EVC11001.js';
import {drawingPathPoints} from '../../core/geometry/path-points.js';

const EPS=1e-7;
const same=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<EPS;

function exactTuckPolygon(result){
  const tuck=result.panels?.find(p=>p.id==='TUCK');
  if(!tuck?.hinge)return;
  const edge=result.lines?.filter(l=>l.type==='cut'&&l.role==='tuck-edge')||[];
  if(edge.length!==3)return;
  const ordered=[];
  for(const l of edge){const pts=drawingPathPoints(l);if(ordered.length&&same(ordered.at(-1),pts[0]))ordered.push(...pts.slice(1));else ordered.push(...pts);}
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
