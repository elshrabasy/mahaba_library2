import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateMahabat} from '../engine/registry.js';
import {buildNestTemplate,buildNestConfig} from '../studio-src/nesting-bridge.js';
import {generatePatternSolutions} from '../studio-src/nest-patterns.js';
import {createInterlockSearch,compareNestingLayouts} from '../studio-src/nest-pair-interlock.js';

const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/nesting-pair-screenshot.json',import.meta.url),'utf8'));
const geometry=generateMahabat('EVC11001',fixture.parameters),template=buildNestTemplate(geometry);
const snapshot=JSON.stringify({geometry,template,fixture});
const engine=globalThis.NestEngine,config=buildNestConfig(fixture.settings);
const search=createInterlockSearch(engine,template,config),variants=search.variants;
const validate=layout=>assert.equal(engine.validate(layout,variants,config,true).ok,true);
validate(fixture.baseline);validate(fixture.witness);
const baseline=engine.dims(fixture.baseline,variants),witness=engine.dims(fixture.witness,variants);

const pair=search.findPairs(0,180)[0],reverse=search.findPairs(180,0)[0];
assert.ok(pair&&reverse,'Both pair orders must be searched');
validate(pair.layout);validate(reverse.layout);
assert.ok(Math.abs(pair.area-reverse.area)<.01,'Reversing the identical pieces must preserve the best pair envelope');
assert.ok(pair.w<=489.5+.01&&pair.h<=486.068+.01,'Find the narrow head-to-tail contact rather than the old wide pair');

const refined=search.refine(fixture.baseline);
validate(refined.layout);
assert.equal(refined.layout.length,3,'Local refinement must retain the side-strip piece');
assert.ok(refined.layout.some(part=>part.r===180),'The screenshot needs a 180-degree flip');
assert.ok(refined.area<=witness.area+.01,'Do not regress below the independently validated tighter alternative');
assert.ok(refined.area<baseline.area*.87,'The flip and offsets must improve compactness, not merely retain three pieces');
assert.ok(refined.h<=489.5+.01);
assert.ok(compareNestingLayouts(refined,{layout:fixture.baseline,...baseline})<0);

const tightConfig=buildNestConfig({...fixture.settings,sheetHeight:510});
const tightSearch=createInterlockSearch(engine,template,tightConfig);
const tight=generatePatternSolutions(engine,template,tightConfig,{interlockSearch:tightSearch});
assert.ok(tight.results[0].layout.length>=3,'Pair cluster + residual fill must fit three blanks on 800x510');
assert.ok(tight.results.some(candidate=>candidate.clusters===1&&candidate.residualParts>=1),'An odd residual piece must be added after the pair');
for(const candidate of tight.results)assert.equal(engine.validate(candidate.layout,variants,tightConfig,true).ok,true);

const repeatConfig=buildNestConfig({...fixture.settings,sheetWidth:1000,sheetHeight:510,rotation:'half'});
const repeated=generatePatternSolutions(engine,template,repeatConfig);
assert.ok(repeated.results[0].layout.length>=4,'Repeat two interlocked clusters on 1000x510');
assert.ok(repeated.results.some(candidate=>candidate.clusters>=2));
for(const candidate of repeated.results)assert.equal(engine.validate(candidate.layout,variants,repeatConfig,true).ok,true);

const lockedConfig={...config,angles:[0]},lockedSearch=createInterlockSearch(engine,template,lockedConfig);
assert.deepEqual(lockedSearch.findPairs(0,180),[],'Do not manufacture a disallowed pair');
const locked=lockedSearch.refine(fixture.baseline.slice(0,2));
assert.ok(locked.layout.every(part=>part.r===0),'Refinement and residual fill must honor rotation locks');
const tooClose=fixture.witness.map(part=>({...part}));
tooClose[1].y=204.23;
assert.equal(engine.validate(tooClose,variants,config,true).ok,false,'Reject a contact that violates exact clearance');
const overlap=[{r:0,x:0,y:0},{r:180,x:10,y:10}];
assert.equal(search.refine(overlap),null,'Invalid seeds must never become accepted alternatives');
assert.equal(JSON.stringify({geometry,template,fixture}),snapshot,'Search must not modify frozen geometry or input layouts');
console.log(JSON.stringify({ok:true,pair:{w:pair.w,h:pair.h},screenshot:{before:baseline.area,after:refined.area,pieces:refined.layout.length},tight:tight.results[0].layout.length,repeated:repeated.results[0].layout.length}));
