import {WEEKLY_DISPLAY_DEFINITION as DEF} from './template-definition.js';
import {MaterialRegistry} from '../../core/materials/registry.js';
import {rect,bbox,polyline} from '../../core/geometry/kernel.js';
import {attachMetrics} from '../../core/metrics/engine.js';
import {attachValidation} from '../../core/validation/engine.js';

const num=(v,fallback)=>v==null?fallback:Number(v);
const copy=p=>p.map(q=>[q[0],q[1]]);
function pathId(prefix,n){return `${prefix}-${String(n).padStart(3,'0')}`;}
function makeSegments(points,type,role,start=1){return polyline(points,{type,role}).map((s,i)=>({id:pathId(type==='crease'?'CR':'CUT',start+i),role,a:s.a,b:s.b}));}
function panel(id,name,role,polygon,parent=null){return {panel_id:id,name,role,polygon:copy(polygon),coordinate_system:{origin:[polygon[0][0],polygon[0][1]],x_axis:[1,0],y_axis:[0,1]},dimensions:bbox(polygon),artwork_area:copy(polygon),parent_panel:parent};}
function crease(id,a,b,role){return {id,role,a:[...a],b:[...b]};}
function fold(fold_id,crease_id,parent_panel,child_panel,a,b,order,stage,direction='IN',angle=90){return {fold_id,crease_id,parent_panel,child_panel,fold_axis:{a:[a[0],a[1],0],b:[b[0],b[1],0]},fold_direction:direction,target_angle_deg:angle,fold_order:order,stage};}
function circleSegments(cx,cy,r,count=48,start=100){const pts=[];for(let i=0;i<=count;i++){const a=(Math.PI*2*i)/count;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}return makeSegments(pts,'cut','circular-opening',start);}

export function generateWeeklyDisplay(input={}){
  const p={
    W:num(input.W,DEF.parameters.W.default),
    H:num(input.H,DEF.parameters.H.default),
    D:num(input.D,DEF.parameters.D.default),
    top_depth:num(input.top_depth,DEF.parameters.top_depth.default),
    lower_depth:num(input.lower_depth,DEF.parameters.lower_depth.default),
    bottom_h:num(input.bottom_h,DEF.parameters.bottom_h.default),
    hole_d:num(input.hole_d,DEF.parameters.hole_d.default),
    dimension_mode:'SS',
    material_id:input.material_id||DEF.parameters.material_id.default,
    grain_direction:String(input.grain_direction||DEF.parameters.grain_direction.default).toUpperCase()
  };
  for(const key of ['W','H','D','top_depth','lower_depth','bottom_h','hole_d']){
    const spec=DEF.parameters[key];
    if(!Number.isFinite(p[key])||p[key]<spec.min||p[key]>spec.max)throw new Error(`${key} خارج المجال ${spec.min}–${spec.max} مم.`);
  }
  if(p.hole_d>=Math.min(p.W,p.H))throw new Error('hole_d must remain smaller than the main panel dimensions.');
  if(!DEF.parameters.grain_direction.enum.includes(p.grain_direction))throw new Error('grain_direction must be X or Y.');

  const material=MaterialRegistry.require(p.material_id);
  if(material.family!=='paperboard')throw new Error('Weekly Display prototype currently accepts paperboard materials only.');

  const W=p.W,H=p.H,D=p.D,T=p.top_depth,L=p.lower_depth,B=p.bottom_h;
  const x0=0,x1=W,y0=0,y1=H,y2=H+L,y3=y2+B;
  const P_MAIN=rect(x0,y0,x1,y1);
  const P_LEFT=rect(-D,y0,x0,y1);
  const P_RIGHT=rect(x1,y0,x1+D,y1);
  const P_TOP=rect(x0,-T,x1,y0);
  const P_LOWER=rect(x0,y1,x1,y2);
  const P_BOTTOM=rect(x0,y2,x1,y3);

  const outline=[
    [-D,y0],[x0,y0],[x0,-T],[x1,-T],[x1,y0],[x1+D,y0],[x1+D,y1],[x1,y1],
    [x1,y3],[x0,y3],[x0,y1],[-D,y1],[-D,y0]
  ];
  const cutPaths=[...makeSegments(outline,'cut','outer-boundary',1),...circleSegments(W/2,H/2,p.hole_d/2,48,100)];
  const creases=[
    crease('CR-001',[x0,y0],[x0,y1],'left-side-fold'),
    crease('CR-002',[x1,y0],[x1,y1],'right-side-fold'),
    crease('CR-003',[x0,y0],[x1,y0],'top-fold'),
    crease('CR-004',[x0,y1],[x1,y1],'lower-fold'),
    crease('CR-005',[x0,y2],[x1,y2],'bottom-panel-fold')
  ];
  const panels=[
    panel('P_MAIN','Main Panel','body',P_MAIN,null),
    panel('P_LEFT','Left Side','side',P_LEFT,'P_MAIN'),
    panel('P_RIGHT','Right Side','side',P_RIGHT,'P_MAIN'),
    panel('P_TOP','Top Panel','top',P_TOP,'P_MAIN'),
    panel('P_LOWER','Lower Hinge Panel','lower',P_LOWER,'P_MAIN'),
    panel('P_BOTTOM','Long Bottom Panel','bottom',P_BOTTOM,'P_LOWER')
  ];
  const folds=[
    fold('FOLD-001','CR-001','P_MAIN','P_LEFT',[x0,y0],[x0,y1],10,'sides','IN',90),
    fold('FOLD-002','CR-002','P_MAIN','P_RIGHT',[x1,y0],[x1,y1],20,'sides','IN',90),
    fold('FOLD-003','CR-003','P_MAIN','P_TOP',[x0,y0],[x1,y0],30,'top','IN',90),
    fold('FOLD-004','CR-004','P_MAIN','P_LOWER',[x0,y1],[x1,y1],40,'lower','IN',90),
    fold('FOLD-005','CR-005','P_LOWER','P_BOTTOM',[x0,y2],[x1,y2],50,'bottom','IN',90)
  ];
  const bounds=bbox(outline);
  let model={
    schema_version:'1.0.0',
    model_id:`${DEF.template_id}:${W}x${H}x${D}:${p.material_id}`,
    template:{template_id:DEF.template_id,name:DEF.name,category:DEF.category,family:DEF.family,standard_code:DEF.standard_code,version:DEF.version},
    parameters:{...p,resolved:{main_width:W,main_height:H,side_depth:D,hole_radius:p.hole_d/2}},
    material:MaterialRegistry.toModel(material,{grain_direction:p.grain_direction}),
    compensation:{rule_set:'pdf-prototype-direct-geometry',rule_set_version:'0.1.0',status:'PROTOTYPE',rule_status:'PROTOTYPE',rules_applied:[]},
    geometry:{units:'mm',cut_paths:cutPaths,crease_paths:creases,perforation_paths:[],score_paths:[],glue_areas:[],safe_zones:[],bleed_zones:[]},
    panels,folds,
    assembly:{glue_relations:[],lock_tabs:[],slot_tab_relations:[],assembly_order:['sides','top','lower','bottom'],multi_part_relations:[],legacy_stages:{sides:[0,1.4],top:[1.4,2.2],lower:[2.2,3.0],bottom:[3.0,4.0]},legacy_animations:{endTime:4,phases:[{Name:'Sides',endTime:1.4,steps:[{endTime:1.4}]},{Name:'Top',endTime:2.2,steps:[{endTime:.8}]},{Name:'Lower',endTime:3,steps:[{endTime:.8}]},{Name:'Bottom',endTime:4,steps:[{endTime:1}]}]}},
    nesting:{outer_polygon:copy(outline),keep_out_zones:[{id:'HOLE-001',shape:'circle',cx:W/2,cy:H/2,r:p.hole_d/2}],allowed_rotations_deg:[0,180],grain_restriction:'parallel',minimum_spacing_mm:3,edge_constraints:{left:3,right:3,top:3,bottom:3},gripper_constraint_mm:10,bounds},
    production:{compatible_processes:[...material.manufacturing.compatible_processes],die_cutting_methods:['platen','cylinder','bobst'],gluing_method:'manual_or_structure_specific',required_operations:['print','crease','die_cut'],machine_constraints:{min_blank_width_mm:50,min_blank_height_mm:50}},
    metrics:{},validation:{status:'UNVALIDATED',checks:[]}
  };
  model=attachMetrics(model);
  model=attachValidation(model);
  return model;
}

export const WeeklyDisplay={definition:DEF,generate:generateWeeklyDisplay};
