import assert from 'node:assert/strict';
import {generateMahabat} from '../engine/registry.js';
import {buildNestTemplate,buildNestConfig,regularPreview} from '../studio-src/nesting-bridge.js';

const g=generateMahabat('EVC11001',{L:125,W:105,H:88,DT:1,MAT:1,FD:2});
const engine=globalThis.NestEngine;
assert.ok(engine,'NestEngine global should be wired by nesting bridge');
assert.equal(typeof engine.regularSolution,'function');
assert.equal(typeof engine.validate,'function');

const T=buildNestTemplate(g);
const c=buildNestConfig({sheetWidth:1000,sheetHeight:690,gripper:10,gap:3,rotation:'half'});
const {result}=regularPreview(engine,g,{sheetWidth:1000,sheetHeight:690,gripper:10,gap:3,rotation:'half'});

assert.deepEqual(T.polygon,g.outline,'Nesting must use exact Mahabat outline');
assert.ok(result.variants.length===4);
assert.ok(result.results.length>0,'At least one valid regular layout should exist');
const best=result.results[0];
assert.ok(best.layout.length>0);
const check=engine.validate(best.layout,result.variants,c);
assert.equal(check.ok,true,'NestEngine must validate its returned layout');
assert.ok(result.area>0);
console.log(JSON.stringify({code:g.code,count:best.layout.length,name:best.name,polygonPoints:T.polygon.length,area:result.area,sheet:[c.sheetWidth,c.sheetHeight],effective:[c.W,c.H]}));
