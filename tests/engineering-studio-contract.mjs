import assert from 'node:assert/strict';
import {generateMahabatNative} from '../engine/registry.js';

const ste=generateMahabatNative('STE',{L:215,W:80,H:45,dimension_mode:'ID',material_id:'FBB-350-055',grain_direction:'Y',glue_flap:15,bleed:3,safe_margin:4});
assert.equal(ste.engineeringModel.schema_version,'1.0.0');
assert.equal(ste.engineeringModel.template.template_id,'MAH-FEC-STE-001');
assert.equal(ste.engineering.template_id,'MAH-FEC-STE-001');
assert.ok(ste.engineering.metrics.blank_area_mm2>0);
assert.ok(ste.engineering.validation.checks.some(x=>x.id==='structure.fold_collision'&&x.status==='NEEDS_REVIEW'));
assert.ok(ste.engineering.validation.checks.some(x=>x.id==='nesting.spacing'&&x.status==='PASS'));
assert.ok(ste.engineering.validation.checks.some(x=>x.id==='printing.safe_margin'&&x.status==='PASS'));

const corr=generateMahabatNative('EVC11001',{L:125,W:105,H:88,DT:1,MAT:1,FD:2});
assert.equal(corr.engineeringModel.schema_version,'1.0.0');
assert.equal(corr.engineering.template_id,'EVC11001');
assert.ok(Array.isArray(corr.engineering.validation.checks));

console.log(JSON.stringify({ok:true,steConfidence:ste.engineering.validation.production_confidence,steChecks:ste.engineering.validation.checks.length,corrTemplate:corr.engineering.template_id},null,2));
