import assert from 'node:assert/strict';
import {generateMahabat} from '../engine/registry.js';
import {buildNestTemplate,buildNestConfig} from '../studio-src/nesting-bridge.js';
import {prepareIrregularTemplate,buildConvexNFP,relativeRotations} from '../studio-src/nfp-lite.js';
import {generatePatternSolutions,findInterlockPair} from '../studio-src/nest-patterns.js';
import {contactBeamSearch} from '../studio-src/nest-contact-search.js';

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

// Regression from the mobile review: 800 x 680 mm should not stop at a local 2-up pair.
const c800=buildNestConfig({sheetWidth:800,sheetHeight:680,gripper:10,gap:3,rotation:'half',deep:true});
const rel800=relativeRotations(c800.angles);
const n800=buildConvexNFP(T.cells,rel800);
const contact800=contactBeamSearch(engine,T,n800,c800,{beamWidth:22,maxDepth:5});
for(const r of contact800.results){assert.equal(engine.validate(r.layout,contact800.variants,c800,true).ok,true,'800x680 contact candidate must be exact-polygon valid');}
const best800=contact800.results[0];
assert.ok(best800?.layout?.length>=3,`800x680 contact search must find at least 3 pieces, got ${best800?.layout?.length||0}`);

console.log(JSON.stringify({
  patterns:patterns.results.map(r=>({name:r.name,recipe:r.recipe,pieces:r.layout.length,w:r.w,h:r.h})),
  pair:pair&&{w:pair.w,h:pair.h,minGap:pair.minGap},
  sheet800x680:contact800.results.map(r=>({name:r.name,recipe:r.recipe,pieces:r.layout.length,w:r.w,h:r.h,minGap:r.minGap}))
}));
