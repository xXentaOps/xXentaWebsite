import { ABOUT_US_GRID_ZOOM_SCALE, TARGET_CELL_PX } from './gridConstants'
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
export const CIRCLE_SIZE = 220

// Dynamically adapts the grid zoom scale based on viewport dimensions so the
// WebGL grid and content scale in lockstep, keeping stats strictly framed inside
// grid cells and centering the composition with balanced top and bottom margins.
export function getAboutUsZoomScale(width, height) {
  if (width < 768) return ABOUT_US_GRID_ZOOM_SCALE * 0.5
  // Only displays with ample vertical room (>= 1150px height, like 1920x1200 or 1440p/4K) preserve the full 200px cells without crowding the floor
  if (width >= 1800 && height >= 1150) return ABOUT_US_GRID_ZOOM_SCALE

  const margin = pageMarginPx(height)
  // Need at least 8.5 cells between margins (3 for stats, 1 column gap, 4 for photo, 0.5 safe margin)
  const maxCellByWidth = (width - margin * 2) / 8.5
  const maxSByWidth = Math.min(1.0, maxCellByWidth / (TARGET_CELL_PX * ABOUT_US_GRID_ZOOM_SCALE))

  let bestS = Math.min(1.0, maxSByWidth)
  let minCost = Infinity

  for (let s = Math.min(1.0, maxSByWidth); s >= 0.35; s -= 0.005) {
    const scale = ABOUT_US_GRID_ZOOM_SCALE * s
    const { cell, phaseX, phaseY } = gridScreenMetrics({ width, height, scale, screenOffset: -1 })

    // Check horizontal fit: ensure photo and stats have at least 1 whole column gap
    const statsCol = Math.ceil((margin - phaseX) / cell)
    const lastBoundary = Math.floor((width - margin - phaseX) / cell)
    const photoCol = lastBoundary - PHOTO_CELLS_X - PHOTO_COLUMN_INSET
    if (photoCol < statsCol + STATS_CELLS_X + 1) {
      continue
    }

    const photoH = PHOTO_CELLS_Y * cell
    const arrowsMt = Math.max(36, Math.round(64 * s))
    const arrowsH = 44
    const totalH = photoH + arrowsMt + arrowsH

    const idealPhotoTop = (height - totalH) / 2
    const row = Math.max(0, Math.round((idealPhotoTop - phaseY) / cell))

    const photoTop = phaseY + row * cell
    const arrowsBottom = photoTop + totalH

    const topMargin = photoTop
    const bottomMargin = height - arrowsBottom

    if (topMargin < 60 || bottomMargin < 30) continue

    const diff = Math.abs(topMargin - bottomMargin)
    const cost = diff * 2.0 + (1.0 - s) * 50

    if (cost < minCost) {
      minCost = cost
      bestS = s
    }
  }
  return ABOUT_US_GRID_ZOOM_SCALE * bestS
}

// The grid as About Us rests on it: the cell size and boundary phase once
// the reveal has settled and the zoom has landed. Every position below is
// measured off this one call rather than each caller running its own.
export function aboutUsGridMetrics(width, height) {
  return gridScreenMetrics({
    width,
    height,
    scale: getAboutUsZoomScale(width, height),
    screenOffset: -1,
  })
}

// Which squares the photo occupies, as whole cell indices off the grid's
// own phase. Worked out from the *settled* geometry — the cell size the grid
// rests at once About Us is open, which depends on nothing but the viewport
// — rather than from the live one, and never from measuring the element.
export function photoCellIndices(width, height) {
  const { cell, phaseX, phaseY } = aboutUsGridMetrics(width, height)
  const lastBoundary = Math.floor((width - pageMarginPx(height) - phaseX) / cell)
  const column = Math.max(0, lastBoundary - PHOTO_CELLS_X - PHOTO_COLUMN_INSET)

  const scale = getAboutUsZoomScale(width, height)
  const S = scale / ABOUT_US_GRID_ZOOM_SCALE
  const photoH = PHOTO_CELLS_Y * cell
  const arrowsMt = Math.max(36, Math.round(64 * S))
  const arrowsH = 44
  const totalH = photoH + arrowsMt + arrowsH

  const idealPhotoTop = (height - totalH) / 2
  const row = Math.max(0, Math.round((idealPhotoTop - phaseY) / cell))

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
