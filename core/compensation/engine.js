import {CORRUGATED_DEFAULT_RULE_SET} from './rule-sets/corrugated-default.js';

const RULE_SETS=new Map([[CORRUGATED_DEFAULT_RULE_SET.id,CORRUGATED_DEFAULT_RULE_SET]]);

function evalFormula(formula,thickness){
  switch(formula.op){
    case 'constant':return formula.value;
    case 'mul_thickness':return thickness*formula.factor;
    case 'div_thickness':return thickness/formula.divisor;
    case 'neg_div_thickness':return -thickness/formula.divisor;
    case 'thickness_plus':return thickness+formula.value;
    default:throw new Error(`Unsupported compensation formula: ${formula.op}`);
  }
}

export function getRuleSet(id){return RULE_SETS.get(id)||null;}
export function listRuleSets(){return [...RULE_SETS.values()];}
export function requireRuleSet(id){const r=getRuleSet(id);if(!r)throw new Error(`Unknown compensation rule set: ${id}`);return r;}

export function compileLegacyRules(ruleSetOrId='corrugated-default'){
  const set=typeof ruleSetOrId==='string'?requireRuleSet(ruleSetOrId):ruleSetOrId;
  const compiled={id:set.id,version:set.version,approvedBy:set.approvedBy??null,family:set.family,fluteCrease:{...set.fluteCrease}};
  for(const [name,formula] of Object.entries(set.formulas||{}))compiled[name]=d=>evalFormula(formula,Number(d));
  return compiled;
}

export function evaluateCompensation({ruleSet='corrugated-default',thickness_mm,names=null}){
  const set=requireRuleSet(ruleSet),thickness=Number(thickness_mm);
  if(!Number.isFinite(thickness)||thickness<0)throw new Error('thickness_mm must be a finite non-negative number.');
  const keys=names||Object.keys(set.formulas),values={};
  for(const name of keys){const formula=set.formulas[name];if(!formula)throw new Error(`Unknown compensation rule: ${name}`);values[name]=evalFormula(formula,thickness);}
  return {rule_set:set.id,rule_set_version:set.version,status:set.status,thickness_mm:thickness,values};
}

export const CompensationEngine={getRuleSet,requireRuleSet,listRuleSets,compileLegacyRules,evaluate:evaluateCompensation};
