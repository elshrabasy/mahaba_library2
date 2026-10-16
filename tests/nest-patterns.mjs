import assert from 'node:assert/strict';
import {generateMahabat} from '../engine/registry.js';
import {buildNestTemplate,buildNestConfig} from '../studio-src/nesting-bridge.js';
import {prepareIrregularTemplate} from '../studio-src/nfp-lite.js';
import {generatePatternSolutions,findInterlockPair} from '../studio-src/nest-patterns.js';
import {smartMixedRotationSolutions} from '../studio-src/nest-smart-rotation.js';

const g=generateMahabat('EVC11001',{L:125,W:105,H:88,DT:1,MAT:1,FD:2});
const engine=globalThis.NestEngine;
assert.ok(engine?.validate,'NestEngine must be available');
const T=prepareIrregularTemplate(buildNestTemplate(g));
const c=buildNestConfig({sheetWidth:1000,sheetHeight:690,gripper:10,gap:3,rotation:'half'});
const patterns=generatePatternSolutions(engine,T,c);
assert.ok(patterns.results.length>0,'Pattern engine must return at least one layout');
for(const r of patterns.results){
  const check=engine.validate(r.layout,patterns.variants,c,true);
  assert.equal(check.ok,true,`Pattern ${r.name} must pass exact polygon validation`);
}
assert.ok(patterns.results.some(r=>r.recipe==='regular'),'Regular recipe must be present');
assert.ok(patterns.results.some(r=>r.recipe==='alternate-180')||patterns.results.some(r=>r.recipe==='interlock-pair'),'An alternating/interlocking recipe must be present');
const pair=findInterlockPair(engine,T,c,0,180);
if(pair){
  const check=engine.validate(pair.layout,patterns.variants,{...c,W:Math.max(c.W,pair.w),H:Math.max(c.H,pair.h)},true);
  assert.equal(check.ok,true,'Interlock pair must pass exact polygon validation');
}

// Regression from the mobile review: on an 800 x 680 sheet, the optimizer must not stop at 2-up.
// A mixed orientation (two 0° + one 90°) fits and must pass exact-polygon validation.
const c800=buildNestConfig({sheetWidth:800,sheetHeight:680,gripper:10,gap:3,rotation:'half',deep:true});
const smart800=smartMixedRotationSolutions(engine,T,c800);
const best800=smart800.results[0];
assert.ok(best800?.layout?.length>=3,`800x680 smart rotation must find at least 3 pieces, got ${best800?.layout?.length||0}`);
assert.equal(engine.validate(best800.layout,smart800.variants,smart800.config,true).ok,true,'800x680 3-up smart-rotation layout must pass exact polygon validation');

console.log(JSON.stringify({
  patterns:patterns.results.map(r=>({name:r.name,recipe:r.recipe,pieces:r.layout.length,w:r.w,h:r.h})),
  pair:pair&&{w:pair.w,h:pair.h,minGap:pair.minGap},
  sheet800x680:{name:best800.name,pieces:best800.layout.length,w:best800.w,h:best800.h,minGap:best800.minGap}
}));
