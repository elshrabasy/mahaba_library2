import {EngineInputError,TEMPLATE,DIMENSION_TYPES,FLUTE_DIRECTIONS} from './EVC11001.js';
import {MaterialRegistry} from '../../core/materials/registry.js';
import {CompensationEngine} from '../../core/compensation/engine.js';

// Behavior-preserving Core V1 entry point for EVC11001.
// The geometry implementation remains the existing template during migration,
// but material selection and compensation rules now come from Engineering Core.
export function generateEVC11001Core(input={},options={}){
  const p={
    L:Number(input.L??TEMPLATE.params.L.default),
    W:Number(input.W??TEMPLATE.params.W.default),
    H:Number(input.H??TEMPLATE.params.H.default),
    DT:Number(input.DT??1),
    MAT:Number(input.MAT??1),
    FD:Number(input.FD??2)
  };
  for(const key of ['L','W','H']){
    const spec=TEMPLATE.params[key];
    if(!Number.isFinite(p[key])||p[key]<spec.min||p[key]>spec.max)throw new EngineInputError(`${key} خارج المجال ${spec.min}–${spec.max} مم.`);
  }
  if(!DIMENSION_TYPES[p.DT])throw new EngineInputError('نوع القياس غير معروف.');
  const coreMaterial=MaterialRegistry.get(p.MAT);
  if(!coreMaterial)throw new EngineInputError('الخامة غير معروفة.');
  if(!FLUTE_DIRECTIONS[p.FD])throw new EngineInputError('اتجاه الفلوت غير معروف.');

  const material=MaterialRegistry.toLegacy(coreMaterial);
  const rules=CompensationEngine.compileLegacyRules('corrugated-default');
  const g=TEMPLATE.generate(p,material,rules,options);
  const compensation=CompensationEngine.evaluate({ruleSet:rules.id,thickness_mm:coreMaterial.engineering.thickness_mm});

  return {
    ...g,
    validation:{status:'PASS',errors:[],warnings:[]},
    dimensionType:DIMENSION_TYPES[p.DT],
    fluteDirection:FLUTE_DIRECTIONS[p.FD],
    engineeringCore:{
      version:'1.0.0',
      material_id:coreMaterial.id,
      material_registry_version:MaterialRegistry.version,
      compensation
    }
  };
}
