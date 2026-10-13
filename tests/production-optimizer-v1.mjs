import assert from 'node:assert/strict';
import '../studio-src/nest-engine-core.js';
import {generateStraightTuckEnd} from '../templates/straight-tuck-end/generate.js';
import {NestingOrchestrator} from '../engines/nesting/orchestrator.js';
import {ProductionOptimizer} from '../engines/production/optimizer.js';
import {EngineeringService} from '../services/engineering-core.js';

const model=generateStraightTuckEnd({L:215,W:80,H:45,dimension_mode:'ID',material_id:'FBB-350-055',grain_direction:'Y',glue_flap:15,bleed:3,safe_margin:4});
const solver=globalThis.MahabaNestEngine||globalThis.NestEngine;assert.ok(solver?.regularSolution);
const sheets=[{id:'S1000x690',sheetWidth:1000,sheetHeight:690},{id:'S720x520',sheetWidth:720,sheetHeight:520}];
const cmp=NestingOrchestrator.compareSheets(solver,model,sheets,{gripper:10,gap:3});assert.ok(cmp.solutions.length>=2);assert.ok(cmp.recommended.pieces_per_sheet>0);
const machines=[
  {machine_id:'BOBST-1000',machine_type:'die_cutting',sheet:{max_width_mm:1000,max_height_mm:700,min_width_mm:100,min_height_mm:100},gripper_mm:12,compatible_processes:['die_cut'],performance:{speed_per_hour:5000},cost:{setup_cost:100,hourly_cost:220}},
  {machine_id:'PLATEN-750',machine_type:'die_cutting',sheet:{max_width_mm:750,max_height_mm:550,min_width_mm:100,min_height_mm:100},gripper_mm:10,compatible_processes:['die_cut'],performance:{speed_per_hour:2500},cost:{setup_cost:60,hourly_cost:120}}
];
const rates={paper_cost_per_m2:3.25,printing_setup_cost:400,printing_cost_per_sheet:.1,lamination_cost_per_m2:0,foil_setup_cost:0,foil_cost_per_m2:0,uv_setup_cost:0,uv_cost_per_m2:0,die_cost:250,die_cut_setup_cost:100,die_cut_cost_per_piece:.075,glue_setup_cost:30,glue_cost_per_piece:.03,labor_cost:0,overhead_cost:0};
const optimized=ProductionOptimizer.optimize({solver,model,quantity:1000,sheets,machines,rates,margin_percent:20,waste_percent:5});assert.ok(optimized.routes.length>0);assert.ok(optimized.recommended.cost_per_piece>0);assert.ok(optimized.comparison.saving_percent>=0);
const serviceModel=EngineeringService.generateTemplate('STE',{L:215,W:80,H:45,dimension_mode:'ID',material_id:'FBB-350-055'});assert.equal(serviceModel.template.template_id,'MAH-FEC-STE-001');const folded=EngineeringService.simulateFold(serviceModel,{progress:.5});assert.equal(folded.state.length,12);
console.log(JSON.stringify({ok:true,nestingOptions:cmp.solutions.length,recommendedPieces:cmp.recommended.pieces_per_sheet,routes:optimized.routes.length,recommendedRoute:optimized.recommended.route_id,costPerPiece:optimized.recommended.cost_per_piece,savingPercent:optimized.comparison.saving_percent},null,2));
