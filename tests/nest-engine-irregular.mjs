import assert from 'node:assert/strict';
import {generateMahabat} from '../engine/registry.js';
import {regularPreview,solveNesting} from '../studio-src/nesting-bridge.js';

const g=generateMahabat('EVC11001',{L:125,W:105,H:88,DT:1,MAT:1,FD:2});
const engine=globalThis.NestEngine;
assert.ok(engine?.solve,'NestEngine solve should be available');

const settings={sheetWidth:1000,sheetHeight:690,gripper:10,gap:3,rotation:'half'};
const regular=regularPreview(engine,g,settings);
const solved=solveNesting(engine,g,null,settings);

assert.ok(solved.template.cells.length>0,'Irregular template must contain convex cells');
assert.ok(solved.nfp[0].length>0,'0-degree NFP must contain edges');
assert.ok(solved.nfp[180].length>0,'180-degree NFP must contain edges');
assert.ok(solved.result.results.length>0,'Irregular solver must return layouts');

const best=solved.result.results[0];
const regularBest=regular.result.results[0];
assert.ok(best.layout.length>=regularBest.layout.length,'Irregular solver must not regress below regular layout count');
const variants=engine.makeVariants(solved.template);
const check=engine.validate(best.layout,variants,solved.config);
assert.equal(check.ok,true,'Returned irregular layout must pass independent exact polygon validation');

console.log(JSON.stringify({
  code:g.code,
  regular:regularBest.layout.length,
  irregular:best.layout.length,
  layout:best.name,
  cells:solved.template.cells.length,
  nfp0:solved.nfp[0].length,
  nfp180:solved.nfp[180].length,
  valid:check.ok
}));
