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

## Navigation and cut curves

Scroll over the flat drawing to zoom at the pointer. Drag to pan, or use the
middle mouse button / Space + drag. The selected move tool protects artwork
placement; turn it off, or use Alt + drag, to align artwork instead.
The fit button, F, 0 or Home restores the drawing. Keyboard + / - zoom and the
arrow keys pan when the drawing has focus. A new box size refits automatically;
artwork redraws retain the current view. Production exports ignore this camera.

Native tuck panels, flat sheets, nesting cut previews and exports use the same
arc sampling. Frozen source paths and nesting contours remain unchanged; arcs
must never be replaced with their straight endpoint chords.
