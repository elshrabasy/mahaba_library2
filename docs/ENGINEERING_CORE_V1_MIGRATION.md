# Mahabat Engineering Core V1 — Migration Baseline

## Goal
Introduce a deterministic engineering core without breaking the current Mahabat Studio, 3D runtime, artwork, finishes, nesting, or the existing EVC11001 pilot.

## Migration strategy
Use a strangler migration:

1. Keep the current Studio and native runtime unchanged.
2. Introduce versioned engineering contracts (`schemas/`).
3. Adapt current template output into `GeneratedPackageModel`.
4. Adapt the generated model back to the current native runtime while compatibility is required.
5. Build benchmark/golden tests before changing compensation or geometry behavior.
6. Implement Straight Tuck End as the first reference template only after contracts and benchmarks are stable.

## Baseline kept as-is
- `studio-src/shared-studio.js`
- `studio-src/native_runtime.js`
- `studio-src/native_gpu.js`
- artwork / foil / Spot UV workflow
- current nesting engine and worker architecture
- `engine/templates/EVC11001.js` as a regression fixture
- current EVC11001 tests

## Components to extract/redesign
- template rules embedded in template source
- material definitions embedded in templates
- compensation rules embedded in templates
- implicit panel/fold contracts
- native 3D model as source of truth
- production metrics, machine compatibility, costing and validation

## Compatibility contract
During V1 migration the data path is:

`Legacy Template Output -> GeneratedPackageModel V1 -> Legacy Native Adapter -> Current Studio`

The Studio remains a presentation layer. Geometry, materials, compensation, folding and production data are owned by Engineering Core.

## Reference template policy
The first reference template is `Straight Tuck End`.
No second benchmark template is implemented until the first passes geometry, material, compensation, folding, collision, artwork, nesting, metrics and production validation benchmarks.
