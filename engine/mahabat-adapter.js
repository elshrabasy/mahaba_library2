// Mahabat Engine -> Mahaba Library Studio adapter.
// Converted templates use Mahabat geometry as the authority.

export const MAHABAT_SCHEMA = 'MahabatNativeModel/1';

export function assertMahabatEngine(){
  const engine=globalThis.MahabatEngine;
  if(!engine||typeof engine.generate!=='function')throw new Error('Mahabat Engine غير محمّل.');
  return engine;
}

export function generateMahabatTemplate(code,parameters={},options={}){
  const result=assertMahabatEngine().generate(code,parameters,options);
  if(!result||result.validation?.status==='FAIL')throw new Error(result?.validation?.message||'Mahabat Engine رفض القالب أو المقاسات الحالية.');
  return toStudioNativeModel(result);
}

export function normalizeParts(result){
  if(Array.isArray(result.parts)&&result.parts.length)return result.parts;
  // Single-sheet generators (pilot EVC11001) return the sheet directly.
  if(Number.isFinite(result.width)&&Number.isFinite(result.height)&&Array.isArray(result.lines))return [{
    name:result.name||result.code||'Sheet 1',
    width:result.width,
    height:result.height,
    lines:result.lines,
    outline:result.outline,
    polygon:result.polygon,
    panels:result.panels,
  }];
  throw new Error('Mahabat Engine لم يُرجع أجزاء هندسية.');
}

export function toStudioNativeModel(result){
  const parts=normalizeParts(result);
  return {
    schema:MAHABAT_SCHEMA,
    source:'mahabat-engine',
    code:result.code,
    templateId:`mahabat:${result.code}`,
    resourceVariant:result.resourceVariant||'mahabat',
    unitMeter:0.001,
    requestedParameters:result.input||result.parameters||{},
    materialInfo:result.material||result.mat||{},
    parameters:toStudioParameters(result),
    validation:result.validation||null,
    drawings:parts.map((part,index)=>({
      name:part.name||`Part ${index+1}`,
      objRectWidth:Number(part.width),
      objRectHeight:Number(part.height),
      available:true,
      mahabaPartIndex:index,
      source:'mahabat-engine'
    })),
    mahabaGeometry:parts,
    panelGraph:result.panelGraph||result.panels||null,
    fold:result.fold||result.motion||null,
    animations:result.animations||{endTime:0,phases:[]},
    stages:result.stages||{},
    metadata:{...(result.metadata||{}),dimensionType:result.dimensionType,fluteDirection:result.fluteDirection},
    // Native Three.js contract is added by mahabat-native.js; keep geometry explicit meanwhile.
    node:result.node||null,
    geometries:result.geometries||{},
    materials:result.materials||{}
  };
}

export function studioSheet(model,drawingIndex=0){
  const part=model.mahabaGeometry?.[drawingIndex];
  if(!part)throw new Error('جزء الرسم غير موجود.');
  const polygon=(part.outline||part.polygon||[]).map(p=>[Number(p[0]),Number(p[1])]);
  if(polygon.length<3)throw new Error('محيط القص غير مكتمل.');
  return {
    name:part.name||model.drawings[drawingIndex]?.name,
    width:Number(part.width),
    height:Number(part.height),
    polygon,
    cuts:normalizeLines(part,'cut'),
    creases:normalizeLines(part,'crease'),
    sourceBacked:false,
    source:'mahabat-engine',
    nestingSupported:true
  };
}

function normalizeLines(part,type){
  const direct=part[type==='cut'?'cuts':'creases'];
  if(Array.isArray(direct))return direct.map(line=>line.map(p=>[Number(p[0]),Number(p[1])]));
  return (part.lines||[]).filter(line=>line.type===type).flatMap(line=>{
    // The initial Studio contract preserves endpoints. Curved cut segments remain in the
    // Mahabat geometry and are expanded by the native bridge before production export.
    if(!line.a||!line.b)return [];
    return [[[Number(line.a[0]),Number(line.a[1])],[Number(line.b[0]),Number(line.b[1])]]];
  });
}

function toStudioParameters(result){
  const input=result.input||result.parameters||{};
  const keys=['L','W','H','A','B','D','DT','MAT','FD'].filter(k=>Number.isFinite(Number(input[k])));
  const map={};
  for(const k of keys)map[k]={paramName:k,value:Number(input[k]),expression:String(input[k]),calcResult:'Success'};
  return {paramMap:map,drawInfos:[{groups:[{groupId:'main',paramKeys:keys.filter(k=>!['MAT','FD'].includes(k))}]}]};
}
