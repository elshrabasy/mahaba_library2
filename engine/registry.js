import {generateEVC11001} from './templates/EVC11001-native.js';
import {buildMahabatNative} from './mahabat-native.js';
import {legacyGeometryToV1,v1ToLegacyGeometry} from '../core/adapters/legacy-v1.js';
import {generateStraightTuckEnd} from '../templates/straight-tuck-end/generate.js';

const REGISTRY=new Map([
  ['EVC11001',{kind:'legacy-geometry',generate:generateEVC11001,status:'pilot'}],
  ['MAH-FEC-STE-001',{kind:'core-v1',generateModel:generateStraightTuckEnd,status:'reference-v1'}],
]);
const ALIASES=new Map([['STE001','MAH-FEC-STE-001'],['STE','MAH-FEC-STE-001']]);
const resolveCode=code=>ALIASES.get(code)||code;

export function hasMahabatTemplate(code){return REGISTRY.has(resolveCode(code));}
export function listMahabatTemplates(){return [...REGISTRY].map(([code,v])=>({code,status:v.status,kind:v.kind}));}
export function generateMahabatModel(code,input={},options={}){
  const resolved=resolveCode(code),entry=REGISTRY.get(resolved);
  if(!entry)throw new Error(`القالب ${code} غير مضاف إلى Mahabat Engine Lab بعد.`);
  if(entry.kind==='core-v1')return entry.generateModel(input,options);
  return legacyGeometryToV1(entry.generate(input,options));
}
export function generateMahabat(code,input={},options={}){
  const resolved=resolveCode(code),entry=REGISTRY.get(resolved);
  if(!entry)throw new Error(`القالب ${code} غير مضاف إلى Mahabat Engine Lab بعد.`);
  if(entry.kind==='core-v1'){
    const model=entry.generateModel(input,options),legacy=v1ToLegacyGeometry(model);
    legacy.engineeringModel=model;
    legacy.validation=model.validation;
    legacy.dimensionType={key:model.parameters.dimension_mode,ar:model.parameters.dimension_mode};
    legacy.fluteDirection={key:model.parameters.grain_direction==='X'?'FD_X':'FD_Y',ar:'grain'};
    return legacy;
  }
  return entry.generate(input,options);
}
export function generateMahabatNative(code,input={},options={}){return buildMahabatNative(generateMahabat(code,input,options));}

export const MahabatEngine={generate:generateMahabat,generateModel:generateMahabatModel,generateNative:generateMahabatNative,has:hasMahabatTemplate,list:listMahabatTemplates};
if(typeof globalThis!=='undefined')globalThis.MahabatEngine=MahabatEngine;
