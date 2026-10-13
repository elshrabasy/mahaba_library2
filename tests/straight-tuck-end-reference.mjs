import assert from 'node:assert/strict';
import {generateStraightTuckEnd} from '../templates/straight-tuck-end/generate.js';
import {generateMahabat,generateMahabatModel,generateMahabatNative,hasMahabatTemplate} from '../engine/registry.js';
import {CostEngine} from '../core/cost/engine.js';
import {MachineEngine} from '../core/machines/engine.js';
import {FoldingEngine} from '../core/folding/graph.js';
import {regularPreview} from '../studio-src/nesting-bridge.js';

const input={L:215,W:80,H:45,dimension_mode:'ID',material_id:'FBB-350-055',grain_direction:'Y',glue_flap:15,bleed:3,safe_margin:4};
const model=generateStraightTuckEnd(input);
assert.equal(model.schema_version,'1.0.0');
assert.equal(model.template.template_id,'MAH-FEC-STE-001');
assert.equal(model.material.material_family,'paperboard');
assert.equal(model.material.thickness_mm,.55);
assert.equal(model.panels.length,13);
assert.equal(model.folds.length,12);
assert.equal(model.geometry.crease_paths.length,12);
assert.ok(model.geometry.cut_paths.length>20);
assert.ok(model.nesting.outer_polygon.length>20);
assert.ok(model.metrics.blank_area_mm2>0);
assert.ok(model.metrics.outer_perimeter_mm>0);
assert.ok(model.metrics.crease_length_mm>0);
assert.ok(model.metrics.glue_area_mm2>0);
assert.equal(model.validation.status,'NEEDS_REVIEW');
assert.ok(model.validation.production_confidence<=85);
assert.ok(model.validation.checks.some(c=>c.id==='material.compensation_approval'&&c.status==='NEEDS_REVIEW'));

const graph=FoldingEngine.buildGraph(model);assert.equal(graph.ok,true);assert.equal(FoldingEngine.sequence(model).length,12);assert.equal(FoldingEngine.state(model,.5).length,12);
assert.equal(hasMahabatTemplate('STE'),true);assert.equal(hasMahabatTemplate('MAH-FEC-STE-001'),true);
const throughRegistry=generateMahabatModel('STE',input);assert.deepEqual(throughRegistry.nesting.outer_polygon,model.nesting.outer_polygon);
const legacy=generateMahabat('STE',input);assert.equal(legacy.code,'MAH-FEC-STE-001');assert.equal(legacy.panels.length,13);assert.equal(legacy.material.family,'paperboard');assert.equal(legacy.validation.status,'NEEDS_REVIEW');
const native=generateMahabatNative('STE',input);assert.equal(native.metadata.boardConstruction,'solid-paperboard');assert.equal(Object.keys(native.geometries).length,13);for(const g of Object.values(native.geometries))assert.equal(g.groups.length,3,'paperboard must have OUT/IN/EDGE only');assert.ok(!native.materials.flute,'paperboard must not create corrugated flute material');

const machine={machine_id:'TEST-BOBST',machine_type:'die_cutting',sheet:{max_width_mm:1000,max_height_mm:700,min_width_mm:100,min_height_mm:100},gripper_mm:12,compatible_processes:['die_cut']};
const match=MachineEngine.evaluate(model,machine);assert.equal(match.compatible,true);assert.ok(match.fit_orientations.length>=1);
const cost=CostEngine.estimate(model,{quantity:1000,pieces_per_sheet:4,waste_percent:5,rates:{paper_cost_per_m2:3.25,printing_setup_cost:400,printing_cost_per_sheet:.1,lamination_cost_per_m2:0,foil_setup_cost:0,foil_cost_per_m2:0,uv_setup_cost:0,uv_cost_per_m2:0,die_cost:250,die_cut_setup_cost:100,die_cut_cost_per_piece:.075,glue_setup_cost:30,glue_cost_per_piece:.03,labor_cost:0,overhead_cost:0},margin_percent:20});assert.ok(cost.total_cost>0);assert.ok(cost.cost_per_piece>0);assert.ok(cost.selling_price>cost.total_cost);

const engine=globalThis.NestEngine;assert.ok(engine?.solve);const nest=regularPreview(engine,legacy,{sheetWidth:1000,sheetHeight:690,gripper:10,gap:3,rotation:'half'});assert.ok(nest.result.results.length>0);assert.ok(nest.result.results[0].layout.length>0);

console.log(JSON.stringify({ok:true,template:model.template.template_id,blank:model.nesting.bounds,panels:model.panels.length,folds:model.folds.length,confidence:model.validation.production_confidence,nativeGroups:3,nestingPieces:nest.result.results[0].layout.length,costPerPiece:cost.cost_per_piece},null,2));
