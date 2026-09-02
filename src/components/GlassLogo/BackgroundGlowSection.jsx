import { Suspense, useEffect, useLayoutEffect, useRef } from 'react'
import { Html, shaderMaterial } from '@react-three/drei'
import { Canvas, extend, useFrame, useLoader } from '@react-three/fiber'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { Color, MathUtils, Plane, TextureLoader, Vector3 } from 'three'
import { GridPlane } from './BackgroundGrid'
import { CHAT_SCROLL_VH, CHAT_TIMELINE, chatAngryAt, chatDimAt } from './chatShowcaseScript'
import { ChatShowcase } from './ChatShowcase'
import { DIRECT_STYLE, EDGE_STYLE, OVERSCALE, TARGET_CELL_PX, THROUGH_GLASS_STYLE } from './gridConstants'
import { pageMarginPx } from './pageMargin'
import { GradientBlob } from './GradientBlob'
import { COURSES, PANEL_DESIGN_WIDTH, SyllabusOverviewPanel } from './SyllabusOverviewPanel'
import { AI_IMPACT_PANEL_DESIGN_WIDTH, AiImpactAnalysisPanel } from './AiImpactAnalysisPanel'
import { XxentaWordmark } from './XxentaWordmark'
import {
  BLOB_WIDTH_OVERSCALE,
  GRID_Z,
  PLANE_SIZE,
  PLANE_Z,
  SCENE_BACKDROP,
  SCENE_BACKDROP_ANGRY,
  SCENE_BACKDROP_DIM,
  SCENE_BACKDROP_DRP,
  SCENE_BACKDROP_DRP_BRIGHT,
} from './sceneConstants'
import { useSeamlessGrid } from './useSeamlessGrid'

function Updater({ updateFn }) {
  useFrame(updateFn)
  return null
}

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
//
// The five trigger indices below are segments[1..4] — every segment the
// Floren Showcase's own script has left, in order — not segments[1,2,4,5]
// the way this list read before: cutting the private aside with Dr. Sam for
// length (asked for directly, "the script is too long") removed a whole
// segment, which shifted every later one back by one. Left as the old
// indices, segments[5] would have been undefined outright (only five
// segments exist now, 0-4) and segments[4] would have silently retargeted
// the last callout onto Carla's own arc instead of Peter waking — this
// spells out the new mapping explicitly rather than leaving that shift
// implicit in numbers that used to mean something else.
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
    // Peter's own dim check, now — the private aside used to be Dr. Sam's,
    // but this text was always generic enough ("someone," not "Dr. Sam") to
    // land just as well on any pulled-aside, one-on-one thread.
    trigger: CHAT_TIMELINE.segments[1],
    text: 'Pull someone aside and the conversation is theirs to keep — private, and different every time.',
  },
  {
    column: 'A',
    rowOffset: ROW_OFFSET_CELLS_BOTTOM,
    // The code sequence — compressions, then the shock. Reads at least as
    // well here as it did on Peter's own dim check (its previous trigger,
    // now segments[1] above): "miss the moment, and it shows" fits a code's
    // own urgency if anything more than a quiet bedside check did.
    trigger: CHAT_TIMELINE.segments[2],
    text: "The case reacts to what's actually happening to the patient, not to a script. Miss the moment, and it shows.",
  },
  {
    column: 'A',
    rowOffset: 2,
    // Peter waking up.
    trigger: CHAT_TIMELINE.segments[3],
    text: 'Every character in the room, and the room itself, is running live on Gemini.',
  },
  {
    column: 'B',
    rowOffset: ROW_OFFSET_CELLS_BOTTOM,
    // Carla's own arc — pulled aside angry, then calmed.
    trigger: CHAT_TIMELINE.segments[4],
    text: 'Academic skill is only half of it. Calming a terrified relative is a skill too, and nothing here is graded — only practiced.',
  },
]

// DRP Showcase's own first guided message — same standing as CALLOUTS
// above, just its own separate list rather than one more entry in it: it
// belongs to the hover phase (see HOVER_VH), not the chat's own timeline,
// so it has nothing to trigger off of CALLOUTS's own trigger field
// expects. "The first" because more of these, timed to later DRP Showcase
// beats, are the expected shape this grows into — not built out yet since
// only the one exists to show right now.
const HOVER_CALLOUT_TEXT =
  'Every syllabus is built for real-world depth — structured dynamically, and updated with every case.'

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
const PUNCH_TEXT_BASE_OPACITY = 0.8

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
// unconscious stretch, Carla's own anger, or DRP Showcase's own taupe.
const SQUARE_LIT = new Color('#6CA1F8')
const SQUARE_DIM = new Color('#94A3B8')
const SQUARE_ANGRY = new Color('#F87171')
// Started out exactly matching SCENE_BACKDROP_DRP (the same taupe the
// background itself is built from), then asked to be lighter than it — a
// deliberately distinct, lighter shade of the same family now rather than
// the identical value, so the squares still read as their own plate against
// the background instead of blending into it. Brightened once more, same
// R-G/G-B channel gaps kept intact so the hue itself doesn't shift, only
// how light it reads.
const SQUARE_DRP = new Color('#C0B9B6')
const SQUARE_DRP_BRIGHT = new Color('#DFDDDD')
// How opaque each square sits at rest — low, the same "ambient, ~2-4%"
// register GRID_GLOWS itself uses, so these read as a faint accent beside
// the callout rather than competing with it for attention.
const LIT_SQUARE_OPACITY = 0.05
// How opaque the squares get once in DRP Showcase — reported directly that
// the xXenta mark/"Exams & Syllabi" punched through them wasn't reading at
// all: at LIT_SQUARE_OPACITY's own ~5%, additively blended, the square was
// never anything more than a faint wash a light background nearly
// swallowed whole. Near-opaque instead, so the taupe genuinely reads as its
// own solid plate — brought down four times now (0.92, 0.8, 0.68, 0.6),
// each time asked for directly, so more of the grid underneath keeps
// showing through.
const DRP_SQUARE_OPACITY = 0.5
// How much brighter the grid lines get once in DRP Showcase — reported
// directly as not visible at all against the lighter background (see
// lineOpacityBoostRef's own comment in BackgroundGlowSection for the actual
// numbers this is multiplying). DIRECT_STYLE's own lineOpacity sits at a
// bare 0.012 — even this brings it to a still-restrained ~0.1. Brought down
// twice now (14, then 11), both times asked for directly.
const DRP_LINE_OPACITY_BOOST = 8
const DRP2_LINE_OPACITY_BOOST = 10

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

// The same two lit squares relabel in place, rather than a second pair
// living further along the grid — asked for directly, after an earlier pass
// tried the second-pair version. "Exams & Syllabi", left-justified, is what
// the lockup becomes; SIM_TEXT/right-justified is what it still is at rest.
const EXAMS_TEXT = 'Exams & Syllabi'
// Longer than SIM_TEXT and includes a space and an ampersand — both render
// narrower than a typical letter, which this same-register-per-character
// estimate doesn't know to discount. That only ever makes the estimate
// *more* conservative (a bigger assumed width than the real one), which is
// the same safe direction SIM_AVG_CHAR_EM's own estimate already errs in.
const EXAMS_AVG_CHAR_EM = 0.6
// The gap kept between the squares' own left edge and the incoming lockup's
// own left edge, once it's left-justified — TEXT_RIGHT_MARGIN_PX's own
// register (6) reads fine on the *right*, where safeTextRightX already keeps
// real distance from the true screen edge on top of it, but with nothing
// else backing it up here once the squares sit flush against that edge
// themselves, 6px alone read as the text glued right to it. Bumped up to
// SCREEN_EDGE_MARGIN_PX's own register instead — a real, deliberate margin
// off an edge, not a hairline gap off a neighbouring square — then nudged a
// little further still, asked for directly.
const EXAMS_TEXT_LEFT_MARGIN_PX = 32
// A small correction on "xXenta" alone, not the whole lockup — asked for
// directly, to line its own left edge up exactly with "Exams & Syllabi"'s
// own E underneath it. A fraction of the line's own font-size rather than a
// flat pixel count: the first attempt (a flat 1px, even once scaled by
// nextScale) came out to only a couple of percent of the glyph's own
// height once actually on screen — genuinely too small a fraction of an
// "x" that size to read as a shift at all, which is what "nothing changed"
// twice over actually was. Sized off the font-size itself (see the frame
// loop) instead, so it's a fixed, visible proportion of the glyph
// regardless of how large that glyph currently renders.
const EXAMS_LOGO_NUDGE_EM = 0.05
// How much world space the squares' own slide spends catching up to its
// target each frame — gentler than the zoom's own lambda (8), appropriate
// for a slower, more deliberate motion than the zoom's.
const PAN_LAMBDA = 6
// How much of the pan's own 0..1 the "previous page" fade-outs spend —
// shared between the chat UI's own opacity (a DOM motion value, see
// chatOpacity in BackgroundGlowSection) and the active callout's (a WebGL
// per-frame write, see the frame loop below), so the two fade out together
// rather than the callout lingering after the chat itself is already gone,
// or vice versa. Well short of 1 — both should be long gone before the
// squares finish landing on the second lockup, not still dissolving as it
// arrives.
const PAN_FADE_END = 0.3

// DRP Showcase's own placeholder — a stand-in for whatever actual content
// eventually goes there, asked for as "a massive beige rectangle for now"
// covering "that side of the screen top to bottom". Counting the squares'
// own two columns as DRP Showcase's first two, this starts on its fourth
// (PLACEHOLDER_COLUMN_GAP=1 spare column between the squares and it, then
// the placeholder itself) and reaches all the way to the screen's own true
// right edge (see placeholderRightX below) — "it's all just placeholder
// space" from there on, not a fixed-size block sitting somewhere in it.
//
// The same shared constant the scene's own flat background is built from
// (see BACKDROP_DRP below and SCENE_BACKDROP_DRP in sceneConstants.js) —
// one hex value, not two copies of it that could drift apart, so the
// rectangle and the background it sits in front of always agree.
const PLACEHOLDER_COLOR = SCENE_BACKDROP_DRP
// The same muted warm brown SyllabusOverviewPanel's own TEXT_COLOR uses —
// kept as its own copy here rather than imported, the same "these just
// needed the same two numbers" case pageMargin.js's own module comment
// already argues against duplicating, except this really is just the one
// hex value a completely different DOM tree needs to visually match, not
// shared layout logic. Used wherever DRP Showcase needs legible text over
// its own light backdrop — CALLOUTS's own text-white/40 is tuned for
// Floren Showcase's dark one and reads as close to invisible here.
const DRP_TEXT_COLOR = '#645A57'
const PLACEHOLDER_COLUMN_GAP = 1
// The scene's own flat background, once in DRP Showcase — lerped toward
// the same way BACKDROP_DIM/ANGRY already are, see panT's own use in the
// frame loop.
const BACKDROP_DRP = new Color(SCENE_BACKDROP_DRP)
const BACKDROP_DRP_BRIGHT = new Color(SCENE_BACKDROP_DRP_BRIGHT)
// A path into /public, same convention every image on this site uses (see
// SPEAKERS' own avatar entries in chatShowcaseScript.js).
const PLACEHOLDER_IMAGE_URL = '/DRP_1.png'

// Loads DRP_1.png and hands back the material that actually shows it — its
// own component, not inlined into the mesh below, specifically so only
// *this* suspends while the texture loads rather than the whole canvas:
// same "its own nested Suspense boundary" reasoning AboutUsSection's own
// per-member nameIcon SVG load already documents (see that file's own
// comment on why one shared boundary would be the wrong scope). useLoader
// over drei's useTexture for the same reason PhotoBackdropCapture gives for
// avoiding it elsewhere in this piece — the difference there was suspending
// on *every* src change from repeated cycling through several photos, which
// doesn't apply here: this loads exactly one URL, once, for the life of the
// page.
// clippingPlanes forwarded from SeamlessBackdrop (see drpClipPlaneRef) —
// a real GPU clip against the grid's own fixed left boundary, not just an
// opacity/render-order guess. renderOrder alone (see litSquareRefs) turned
// out not to be enough on its own: reported directly, the grid was still
// getting hidden behind both images after that fix — a clip plane can't
// lose that fight the way a transparent-object paint order can, since
// fragments past it are discarded outright rather than merely drawn
// earlier or later.
function PlaceholderImageMaterial({ clippingPlanes }) {
  const texture = useLoader(TextureLoader, PLACEHOLDER_IMAGE_URL)
  return <meshBasicMaterial map={texture} transparent opacity={0} toneMapped={false} clippingPlanes={clippingPlanes} />
}

// What the reveal phase pans in from off-screen right, behind DRP_1.png —
// see drp2CenterX/drp2Width's own comments for where this actually sits.
// Same convention, same per-file Suspense boundary, as PlaceholderImageMaterial
// just above — except not transparent, and not faded in: reported directly
// as a visible shadow where the two images met while this one was still
// part-way through fading in, since a part-transparent plane blends toward
// whatever's behind it (the grid/backdrop colour) rather than showing its
// own real colour. Fully opaque from the moment it loads instead — it
// isn't on screen at all until the reveal phase's own pan (see
// revealWorldDistance) brings it into view, so there's nothing for an
// entrance fade to actually soften here the way there was for DRP_1.
const DRP2_IMAGE_URL = '/DRP_2.png'

function Drp2ImageMaterial({ clippingPlanes }) {
  const texture = useLoader(TextureLoader, DRP2_IMAGE_URL)
  return <meshBasicMaterial map={texture} toneMapped={false} clippingPlanes={clippingPlanes} />
}

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
function SeamlessBackdrop({
  carouselRef,
  isVisibleRef,
  pinnedProgressRef,
  panProgressRef,
  hoverProgressRef,
  revealProgressRef,
  plannerProgressRef,
  dimRef,
  angryRef,
}) {
  // screenOffset 1 — this section continues the pattern one screen *below*
  // the hero (see useSeamlessGrid for the shared derivation of
  // yPhaseShiftCells/blobY this used to do inline).
  const { size, blobWidth, blobHeight, gridWidth, gridHeight, cellSize, repeat, yPhaseShiftCells, blobY } = useSeamlessGrid(1)
  const blobMeshHeight = Math.max(PLANE_SIZE * 1.6, blobHeight * 2.5)
  // Carries just the two grid planes (not the blob — the ask was for the
  // grid specifically to zoom, and leaving the blob's own much larger,
  // softer shape untouched keeps it reading as the stable backdrop the grid
  // zooms *in front of*) so finalZoomScale can scale them as one unit.
  const gridGroupRef = useRef(null)
  // A sibling of gridGroupRef, not a child of it — the callouts render here
  // instead so the squares' own slide (see panWorldDistance) doesn't carry
  // them along with it. Reported directly, after the squares' own pan
  // shipped: "the 'Academic skill is only half of it' text shouldn't follow
  // along." Mirrors gridGroupRef's own scale and Y-drift every frame (so it
  // still reads as sitting on the same grid, at the same zoom, everywhere
  // else) but never receives the X pan gridGroupRef itself gets.
  const calloutGroupRef = useRef(null)
  // A sibling of gridGroupRef too, for the opposite reason — see its own
  // comment where it's rendered. Carries DRP_1.png, DRP_2.png, and the
  // syllabus panel through everything gridGroupRef itself does during the
  // pan phase (scale, Y-drift, panT-driven pan), plus its own further
  // revealT-driven travel once the reveal phase starts, which gridGroupRef
  // — and the grid/squares/lockup text still inside it — no longer gets.
  const revealGroupRef = useRef(null)
  // The reveal phase's own extra travel, damped on its own — but only
  // *this* part, not the whole panWorldDistance + revealWorldDistance sum
  // (see the frame loop). Two fully independent MathUtils.damp() calls
  // (one for group.position.x, a second for the old version of this) share
  // the same panWorldDistance × panT term but chase it from separate
  // histories, so nothing guarantees they ever agree on it to the pixel —
  // negligible at rest, but a fast scroll pushes both targets at once and
  // lets the two smoothers drift apart from each other by a visible amount
  // while catching up. Reported directly: fast scrolling in either
  // direction showed the syllabus panel's own clip (see boundaryWorldX)
  // misaligned with the grid, sometimes clipping too much, sometimes too
  // little. Deriving revealGroupRef's position from gridGroupRef's own
  // *actual* current position instead — group.position.x + this damped
  // extra — makes the two agree exactly, always, since one is now
  // arithmetically built from the other rather than independently chasing
  // the same number.
  const revealOffsetRef = useRef(0)
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
  // The incoming "Exams & Syllabi" lockup — crossfades in as SIM_TEXT's own
  // block crossfades out (see the frame loop), both sitting on the *same*
  // two squares rather than a second pair elsewhere. A separate DOM block
  // rather than retargeting the one above for the same reason the callouts
  // each get their own element: the two have to be visible at once, mid-
  // crossfade, which one retargeted element could never show.
  const examsPunchRef = useRef(null)
  const examsLogoTextRef = useRef(null)
  const examsTextRef = useRef(null)
  // DRP Showcase's own placeholder rectangle — faded in over the same
  // panT the lockup crossfade already uses (see the frame loop), so it
  // doesn't sit there fully opaque before the pan has even started. Simply
  // absent that entirely at rest would work just as well visually, but
  // fading it in reads as arriving deliberately rather than just always
  // having been there, off past the edge of what was on screen.
  const placeholderMeshRef = useRef(null)
  // The "Syllabus Overview" list riding on top of the placeholder image —
  // faded in and scaled the same panT/nextScale-driven way as the
  // placeholder itself (see the frame loop), so it arrives with the rest
  // of DRP Showcase rather than sitting there at native size from the
  // start.
  const syllabusPanelRef = useRef(null)
  // The "AI Impact Analysis" panel sitting directly on top of DRP_2
  const aiImpactPanelRef = useRef(null)
  const aiCursorRef = useRef(null)
  const aiCursorRippleRef = useRef(null)
  const aiSliderFillRef = useRef(null)
  const aiSliderThumbRef = useRef(null)
  const aiLlmInputRef = useRef(null)
  const aiLlmTextRef = useRef(null)
  const aiLlmPlaceholderRef = useRef(null)
  const aiLlmCaretRef = useRef(null)
  const aiImpactCardRef = useRef(null)
  const macroPlannerViewRef = useRef(null)
  const macroPlannerHeaderRef = useRef(null)
  const macroPlannerContainerRef = useRef(null)
  const plannerCursorRef = useRef(null)
  const plannerRippleRef = useRef(null)
  const draggedCardRef = useRef(null)
  const dropPlaceholderRef = useRef(null)
  const droppedCardRef = useRef(null)
  const sidebarPreparingCardRef = useRef(null)
  const sidebarGripRef = useRef(null)
  const criteriaCountRef = useRef(null)
  const p12CountRef = useRef(null)
  const p11FinancialCardRef = useRef(null)
  const p11FinancialTitleRef = useRef(null)
  const p11FinancialImpactRef = useRef(null)
  const navAiAnalysisRef = useRef(null)
  const navPlanningRef = useRef(null)
  const navProductionRef = useRef(null)
  const syllabusProductionViewRef = useRef(null)
  // The syllabus panel's own pills and title — driven during revealT to
  // stagger out from bottom to top so Entrepreneurial Management exits last.
  const pillRefs = useRef([])
  const titleRef = useRef(null)
  const firstPillRef = useRef(null)
  // Minimalist guided cursor that points and clicks on the first pill
  const cursorRef = useRef(null)
  const cursorRippleRef = useRef(null)
  // The hover phase's own guided message — same visual treatment as
  // Floren Showcase's own first callout (see CALLOUTS), reusing that
  // callout's exact position (calloutPositions[0]) rather than a position
  // of its own, and living in the same calloutGroupRef, so it reads as
  // "the same message slot, on to its next thing" rather than a new
  // element appearing somewhere unrelated. Opacity driven by hoverT alone
  // (see the frame loop) rather than the CALLOUTS crossfade machinery —
  // there's only the one of these right now.
  const hoverCalloutRef = useRef(null)
  // DRP Showcase's own second placeholder image — see Drp2ImageMaterial
  // and drp2CenterX's own comment for where it sits and why. Always fully
  // opaque once loaded (see Drp2ImageMaterial's own comment) rather than
  // fading in — it isn't visible at all until the reveal phase's pan
  // brings it into view, so there's nothing an entrance fade would
  // actually be softening.
  const drp2MeshRef = useRef(null)
  // A world-space clip plane, normal pointing +X, kept past the grid's own
  // fixed left boundary (placeholderLeftX, see its own comment) — applied
  // to DRP_1/DRP_2's own materials below so neither can ever render to the
  // left of it, full stop, regardless of transparency/paint-order (see
  // renderOrder's own comment on litSquareRefs, which alone wasn't enough).
  // One shared Plane instance, its own .constant mutated per frame in the
  // frame loop rather than a new Plane allocated every frame — the same
  // "mutate the existing object, don't reallocate" convention this file's
  // Color refs already use.
  const drpClipPlaneRef = useRef(new Plane(new Vector3(1, 0, 0), 0))
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
  // The blob's own third mood (see GradientBlob's own drpRef prop) — local
  // to this component, unlike dimRef/angryRef, which arrive as props from
  // BackgroundGlowSection because ChatShowcase (a DOM component, outside
  // this canvas entirely) also needs them for the header's own accent
  // colours. Nothing outside this canvas needs DRP Showcase's own mood, so
  // it never has to leave it.
  const drpRef = useRef(0)
  const revealSlideRef = useRef(0)
  // The grid lines' own multiplier once in DRP Showcase (see
  // lineOpacityBoostRef in GridPlane) — reported directly as not visible at
  // all against the taupe background, which checks out: style.lineOpacity/
  // plusOpacity (DIRECT_STYLE/THROUGH_GLASS_STYLE, see gridConstants.js) are
  // tuned to sit at a bare 0.4%-2.7% against the hero's own near-black navy,
  // nowhere near enough contrast against a lighter, mid-toned background.
  // Starts at 1 (no change from either style's own resting opacity, so the
  // chat phase reads exactly as it always has) and ramps up with panT.
  const lineOpacityBoostRef = useRef(1)

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

  // DRP Showcase's guided message row — placed one row down from the top
  const hoverCalloutRow = rowGeometryAt(1)

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

  // Where the squares' own slide ends: flush against the screen's *true*
  // left edge — asked for directly, "literally touch the left edge," not
  // the page's own standard margin targetEdgeLeftX uses above. -gridWidth/2
  // is that true edge in world space at this Z (gridWidth is the full
  // viewport width there), with nothing subtracted from it.
  const trueScreenLeftX = -gridWidth / 2
  // How far gridGroupRef itself has to move — the *whole* group, grid and
  // callouts included, not the squares on their own: reported directly that
  // the squares can never separate from the grid they sit on, which a
  // second, independently-offset inner group (tried first) would have done
  // the instant it moved anywhere the outer group's own drift/zoom hadn't
  // already put it. group.position lives in the *parent's* own space,
  // applied before this group's scale (same as driftWorld above), so the
  // offset needed is the true world distance directly — edgeXB×finalZoomScale
  // is where the squares' own left edge already sits, and the gap between
  // that and trueScreenLeftX is exactly how far the whole group has to
  // travel to close it. Same backwards-from-the-destination technique
  // finalZoomScale itself already uses for the highlighted edge.
  const panWorldDistance = trueScreenLeftX - edgeXB * finalZoomScale

  // DRP Showcase's own placeholder rectangle — see PLACEHOLDER_COLOR's own
  // comment for the column counting. Left edge: past the squares' own two
  // columns (edgeXB to edgeXB + 2×cellSize) and PLACEHOLDER_COLUMN_GAP more.
  // Right edge: solved the same backwards-from-the-destination way
  // panWorldDistance itself is, just for the screen's *right* edge instead
  // of its left — worldX = trueScreenLeftX + (localX - edgeXB)×finalZoomScale
  // is what any local X inside this group lands on once fully panned (see
  // panWorldDistance's own derivation), so setting that equal to the
  // screen's true right edge (gridWidth/2, trueScreenLeftX's own mirror) and
  // solving for localX gives the one local X that reaches exactly there —
  // edgeXB + gridWidth/finalZoomScale, after trueScreenLeftX (-gridWidth/2)
  // cancels out.
  const placeholderLeftX = edgeXB + (2 + PLACEHOLDER_COLUMN_GAP) * cellSize
  const placeholderRightX = edgeXB + gridWidth / finalZoomScale
  const placeholderWidth = Math.max(cellSize, placeholderRightX - placeholderLeftX)
  const placeholderCenterX = (placeholderLeftX + placeholderRightX) / 2
  // Top to bottom, asked for directly — gridHeight is the screen's own real
  // height in world units (unzoomed), so dividing it back down by
  // finalZoomScale gives the *local* height that, once this group's own
  // scale is applied to it like everything else inside gridGroupRef, comes
  // out to exactly gridHeight again — the full screen, not a fraction of it.
  const placeholderHeight = gridHeight / finalZoomScale
  // A local Y offset canceling out this group's own slow upward drift
  // (group.position.y = driftWorld × pinned — see driftWorld's own
  // comment), which is what actually shrank this down to "only the
  // top-right corner": pinned sits at exactly 1 for the entire time DRP
  // Showcase can ever be on screen (panProgress only ever starts moving
  // once it does — see panProgress's own comment), so the drift isn't
  // partial here, it's already at its full, maximum height by then. A
  // rectangle sized to exactly match the screen's own height had zero
  // slack to absorb that with, so the group's own drift pushed nearly all
  // of it above the top edge, leaving only a sliver of its own bottom
  // showing near the top of the screen. Dividing driftWorld by
  // finalZoomScale (the same "undo this group's own scale to find the
  // local offset that cancels a known world one" step panWorldDistance
  // itself already uses) is what keeps this rectangle's own centre sitting
  // on the screen's true vertical centre regardless.
  const placeholderCenterY = -driftWorld / finalZoomScale

  // The reveal phase's own further travel, on top of panWorldDistance —
  // exactly one more gridWidth (the screen's own full width, in world
  // units) to the left. Solved the same backwards-from-the-destination way
  // panWorldDistance itself is, for DRP_2's own left edge (drp2LeftX below,
  // which sits flush against placeholderRightX — DRP_1's own right edge)
  // reaching the screen's true left edge once revealT hits 1:
  //   trueScreenLeftX = panWorldDistance + revealWorldDistance + placeholderRightX×finalZoomScale
  // Substituting panWorldDistance's own definition and placeholderRightX's
  // own (edgeXB + gridWidth/finalZoomScale) cancels every term but
  // gridWidth itself, leaving revealWorldDistance = -gridWidth exactly —
  // which also happens to be the one distance that guarantees DRP_1 and
  // DRP_2 (flush against each other, combined wider than one screen) never
  // open a gap between them during the slide: shifting a fully-zoomed
  // scene left by exactly one screen-width just pans the viewport by
  // exactly one whole screen of content, the same way panWorldDistance
  // itself reveals what was off past the right edge without ever exposing
  // the grid pattern underneath.
  const revealWorldDistance = -gridWidth

  // DRP Showcase's own second image — flush against DRP_1's own right
  // edge (placeholderRightX), sized to exactly one screen-width the same
  // way placeholderHeight solves for exactly one screen-height (gridWidth/
  // finalZoomScale, this plane's own local units, becomes exactly gridWidth
  // once this group's scale is applied) — so once the reveal phase
  // finishes, DRP_2 fills the screen edge to edge rather than starting
  // from some column in like DRP_1 does.
  const drp2LeftX = placeholderRightX
  const drp2Width = gridWidth / finalZoomScale
  const drp2RightX = drp2LeftX + drp2Width
  const drp2CenterX = (drp2LeftX + drp2RightX) / 2
  // Same height, same drift cancellation as placeholderHeight/
  // placeholderCenterY just above — both images sit on the same row.
  const drp2Height = placeholderHeight
  const drp2CenterY = placeholderCenterY

  // DRP Showcase's second overlay panel ("AI Impact Analysis") — sits at the
  // exact corresponding showcase slot on DRP_2, offset by one full screen
  // width (gridWidth / finalZoomScale), so that once revealGroupRef completes
  // its slide to the left, this panel lands in the exact same on-screen position
  // and width as the Syllabus Overview panel.
  const drp2PanelLeftX = placeholderLeftX + gridWidth / finalZoomScale
  const drp2PanelCenterX = placeholderCenterX + gridWidth / finalZoomScale
  const drp2PanelCenterY = placeholderCenterY

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
  const updateFn = (_, delta) => {
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
    // Mirrored onto the callouts' own group too — same zoom, just never the
    // X pan (see calloutGroupRef's own comment).
    if (calloutGroupRef.current) calloutGroupRef.current.scale.set(nextScale, nextScale, 1)
    // ...and onto revealGroupRef, same zoom again — see its own comment.
    if (revealGroupRef.current) revealGroupRef.current.scale.set(nextScale, nextScale, 1)

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
    // The second lockup's own font sizes — identical shape to the block
    // just above, minus TEXT_RIGHT_MARGIN_PX's own name (it's the same
    // margin register either side, just spent on the left this time).
    if (examsLogoTextRef.current) {
      const heightPx = onScreenCellPx * 0.16
      const widthPx = widthBudgetPx / (LOGO_TEXT.length * (LOGO_AVG_CHAR_EM + LOGO_TRACKING_EM))
      const logoFontPx = Math.min(heightPx, widthPx)
      examsLogoTextRef.current.style.fontSize = `${logoFontPx}px`
      // EXAMS_LOGO_NUDGE_EM as a fraction of this same line's own font-size
      // (just computed above), not a flat pixel count — see that constant's
      // own comment for why: a fixed em-fraction is guaranteed to read as
      // the same *proportion* of the glyph regardless of how large it's
      // currently rendering, where a flat px (even scaled by nextScale)
      // came out too small to see once actually on screen.
      examsLogoTextRef.current.style.marginLeft = `${logoFontPx * EXAMS_LOGO_NUDGE_EM}px`
    }
    if (examsTextRef.current) {
      const heightPx = onScreenCellPx * 0.58
      const widthPx = widthBudgetPx / (EXAMS_TEXT.length * EXAMS_AVG_CHAR_EM)
      examsTextRef.current.style.fontSize = `${Math.min(heightPx, widthPx)}px`
    }

    // The pinned phase, from here down. position is applied in the parent's
    // own space, before this group's scale, so the drift is unaffected by
    // whatever the zoom is currently doing — the two compose rather than
    // multiply. Positive Y is up: the page has stopped moving the background
    // for us, so this keeps it going in the direction it was already going,
    // just far slower than the scroll driving it.
    const pinned = pinnedProgressRef.current
    group.position.y = driftWorld * pinned
    // Mirrored onto the callouts' own group as well, same reason the scale
    // is — see calloutGroupRef's own comment.
    if (calloutGroupRef.current) calloutGroupRef.current.position.y = driftWorld * pinned
    // ...and onto revealGroupRef too — see its own comment.
    if (revealGroupRef.current) revealGroupRef.current.position.y = driftWorld * pinned

    // gridGroupRef's own slide to the screen's true left edge — the grid and
    // the squares moving together as one rigid unit (see panWorldDistance's
    // own comment on why this can't be a second, independently-offset inner
    // group), *not* the callouts, which live in their own sibling group
    // specifically so they stay put while this happens — and the crossfade
    // from "Simulations" to "Exams & Syllabi" riding along with it, both
    // driven by panProgressRef, which stays 0 for all of the chat (see
    // panProgress's own comment) and only starts moving once the chat
    // itself is done. smoothstepEase for the same "a linear reveal reads as
    // mechanical" reason the zoom above uses it; MathUtils.damp on top for
    // the same reason nextScale is damped rather than set directly — a fast
    // flick through this stretch still catches up smoothly rather than
    // snapping the instant scroll outruns a plain lerp.
    const panT = smoothstepEase(panProgressRef.current)
    group.position.x = MathUtils.damp(group.position.x, panWorldDistance * panT, PAN_LAMBDA, delta)
    // The hover and reveal phases' own progress — see HOVER_VH/REVEAL_VH.
    // Both stay 0 for the entire chat and the pan into DRP Showcase (their
    // own useTransform windows don't open until panProgress/hoverProgress
    // respectively have already reached 1), the same chained "arrives, then
    // plays out, then hands off" shape panT itself follows from progress.
    const hoverT = smoothstepEase(hoverProgressRef.current)
    const rawReveal = revealProgressRef.current
    const slideT = smoothstepEase(MathUtils.clamp(rawReveal / 0.20, 0, 1))
    // revealGroupRef's own position is built from gridGroupRef's actual
    // current one (group.position.x, just written above), not a second
    // independent damp of the same panWorldDistance × panT target — see
    // revealOffsetRef's own comment for why that independence was the
    // bug. Only the reveal-specific extra travel gets its own smoothing;
    // the shared part is copied exactly, so the two groups can never
    // disagree about it.
    if (revealGroupRef.current) {
      revealOffsetRef.current = MathUtils.damp(revealOffsetRef.current, revealWorldDistance * slideT, PAN_LAMBDA, delta)
      revealGroupRef.current.position.x = group.position.x + revealOffsetRef.current
    }

    // Force a synchronous matrix update for the DOM layers. Html elements
    // use the world matrix to project themselves to the screen; left alone,
    // they read the previous frame's matrix (since R3F doesn't update them
    // until render time), causing a 1-frame lag behind WebGL elements
    // (which read position.x directly, like drpClipPlaneRef below) and making
    // the CSS clip-path visibly misaligned during fast scrolls.
    group.updateMatrixWorld(true)
    if (calloutGroupRef.current) calloutGroupRef.current.updateMatrixWorld(true)
    if (revealGroupRef.current) revealGroupRef.current.updateMatrixWorld(true)

    // The clip boundary itself — group.position.x/nextScale here are
    // gridGroupRef's own *actual current* transform (already written
    // above this frame), so this tracks the grid's real position even
    // mid-damp rather than assuming it's already settled at its resting
    // panWorldDistance. Plane.constant is defined as "keep whatever
    // satisfies normal·point + constant >= 0" — normal is (1,0,0), so
    // this keeps x >= boundaryWorldX, i.e. constant = -boundaryWorldX.
    const boundaryWorldX = group.position.x + placeholderLeftX * nextScale
    drpClipPlaneRef.current.constant = -boundaryWorldX
    // Crossfading, not a hard swap at some threshold — the outgoing block
    // is still right-justified and the incoming one is already left-
    // justified, so both are genuinely visible together for the width of
    // the transition, which only reads as one shape morphing into the other
    // because the squares underneath are sliding at the same time.
    if (punchRef.current) punchRef.current.style.opacity = `${(1 - panT) * PUNCH_TEXT_BASE_OPACITY}`
    if (examsPunchRef.current) examsPunchRef.current.style.opacity = `${panT}`
    if (placeholderMeshRef.current) placeholderMeshRef.current.material.opacity = panT
    // The panel's own on-screen scale — same "local width × the group's
    // current scale × screen px per world unit" conversion placeholderWidth
    // itself is measured in, divided by the panel's own design width so a
    // CSS scale() of 1 lands it at exactly PANEL_DESIGN_WIDTH screen px
    // (i.e. matching the placeholder rectangle's own current on-screen
    // width one-for-one). Html doesn't scale its own DOM content with the
    // group any more than the lockup text does (see onScreenCellPx above),
    // so this is the same per-frame handoff, just driven off the
    // placeholder's width instead of a cell.
    if (syllabusPanelRef.current) {
      const pxPerWorldUnit = size.width / gridWidth
      const panelScale = (placeholderWidth * nextScale * pxPerWorldUnit) / PANEL_DESIGN_WIDTH
      syllabusPanelRef.current.style.transform = `scale(${panelScale})`
      // How much of the panel's own width has crossed to the left of
      // boundaryWorldX (the same fixed grid boundary drpClipPlaneRef
      // clips DRP_1/DRP_2 against) — placeholderLeftX/placeholderWidth
      // again, just carried by revealGroupRef's own live position instead
      // of read back from a mesh, since the panel rides that same group
      // and is sized/centred to match DRP_1 exactly.
      const panelWorldWidth = placeholderWidth * nextScale
      const panelWorldLeftEdge = revealGroupRef.current.position.x + placeholderLeftX * nextScale
      const hiddenFraction = panelWorldWidth > 0 ? MathUtils.clamp((boundaryWorldX - panelWorldLeftEdge) / panelWorldWidth, 0, 1) : 0
      // The hard mask — this is the part that actually enforces "never
      // shows past the boundary, full stop," the same guarantee
      // drpClipPlaneRef gives DRP_1/DRP_2, since opacity alone (below)
      // only ever softens *what's already there*, it doesn't stop the
      // panel's own pixels from painting past the line in the meantime.
      // clip-path's inset is defined in this element's own local (pre-
      // transform) pixel space, so hiddenFraction × PANEL_DESIGN_WIDTH —
      // not a screen-pixel amount — is what actually stays aligned with
      // the boundary once the scale() transform above is applied on top.
      syllabusPanelRef.current.style.clipPath = `inset(0 0 0 ${hiddenFraction * PANEL_DESIGN_WIDTH}px)`
      syllabusPanelRef.current.style.opacity = `${panT}`
    }

    if (aiImpactPanelRef.current) {
      const pxPerWorldUnit = size.width / gridWidth
      const panelScale = (placeholderWidth * nextScale * pxPerWorldUnit) / AI_IMPACT_PANEL_DESIGN_WIDTH
      aiImpactPanelRef.current.style.transform = `scale(${panelScale})`
      const panelWorldWidth = placeholderWidth * nextScale
      const panelWorldLeftEdge = revealGroupRef.current.position.x + drp2PanelLeftX * nextScale
      const hiddenFraction = panelWorldWidth > 0 ? MathUtils.clamp((boundaryWorldX - panelWorldLeftEdge) / panelWorldWidth, 0, 1) : 0
      aiImpactPanelRef.current.style.clipPath = `inset(0 0 0 ${hiddenFraction * AI_IMPACT_PANEL_DESIGN_WIDTH}px)`
      aiImpactPanelRef.current.style.opacity = `${panT}`
    }

    // Staggered bottom-to-top exit cascade for Syllabus Overview during slideT:
    // The bottom-most pill (Retail Sales & Operations, index 6) begins moving first,
    // followed by index 5, 4, 3, 2, 1, and finally Entrepreneurial Management (index 0)
    // and the section title exit last.
    if (pillRefs.current) {
      if (rawReveal > 0) {
        for (let i = 0; i < COURSES.length; i++) {
          const pillEl = pillRefs.current[i]
          if (!pillEl) continue
          // Reverse index so bottom item (index 6) starts at startT = 0
          const startT = (6 - i) * 0.08
          const rawT = MathUtils.clamp((slideT - startT) / 0.48, 0, 1)
          const pillExitT = smoothstepEase(rawT)
          const baseOpacity = i === 0 ? 1 : COURSES[i].opacity
          const opacity = baseOpacity * (1 - pillExitT)
          const slideX = -360 * pillExitT
          pillEl.style.transform = pillExitT > 0 ? `translateX(${slideX}px)` : 'none'
          pillEl.style.opacity = `${opacity}`
        }
        if (titleRef.current) {
          const rawTitleT = MathUtils.clamp((slideT - 0.50) / 0.48, 0, 1)
          const titleExitT = smoothstepEase(rawTitleT)
          titleRef.current.style.transform = titleExitT > 0 ? `translateX(${-360 * titleExitT}px)` : 'none'
          titleRef.current.style.opacity = `${1 - titleExitT}`
        }
      } else {
        // Pre-reveal & hover phase:
        // First pill (index 0) receives the guided cursor hover & click tactile feedback after initial resting pause
        const firstPillEl = pillRefs.current[0] || firstPillRef.current
        if (firstPillEl) {
          if (hoverT < 0.35) {
            firstPillEl.style.opacity = '0.9'
            firstPillEl.style.transform = 'none'
          } else if (hoverT < 0.60) {
            const enterT = (hoverT - 0.35) / 0.25
            firstPillEl.style.opacity = `${MathUtils.lerp(0.9, 1, enterT)}`
            firstPillEl.style.transform = 'none'
          } else if (hoverT < 0.82) {
            const clickT = (hoverT - 0.60) / 0.22
            firstPillEl.style.opacity = '1'
            const pressDip = clickT < 0.4 ? clickT / 0.4 : (1 - clickT) / 0.6
            firstPillEl.style.transform = `scale(${MathUtils.lerp(1, 0.992, smoothstepEase(pressDip))})`
          } else {
            firstPillEl.style.opacity = '1'
            firstPillEl.style.transform = 'none'
          }
        }
        // Other pills (indices 1 to 6) stay at their resting opacities and default transform
        for (let i = 1; i < COURSES.length; i++) {
          const pillEl = pillRefs.current[i]
          if (pillEl) {
            pillEl.style.opacity = `${COURSES[i].opacity}`
            pillEl.style.transform = 'none'
          }
        }
        if (titleRef.current) {
          titleRef.current.style.opacity = '1'
          titleRef.current.style.transform = 'none'
        }
      }
    }

    // Syllabus Overview cursor (plays during hoverT)
    if (cursorRef.current) {
      if (hoverT <= 0.35 || hoverT >= 1) {
        cursorRef.current.style.opacity = '0'
        if (cursorRippleRef.current) cursorRippleRef.current.style.opacity = '0'
      } else {
        const TARGET_X = 160
        const TARGET_Y = 26.5
        let posX = TARGET_X
        let posY = TARGET_Y
        let cursorOpacity = 1
        let cursorScale = 1
        let rippleOpacity = 0
        let rippleScale = 0

        if (hoverT < 0.60) {
          // Phase 1: Entrance glide (after resting pause)
          const enterT = (hoverT - 0.35) / 0.25
          const eased = smoothstepEase(enterT)
          posX = TARGET_X + 90 * (1 - eased)
          posY = TARGET_Y + 65 * (1 - eased)
          cursorOpacity = MathUtils.clamp(enterT * 2.5, 0, 1)
          cursorScale = 1
        } else if (hoverT < 0.82) {
          // Phase 2: Click down and release + ripple
          const clickT = (hoverT - 0.60) / 0.22
          posX = TARGET_X
          posY = TARGET_Y
          cursorOpacity = 1
          if (clickT < 0.4) {
            // Dip down
            const downT = smoothstepEase(clickT / 0.4)
            cursorScale = MathUtils.lerp(1, 0.82, downT)
          } else {
            // Spring back
            const upT = smoothstepEase((clickT - 0.4) / 0.6)
            cursorScale = MathUtils.lerp(0.82, 1, upT)
            // Ripple expands
            rippleScale = MathUtils.lerp(0.3, 2.4, upT)
            rippleOpacity = MathUtils.lerp(0.75, 0, upT)
          }
        } else {
          // Phase 3: Exit drift & fadeout
          const exitT = (hoverT - 0.82) / 0.18
          const eased = smoothstepEase(exitT)
          posX = TARGET_X + 20 * eased
          posY = TARGET_Y + 15 * eased
          cursorOpacity = 1 - eased
          cursorScale = 1
        }

        cursorRef.current.style.opacity = `${cursorOpacity}`
        cursorRef.current.style.transform = `translate(${posX}px, ${posY}px) scale(${cursorScale})`
        if (cursorRippleRef.current) {
          cursorRippleRef.current.style.opacity = `${rippleOpacity}`
          cursorRippleRef.current.style.transform = `translate(-50%, -50%) scale(${rippleScale})`
        }
      }
    }

    // AI Impact Analysis cursor, slider tweaking, and LLM Focus typing choreography
    const SLIDER_START_LEFT = 18
    const SLIDER_END_LEFT = 210
    const SLIDER_START_FILL = 26
    const SLIDER_END_FILL = 218

    const TARGET_SLIDER_START_X = 484 + SLIDER_START_LEFT
    const TARGET_SLIDER_END_X = 484 + SLIDER_END_LEFT
    const TARGET_SLIDER_Y = 300
    const TARGET_LLM_X = 434
    const TARGET_LLM_END_X = 502
    const TARGET_LLM_Y = 338

    // 1. Slider fill & thumb state
    if (aiSliderThumbRef.current && aiSliderFillRef.current) {
      if (rawReveal < 0.65) {
        aiSliderThumbRef.current.style.left = `${SLIDER_START_LEFT}px`
        aiSliderFillRef.current.style.width = `${SLIDER_START_FILL}px`
      } else if (rawReveal < 0.77) {
        const dragProgress = (rawReveal - 0.65) / 0.12
        const dragT = smoothstepEase(dragProgress)
        const curLeft = MathUtils.lerp(SLIDER_START_LEFT, SLIDER_END_LEFT, dragT)
        const curFill = MathUtils.lerp(SLIDER_START_FILL, SLIDER_END_FILL, dragT)
        aiSliderThumbRef.current.style.left = `${curLeft}px`
        aiSliderFillRef.current.style.width = `${curFill}px`
      } else {
        aiSliderThumbRef.current.style.left = `${SLIDER_END_LEFT}px`
        aiSliderFillRef.current.style.width = `${SLIDER_END_FILL}px`
      }
    }

    // 2. LLM Focus input text and typing
    if (aiLlmInputRef.current && aiLlmTextRef.current && aiLlmPlaceholderRef.current && aiLlmCaretRef.current) {
      const FULL_LLM_TEXT = 'Gemini 3.7'
      if (rawReveal < 0.83) {
        aiLlmPlaceholderRef.current.style.opacity = '1'
        aiLlmTextRef.current.textContent = ''
        aiLlmCaretRef.current.style.opacity = '0'
        aiLlmInputRef.current.style.borderColor = 'rgba(255, 255, 255, 0.3)'
        aiLlmInputRef.current.style.boxShadow = 'none'
      } else if (rawReveal < 0.87) {
        // Focus click
        aiLlmPlaceholderRef.current.style.opacity = '0'
        aiLlmTextRef.current.textContent = ''
        aiLlmCaretRef.current.style.opacity = '1'
        aiLlmInputRef.current.style.borderColor = 'rgba(204, 0, 1, 0.5)'
        aiLlmInputRef.current.style.boxShadow = '0 0 0 2px rgba(204, 0, 1, 0.15)'
      } else if (rawReveal < 0.95) {
        // Typing character by character
        const typeProgress = (rawReveal - 0.87) / 0.08
        const charCount = Math.min(FULL_LLM_TEXT.length, Math.floor(typeProgress * (FULL_LLM_TEXT.length + 1)))
        aiLlmPlaceholderRef.current.style.opacity = '0'
        aiLlmTextRef.current.textContent = FULL_LLM_TEXT.slice(0, charCount)
        aiLlmCaretRef.current.style.opacity = '1'
        aiLlmInputRef.current.style.borderColor = 'rgba(204, 0, 1, 0.5)'
        aiLlmInputRef.current.style.boxShadow = '0 0 0 2px rgba(204, 0, 1, 0.15)'
      } else {
        // Completed
        aiLlmPlaceholderRef.current.style.opacity = '0'
        aiLlmTextRef.current.textContent = FULL_LLM_TEXT
        aiLlmCaretRef.current.style.opacity = (Math.floor(Date.now() / 500) % 2 === 0) ? '1' : '0'
        aiLlmInputRef.current.style.borderColor = 'rgba(204, 0, 1, 0.35)'
        aiLlmInputRef.current.style.boxShadow = 'none'
      }
    }

    // 3. AI Cursor motion and interaction
    if (aiCursorRef.current) {
      if (rawReveal <= 0.46 || rawReveal >= 1) {
        aiCursorRef.current.style.opacity = '0'
        if (aiCursorRippleRef.current) aiCursorRippleRef.current.style.opacity = '0'
      } else {
        let posX = TARGET_SLIDER_START_X
        let posY = TARGET_SLIDER_Y
        let cursorOpacity = 1
        let cursorScale = 1
        let rippleOpacity = 0
        let rippleScale = 0

        if (rawReveal < 0.58) {
          // Phase 1: Entrance glide towards slider thumb
          const enterT = (rawReveal - 0.46) / 0.12
          const eased = smoothstepEase(enterT)
          posX = TARGET_SLIDER_START_X + 90 * (1 - eased)
          posY = TARGET_SLIDER_Y + 70 * (1 - eased)
          cursorOpacity = MathUtils.clamp(enterT * 2.5, 0, 1)
          cursorScale = 1
        } else if (rawReveal < 0.65) {
          // Phase 1b: Resting & hovering on slider thumb before drag begins
          posX = TARGET_SLIDER_START_X
          posY = TARGET_SLIDER_Y
          cursorOpacity = 1
          cursorScale = 1
        } else if (rawReveal < 0.77) {
          // Phase 2: Click down & drag slider
          const dragProgress = (rawReveal - 0.65) / 0.12
          const dragT = smoothstepEase(dragProgress)
          posX = MathUtils.lerp(TARGET_SLIDER_START_X, TARGET_SLIDER_END_X, dragT)
          posY = TARGET_SLIDER_Y
          cursorOpacity = 1
          if (dragProgress < 0.15) {
            cursorScale = MathUtils.lerp(1, 0.82, dragProgress / 0.15)
            rippleOpacity = MathUtils.lerp(0.7, 0, dragProgress / 0.15)
            rippleScale = MathUtils.lerp(0.3, 2.0, dragProgress / 0.15)
          } else {
            cursorScale = 0.85
          }
        } else if (rawReveal < 0.83) {
          // Phase 3: Move from slider thumb to LLM Focus box
          const moveT = smoothstepEase((rawReveal - 0.77) / 0.06)
          posX = MathUtils.lerp(TARGET_SLIDER_END_X, TARGET_LLM_X, moveT)
          posY = MathUtils.lerp(TARGET_SLIDER_Y, TARGET_LLM_Y, moveT)
          cursorOpacity = 1
          cursorScale = MathUtils.lerp(0.85, 1, moveT)
        } else if (rawReveal < 0.87) {
          // Phase 4: Click into LLM Focus box
          const clickT = (rawReveal - 0.83) / 0.04
          posX = TARGET_LLM_X
          posY = TARGET_LLM_Y
          cursorOpacity = 1
          if (clickT < 0.5) {
            const downT = smoothstepEase(clickT / 0.5)
            cursorScale = MathUtils.lerp(1, 0.82, downT)
          } else {
            const upT = smoothstepEase((clickT - 0.5) / 0.5)
            cursorScale = MathUtils.lerp(0.82, 1, upT)
            rippleScale = MathUtils.lerp(0.3, 2.2, upT)
            rippleOpacity = MathUtils.lerp(0.7, 0, upT)
          }
        } else if (rawReveal < 0.95) {
          // Phase 5: Typing "Gemini 3.7", cursor rests beside text
          const typeProgress = (rawReveal - 0.87) / 0.08
          posX = MathUtils.lerp(TARGET_LLM_X, TARGET_LLM_END_X, typeProgress)
          posY = TARGET_LLM_Y
          cursorOpacity = 1
          cursorScale = 1
        } else {
          // Phase 6: Exit drift & fadeout
          const exitT = smoothstepEase((rawReveal - 0.95) / 0.05)
          posX = TARGET_LLM_END_X + 25 * exitT
          posY = TARGET_LLM_Y + 15 * exitT
          cursorOpacity = 1 - exitT
          cursorScale = 1
        }

        aiCursorRef.current.style.opacity = `${cursorOpacity}`
        aiCursorRef.current.style.transform = `translate(${posX}px, ${posY}px) scale(${cursorScale})`
        if (aiCursorRippleRef.current) {
          aiCursorRippleRef.current.style.opacity = `${rippleOpacity}`
          aiCursorRippleRef.current.style.transform = `translate(-50%, -50%) scale(${rippleScale})`
        }
      }
    }

    // Slide transition from AI Impact Analysis to Macro Planner (Study Planner) -> Interactive Drag-and-Drop -> Syllabus Production
    const plannerT = plannerProgressRef?.current ?? 0
    if (aiImpactCardRef.current && macroPlannerViewRef.current && syllabusProductionViewRef.current) {
      if (plannerT <= 0) {
        aiImpactCardRef.current.style.transform = 'translateX(0px)'
        aiImpactCardRef.current.style.opacity = '1'
        macroPlannerViewRef.current.style.transform = 'translateX(1150px)'
        macroPlannerViewRef.current.style.opacity = '0'
        syllabusProductionViewRef.current.style.transform = 'translateX(1150px)'
        syllabusProductionViewRef.current.style.opacity = '0'
        if (navAiAnalysisRef.current) {
          navAiAnalysisRef.current.style.color = '#645A57'
          navAiAnalysisRef.current.style.fontWeight = '700'
        }
        if (navPlanningRef.current) {
          navPlanningRef.current.style.color = 'rgba(150, 142, 139, 0.6)'
          navPlanningRef.current.style.fontWeight = '500'
        }
        if (navProductionRef.current) {
          navProductionRef.current.style.color = 'rgba(150, 142, 139, 0.6)'
          navProductionRef.current.style.fontWeight = '500'
        }
        if (plannerCursorRef.current) plannerCursorRef.current.style.opacity = '0'
        if (plannerRippleRef.current) plannerRippleRef.current.style.opacity = '0'
        if (draggedCardRef.current) draggedCardRef.current.style.display = 'none'
        if (dropPlaceholderRef.current) dropPlaceholderRef.current.style.display = 'none'
        if (droppedCardRef.current) droppedCardRef.current.style.display = 'none'
        if (sidebarPreparingCardRef.current) {
          sidebarPreparingCardRef.current.style.opacity = '1'
          sidebarPreparingCardRef.current.style.background = 'rgba(255, 255, 255, 0.3)'
          sidebarPreparingCardRef.current.style.borderColor = 'rgba(255, 255, 255, 0.3)'
        }
        if (sidebarGripRef.current) sidebarGripRef.current.style.opacity = '0.25'
        if (criteriaCountRef.current) {
          criteriaCountRef.current.textContent = '2'
          criteriaCountRef.current.style.color = '#645A57'
        }
        if (p12CountRef.current) {
          p12CountRef.current.textContent = '3/5'
          p12CountRef.current.style.color = '#645A57'
          p12CountRef.current.style.fontWeight = '500'
        }
        if (p11FinancialCardRef.current) {
          p11FinancialCardRef.current.style.background = 'rgba(204, 0, 1, 0.05)'
          p11FinancialCardRef.current.style.borderColor = '#CC0001'
        }
        if (p11FinancialTitleRef.current) {
          p11FinancialTitleRef.current.style.color = '#CC0001'
        }
        if (p11FinancialImpactRef.current) {
          p11FinancialImpactRef.current.style.color = '#CC0001'
          p11FinancialImpactRef.current.style.opacity = '0.8'
        }
      } else if (plannerT <= 0.20) {
        // --- TRANSITION 1: AI Impact -> Study Planner (plannerT: 0 -> 0.20) ---
        const slideProgress = MathUtils.clamp(plannerT / 0.20, 0, 1)
        const slideEased = smoothstepEase(slideProgress)
        const SLIDE_PX = 1150
        const slideX = -slideEased * SLIDE_PX
        aiImpactCardRef.current.style.transform = `translateX(${slideX}px)`

        // AI Impact Card fades out when 70% hidden
        const cardWidth = AI_IMPACT_PANEL_DESIGN_WIDTH
        const hiddenFraction = -slideX / cardWidth
        let cardOpacity = 1
        if (hiddenFraction >= 0.7) {
          cardOpacity = MathUtils.clamp(1 - (hiddenFraction - 0.7) / 0.3, 0, 1)
        }
        aiImpactCardRef.current.style.opacity = `${cardOpacity}`

        // Study Planner enters from the right
        const entryX = (1 - slideEased) * SLIDE_PX
        macroPlannerViewRef.current.style.transform = `translateX(${entryX}px)`
        macroPlannerViewRef.current.style.opacity = `${MathUtils.clamp(plannerT / 0.16, 0, 1)}`

        // Syllabus Production stays parked offscreen right
        syllabusProductionViewRef.current.style.transform = 'translateX(1150px)'
        syllabusProductionViewRef.current.style.opacity = '0'

        // Navbar active indicator: AI Analysis -> Planning
        if (navAiAnalysisRef.current && navPlanningRef.current && navProductionRef.current) {
          if (plannerT > 0.16) {
            navAiAnalysisRef.current.style.color = 'rgba(150, 142, 139, 0.6)'
            navAiAnalysisRef.current.style.fontWeight = '500'
            navPlanningRef.current.style.color = '#645A57'
            navPlanningRef.current.style.fontWeight = '700'
            navProductionRef.current.style.color = 'rgba(150, 142, 139, 0.6)'
            navProductionRef.current.style.fontWeight = '500'
          } else {
            navAiAnalysisRef.current.style.color = '#645A57'
            navAiAnalysisRef.current.style.fontWeight = '700'
            navPlanningRef.current.style.color = 'rgba(150, 142, 139, 0.6)'
            navPlanningRef.current.style.fontWeight = '500'
            navProductionRef.current.style.color = 'rgba(150, 142, 139, 0.6)'
            navProductionRef.current.style.fontWeight = '500'
          }
        }

        if (plannerCursorRef.current) plannerCursorRef.current.style.opacity = '0'
        if (plannerRippleRef.current) plannerRippleRef.current.style.opacity = '0'
        if (draggedCardRef.current) draggedCardRef.current.style.display = 'none'
        if (dropPlaceholderRef.current) dropPlaceholderRef.current.style.display = 'none'
        if (droppedCardRef.current) droppedCardRef.current.style.display = 'none'
        if (sidebarPreparingCardRef.current) {
          sidebarPreparingCardRef.current.style.display = 'flex'
          sidebarPreparingCardRef.current.style.opacity = '0.5'
          sidebarPreparingCardRef.current.style.background = 'rgba(255, 255, 255, 0.3)'
          sidebarPreparingCardRef.current.style.borderColor = 'rgba(255, 255, 255, 0.3)'
        }
        if (sidebarGripRef.current) {
          sidebarGripRef.current.style.width = '0px'
          sidebarGripRef.current.style.marginRight = '0px'
          sidebarGripRef.current.style.opacity = '0'
        }
        if (criteriaCountRef.current) criteriaCountRef.current.textContent = '2'
        if (p12CountRef.current) {
          p12CountRef.current.textContent = '3/5'
          p12CountRef.current.style.color = '#645A57'
          p12CountRef.current.style.fontWeight = '500'
        }
        if (p11FinancialCardRef.current) {
          p11FinancialCardRef.current.style.background = 'rgba(204, 0, 1, 0.05)'
          p11FinancialCardRef.current.style.borderColor = '#CC0001'
        }
        if (p11FinancialTitleRef.current) {
          p11FinancialTitleRef.current.style.color = '#CC0001'
        }
        if (p11FinancialImpactRef.current) {
          p11FinancialImpactRef.current.style.color = '#CC0001'
          p11FinancialImpactRef.current.style.opacity = '0.8'
        }
      } else if (plannerT <= 0.65) {
        // --- STUDY PLANNER ACTIVE & DRAG-AND-DROP (plannerT: 0.20 -> 0.65) ---
        aiImpactCardRef.current.style.transform = 'translateX(-1150px)'
        aiImpactCardRef.current.style.opacity = '0'
        macroPlannerViewRef.current.style.transform = 'translateX(0px)'
        macroPlannerViewRef.current.style.opacity = '1'
        syllabusProductionViewRef.current.style.transform = 'translateX(1150px)'
        syllabusProductionViewRef.current.style.opacity = '0'

        if (navAiAnalysisRef.current && navPlanningRef.current && navProductionRef.current) {
          navAiAnalysisRef.current.style.color = 'rgba(150, 142, 139, 0.6)'
          navAiAnalysisRef.current.style.fontWeight = '500'
          navPlanningRef.current.style.color = '#645A57'
          navPlanningRef.current.style.fontWeight = '700'
          navProductionRef.current.style.color = 'rgba(150, 142, 139, 0.6)'
          navProductionRef.current.style.fontWeight = '500'
        }

        const GRIP_X = 40
        const GRIP_Y = 145
        const DROP_X = 498
        const DROP_Y = 314

        if (plannerCursorRef.current) {
          if (plannerT < 0.28) {
            // Cursor enters and approaches Preparing for Entrepreneurship card
            const enterProgress = (plannerT - 0.20) / 0.08
            const enterT = smoothstepEase(enterProgress)
            const posX = MathUtils.lerp(180, GRIP_X, enterT)
            const posY = MathUtils.lerp(240, GRIP_Y, enterT)
            const cursorOpacity = MathUtils.clamp(enterProgress * 2.5, 0, 1)

            plannerCursorRef.current.style.opacity = `${cursorOpacity}`
            plannerCursorRef.current.style.transform = `translate(${posX}px, ${posY}px) scale(1)`
            if (plannerRippleRef.current) plannerRippleRef.current.style.opacity = '0'
            if (draggedCardRef.current) draggedCardRef.current.style.display = 'none'
            if (dropPlaceholderRef.current) dropPlaceholderRef.current.style.display = 'none'
            if (droppedCardRef.current) droppedCardRef.current.style.display = 'none'

            if (sidebarPreparingCardRef.current) {
              sidebarPreparingCardRef.current.style.display = 'flex'
              sidebarPreparingCardRef.current.style.opacity = '0.5'
              sidebarPreparingCardRef.current.style.background = 'rgba(255, 255, 255, 0.3)'
              sidebarPreparingCardRef.current.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            }
            if (sidebarGripRef.current) {
              const hoverStrength = MathUtils.clamp((enterProgress - 0.2) / 0.8, 0, 1)
              const hoverT = smoothstepEase(hoverStrength)
              sidebarGripRef.current.style.width = `${hoverT * 8}px`
              sidebarGripRef.current.style.marginRight = `${hoverT * 10}px`
              sidebarGripRef.current.style.opacity = `${hoverT}`
            }
            if (criteriaCountRef.current) criteriaCountRef.current.textContent = '2'
            if (p12CountRef.current) {
              p12CountRef.current.textContent = '3/5'
              p12CountRef.current.style.color = '#645A57'
              p12CountRef.current.style.fontWeight = '500'
            }
            if (p11FinancialCardRef.current) {
              p11FinancialCardRef.current.style.background = 'rgba(204, 0, 1, 0.05)'
              p11FinancialCardRef.current.style.borderColor = '#CC0001'
            }
            if (p11FinancialTitleRef.current) p11FinancialTitleRef.current.style.color = '#CC0001'
            if (p11FinancialImpactRef.current) {
              p11FinancialImpactRef.current.style.color = '#CC0001'
              p11FinancialImpactRef.current.style.opacity = '0.8'
            }
          } else if (plannerT < 0.34) {
            // Click / Grab
            const clickProgress = (plannerT - 0.28) / 0.06
            let cursorScale = 1
            let rippleOpacity = 0
            let rippleScale = 0

            if (clickProgress < 0.5) {
              const downT = smoothstepEase(clickProgress / 0.5)
              cursorScale = MathUtils.lerp(1, 0.82, downT)
              rippleOpacity = MathUtils.lerp(0, 0.75, downT)
              rippleScale = MathUtils.lerp(0.3, 1.3, downT)
            } else {
              cursorScale = 0.85
              const upT = (clickProgress - 0.5) / 0.5
              rippleOpacity = MathUtils.lerp(0.75, 0, upT)
              rippleScale = MathUtils.lerp(1.3, 2.2, upT)
            }

            plannerCursorRef.current.style.opacity = '1'
            plannerCursorRef.current.style.transform = `translate(${GRIP_X}px, ${GRIP_Y}px) scale(${cursorScale})`
            if (plannerRippleRef.current) {
              plannerRippleRef.current.style.opacity = `${rippleOpacity}`
              plannerRippleRef.current.style.transform = `translate(-50%, -50%) scale(${rippleScale})`
            }

            if (draggedCardRef.current) draggedCardRef.current.style.display = 'none'
            if (sidebarPreparingCardRef.current) {
              sidebarPreparingCardRef.current.style.display = 'flex'
              sidebarPreparingCardRef.current.style.opacity = `${MathUtils.lerp(0.5, 1, clickProgress)}`
              sidebarPreparingCardRef.current.style.background = 'rgba(255, 255, 255, 0.3)'
              sidebarPreparingCardRef.current.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            }
            if (sidebarGripRef.current) {
              sidebarGripRef.current.style.width = '8px'
              sidebarGripRef.current.style.marginRight = '10px'
              sidebarGripRef.current.style.opacity = '1'
            }
            if (dropPlaceholderRef.current) dropPlaceholderRef.current.style.display = 'none'
            if (droppedCardRef.current) droppedCardRef.current.style.display = 'none'
            if (criteriaCountRef.current) criteriaCountRef.current.textContent = '2'
            if (p12CountRef.current) {
              p12CountRef.current.textContent = '3/5'
              p12CountRef.current.style.color = '#645A57'
              p12CountRef.current.style.fontWeight = '500'
            }
            if (p11FinancialCardRef.current) {
              p11FinancialCardRef.current.style.background = 'rgba(204, 0, 1, 0.05)'
              p11FinancialCardRef.current.style.borderColor = '#CC0001'
            }
            if (p11FinancialTitleRef.current) p11FinancialTitleRef.current.style.color = '#CC0001'
            if (p11FinancialImpactRef.current) {
              p11FinancialImpactRef.current.style.color = '#CC0001'
              p11FinancialImpactRef.current.style.opacity = '0.8'
            }
          } else if (plannerT < 0.50) {
            // Drag Arc
            const dragProgress = (plannerT - 0.34) / 0.16
            const dragT = smoothstepEase(dragProgress)
            const arcY = -Math.sin(dragT * Math.PI) * 40
            const posX = MathUtils.lerp(GRIP_X, DROP_X, dragT)
            const posY = MathUtils.lerp(GRIP_Y, DROP_Y, dragT) + arcY

            plannerCursorRef.current.style.opacity = '1'
            plannerCursorRef.current.style.transform = `translate(${posX}px, ${posY}px) scale(0.85)`
            if (plannerRippleRef.current) plannerRippleRef.current.style.opacity = '0'

            if (draggedCardRef.current) {
              draggedCardRef.current.style.display = 'flex'
              const cardX = posX - 14
              const cardY = posY - 29
              draggedCardRef.current.style.transform = `translate(${cardX}px, ${cardY}px)`
              draggedCardRef.current.style.opacity = '1'
            }

            if (sidebarPreparingCardRef.current) {
              sidebarPreparingCardRef.current.style.display = 'flex'
              sidebarPreparingCardRef.current.style.opacity = '0.35'
              sidebarPreparingCardRef.current.style.background = 'rgba(255, 255, 255, 0.3)'
              sidebarPreparingCardRef.current.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            }
            if (sidebarGripRef.current) {
              sidebarGripRef.current.style.width = '8px'
              sidebarGripRef.current.style.marginRight = '10px'
              sidebarGripRef.current.style.opacity = '0.4'
            }

            if (dropPlaceholderRef.current) {
              if (dragProgress >= 0.3) {
                dropPlaceholderRef.current.style.display = 'block'
                dropPlaceholderRef.current.style.opacity = `${MathUtils.clamp((dragProgress - 0.3) / 0.25, 0, 1)}`
              } else {
                dropPlaceholderRef.current.style.display = 'none'
              }
            }

            if (droppedCardRef.current) droppedCardRef.current.style.display = 'none'
            if (criteriaCountRef.current) criteriaCountRef.current.textContent = '2'
            if (p12CountRef.current) {
              p12CountRef.current.textContent = '3/5'
              p12CountRef.current.style.color = '#645A57'
              p12CountRef.current.style.fontWeight = '500'
            }
            if (p11FinancialCardRef.current) {
              p11FinancialCardRef.current.style.background = 'rgba(204, 0, 1, 0.05)'
              p11FinancialCardRef.current.style.borderColor = '#CC0001'
            }
            if (p11FinancialTitleRef.current) p11FinancialTitleRef.current.style.color = '#CC0001'
            if (p11FinancialImpactRef.current) {
              p11FinancialImpactRef.current.style.color = '#CC0001'
              p11FinancialImpactRef.current.style.opacity = '0.8'
            }
          } else if (plannerT < 0.58) {
            // Drop Snap into P1.2
            const dropProgress = (plannerT - 0.50) / 0.08
            const dropT = smoothstepEase(dropProgress)
            const cursorScale = MathUtils.lerp(0.85, 1, dropT)
            const rippleOpacity = MathUtils.lerp(0.75, 0, dropT)
            const rippleScale = MathUtils.lerp(0.4, 2.5, dropT)

            plannerCursorRef.current.style.opacity = '1'
            plannerCursorRef.current.style.transform = `translate(${DROP_X}px, ${DROP_Y}px) scale(${cursorScale})`
            if (plannerRippleRef.current) {
              plannerRippleRef.current.style.opacity = `${rippleOpacity}`
              plannerRippleRef.current.style.transform = `translate(-50%, -50%) scale(${rippleScale})`
            }

            if (draggedCardRef.current) draggedCardRef.current.style.display = 'none'
            if (dropPlaceholderRef.current) dropPlaceholderRef.current.style.display = 'none'
            if (droppedCardRef.current) {
              droppedCardRef.current.style.display = 'flex'
              droppedCardRef.current.style.opacity = '1'
            }

            if (sidebarPreparingCardRef.current) {
              const sidebarOpacity = MathUtils.lerp(0.35, 0, dropT)
              sidebarPreparingCardRef.current.style.opacity = `${sidebarOpacity}`
              if (sidebarOpacity <= 0.01) {
                sidebarPreparingCardRef.current.style.display = 'none'
              } else {
                sidebarPreparingCardRef.current.style.display = 'flex'
              }
            }
            if (sidebarGripRef.current) sidebarGripRef.current.style.opacity = '0'

            const isDropped = dropProgress >= 0.25
            if (criteriaCountRef.current) criteriaCountRef.current.textContent = isDropped ? '1' : '2'
            if (p12CountRef.current) {
              p12CountRef.current.textContent = isDropped ? '4/5' : '3/5'
              p12CountRef.current.style.color = '#645A57'
              p12CountRef.current.style.fontWeight = '500'
            }

            if (p11FinancialCardRef.current) {
              p11FinancialCardRef.current.style.background = isDropped ? 'rgba(255, 255, 255, 0.3)' : 'rgba(204, 0, 1, 0.05)'
              p11FinancialCardRef.current.style.borderColor = isDropped ? 'rgba(255, 255, 255, 0.3)' : '#CC0001'
            }
            if (p11FinancialTitleRef.current) {
              p11FinancialTitleRef.current.style.color = isDropped ? '#645A57' : '#CC0001'
            }
            if (p11FinancialImpactRef.current) {
              p11FinancialImpactRef.current.style.color = isDropped ? '#645A57' : '#CC0001'
              p11FinancialImpactRef.current.style.opacity = isDropped ? '0.6' : '0.8'
            }
          } else {
            // Cursor exits & Completed Study Planner rests
            const exitProgress = MathUtils.clamp((plannerT - 0.58) / 0.07, 0, 1)
            const exitT = smoothstepEase(exitProgress)
            const posX = DROP_X + 45 * exitT
            const posY = DROP_Y + 25 * exitT
            const cursorOpacity = 1 - exitT

            plannerCursorRef.current.style.opacity = `${cursorOpacity}`
            plannerCursorRef.current.style.transform = `translate(${posX}px, ${posY}px) scale(1)`
            if (plannerRippleRef.current) plannerRippleRef.current.style.opacity = '0'

            if (draggedCardRef.current) draggedCardRef.current.style.display = 'none'
            if (dropPlaceholderRef.current) dropPlaceholderRef.current.style.display = 'none'
            if (droppedCardRef.current) {
              droppedCardRef.current.style.display = 'flex'
              droppedCardRef.current.style.opacity = '1'
            }

            if (sidebarPreparingCardRef.current) {
              sidebarPreparingCardRef.current.style.display = 'none'
              sidebarPreparingCardRef.current.style.opacity = '0'
            }
            if (sidebarGripRef.current) sidebarGripRef.current.style.opacity = '0'

            if (criteriaCountRef.current) criteriaCountRef.current.textContent = '1'
            if (p12CountRef.current) {
              p12CountRef.current.textContent = '4/5'
              p12CountRef.current.style.color = '#645A57'
              p12CountRef.current.style.fontWeight = '500'
            }

            if (p11FinancialCardRef.current) {
              p11FinancialCardRef.current.style.background = 'rgba(255, 255, 255, 0.3)'
              p11FinancialCardRef.current.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            }
            if (p11FinancialTitleRef.current) {
              p11FinancialTitleRef.current.style.color = '#645A57'
            }
            if (p11FinancialImpactRef.current) {
              p11FinancialImpactRef.current.style.color = '#645A57'
              p11FinancialImpactRef.current.style.opacity = '0.6'
            }
          }
        }
      } else if (plannerT <= 0.88) {
        // --- TRANSITION 2: Study Planner -> Syllabus Production (plannerT: 0.65 -> 0.88) ---
        aiImpactCardRef.current.style.transform = 'translateX(-1150px)'
        aiImpactCardRef.current.style.opacity = '0'
        if (plannerCursorRef.current) plannerCursorRef.current.style.opacity = '0'
        if (plannerRippleRef.current) plannerRippleRef.current.style.opacity = '0'

        const slide2Progress = MathUtils.clamp((plannerT - 0.65) / 0.23, 0, 1)
        const slide2Eased = smoothstepEase(slide2Progress)
        const SLIDE_PX = 1150
        const slide2X = -slide2Eased * SLIDE_PX
        macroPlannerViewRef.current.style.transform = `translateX(${slide2X}px)`

        // Study Planner fades out when 70% hidden
        const cardWidth = AI_IMPACT_PANEL_DESIGN_WIDTH
        const hiddenFraction2 = -slide2X / cardWidth
        let plannerOpacity = 1
        if (hiddenFraction2 >= 0.7) {
          plannerOpacity = MathUtils.clamp(1 - (hiddenFraction2 - 0.7) / 0.3, 0, 1)
        }
        macroPlannerViewRef.current.style.opacity = `${plannerOpacity}`

        // Syllabus Production slides in from the right
        const entry2X = (1 - slide2Eased) * SLIDE_PX
        syllabusProductionViewRef.current.style.transform = `translateX(${entry2X}px)`
        syllabusProductionViewRef.current.style.opacity = `${MathUtils.clamp((plannerT - 0.65) / 0.16, 0, 1)}`

        // Navbar active indicator: Planning -> Production
        if (navAiAnalysisRef.current && navPlanningRef.current && navProductionRef.current) {
          navAiAnalysisRef.current.style.color = 'rgba(150, 142, 139, 0.6)'
          navAiAnalysisRef.current.style.fontWeight = '500'
          if (plannerT > 0.75) {
            navPlanningRef.current.style.color = 'rgba(150, 142, 139, 0.6)'
            navPlanningRef.current.style.fontWeight = '500'
            navProductionRef.current.style.color = '#645A57'
            navProductionRef.current.style.fontWeight = '700'
          } else {
            navPlanningRef.current.style.color = '#645A57'
            navPlanningRef.current.style.fontWeight = '700'
            navProductionRef.current.style.color = 'rgba(150, 142, 139, 0.6)'
            navProductionRef.current.style.fontWeight = '500'
          }
        }
      } else {
        // --- RESTING IN SYLLABUS PRODUCTION (plannerT: 0.88 -> 1.00) ---
        aiImpactCardRef.current.style.transform = 'translateX(-1150px)'
        aiImpactCardRef.current.style.opacity = '0'
        macroPlannerViewRef.current.style.transform = 'translateX(-1150px)'
        macroPlannerViewRef.current.style.opacity = '0'
        syllabusProductionViewRef.current.style.transform = 'translateX(0px)'
        syllabusProductionViewRef.current.style.opacity = '1'

        if (plannerCursorRef.current) plannerCursorRef.current.style.opacity = '0'
        if (plannerRippleRef.current) plannerRippleRef.current.style.opacity = '0'

        if (navAiAnalysisRef.current && navPlanningRef.current && navProductionRef.current) {
          navAiAnalysisRef.current.style.color = 'rgba(150, 142, 139, 0.6)'
          navAiAnalysisRef.current.style.fontWeight = '500'
          navPlanningRef.current.style.color = 'rgba(150, 142, 139, 0.6)'
          navPlanningRef.current.style.fontWeight = '500'
          navProductionRef.current.style.color = '#645A57'
          navProductionRef.current.style.fontWeight = '700'
        }
      }
    }

    // The hover phase's own guided message — fades in swiftly upon DRP arrival
    if (hoverCalloutRef.current) hoverCalloutRef.current.style.opacity = `${MathUtils.clamp(hoverT * 3, 0, 1)}`

    // ...and each callout crossing into the next, over the segment whose
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
    // the final one (nothing transitions *out of* it) — multiplied by
    // calloutPanFade so whichever one is still showing once the chat is
    // over (always the last) dissolves smoothly along with the rest of
    // that page, rather than sitting frozen on screen while the squares
    // slide out from under it. Reported directly: it "should disappear
    // smoothly with the rest of the previous page" — a first pass just
    // left it in its own group, on screen, unfaded, once that stopped
    // sliding with the squares.
    const calloutPanFade = 1 - MathUtils.clamp(panProgressRef.current / PAN_FADE_END, 0, 1)
    CALLOUTS.forEach((callout, i) => {
      const enter = i === 0 ? 1 : swapTs[i - 1]
      const exit = i === CALLOUTS.length - 1 ? 0 : swapTs[i]
      const rawOpacity = (enter - exit) * calloutPanFade
      const opacity = Number.isFinite(rawOpacity) ? MathUtils.clamp(rawOpacity, 0, 1) : 0
      if (calloutRefs[i]) calloutRefs[i].style.opacity = `${opacity}`
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
    // own once she's pulled aside, and DRP Showcase's own taupe once the pan
    // past the chat has taken over. The blob's own colours are driven from
    // the same three refs inside GradientBlob (see drpRef above), so none of
    // the three ever disagrees with the background about which mood (if any)
    // is currently active.
    // The two lit squares' own colour, following the same mood as the
    if (backgroundRef.current) {
      backgroundRef.current.lerpColors(BACKDROP_LIT, BACKDROP_DIM, dimRef.current)
      backgroundRef.current.lerp(BACKDROP_ANGRY, angryRef.current)
      backgroundRef.current.lerp(BACKDROP_DRP, panT)
      backgroundRef.current.lerp(BACKDROP_DRP_BRIGHT, slideT)
      // Read back the same Color instance just written above — the exact
      // live background colour, not a second copy of the dim/angry mix
      // logic that could drift from it.
      if (punchRef.current) punchRef.current.style.color = backgroundRef.current.getStyle()
      if (examsPunchRef.current) examsPunchRef.current.style.color = backgroundRef.current.getStyle()
    }

    // The two lit squares' own colour, following the same mood as the
    // backdrop and blob rather than staying blue through any of the three.
    for (const mesh of litSquareRefs) {
      if (!mesh) continue
      const material = mesh.material
      material.uColor.lerpColors(SQUARE_LIT, SQUARE_DIM, dimRef.current)
      material.uColor.lerp(SQUARE_ANGRY, angryRef.current)
      material.uColor.lerp(SQUARE_DRP, panT)
      material.uColor.lerp(SQUARE_DRP_BRIGHT, slideT)
      material.uOpacity = MathUtils.lerp(LIT_SQUARE_OPACITY, DRP_SQUARE_OPACITY, panT)
    }

    // The blob's own third mood and DRP_2 reveal brightening
    drpRef.current = panT
    revealSlideRef.current = slideT
    // The grid lines' own boost — see lineOpacityBoostRef's own comment.
    const drpLineBoost = MathUtils.lerp(DRP_LINE_OPACITY_BOOST, DRP2_LINE_OPACITY_BOOST, slideT)
    lineOpacityBoostRef.current = MathUtils.lerp(1, drpLineBoost, panT)
  }

  return (
    <>
      <Updater updateFn={updateFn} />
      <color ref={backgroundRef} attach="background" args={[SCENE_BACKDROP]} />
      <GradientBlob
        position={[0, blobY, PLANE_Z]}
        scale={[blobWidth * BLOB_WIDTH_OVERSCALE, blobMeshHeight, 1]}
        dimRef={dimRef}
        angryRef={angryRef}
        drpRef={drpRef}
        revealRef={revealSlideRef}
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
          lineOpacityBoostRef={lineOpacityBoostRef}
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
          lineOpacityBoostRef={lineOpacityBoostRef}
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
            (cellSize), same as GRID_GLOWS's own cellWorldSize scale. Plain
            children of gridGroupRef, not a nested group of their own — they
            can never separate from the grid they sit on, reported directly
            after an earlier pass gave them an independently-offset inner
            group; panWorldDistance below moves this *whole* group instead,
            grid and callouts included, so the squares stay exactly the
            cells they've always been.

            renderOrder={2} (higher than DRP_1/DRP_2's own 1, see
            placeholderMeshRef/drp2MeshRef) forces these to always paint on
            top of them regardless of which is nearer the camera on a given
            frame — reported directly, "the DRP_1 picture is sliding on top
            of the grid [and hiding it]." Both this mesh and DRP_1/DRP_2's
            own are transparent, and three.js draws transparent objects
            back-to-front by camera distance rather than scene-graph
            position — reliable enough while everything lived in one
            gridGroupRef, but revealGroupRef now moves DRP_1/DRP_2
            independently of these squares, so their relative camera
            distance can cross over mid-slide and flip which one the
            automatic sort draws last (i.e. on top). An explicit
            renderOrder sidesteps that sort entirely rather than hoping the
            distances never cross. */}
        {litSquareCenters.map((center, i) => (
          <mesh
            key={i}
            ref={(el) => {
              litSquareRefs[i] = el
            }}
            position={[center.x, center.y, GRID_Z + 0.01]}
            scale={[cellSize, cellSize, 1]}
            renderOrder={2}
            raycast={() => null}
          >
            <planeGeometry args={[1, 1]} />
            {/* Normal blending, not additive — additive only ever *adds*
                colour on top of whatever's behind it, which reads as a
                faint wash at LIT_SQUARE_OPACITY's own ~5% regardless of the
                mood (fine for a subtle blue accent on a dark backdrop), but
                genuinely breaks DRP Showcase's own near-opaque taupe: added
                on top of an already-lighter background, it only ever
                pushes brighter, never actually shows the taupe itself.
                Normal blending is a real cross-fade between the two
                colours instead, so raising uOpacity toward DRP_SQUARE_
                OPACITY actually shows SQUARE_DRP, not a washed-out blend. */}
            <gridGlowMaterial transparent depthWrite={false} toneMapped={false} />
          </mesh>
        ))}

        {/* The logo mark and "Simulations", stacked inside the lit
            squares' own row — on top of them, not above — and punched
            through them: same colour as the scene's live background (see
            punchRef above), so wherever this sits over a lit square it
            reads as a hole cut clean through it rather than text drawn on
            top. No transform prop on this Html: like every other label in
            this canvas, it stays a fixed screen size rather than scaling
            with the grid's own zoom — close enough to "fits the squares"
            at rest without needing to track the zoom continuously.

            Fades out (see punchRef's own opacity write in the frame loop)
            as the whole group slides left, crossfading into the block
            below rather than the two ever being swapped outright.

            The transform anchors this block's own right edge, at its own
            vertical centre, to litSquareRightX/litSquareRowY — the
            top-right corner of the two squares' combined footprint — then
            pulls it TEXT_RIGHT_MARGIN_PX further left, off that corner, so
            there's a real gap kept between the text and the right-most
            square's own right edge rather than the two sitting flush (see
            that constant's own comment). whitespace-nowrap on each line
            (no fixed width — an explicit width only matters for a
            shrink-to-fit *wrapping* box, and neither line here wraps,
            sized instead to already fit — see SIM_AVG_CHAR_EM/
            LOGO_AVG_CHAR_EM above) so each right-aligns off its own
            natural content width. No default font-size here — useFrame
            sets a real size on the very first visible frame, well before
            paint is likely to matter. */}
        <Html
          position={[litSquareRightX, litSquareRowY, GRID_Z + 0.02]}
          style={{ transform: `translate(calc(-100% - ${TEXT_RIGHT_MARGIN_PX}px), -50%)`, pointerEvents: 'none' }}
        >
          <div ref={punchRef} className="flex flex-col items-end" style={{ opacity: PUNCH_TEXT_BASE_OPACITY }}>
            <span ref={logoTextRef} className="font-medium tracking-[0.2em] whitespace-nowrap">
              <XxentaWordmark />
            </span>
            <p ref={simTextRef} className="leading-none font-semibold whitespace-nowrap">
              {SIM_TEXT}
            </p>
          </div>
        </Html>

        {/* "Exams & Syllabi" — the same two squares' own incoming label,
            left-justified this time: no translateX in the transform below
            is what left-anchors it, the same convention the callouts
            already use, with EXAMS_TEXT_LEFT_MARGIN_PX nudging it off the
            squares' own left edge (edgeXB) the way TEXT_RIGHT_MARGIN_PX
            nudges the outgoing block off the right — kept even once the
            squares themselves sit flush against the true screen edge, so
            the text itself never quite touches it. Starts at opacity 0
            (see examsPunchRef's own write in the frame loop) — it isn't
            there until the crossfade brings it in. */}
        <Html
          position={[edgeXB, litSquareRowY, GRID_Z + 0.02]}
          style={{ transform: `translate(${EXAMS_TEXT_LEFT_MARGIN_PX}px, -50%)`, pointerEvents: 'none' }}
        >
          <div ref={examsPunchRef} className="flex flex-col items-start" style={{ opacity: 0 }}>
            {/* Nudged right by EXAMS_LOGO_NUDGE_EM (see the frame loop,
                where the actual per-frame value is written, as a fraction
                of this line's own font-size — has to scale with the zoom
                the same way the font-size does, so it can't just be a
                static style prop here) — XxentaWordmark's own "x"
                doesn't start flush with its own box's left edge (a normal
                font-metrics gap, the same kind HeroTitle's own per-word
                left-bearing correction exists for elsewhere), which read as
                very slightly left of "Exams & Syllabi"'s own E underneath
                it. Local to this one span, not a change to XxentaWordmark
                itself — the navbar and footer's own copies of this mark are
                flush already and shouldn't move. */}
            <span ref={examsLogoTextRef} className="font-medium tracking-[0.2em] whitespace-nowrap">
              <XxentaWordmark />
            </span>
            <p ref={examsTextRef} className="leading-none font-semibold whitespace-nowrap">
              {EXAMS_TEXT}
            </p>
          </div>
        </Html>

      </group>

      {/* DRP_1.png/DRP_2.png and the syllabus panel's own group — a sibling
          of gridGroupRef, not a child of it, for the opposite reason
          calloutGroupRef is: asked for directly, "do not move the left
          side of the grid at all... the elements on the right are moving
          and being showcased." The grid, the squares, and their own
          lockup text (all still inside gridGroupRef) stop moving the
          instant panT reaches 1 and stay exactly where the pan phase left
          them; this group keeps going through the reveal phase on top of
          that. Mirrors gridGroupRef's own scale, Y-drift, *and* panT-driven
          pan every frame (see the frame loop) — everything gridGroupRef
          itself carries during the pan phase, so DRP_1.png arrives at
          exactly the same resting spot it always did — plus its own
          further revealT-driven travel gridGroupRef no longer gets. */}
      <group ref={revealGroupRef}>
        {/* DRP Showcase's own placeholder — see PLACEHOLDER_COLOR's own
            comment for where it starts and how far it reaches. Not
            GridGlowMaterial's additive glow the lit squares use: this is
            meant to read as a solid, opaque panel, not an accent sitting on
            top of the grid. transparent + a per-frame opacity write (see
            placeholderMeshRef in the frame loop) is what lets it fade in
            with the rest of DRP Showcase rather than already being there at
            full strength the instant it's technically in range — the
            Suspense fallback below carries that same flat colour and
            opacity while DRP_1.png is still loading, so there's no gap
            where this reads as empty. */}
        <mesh
          ref={placeholderMeshRef}
          position={[placeholderCenterX, placeholderCenterY, GRID_Z + 0.005]}
          scale={[placeholderWidth, placeholderHeight, 1]}
          renderOrder={1}
          raycast={() => null}
        >
          <planeGeometry args={[1, 1]} />
          <Suspense
            fallback={
              <meshBasicMaterial
                color={PLACEHOLDER_COLOR}
                transparent
                opacity={0}
                toneMapped={false}
                clippingPlanes={[drpClipPlaneRef.current]}
              />
            }
          >
            <PlaceholderImageMaterial clippingPlanes={[drpClipPlaneRef.current]} />
          </Suspense>
        </mesh>

        {/* DRP Showcase's own second image — flush against DRP_1's own
            right edge (see drp2CenterX's own comment), off past the true
            right edge of the screen until the reveal phase's own travel
            (revealWorldDistance × revealT, see the frame loop) brings it
            into view. Always fully opaque once loaded, deliberately not
            fading in the way DRP_1 does — reported directly as a visible
            shadow where the two images meet while DRP_2 was still
            part-transparent, blending toward the grid/backdrop colour
            behind it instead of showing its own real colour outright. */}
        <mesh
          ref={drp2MeshRef}
          position={[drp2CenterX, drp2CenterY, GRID_Z + 0.005]}
          scale={[drp2Width, drp2Height, 1]}
          renderOrder={1}
          raycast={() => null}
        >
          <planeGeometry args={[1, 1]} />
          <Suspense
            fallback={
              <meshBasicMaterial
                color={PLACEHOLDER_COLOR}
                transparent
                opacity={0}
                toneMapped={false}
                clippingPlanes={[drpClipPlaneRef.current]}
              />
            }
          >
            <Drp2ImageMaterial clippingPlanes={[drpClipPlaneRef.current]} />
          </Suspense>
        </mesh>

        {/* "Syllabus Overview" — centred on the placeholder rectangle above
            (same anchor point, placeholderCenterX/Y) rather than a fixed
            screen position, so it stays centred on the image regardless of
            viewport size. translate(-50%, -50%) centres Html's own wrapper
            on that anchor; the panel's own per-frame scale (see
            syllabusPanelRef in the frame loop) is applied inside that
            already-centred wrapper, around its own transformOrigin center,
            so the visual centre never moves as the scale animates in. */}
        <Html
          position={[placeholderCenterX, placeholderCenterY, GRID_Z + 0.01]}
          style={{ transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
        >
          <SyllabusOverviewPanel
            ref={syllabusPanelRef}
            pillRefs={pillRefs}
            titleRef={titleRef}
            firstPillRef={firstPillRef}
            cursorRef={cursorRef}
            cursorRippleRef={cursorRippleRef}
          />
        </Html>

        {/* "AI Impact Analysis" — centred on drp2PanelCenterX/Y rather
            than a fixed screen position, so it sits directly above DRP_2
            and arrives synchronously with DRP_2 from right to left as
            revealGroupRef pans, matching the exact width and position of
            the Syllabus Overview pills. */}
        <Html
          position={[drp2PanelCenterX, drp2PanelCenterY, GRID_Z + 0.01]}
          style={{ transform: 'translate(-50%, -50%)', pointerEvents: 'none' }}
        >
          <AiImpactAnalysisPanel
            ref={aiImpactPanelRef}
            cursorRef={aiCursorRef}
            cursorRippleRef={aiCursorRippleRef}
            sliderFillRef={aiSliderFillRef}
            sliderThumbRef={aiSliderThumbRef}
            llmInputRef={aiLlmInputRef}
            llmTextRef={aiLlmTextRef}
            llmPlaceholderRef={aiLlmPlaceholderRef}
            llmCaretRef={aiLlmCaretRef}
            aiImpactCardRef={aiImpactCardRef}
            macroPlannerViewRef={macroPlannerViewRef}
            macroPlannerHeaderRef={macroPlannerHeaderRef}
            macroPlannerContainerRef={macroPlannerContainerRef}
            plannerCursorRef={plannerCursorRef}
            plannerRippleRef={plannerRippleRef}
            draggedCardRef={draggedCardRef}
            dropPlaceholderRef={dropPlaceholderRef}
            droppedCardRef={droppedCardRef}
            sidebarPreparingCardRef={sidebarPreparingCardRef}
            sidebarGripRef={sidebarGripRef}
            criteriaCountRef={criteriaCountRef}
            p12CountRef={p12CountRef}
            p11FinancialCardRef={p11FinancialCardRef}
            p11FinancialTitleRef={p11FinancialTitleRef}
            p11FinancialImpactRef={p11FinancialImpactRef}
            navAiAnalysisRef={navAiAnalysisRef}
            navPlanningRef={navPlanningRef}
            navProductionRef={navProductionRef}
            syllabusProductionViewRef={syllabusProductionViewRef}
          />
        </Html>
      </group>

      {/* The callouts' own group — a sibling of gridGroupRef, not a child of
          it, specifically so the squares' own slide to the screen's true
          left edge (see panWorldDistance) doesn't carry them along too (see
          calloutGroupRef's own comment). Mirrors gridGroupRef's own scale
          and Y-drift every frame, so a callout still tracks the same zoom
          and slow drift everything else does — it just never gets the X
          pan. */}
      <group ref={calloutGroupRef}>
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

        {/* DRP Showcase's own first guided message (see HOVER_CALLOUT_TEXT)
            — the exact same slot Floren Showcase's own first callout used
            (calloutPositions[0], same column-A/row-0 geometry, same
            cellSize×0.3 nudge), on the reasoning that reusing it reads as
            "the same message slot, on to its next thing" rather than a new
            element appearing somewhere unrelated. By the time hoverT ever
            moves, panT has long since carried CALLOUTS's own text out of
            view (calloutPanFade), so nothing is actually sharing the spot
            at once. Full-strength TEXT_COLOR rather than CALLOUTS's own
            text-white/40 — that faint white reads fine on Floren
            Showcase's own near-black backdrop and would be close to
            invisible against DRP Showcase's light one, the same contrast
            problem DRP_LINE_OPACITY_BOOST exists to fix for the grid
            lines. Opacity alone (hoverCalloutRef, written from hoverT in
            the frame loop) does the fading in, not a CSS mount animation —
            this has to track scroll, not just play once on mount. */}
        <Html
          position={[calloutPositions[0].x + cellSize * 0.85, (hoverCalloutRow.bottomY + hoverCalloutRow.topY) / 2, GRID_Z + 0.01]}
          style={{ transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <div ref={hoverCalloutRef} className="w-[280px]" style={{ opacity: 0 }}>
            <p className="text-xs leading-loose font-extralight" style={{ color: DRP_TEXT_COLOR }}>
              {HOVER_CALLOUT_TEXT}
            </p>
          </div>
        </Html>
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
// Named pages, for anything below that has to talk about one or the other:
// "Floren Showcase" is the chat itself (CHAT_SCROLL_VH's own scroll room,
// SIM_TEXT's own "Simulations" lockup); "DRP Showcase" is what the pan below
// reveals (EXAMS_SLIDE_VH's own scroll room, EXAMS_TEXT's own
// "Exams & Syllabi" lockup). Not used as an identifier anywhere — plain
// English in the comments is enough — so there's nothing to rename if
// either ever gets called something else again.
//
// Extra scroll spent panning from Floren Showcase to DRP Showcase once the
// chat itself is over — asked for directly, "as smooth as About Us to Meet
// the Team," which is a continuous scroll-driven reveal rather than a
// discrete open/close toggle, so this is scroll room added onto the same
// sticky stage the chat already pins inside, not a second section of its
// own.
const EXAMS_SLIDE_VH = 120
// Scroll spent on the "hover" beat once DRP Showcase itself has arrived —
// the first pill (see firstPillRef) settling from its own resting 90%
// opacity up to a full 100%, "as if it was being hovered," while the
// syllabus-generation guided message (see hoverCalloutRef) fades in beside
// the grid the same way Floren Showcase's own first callout did. Deliberately
// its own phase, after EXAMS_SLIDE_VH rather than folded into it — the pan
// above is about arriving at DRP Showcase; this is a beat that happens once
// the visitor is already looking at it.
const HOVER_VH = 140
// Scroll spent panning the whole DRP Showcase group — grid, squares, panel,
// and DRP_1.png — one further screen-width to the left, sliding DRP_2.png
// in behind it (see revealWorldDistance's own comment for why exactly one
// gridWidth is the right distance). Starts only once HOVER_VH's own beat has
// played out, same sequential handoff CHAT_SCROLL_VH → EXAMS_SLIDE_VH
// already uses.
const REVEAL_VH = 560
const PLANNER_SLIDE_VH = 560
const SECTION_VH = INTRO_VH + CHAT_SCROLL_VH + EXAMS_SLIDE_VH + HOVER_VH + REVEAL_VH + PLANNER_SLIDE_VH

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
  // (see SiteFooter's dimsRef for the longer version of this same argument).
  const rangeRef = useRef({ start: 0, distance: 1, arrivalStart: 0, panDistance: 1, hoverDistance: 1, revealDistance: 1, plannerDistance: 1 })
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
        // How much scroll the pan to the second showcase page (see
        // panProgress below) spends, once the chat's own `distance` above
        // has already been used up — see EXAMS_SLIDE_VH's own comment.
        panDistance: Math.max(1, window.innerHeight * (EXAMS_SLIDE_VH / 100)),
        // hoverProgress/revealProgress's own windows — see HOVER_VH/REVEAL_VH
        // and hoverProgress/revealProgress below, each starting exactly
        // where the one before it finishes, same chained handoff
        // panDistance itself already follows on from distance.
        hoverDistance: Math.max(1, window.innerHeight * (HOVER_VH / 100)),
        revealDistance: Math.max(1, window.innerHeight * (REVEAL_VH / 100)),
        plannerDistance: Math.max(1, window.innerHeight * (PLANNER_SLIDE_VH / 100)),
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

  // 0 for the entire chat (progress hasn't reached 1 yet, so there's nothing
  // to pan to), then 1 - 0 across panDistance once the chat's own scroll is
  // spent — the second showcase page only ever starts revealing itself once
  // the first one is actually finished, the same "arrives, then plays out,
  // then hands off" shape the chat's own arrival→progress handoff already
  // has.
  const panProgress = useTransform(scrollY, (latest) => {
    const { start, distance, panDistance } = rangeRef.current
    return MathUtils.clamp((latest - (start + distance)) / panDistance, 0, 1)
  })

  // 0 until panProgress itself has finished (DRP Showcase has fully
  // arrived), then 1 - 0 across hoverDistance — see HOVER_VH's own comment.
  // Chained the same way panProgress chains off `distance`: each phase's
  // window starts exactly where the one before it ends.
  const hoverProgress = useTransform(scrollY, (latest) => {
    const { start, distance, panDistance, hoverDistance } = rangeRef.current
    return MathUtils.clamp((latest - (start + distance + panDistance)) / hoverDistance, 0, 1)
  })

  // 0 until hoverProgress itself has finished, then 1 - 0 across
  // revealDistance — see REVEAL_VH's own comment.
  const revealProgress = useTransform(scrollY, (latest) => {
    const { start, distance, panDistance, hoverDistance, revealDistance } = rangeRef.current
    return MathUtils.clamp((latest - (start + distance + panDistance + hoverDistance)) / revealDistance, 0, 1)
  })

  // 0 until revealProgress itself has finished, then 1 - 0 across
  // plannerDistance.
  const plannerProgress = useTransform(scrollY, (latest) => {
    const { start, distance, panDistance, hoverDistance, revealDistance, plannerDistance } = rangeRef.current
    return MathUtils.clamp((latest - (start + distance + panDistance + hoverDistance + revealDistance)) / plannerDistance, 0, 1)
  })

  // The same numbers again, as plain refs, for the WebGL side — useFrame runs
  // outside React and wants a property read, not a subscription. One source,
  // two readers each, rather than two independent copies of the arithmetic.
  const progressRef = useRef(0)
  useEffect(() => {
    progressRef.current = progress.get()
    return progress.on('change', (value) => {
      progressRef.current = value
    })
  }, [progress])
  const panProgressRef = useRef(0)
  useEffect(() => {
    panProgressRef.current = panProgress.get()
    return panProgress.on('change', (value) => {
      panProgressRef.current = value
    })
  }, [panProgress])
  const hoverProgressRef = useRef(0)
  useEffect(() => {
    hoverProgressRef.current = hoverProgress.get()
    return hoverProgress.on('change', (value) => {
      hoverProgressRef.current = value
    })
  }, [hoverProgress])
  const revealProgressRef = useRef(0)
  useEffect(() => {
    revealProgressRef.current = revealProgress.get()
    return revealProgress.on('change', (value) => {
      revealProgressRef.current = value
    })
  }, [revealProgress])
  const plannerProgressRef = useRef(0)
  useEffect(() => {
    plannerProgressRef.current = plannerProgress.get()
    return plannerProgress.on('change', (value) => {
      plannerProgressRef.current = value
    })
  }, [plannerProgress])

  return {
    progress,
    progressRef,
    arrival,
    panProgress,
    panProgressRef,
    hoverProgressRef,
    revealProgressRef,
    plannerProgressRef,
  }
}

export function BackgroundGlowSection({ carouselRef, onDrpActiveChange }) {
  const sectionRef = useRef(null)
  const { progress, progressRef, arrival, panProgress, panProgressRef, hoverProgressRef, revealProgressRef, plannerProgressRef } =
    usePinnedProgress(sectionRef, carouselRef)

  useEffect(() => {
    if (!onDrpActiveChange) return
    let lastActive = panProgress.get() >= PAN_FADE_END
    onDrpActiveChange(lastActive)
    return panProgress.on('change', (value) => {
      const active = value >= PAN_FADE_END
      if (active !== lastActive) {
        lastActive = active
        onDrpActiveChange(active)
      }
    })
  }, [panProgress, onDrpActiveChange])

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

  // The chat UI has no idea the pan exists — left alone, it would still be
  // sitting fully opaque over the whole stage for the entire pan, hiding the
  // second page it's supposed to be revealing. Faded out over the pan's own
  // first third, well before the second lockup is meant to be the thing a
  // visitor is actually looking at, and back in just as fast if they scroll
  // back up into it.
  const chatOpacity = useTransform(panProgress, [0, PAN_FADE_END], [1, 0])

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
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 8], fov: 35 }}
          gl={{ antialias: true, alpha: false, localClippingEnabled: true }}
        >
          <SeamlessBackdrop
            carouselRef={carouselRef}
            isVisibleRef={isVisibleRef}
            pinnedProgressRef={progressRef}
            panProgressRef={panProgressRef}
            hoverProgressRef={hoverProgressRef}
            revealProgressRef={revealProgressRef}
            plannerProgressRef={plannerProgressRef}
            dimRef={dimRef}
            angryRef={angryRef}
          />
          <SceneRenderGate isVisibleRef={isVisibleRef} />
        </Canvas>
        {/* Plain DOM over the canvas rather than more drei Html: this is a
            text-heavy interface with real wrapping, masks and hairlines, and
            nothing about it wants to be in the 3D scene. It sits after the
            Canvas in tree order, so it paints over both the grid and the
            callout's own Html without needing a z-index. Wrapped here rather
            than opacity going straight on ChatShowcase's own root, so this
            component doesn't need to know the pan exists at all — see
            chatOpacity's own comment. */}
        <motion.div style={{ opacity: chatOpacity }}>
          <ChatShowcase progress={progress} arrival={arrival} />
        </motion.div>
      </motion.div>
    </section>
  )
}

export default BackgroundGlowSection
