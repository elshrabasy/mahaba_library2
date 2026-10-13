export const STRAIGHT_TUCK_END_DEFINITION={
  schema_version:'1.0.0',
  template_id:'MAH-FEC-STE-001',
  name:'Straight Tuck End',
  category:'folding_carton',
  family:'tuck_carton',
  standard_code:'MAH-STE',
  version:'0.1.0-reference',
  status:'REFERENCE_IMPLEMENTATION',
  parameters:{
    L:{label:'Length',unit:'mm',min:25,max:600,default:215},
    W:{label:'Width',unit:'mm',min:15,max:300,default:80},
    H:{label:'Height',unit:'mm',min:20,max:600,default:45},
    dimension_mode:{enum:['ID','OD','SS'],default:'ID'},
    material_id:{default:'FBB-350-055'},
    grain_direction:{enum:['X','Y'],default:'Y'},
    glue_flap:{unit:'mm',min:8,max:40,default:15},
    bleed:{unit:'mm',min:0,max:10,default:3},
    safe_margin:{unit:'mm',min:0,max:15,default:4}
  },
  compatibility:{material_families:['paperboard'],processes:['offset_print','digital_print','laminate','foil','spot_uv','emboss','deboss','die_cut','fold_glue']},
  nesting:{allowed_rotations_deg:[0,180],grain_restriction:'parallel',minimum_spacing_mm:3},
  notes:['Reference architecture template. Manufacturing compensation remains unapproved until physical/reference calibration is complete.']
};
