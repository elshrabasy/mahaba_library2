import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateStraightTuckEnd} from '../templates/straight-tuck-end/generate.js';
import {evaluateBenchmark} from '../core/benchmark/evaluate.js';

const benchmark=JSON.parse(fs.readFileSync(new URL('../benchmarks/straight-tuck-end/reference-v1.json',import.meta.url),'utf8'));
const c=benchmark.cases[0],model=generateStraightTuckEnd(c.input),actual={
  'final.length':model.parameters.L,
  'final.width':model.parameters.W,
  'final.height':model.parameters.H,
  'material.thickness':model.material.thickness_mm,
  'panels.count':model.panels.length,
  'folds.count':model.folds.length,
  'dieline.width':model.nesting.bounds.width,
  'dieline.height':model.nesting.bounds.height,
  'crease.compensation':model.parameters.resolved.fold90,
  'nesting.readiness':Array.isArray(model.nesting.outer_polygon)&&model.nesting.outer_polygon.length>=3,
  'metrics.extraction':Number.isFinite(model.metrics.blank_area_mm2)&&Number.isFinite(model.metrics.crease_length_mm),
  'production.validation':Array.isArray(model.validation.checks)&&model.validation.checks.length>0
};
const hydrated={...benchmark,cases:benchmark.cases.map(x=>({...x,checks:x.checks.map(ch=>({...ch,actual:actual[ch.id]}))}))};
const result=evaluateBenchmark(hydrated),checks=result.cases[0].checks,byId=id=>checks.find(x=>x.id===id);
for(const id of ['final.length','final.width','final.height','material.thickness','panels.count','folds.count','nesting.readiness','metrics.extraction','production.validation'])assert.equal(byId(id).status,'PASS',`${id} must pass internal reference contract`);
for(const id of ['dieline.width','dieline.height','crease.compensation'])assert.equal(byId(id).status,'NEEDS_REVIEW',`${id} must remain pending external calibration`);
assert.equal(result.status,'NEEDS_REVIEW');
console.log(JSON.stringify({ok:true,template:benchmark.template_id,status:result.status,pass:checks.filter(x=>x.status==='PASS').length,needsReview:checks.filter(x=>x.status==='NEEDS_REVIEW').length,fail:checks.filter(x=>x.status==='FAIL').length,externalCalibrationPending:['dieline.width','dieline.height','crease.compensation']},null,2));
