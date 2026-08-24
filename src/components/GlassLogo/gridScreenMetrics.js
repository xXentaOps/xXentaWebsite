import { OVERSCALE, TARGET_CELL_PX } from './gridConstants'

// Where the grid's cell boundaries actually land in CSS pixels, so DOM
// content can be laid out *on* the grid rather than merely near it.
//
// The grid itself only exists inside a shader, as a fract() over the plane's
// own UVs (see GridPatternMaterial). Nothing about it is expressed in screen
// coordinates anywhere, which is fine for everything drawn in the same
// canvas — BackgroundGrid's buttons sit on cells by working in the same
// world units the plane does — and no use at all to an <img> in the DOM
// above it. This solves the same phase the shader uses, once, for the two
// numbers the DOM needs: how big a cell is, and where the boundaries sit.
//
// Both are derived, never guessed: TARGET_CELL_PX is by construction the
// screen size of a cell at scale 1 (see gridConstants), so a zoomed cell is
// exactly that times the zoom, and the boundaries follow from the same
// expression the fragment shader wraps.
//
// Returned as a phase rather than a list of boundaries: they are evenly
// spaced by definition, so one offset in [0, cell) plus any whole number of
// cells reaches all of them, which is exactly the shape CSS calc() wants.
export function gridScreenMetrics({ width, height, scale, screenOffset }) {
  const cell = TARGET_CELL_PX * scale

  // X — the shader keeps the plane's own left-edge phase, fract(vUv.x *
  // repeat.x), so boundaries sit at world x = k*cellSize - planeWidth/2.
  // In screen terms that is k cells out from the plane's left edge, with the
  // plane centred on the canvas and scaled about that centre.
  const firstX = width / 2 - (scale * width * OVERSCALE) / 2

  // Y — rephased by the shader around vUv.y = 0.5 (the viewport's true
  // vertical centre) and then shifted a whole screen per screenOffset by
  // useSeamlessGrid, which is what makes this canvas continue the hero's own
  // pattern rather than start a new one. Solving the same expression for
  // where it wraps, and folding in the group's bottom-edge-pinned zoom
  // compensation, the boundaries come out at this less m cells, m whole:
  //
  //   height*(1 - screenOffset*scale) + scale*(TARGET_CELL_PX/2 - height/2)
  //
  // A screen's worth of travel is not a whole number of cells (a 900px
  // viewport is 5.625 of them), so the offset genuinely changes the phase
  // rather than landing back on it — hence carrying screenOffset here rather
  // than assuming every canvas shares one.
  const firstY =
    height * (1 - screenOffset * scale) + scale * (TARGET_CELL_PX / 2 - height / 2)

  const wrap = (value) => ((value % cell) + cell) % cell
  return { cell, phaseX: wrap(firstX), phaseY: wrap(firstY) }
}

// Nudge needed to move `edge` onto the nearest boundary — the whole point of
// the phase above. Kept here next to the maths it depends on rather than
// inlined at the one call site, so the two cannot drift apart.
export function snapToGrid(edge, phase, cell) {
  return phase + Math.round((edge - phase) / cell) * cell - edge
}
