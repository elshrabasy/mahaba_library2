export const WEEKLY_DISPLAY_DEFINITION={
  schema_version:'1.0.0',
  template_id:'MAH-WEEKLY-DISPLAY-001',
  name:'Weekly Display Prototype',
  category:'display_packaging',
  family:'display_carton',
  standard_code:'MAH-WEEKLY',
  version:'0.1.0-pdf-prototype',
  status:'PROTOTYPE_FROM_PDF',
  parameters:{
    W:{label:'Main panel width',unit:'mm',min:80,max:900,default:300},
    H:{label:'Main panel height',unit:'mm',min:80,max:900,default:298},
    D:{label:'Side depth',unit:'mm',min:20,max:300,default:84.5},
    top_depth:{label:'Top panel depth',unit:'mm',min:20,max:300,default:84.5},
    lower_depth:{label:'Lower hinge depth',unit:'mm',min:20,max:300,default:88},
    bottom_h:{label:'Long bottom panel height',unit:'mm',min:60,max:900,default:298},
    hole_d:{label:'Circular opening diameter',unit:'mm',min:20,max:700,default:220},
    dimension_mode:{enum:['SS'],default:'SS'},
    material_id:{default:'FBB-350-055'},
    grain_direction:{enum:['X','Y'],default:'Y'}
  },
  compatibility:{material_families:['paperboard'],processes:['offset_print','digital_print','laminate','die_cut','crease','fold_glue']},
  nesting:{allowed_rotations_deg:[0,180],grain_restriction:'parallel',minimum_spacing_mm:3},
  notes:[
    'Prototype reconstructed from the uploaded one-page PDF for in-engine visual testing.',
    'Geometry proportions are approximate until physical dimensions or vector source are supplied.',
    'The circular opening is represented as a cut path; panel mesh subtraction is not asserted in this prototype.'
  ]
};
