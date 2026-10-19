import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LatestUpdateQueue,StudioAutoUpdates,readDimensionInputs,readArtworkInputs} from '../studio-src/studio-auto-updates.js';

function fakeClock(){
  let nextId=0;const timers=new Map();
  return {setTimer(callback){const id=++nextId;timers.set(id,callback);return id;},clearTimer:id=>timers.delete(id),async tick(){const callbacks=[...timers.values()];timers.clear();for(const callback of callbacks)callback();await Promise.resolve();await Promise.resolve();}};
}
const clock=fakeClock(),runs=[],errors=[];
let release;
const queue=new LatestUpdateQueue(async value=>{runs.push(value);if(value===1)await new Promise(resolve=>{release=resolve;});},error=>errors.push(error),clock);
queue.schedule(0,500);queue.schedule(1,500);await clock.tick();
assert.deepEqual(runs,[1],'Typing must coalesce into a single update');
queue.schedule(2,500);queue.schedule(3,500);await clock.tick();
assert.deepEqual(runs,[1],'Geometry regeneration must not overlap');
release();await Promise.resolve();await Promise.resolve();
assert.deepEqual(runs,[1,3],'Edits during regeneration must apply the latest captured values');
queue.schedule(4,500);queue.cancel();await clock.tick();assert.deepEqual(runs,[1,3]);
const failures=new LatestUpdateQueue(async()=>{throw new Error('invalid geometry');},error=>errors.push(error),clock);
failures.schedule(1,0);await failures.flush();assert.equal(errors[0].message,'invalid geometry');
const nativeTimers={setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
let defaultQueue;
try{
  globalThis.setTimeout=function(){assert.notEqual(this,defaultQueue,'Do not invoke browser timer APIs with the queue as their receiver');return 1;};
  globalThis.clearTimeout=function(){assert.notEqual(this,defaultQueue);};
  defaultQueue=new LatestUpdateQueue(async()=>{},()=>{});defaultQueue.schedule(1,500);defaultQueue.cancel();
}finally{Object.assign(globalThis,nativeTimers);}

const field=(key,value,type='number',valid=true)=>({dataset:{mahabat:key,mahabatType:type},value:String(value),checkValidity:()=>valid});
let fields=[field('L',200),field('W',150),field('H',300),field('MAT',2),field('bleed',0)];
const artworkFields={scale:field('',100),x:field('',-15),y:field('',10),angle:field('',90)};
const layers=new Map(),layer={image:'art.png',scale:100,x:0,y:0,angle:0};layers.set('0:outside',layer);
let modelCalls=[],artCalls=0;
const studio={data:{source:'mahabat-engine',code:'EVC11001',requestedParameters:{L:125,W:105,H:88,MAT:1}},serial:1,layers,layer:()=>layer,root:{addEventListener(){}},message:message=>errors.push(message),$:key=>key==='dimensions'?{querySelectorAll:()=>fields,addEventListener(){}}:{...artworkFields[key],addEventListener(){}},async applyDimensions(reset,parameters){modelCalls.push({reset,parameters});},async applyAll(){artCalls++;}};
assert.deepEqual(readDimensionInputs(studio),{L:200,W:150,H:300,MAT:2,bleed:0});
fields[0].value='';assert.equal(readDimensionInputs(studio),null);fields[0].value='200';
fields[0].checkValidity=()=>false;assert.equal(readDimensionInputs(studio),null);fields[0].checkValidity=()=>true;
assert.deepEqual(readArtworkInputs(studio),{scale:100,x:-15,y:10,angle:90});
artworkFields.scale.value='0';assert.equal(readArtworkInputs(studio),null);artworkFields.scale.value='100';
const saved=Object.getOwnPropertyDescriptor(globalThis,'document');
try{
  globalThis.document={getElementById:()=>null};
  const updates=new StudioAutoUpdates(studio);
  updates.scheduleDimensions(100000);fields[0].value='220';await updates.dimensions.flush();
  assert.equal(modelCalls[0].parameters.L,200,'Do not reread fields after a pending redraw');
  studio.data={...studio.data,code:'MAH-FEC-STE-001'};updates.scheduleDimensions(100000);await updates.dimensions.flush();
  assert.equal(modelCalls[1].parameters.L,220,'Automatic updates must also support the second Studio template');
  updates.scheduleDimensions(100000);studio.data={...studio.data,code:'EVC11001'};await updates.dimensions.flush();
  assert.equal(modelCalls.length,2,'Pending edits must not affect a different template');
  updates.scheduleArtwork();await updates.artwork.flush();assert.equal(layer.x,-15);assert.equal(artCalls,1);
  layer.foil='foil.png';studio.artworkKind='foil';updates.scheduleArtwork();studio.artworkKind='image';await updates.artwork.flush();
  assert.equal(layer.effectTransforms.foil.angle,90,'Capture the selected image kind so delayed foil edits never move artwork');assert.equal(artCalls,2);
  artworkFields.x.value='35';updates.scheduleArtwork();studio.cancelArtworkUpdate();await updates.artwork.flush();assert.equal(layer.x,-15,'A handle gesture must cancel stale numeric edits');
  updates.scheduleArtwork();studio.serial++;await updates.artwork.flush();assert.equal(artCalls,2,'Never apply a stale artwork snapshot after rebuilding geometry');
  updates.cancel();
}finally{
  if(saved)Object.defineProperty(globalThis,'document',saved);else delete globalThis.document;
}
const ui=fs.readFileSync(new URL('../studio-src/studio-ui-controller.js',import.meta.url),'utf8');
assert.match(ui,/\['applyDimensions','resetDimensions','apply','sample'\]/,'Remove only redundant/manual/test controls, keeping useful recovery actions');
const generator=fs.readFileSync(new URL('../studio-src/generator-experience.js',import.meta.url),'utf8');
assert.doesNotMatch(generator,/data-mgx-live/,'Do not offer a switch that disables the only update path');
console.log(JSON.stringify({ok:true,debounced:true,serialized:true,latestEditPreserved:true,templates:2,artworkAutomatic:true}));
