import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateMahabat} from '../engine/registry.js';
import {buildNestTemplate,buildNestConfig} from '../studio-src/nesting-bridge.js';
import {compareNestingLayouts} from '../studio-src/nest-pair-interlock.js';

const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/nesting-pair-screenshot.json',import.meta.url),'utf8'));
const template=buildNestTemplate(generateMahabat('EVC11001',fixture.parameters));
const engine=globalThis.NestEngine,originalSolve=engine.solve;
const messages=[];
globalThis.self={postMessage:message=>messages.push(message)};
await import('../studio-src/nest-worker-module.js');
const config=buildNestConfig({...fixture.settings,rotation:'half'}),variants=engine.makeVariants(template);
const witness={layout:fixture.witness,...engine.dims(fixture.witness,variants)};
const legacy=engine.regularSolution(template,config);
try{
  engine.solve=()=>legacy;
  self.onmessage({data:{template,config,run:{quantity:1},search:{allowCrossRotation:true,quality:'fast'}}});
  assert.ok(!messages.some(message=>message.type==='error'),JSON.stringify(messages.find(message=>message.type==='error')));
  const result=messages.find(message=>message.type==='result')?.result;
  assert.ok(result,'Worker must publish a final result');
  assert.ok(result.interlock.pairs>0,'Worker must include pair search');
  const best=result.results[0];
  assert.ok(compareNestingLayouts(best,witness)<=0,'Final merging and production ranking must preserve the best count/compactness alternative');
  assert.ok(best.production,'Count-first alternatives must retain production metrics');
  for(const candidate of result.results)assert.equal(engine.validate(candidate.layout,variants,result.config,true).ok,true);
  for(const preview of messages.filter(message=>message.type==='preview')){
    assert.ok(compareNestingLayouts(best,preview.result.results[0])<=0,'Final result must not regress below any preview');
  }

  messages.length=0;
  self.onmessage({data:{template,config,search:{allowCrossRotation:false,quality:'fast'}}});
  assert.ok(!messages.some(message=>message.type==='error'));
  const locked=messages.find(message=>message.type==='result')?.result;
  assert.deepEqual(locked.config.angles,[0,180]);
  for(const message of messages.filter(message=>message.type==='preview'||message.type==='result')){
    for(const candidate of message.result.results)assert.equal(engine.validate(candidate.layout,variants,config,true).ok,true,'All phases must respect the rotation lock');
  }
  console.log(JSON.stringify({ok:true,workerBest:{pieces:best.layout.length,area:best.area},lockedBest:locked.results[0].layout.length}));
}finally{
  engine.solve=originalSolve;
  delete globalThis.self;
}
