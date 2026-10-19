# Artwork and finishing transform handles

Upload PNG/JPEG artwork on either print side, or upload a foil/Spot UV mask.
In the flat or split preview, choose the image in the floating toolbar.
The inspector's image selector and numeric placement fields edit the same target.

- Drag any corner to resize proportionally; the opposite corner stays fixed.
- Drag the upper circular handle to rotate. Hold Shift to snap to 15° steps.
- Drag inside the frame to move the selected image.
- Space-drag or middle-drag pans the drawing; the wheel zooms at the pointer.
- Escape or pointer cancellation restores the placement before the gesture.
- Reset restores only the selected image's scale, offset and rotation.

Artwork, foil and UV have independent placements, as do the inside and outside.
The preview and baked 3D textures use the same image-fitting and placement math.
The flat foil preview converts mask luminance to alpha coverage, matching the
3D shader instead of tinting the entire sheet with an opaque grayscale mask.
Project files retain the existing top-level artwork transform. Optional validated
`effectTransforms.foil` and `.uv` store independent mask transforms. Older projects
retain their aligned appearance on load; existing masks detach at their current
placement on the first artwork edit rather than jumping to a new position.

The frame and toolbar are preview-only. They never enter textures or SVG/PDF
cutting exports. No EVC11001 geometry is modified.

Run `npm run test:ui` for placement, gesture, persistence and regression checks.
