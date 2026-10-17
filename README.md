# Mahabat Packaging Lab

مستودع تجريبي مستقل لتطوير مكتبة مهابة باستخدام واجهة واستوديو مشروع `library_mahaba` مع ربط القوالب المحوّلة بمحرك مهابة.

## قواعد المشروع

- لا يتم تعديل مستودع `elshrabasy/library_mahaba`.
- هذا المستودع مستقل بالكامل للتجارب.
- نعيد استخدام واجهة المكتبة، 3D Studio، Artwork، Foil/Spot UV، والمونتاج من المشروع الحالي بدل إعادة بنائها من الصفر.
- مصدر الهندسة للقوالب المحوّلة سيكون Mahabat Engine.
- نبدأ بالقوالب المحوّلة فقط، ثم نختبر الخامات، الطي ثلاثي الأبعاد، التصميم، والمونتاج.

## الهدف الأول

تشغيل أول قالب محوّل داخل نفس تجربة Mahaba Library الحالية مع:
1. أبعاد بارامترية من Mahabat Engine.
2. خامات هندسية فعلية.
3. 3D folding.
4. Artwork على المجسم.
5. Foil وSpot UV.
6. Nesting بالمحرك الحقيقي للمشروع.

> Source repository remains untouched: `elshrabasy/library_mahaba`.

## Pair interlocking

`studio-src/nest-pair-interlock.js` searches both 0°/180° pair orders using polygon vertex/edge contacts with clearance offsets. It retains area-, width-, and height-oriented pairs, repeats several cluster envelopes, and fills residual space with allowed single-piece rotations. Contact sampling uses contour features; acceptance always uses the full original polygon through `NestEngine.validate`, including clearance and the engine safety allowance.

Local refinement tries each piece and its 180° counterpart at contact offsets. Piece count, used bounding area, and height stay primary. A pair-envelope tie-break permits the initial flip when another piece temporarily fixes the overall bounds. Accepted layouts are exact-validated again. Search and refinement caches live only for one template/configuration. The search is heuristic, not a proof of global optimality.

The worker preserves the best count/compactness alternative across pattern, GA, and NFP results; production-specific recommendations remain in `productionBest`. Every phase honors the effective rotation policy. The 800×680 screenshot reproduction, its independent tighter witness, 800×510 residual fill, 1000×510 repeated pairs, and rotation locks run in `npm test`. The worker orchestration regression deliberately supplies a weaker legacy solver result to test the merge; the real NFP solver can also be checked with `node tests/nest-engine-irregular.mjs`.

`EVC11001` template geometry is frozen and is not changed by nesting searches.
