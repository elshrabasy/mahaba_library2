import assert from 'node:assert/strict';
import {workflowStep,isEditingTarget,fitCameraDistance} from '../studio-src/studio-experience.js';
import {StudioUIController} from '../studio-src/studio-ui-controller.js';

for(const pane of ['art','finishes','light'])assert.equal(workflowStep(pane),'art');
assert.equal(workflowStep('production'),'production');
assert.equal(workflowStep('engineering'),'production');
assert.equal(workflowStep('nest'),'nest');
assert.equal(workflowStep('project'),'dimensions');
assert.equal(workflowStep(null),'dimensions');
assert.equal(isEditingTarget({isContentEditable:true}),true);
assert.equal(isEditingTarget({closest:()=>({})}),true);
assert.equal(isEditingTarget({closest:()=>null}),false);
assert.equal(isEditingTarget(null),false);
const size=[125,105,88];
assert.ok(fitCameraDistance(size,.5)>fitCameraDistance(size,2),'A narrow preview needs more camera distance');
assert.ok(fitCameraDistance(size,2)>Math.hypot(...size)/2,'Keep camera outside the model bounding sphere');
assert.ok(Number.isFinite(fitCameraDistance(size,0)),'Handle a temporarily collapsed viewport');

const globals=['document','window','localStorage'];
const saved=new Map(globals.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
const preferences=new Map([['mahaba:lang','ar'],['mahaba:theme','dark']]);
let observing=true,reconnections=0,themeChanges=0,label='';
const heading={get textContent(){return label;},set textContent(value){assert.equal(observing,false,'Disconnect observation before own text mutations');label=value;}};
const root={querySelector:selector=>selector==='[data-ui="templateDimensions"]'?heading:null,querySelectorAll:()=>[]};
try{
  globalThis.document={documentElement:{dataset:{}},querySelector:()=>null,getElementById:()=>null};
  globalThis.window={dispatchEvent:()=>{}};
  globalThis.localStorage={getItem:key=>preferences.get(key)||null};
  const controller=Object.create(StudioUIController.prototype);
  controller.s={root,rail:root,workspace:root,$:()=>null};
  controller.applySceneTheme=()=>themeChanges++;
  controller.obs={disconnect(){observing=false;},observe(target){assert.equal(target,root);observing=true;reconnections++;}};
  controller.apply(false);controller.apply(false);
  assert.equal(label,'مقاسات القالب');
  assert.equal(themeChanges,1,'Repeated panel updates must not reset the scene theme');
  assert.equal(reconnections,2,'Reconnect observation after each apply');
  preferences.set('mahaba:theme','light');controller.apply(false);
  assert.equal(themeChanges,2,'An actual preference change must update the scene');
  root.querySelector=()=>{throw new Error('DOM interrupted');};
  assert.throws(()=>controller.apply(false),/DOM interrupted/);
  assert.equal(observing,true,'Reconnect the observer even if an update fails');
}finally{
  for(const key of globals){const descriptor=saved.get(key);if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
}
console.log(JSON.stringify({ok:true,experience:'atelier',workflow:true,keyboardEditing:true,observerReconnections:reconnections,themeChanges}));
