import assert from 'node:assert/strict';
import {generateMahabatModel} from '../engine/registry.js';
import {MachineEngine} from '../core/machines/engine.js';
import {CostEngine} from '../core/cost/engine.js';
import {ProductionValidationEngine} from '../core/validation/engine.js';
import {DEMO_MACHINE_PROFILES,DEMO_COST_RATES} from '../studio-src/production-profiles.js';

const model=generateMahabatModel('EVC11001',{L:125,W:105,H:88,DT:1,MAT:1,FD:2});
model.metrics={...model.metrics,pieces_per_sheet:2,waste_percent:35.5,utilization:.645,sheet_width_mm:1000,sheet_height_mm:690,nesting_spacing_mm:3,nesting_rotations_deg:[0,180]};
model.nesting={...model.nesting,actual:{pieces_per_sheet:2,waste_percent:35.5,utilization:.645,sheet_width_mm:1000,sheet_height_mm:690,rotations_deg:[0,180],spacing_mm:3}};

const selected=DEMO_MACHINE_PROFILES[0];
const matches=MachineEngine.match(model,DEMO_MACHINE_PROFILES);
const evaluation=MachineEngine.evaluate(model,selected);
const cost=CostEngine.estimate(model,{quantity:1000,pieces_per_sheet:model.metrics.pieces_per_sheet,waste_percent:model.metrics.waste_percent,rates:DEMO_COST_RATES,margin_percent:20});
model.production={...model.production,quantity:1000,margin_percent:20,machine_profile:selected,machine_evaluation:evaluation,machine_matches:matches,cost_estimate:cost};
model.validation=ProductionValidationEngine.validate(model,{machine:selected});

assert.ok(matches.length>=3,'Demo machine profiles should be evaluated');
assert.equal(evaluation.compatible,true,'Selected demo machine should be compatible with EVC11001 blank');
assert.ok(cost.cost_per_piece>0,'CostEngine should use nesting pieces/waste for cost per piece');
assert.ok(model.validation.checks.some(x=>x.id==='nesting.actual_result'&&x.status==='PASS'));
assert.ok(model.validation.checks.some(x=>x.id==='machine.profile_match'&&x.status==='PASS'));
assert.ok(model.validation.checks.some(x=>x.id==='cost.estimate'&&x.status==='PASS'));

console.log(JSON.stringify({ok:true,machines:matches.length,costPerPiece:cost.cost_per_piece,confidence:model.validation.production_confidence},null,2));
