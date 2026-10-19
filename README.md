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

## Studio experience

The Studio v2 Atelier interface shares a visual system with Nesting Pro and supports Arabic/English, dark/light preferences, responsive tool sheets, keyboard focus containment, and reduced motion. `F` fits the preview; `Esc` closes a mobile tool sheet or exits focused preview. Export and project actions use the existing Studio methods. The initial model opens folded; subsequent parameter changes retain the chosen fold position.

`studio-experience.js` coordinates presentation around the existing Studio. The UI controller temporarily disconnects its mutation observer during its own updates, reconnects in `finally`, and updates scene colors only when the theme changes. Run the targeted workflow/keyboard/observer regression with `npm run test:ui`; the main suite continues to check frozen EVC11001 geometry.

## Pair interlocking

`studio-src/nest-pair-interlock.js` searches both 0°/180° pair orders using polygon vertex/edge contacts with clearance offsets. It retains area-, width-, and height-oriented pairs, repeats several cluster envelopes, and fills residual space with allowed single-piece rotations. If the compact contact shortlist cannot add a piece, residual fill searches the full generated contact set. Contact sampling uses contour features; acceptance always uses the full original polygon through `NestEngine.validate`, including clearance and the engine safety allowance.

Local refinement tries each piece and its 180° counterpart at contact offsets. Piece count, used bounding area, and height stay primary. A pair-envelope tie-break permits the initial flip when another piece temporarily fixes the overall bounds. Accepted layouts are exact-validated again. Search and refinement caches live only for one template/configuration. The search is heuristic, not a proof of global optimality.

The worker preserves the best count/compactness alternative across pattern, GA, and NFP results; production-specific recommendations remain in `productionBest`. Every phase honors the effective rotation policy; the legacy NFP strategy retains the requested base angles while the intelligent search may also use explicitly permitted cross rotations. The 800×680 screenshot reproduction, its independent tighter witness, 800×510 residual fill, 1000×510 repeated pairs, and rotation locks run in `npm test`. The worker orchestration regression deliberately supplies a weaker legacy solver result to test the merge, then also exercises the real NFP solver on a small concave polygon. The much heavier original EVC11001 NFP regression is separate: `node tests/nest-engine-irregular.mjs`.

`EVC11001` template geometry is frozen and is not changed by nesting searches.
