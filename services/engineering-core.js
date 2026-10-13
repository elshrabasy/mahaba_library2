import {generateMahabatModel} from '../engine/registry.js';
import {ProductionValidationEngine} from '../core/validation/engine.js';
import {CostEngine} from '../core/cost/engine.js';
import {MachineEngine} from '../core/machines/engine.js';
import {NestingOrchestrator} from '../engines/nesting/orchestrator.js';
import {ProductionOptimizer} from '../engines/production/optimizer.js';
import {FoldingEngine} from '../core/folding/graph.js';

// Service facade mirrors the future FastAPI surface while Core V1 remains browser/node compatible.
export function generateTemplate(templateId,input={}){return generateMahabatModel(templateId,input);}
export function validateGeometry(model){return ProductionValidationEngine.validate(model);}
export function simulateFold(model,{progress=1}={}){return {sequence:FoldingEngine.sequence(model),state:FoldingEngine.state(model,progress)};}
export function optimizeNesting(model,{solver,...settings}={}){return NestingOrchestrator.solveRegular(solver,model,settings);}
export function estimateCost(model,options={}){return CostEngine.estimate(model,options);}
export function matchMachines(model,machines=[]){return MachineEngine.match(model,machines);}
export function validateProduction(model,options={}){return ProductionValidationEngine.validate(model,options);}
export function optimizeProduction(model,{solver,...options}={}){return ProductionOptimizer.optimize({solver,model,...options});}

export const EngineeringService={
  generateTemplate,
  validateGeometry,
  simulateFold,
  optimizeNesting,
  estimateCost,
  matchMachines,
  validateProduction,
  optimizeProduction
};
