import fs from 'node:fs';
import assert from 'node:assert/strict';
const src=fs.readFileSync(new URL('../studio-src/studio-preferences.js',import.meta.url),'utf8');
assert.match(src,/mahaba:lang/);
assert.match(src,/mahaba:theme/);
assert.match(src,/data-theme=\"light\"/);
assert.match(src,/MutationObserver/);
assert.match(src,/mahaba:preferences/);
console.log('studio preferences contract: ok');
