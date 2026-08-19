// Shared between BackgroundGrid (the hero's own interactive grid) and
// BackgroundGlowSection (a second, plain ambient copy further down the
// page) — pulled into their own module, not exported from BackgroundGrid.jsx
// itself, so both stay components-only (React Fast Refresh only fast-
// refreshes files that exclusively export components).

// Fixed screen-pixel cell size — the "size" knob for the grid. Deliberately
// a pixel target rather than a fixed column count: a fixed count means cell
// size = viewport width / count, so the squares themselves grow and shrink
// as the window resizes. Pinning the pixel size instead means the window
// gains or loses whole columns on resize, but each square stays the same
// physical size — matches how the stroke widths below are already pinned.
export const TARGET_CELL_PX = 160
// Plane is oversized slightly past the viewport so the pattern still
// covers the corners at extreme aspect ratios.
export const OVERSCALE = 1.05

// Stroke sizing is done in actual screen pixels (converted to cell-fraction
// uniforms in GridPlane), not cell-fraction constants directly — a fraction
// of the cell scales with viewport width (since cell size = width /
// COLUMNS), so a fixed fraction reads thicker on a wide window than in a
// narrow one. Pixel targets stay visually the same size everywhere.
export const DIRECT_STYLE = {
  lineHalfWidthPx: 0.4,
  lineBlurPx: 1.2,
  plusHalfWidthPx: 0.4,
  plusBlurPx: 2.5,
  plusArmLengthPx: 4,
  plusArmBlurPx: 3.5,
  lineOpacity: 0.012,
  plusOpacity: 0.027,
}

// The hero's own grid isn't just DIRECT_STYLE — GlassLogoGroup's "one real,
// visible render" pass (see its priority-1 useFrame) has *both* the default
// layer and OVERLAY_LAYER enabled together, so BackgroundGrid's layer-0
// plane (this style — meant to be seen only via the glass's own backdrop
// refraction) actually shows up directly too, composited underneath the
// crisp OVERLAY_LAYER plane. That soft, wide-blurred layer is what reads as
// a glow around the crisp lines. BackgroundGlowSection renders both for the
// same reason — without this one, its grid reads flatter than the hero's.
export const THROUGH_GLASS_STYLE = {
  lineHalfWidthPx: 0,
  lineBlurPx: 11,
  plusHalfWidthPx: 0,
  plusBlurPx: 18,
  plusArmLengthPx: 2.5,
  plusArmBlurPx: 20,
  lineOpacity: 0.004,
  plusOpacity: 0.0065,
}

// A single highlighted grid-line segment — the left edge of one specific
// cell, drawn solid rather than as a corner cross (see uEdgeEnabled in
// BackgroundGrid's GridPatternMaterial) — for BackgroundGlowSection's "one
// square has a blue edge" callout. Same crisp, barely-there anti-aliasing
// blur as BackgroundGrid's own BUTTON_STYLE corners, just a thinner
// half-width — a full cell-height line reads as heavier than the same
// thickness does over a corner's much shorter arm, so it needed to come
// down a bit to still feel like the same mark language rather than a
// bolder one. Lives here, not alongside BUTTON_STYLE in BackgroundGrid.jsx
// itself, specifically so it can stay a plain constant export shared by
// both files — mixing a non-component export into a component file (tried
// first) breaks React Fast Refresh's ability to hot-swap that file cleanly,
// the same class of "Could not Fast Refresh" issue this file's other
// exports were already written to avoid.
export const EDGE_STYLE = {
  halfWidthPx: 0.75,
  blurPx: 1,
  opacity: 0.9,
  color: [0.23, 0.51, 0.96], // #3B82F6 — same blue as BUTTON_STYLE
}
