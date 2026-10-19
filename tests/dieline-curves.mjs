import assert from 'node:assert/strict';
import {generateMahabatNative} from '../engine/registry.js';
import {studioSheet} from '../engine/mahabat-adapter.js';
import {drawingPathPoints} from '../core/geometry/path-points.js';
import {buildNestTemplate} from '../studio-src/nesting-bridge.js';
import {svgDrawing,pdfDrawing} from '../studio-src/studio-core.js';

for(const input of [
  {L:125,W:105,H:88,DT:1,MAT:1,FD:2},
  {L:200,W:150,H:300,DT:1,MAT:1,FD:2},
  {L:180,W:120,H:90,DT:1,MAT:2,FD:1},
  {L:190,W:110,H:95,DT:3,MAT:3,FD:2}
]){
  const native=generateMahabatNative('EVC11001',input),part=native.mahabaGeometry[0];
  const before=JSON.stringify(part),sheet=studioSheet(native),template=buildNestTemplate(part);
  const lines=part.lines.filter(line=>line.type==='cut');
  const tuck=part.panels.find(panel=>panel.id==='TUCK');
  let curvedTuck=0;
  for(const [index,line] of lines.entries()){
    const points=sheet.cuts[index];
    assert.deepEqual(points[0],line.a);assert.deepEqual(points.at(-1),line.b);
    assert.deepEqual(template.cuts[index],points,'Nesting and flat preview must preserve the same cut paths');
    if(!line.arc){assert.equal(points.length,2);continue;}
    assert.ok(points.length>2,'Never replace an arc with its endpoint chord');
    for(const point of points.slice(1,-1))assert.ok(Math.abs(Math.hypot(point[0]-line.arc.c[0],point[1]-line.arc.c[1])-line.arc.r)<1e-8);
    if(line.role!=='tuck-edge')continue;
    curvedTuck++;
    for(const point of points)assert.ok(tuck.poly.some(vertex=>Math.hypot(vertex[0]-point[0],vertex[1]-point[1])<1e-8),'Every flat tuck arc sample must match the unfolded 3D panel');
    assert.ok(svgDrawing(sheet).includes(points.map(point=>point.join(',')).join(' ')),'SVG export must retain the curved cut');
    assert.ok(pdfDrawing(sheet).includes((points[1][0]*72/25.4).toFixed(4)),'PDF export must retain the curved cut');
  }
  assert.equal(curvedTuck,2);
  assert.equal(JSON.stringify(part),before,'Rendering must not mutate frozen source geometry');
}
const straight={a:[0,0],b:[1,2]},points=drawingPathPoints(straight);points[0][0]=9;
assert.equal(straight.a[0],0,'Do not share mutable endpoints with the source');
console.log(JSON.stringify({ok:true,curvedTuckCases:4,flatMatches3D:true,nestingAndExports:true}));
