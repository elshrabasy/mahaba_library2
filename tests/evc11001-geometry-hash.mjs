import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generateEVC11001} from '../engine/templates/EVC11001.js';

const cases=[
  {
    input:{L:125,W:105,H:88,DT:1,MAT:1,FD:2},
    geometry:'5f197555656f789b0f98286870393df38bddb191c2fd2dfe23983bb305150bc1',
    lines:'cb430611511a5c9a59d7d6b470303f175be643bacd6abdc4cd66da102b3f1e5b',
    outline:'ae8bf719fc89427098a752d990d46766d1ed283fc78ff4390aba674d4693b0c2',
    panels:'8cb234a341f2c761b68b4b2ca3bc60ef69d3a016a389773629307175512bff16'
  },
  {
    input:{L:180,W:120,H:90,DT:1,MAT:2,FD:1},
    geometry:'f5acf92f01d21d7fc6650e06190b8e1abc6f9ed942a03fff46560ddf82201ce0',
    lines:'ef3a88b0c2e95e2a070ec8b0d18492eb69edeb82cc6d8c127d7acd8b10ee23ff',
    outline:'3a3fdb866c8c5e63c095be77981f419835f49d06f256eb929b8678f26937e9b3',
    panels:'1eef3ebc785edb1e004fb431d2046d42fb2295cd41327b29a7522f3488657489'
  },
  {
    input:{L:90,W:70,H:55,DT:2,MAT:3,FD:2},
    geometry:'b63bc9828a21acae0a015cc3ebfc52848a0436201d54f1aa7e798b92a4af433d',
    lines:'33be9b50910141ecaf65655d89f66f15d31347b4e84021fdcb6da6129a636a3a',
    outline:'dcfd24da4be6fe3be01373b6abd6babe61fa944bd990fe0ae0a51917ba908e22',
    panels:'3622a09ef724fda45b76cdc5ff435c6ec886b6c77582115b7b8df89c36adc292'
  }
];

const normalize=value=>JSON.stringify(value,(key,item)=>typeof item==='number'?Number(item.toFixed(6)):item);
const hash=value=>createHash('sha256').update(normalize(value)).digest('hex');

for(const c of cases){
  const g=generateEVC11001(c.input);
  assert.equal(hash({width:g.width,height:g.height,lines:g.lines,outline:g.outline,panels:g.panels}),c.geometry,'EVC11001 geometry hash changed');
  assert.equal(hash(g.lines),c.lines,'EVC11001 cut/crease lines changed');
  assert.equal(hash(g.outline),c.outline,'EVC11001 outline changed');
  assert.equal(hash(g.panels),c.panels,'EVC11001 panels changed');
}

console.log(JSON.stringify({ok:true,cases:cases.length,rule:'EVC11001 geometry hashes frozen'},null,2));
