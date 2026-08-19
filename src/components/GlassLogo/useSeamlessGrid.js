import { useThree } from '@react-three/fiber'
import { OVERSCALE, TARGET_CELL_PX } from './gridConstants'
import { BLOB_Y_FRACTION, GRID_Z, PLANE_Z } from './sceneConstants'

// Computes the geometry a *second* canvas needs to continue the hero's own
// grid+blob pattern exactly `screenOffset` viewport-heights away from it —
// positive below (BackgroundGlowSection, past the clients' carousel),
// negative above (AboutUsSection). Both read as the same background
// continuing, rather than a similar-looking new one, because of two things
// this relies on the caller having already set up identically to the hero's
// own canvas: the same camera (position/fov) and the same one-screen-tall
// canvas height — together those make "world units per screen pixel"
// identical between the two canvases, so the grid's cells and the blob's
// shape render at the same apparent scale in both, and stay that way on
// resize (same formulas, same inputs, on every side).
//
// What's left is shifting the *content* by exactly one screen's worth of
// world space per unit of screenOffset (derived per-Z, since perspective
// projection means that amount differs slightly between the grid's Z and
// the blob's) — as if the hero's own camera had simply panned up or down,
// rather than each canvas centering its own content independently:
//
// - yPhaseShiftCells: BackgroundGrid's own grid is phased around *its own*
//   canvas center (world Y = 0 in the hero's own local coordinates, which
//   *are* real/shared world coordinates since the hero is the unshifted
//   reference everything else here measures from). A canvas one screen
//   below (screenOffset 1) needs its own local Y = 0 to read as world
//   Y = -gridHeight, equivalent to shifting the phase itself backward by
//   gridHeight/cellSize cells (fract() wraps the sign automatically, so the
//   minus here isn't just cosmetic — flipping it lands corners exactly half
//   a cell off from correct). A canvas one screen *above* (screenOffset -1)
//   needs the opposite: its own local Y = 0 should read as world
//   Y = +gridHeight, so the shift flips sign too — screenOffset itself
//   carries that flip.
// - blobY: the hero's own blob sits at -blobHeight * BLOB_Y_FRACTION in its
//   own local (= world) space. A canvas offset by screenOffset screens needs
//   that same world position expressed in *its own* local space instead —
//   which is the world position plus screenOffset * blobHeight, the exact
//   mirror of the phase-shift logic above but for a plain object position
//   rather than a shader's own repeating coordinate.
export function useSeamlessGrid(screenOffset) {
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)

  const { width: blobWidth, height: blobHeight } = viewport.getCurrentViewport(camera, [0, 0, PLANE_Z])
  const { width: gridWidth, height: gridHeight } = viewport.getCurrentViewport(camera, [0, 0, GRID_Z])

  // Same formula BackgroundGrid itself uses for its own grid — has to be,
  // for the cells to come out the same physical screen size in both.
  const cellSize = TARGET_CELL_PX * (gridWidth / size.width)
  const repeat = [(gridWidth * OVERSCALE) / cellSize, (gridHeight * OVERSCALE) / cellSize]
  const yPhaseShiftCells = -screenOffset * (gridHeight / cellSize)
  const blobY = -blobHeight * BLOB_Y_FRACTION + screenOffset * blobHeight

  return { size, blobWidth, blobHeight, gridWidth, gridHeight, cellSize, repeat, yPhaseShiftCells, blobY }
}
