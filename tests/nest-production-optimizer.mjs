import assert from 'node:assert/strict';
import {generateMahabat} from '../engine/registry.js';
import {buildNestTemplate,buildNestConfig} from '../studio-src/nesting-bridge.js';
import {prepareIrregularTemplate} from '../studio-src/nfp-lite.js';
import {generatePatternSolutions} from '../studio-src/nest-patterns.js';
import {optimizeProductionRun,compareSheetFormats,buildHalfDieCandidate} from '../studio-src/nest-production-optimizer.js';
import '../studio-src/nest-engine-core.js';

const engine=globalThis.MahabaNestEngine;
const g=generateMahabat('EVC11001',{L:125,W:105,H:88,DT:1,MAT:1,FD:2});
const T=prepareIrregularTemplate(buildNestTemplate(g));
const config=buildNestConfig({sheetWidth:1000,sheetHeight:690,gripper:10,gap:3,rotation:'half'});
const patterns=generatePatternSolutions(engine,T,config);
assert.ok(patterns.results.length>0,'patterns required');

const prod=optimizeProductionRun(patterns.results,T,{...config,sheetW:1000,sheetH:690},{quantity:5000,allowance_pct:2,overproduction_pct:1});
assert.ok(prod.best,'production best required');
assert.ok(Number.isFinite(prod.best.production.sheets));
assert.ok(prod.best.production.parts_per_sheet>0);

const half=buildHalfDieCandidate(engine,T,config,patterns.results[0].layout);
if(half){
  const check=engine.validate(half.layout,engine.makeVariants(T),config,true);
  assert.equal(check.ok,true,'half-die candidate must validate');
}

const sheets=compareSheetFormats({
  engine,
  template:T,
  baseConfig:{...config,sheetW:1000,sheetH:690},
  sheets:[
    {name:'1000×690',width_mm:1000,height_mm:690},
    {name:'900×640',width_mm:900,height_mm:640},
    {name:'700×500',width_mm:700,height_mm:500}
  ],
  patternSolver:generatePatternSolutions,
  run:{quantity:5000,allowance_pct:2}
});
assert.ok(sheets.length>0,'sheet comparison required');
assert.ok(sheets[0].best.production.sheets<=sheets.at(-1).best.production.sheets || sheets[0].best.production.excess<=sheets.at(-1).best.production.excess);

console.log(JSON.stringify({best:prod.best.name,parts:prod.best.production.parts_per_sheet,sheets:prod.best.production.sheets,hints:prod.hints,sheetOptions:sheets.map(x=>({sheet:x.sheet.name,parts:x.best.production.parts_per_sheet,sheets:x.best.production.sheets,waste:x.best.production.waste_percent}))}));
