import { ABOUT_US_GRID_ZOOM_SCALE } from './gridConstants'
import { gridScreenMetrics } from './gridScreenMetrics'
import { pageMarginPx } from './pageMargin'

// Which grid squares About Us's own content sits on, in whole cell indices
// off the grid's phase — the photo window on the right, and the three stats
// in the copy column on the left.
//
// Its own module, not part of AboutUsIntro, for two reasons. The layout is
// needed twice now from two different places: AboutUsIntro positions the DOM
// (the photo window, the stats block, the copy) against it, and
// AboutUsSection's canvas positions WebGL against the *same* squares (see
// AboutUsGridGlow). Duplicating any of this so each side could keep its own
// copy is precisely the drift this codebase keeps writing constants down
// once to avoid — see pageMargin.js's own note on two constants agreeing
// today not being the same thing as one constant.
//
// And plain data/functions living in a component file is what breaks React
// Fast Refresh for that file (see aboutUsSlides.js, split out for the same
// reason after edits stopped reaching the browser).

// The photo window, in cells.
export const PHOTO_CELLS_X = 4
export const PHOTO_CELLS_Y = 3
// Empty grid columns kept between the photo's right edge and the page's own
// right-hand boundary. The grid only offers this in whole-cell steps — the
// window's own edges have to land on grid lines, so there's no in-between
// position to try — and one full cell (200px) turned out to be too coarse a
// lever: flush (0) read as crowding the true screen edge, one cell in read
// as too far the other way. Back at 0 for now; the real fix is a finer
// adjustment than this constant can express on its own.
export const PHOTO_COLUMN_INSET = 0

// How many whole grid squares the three stats span in the copy column — one
// each, asked for directly ("each should fit in the three squares from the
// grid on the left").
export const STATS_CELLS_X = 3
// How far below the photo's own starting row the headline/body block sits,
// in whole cells. The photo is PHOTO_CELLS_Y (3) rows tall; 2 (tried first,
// on the photo's own last row) sat lower than asked for, so this is now the
// photo's *middle* row instead — one row up from that, still clear of the
// stats' own row directly above it.
export const TEXT_ROW_OFFSET = 1

// The grid as About Us rests on it: the cell size and boundary phase once
// the reveal has settled and the zoom has landed. Every position below is
// measured off this one call rather than each caller running its own.
export function aboutUsGridMetrics(width, height) {
  return gridScreenMetrics({
    width,
    height,
    scale: ABOUT_US_GRID_ZOOM_SCALE,
    screenOffset: -1,
  })
}

// Which squares the photo occupies, as whole cell indices off the grid's
// own phase. Worked out from the *settled* geometry — the cell size the grid
// rests at once About Us is open, which depends on nothing but the viewport
// — rather than from the live one, and never from measuring the element.
//
// Both of those matter, and the second one caused a real bug. Snapping to
// the nearest boundary means a rounding step, and a rounding step is
// discontinuous: the first version sized the window from the live cell each
// frame, which re-flowed the flex row it sat in, which moved the element,
// which moved what "nearest" meant — so during the zoom the rounding kept
// flipping and the photo jumped a whole cell at a time, repeatedly. Choosing
// the indices from something the layout cannot influence removes the loop
// rather than damping it.
export function photoCellIndices(width, height) {
  const { cell, phaseX, phaseY } = aboutUsGridMetrics(width, height)
  // Anchored to the page's own right-hand boundary (see pageMargin.js,
  // mirrored from the left edge where the hero's title and the placeholder
  // copy's blue cell edge both sit), then held PHOTO_COLUMN_INSET columns
  // in from it rather than flush against it — flush read as crowding the
  // true edge of the screen, reported directly.
  //
  // The boundary itself is the last cell edge that still lands inside the
  // margin, so the gap it and the inset together leave is somewhere between
  // PHOTO_COLUMN_INSET cells plus the margin and PHOTO_COLUMN_INSET+1 cells
  // plus the margin — never exactly one number, because the grid's phase
  // falls where it falls and a window that sits on whole squares cannot also
  // end on an arbitrary pixel. Staying on the grid is the thing worth
  // keeping; the margin and the inset both just draw a line the photo may
  // not cross.
  const lastBoundary = Math.floor((width - pageMarginPx(height) - phaseX) / cell)
  const column = lastBoundary - PHOTO_CELLS_X - PHOTO_COLUMN_INSET
  // ...and vertically centred, to the nearest whole cell.
  const row = Math.round((height / 2 - (PHOTO_CELLS_Y * cell) / 2 - phaseY) / cell)
  return { column, row }
}

// Which squares the three stats occupy: the first cell boundary at or after
// the page's own left margin — the same edge the copy column starts from,
// rounded out to the grid — spanning STATS_CELLS_X squares from there, on
// the row the photo begins on so the two sides of the page line up.
export function statsCellIndices(width, height) {
  const { cell, phaseX } = aboutUsGridMetrics(width, height)
  const column = Math.ceil((pageMarginPx(height) - phaseX) / cell)
  return { column, row: photoCellIndices(width, height).row }
}

// A cell, as a whole-cell offset from the grid's *unwrapped* origin
// (firstX/firstY — see gridScreenMetrics's own comment on why that's a
// different thing from phaseX/phaseY) rather than from the wrapped phase
// photoCellIndices/statsCellIndices are themselves measured against.
//
// For content that only ever renders at the settled scale (the DOM photo
// window and stats block, positioned once by AboutUsIntro's layout pass),
// which of these two a position is measured against makes no difference —
// phase and origin agree at any one fixed scale, since they only ever
// differ by a whole number of cells. It matters the moment something has to
// track the *same* cell continuously while scale itself is changing (see
// AboutUsGridGlow in AboutUsSection.jsx, which rides the About Us reveal's
// zoom): the wrapped phase's fold count depends on cell size, so it can jump
// by a whole cell partway through a zoom, and a position built from
// photoCellIndices/statsCellIndices alone would jump right along with it —
// reported directly, as the ambient squares appearing on the wrong row and
// then snapping into place. Built from the unwrapped origin instead,
// `firstX/firstY + n*cell` stays attached to the same physical cell at
// every value of scale, not just the settled one this offset happens to be
// computed at.
function cellOriginOffsets(column, row, width, height) {
  const { cell, phaseX, phaseY, firstX, firstY } = aboutUsGridMetrics(width, height)
  return {
    nX: Math.round((phaseX + column * cell - firstX) / cell),
    nY: Math.round((phaseY + row * cell - firstY) / cell),
  }
}

// The stats' own cell, as an origin offset — see cellOriginOffsets above.
export function statsOriginOffsets(width, height) {
  const { column, row } = statsCellIndices(width, height)
  return cellOriginOffsets(column, row, width, height)
}

// The photo window's own top-left cell, as an origin offset — for content
// anchored to the photo rather than the stats (see AboutUsGridGlow's own
// squares placed relative to the photo's bottom-left corner).
export function photoOriginOffsets(width, height) {
  const { column, row } = photoCellIndices(width, height)
  return cellOriginOffsets(column, row, width, height)
}
