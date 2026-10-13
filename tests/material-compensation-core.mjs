import assert from 'node:assert/strict';
import {MATERIALS as LEGACY_MATERIALS,RULES as LEGACY_RULES,generateEVC11001 as legacyGenerate} from '../engine/templates/EVC11001.js';
import {generateEVC11001Core} from '../engine/templates/EVC11001-core.js';
import {MaterialRegistry} from '../core/materials/registry.js';
import {CompensationEngine} from '../core/compensation/engine.js';

const ruleNames=[
  'fold90','lastPanelCorrection','glueFlapCorrection','glueFlapWidth','glueFlapAngleDeg','slotWidth','slotExtension',
  'tuckCorrection','lidClearance','slitDepth','dustFlapCorrection','reliefRadius','reliefOffset','handleCorrection',
  'outsideFold90','doubleCrease','lidFrontCorrection','layerStep','insideLayer','rimFold90','rimHeightCorrection','rimCreaseGap','fittingCreaseGap'
];
const compiled=CompensationEngine.compileLegacyRules('corrugated-default');
assert.equal(compiled.id,LEGACY_RULES.id);
assert.equal(compiled.version,LEGACY_RULES.version);
for(const d of [0,0.55,1.5,3,4,6.5,10])for(const name of ruleNames)assert.equal(compiled[name](d),LEGACY_RULES[name](d),`${name} changed at thickness ${d}`);
assert.deepEqual(compiled.fluteCrease,LEGACY_RULES.fluteCrease);

for(const id of [1,2,3,4]){
  const core=MaterialRegistry.require(id),legacy=LEGACY_MATERIALS[id],compat=MaterialRegistry.toLegacy(core);
  assert.equal(compat.key,legacy.key);
  assert.equal(compat.family,legacy.family);
  assert.equal(compat.name,legacy.name);
  assert.equal(compat.thickness,legacy.thickness);
  assert.deepEqual(compat.types,legacy.types);
}

const cases=[
  {L:125,W:105,H:88,DT:1,MAT:1,FD:2},
  {L:125,W:105,H:88,DT:2,MAT:2,FD:1},
  {L:200,W:120,H:120,DT:3,MAT:3,FD:2},
  {L:300,W:50,H:150,DT:1,MAT:4,FD:2,options:{proportionSafe:true}}
];
for(const c of cases){
  const {options,...input}=c;
  const a=legacyGenerate(input,options||{}),b=generateEVC11001Core(input,options||{});
  assert.equal(b.width,a.width,'width changed');
  assert.equal(b.height,a.height,'height changed');
  assert.deepEqual(b.lines,a.lines,'cut/crease geometry changed');
  assert.deepEqual(b.outline,a.outline,'outline changed');
  assert.deepEqual(b.panels,a.panels,'panel geometry changed');
  assert.deepEqual(b.material,a.material,'legacy material shape changed');
  assert.deepEqual(b.dimensionType,a.dimensionType);
  assert.deepEqual(b.fluteDirection,a.fluteDirection);
  assert.equal(b.engineeringCore.compensation.rule_set,'corrugated-default');
  assert.equal(b.engineeringCore.material_id,MaterialRegistry.require(input.MAT).id);
}

console.log(JSON.stringify({ok:true,materials:4,rules:ruleNames.length,cases:cases.length,behaviorPreserved:true},null,2));
