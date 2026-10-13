export const DEMO_MACHINE_PROFILES=[
  {
    machine_id:'DEMO-BOBST-1000-UNAPPROVED',
    label:'Demo Bobst 1000 · غير معتمد',
    status:'DEMO_UNAPPROVED',
    machine_type:'die_cutting',
    sheet:{max_width_mm:1000,max_height_mm:700,min_width_mm:220,min_height_mm:220},
    gripper_mm:12,
    compatible_processes:['die_cut'],
    performance:{speed_per_hour:5000},
    cost:{setup_cost:100,hourly_cost:220}
  },
  {
    machine_id:'DEMO-PLATEN-750-UNAPPROVED',
    label:'Demo Platen 750 · غير معتمد',
    status:'DEMO_UNAPPROVED',
    machine_type:'die_cutting',
    sheet:{max_width_mm:750,max_height_mm:550,min_width_mm:160,min_height_mm:160},
    gripper_mm:10,
    compatible_processes:['die_cut'],
    performance:{speed_per_hour:2600},
    cost:{setup_cost:65,hourly_cost:130}
  },
  {
    machine_id:'DEMO-DIGITAL-CUTTER-700-UNAPPROVED',
    label:'Demo Digital Cutter 700 · غير معتمد',
    status:'DEMO_UNAPPROVED',
    machine_type:'digital_cutting',
    sheet:{max_width_mm:700,max_height_mm:500,min_width_mm:120,min_height_mm:120},
    gripper_mm:0,
    compatible_processes:['die_cut','digital_cut'],
    performance:{speed_per_hour:850},
    cost:{setup_cost:25,hourly_cost:95}
  }
];

export const DEMO_COST_RATES={
  paper_cost_per_m2:3.25,
  printing_setup_cost:400,
  printing_cost_per_sheet:.1,
  lamination_cost_per_m2:0,
  foil_setup_cost:0,
  foil_cost_per_m2:8.5,
  uv_setup_cost:0,
  uv_cost_per_m2:5.5,
  die_cost:250,
  die_cut_setup_cost:100,
  die_cut_cost_per_piece:.075,
  glue_setup_cost:30,
  glue_cost_per_piece:.03,
  labor_cost:0,
  overhead_cost:0
};

export const DEMO_ROUTE_SHEETS=[
  {id:'DEMO-SHEET-1000x690',sheetWidth:1000,sheetHeight:690},
  {id:'DEMO-SHEET-900x640',sheetWidth:900,sheetHeight:640},
  {id:'DEMO-SHEET-720x520',sheetWidth:720,sheetHeight:520}
];

export const DEFAULT_PRODUCTION_OPTIONS={
  quantity:1000,
  margin_percent:20,
  machine_id:DEMO_MACHINE_PROFILES[0].machine_id
};
