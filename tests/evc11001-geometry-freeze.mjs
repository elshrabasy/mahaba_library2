import assert from 'node:assert/strict';
import {generateEVC11001 as generateBase} from '../engine/templates/EVC11001.js';
import {generateEVC11001 as generateNativeSource} from '../engine/templates/EVC11001-native.js';

const cases=[
  {L:125,W:105,H:88,DT:1,MAT:1,FD:2},
  {L:180,W:120,H:90,DT:1,MAT:2,FD:1},
  {L:90,W:70,H:55,DT:2,MAT:3,FD:2}
];

for(const input of cases){
  const expected=generateBase(input),actual=generateNativeSource(input);
  assert.deepEqual(actual.lines,expected.lines,'2D cut/crease geometry must remain frozen');
  assert.deepEqual(actual.outline,expected.outline,'2D outer outline must remain frozen');
  assert.equal(actual.width,expected.width,'dieline width must remain frozen');
  assert.equal(actual.height,expected.height,'dieline height must remain frozen');
  assert.deepEqual(actual.requestedParameters,expected.requestedParameters,'input parameter contract must remain frozen');
}

console.log(JSON.stringify({ok:true,cases:cases.length,rule:'EVC11001 2D geometry freeze'},null,2));
