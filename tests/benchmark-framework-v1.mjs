import assert from 'node:assert/strict';
import {evaluateCheck,evaluateBenchmark} from '../core/benchmark/evaluate.js';

assert.deepEqual(evaluateCheck({expected:215,actual:215.2,tolerance:.25}).status,'PASS');
assert.deepEqual(evaluateCheck({expected:215,actual:215.4,tolerance:.25}).status,'FAIL');
assert.deepEqual(evaluateCheck({expected:215,actual:null,tolerance:.25}).status,'NEEDS_REVIEW');

const result=evaluateBenchmark({cases:[{checks:[{id:'a',expected:10,actual:10.1,tolerance:.2},{id:'b',expected:true,actual:true}]}]});
assert.equal(result.status,'PASS');
assert.equal(result.cases[0].checks[0].error,0.09999999999999964);

console.log(JSON.stringify({ok:true,framework:'benchmark-v1',status:result.status}));
