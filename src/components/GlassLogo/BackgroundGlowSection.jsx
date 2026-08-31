import { useEffect, useLayoutEffect, useRef } from 'react'
import { Html, shaderMaterial } from '@react-three/drei'
import { Canvas, extend, useFrame } from '@react-three/fiber'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { AdditiveBlending, Color, MathUtils } from 'three'
import { GridPlane } from './BackgroundGrid'
import { CHAT_SCROLL_VH, CHAT_TIMELINE, chatAngryAt, chatDimAt } from './chatShowcaseScript'
import { ChatShowcase } from './ChatShowcase'
import { DIRECT_STYLE, EDGE_STYLE, OVERSCALE, TARGET_CELL_PX, THROUGH_GLASS_STYLE } from './gridConstants'
import { pageMarginPx } from './pageMargin'
import { GradientBlob } from './GradientBlob'
import { XxentaWordmark } from './XxentaWordmark'
import {
  BLOB_WIDTH_OVERSCALE,
  GRID_Z,
  PLANE_SIZE,
  PLANE_Z,
  SCENE_BACKDROP,
  SCENE_BACKDROP_ANGRY,
  SCENE_BACKDROP_DIM,
} from './sceneConstants'
import { useSeamlessGrid } from './useSeamlessGrid'

// Grid-zoom-on-scroll: the grid grows as the carousel scrolls past overhead
// (see progress in SeamlessBackdrop), landing at whatever size puts the
// highlighted edge (see EDGE_COLUMN_FROM_LEFT) exactly finalZoomScale's own
// target distance from the left edge of the screen the instant the
// carousel is fully gone — see finalZoomScale itself, computed below from
// the page's shared left margin (pageMargin.js) rather than a fixed
// multiplier, so that landing spot is derived, not guessed. Scaling
// the *plane* (not the camera, not the shader's own repeat/cellSize
// uniforms) is what makes this a true zoom rather than a resize: repeat is
// still computed off the viewport's real, unzoomed width/height (see
// cellSize/repeat below, unchanged from before this effect existed), so
// growing the plane on top of that only grows each cell's own *world* size,
// which is exactly what reads as the pattern rushing toward the viewer
// rather than simply gaining more (smaller) cells. Safe at any scale up to
// arbitrarily large, too — OVERSCALE already guarantees full coverage at
// the resting 1x, and growing the plane only ever adds more overscan, never
// less, so there's no risk of the pattern's own edges becoming visible.

// The page's shared left margin now comes from pageMargin.js rather than
// being restated here. It used to be a deliberate copy, on the reasoning
// that HeroTitle's version drives troika text layout in a completely
// different canvas and these just needed the same two numbers — true, and
// beside the point: needing the same numbers is exactly the case for not
// having two of them. About Us needed them as well, which would have made
// three.
//
// The zoom below solves for whatever scale puts the highlighted edge that
// same distance from the left edge of the screen, so "New Way of"'s own left
// margin is the reference every other left-glued element in this piece lines
// up against, including this one. Left un-corrected for HeroTitle's own
// per-word useLeftBearingCorrection (the few-px gap between "New Way of"'s
// pen position and its actual ink) — that correction needs the same
// canvas-based font-metrics measurement HeroTitle sets up for itself, not
// worth reproducing here for a difference this small.

// Which cell gets the highlighted left edge (see edgeX/edgeBottomY/edgeTopY
// below) — counted in from the left edge of the *overscaled* plane, the
// same left-edge-anchored column counting BackgroundGrid's own buttons use
// (mirrored here from the opposite side: BUTTON_COLUMN_FROM_RIGHT there,
// this one from the left instead). 3 keeps its resting position a few
// hundred pixels left of center at typical viewport widths — comfortably
// between "the zoom would have to shrink it to reach the hero's own small
// margin" (too close to the true edge already) and "the required zoom is
// implausibly large" (too close to center) — see finalZoomScale.
const EDGE_COLUMN_FROM_LEFT = 3

// Where the *second* of the two columns callouts cycle through sits, once
// the first one hands off — a different square, as asked, five columns
// further right of the first. Not visually checked against a live viewport
// at every width; if it ever lands too close to the chat column itself or
// too near the true screen edge, this is the one number to move, the same
// way EDGE_COLUMN_FROM_LEFT's own comment already documents doing for the
// first.
const EDGE_COLUMN_FROM_LEFT_B = EDGE_COLUMN_FROM_LEFT + 5

// How far below the top row's own cell the bottom row *would* sit, in whole
// cells, on a viewport with room to spare — reported directly that every
// callout landing in the same band near vertical centre read as cramped and
// repetitive once there were four of them. Moved down rather than up: the
// chat column's own header sits well above screen centre, so there's more
// genuinely clear space below it than above.
//
// A ceiling, not the actual value used — see rowGeometryAt below, which
// clamps this down on any viewport where it wouldn't survive being scaled up
// by the grid's own zoom.
const ROW_OFFSET_CELLS_BOTTOM = 4

// What this section explains before, and increasingly *as*, the scripted
// case plays out — illustrative copy, not final, the same standing as
// CHAT_SCRIPT's own dialogue. Five now rather than two: each one goes a
// layer deeper than the last, timed to a moment the case has just put on
// screen, so the explanation reads as commentary on something the visitor
// just watched rather than a claim made in the abstract before any of it has
// happened. Short, plain sentences on purpose — long enough to say one real
// thing, not so long they read as a pitch deck slide.
//
// `trigger` is null for the first (on screen from the moment the section
// pins) or a CHAT_TIMELINE segment for the rest — the swap into it happens
// over that segment's own opening switch, so retiming or reordering the
// script carries every swap along with it automatically rather than this
// list needing its own progress numbers kept in step by hand. `column`
// alternates between the two physical left/right squares (see
// EDGE_COLUMN_FROM_LEFT/_B); `rowOffset` is how many cells below the row
// "New Way of"'s own highlighted edge sits on a callout lands (0 is that row
// itself, ROW_OFFSET_CELLS_BOTTOM the other physical band the earlier
// two-row version of this list cycled through) — a plain cell count rather
// than a 'top'/'bottom' enum specifically so a callout can land somewhere
// between the two, not just one or the other (see rowGeometryAt).
const CALLOUTS = [
  {
    column: 'A',
    rowOffset: 0,
    trigger: null,
    text: "Every case runs live. Say what you'd actually say, and the room reacts in real time.",
  },
  {
    column: 'B',
    rowOffset: 0,
    trigger: CHAT_TIMELINE.segments[1],
    text: 'Pull someone aside and the conversation is theirs to keep — private, and different every time.',
  },
  {
    column: 'A',
    rowOffset: ROW_OFFSET_CELLS_BOTTOM,
    trigger: CHAT_TIMELINE.segments[2],
    text: "The case reacts to what's actually happening to the patient, not to a script. Miss the moment, and it shows.",
  },
  {
    column: 'A',
    rowOffset: 2,
    trigger: CHAT_TIMELINE.segments[4],
    text: 'Every character in the room, and the room itself, is running live on Gemini.',
  },
  {
    column: 'B',
    rowOffset: ROW_OFFSET_CELLS_BOTTOM,
    trigger: CHAT_TIMELINE.segments[5],
    text: 'Academic skill is only half of it. Calming a terrified relative is a skill too, and nothing here is graded — only practiced.',
  },
]

// How much of the grid plane's own spare overscan the slow drift below is
// allowed to spend.
//
// Once this section pins, the grid stops moving with the page entirely — it
// is a sticky, screen-sized canvas — so without something driving it, it
// would sit frozen for the whole chat sequence. What's wanted instead is for
// it to keep going, just far slower than the page it's behind. Moving the
// whole scaled group (rather than the shader's own phase) is what keeps the
// highlighted edge and the callout beside it attached to the exact cells they
// belong to, which a phase shift would slide the lines out from under.
//
// The cost of moving a finite plane is that it has a finite amount of
// overscan to move *within*: the plane is OVERSCALE wider/taller than the
// screen and then grown again by finalZoomScale, and the drift may not spend
// more of that spare than exists, or the pattern's own edge comes into view.
// So the budget is derived from the real slack at the real zoom (see
// driftWorld) rather than being a picked number that happens to be safe at
// the viewport it was tuned on.
const DRIFT_SLACK_FRACTION = 0.7

// How small the sticky stage starts, and how it springs the rest of the way
// to 1 as it catches — see stageScale's own comment where these are used.
// Small enough to feel like a cushion, not a zoom: this is meant to be felt
// far more than seen. Overdamped on purpose (damping past critical for this
// mass/stiffness pair) — a bouncy overshoot here would read as playful,
// which is the wrong register for something standing in for "and now it's
// stopped," not "look, it arrived."
const STAGE_SETTLE_SCALE = 0.99
const STAGE_SETTLE_SPRING = { stiffness: 140, damping: 26, mass: 0.6 }

// Every mood's own flat background, built once at module scope — see
// GradientBlob's own set, and SCENE_BACKDROP's note on why the scene's flat
// background and the blob's own edge colour have to be the same value.
const BACKDROP_LIT = new Color(SCENE_BACKDROP)
const BACKDROP_DIM = new Color(SCENE_BACKDROP_DIM)
const BACKDROP_ANGRY = new Color(SCENE_BACKDROP_ANGRY)

// A flat-fill glow quad for the two lit grid squares below — the same
// GridGlowMaterial AboutUsSection's own RandomGridGlow uses (evenly filled,
// no radial falloff, so it reads as a lit-up cell rather than a soft blob),
// redeclared here rather than imported: that one lives in a file already
// full of Meet the Team-specific state, and this needs its own copy of the
// uniforms anyway to carry a mood colour instead of a fixed one.
const GridGlowMaterial = shaderMaterial(
  { uOpacity: 0, uColor: new Color('#6CA1F8') },
  /* glsl */ `
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform float uOpacity;
    uniform vec3 uColor;
    void main() {
      gl_FragColor = vec4(uColor, uOpacity);
    }
  `,
)
extend({ GridGlowMaterial })

// The lit squares' own colour, per mood — same lit colour GRID_GLOWS uses on
// About Us, and the same dim/angry treatment the backdrop and blob already
// carry (see BACKDROP_DIM/BACKDROP_ANGRY above) so these squares shift along
// with the rest of the scene rather than staying blue through Peter's own
// unconscious stretch or Carla's own anger.
const SQUARE_LIT = new Color('#6CA1F8')
const SQUARE_DIM = new Color('#94A3B8')
const SQUARE_ANGRY = new Color('#F87171')
// How opaque each square sits at rest — low, the same "ambient, ~2-4%"
// register GRID_GLOWS itself uses, so these read as a faint accent beside
// the callout rather than competing with it for attention.
const LIT_SQUARE_OPACITY = 0.05

// The logo/"Simulations" lockup over the lit squares is sized off these
// per-character width estimates rather than a live DOM measurement — a
// scrollWidth-based version was tried first and reliably undersized the
// budget it was solving for (reported directly, twice: "Simulations still
// doesn't fit"), most likely drei's Html mounting its children into its own
// portal on a render this component's own effects/frame loop can race
// against in ways that are hard to pin down without a way to watch the
// actual DOM here. Deliberately conservative (wider than the font's real
// average glyph advance) so any error lands on the safe side — text a
// little smaller than the squares could technically fit rather than text
// that overflows them again.
const SIM_TEXT = 'Simulations'
const SIM_AVG_CHAR_EM = 0.64
const LOGO_TEXT = 'xXenta'
const LOGO_AVG_CHAR_EM = 0.6
// Matches XxentaWordmark's own tracking-[0.2em] — counted once per
// character (an overestimate of the real "one gap between each pair of
// characters," which is exactly the direction "conservative" wants here).
const LOGO_TRACKING_EM = 0.2
// The gap kept between the text's own right edge and the right-most
// square's right edge — reported directly as the text running off the edge
// of the screen with none. Purely a screen-pixel value, same register as
// the callouts' own box widths, not a fraction of cellSize: the point is a
// constant visual gap regardless of how big the squares currently are.
// Brought down from 12 — reported as larger than it needed to be now that
// the squares' own screen-edge safety clamp (see safeTextRightX) is doing
// most of the real work of keeping this on screen.
const TEXT_RIGHT_MARGIN_PX = 6
// A dedicated, smaller safety margin from the screen's own true right edge
// for this one small corner accent — independent of heroMarginPx (the page's
// shared ~70-80px margin "New Way of" and About Us's photo both use), which
// reads as excessive for a decorative element tucked in the grid rather than
// a headline.
const SCREEN_EDGE_MARGIN_PX = 20

// Zero velocity at both ends — same reasoning as this piece's other
// smoothstepEase duplicates (see BackgroundGrid/HeroTitle): a linear zoom
// tied directly to scroll position reads as mechanical, while easing both
// ends makes it read as a deliberate, weighted motion instead.
function smoothstepEase(t) {
  return t * t * (3 - 2 * t)
}

// How many cells of *local* (pre-zoom) vertical offset survive being scaled
// up by finalZoomScale without landing past the edge of the screen — shared
// by both the callouts' own bottom row and ImmersiveTitle below, which each
// need the identical guarantee for the same reason: anything placed inside
// gridGroupRef is scaled up by finalZoomScale once the group's own zoom
// finishes, so a plain cell count picked without accounting for that (tried
// first, for the callouts) can land many cells further from centre than
// intended — a first version of the callouts' own bottom row did exactly
// this and was reported invisible. The safe amount is however many cells fit
// in half the *unscaled* screen height once divided back down by
// finalZoomScale — that's what survives the group's own scale and lands back
// at a bounded on-screen distance regardless of how big finalZoomScale turns
// out to be at a given viewport. `safeFraction` leaves real margin below
// that hard limit; how much is a judgment call per caller — a small callout
// that has to stay fully legible wants a lot of margin, while a big
// background title that's meant to bleed toward the bottom edge can safely
// use most of the limit.
function safeCellsBelowCenter(preferredCells, safeFraction, gridHeight, finalZoomScale, cellSize) {
  const maxSafeCells = (gridHeight / 2 / finalZoomScale / cellSize) * safeFraction
  return Math.max(1, Math.min(preferredCells, Math.floor(maxSafeCells)))
}

// This section is a *second*, separate Canvas/scene — not the hero's own
// canvas grown taller. Stretching that one instead would mean every
// viewport-relative formula throughout HeroTitle/BackgroundGrid/
// GlassLogoGroup (all precisely tuned assuming "the canvas is exactly one
// screen tall") would need re-deriving for an arbitrary taller height. A
// second canvas sidesteps that entirely — but only reads as the *same*
// background continuing, rather than a similar-looking new one, because of
// two things this component sets up deliberately:
//
// 1. The exact same camera (position/fov) as GlassLogoHero's, and the exact
//    same canvas height (h-screen, one viewport) — together these make
//    "world units per screen pixel" identical between the two canvases, so
//    the grid's cells and the blob's shape render at the same apparent
//    scale in both, and stay that way on resize (same formulas, same
//    inputs, on both sides).
// 2. Both the grid and the blob are shifted by exactly one screen's worth
//    of world space (derived per-Z below, since perspective projection
//    means that amount differs slightly between the grid's Z and the
//    blob's) — as if the hero's own camera had simply panned down one
//    full screen, rather than each canvas centering its own content
//    independently. See yPhaseShiftCells and blobY below for the actual
//    derivation.
function SeamlessBackdrop({ carouselRef, isVisibleRef, pinnedProgressRef, dimRef, angryRef }) {
  // screenOffset 1 — this section continues the pattern one screen *below*
  // the hero (see useSeamlessGrid for the shared derivation of
  // yPhaseShiftCells/blobY this used to do inline).
  const { size, blobWidth, gridWidth, gridHeight, cellSize, repeat, yPhaseShiftCells, blobY } = useSeamlessGrid(1)
  // Carries just the two grid planes (not the blob — the ask was for the
  // grid specifically to zoom, and leaving the blob's own much larger,
  // softer shape untouched keeps it reading as the stable backdrop the grid
  // zooms *in front of*) so finalZoomScale can scale them as one unit.
  const gridGroupRef = useRef(null)
  // CALLOUTS.length plain DOM refs, one per callout, indexed the same way —
  // an array rather than a fixed calloutARef/calloutBRef pair, so the number
  // of callouts is a property of the CALLOUTS list alone and nothing below
  // has to be rewritten if that list grows or shrinks again. useRef([]).
  // current rather than useRef(null) per callout: the count is static for
  // the life of the component (fixed by CALLOUTS itself, not by anything
  // that changes across renders), so one stable array assigned into via
  // callback refs is safe here the same way ChatHeader's own entryRefs is.
  // Their own opacity is written directly, every frame (the same non-React
  // handoff the rest of this component uses throughout) rather than through
  // React state — and each callout gets its own element, rather than one
  // shared element repointed at new text, because adjacent callouts have to
  // actually cross-fade, both partially visible at once for the width of the
  // swap, which a single retargeted element could never show.
  const calloutRefs = useRef([]).current
  // The two lit grid squares under the "Academic skill is only half of it"
  // callout's own cell (see litSquareMeshes below) — mood-coloured every
  // frame the same way the backdrop and blob already are, so a ref rather
  // than React state.
  const litSquareRefs = useRef([]).current
  // The logo mark + "Simulations" sitting over the lit squares, coloured to
  // exactly match the scene's own live background every frame (see
  // backgroundRef below) rather than a fixed colour of their own — the
  // "punched-through hole" look only works if this is genuinely the same
  // colour the background actually is at that instant, moods included, not
  // an approximation of it.
  const punchRef = useRef(null)
  const logoTextRef = useRef(null)
  const simTextRef = useRef(null)
  // The one highlighted edge this canvas can draw (see uEdgeX etc. in
  // GridPatternMaterial — there's a single set of uniforms, not a list),
  // written every frame with whichever callout's own geometry currently
  // applies. See edgeGeometryRef's own comment in GridPlane.
  const edgeGeometryRef = useRef({ x: 0, bottomUV: 0, topUV: 0 })
  const edgeOpacityRef = useRef(1)
  // The scene's own flat background, held so the frame loop can drain it
  // toward black while the chat is inside the unconscious patient's thread.
  // A ref on the <color> element hands back the THREE.Color three.js has
  // attached to scene.background, which can then be mutated in place.
  const backgroundRef = useRef(null)

  // Left edge of column EDGE_COLUMN_FROM_LEFT — same formula BackgroundGrid
  // uses for its own buttons' left/right columns (buttonLeftX there), just
  // counted from this plane's left edge instead of its right.
  const edgeX = -(gridWidth * OVERSCALE) / 2 + EDGE_COLUMN_FROM_LEFT * cellSize
  const edgeXUV = (edgeX + (gridWidth * OVERSCALE) / 2) / (gridWidth * OVERSCALE)

  // The page's own left margin (see pageMargin.js), converted from its
  // screen-pixel meaning into this plane's own world units at GRID_Z, the
  // same pixel-to-world
  // ratio cellSize itself already uses. targetEdgeLeftX is that many world
  // units in from the *true* left edge of the screen (gridWidth/2, not the
  // overscaled plane's own wider edge) — where the highlighted edge's own
  // *visible left side* needs to land once fully zoomed, matching how
  // "New Way of"'s margin is itself measured from its leftmost ink, not its
  // horizontal center.
  const heroMarginPx = pageMarginPx(size.height)
  const heroMarginWorld = heroMarginPx * (gridWidth / size.width)
  const targetEdgeLeftX = -gridWidth / 2 + heroMarginWorld
  // edgeX above is the *center* of the drawn line (see uEdgeX in
  // GridPatternMaterial — its mask is symmetric, abs(vUv.x - uEdgeX)), not
  // its left side, so solving edgeX×scale = target would land the line's
  // middle on the margin, not its edge. edgeHalfWidthWorld is EDGE_STYLE's
  // own halfWidthPx (BackgroundGrid.jsx) converted to this plane's world
  // units at rest — subtracting it from edgeX first gives the line's own
  // left side at rest, which (like everything else in gridGroupRef) scales
  // identically with the group, so solving *that* against the target is
  // what actually lines up the stroke's visible edge, not its midpoint.
  const edgeHalfWidthWorld = EDGE_STYLE.halfWidthPx * (gridWidth / size.width)
  const finalZoomScale = targetEdgeLeftX / (edgeX - edgeHalfWidthWorld)
  // How far the grid may drift upward across the pinned phase, in world
  // units — see DRIFT_SLACK_FRACTION. The plane covers gridHeight × OVERSCALE
  // × finalZoomScale once fully zoomed, of which gridHeight is on screen, so
  // half the difference is the spare above (and below) the visible area.
  // Math.max guards the case where that difference is negative, which is what
  // a viewport too narrow for finalZoomScale to come out above 1 would
  // produce: no drift at all rather than a drift the wrong way.
  const driftWorld = Math.max(0, ((gridHeight * (OVERSCALE * finalZoomScale - 1)) / 2) * DRIFT_SLACK_FRACTION)
  // The cell straddling true vertical center (world Y = 0), found by
  // solving GridPatternMaterial's own cell.y fract() for its nearest
  // boundary at or below Y = 0 — the same "worldY = cellSize×(N - 0.5 -
  // phase)" relationship its own comment derives, just solved backwards
  // here (for the boundary nearest a known Y) instead of forwards (for the
  // Y of a known boundary). Unlike BackgroundGrid's own buttons — whole-
  // cellSize offsets from Y=0 in a canvas with no phase shift — this
  // canvas's yPhaseShiftCells means Y=0 isn't necessarily a cell boundary
  // or center on its own, so the containing cell has to be solved for
  // rather than assumed.
  const centerPhase = 0.5 + yPhaseShiftCells
  const edgeBottomY = cellSize * (Math.floor(centerPhase) - centerPhase)
  const edgeTopY = edgeBottomY + cellSize
  const edgeBottomUV = (edgeBottomY + (gridHeight * OVERSCALE) / 2) / (gridHeight * OVERSCALE)
  const edgeTopUV = (edgeTopY + (gridHeight * OVERSCALE) / 2) / (gridHeight * OVERSCALE)

  // Column B's own edge — same row as column A (edgeBottomY/edgeTopY, and
  // their UVs, are unchanged), a different column. Only the X side needs
  // recomputing.
  const edgeXB = -(gridWidth * OVERSCALE) / 2 + EDGE_COLUMN_FROM_LEFT_B * cellSize

  // A row some whole number of cells below the row columns A/B sit on at
  // rest (edgeBottomY/edgeTopY, offset 0) — X unchanged, only Y (and its
  // UVs) shifted down by that many cell heights. Takes a *preferred* offset
  // rather than a fixed one so a callout can land anywhere below the top
  // row, not just the one other fixed band an earlier two-row version of
  // this list was limited to — safeCellsBelowCenter still clamps it the
  // same way, so a preferred offset picked without the current viewport's
  // zoom in mind still can't land past the edge of the screen. 0.45 leaves
  // real margin below that hard safe limit — for the text's own height, and
  // so it reads as "lower half" rather than "hugging the very edge" — since
  // a callout still has to stay fully legible, unlike ImmersiveTitle's own
  // much more generous allowance this used to share a helper with.
  function rowGeometryAt(preferredOffsetCells) {
    if (preferredOffsetCells === 0) {
      return { bottomY: edgeBottomY, topY: edgeTopY, bottomUV: edgeBottomUV, topUV: edgeTopUV }
    }
    const offsetCells = safeCellsBelowCenter(preferredOffsetCells, 0.45, gridHeight, finalZoomScale, cellSize)
    const bottomY = edgeBottomY - offsetCells * cellSize
    const topY = edgeTopY - offsetCells * cellSize
    const bottomUV = (bottomY + (gridHeight * OVERSCALE) / 2) / (gridHeight * OVERSCALE)
    const topUV = (topY + (gridHeight * OVERSCALE) / 2) / (gridHeight * OVERSCALE)
    return { bottomY, topY, bottomUV, topUV }
  }

  // Each callout's own geometry, in CALLOUTS's own order — computed once per
  // callout here rather than re-derived wherever something needs a
  // callout's own position, the same reasoning the old fixed lookup object
  // followed, just indexed by array position now that rowOffset is a plain
  // number instead of a fixed 'top'/'bottom' enum with its own two keys.
  const calloutPositions = CALLOUTS.map((callout) => ({
    x: callout.column === 'A' ? edgeX : edgeXB,
    ...rowGeometryAt(callout.rowOffset),
  }))

  // The row the "Academic skill is only half of it" callout (the last one,
  // column B) sits on — reused below for the two lit squares and their own
  // logo/"Simulations" lockup, which sit "under" that specific callout's own
  // cell rather than under the row generically.
  const lastCalloutRow = rowGeometryAt(ROW_OFFSET_CELLS_BOTTOM)

  // The two lit squares, one cell further down from that row — "under" it —
  // and sitting side by side with each other rather than stacked, one cell
  // further right of the first.
  const litSquareRowY = (lastCalloutRow.bottomY + lastCalloutRow.topY) / 2 - cellSize
  // Where the logo/"Simulations" lockup's own right-anchor is *allowed* to
  // land, independent of wherever EDGE_COLUMN_FROM_LEFT_B happens to put the
  // squares themselves on a given viewport — a margin measured from the
  // squares' own edge (see TEXT_RIGHT_MARGIN_PX) only ever helps if that
  // edge is itself already on screen, which reported directly wasn't always
  // true. Solved the same way finalZoomScale itself solves for the
  // highlighted edge's own left margin (targetEdgeLeftX above), mirrored to
  // the right — gridWidth/2 - screenEdgeMarginWorld is where a fully-zoomed
  // anchor needs to land to sit SCREEN_EDGE_MARGIN_PX in from the screen's
  // true right edge, and dividing that by finalZoomScale gives the *local*,
  // pre-zoom X that reaches exactly that point once fully zoomed — never
  // past it at any point during the zoom in between, since the group's own
  // scale only ever climbs toward finalZoomScale, not through it. A
  // dedicated margin (not heroMarginWorld — see SCREEN_EDGE_MARGIN_PX's own
  // comment) converted the same way heroMarginWorld itself is. Math.min
  // against the square-relative position keeps the lockup glued to the
  // squares whenever that's already safely on screen, and only pulls it in
  // from there when it wouldn't be.
  const screenEdgeMarginWorld = SCREEN_EDGE_MARGIN_PX * (gridWidth / size.width)
  const targetEdgeRightX = gridWidth / 2 - screenEdgeMarginWorld
  const safeTextRightX = targetEdgeRightX / finalZoomScale
  const litSquareRightX = Math.min(edgeXB + 2 * cellSize, safeTextRightX)
  const litSquareCenters = [0, 1].map((cellsRight) => ({
    x: edgeXB + cellSize / 2 + cellsRight * cellSize,
    y: litSquareRowY,
  }))

  // Scroll-driven zoom, X/Y only (see finalZoomScale) — reads the
  // carousel's own real position every frame (getBoundingClientRect, not
  // window.scrollY plus assumed constants) so it stays correct however
  // tall the carousel actually renders. progress is 0 the instant the
  // carousel's top edge first touches the *bottom* of the viewport (i.e.
  // this section is only just starting to scroll into view from the hero
  // above — the zoom is already underway by the time any of it is actually
  // visible, not just once it reaches the top) and 1 once the carousel's
  // bottom edge reaches the *top* of the viewport (rect.bottom <= 0 — the
  // carousel has scrolled entirely away), so the zoom's full travel spans
  // the carousel's whole transit through the screen, start to finish.
  useFrame((_, delta) => {
    // Nothing below is worth doing for a section that isn't on screen, and
    // one part of it actively costs: measuring the carousel every frame
    // reads layout back out of the DOM. Safe to skip because the render that
    // would show the result is skipped too (see SceneRenderGate), and this
    // runs at priority 0 — so on the frame the section does come back, this
    // has already caught up before anything is drawn.
    if (!isVisibleRef.current) return
    const group = gridGroupRef.current
    const carousel = carouselRef?.current
    if (!group || !carousel) return

    const rect = carousel.getBoundingClientRect()
    const totalTravel = window.innerHeight + rect.height
    const progress = MathUtils.clamp((window.innerHeight - rect.top) / totalTravel, 0, 1)
    const targetScale = MathUtils.lerp(1, finalZoomScale, smoothstepEase(progress))

    // Damped like this piece's other scroll-linked motion (see
    // PARALLAX_LAMBDA elsewhere) rather than set directly — Lenis's own
    // smoothing already eases the scroll position itself, but damping the
    // *zoom* on top keeps it from ever snapping if a frame's scroll delta
    // is unusually large (a fast flick, a jump-to-anchor).
    const nextScale = MathUtils.damp(group.scale.x, targetScale, 8, delta)
    group.scale.set(nextScale, nextScale, 1)

    // The logo/"Simulations" lockup's own font sizes, tracking that same
    // scale — cellSize's own screen footprint is TARGET_CELL_PX at rest (see
    // its own definition in gridConstants.js: cellSize is *built* from that
    // pixel target), and growing the plane by nextScale is exactly what
    // grows every cell's apparent screen size along with it (see the zoom
    // comment above), so multiplying the two gives this frame's actual
    // on-screen cell size. Html doesn't scale its own DOM content with the
    // group the way a mesh does (no `transform` prop here, same as every
    // other label in this canvas), so without this the lockup would stay
    // pinned at whatever size it rendered at while the squares underneath it
    // keep growing — which is what "so tiny" actually was.
    //
    // Two independent ceilings, and the smaller one wins: a height-based
    // size (a fraction of one cell, so the two stacked lines don't outgrow
    // the squares' own one-cell height) and a width-based size (however big
    // a line can get and still fit inside both squares' combined width,
    // minus TEXT_RIGHT_MARGIN_PX — see SIM_AVG_CHAR_EM/LOGO_AVG_CHAR_EM
    // above). Sizing off height alone (tried first) is what let
    // "Simulations" grow wide enough to run past the squares, and past the
    // screen's own right edge, before its height ever came close to a full
    // cell.
    const onScreenCellPx = TARGET_CELL_PX * nextScale
    const widthBudgetPx = Math.max(0, onScreenCellPx * 2 - TEXT_RIGHT_MARGIN_PX)
    if (logoTextRef.current) {
      const heightPx = onScreenCellPx * 0.16
      const widthPx = widthBudgetPx / (LOGO_TEXT.length * (LOGO_AVG_CHAR_EM + LOGO_TRACKING_EM))
      logoTextRef.current.style.fontSize = `${Math.min(heightPx, widthPx)}px`
    }
    if (simTextRef.current) {
      const heightPx = onScreenCellPx * 0.58
      const widthPx = widthBudgetPx / (SIM_TEXT.length * SIM_AVG_CHAR_EM)
      simTextRef.current.style.fontSize = `${Math.min(heightPx, widthPx)}px`
    }

    // The pinned phase, from here down. position is applied in the parent's
    // own space, before this group's scale, so the drift is unaffected by
    // whatever the zoom is currently doing — the two compose rather than
    // multiply. Positive Y is up: the page has stopped moving the background
    // for us, so this keeps it going in the direction it was already going,
    // just far slower than the scroll driving it.
    const pinned = pinnedProgressRef.current
    group.position.y = driftWorld * pinned

    // ...and each callout crossing into the next, over the segment whose
    // opening is the whole reason it exists to say what it says (see
    // CALLOUTS's own trigger field). swapTs[i] is how far the *transition
    // into* CALLOUTS[i + 1] has gotten — 0 before it starts, 1 once it's
    // fully taken over — smoothstepEase for the same reason the zoom above
    // uses it: a fade tied linearly to scroll position reads as mechanical.
    const swapTs = CALLOUTS.slice(1).map((callout) =>
      smoothstepEase(
        MathUtils.clamp(
          (pinned - callout.trigger.switchStart) / (callout.trigger.switchEnd - callout.trigger.switchStart),
          0,
          1,
        ),
      ),
    )
    // Each callout's own opacity is the gap between "how much the transition
    // into it has completed" and "how much the transition into whichever
    // comes after it has completed" — 1 minus the first swap for CALLOUTS[0]
    // (nothing transitions *into* it, it's simply there until the first
    // swap starts eating into it), the difference between two consecutive
    // swaps for everything in the middle, and the last swap outright for
    // the final one (nothing transitions *out of* it).
    CALLOUTS.forEach((callout, i) => {
      const enter = i === 0 ? 1 : swapTs[i - 1]
      const exit = i === CALLOUTS.length - 1 ? 0 : swapTs[i]
      const opacity = enter - exit
      if (calloutRefs[i]) calloutRefs[i].style.opacity = opacity
    })

    // The edge itself doesn't cross-fade — there's only one to draw (see
    // edgeGeometryRef) — it dips to invisible exactly at whichever swap is
    // currently under way, where its position underneath silently changes,
    // then returns. A visible line jumping sideways would read as a glitch;
    // one that's already invisible when it moves reads as nothing happening
    // at all. At most one swap is ever strictly between 0 and 1 at once —
    // the triggers are spread across genuinely separate, ordered moments in
    // the case — so the first one found mid-transition is the only one that
    // matters; past it, activeIndex simply tracks the most recently
    // completed swap.
    let activeIndex = 0
    let edgeDip = 1
    for (let i = 0; i < swapTs.length; i++) {
      if (swapTs[i] >= 1) {
        activeIndex = i + 1
        continue
      }
      if (swapTs[i] > 0) edgeDip = Math.abs(swapTs[i] - 0.5) * 2
      break
    }
    edgeOpacityRef.current = edgeDip
    const activeGeometry = calloutPositions[activeIndex]
    edgeGeometryRef.current = { x: activeGeometry.x, bottomUV: activeGeometry.bottomUV, topUV: activeGeometry.topUV }

    // ...and the screen itself changing colour for the stretches the chat
    // spends in a segment with a mood attached — near-black with a grey glow
    // for the unconscious patient, near-black red with a red glow for Carla's
    // own once she's pulled aside. The blob's own colours are driven from the
    // same two refs inside GradientBlob, so neither ever disagrees with the
    // background about which mood (if either) is currently active.
    if (backgroundRef.current) {
      backgroundRef.current.lerpColors(BACKDROP_LIT, BACKDROP_DIM, dimRef.current)
      backgroundRef.current.lerp(BACKDROP_ANGRY, angryRef.current)
      // Read back the same Color instance just written above — the exact
      // live background colour, not a second copy of the dim/angry mix
      // logic that could drift from it.
      if (punchRef.current) punchRef.current.style.color = backgroundRef.current.getStyle()
    }

    // The two lit squares' own colour, following the same mood as the
    // backdrop and blob rather than staying blue through either mood.
    for (const mesh of litSquareRefs) {
      if (!mesh) continue
      const material = mesh.material
      material.uColor.lerpColors(SQUARE_LIT, SQUARE_DIM, dimRef.current)
      material.uColor.lerp(SQUARE_ANGRY, angryRef.current)
      material.uOpacity = LIT_SQUARE_OPACITY
    }
  })

  return (
    <>
      <color ref={backgroundRef} attach="background" args={[SCENE_BACKDROP]} />
      <GradientBlob
        position={[0, blobY, PLANE_Z]}
        scale={[blobWidth * BLOB_WIDTH_OVERSCALE, PLANE_SIZE, 1]}
        dimRef={dimRef}
        angryRef={angryRef}
      />
      {/* Both on layer 0 (the default — this canvas has no glass logo, so
          there's no OVERLAY_LAYER/backdrop-capture split to worry about),
          in the same order BackgroundGrid itself uses: the soft, wide
          THROUGH_GLASS_STYLE plane first, then the crisp DIRECT_STYLE one
          on top. In the hero this pairing isn't a choice specific to being
          "seen through glass" — GlassLogoGroup's one real visible render
          has both the default layer and OVERLAY_LAYER active together, so
          both planes composite into what's actually seen directly. Only
          the soft one gives the crisp lines their glow; DIRECT_STYLE alone
          (tried first here) read flatter than the hero's own grid. */}
      <group ref={gridGroupRef}>
        <GridPlane
          z={GRID_Z}
          width={gridWidth}
          height={gridHeight}
          repeat={repeat}
          style={THROUGH_GLASS_STYLE}
          layer={0}
          yPhaseShiftCells={yPhaseShiftCells}
        />
        <GridPlane
          z={GRID_Z}
          width={gridWidth}
          height={gridHeight}
          repeat={repeat}
          style={DIRECT_STYLE}
          layer={0}
          yPhaseShiftCells={yPhaseShiftCells}
          edgeXUV={edgeXUV}
          edgeBottomUV={edgeBottomUV}
          edgeTopUV={edgeTopUV}
          edgeOpacityRef={edgeOpacityRef}
          edgeGeometryRef={edgeGeometryRef}
        />

        {/* The callouts, sitting beside their own highlighted edge — inside
            gridGroupRef like the edges themselves, so each one's *position*
            tracks the zoom (it moves/grows apart from center exactly as the
            cell it's labeling does) while its own font-size stays fixed
            screen pixels, same as BackgroundGrid's button labels do via
            drei's Html. text-xs matches those labels' own size, per the ask
            — everything else (weight/tracking/case) deliberately doesn't:
            those labels are short, uppercase, wide-tracked UI tags, and
            applying that same treatment to actual paragraph-length copy
            would read as shouted and be hard to scan.

            w-[...], not max-w-[...] on the inner div — drei's Html positions
            each of these through a zero-width absolutely-positioned anchor
            div (its own internal transform wrapper), so a shrink-to-fit box
            here (anything without an explicit width) computes its width from
            that empty container rather than its own text, collapsing to the
            single longest word's width no matter how generous max-width was
            set. An explicit width sidesteps that shrink-to-fit calculation
            entirely instead of trying to bound it. Back down from 340 to
            280 now that CALLOUTS's own copy is a sentence or two rather than
            a small paragraph — 340 read as an emptier box than the shorter
            text filled.

            Two elements per callout, and not for layout: the scroll-driven
            fade is written to the outer div's inline opacity every frame,
            while the first one's first-load fadeInUp stays on its paragraph.
            They cannot share an element — a CSS animation with fill-mode
            `both` keeps applying its final `opacity: 1` after it finishes,
            and an animation's value beats an inline one, so the fade would
            have silently done nothing at all. Every callout after the first
            starts at inline opacity 0 (no fadeInUp of its own — it isn't
            there on mount, it's crossed into later by the useFrame swap
            above) so there's no one-frame flash of full copy before the
            first frame has a chance to zero it out. */}
        {/* The two lit squares — same GridGlowMaterial treatment as About
            Us's own ambient grid squares, flat-filled and additively
            blended rather than radially falling off, so each reads as a
            lit-up cell rather than a soft glow. Sized to the cell itself
            (cellSize), same as GRID_GLOWS's own cellWorldSize scale. */}
        {litSquareCenters.map((center, i) => (
          <mesh
            key={i}
            ref={(el) => {
              litSquareRefs[i] = el
            }}
            position={[center.x, center.y, GRID_Z + 0.01]}
            scale={[cellSize, cellSize, 1]}
            raycast={() => null}
          >
            <planeGeometry args={[1, 1]} />
            <gridGlowMaterial transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
          </mesh>
        ))}

        {/* The logo mark and "Simulations", stacked inside the lit squares'
            own row — on top of them, not above — and punched through them:
            same colour as the scene's live background (see punchRef above),
            so wherever this sits over a lit square it reads as a hole cut
            clean through it rather than text drawn on top. No transform
            prop on this Html: like every other label in this canvas, it
            stays a fixed screen size rather than scaling with the grid's
            own zoom (see the callouts' own note on this) — close enough to
            "fits the squares" at rest without needing to track the zoom
            continuously.

            The transform anchors this block's own right edge, at its own
            vertical centre, to litSquareRightX/litSquareRowY — the top-right
            corner of the two squares' combined footprint — then pulls it
            TEXT_RIGHT_MARGIN_PX further left, off that corner, so there's a
            real gap kept
            between the text and the right-most square's own right edge
            rather than the two sitting flush (see that constant's own
            comment). whitespace-nowrap on each line (no fixed width — an
            explicit width only matters for a shrink-to-fit *wrapping* box,
            and neither line here wraps, sized instead to already fit — see
            SIM_AVG_CHAR_EM/LOGO_AVG_CHAR_EM above) so each right-aligns off
            its own natural content width. No default font-size here (unlike
            an earlier version that started both lines at a large reference
            size for a since-removed live measurement) — useFrame sets a
            real size on the very first visible frame, well before paint is
            likely to matter. */}
        <Html
          position={[litSquareRightX, litSquareRowY, GRID_Z + 0.02]}
          style={{ transform: `translate(calc(-100% - ${TEXT_RIGHT_MARGIN_PX}px), -50%)`, pointerEvents: 'none' }}
        >
          <div ref={punchRef} className="flex flex-col items-end">
            <span ref={logoTextRef} className="font-medium tracking-[0.2em] whitespace-nowrap">
              <XxentaWordmark />
            </span>
            <p ref={simTextRef} className="leading-none font-semibold whitespace-nowrap">
              {SIM_TEXT}
            </p>
          </div>
        </Html>

        {CALLOUTS.map((callout, i) => {
          const geometry = calloutPositions[i]
          return (
            <Html
              key={i}
              position={[geometry.x + cellSize * 0.3, (geometry.bottomY + geometry.topY) / 2, GRID_Z + 0.01]}
              style={{ transform: 'translateY(-50%)', pointerEvents: 'none' }}
            >
              <div
                ref={(el) => {
                  calloutRefs[i] = el
                }}
                className="w-[280px]"
                style={i === 0 ? undefined : { opacity: 0 }}
              >
                <p
                  className={`text-xs leading-loose font-extralight text-white/40 ${i === 0 ? 'animate-[fadeInUp_1s_ease-out_both]' : ''}`}
                >
                  {callout.text}
                </p>
              </div>
            </Html>
          )
        })}
      </group>
    </>
  )
}

// Owns this canvas's one real visible render, so that there is somewhere to
// *not* do it from. Giving any useFrame a priority turns off R3F's own
// automatic render, which is the only way to stop drawing a canvas that is
// nowhere near the screen — the same arrangement AboutUsSection's own gate
// uses, minus its OVERLAY_LAYER handling, which this scene has no need for
// (no glass here, so nothing is doing a backdrop capture that a layer split
// would have to hide from).
function SceneRenderGate({ isVisibleRef }) {
  useFrame((state) => {
    if (!isVisibleRef.current) return
    state.gl.render(state.scene, state.camera)
  }, 1)
  return null
}

// How much of this section is the original, unpinned placeholder screen. The
// rest — CHAT_SCROLL_VH, derived from the script itself rather than picked —
// is scroll spent standing still while the chat plays out.
const INTRO_VH = 100
const SECTION_VH = INTRO_VH + CHAT_SCROLL_VH

// 0 the instant the sticky stage pins (this section's top reaching the top of
// the screen, which is also the exact moment the grid zoom and the callout
// finish arriving — see the carousel-driven progress above, which hits 1 on
// that same frame), 1 the instant it unpins.
//
// Built from scrollY and the section's own cached offset rather than
// useScroll's own `target`/`offset` element tracking. Not a style preference:
// that combination was tried on SiteFooter, against a container with a sticky
// child, and put its window in the wrong place badly enough to need a live
// debug overlay to find — see that file's own note. Arithmetic against one
// measured number is a thing that can be reasoned about from the outside.
function usePinnedProgress(sectionRef, carouselRef) {
  const { scrollY } = useScroll()

  // Measured on mount and whenever anything could have moved this section,
  // then read per-frame as a plain property — never measured inside the
  // transform below. getBoundingClientRect forces a synchronous layout
  // reflow, and doing that on every scroll frame is exactly the main-thread
  // stall the page's wheel-gesture classifier reads event timing through
  // (see SiteFooter's dimsRef for the longer version of this same argument).
  const rangeRef = useRef({ start: 0, distance: 1, arrivalStart: 0 })
  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return
    function measure() {
      const start = section.getBoundingClientRect().top + window.scrollY
      rangeRef.current = {
        start,
        // The sticky stage is one screen tall inside a section SECTION_VH
        // tall, so it stays pinned for exactly the difference — which is
        // CHAT_SCROLL_VH, by construction.
        distance: Math.max(1, window.innerHeight * (CHAT_SCROLL_VH / 100)),
        // Where `arrival` (below) starts counting from: one viewport height
        // *before* start, i.e. the scroll position at which this section's
        // own top edge first touches the *bottom* of the screen — the same
        // "just starting to scroll into view from below" moment
        // SeamlessBackdrop's own carousel-driven zoom progress is measured
        // from, for the same reason: the visible portion of this section
        // ought to already be moving by the time any of it is on screen, not
        // only once it's fully arrived.
        arrivalStart: start - window.innerHeight,
      }
    }
    measure()
    window.addEventListener('resize', measure)
    // Where this section *starts* is the height of everything above it, and
    // a resize listener alone would miss that changing on its own — a web
    // font arriving late and re-flowing the carousel's wordmarks, most
    // realistically. The hero above is a flat h-screen, so the carousel is
    // the only variable height between the top of the document and here;
    // watching it directly catches every way it can change without having to
    // guess at causes. (Not the document element: index.css gives html/body
    // an explicit height: 100%, so their boxes are one viewport tall no
    // matter how long the page is, and a ResizeObserver on either reports
    // nothing but viewport resizes the listener above already covers.)
    const carousel = carouselRef?.current
    const observer = carousel ? new ResizeObserver(measure) : null
    if (carousel) observer.observe(carousel)
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [sectionRef, carouselRef])

  const progress = useTransform(scrollY, (latest) => {
    const { start, distance } = rangeRef.current
    return MathUtils.clamp((latest - start) / distance, 0, 1)
  })

  // 0 the instant this section's own top touches the *bottom* of the screen
  // (it's just beginning to scroll into view, still entirely below the
  // fold), 1 the instant that same edge reaches the *top* of the screen —
  // exactly where `progress` above starts counting from. Unlike `progress`,
  // which is deliberately pinned at 0 for that entire transit (0 there means
  // "the pinned phase hasn't begun," not "nothing has happened yet"), this
  // is what the chat frame's own arrival reads (see ChatShowcase) so it's
  // visibly part of what the visitor is watching scroll into place, rather
  // than snapping in fully-formed only once the section has already arrived.
  const arrival = useTransform(scrollY, (latest) => {
    const { arrivalStart, start } = rangeRef.current
    return MathUtils.clamp((latest - arrivalStart) / (start - arrivalStart), 0, 1)
  })

  // The same number again, as a plain ref, for the WebGL side — useFrame runs
  // outside React and wants a property read, not a subscription. One source,
  // two readers, rather than two independent copies of the arithmetic.
  const progressRef = useRef(0)
  useEffect(() => {
    progressRef.current = progress.get()
    return progress.on('change', (value) => {
      progressRef.current = value
    })
  }, [progress])

  return { progress, progressRef, arrival }
}

export function BackgroundGlowSection({ carouselRef }) {
  const sectionRef = useRef(null)
  const { progress, progressRef, arrival } = usePinnedProgress(sectionRef, carouselRef)

  // How far into each of the chat's two moods the visitor currently is, on
  // the WebGL side. Derived from the same scroll progress and the same
  // functions the DOM reads (chatDimAt/chatAngryAt), so the screen's colour
  // and the header's own accent tint (see ChatShowcase) can never disagree
  // with the DOM about which segment is open — refs rather than state,
  // since both change on every scroll frame and only ever need to reach a
  // frame loop.
  const dimRef = useRef(0)
  const angryRef = useRef(0)
  useEffect(() => {
    function update(value) {
      dimRef.current = chatDimAt(value)
      angryRef.current = chatAngryAt(value)
    }
    update(progress.get())
    return progress.on('change', update)
  }, [progress])
  // Whether this section is painting anywhere on screen. Until this existed
  // it simply never stopped: GlassLogoHero and AboutUsSection each gate their
  // own canvas on exactly this, and this one — a full-screen canvas a whole
  // viewport below the fold — was drawing every frame for as long as the tab
  // stayed open, including the entire time a visitor is sitting at the top
  // looking at the hero. Roughly double the fill cost of the thing they were
  // actually looking at, spent on something a screen away.
  //
  // A ref rather than state, and an IntersectionObserver rather than scroll
  // math, for the same reasons the other two gates give: no re-render per
  // frame, and it tracks where the section really paints.
  const isVisibleRef = useRef(true)
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting
    })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // A soft cushion for the moment the sticky stage actually catches —
  // reported directly as feeling like an abrupt lock, which is a fair read
  // of what position:sticky's own "catch" really is: content that was
  // moving with the scroll suddenly isn't, in exactly one frame, with
  // nothing in between. That binary snap isn't something CSS lets this
  // stop being — sticky is either stuck or it isn't — so rather than fight
  // the mechanism itself, this gives the eye something to follow through
  // the moment it happens: the stage grows in slightly (STAGE_SETTLE_SCALE
  // to 1) as `arrival` completes, via a spring rather than a plain
  // scroll-linked transform, so it keeps gently settling for a few frames
  // even after the scroll that triggered it has already stopped (or
  // overshot past 1 in one hard flick) — the same "absorbs the stop rather
  // than hitting a wall" cue a physical spring gives, standing in for one
  // CSS itself has no way to add to the catch.
  const stageScale = useSpring(useTransform(arrival, [0, 1], [STAGE_SETTLE_SCALE, 1]), STAGE_SETTLE_SPRING)

  return (
    // No overflow-hidden here, unlike the h-screen version this replaces —
    // that would make this box a scrollport, and a sticky child sticks to its
    // nearest scrolling ancestor, so the stage below would have stuck to a
    // container that never scrolls (i.e. not stuck at all). The clipping
    // moves onto the stage itself, which is the only thing that needed it.
    <section ref={sectionRef} className="relative w-full bg-[#0F172B]" style={{ height: `${SECTION_VH}vh` }}>
      {/* The pinned stage. Exactly one screen tall inside a taller section,
          which is the whole mechanism: it rides up with the page until its
          top reaches the top of the screen, holds there for the section's
          remaining height, then releases and scrolls away with it — no
          scroll listener, no unpin logic to get wrong. `scale` (see
          stageScale) is the one transform it does carry, purely cosmetic —
          sticky positioning itself is computed from this element's own
          normal-flow position, which a transform never changes, so the
          cushion rides along without touching *where* it sticks, only how
          the catch itself feels. */}
      <motion.div className="sticky top-0 h-screen w-full overflow-hidden" style={{ scale: stageScale }}>
        {/* Capped the same way GlassLogoHero's own canvas is — left uncapped,
            this renders at the browser's raw devicePixelRatio, which on a 3x
            phone/laptop panel is a lot of extra fill rate for a plain grid +
            gradient with no fine detail that benefits from it. */}
        <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 35 }} gl={{ antialias: true, alpha: false }}>
          <SeamlessBackdrop
            carouselRef={carouselRef}
            isVisibleRef={isVisibleRef}
            pinnedProgressRef={progressRef}
            dimRef={dimRef}
            angryRef={angryRef}
          />
          <SceneRenderGate isVisibleRef={isVisibleRef} />
        </Canvas>
        {/* Plain DOM over the canvas rather than more drei Html: this is a
            text-heavy interface with real wrapping, masks and hairlines, and
            nothing about it wants to be in the 3D scene. It sits after the
            Canvas in tree order, so it paints over both the grid and the
            callout's own Html without needing a z-index. */}
        <ChatShowcase progress={progress} arrival={arrival} />
      </motion.div>
    </section>
  )
}

export default BackgroundGlowSection
