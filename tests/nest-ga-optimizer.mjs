import assert from 'node:assert/strict';
import '../studio-src/nest-engine-core.js';
import {generateMahabat} from '../engine/registry.js';
import {buildNestTemplate,buildNestConfig} from '../studio-src/nesting-bridge.js';
import {prepareIrregularTemplate} from '../studio-src/nfp-lite.js';
import {gaNestingOptimize} from '../studio-src/nest-ga-optimizer.js';
import {smartMixedRotationSolutions} from '../studio-src/nest-smart-rotation.js';

const engine=globalThis.MahabaNestEngine||globalThis.NestEngine;
assert.ok(engine?.validate,'Mahabat NestEngine must be available');
const g=generateMahabat('EVC11001',{L:125,W:105,H:88,DT:1,MAT:1,FD:2});
const T=prepareIrregularTemplate(buildNestTemplate(g));

const c=buildNestConfig({sheetWidth:800,sheetHeight:680,gripper:10,gap:3,rotation:'all',deep:true});
const seeds=smartMixedRotationSolutions(engine,T,c).results;
assert.ok(seeds.some(r=>r.layout.length>=3),'Benchmark must expose a validated 3-up seed');
const ga=gaNestingOptimize(engine,T,c,{population:6,generations:2,mutation:.18,seed:20261017,maxParts:6,angles:[0,90,180,270],seedLayouts:seeds});
assert.ok(ga.results.length>0,'GA optimizer must return at least one valid layout');
for(const r of ga.results){assert.equal(engine.validate(r.layout,ga.variants,c,true).ok,true,`GA layout ${r.name} must pass exact polygon validation`);}
const best=ga.results[0];
assert.ok(best.layout.length>=3,`Hybrid GA must preserve or improve the known 3-up benchmark, got ${best.layout.length}`);
console.log(JSON.stringify({ok:true,best:best.name,pieces:best.layout.length,w:best.w,h:best.h,generations:ga.generations,population:ga.population}));
