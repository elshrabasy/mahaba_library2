import {v1ToLegacyGeometry} from './legacy-v1.js';
import {buildMahabatNative} from '../../engine/mahabat-native.js';

// Temporary compatibility adapter: Core V1 model -> current Mahaba native runtime schema.
// Remove only after the React/Three renderer consumes GeneratedPackageModel directly.
export function generatedModelToNative(model){
  return buildMahabatNative(v1ToLegacyGeometry(model));
}
