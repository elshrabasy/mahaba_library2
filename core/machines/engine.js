// Mahabat Machine Profile Engine V1.
function dims(machine){return {maxW:Number(machine.max_sheet_width??machine.sheet?.max_width_mm),maxH:Number(machine.max_sheet_height??machine.sheet?.max_height_mm),minW:Number(machine.min_sheet_width??machine.sheet?.min_width_mm??0),minH:Number(machine.min_sheet_height??machine.sheet?.min_height_mm??0)};}
export function evaluateMachine(model,machine){
  const b=model.nesting?.bounds||{},r=model.nesting?.allowed_rotations_deg||[0],d=dims(machine),reasons=[];
  const orientations=[{angle:0,w:b.width,h:b.height},...(r.includes(90)?[{angle:90,w:b.height,h:b.width}]:[])];
  const fits=orientations.filter(o=>o.w<=d.maxW&&o.h<=d.maxH&&o.w>=d.minW&&o.h>=d.minH);
  if(!fits.length)reasons.push('blank_outside_machine_sheet_range');
  const required=model.production?.compatible_processes||[],type=machine.machine_type||machine.type||null;
  if(type&&required.length&&machine.compatible_processes){const ok=required.some(p=>machine.compatible_processes.includes(p));if(!ok)reasons.push('process_incompatible');}
  const gripperNeed=Number(model.nesting?.gripper_constraint_mm||0),gripper=Number(machine.gripper??machine.gripper_mm??0);if(gripper<gripperNeed)reasons.push('gripper_too_small');
  return {machine_id:machine.machine_id||machine.id||machine.name,compatible:reasons.length===0,reasons,fit_orientations:fits,score:reasons.length?0:100-(fits[0]?Math.max(0,(d.maxW*d.maxH-fits[0].w*fits[0].h)/(d.maxW*d.maxH))*10:0)};
}
export function matchMachines(model,machines=[]){return machines.map(m=>evaluateMachine(model,m)).sort((a,b)=>Number(b.compatible)-Number(a.compatible)||b.score-a.score);}
export const MachineEngine={evaluate:evaluateMachine,match:matchMachines};
