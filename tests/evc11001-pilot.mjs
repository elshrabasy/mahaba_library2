import assert from 'node:assert/strict';
import {generateEVC11001,EngineInputError} from '../engine/templates/EVC11001.js';
import {toStudioNativeModel,studioSheet} from '../engine/mahabat-adapter.js';
import {buildMahabatNative} from '../engine/mahabat-native.js';

function checkGeometry(g){
  assert.equal(g.code,'EVC11001');
  assert.equal(g.validation.status,'PASS');
  assert.ok(g.width>0&&g.height>0);
  assert.ok(g.lines.some(x=>x.type==='cut'));
  assert.ok(g.lines.some(x=>x.type==='crease'));
  assert.ok(g.outline.length>=3);
  assert.ok(g.panels.length>=8);
}

const original=generateEVC11001({L:125,W:105,H:88,DT:1,MAT:1,FD:2});
checkGeometry(original);
assert.equal(original.material.thickness,1.5);

const eSafe=generateEVC11001({L:300,W:50,H:150,DT:1,MAT:1,FD:2},{proportionSafe:true});
checkGeometry(eSafe);
assert.equal(eSafe.material.name,'E Flute');

const cSafe=generateEVC11001({L:300,W:50,H:150,DT:1,MAT:3,FD:2},{proportionSafe:true});
checkGeometry(cSafe);
assert.equal(cSafe.material.thickness,4);
assert.notEqual(cSafe.width,eSafe.width,'material thickness must affect geometry');

const studio=toStudioNativeModel(eSafe);
assert.equal(studio.source,'mahabat-engine');
assert.equal(studio.drawings.length,1);
const sheet=studioSheet(studio,0);
assert.equal(sheet.source,'mahabat-engine');
assert.ok(sheet.cuts.length>0&&sheet.creases.length>0);
assert.deepEqual([sheet.width,sheet.height],[eSafe.width,eSafe.height]);

const native=buildMahabatNative(eSafe);
assert.equal(native.source,'mahabat-engine');
assert.equal(native.unitMeter,.001);
assert.equal(native.drawings.length,1);
assert.ok(Object.keys(native.geometries).length>=eSafe.panels.length);
assert.ok(native.node.children.length>0);
assert.ok(native.materials.outside.values.sheetTexMatrix_Uni.length===8);
assert.ok(native.materials.inside.values.sheetTexMatrix_Uni.length===8);
assert.ok(native.materials.outside.values.sheetTexMatrix_Uni[0]>0);
assert.ok(native.materials.inside.values.sheetTexMatrix_Uni[0]<0);
for(const geometry of Object.values(native.geometries)){
  assert.ok(geometry.index.length>0);
  assert.deepEqual(geometry.groups.map(g=>g.symbol),['OUT','IN','EDGE','FLUTE']);
  assert.equal(geometry.attributes.POSITION.array.length,geometry.attributes.NORMAL.array.length);
}

assert.throws(()=>generateEVC11001({L:100,W:120,H:80,MAT:1,DT:1,FD:2}),EngineInputError);

console.log(JSON.stringify({
  ok:true,
  template:'EVC11001',
  cases:5,
  original:[original.width,original.height],
  eFluteSafe:[eSafe.width,eSafe.height],
  cFluteSafe:[cSafe.width,cSafe.height],
  panels:eSafe.panels.length,
  nativeGeometries:Object.keys(native.geometries).length,
  cuts:sheet.cuts.length,
  creases:sheet.creases.length,
  artworkSurfaces:['outside','inside']
},null,2));
