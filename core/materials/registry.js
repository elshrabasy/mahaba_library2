// Mahabat Engineering Core V1 — deterministic material registry.
// Engineering properties are kept separate from rendering properties.

export const MATERIAL_REGISTRY_VERSION='1.0.0';

const MATERIALS={
  1:{
    id:'MAT-CORR-E-150',legacyId:1,key:'E-flute',family:'corrugated',name:'E Flute',
    engineering:{thickness_mm:1.5,gsm:null,flute:'E',wall:'single',grain_mode:'flute_direction',bend_behavior:'corrugated_fold',crease_behavior:'corrugated_score'},
    manufacturing:{compatible_processes:['print','laminate','die_cut','fold_glue'],cost_per_m2:null},
    rendering:{profile:'corrugated-e',texture_resource:null},
    legacyTypes:['E Flute','Corrugated Cardboard']
  },
  2:{
    id:'MAT-CORR-B-300',legacyId:2,key:'B-flute',family:'corrugated',name:'B Flute',
    engineering:{thickness_mm:3,gsm:null,flute:'B',wall:'single',grain_mode:'flute_direction',bend_behavior:'corrugated_fold',crease_behavior:'corrugated_score'},
    manufacturing:{compatible_processes:['print','laminate','die_cut','fold_glue'],cost_per_m2:null},
    rendering:{profile:'corrugated-b',texture_resource:null},
    legacyTypes:['B Flute','Corrugated Cardboard']
  },
  3:{
    id:'MAT-CORR-C-400',legacyId:3,key:'C-flute',family:'corrugated',name:'C Flute',
    engineering:{thickness_mm:4,gsm:null,flute:'C',wall:'single',grain_mode:'flute_direction',bend_behavior:'corrugated_fold',crease_behavior:'corrugated_score'},
    manufacturing:{compatible_processes:['print','laminate','die_cut','fold_glue'],cost_per_m2:null},
    rendering:{profile:'corrugated-c',texture_resource:null},
    legacyTypes:['C Flute','Corrugated Cardboard']
  },
  4:{
    id:'MAT-CORR-BC-650',legacyId:4,key:'BC-double',family:'corrugated',name:'BC Double Wall',
    engineering:{thickness_mm:6.5,gsm:null,flute:'BC',wall:'double',grain_mode:'flute_direction',bend_behavior:'corrugated_fold',crease_behavior:'corrugated_score'},
    manufacturing:{compatible_processes:['print','laminate','die_cut','fold_glue'],cost_per_m2:null},
    rendering:{profile:'corrugated-bc',texture_resource:null},
    legacyTypes:['BC Flute','Double-Wall Board','Corrugated Cardboard']
  }
};

const freezeDeep=value=>{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.freeze(value);
    for(const v of Object.values(value))freezeDeep(v);
  }
  return value;
};
freezeDeep(MATERIALS);

export function getMaterial(id){return MATERIALS[Number(id)]||null;}
export function listMaterials(){return Object.values(MATERIALS);}
export function requireMaterial(id){const m=getMaterial(id);if(!m)throw new Error(`Unknown material: ${id}`);return m;}

// Temporary compatibility shape for legacy parametric templates.
export function toLegacyMaterial(material){
  return {
    key:material.key,
    family:material.family,
    name:material.name,
    thickness:material.engineering.thickness_mm,
    grammage:material.engineering.gsm,
    types:[...material.legacyTypes]
  };
}

export const MaterialRegistry={version:MATERIAL_REGISTRY_VERSION,get:getMaterial,require:requireMaterial,list:listMaterials,toLegacy:toLegacyMaterial};
