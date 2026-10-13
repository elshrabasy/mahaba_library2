import assert from 'node:assert/strict';
import {generateEVC11001} from '../engine/templates/EVC11001.js';
import {legacyGeometryToV1,v1ToLegacyGeometry} from '../core/adapters/legacy-v1.js';
import {generatedModelToNative} from '../core/adapters/v1-native.js';

const source=generateEVC11001({L:125,W:105,H:88,DT:1,MAT:1,FD:2});
const model=legacyGeometryToV1(source);

assert.equal(model.schema_version,'1.0.0');
assert.equal(model.template.template_id,'EVC11001');
assert.equal(model.material.thickness_mm,source.material.thickness);
assert.equal(model.geometry.cut_paths.length,source.lines.filter(x=>x.type==='cut').length);
assert.equal(model.geometry.crease_paths.length,source.lines.filter(x=>x.type==='crease').length);
assert.equal(model.panels.length,source.panels.length);
assert.equal(model.nesting.outer_polygon.length,source.outline.length);
assert.ok(model.folds.length>0);

const roundtrip=v1ToLegacyGeometry(model);
assert.equal(roundtrip.code,source.code);
assert.equal(roundtrip.width,source.width);
assert.equal(roundtrip.height,source.height);
assert.equal(roundtrip.lines.length,source.lines.length);
assert.equal(roundtrip.panels.length,source.panels.length);
assert.deepEqual(roundtrip.outline,source.outline);

const native=generatedModelToNative(model);
assert.equal(native.source,'mahabat-engine');
assert.equal(native.code,'EVC11001');
assert.equal(native.drawings.length,1);
assert.equal(Object.keys(native.geometries).length,source.panels.length);

console.log(JSON.stringify({
  ok:true,
  contract:'GeneratedPackageModel@1.0.0',
  template:model.template.template_id,
  panels:model.panels.length,
  folds:model.folds.length,
  cuts:model.geometry.cut_paths.length,
  creases:model.geometry.crease_paths.length,
  nativeGeometries:Object.keys(native.geometries).length
},null,2));
