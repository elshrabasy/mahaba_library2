import {validatePolygon} from '../geometry/kernel.js';
import {buildFoldGraph} from '../folding/graph.js';

const WEIGHTS={geometry:25,structure:20,material:15,machine:15,nesting:10,printing:10,cost:5};
const check=(id,group,status,message,details={})=>({id,group,status,message,...details});

function relationErrors(model){
  const ids=new Set((model.panels||[]).map(p=>p.panel_id)),errors=[];
  for(const kind of ['glue_relations','lock_tabs','slot_tab_relations'])for(const r of model.assembly?.[kind]||[]){
    const source=r.source||r.tab||r.from,target=r.target||r.slot||r.to;
    if(source&&!ids.has(source))errors.push({kind,id:r.relation_id||null,field:'source',panel:source});
    if(target&&!ids.has(target))errors.push({kind,id:r.relation_id||null,field:'target',panel:target});
  }
  return errors;
}

export function validateProduction(model,{machine=null}={}){
  const checks=[];
  const outline=model?.nesting?.outer_polygon||[];
  const poly=validatePolygon(outline);
  checks.push(check('geometry.outer_polygon','geometry',poly.ok?'PASS':'FAIL',poly.ok?'Outer polygon valid':'Outer polygon invalid',{errors:poly.errors}));
  const panelErrors=[];for(const p of model.panels||[]){const v=validatePolygon(p.polygon||[]);if(!v.ok)panelErrors.push({panel_id:p.panel_id,errors:v.errors});}
  checks.push(check('geometry.panels','geometry',panelErrors.length?'FAIL':'PASS',panelErrors.length?'One or more panels are invalid':'Panel polygons valid',{errors:panelErrors}));
  const graph=buildFoldGraph(model);checks.push(check('structure.fold_graph','structure',graph.ok?'PASS':'FAIL',graph.ok?'Fold graph references valid':'Fold graph has invalid references',{errors:graph.errors}));
  const missingCreases=(model.folds||[]).filter(f=>f.crease_id&&!((model.geometry?.crease_paths||[]).some(c=>c.id===f.crease_id))).map(f=>f.fold_id);
  checks.push(check('structure.fold_crease_links','structure',missingCreases.length?'FAIL':'PASS',missingCreases.length?'Folds reference missing creases':'Fold-to-crease links valid',{folds:missingCreases}));
  const assemblyErrors=relationErrors(model);checks.push(check('structure.assembly_relations','structure',assemblyErrors.length?'FAIL':'PASS',assemblyErrors.length?'Assembly relations reference missing panels':'Assembly panel relations valid',{errors:assemblyErrors}));
  const collisionEvidence=model.validation_evidence?.fold_collision_checked===true,collisionFailures=model.validation_evidence?.fold_collisions||[];
  checks.push(check('structure.fold_collision','structure',collisionFailures.length?'FAIL':collisionEvidence?'PASS':'NEEDS_REVIEW',collisionFailures.length?'Fold collision detected':collisionEvidence?'Fold collision simulation passed':'Fold collision simulation has not been certified yet',{collisions:collisionFailures}));
  const m=model.material||{},th=Number(m.thickness_mm);checks.push(check('material.thickness','material',Number.isFinite(th)&&th>0?'PASS':'FAIL',Number.isFinite(th)&&th>0?'Material thickness valid':'Material thickness missing or invalid'));
  const ruleStatus=String(model.compensation?.status||model.compensation?.rule_status||'UNAPPROVED').toUpperCase();checks.push(check('material.compensation_approval','material',ruleStatus==='APPROVED'?'PASS':'NEEDS_REVIEW',ruleStatus==='APPROVED'?'Compensation rule set approved':'Compensation rule set requires calibration/approval'));
  const grain=model.material?.grain_direction||null,grainRule=model.nesting?.grain_restriction||null;checks.push(check('material.grain_direction','material',grain&&grainRule?'PASS':'NEEDS_REVIEW',grain&&grainRule?'Material grain/flute direction defined':'Material grain/flute direction needs review'));
  const rotations=model.nesting?.allowed_rotations_deg||[];checks.push(check('nesting.outer_polygon','nesting',outline.length>=3?'PASS':'FAIL',outline.length>=3?'True outer polygon available':'Nesting polygon missing'));checks.push(check('nesting.rotations','nesting',rotations.length?'PASS':'FAIL',rotations.length?'Allowed rotations defined':'Allowed rotations missing'));
  const spacing=Number(model.nesting?.minimum_spacing_mm);checks.push(check('nesting.spacing','nesting',Number.isFinite(spacing)&&spacing>=0?'PASS':'NEEDS_REVIEW',Number.isFinite(spacing)&&spacing>=0?'Minimum spacing defined':'Minimum nesting spacing needs review'));checks.push(check('nesting.grain','nesting',grainRule?'PASS':'NEEDS_REVIEW',grainRule?'Grain restriction available':'Nesting grain restriction missing'));
  const bleed=model.parameters?.bleed??model.parameters?.resolved?.bleed??null;checks.push(check('printing.bleed','printing',bleed==null?'NEEDS_REVIEW':Number(bleed)>=0?'PASS':'FAIL',bleed==null?'Bleed not yet specified':'Bleed parameter valid'));
  const safe=model.parameters?.safe_margin??model.parameters?.resolved?.safe_margin??null;checks.push(check('printing.safe_margin','printing',safe==null?'NEEDS_REVIEW':Number(safe)>=0?'PASS':'FAIL',safe==null?'Safe margin not yet specified':'Safe margin parameter valid'));
  const artworkReady=(model.panels||[]).every(p=>Array.isArray(p.artwork_area)&&p.artwork_area.length>=3);checks.push(check('printing.artwork_areas','printing',artworkReady?'PASS':'NEEDS_REVIEW',artworkReady?'Panel artwork areas available':'Some artwork areas are missing'));
  const metrics=model.metrics||{},metricsReady=['blank_area_mm2','outer_perimeter_mm','crease_length_mm'].every(k=>Number.isFinite(metrics[k]));checks.push(check('cost.metrics','cost',metricsReady?'PASS':'FAIL',metricsReady?'Cost-driving geometry metrics available':'Cost metrics incomplete'));
  if(machine){const b=model.nesting?.bounds||null,maxW=machine.max_sheet_width??machine.sheet?.max_width_mm,maxH=machine.max_sheet_height??machine.sheet?.max_height_mm,fit=!b||!Number.isFinite(maxW)||!Number.isFinite(maxH)?null:((b.width<=maxW&&b.height<=maxH)||(rotations.includes(90)&&b.height<=maxW&&b.width<=maxH));checks.push(check('machine.fit','machine',fit==null?'NEEDS_REVIEW':fit?'PASS':'FAIL',fit==null?'Machine dimensions not fully available':fit?'Blank fits machine':'Blank does not fit machine'));}else checks.push(check('machine.profile','machine','NEEDS_REVIEW','No machine profile selected'));
  const groupScores={};for(const [group,weight] of Object.entries(WEIGHTS)){const gs=checks.filter(c=>c.group===group);if(!gs.length){groupScores[group]=0;continue;}const ratio=gs.reduce((s,c)=>s+(c.status==='PASS'?1:(c.status==='NEEDS_REVIEW'?.5:0)),0)/gs.length;groupScores[group]=ratio*weight;}
  let confidence=Object.values(groupScores).reduce((a,b)=>a+b,0);const critical=checks.some(c=>c.status==='FAIL'&&['geometry','structure','material'].includes(c.group));if(critical)confidence=Math.min(confidence,60);if(ruleStatus!=='APPROVED')confidence=Math.min(confidence,85);const status=checks.some(c=>c.status==='FAIL')?'FAIL':checks.some(c=>c.status==='NEEDS_REVIEW')?'NEEDS_REVIEW':'PASS';return {status,production_confidence:Math.round(confidence*10)/10,checks,group_scores:groupScores};
}
export function attachValidation(model,options={}){return {...model,validation:validateProduction(model,options)};}
export const ProductionValidationEngine={validate:validateProduction,attach:attachValidation,weights:WEIGHTS};
