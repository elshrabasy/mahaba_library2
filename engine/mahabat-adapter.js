// Mahabat Engine -> Mahaba Library Studio adapter.
// This file defines the contract only; actual converted-template generators
// are plugged in behind `window.MahabatEngine.generate`.

export const MAHABAT_SCHEMA = 'MahabatNativeModel/1';

export function assertMahabatEngine(){
  const engine = globalThis.MahabatEngine;
  if(!engine || typeof engine.generate !== 'function'){
    throw new Error('Mahabat Engine غير محمّل.');
  }
  return engine;
}

export function generateMahabatTemplate(code, parameters={}, material={}){
  const engine = assertMahabatEngine();
  const result = engine.generate(code, parameters, material);
  if(!result || result.validation?.status === 'FAIL'){
    throw new Error(result?.validation?.message || 'Mahabat Engine رفض القالب أو المقاسات الحالية.');
  }
  return toStudioNativeModel(result);
}

export function toStudioNativeModel(result){
  const parts = result.parts || [];
  if(!parts.length) throw new Error('Mahabat Engine لم يُرجع أجزاء هندسية.');

  // The Studio adapter deliberately keeps all engineering information explicit.
  // No bbox geometry, silent rescale, or visual-only material substitution.
  return {
    schema: MAHABAT_SCHEMA,
    source: 'mahabat-engine',
    code: result.code,
    unitMeter: 0.001,
    materialInfo: result.material || {},
    parameters: result.parameters || result.input || {},
    validation: result.validation || null,
    drawings: parts.map((part, index) => ({
      name: part.name || `Part ${index+1}`,
      objRectWidth: part.width,
      objRectHeight: part.height,
      available: true,
      mahabaPartIndex: index
    })),
    mahabaGeometry: parts,
    panelGraph: result.panelGraph || null,
    fold: result.fold || result.motion || null,
    metadata: result.metadata || {}
  };
}

export function studioSheet(model, drawingIndex=0){
  const part = model.mahabaGeometry?.[drawingIndex];
  if(!part) throw new Error('جزء الرسم غير موجود.');
  return {
    name: part.name || model.drawings[drawingIndex]?.name,
    width: part.width,
    height: part.height,
    polygon: part.outline || part.polygon || [],
    cuts: normalizeLines(part, 'cut'),
    creases: normalizeLines(part, 'crease')
  };
}

function normalizeLines(part, type){
  if(Array.isArray(part[type === 'cut' ? 'cuts' : 'creases'])){
    return part[type === 'cut' ? 'cuts' : 'creases'].map(line =>
      Array.isArray(line[0]?.[0]) ? line : line.map(p => [p[0], p[1]])
    );
  }
  return (part.lines || [])
    .filter(line => line.type === type)
    .map(line => [line.a, line.b].map(p => [p[0], p[1]]));
}
