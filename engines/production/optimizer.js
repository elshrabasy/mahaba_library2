import {CostEngine} from '../../core/cost/engine.js';
import {MachineEngine} from '../../core/machines/engine.js';
import {NestingOrchestrator} from '../nesting/orchestrator.js';

export function optimizeProduction({solver,model,quantity=1000,sheets=[],machines=[],rates={},margin_percent=0,waste_percent=5}){
  if(!model)throw new Error('GeneratedPackageModel is required.');
  const nest=NestingOrchestrator.compareSheets(solver,model,sheets,{gripper:10,gap:model.nesting?.minimum_spacing_mm||0});
  const routes=[];
  for(const layout of nest.solutions){
    const matching=machines.length?MachineEngine.match(model,machines).filter(x=>x.compatible):[{machine_id:null,compatible:true,score:50,reasons:[]}];
    for(const machine of matching){
      const cost=CostEngine.estimate(model,{quantity,pieces_per_sheet:layout.pieces_per_sheet,waste_percent,rates,margin_percent});
      const machineProfile=machines.find(m=>(m.machine_id||m.id||m.name)===machine.machine_id)||null;
      const setup=Number(machineProfile?.cost?.setup_cost||0),hourly=Number(machineProfile?.cost?.hourly_cost||0),speed=Number(machineProfile?.performance?.speed_per_hour||machineProfile?.speed||0),runtimeHours=speed>0?quantity/speed:0,machineCost=setup+hourly*runtimeHours,totalCost=cost.total_cost+machineCost,costPerPiece=totalCost/Math.max(1,quantity);
      routes.push({route_id:`ROUTE-${routes.length+1}`,candidate_id:layout.candidate_id,nesting_option:layout.option_id,machine_id:machine.machine_id,pieces_per_sheet:layout.pieces_per_sheet,waste_percent:layout.waste_percent,sheet:layout.sheet,machine_score:machine.score,base_cost:cost.total_cost,machine_cost:machineCost,total_cost:totalCost,cost_per_piece:costPerPiece,selling_price:margin_percent>=100?null:totalCost/(1-margin_percent/100),layout});
    }
  }
  routes.sort((a,b)=>a.cost_per_piece-b.cost_per_piece||a.waste_percent-b.waste_percent||b.machine_score-a.machine_score);
  const recommended=routes[0]||null,current=routes.at(-1)||null;
  const saving=current&&recommended&&current.cost_per_piece>0?(current.cost_per_piece-recommended.cost_per_piece)/current.cost_per_piece*100:0;
  return {quantity,routes,recommended,comparison:{current_cost_per_piece:current?.cost_per_piece??null,optimized_cost_per_piece:recommended?.cost_per_piece??null,saving_percent:saving}};
}

export const ProductionOptimizer={optimize:optimizeProduction};
