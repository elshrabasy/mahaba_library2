// Compatibility adapter for the migration period.
// Engineering Core V1 must not depend on Three.js or Studio internals.

const clone=v=>typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));

function bbox(poly=[]){
  if(!poly.length)return {minX:0,minY:0,maxX:0,maxY:0,width:0,height:0};
  const xs=poly.map(p=>+p[0]),ys=poly.map(p=>+p[1]);
  const minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs),maxY=Math.max(...ys);
  return {minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY};
}

function lineId(prefix,i){return `${prefix}-${String(i+1).padStart(3,'0')}`;}

export function legacyGeometryToV1(source){
  if(!source?.code)throw new Error('Legacy geometry requires code.');
  const cuts=[],creases=[],perforations=[],scores=[];
  (source.lines||[]).forEach((line,i)=>{
    const item={id:lineId(line.type==='crease'?'CR':'CUT',i),role:line.role||null,a:[+line.a[0],+line.a[1]],b:[+line.b[0],+line.b[1]]};
    if(line.arc)item.arc=clone(line.arc);
    if(line.type==='crease')creases.push(item);
    else if(line.type==='perforation')perforations.push(item);
    else if(line.type==='score')scores.push(item);
    else cuts.push(item);
  });

  const foldByPanel=new Map();
  let foldIndex=0;
  for(const panel of source.panels||[]){
    if(!panel.hinge)continue;
    const crease=creases.find(c=>sameSegment(c.a,c.b,panel.hinge[0],panel.hinge[1]));
    foldByPanel.set(panel.id,{
      fold_id:lineId('FOLD',foldIndex++),
      crease_id:crease?.id||null,
      parent_panel:panel.parent||null,
      child_panel:panel.id,
      fold_axis:{a:[...panel.hinge[0],0],b:[...panel.hinge[1],0]},
      fold_direction:(Number(panel.angle??90)>=0?'IN':'OUT'),
      target_angle_deg:Math.abs(Number(panel.angle??90)),
      fold_order:foldIndex*10,
      stage:panel.stage||null
    });
  }

  const material=source.material||{};
  const outline=(source.outline||[]).map(p=>[+p[0],+p[1]]),bounds=bbox(outline);
  const ruleSet=source.rules?.id||source.ruleSet?.id||'legacy-unversioned';
  const ruleVersion=source.rules?.version||source.ruleSet?.version||'0.0.0';
  const model={
    schema_version:'1.0.0',
    model_id:`legacy:${source.code}:${source.version||'unknown'}`,
    template:{template_id:source.code,name:source.name||source.code,category:material.family==='corrugated'?'corrugated':'packaging',family:material.family||null,standard_code:source.code,version:String(source.version||'legacy')},
    parameters:{...(source.input||source.requestedParameters||{}),resolved:clone(source.parameters||{})},
    material:{material_id:material.key||material.name||'legacy-material',key:material.key||material.name||'legacy-material',name:material.name||material.key||'legacy-material',material_family:material.family||'unknown',gsm:material.grammage??null,thickness_mm:Number(material.thickness||0),flute:material.key?.toLowerCase().includes('flute')?material.key:null,grain_direction:source.fluteDirection?.key||source.fluteDirection||'VARIABLE',bend_behavior:material.family==='corrugated'?'corrugated_fold':'legacy',crease_behavior:'legacy',cost_per_m2:null,render_profile:{}},
    compensation:{rule_set:ruleSet,rule_set_version:ruleVersion,dimension_mode:source.dimensionType?.key||source.dimensionType||null,rules_applied:[]},
    geometry:{units:'mm',cut_paths:cuts,crease_paths:creases,perforation_paths:perforations,score_paths:scores,glue_areas:[],safe_zones:[],bleed_zones:[]},
    panels:(source.panels||[]).map(panel=>({panel_id:panel.id,name:panel.name||panel.role||panel.id,role:panel.role||null,polygon:(panel.poly||[]).map(p=>[+p[0],+p[1]]),coordinate_system:{origin:[0,0],x_axis:[1,0],y_axis:[0,1]},dimensions:bbox(panel.poly||[]),artwork_area:(panel.poly||[]).map(p=>[+p[0],+p[1]]),parent_panel:panel.parent||null})),
    folds:[...foldByPanel.values()],
    assembly:{glue_relations:[],lock_tabs:[],slot_tab_relations:[],assembly_order:(source.animations?.phases||[]).map(p=>p.Name).filter(Boolean),multi_part_relations:[],legacy_stages:clone(source.stages||{}),legacy_animations:clone(source.animations||{})},
    nesting:{outer_polygon:outline,keep_out_zones:[],allowed_rotations_deg:[0,180],grain_restriction:source.fluteDirection?.key||source.fluteDirection||'VARIABLE',minimum_spacing_mm:0,edge_constraints:{left:0,right:0,top:0,bottom:0},gripper_constraint_mm:0},
    production:{compatible_processes:[],die_cutting_methods:[],gluing_method:null,required_operations:[],machine_constraints:{}},
    metrics:{blank_area_mm2:null,outer_perimeter_mm:null,crease_length_mm:null,crease_count:creases.length,glue_length_mm:null,glue_area_mm2:null,print_area_mm2:null,foil_area_mm2:0,uv_area_mm2:0,emboss_area_mm2:0,pieces_per_sheet:null,waste_percent:null},
    validation:{production_confidence:null,status:source.validation?.status||'UNVALIDATED',checks:[]}
  };
  model.parameters.__legacy_meta={code:source.code,name:source.name||source.code,version:source.version||'legacy',width:source.width||bounds.width,height:source.height||bounds.height,dimensionType:clone(source.dimensionType||null),fluteDirection:clone(source.fluteDirection||null),validation:clone(source.validation||{}),stages:clone(source.stages||{}),animations:clone(source.animations||{})};
  return model;
}

export function v1ToLegacyGeometry(model){
  if(model?.schema_version!=='1.0.0')throw new Error('GeneratedPackageModel V1 required.');
  const meta=model.parameters?.__legacy_meta||{};
  const line=(x,type)=>({type,a:[...x.a],b:[...x.b],role:x.role||undefined,...(x.arc?{arc:clone(x.arc)}:{})});
  const foldByChild=new Map((model.folds||[]).map(f=>[f.child_panel,f]));
  const panels=(model.panels||[]).map(p=>{
    const f=foldByChild.get(p.panel_id);
    return {id:p.panel_id,name:p.name,role:p.role,poly:p.polygon.map(q=>[...q]),parent:p.parent_panel||null,...(f?{hinge:[[f.fold_axis.a[0],f.fold_axis.a[1]],[f.fold_axis.b[0],f.fold_axis.b[1]]],stage:f.stage||undefined,angle:f.fold_direction==='OUT'?-f.target_angle_deg:f.target_angle_deg}:{})};
  });
  return {
    code:meta.code||model.template.template_id,
    version:meta.version||model.template.version,
    name:meta.name||model.template.name,
    input:Object.fromEntries(Object.entries(model.parameters||{}).filter(([k])=>!k.startsWith('__')&&k!=='resolved')),
    requestedParameters:Object.fromEntries(Object.entries(model.parameters||{}).filter(([k])=>!k.startsWith('__')&&k!=='resolved')),
    parameters:clone(model.parameters?.resolved||{}),
    material:{key:model.material.key||model.material.material_id,family:model.material.material_family,name:model.material.name||model.material.material_id,thickness:model.material.thickness_mm,grammage:model.material.gsm},
    dimensionType:clone(meta.dimensionType||model.compensation.dimension_mode||model.parameters?.dimension_mode),
    fluteDirection:clone(meta.fluteDirection||model.material.grain_direction),
    lines:[...model.geometry.cut_paths.map(x=>line(x,'cut')),...model.geometry.crease_paths.map(x=>line(x,'crease')),...model.geometry.perforation_paths.map(x=>line(x,'perforation')),...model.geometry.score_paths.map(x=>line(x,'score'))],
    outline:model.nesting.outer_polygon.map(p=>[...p]),
    panels,
    width:Number(meta.width||bbox(model.nesting.outer_polygon).width),
    height:Number(meta.height||bbox(model.nesting.outer_polygon).height),
    validation:clone(meta.validation||model.validation),
    stages:clone(meta.stages||model.assembly.legacy_stages||{}),
    animations:clone(meta.animations||model.assembly.legacy_animations||{})
  };
}

function sameSegment(a,b,c,d,tol=.35){
  const dist=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
  return (dist(a,c)<=tol&&dist(b,d)<=tol)||(dist(a,d)<=tol&&dist(b,c)<=tol);
}
