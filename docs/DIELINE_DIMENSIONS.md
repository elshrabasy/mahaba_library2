# Live box dimensions

The Studio flat and split previews show L, W and H using the current requested
box dimensions in millimetres. The ruler button hides or shows the guides.
Labels refresh with the rebuilt box, artwork side and preview size.

Anchors come from the generated body panels, not estimated SVG proportions:

| Template | L | W | H |
| --- | --- | --- | --- |
| EVC11001 | P1 | P2 | P3 |
| MAH-FEC-STE-001 | P_BACK | P_SIDE_R | P_FRONT |

Labels report the selected ID, OD or SS input convention. Their values are not
the compensated score-to-score lengths: material allowances remain in the
generated cutting and creasing geometry. Inside artwork mirrors the anchors
without mirroring the label text.

Guides are a preview-only SVG layer. They do not change frozen EVC11001
geometry, nesting contours, artwork textures or 1:1 SVG/PDF production exports.
Unsupported templates or missing panel metadata receive no guessed anchors.

Run `npm run test:ui` for live-label, mirroring and export-isolation regressions.
