import {generateEVC11001} from './templates/EVC11001-native.js';
import {buildMahabatNative} from './mahabat-native.js';

const REGISTRY=new Map([
  ['EVC11001',{generate:generateEVC11001,status:'pilot'}],
]);

export function hasMahabatTemplate(code){return REGISTRY.has(code);}
export function listMahabatTemplates(){return [...REGISTRY].map(([code,v])=>({code,status:v.status}));}
export function generateMahabat(code,input={},options={}){
  const entry=REGISTRY.get(code);
  if(!entry)throw new Error(`القالب ${code} غير مضاف إلى Mahabat Engine Lab بعد.`);
  return entry.generate(input,options);
}
export function generateMahabatNative(code,input={},options={}){
  return buildMahabatNative(generateMahabat(code,input,options));
}

export const MahabatEngine={
  generate:generateMahabat,
  generateNative:generateMahabatNative,
  has:hasMahabatTemplate,
  list:listMahabatTemplates,
};

if(typeof globalThis!=='undefined')globalThis.MahabatEngine=MahabatEngine;
