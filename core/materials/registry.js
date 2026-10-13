// Mahabat Engineering Core V1 — deterministic material registry.
// Engineering properties are kept separate from rendering properties.

export const MATERIAL_REGISTRY_VERSION='1.1.1';

const MATERIALS=[
  {id:'MAT-CORR-E-150',legacyId:1,key:'E-flute',family:'corrugated',name:'E Flute',engineering:{thickness_mm:1.5,gsm:null,flute:'E',wall:'single',grain_mode:'flute_direction',bend_behavior:'corrugated_fold',crease_behavior:'corrugated_score'},manufacturing:{compatible_processes:['print','laminate','die_cut','fold_glue'],cost_per_m2:null},rendering:{profile:'corrugated-e',texture_resource:null},legacyTypes:['E Flute','Corrugated Cardboard']},
  {id:'MAT-CORR-B-300',legacyId:2,key:'B-flute',family:'corrugated',name:'B Flute',engineering:{thickness_mm:3,gsm:null,flute:'B',wall:'single',grain_mode:'flute_direction',bend_behavior:'corrugated_fold',crease_behavior:'corrugated_score'},manufacturing:{compatible_processes:['print','laminate','die_cut','fold_glue'],cost_per_m2:null},rendering:{profile:'corrugated-b',texture_resource:null},legacyTypes:['B Flute','Corrugated Cardboard']},
  {id:'MAT-CORR-C-400',legacyId:3,key:'C-flute',family:'corrugated',name:'C Flute',engineering:{thickness_mm:4,gsm:null,flute:'C',wall:'single',grain_mode:'flute_direction',bend_behavior:'corrugated_fold',crease_behavior:'corrugated_score'},manufacturing:{compatible_processes:['print','laminate','die_cut','fold_glue'],cost_per_m2:null},rendering:{profile:'corrugated-c',texture_resource:null},legacyTypes:['C Flute','Corrugated Cardboard']},
  {id:'MAT-CORR-BC-650',legacyId:4,key:'BC-double',family:'corrugated',name:'BC Double Wall',engineering:{thickness_mm:6.5,gsm:null,flute:'BC',wall:'double',grain_mode:'flute_direction',bend_behavior:'corrugated_fold',crease_behavior:'corrugated_score'},manufacturing:{compatible_processes:['print','laminate','die_cut','fold_glue'],cost_per_m2:null},rendering:{profile:'corrugated-bc',texture_resource:null},legacyTypes:['BC Flute','Double-Wall Board','Corrugated Cardboard']},
  {id:'FBB-350-055',legacyId:101,key:'FBB-350-055',family:'paperboard',name:'FBB 350 gsm · 0.55 mm',engineering:{thickness_mm:.55,gsm:350,flute:null,wall:'solid',grain_mode:'grain_direction',bend_behavior:'paperboard_fold',crease_behavior:'matrix_crease'},manufacturing:{compatible_processes:['offset_print','digital_print','laminate','foil','spot_uv','emboss','deboss','die_cut','fold_glue'],cost_per_m2:null},rendering:{profile:'fbb-coated',texture_resource:null},legacyTypes:['FBB','Folding Box Board','Paperboard']}
];

const freezeDeep=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const v of Object.values(value))freezeDeep(v);}return value;};
freezeDeep(MATERIALS);
const BY_ID=new Map(),BY_LEGACY=new Map(),BY_KEY=new Map();for(const m of MATERIALS){BY_ID.set(String(m.id),m);if(m.legacyId!=null)BY_LEGACY.set(Number(m.legacyId),m);BY_KEY.set(String(m.key).toLowerCase(),m);}
export function getMaterial(id){if(id&&typeof id==='object'&&id.id)return BY_ID.get(String(id.id))||null;if(typeof id==='number'||(/^\d+$/.test(String(id))))return BY_LEGACY.get(Number(id))||null;const key=String(id||'');return BY_ID.get(key)||BY_KEY.get(key.toLowerCase())||null;}
export function listMaterials(){return [...MATERIALS];}
export function requireMaterial(id){const m=getMaterial(id);if(!m)throw new Error(`Unknown material: ${id}`);return m;}
export function toLegacyMaterial(material){const out={key:material.key,family:material.family,name:material.name,thickness:material.engineering.thickness_mm,types:[...material.legacyTypes]};if(material.engineering.gsm!=null)out.grammage=material.engineering.gsm;return out;}
export function toModelMaterial(material,{grain_direction='Y'}={}){return {material_id:material.id,key:material.key,name:material.name,material_family:material.family,gsm:material.engineering.gsm,thickness_mm:material.engineering.thickness_mm,flute:material.engineering.flute,grain_direction,bend_behavior:material.engineering.bend_behavior,crease_behavior:material.engineering.crease_behavior,cost_per_m2:material.manufacturing.cost_per_m2,render_profile:{...material.rendering}};}
export const MaterialRegistry={version:MATERIAL_REGISTRY_VERSION,get:getMaterial,require:requireMaterial,list:listMaterials,toLegacy:toLegacyMaterial,toModel:toModelMaterial};
