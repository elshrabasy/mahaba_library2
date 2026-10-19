# Automatic Studio updates

Dimensions, measuring convention, board material and grain/flute direction
regenerate automatically for EVC11001 and Straight Tuck End. Input validation
keeps incomplete numbers out of the engine. Updates are debounced and serialized;
the latest captured edit is retained even when a previous rebuild is running.

Artwork scale, position and rotation also update automatically. Appearance,
finishing and lighting controls retain their existing immediate updates.
Pending artwork edits are scoped to the layer and geometry revision.

Removed from the Studio interface:
- Apply Dimensions and Original Size.
- Apply to Model and the direction-test artwork button.
- The manual Apply action in the selected-panel dimension card.
- The switch that could turn automatic geometry updates off.

Save/Open, SVG/PDF export, image capture, artwork reset/removal, effect removal,
camera controls and nesting search remain: these are distinct user actions.
Expensive nesting optimization still runs explicitly, not on each field edit.

Run `npm run test:ui` for queue, validation, template-isolation and artwork tests.
