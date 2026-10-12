import assert from 'node:assert/strict';
import {generateEVC11001} from '../engine/templates/EVC11001.js';
import {buildNestTemplate,buildNestConfig} from '../studio-src/nesting-bridge.js';

const g=generateEVC11001({L:300,W:50,H:150,DT:1,MAT:1,FD:2},{proportionSafe:true});
const T=buildNestTemplate(g);
const c=buildNestConfig({sheetWidth:1000,sheetHeight:690,gripper:10,marginTop:5,marginRight:5,marginBottom:5,marginLeft:5,gap:3,rotation:'half'});

assert.equal(T.source,'mahabat-engine');
assert.equal(T.code,'EVC11001');
assert.deepEqual(T.polygon,g.outline,'nesting polygon must be the exact Mahabat outline');
assert.equal(T.cuts.length,g.lines.filter(x=>x.type==='cut').length);
assert.equal(T.creases.length,g.lines.filter(x=>x.type==='crease').length);
assert.deepEqual(c.angles,[0,180]);
assert.equal(c.sheetWidth,1000);
assert.equal(c.sheetHeight,690);
assert.equal(c.W,990);
assert.equal(c.H,675);
assert.equal(c.clearance,3);

console.log(JSON.stringify({ok:true,code:T.code,outlinePoints:T.polygon.length,cuts:T.cuts.length,creases:T.creases.length,effectiveSheet:[c.W,c.H],angles:c.angles},null,2));
