import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useTransform } from 'framer-motion'
import { MAIN_SLIDE_VW, mainSlidePx } from './teamTransition'
import { CornerBrackets } from './CornerBrackets'
import { ABOUT_US_GRID_ZOOM_SCALE } from './gridConstants'
import { gridScreenMetrics } from './gridScreenMetrics'
import { PAGE_MARGIN_VH, pageMarginPx } from './pageMargin'

// teamLayout.js (which used to export this) was deleted along with the old
// hover-based team scene — this is the only place that still needs the
// photo's path, so it's a plain local constant rather than resurrecting
// that file for one string.
export const TEAM_PHOTO_SRC = '/team-photo-web.jpg'

// The photo block is now a small slideshow rather than one fixed image —
// the group photo (with its own "Meet the Team" CTA) always sits last, and
// whatever comes before it exists to be browsed through, not landed on.
// photo is null for the two slides ahead of it — left as plain gray filler
// (see the placeholder block below) rather than borrowing real photos for
// content that isn't decided yet, so nothing here could be mistaken for
// finished. Headline/body follow the same obvious-placeholder bracket
// convention as the rest of this page's still-unwritten copy.
const SLIDES = [
  {
    photo: '/noordhuys-photo.jpg',
    alt: 'Noordhuys',
    headline: '[Our impact working with Noordhuys, to be added. ]',
    body: "[ A paragraph on our team's expertise — to be added. ]",
  },
  {
    photo: '/drp-photo.jpg',
    alt: 'DRP',
    headline: '[Our impact at De Rooi Pannen, to be added. ]',
    body: '[ A paragraph on how we work together — to be added. ]',
  },
  {
    photo: TEAM_PHOTO_SRC,
    alt: 'The xXenta team',
    headline: '[ A short, catchy line about xXenta — to be added. ]',
    body: '[ A paragraph on our work as a small team, and on being a Google Cloud partner — to be added. ]',
    showButton: true,
  },
]

// Every distinct photo a slide can show, for AboutUsSection to preload into
// PhotoBackdropCapture's texture cache up front (see preloadPhotoTextures
// there) — the badge's own crossfade can't start until its texture has
// loaded, a separate GPU upload from the DOM photo's own load, and that gap
// was the one thing tuning the fade's speed/duration alone could never
// close. Warming the cache before it's needed closes it at the source
// instead. filter(Boolean) drops the null placeholder slides above.
export const SLIDE_PHOTOS = SLIDES.map((slide) => slide.photo).filter(Boolean)

// The photo's window, in grid cells. Four across, up from three, by three
// down, up from the original two (that one asked for directly, as "the row
// above").
//
// A column was also asked for on the *right*, and isn't here: at some
// realistic window widths, adding one there pushes the photo up to 142px
// past the true right edge of the browser — not crowding it, past it, the
// window clipped off entirely — because the right edge is already anchored
// to the last cell that fits inside the page's own margin (see
// photoCellIndices), and there's rarely a full further cell of slack beyond
// that before the true edge of the screen. The left side had slack to give
// (the copy column's own width, see its comment below) that a browser's
// screen bounds do not.
//
// Centred fresh on the new height, not anchored to where the old 2-row
// block's bottom edge used to be. Anchoring to the old bottom (tried first)
// kept the badge below it pinned exactly in place, which sounds like the
// safer choice and isn't: adding a full cell on top of an already
// off-centre block pushed the *top* edge past the top of the viewport on
// several common window heights, 900px included — the window is only 900px
// tall there to begin with, and the old block already sat with just 162px
// of headroom above it. Re-centring the taller block trades a fixed badge
// position (it moves down by roughly a cell) for the window reliably
// staying on screen, which is the one property that cannot be given up.
const PHOTO_CELLS_X = 4
const PHOTO_CELLS_Y = 3
// Empty grid columns kept between the photo's right edge and the page's own
// right-hand boundary (see photoCellIndices). The grid only offers this in
// whole-cell steps — the window's own edges have to land on grid lines, so
// there's no in-between position to try — and one full cell (200px) turned
// out to be too coarse a lever: flush (0) read as crowding the true screen
// edge, one cell in read as too far the other way. Back at 0 for now; the
// real fix is a finer adjustment than this constant can express on its own.
const PHOTO_COLUMN_INSET = 0
// How far the photo runs past the window, in cells — how much there is to
// reveal, in other words, and the reason the parallax is worth having.
//
// Set here rather than left to the photo's own proportions, which is what
// this did first and is why nothing appeared to move: the file is 2600x1985,
// so at three cells wide it stands 458px — against a 400px window, back when
// the window was two rows tall rather than three. Fifty-eight
// pixels of overflow, most of which PARALLAX_TRAVEL holds back, came out as
// about twenty pixels of travel — real, and far too small to read as
// anything. Sizing the image to a whole cell past the window instead makes
// the amount hidden a property of the design rather than of whichever
// photograph happens to be in the slot.
const PHOTO_OVERFLOW_CELLS = 0
// How much of the hidden overflow the pointer can actually reach, as a
// fraction of it. Not 1: at the extremes the photo's own top and bottom edge
// would come into the window, which breaks the illusion that it continues
// past the grid rather than ending at it. Keeping a margin in reserve means
// the edges stay outside no matter where the pointer goes.
const PARALLAX_TRAVEL = 0.7
// Exponential damping toward the pointer's position, in the same family as
// every other easing on this piece (TILT_LAMBDA in GlassLogoGroup, the grid
// parallax, SCROLL_LERP's own lambda). A little quicker than the logo's tilt
// — this is a direct "I am pointing at that" response rather than the weight
// of an object being pushed.
const PARALLAX_LAMBDA = 6

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
// rather than damping it. The position is then plain arithmetic on the same
// settled metrics — see the layout pass below for why the live, mid-zoom
// ones turned out to be the wrong thing to track.
function photoCellIndices(width, height) {
  const settled = gridScreenMetrics({
    width,
    height,
    scale: ABOUT_US_GRID_ZOOM_SCALE,
    screenOffset: -1,
  })
  const { cell, phaseX, phaseY } = settled
  // Anchored to the page's own right-hand boundary (see pageMargin.js,
  // mirrored from the left edge where the hero's title and the placeholder
  // copy's blue cell edge both sit), then held PHOTO_COLUMN_INSET columns
  // in from it rather than flush against it — flush read as crowding the
  // true edge of the screen, reported directly. See PHOTO_COLUMN_INSET's own
  // comment for why the inset is smaller than first asked for.
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
  // ...and vertically centred, to the nearest whole cell — see
  // PHOTO_CELLS_Y's own comment for why this centres the current height
  // directly rather than anchoring to where a shorter version of the window
  // used to sit.
  const row = Math.round((height / 2 - (PHOTO_CELLS_Y * cell) / 2 - phaseY) / cell)
  return { column, row }
}

// Same no-fill blue as CornerBrackets/EDGE_STYLE, but circled — a bare
// chevron (tried first, alongside the photo) read as too easy to miss;
// the same "Meet the Team" pill's rounded-full/border-only treatment,
// applied to a circle instead of a pill, gives the mark a real footprint to
// notice and to click without abandoning the "outline only" language this
// piece uses everywhere else. disabled (at either end of SLIDES) fades and
// stops taking clicks rather than wrapping around — the group photo's own
// CTA is a real last slide to arrive at, not one stop on an endless loop.
function SlideArrow({ direction, onClick, disabled }) {
  const d = direction === 'left' ? 'M14 5l-7 7 7 7' : 'M10 5l7 7-7 7'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'left' ? 'Previous slide' : 'Next slide'}
      className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#3B82F6] text-[#3B82F6] transition-colors duration-200 hover:border-white/40 hover:text-white/40 disabled:pointer-events-none disabled:opacity-25 disabled:hover:border-[#3B82F6] disabled:hover:text-[#3B82F6]"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d={d} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

// The literal "About Us" page — replaces the old Our Mission/Meet the Team
// tabs entirely (see AboutUsSection). The team photo sits in a twelve-square
// window cut out of the grid on the right, with the Google Cloud glass badge
// underneath it (the badge itself is a separate WebGL element — see
// GoogleCloudGlassBadge — positioned against badgeAnchorRef, a plain empty
// div reserving its footprint in the DOM layout so the two stay in sync
// without either side hardcoding the other's size), and the headline/body/
// partner-badge block to the left of it. The Google Cloud Partner plaque
// (see GoogleCloudPartnerBadge) sits in that left column the same way —
// its own anchor, partnerBadgeAnchorRef, reserves its footprint here while
// the actual glass mesh is drawn by the main canvas in AboutUsSection.
//
// The photo block is placed against the grid rather than by flow, since
// which squares it covers is the whole point of it; the copy is placed
// against the viewport, and given the room the photo leaves.
export function AboutUsIntro({
  isOpen,
  badgeAnchorRef,
  partnerBadgeAnchorRef,
  windowRef,
  onPhotoChange,
  teamProgress,
  isTeamOpen,
  onOpenTeam,
  // What the arrows do once the team stage is up — decided by AboutUsSection,
  // which is the only place that knows whether a member's profile is open
  // (see its own comment on teamPrev/teamNext). These arrows just render
  // whatever they're handed.
  onTeamPrev,
  onTeamNext,
  teamNextDisabled,
}) {
  const blockRef = useRef(null)
  const imageRef = useRef(null)
  // The headline/body/partner-badge column's own outer wrapper — its
  // width is computed and written imperatively (see applyLayout below)
  // rather than a fixed Tailwind class on the heading itself, the same
  // "measured, not guessed" treatment blockRef/windowEl already get. The
  // wrapper, not the <h1> directly: the heading remounts on every slide
  // change (it's inside the AnimatePresence/key={slideIndex} block below,
  // by design, so its text can crossfade), so anything set imperatively on
  // the heading node itself would be lost the instant a fresh one mounted —
  // the same class of bug the photo's own imageRef sizing hit. This wrapper
  // is never keyed and never remounts, so what it's given at mount/resize
  // stays applied to every slide's own heading without re-measuring.
  const textColumnRef = useRef(null)
  // Where the pointer is asking the photo to sit, -1 (top of the overflow)
  // to 1, and where it has eased to so far.
  const pointerRef = useRef(0)
  const easedRef = useRef(0)
  // How much of the photo is hidden, in px — written by the layout pass, read
  // by the parallax loop, so the loop never has to recompute the layout just
  // to know how far it may move things.
  const overflowRef = useRef(0)
  // Where the arrow row sits horizontally when nothing has slid — the photo
  // window's own centre, since that's what the row is centred on (see its
  // left-1/2 -translate-x-1/2 below). Written by the layout pass, read by
  // arrowsX below to work out how far the arrows have to travel to land on
  // the middle of the screen. A ref rather than state because the transform
  // reading it re-evaluates on every frame of the slide anyway, and this
  // changing should never itself cost a render.
  const arrowRestCenterRef = useRef(null)

  // The About Us -> Meet the Team slide, DOM side. teamProgress is already
  // eased (see teamTransition), so both of these are plain linear functions
  // of it — the curve lives in one place for the DOM and WebGL halves alike.
  //
  // mainX moves everything in this subtree off to the left together.
  const mainX = useTransform(teamProgress, (p) => mainSlidePx(p, window.innerWidth))
  // The arrows are the exception: they stop at the middle of the screen
  // rather than leaving with everything else. They live *inside* the sliding
  // subtree (nested under the photo block, so they stay put relative to the
  // window at rest), which means this has to be the offset that *cancels*
  // mainX and lands them on centre instead — hence subtracting mainX rather
  // than just animating to the target. Written out algebraically:
  //   net wanted = p * (screenCentre - restCentre)
  //   net actual = mainX + arrowsX
  // so arrowsX = p * (screenCentre - restCentre) - mainX, and mainX is
  // -p * width * MAIN_SLIDE_VW, giving the + term below.
  const arrowsX = useTransform(teamProgress, (p) => {
    const restCentre = arrowRestCenterRef.current
    if (restCentre == null) return 0
    const toCentre = window.innerWidth / 2 - restCentre
    return p * (toCentre + window.innerWidth * MAIN_SLIDE_VW)
  })

  // Which of SLIDES is showing. Clamped rather than wrapped by goPrev/
  // goNext below — see SlideArrow's own comment for why an end genuinely
  // means an end here.
  const [slideIndex, setSlideIndex] = useState(0)
  const slide = SLIDES[slideIndex]
  // A frozen snapshot of whatever the window was showing right before the
  // current transition started — src/alt plus the exact height/transform
  // imageRef had at that instant, so it can be painted back in the same spot
  // it was already sitting in rather than reflowing, plus an `id` used as
  // its React key (see the window JSX below). Rendered as a second,
  // absolutely-positioned layer on top of the (always-opaque) incoming image
  // — so a slide change reads as the old photo dissolving to reveal the new
  // one already there beneath it, never as a dip to the bare grid. null once
  // there's nothing left to dissolve.
  //
  // The `id`/key matters more than it looks. Without one, React reconciled
  // each new snapshot onto the *same* <img> DOM node as the previous
  // transition's — a node already sitting at opacity 0 from having just
  // faded out. Re-using it meant the next transition's "from" state (opacity
  // 0.8) was a style *change* on a live node rather than a fresh mount, and
  // if the incoming photo's load event landed before the browser painted
  // that 0.8 frame, the style went 0 -> 0.8 -> 0 within a single frame:
  // no visible change, therefore no CSS transition, therefore no
  // transitionend. Keying it guarantees every dissolve starts from a
  // genuinely freshly-mounted node in its own "from" state.
  const [outgoing, setOutgoing] = useState(null)
  // Whether the current outgoing snapshot should be animating away yet.
  // Split out from the old imgLoaded flag it replaces: that one conflated
  // "the incoming image is ready" with "the outgoing layer's target style",
  // which is what let a fast load collapse a transition into no-op (see the
  // key note above). This is only ever flipped a frame *after* the snapshot
  // has mounted and painted, so the browser always has two distinct states
  // to interpolate between.
  const [fadeOut, setFadeOut] = useState(false)
  // Mirrors outgoing for the parallax loop below, which reads it every
  // frame off a ref rather than depending on the state directly — adding
  // outgoing to that effect's own deps would tear down and restart the
  // whole rAF loop (and its dt/last timing) on every slide change instead
  // of just skipping a frame's write.
  const outgoingRef = useRef(null)
  outgoingRef.current = outgoing
  // The authoritative current index for *scheduling* purposes. slideIndex
  // the state variable lags by a render, and worse, lags an entire queued
  // chain — goPrev/goNext computing off it meant a second rapid click could
  // derive a target equal to the one already in flight, hit the no-op guard
  // in startTransition, and be silently dropped. Every decision below reads
  // this instead, and it is updated synchronously the moment a transition
  // is committed to.
  const slideIndexRef = useRef(0)
  slideIndexRef.current = slideIndex
  // A requested slide index that arrived while a transition was already
  // playing — held here instead of starting a second one on top of the
  // first. The arrows are never disabled during a transition (people should
  // always be able to keep skipping ahead/back), but two overlapping
  // transitions can't share one outgoing snapshot: a click landing mid-fade
  // used to replace that snapshot outright, and since that swaps the <img>'s
  // src rather than animating an existing one, the browser had nothing to
  // transition from — it popped straight to the new photo at whatever
  // opacity/blur the interrupted one happened to be at (reported as the
  // previous picture "flashing" mid-transition). Queuing means a fast run of
  // clicks plays out as a clean chain of full dissolves, landing wherever
  // the *last* click asked for.
  const pendingIndexRef = useRef(null)
  // Monotonic id for the in-flight transition. Every deferred callback below
  // (rAF, timers, load events) captures the id it was scheduled for and
  // no-ops if a newer transition has since superseded it, so a late callback
  // from an abandoned transition can never drive the current one.
  const transitionIdRef = useRef(0)
  const timersRef = useRef({ safety: 0, finish: 0, raf: 0 })

  // Must match the outgoing layer's own transition-duration class below.
  const CROSSFADE_MS = 500
  // How long to wait on the incoming photo's load event before dissolving
  // anyway. The dissolve waits for the incoming image so the reveal never
  // exposes a half-loaded photo, but it must never wait *forever*: a load
  // event that doesn't arrive (cache quirk, decode failure, an <img> whose
  // src didn't actually change) previously meant the transition simply never
  // ran and the slideshow wedged. This is the ceiling on that wait.
  const LOAD_SAFETY_MS = 1200

  const clearTimers = () => {
    const t = timersRef.current
    if (t.safety) clearTimeout(t.safety)
    if (t.finish) clearTimeout(t.finish)
    if (t.raf) cancelAnimationFrame(t.raf)
    t.safety = 0
    t.finish = 0
    t.raf = 0
  }

  // Ends the current transition and immediately starts whatever was queued
  // during it. Driven by a plain timer rather than the outgoing layer's own
  // transitionend event, deliberately: transitionend is not guaranteed to
  // fire (a transition that never starts never ends, and that single missed
  // event was exactly what left `outgoing` set forever, every later click
  // queuing behind a dissolve that was never going to complete — the arrows
  // looking live while doing nothing). A timer always fires, so the state
  // machine can no longer deadlock on a missing event, at the cost of
  // completing a few ms after the visual fade rather than exactly on it.
  const finishTransition = (id) => {
    if (id !== transitionIdRef.current) return
    clearTimers()
    const pending = pendingIndexRef.current
    pendingIndexRef.current = null
    if (pending != null && pending !== slideIndexRef.current) {
      beginTransition(pending)
    } else {
      setOutgoing(null)
      setFadeOut(false)
    }
  }

  // Kicks the snapshot into fading, one *painted* frame after it mounted —
  // two nested rAFs, since a single one can still land inside the same frame
  // the mount is committed in, which would collapse the whole dissolve into
  // one style recalculation with nothing to interpolate.
  const startFadeOut = (id) => {
    const t = timersRef.current
    if (id !== transitionIdRef.current || t.finish || t.raf) return
    if (t.safety) {
      clearTimeout(t.safety)
      t.safety = 0
    }
    t.raf = requestAnimationFrame(() => {
      t.raf = requestAnimationFrame(() => {
        t.raf = 0
        if (id !== transitionIdRef.current) return
        setFadeOut(true)
        t.finish = setTimeout(() => finishTransition(id), CROSSFADE_MS + 80)
      })
    })
  }

  // Snapshots the *current* slide and switches to the target. Unconditional
  // — callers (startTransition, and finishTransition draining the queue) are
  // what decide whether a transition should start at all. Reads the outgoing
  // photo off slideIndexRef rather than the render's own `slide`, so a
  // chained transition started from a timer callback snapshots what is
  // actually on screen rather than whatever the closure happened to capture.
  const beginTransition = (targetIndex) => {
    clearTimers()
    const id = ++transitionIdRef.current
    const from = SLIDES[slideIndexRef.current]
    const image = imageRef.current
    setOutgoing({
      photo: from.photo,
      alt: from.alt,
      height: image?.style.height,
      transform: image?.style.transform,
      id,
    })
    setFadeOut(false)
    setSlideIndex(targetIndex)
    slideIndexRef.current = targetIndex
    if (SLIDES[targetIndex].photo) {
      // Wait for the incoming <img>'s load (see its onLoad below), but only
      // up to LOAD_SAFETY_MS.
      timersRef.current.safety = setTimeout(() => startFadeOut(id), LOAD_SAFETY_MS)
    } else {
      // Photo-less slide — a flat gray fill has nothing to wait on.
      startFadeOut(id)
    }
  }

  const startTransition = (targetIndex) => {
    if (targetIndex === slideIndexRef.current) return
    if (outgoingRef.current) {
      pendingIndexRef.current = targetIndex
      return
    }
    beginTransition(targetIndex)
  }
  // Steps from wherever the *last* click asked to go, not from what is
  // currently painted — so three fast Next clicks advance three slides
  // instead of collapsing into one (see slideIndexRef/pendingIndexRef).
  const nextTargetFrom = () => pendingIndexRef.current ?? slideIndexRef.current
  const goPrev = () => startTransition(Math.max(0, nextTargetFrom() - 1))
  const goNext = () => startTransition(Math.min(SLIDES.length - 1, nextTargetFrom() + 1))

  useEffect(() => clearTimers, [])
  // Bubbles the current slide's photo up — same "report state, don't lift
  // it" shape as BackgroundGrid's own onActiveIndexChange — so AboutUsSection
  // can hand the Google Cloud badge's glass the *actual* photo sitting
  // behind it (see PhotoBackdropCapture there) instead of a hardcoded one.
  useEffect(() => {
    onPhotoChange?.(slide.photo)
  }, [slide.photo, onPhotoChange])

  useEffect(() => {
    if (!isOpen) return
    const onPointerMove = (event) => {
      // Off the viewport's own vertical centre, so the photo answers where
      // the pointer is on screen rather than where it is over the window —
      // the reveal stays reachable from anywhere on the page, including from
      // over the copy on the left.
      pointerRef.current = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onPointerMove)
    return () => window.removeEventListener('pointermove', onPointerMove)
  }, [isOpen])

  // Breathing room kept between the heading's own right edge and the
  // photo's left edge (see textColumnRef below). The heading is sized to
  // use the real gap between the page's own left margin and wherever the
  // photo actually lands, not a guessed constant — a guessed width ("a
  // little bigger", tried twice) kept needing another bump because the true
  // available room depends on the viewport, moving with the photo's own left
  // edge (see photoCellIndices) while the page's left margin barely does.
  // This margin is the one remaining hand-tuned number in that: 24px, then
  // 40px (both tried, both confirmed live — not a stale-HMR read, an actual
  // reload — and still read as ending right on the photo's edge) undersold
  // how much bigger this gap needs to feel on an actual wide desktop
  // display: the computed column itself is hundreds of pixels wider there
  // than the 1440px case this was first tuned against, so the same fixed
  // margin that looked fine at that width reads as barely any space at all
  // once everything else on screen has grown with it. 90 is a deliberately
  // bigger jump for that reason, not another small step.
  const HEADING_RIGHT_GAP_PX = 90

  // Everything about where the block sits and how big it is, from one set of
  // metrics. Its own function because it is called before the first paint and
  // again on every resize, and because keeping the whole layout in one place
  // is what lets the per-frame loop below own nothing but the parallax.
  const applyLayout = useCallback((metrics) => {
    const block = blockRef.current
    const windowEl = windowRef.current
    const image = imageRef.current
    if (!block || !windowEl || !image || !metrics) return null
    const { cell, phaseX, phaseY } = metrics
    const { column, row } = photoCellIndices(window.innerWidth, window.innerHeight)
    const photoLeftPx = phaseX + column * cell
    block.style.left = `${photoLeftPx}px`
    // The arrow row is centred on the window, so the window's own centre is
    // where the arrows rest — see arrowRestCenterRef.
    arrowRestCenterRef.current = photoLeftPx + (cell * PHOTO_CELLS_X) / 2
    block.style.top = `${phaseY + row * cell}px`
    const windowHeight = cell * PHOTO_CELLS_Y
    windowEl.style.width = `${cell * PHOTO_CELLS_X}px`
    windowEl.style.height = `${windowHeight}px`
    // Sized rather than measured — see PHOTO_OVERFLOW_CELLS. object-cover on
    // the image then crops whichever axis has to give, so the window is
    // always filled edge to edge whatever shape the photo is.
    const imageHeight = windowHeight + PHOTO_OVERFLOW_CELLS * cell
    image.style.height = `${imageHeight}px`
    // The text column's own left edge sits at the page's shared margin (see
    // PAGE_MARGIN_VH below, in the JSX) — same measurement pageMarginPx
    // gives back here, just already known in px rather than vh. Whatever's
    // left between there and the photo's own left edge, minus the gap above,
    // is exactly how wide the heading (unconstrained by its own width now —
    // see the JSX) can get without ever touching it. The body copy keeps its
    // own, tighter width (see the JSX) regardless of how wide this column
    // itself is allowed to grow.
    if (textColumnRef.current) {
      textColumnRef.current.style.maxWidth = `${photoLeftPx - pageMarginPx(window.innerHeight) - HEADING_RIGHT_GAP_PX}px`
    }
    return imageHeight - windowHeight
  }, [])

  // Laid out against the *settled* grid — the size and phase it rests at
  // once About Us is open — and never against the live, mid-zoom one, which
  // is what this did first and was plainly wrong to watch.
  //
  // The reasoning behind that first version was that the block should track
  // the grid it belongs to. It does track it, and that is the problem: the
  // grid zooms from 1 to 1.25 during the reveal, so a cell goes 160px to
  // 200px, and cell indices chosen for the settled grid land somewhere quite
  // different against the smaller one. On a 1440px viewport the block starts
  // at x=444 and travels to x=575, growing 480px wide to 600px, over the
  // reveal's whole 1.6s — while the photo fades in half a second into it.
  // So it appeared, in the wrong place, and crawled to the right one, every
  // single time. Reported twice, and correctly.
  //
  // Holding it at the settled position instead means it fades in exactly
  // where it belongs. The cost is that for the second or so it takes the
  // grid to arrive underneath it, the squares are still growing into
  // alignment behind the photo — during a fade, while everything is moving,
  // which is a far quieter thing to be slightly wrong about.
  //
  // It also fixes the badge. badgeAnchorRef sits inside this block, so all
  // that travel was dragging the Google Cloud plaque's anchor along with it,
  // and a rect that only *moves* without changing size fires no
  // ResizeObserver — nothing corrected it until the reveal finished landing.
  // A block that never moves has a rect that is right the first time it is
  // measured.
  useLayoutEffect(() => {
    const layOut = () => {
      const overflow = applyLayout(
        gridScreenMetrics({
          width: window.innerWidth,
          height: window.innerHeight,
          scale: ABOUT_US_GRID_ZOOM_SCALE,
          screenOffset: -1,
        }),
      )
      overflowRef.current = overflow ?? 0
      // Parked centred, so the photo is already showing its middle rather
      // than its top edge before the pointer has ever moved.
      if (overflow != null && imageRef.current) {
        imageRef.current.style.transform = `translate3d(0, ${-overflow / 2}px, 0)`
      }
    }
    layOut()
    window.addEventListener('resize', layOut)
    return () => window.removeEventListener('resize', layOut)
  }, [applyLayout])

  // Only the parallax runs per frame now — the layout above is fixed until
  // the window resizes, so there is nothing about it to recompute.
  useEffect(() => {
    if (!isOpen) return
    let frame = 0
    let last = performance.now()

    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const image = imageRef.current
      const overflow = overflowRef.current
      // Paused for the duration of a crossfade (outgoingRef non-null) —
      // the incoming image sits directly beneath the frozen outgoing
      // snapshot (see startTransition/outgoing above), and letting parallax
      // keep nudging it every frame while it's hidden meant it had drifted
      // to a different offset than the snapshot by the time the dissolve
      // revealed it, reading as a jump/jitter right as the swap landed —
      // worse the more the pointer had moved during that half-second. Also
      // skips the easing math itself, not just the write: catching easedRef
      // up to the live pointer position while frozen would have made
      // parallax resume with a snap the instant the transition ended,
      // instead of continuing smoothly from wherever it left off.
      if (image && overflow > 0 && !outgoingRef.current) {
        easedRef.current +=
          (pointerRef.current - easedRef.current) * (1 - Math.exp(-PARALLAX_LAMBDA * dt))
        // Positive pointer (lower on screen) pulls the photo up, revealing
        // what was below the window's bottom edge — the content follows the
        // pointer's direction the way dragging it would, not away from it.
        const offset = -easedRef.current * (overflow / 2) * PARALLAX_TRAVEL
        image.style.transform = `translate3d(0, ${-overflow / 2 + offset}px, 0)`
      }
      frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [isOpen])

  return (
    // A fade with no movement in it, deliberately. This used to rise 12px as
    // it faded, which the Google Cloud badge could not join in with: the
    // badge is WebGL, positioned from this subtree's measured rect (see
    // useDomAnchorRect in AboutUsSection), and a DOM transform changes where
    // an element paints without changing anything a measurement can see. So
    // the photo rose and the plaque stayed put, and the two only agreed once
    // the rise had finished — landing as a 12px jump the moment the reveal
    // settled and the anchor was measured again. Reported directly.
    //
    // Nothing is lost by dropping it: the entire panel is already sliding a
    // full screen down as this plays, so twelve pixels of extra travel inside
    // it was never doing visible work, and what it cost was the one thing on
    // this page that has to keep DOM and WebGL in agreement.
    // style.x carries the Meet the Team slide (see mainX above) while
    // animate keeps owning the reveal's own opacity — two separate
    // properties, so neither fights the other for control of this element.
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: isOpen ? 0.5 : 0 }}
      style={{ x: mainX }}
      className="pointer-events-none absolute inset-0 z-50"
    >
      {/* Left: headline, body copy, Google Cloud partner badge. A fixed 280px
          (tried first, for the whole column, then 300px for just the
          heading) needed bumping every time it was asked to grow, because
          the real available room isn't fixed at all — the photo's own left
          edge moves with the viewport width (see photoCellIndices) while
          this column's own left margin barely does, so a guessed constant
          was either leaving real space unused on a wide window or already
          too tight on a narrower one. textColumnRef's own max-width (set in
          applyLayout, from the actual measured gap) replaces that guessing:
          the heading below has no width of its own now and simply fills
          whatever this column is genuinely allowed. Body copy keeps its own
          tighter 280px regardless — sized for an actual paragraph, not a
          single display line, so it shouldn't grow just because the heading
          can. */}
      <div ref={textColumnRef} className="absolute top-1/2 -translate-y-1/2"
        style={{ left: `${PAGE_MARGIN_VH}vh` }}>
        {/* Keyed on slideIndex so each slide's copy is its own mount —
            unlike imageRef, nothing outside this fade depends on the
            heading/paragraph nodes staying the same element across slides,
            so AnimatePresence can swap them outright rather than needing the
            load-driven opacity dance the photo itself uses. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slideIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <h1 className="text-[38px] leading-[1.25] font-light text-white/90 md:text-[46px]">
              {slide.headline}
            </h1>
            <p className="mt-6 max-w-[280px] text-[13px] leading-[1.9] font-extralight text-white/60">
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>
        {/* Reserves the plaque's footprint in the DOM layout — the actual
            glass mesh is drawn by GoogleCloudPartnerBadge in AboutUsSection's
            main canvas, positioned against this rect (see useDomAnchorRect
            there), the same handoff badgeAnchorRef already uses for the
            team-photo badge. */}
        <div ref={partnerBadgeAnchorRef} className="pointer-events-none mt-10 h-32 w-32" />
      </div>

      {/* Right: the team photo behind its twelve-square window, badge below.
          left/top are written every frame by the loop above — see
          photoCellIndices for why nothing here is measured. */}
      <div ref={blockRef} className="absolute z-50">
        {/* relative — CornerBrackets positions itself absolutely against its
            nearest positioned ancestor, and without this that ancestor would
            be blockRef instead (the next one up), pinning the marks to the
            whole draggable block's own corners rather than the window's. No
            overflow-hidden here any more, deliberately — see the note on
            CornerBrackets below for why that clipping had to move down onto
            just the image. */}
        <div ref={windowRef} className="relative">
          {/* overflow-hidden lives on this inner wrapper now, not windowRef
              itself. It only ever existed to clip the *image* (which is
              deliberately taller than the window — see PHOTO_OVERFLOW_CELLS
              — and would otherwise spill out the bottom); once the corner
              marks below were asked to overhang past the window's own edges,
              that same clip would have cut the overhang off too, being an
              ancestor of everything including them. inset-0 keeps this
              exactly the size windowRef's own imperative width/height sets
              each frame, so nothing about the sizing logic above had to
              change, only which element the image sits inside. */}
          <div className="absolute inset-0 overflow-hidden">
            {/* The incoming layer — always at its resting opacity, never
                dipped. Same ref/className/style/height/transform contract on
                both branches (only the tag and src/onLoad differ) — the
                layout and parallax logic above sets
                imageRef.current.style.height/.transform imperatively and
                doesn't know or care which element currently holds the ref.
                It's fine for this to be genuinely underneath a still-loading
                image for a beat: the outgoing layer below stays opaque over
                it until this one's load fires, so there's nothing to see
                through to yet. */}
            {slide.photo ? (
              <img
                ref={imageRef}
                src={slide.photo}
                alt={slide.alt}
                draggable={false}
                // Releases the outgoing snapshot to start dissolving, now
                // that there's a fully-loaded photo underneath it to reveal.
                // Only a *trigger* — it no longer feeds the outgoing layer's
                // own style, so a load that arrives unusually early (a warm
                // cache, most often) can't collapse the dissolve into a
                // single no-op style recalculation the way it used to. If it
                // never arrives at all, beginTransition's own safety timer
                // starts the fade regardless.
                onLoad={() => startFadeOut(transitionIdRef.current)}
                // Full window width, natural height — taller than the
                // window, which is what leaves something to reveal.
                // Positioned from the top and moved by transform only, so
                // the overflow maths above has a single, predictable origin
                // to work from.
                className="w-full max-w-none object-cover"
                style={{ opacity: 0.8 }}
              />
            ) : (
              // No photo decided yet for this slide — flat gray rather than
              // reusing a real photo for content that isn't real yet (see
              // SLIDES above).
              <div ref={imageRef} className="h-full w-full bg-gray-500" />
            )}
            {/* The outgoing layer — a frozen snapshot of the previous slide
                (see outgoing/startTransition above), painted back at the
                exact height/transform it had when the swap began so it
                doesn't jump before it starts to dissolve. Sits on top of the
                incoming layer in stacking order purely by coming later in
                the DOM (both share the same non-positioned/positioned
                stacking context), no z-index needed. Starts fully opaque and
                sharp — matching how it already looked the instant before
                this render — then blurs and fades once fadeOut flips true a
                painted frame later, revealing the incoming layer that was
                sitting ready underneath the whole time rather than the bare
                grid behind it. Keyed on outgoing.id so each dissolve gets a
                genuinely fresh node (see the outgoing state's own comment).
                Removed by finishTransition's timer so it never lingers as a
                fully transparent layer. */}
            {outgoing && (
              outgoing.photo ? (
                <img
                  key={outgoing.id}
                  src={outgoing.photo}
                  alt={outgoing.alt}
                  draggable={false}
                  className="pointer-events-none absolute top-0 left-0 w-full max-w-none object-cover transition-[opacity,filter] duration-500 ease-in-out"
                  style={{
                    height: outgoing.height,
                    transform: outgoing.transform,
                    opacity: fadeOut ? 0 : 0.8,
                    filter: fadeOut ? 'blur(16px)' : 'blur(0px)',
                  }}
                />
              ) : (
                <div
                  key={outgoing.id}
                  className="pointer-events-none absolute top-0 left-0 h-full w-full bg-gray-500 transition-[opacity,filter] duration-500 ease-in-out"
                  style={{
                    height: outgoing.height,
                    transform: outgoing.transform,
                    opacity: fadeOut ? 0 : 1,
                    filter: fadeOut ? 'blur(16px)' : 'blur(0px)',
                  }}
                />
              )
            )}
          </div>
          {/* Bigger than CornerBrackets' own default (22px/2px, sized for
              TeamCarousel's ~460px square tiles) — this window is a settled
              4x3 grid block, always exactly 800x600px regardless of viewport
              (cell size here is TARGET_CELL_PX * ABOUT_US_GRID_ZOOM_SCALE, a
              fixed 200px, not something that scales with the window). Asked
              for thicker and overhanging past the photo's own edges — a
              "crop mark" look, rather than a border traced flush along it —
              which is why this now sits alongside the image instead of
              inside its own overflow-hidden box (see above).  */}
          <CornerBrackets size={40} thickness={5} overhang={10} />
          {/* Below the window, left-aligned — the badge hangs off the
              *opposite* (bottom-right) corner (see badgeAnchorRef below), so
              staying left keeps this clear of its glass rather than sitting
              underneath it. Absolutely positioned against windowRef (not a
              normal-flow sibling inside blockRef) so it can't grow blockRef's
              own box: badgeAnchorRef's bottom/right offsets are measured from
              that box, and this can't be the thing that moves them.
              showButton-gated — see SLIDES — so it's only ever on screen
              alongside the group photo it actually belongs to. */}
          {slide.showButton && (
            // Mounts fresh every time showButton flips true (there's no
            // AnimatePresence/key needed for that — the && above already
            // unmounts it on every other slide, so arriving back at this
            // one is a genuine new mount each time), which is what lets a
            // plain initial/animate pair replay on every arrival rather
            // than only once. Descends the last little bit into its resting
            // spot rather than travelling far — asked for subtle, and 16px
            // reads as a settle, not a slide-in. blur pairs with that same
            // arrival: starts soft like it's still resolving into focus,
            // sharpens as it lands. The ease-out-expo-shaped curve (fast
            // out of the gate, long soft landing) is the non-linear feel
            // asked for — plain easeOut (tried first) still read as fairly
            // even-paced next to how sharply this decelerates.
            <motion.button
              type="button"
              initial={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              onClick={onOpenTeam}
              className="pointer-events-auto absolute top-full left-0 mt-6 rounded-full border border-[#3B82F6] px-6 py-2.5 text-xs font-extralight tracking-[0.2em] text-[#3B82F6] uppercase transition-colors duration-200 hover:border-white/40 hover:text-white/40"
            >
              Meet the Team
            </motion.button>
          )}
          {/* Below the window, centered under it — mt-24 rather than the
              button's own mt-6 so this sits at the same fixed spot on every
              slide, clear of the button's row (~44px tall) on the one slide
              that has it, instead of the two changing height depending on
              whether the button happens to be mounted. Also anchored to
              windowRef, not blockRef — the photo is the taller of the two
              columns and (like the button) roughly centered the same way the
              headline/body column is, so clearing its own bottom edge clears
              both. */}
          {/* The one part of this subtree that doesn't leave with the rest:
              style.x counter-cancels the parent's slide so these land on the
              middle of the screen instead of following it off (see arrowsX
              above). They're already sitting near the bottom of the viewport
              — the window is 600px tall and vertically centred, and this row
              hangs mt-24 below it — so the "bottom-middle" the Meet the Team
              stage wants needs no vertical move at all, only this
              horizontal one. */}
          <motion.div
            style={{ x: arrowsX }}
            className="pointer-events-none absolute top-full left-1/2 mt-24"
          >
          {/* The half-width centring shift lives on its own element, not
              alongside the motion x above: framer-motion writes an inline
              `transform`, and an inline transform beats Tailwind's
              -translate-x-1/2 outright rather than composing with it, so
              sharing one element would silently drop the centring the moment
              the slide started. */}
          <div className="flex -translate-x-1/2 gap-8">
            {/* Only ever disabled at a genuine end of SLIDES (see
                SlideArrow's own comment) — never while a transition is
                playing. A click mid-transition queues instead of being
                ignored (see pendingIndexRef/startTransition above), so
                there's no window where these should look unusable.
                Once the team stage is open these stop being slide controls
                entirely and become its navigation instead — see
                teamPrev/teamNext in AboutUsSection for what they do there.
                Left is never disabled on that stage: it's the only way back,
                whether that's out of a member's profile or off the stage
                altogether. */}
            <SlideArrow
              direction="left"
              onClick={isTeamOpen ? onTeamPrev : goPrev}
              disabled={isTeamOpen ? false : slideIndex === 0}
            />
            <SlideArrow
              direction="right"
              onClick={isTeamOpen ? onTeamNext : goNext}
              disabled={isTeamOpen ? teamNextDisabled : slideIndex === SLIDES.length - 1}
            />
          </div>
          </motion.div>
        </div>
        {/* Bottom-right, hanging off the image — see GoogleCloudGlassBadge,
            which renders into this exact footprint from the WebGL canvas. */}
        <div ref={badgeAnchorRef} className="absolute aspect-square w-[380px] pointer-events-none" style={{ bottom: '-95px', right: '-95px' }} />
      </div>
    </motion.div>
  )
}

export default AboutUsIntro
