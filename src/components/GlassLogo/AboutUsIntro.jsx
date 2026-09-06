import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useTransform } from 'framer-motion'
import { MAIN_SLIDE_VW, mainSlidePx } from './teamTransition'
import { CornerBrackets } from './CornerBrackets'
import { SLIDES } from './aboutUsSlides'
import { AboutUsStats } from './AboutUsStats'
// Which grid squares this page's content sits on — its own module now that
// AboutUsSection's canvas needs the same answers to put its ambient squares
// on the stats' own cells. See that file's own comment.
import {
  aboutUsGridMetrics,
  photoCellIndices,
  PHOTO_CELLS_X,
  PHOTO_CELLS_Y,
  statsCellIndices,
  STATS_CELLS_X,
  TEXT_ROW_OFFSET,
} from './aboutUsGridCells'

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

// The "Meet the Team" pill's own resting width, in px — a fixed target for
// the right-arrow-slot morph's width animation (see its own comment), not
// an auto/content-based width, since framer-motion can only tween real
// numbers. A first guess sized to fit "Meet the Team" at that slot's own
// text-xs/tracking-[0.2em]/uppercase plus its 20px side padding — tune
// live if the label ever looks cramped or the pill overly roomy.
const PILL_WIDTH = 172

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
// without either side hardcoding the other's size), and the stats/headline/
// body block to the left of it.
//
// That left column used to end in the Google Cloud Partner plaque (a second
// glass mesh, anchored the same way the photo's badge still is), with the
// copy centred on the viewport above it. Both are gone: the plaque was
// removed outright, and the copy moved down onto the grid roughly where it
// sat, with three animated figures (see AboutUsStats) taking the space above.
//
// The photo block, the stats, and now the copy are all placed against the
// grid rather than by flow, since which squares they land on is the point of
// them; the copy's own *width* is still whatever room the photo leaves.
export function AboutUsIntro({
  isOpen,
  // The reveal's own 0->1 progress — forwarded straight to AboutUsStats,
  // which starts its counters when this actually *lands* rather than when
  // isOpen flips (see its own comment for why those are a full 1.6s apart).
  aboutUsProgress,
  badgeAnchorRef,
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
  // The three-square stats block — positioned entirely by the layout pass
  // (see applyLayout), like the photo block, since which squares it lands
  // on is the whole point of it.
  const statsRef = useRef(null)
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
  // Whether the right arrow slot is currently the "Meet the Team" pill
  // instead of a real arrow — see that slot's own render for the morph
  // between the two.
  const showMeetButton = !isTeamOpen && slideIndex === SLIDES.length - 1
  // Which SLIDES index (if any) is the outgoing photo dissolving away right
  // now — that's *all* a dissolve needs to track. Every slide's own <img> is
  // permanently mounted below (see the window JSX), src never changes on any
  // of them, so there's nothing left to snapshot: the outgoing photo is
  // already sitting on screen, already decoded, at whatever height/transform
  // the shared wrapper below has (which is itself frozen for the whole
  // dissolve — see the parallax loop's own outgoingRef gate). This replaces
  // an earlier version that swapped `src` on one shared <img> and painted a
  // frozen snapshot of the previous photo on top of it — reported as a
  // flash of white on a photo's first-ever appearance in the session, since
  // swapping `src` on an element that's already showing something blanks it
  // until the new bitmap decodes, no matter how well-warmed the browser's
  // network cache is. Never swapping `src` at all removes that gap
  // entirely, the same way MeetTheTeamGrid's own detail-photo swap does (see
  // that file's own SWAP_ENTER_TRANSITION/SWAP_EXIT_TRANSITION) — every
  // photo there is mounted from the very first render too.
  const [outgoingIndex, setOutgoingIndex] = useState(null)
  // Mirrors outgoingIndex for startTransition below (and the parallax loop
  // further down), read off a ref rather than the state directly so both
  // always see whether a dissolve is *currently* playing without waiting on
  // a re-render to catch up.
  const outgoingRef = useRef(null)
  outgoingRef.current = outgoingIndex
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
  // transitions can't share one outgoing index: a click landing mid-fade
  // used to replace that index outright, which popped straight to the new
  // photo with nothing to transition from (reported as the previous picture
  // "flashing" mid-transition). Queuing means a fast run of clicks plays out
  // as a clean chain of full dissolves, landing wherever the *last* click
  // asked for.
  const pendingIndexRef = useRef(null)

  // Matches PhotoBackdropCapture's own CROSSFADE_MS and cubic-bezier(0.4,0,
  // 0.2,1) exactly (that file's own comment explains why the Google Cloud
  // badge's reflected dissolve has to stay in lockstep with this one, not
  // just a same-shaped approximation) — framer-motion accepts a bezier
  // control-point array directly, so there's no need for a hand-rolled
  // curve-sampler here the way that WebGL side still needs one.
  const CROSSFADE_TRANSITION = { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
  // The incoming photo snaps straight to its resting opacity instead of
  // fading in — there's nothing to see it fade in *against*, since the
  // outgoing photo is still opaque on top of it (same reasoning as
  // MeetTheTeamGrid's own SWAP_ENTER_TRANSITION).
  const SNAP_TRANSITION = { duration: 0 }

  // Ends the current dissolve and immediately starts whatever queued up
  // during it. Called from the outgoing layer's own onAnimationComplete
  // (see the window JSX below), so this fires exactly when the fade
  // actually finishes rather than on a separately-guessed timer.
  const finishTransition = () => {
    const pending = pendingIndexRef.current
    pendingIndexRef.current = null
    setOutgoingIndex(null)
    if (pending != null && pending !== slideIndexRef.current) {
      beginTransition(pending)
    }
  }

  // Marks the *current* slide as the one now dissolving away and switches to
  // the target. Unconditional — callers (startTransition, and
  // finishTransition draining the queue) are what decide whether a
  // transition should start at all.
  const beginTransition = (targetIndex) => {
    setOutgoingIndex(slideIndexRef.current)
    setSlideIndex(targetIndex)
    slideIndexRef.current = targetIndex
  }

  const startTransition = (targetIndex) => {
    if (targetIndex === slideIndexRef.current) return
    if (outgoingRef.current != null) {
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

  // Bubbles the current slide's photo up — same "report state, don't lift
  // it" shape as BackgroundGrid's own onActiveIndexChange — so AboutUsSection
  // can hand the Google Cloud badge's glass the *actual* photo sitting
  // behind it (see PhotoBackdropCapture there) instead of a hardcoded one.
  // useLayoutEffect, not useEffect: this is the first hop in the relay that
  // gets the new photo to the badge (AboutUsIntro -> AboutUsSection's own
  // currentPhoto state -> the src prop PhotoBackdropCapture's own
  // useLayoutEffect below reacts to). A passive effect only runs once the
  // browser is idle enough to schedule it, and on this dev setup's software
  // WebGL fallback the main thread is busy enough, often enough, that each
  // such wait was stacking into a real, visible delay — the badge still
  // showing the old photo noticeably after the DOM had already moved on to
  // the new one. useLayoutEffect runs synchronously in the commit phase
  // instead, ahead of paint, closing that gap at its source.
  useLayoutEffect(() => {
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
  // 130 — up from 90 — asked for directly, "a little bit shorter
  // horizontally": this gap now shrinks the body copy too (see the JSX;
  // both heading and paragraph fill textColumnRef's own max-width), so the
  // same small nudge narrows the whole column rather than just the heading.
  const HEADING_RIGHT_GAP_PX = 130

  // How much further right than the stats' own grid square the text column
  // starts. The stats block's own left edge (statsLeftPx below) is the
  // *square's* edge, not where "12.4K" itself visually begins — that number
  // is centred inside its square (see AboutUsStats' own items-center), so
  // the actual gap between it and the screen's edge is the square's own
  // gap plus however far the glyph sits in from that square's left edge.
  // Asked for directly: the text column should start level with the
  // digits, not the square. A hand-tuned constant rather than a measured
  // one — the digits are mid-count for two seconds after the reveal lands
  // (see AboutUsStats), so measuring the live rendered inset would shift
  // this column sideways while the number is still counting, which is far
  // worse than a fixed guess that's a few px off.
  const TEXT_COLUMN_INSET_PX = 24
  // A small nudge down from the row's own top edge — TEXT_ROW_OFFSET picks
  // the row, this is what actually centres the block inside it. The column
  // is top-anchored (its own content sits at whatever height the headline
  // and body happen to wrap to, not stretched to fill the cell), so without
  // this it reads as sitting in the upper part of the row rather than its
  // middle. Asked for directly, "a tiny little bit" — a small hand-tuned
  // value, not a real vertical-centring calculation against the column's
  // own (variable, per-slide) height.
  const TEXT_ROW_NUDGE_PX = 14

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
    // Where the stats' own left edge lands — the first cell boundary at or
    // after the page's shared margin, rounded out to the grid (see
    // statsCellIndices). Computed once here and used for both the stats
    // block below and the text column just above it, so the two can share
    // one left edge exactly rather than the text using the raw margin and
    // the stats independently rounding out from it, which is what put a few
    // px of daylight between "12.4K" and the headline above it.
    const stats = statsCellIndices(window.innerWidth, window.innerHeight)
    const statsLeftPx = phaseX + stats.column * cell
    // The text column's own edge — TEXT_COLUMN_INSET_PX further right than
    // the square itself, to land level with "12.4K" rather than with the
    // square's own boundary. Only the text uses this; the stats block below
    // still sits at the bare statsLeftPx, since it's the square that has to
    // stay grid-aligned, not the column drawn on top of it.
    const textLeftPx = statsLeftPx + TEXT_COLUMN_INSET_PX
    if (textColumnRef.current) {
      textColumnRef.current.style.left = `${textLeftPx}px`
      // Whatever's left between the text column's own left edge and the
      // photo's, minus the gap above, is exactly how wide the heading
      // (unconstrained by its own width now — see the JSX) can get without
      // ever touching it. The body copy keeps its own, tighter width (see
      // the JSX) regardless of how wide this column itself is allowed to
      // grow. Measured from textLeftPx, not the raw margin, now that the
      // column starts there instead — the margin alone would overstate how
      // much room is actually available past the new, further-right edge.
      textColumnRef.current.style.maxWidth = `${photoLeftPx - textLeftPx - HEADING_RIGHT_GAP_PX}px`
      // Placed on the grid now rather than vertically centred on the
      // viewport, which is what it used to be (top-1/2 -translate-y-1/2).
      // Centring put the copy in the upper-middle of the screen with the
      // Google Cloud plaque filling the space beneath it; with that plaque
      // gone the column was asked to sit lower, roughly where the plaque
      // itself had been. Anchoring it to a whole row of the same grid the
      // photo and the stats are on gets that without a hand-tuned pixel
      // offset, and keeps all three agreeing about where "down" is at any
      // viewport size.
      textColumnRef.current.style.top = `${phaseY + (row + TEXT_ROW_OFFSET) * cell + TEXT_ROW_NUDGE_PX}px`
    }
    // The stats span STATS_CELLS_X whole squares from statsLeftPx, level
    // with the row the photo begins on. Their cell indices come from the
    // shared helper rather than being worked out here, since AboutUsSection's
    // ambient squares have to land on these exact same cells.
    if (statsRef.current) {
      statsRef.current.style.left = `${statsLeftPx}px`
      statsRef.current.style.top = `${phaseY + stats.row * cell}px`
      statsRef.current.style.width = `${cell * STATS_CELLS_X}px`
      statsRef.current.style.height = `${cell}px`
    }
    return imageHeight - windowHeight
  }, [windowRef])

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
        aboutUsGridMetrics(window.innerWidth, window.innerHeight),
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
    if (!isOpen || isTeamOpen) return
    let frame = 0
    let last = performance.now()

    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const image = imageRef.current
      const overflow = overflowRef.current
      // Paused for the duration of a crossfade (outgoingRef non-null; a
      // loose-equality null check, not plain truthiness, since a slide-0
      // outgoingIndex is falsy but very much an active dissolve) — every
      // photo shares this one wrapper's height/transform now (see the window
      // JSX below), so nudging it every frame while a dissolve plays would
      // move the outgoing photo along with the incoming one mid-fade,
      // reading as a jump/jitter right as the swap landed — worse the more
      // the pointer had moved during that half-second. Also skips the easing
      // math itself, not just the write: catching easedRef up to the live
      // pointer position while frozen would have made parallax resume with a
      // snap the instant the transition ended, instead of continuing
      // smoothly from wherever it left off.
      if (image && overflow > 0 && outgoingRef.current == null) {
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
  }, [isOpen, isTeamOpen])

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
      style={{ x: mainX, willChange: 'transform' }}
      className="pointer-events-none absolute inset-0 z-50"
    >
      {/* Left: headline and body copy. A fixed 280px (tried first, for the
          whole column, then 300px for just the heading, then kept for the
          body alone once the heading moved off it) needed bumping every
          time it was asked to grow, because the real available room isn't
          fixed at all — the photo's own left edge moves with the viewport
          width (see photoCellIndices) while this column's own left margin
          barely does, so a guessed constant was either leaving real space
          unused on a wide window or already too tight on a narrower one.
          textColumnRef's own max-width (set in applyLayout, from the actual
          measured gap) replaces that guessing for both now — asked for
          directly, the body should get the same room as the heading rather
          than a tighter width of its own. */}
      {/* Three animated figures on three whole grid squares, level with the
          row the photo starts on — left/top/width/height all written by the
          layout pass above (see statsRef), never by flow, so they sit *on*
          the grid's own squares the same way the photo window does rather
          than merely near them. This replaced the Google Cloud Partner
          plaque that used to sit at the bottom of the copy column. */}
      <div ref={statsRef} className="pointer-events-none absolute">
        <AboutUsStats aboutUsProgress={aboutUsProgress} slideIndex={slideIndex} />
      </div>

      {/* left/top/maxWidth all written by the layout pass above now — left
          used to be a static PAGE_MARGIN_VH here, before the column was
          asked to start at the stats' own left edge instead (see
          statsLeftPx above), which only the layout pass can answer since it
          depends on the grid's phase. */}
      <div ref={textColumnRef} className="absolute">
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
            {/* No max-w of its own any more — asked for directly, the same
                room the heading gets rather than a tighter fixed 280px.
                Both now simply fill whatever textColumnRef's own maxWidth
                (set imperatively, see applyLayout) allows. */}
            <p className="mt-6 text-[13px] leading-[1.9] font-extralight text-white/60">
              {slide.body}
            </p>
            {/* A second paragraph — its own block, a real line break from
                the one above, not more sentences appended to it. Same
                classes as the first (asked for directly, not a smaller/
                dimmer secondary note, which an earlier version of this
                wrongly read "shorter" as). Conditional on slide.bodySecondary
                existing, so slides that don't have one yet don't render an
                empty gap. */}
            {slide.bodySecondary && (
              <p className="mt-6 text-[13px] leading-[1.9] font-extralight text-white/60">
                {slide.bodySecondary}
              </p>
            )}
          </motion.div>
        </AnimatePresence>
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
            {/* imageRef now sits on this wrapper, not on any individual
                photo — every slide's own <img> below is permanently
                mounted, `src` never changes on any of them, so the
                height/transform the layout and parallax logic above sets
                imperatively has to live one level up, shared by all of them.
                That's also what makes the crossfade below correct for free:
                since this wrapper is the one thing frozen for a dissolve's
                whole duration (see the parallax loop's own outgoingRef
                gate), every photo inside it is already sitting at the exact
                same position/size, with nothing to snapshot.
                Full width, natural (taller-than-the-window) height —
                positioned from the top and moved by transform only, so the
                overflow maths above has a single, predictable origin to
                work from. */}
            <div ref={imageRef} className="relative w-full max-w-none">
              {/* Every slide's photo, always mounted, `src` never changing —
                  the same "nothing to swap, nothing to wait on" shape
                  MeetTheTeamGrid's own detail photos use (see that file's
                  MEMBERS.map: every member's tile exists from the very first
                  render, whether selected or not). A version of this that
                  swapped `src` on one shared node used to read as a flash of
                  white on a photo's first-ever appearance in the session —
                  changing `src` on an <img> that's already showing something
                  blanks it until the new bitmap decodes, no matter how early
                  the network request for that URL was warmed. Mounting every
                  photo up front sidesteps that entirely: the browser decodes
                  each one once, the first time this component renders, long
                  before any of them are ever the one dissolving in.
                  The current slide snaps straight to its resting opacity
                  (SNAP_TRANSITION) — nothing to fade in against, since the
                  outgoing photo is still opaque on top of it. The one
                  dissolving away animates its opacity down over
                  CROSSFADE_TRANSITION and calls finishTransition when that
                  lands; every other photo just sits hidden at 0. */}
              {SLIDES.map((s, index) => {
                const isCurrent = index === slideIndex
                const isOutgoing = index === outgoingIndex
                return (
                  // The opacity animation lives on this wrapper, not on the
                  // <img> itself — exactly the split MeetTheTeamGrid's own
                  // tiles use (motion.button owns the animated transform,
                  // the plain <img> inside it never has an animate prop of
                  // its own). The photo is then just static content the
                  // browser rasterizes once and never touches again; only
                  // the already-rasterized layer's alpha changes frame to
                  // frame, the cheapest thing a compositor can do. Animating
                  // opacity straight on the <img> instead (tried first) put
                  // the image's own bitmap on the thing being faded, and
                  // frame-1 of that layer read as blank/white before the
                  // bitmap made it in.
                  <motion.div
                    key={s.photo}
                    animate={{ opacity: isCurrent ? 0.8 : 0 }}
                    transition={isOutgoing ? CROSSFADE_TRANSITION : SNAP_TRANSITION}
                    onAnimationComplete={isOutgoing ? finishTransition : undefined}
                    // Only the currently-outgoing photo needs to sit above
                    // its siblings while it dissolves; the rest share the
                    // same DOM order every render, so no other z-index is
                    // needed to keep them visually stable.
                    className="pointer-events-none absolute inset-0"
                    style={{ zIndex: isOutgoing ? 1 : 0 }}
                  >
                    <img
                      src={s.photo}
                      alt={s.alt}
                      draggable={false}
                      className="h-full w-full object-cover"
                    />
                  </motion.div>
                )
              })}
            </div>
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
          {/* Below the window, left-aligned. Absolutely positioned against
              windowRef (not a normal-flow sibling inside blockRef) so it
              can't grow blockRef's own box: badgeAnchorRef's bottom/right
              offsets are measured from that box, and this can't be the
              thing that moves them.
              Context for the image itself, on every slide now — this used
              to be the "Meet the Team" button (showButton-gated, only on
              the last/group-photo slide), moved to replace the right arrow
              once the slideshow reaches its own last slide (see that
              arrow's own comment below) since it's the more natural
              "arrived at the end" cue there. Holds the picture's actual
              description now (event + context), not just a short label, so
              no `uppercase`/wide `tracking` — both cost horizontal room per
              character, working directly against fitting a real sentence
              instead of one or two capitalized words. max-w wraps it into
              a short block instead of one long line running past the
              photo's own edge. key={slideIndex} is what replays the
              entrance below on every slide — this is no longer
              conditionally mounted (the old && unmount/remount did that job
              before), so without it React would just update this element's
              text in place rather than treating each slide's caption as a
              fresh arrival. Same arriving motion the button used to have:
              descends the last little bit into its resting spot (16px reads
              as a settle, not a slide-in) while sharpening from a soft blur,
              on the same ease-out-expo-shaped curve. */}
          <motion.p
            key={slideIndex}
            initial={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute top-full left-0 mt-6 max-w-[420px] text-xs leading-[1.7] font-extralight text-white/50"
          >
            {slide.alt}
          </motion.p>
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
            style={{ x: arrowsX, willChange: 'transform' }}
            className="pointer-events-none absolute top-full left-0 flex w-full justify-center mt-24"
          >
          {/* Centred via real flexbox (justify-center on the wrapper above),
              not the left-1/2 + child's own -translate-x-1/2 trick this used
              before — that combination doesn't animate at all. No `layout`
              prop here any more either (a plain one, then layout="position",
              were each tried and both still read as their own kind of
              unwanted extra motion layered on top): now that the button's
              own width animates via a real CSS property instead of a
              `layout` scale-trick (see that button's own comment), this
              row's reflow — the left arrow included — is already genuinely
              gradual, frame by frame, following the browser's own normal
              layout response to that real width change. No framer smoothing
              left to add here; it would only be smoothing something that's
              already smooth. */}
          <div className="flex gap-8">
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
            {/* The old "Meet the Team" button (see the caption above for
                where its own arriving animation went instead) now lives
                here, replacing the right arrow specifically once the
                slideshow has nowhere further right to go — the arrow
                would otherwise just sit there disabled. Once the team
                stage is open this slot goes back to being a real arrow
                (team detail navigation), regardless of which slide the
                slideshow was left on.
                A real morph, not a crossfade between two elements — asked
                for directly, explicitly rejecting a fade: "the circle
                border of the right arrow should extend to become the pill
                ... the arrow becoming the text as it expands." One
                persistent <motion.button> (never unmounted, unlike the
                SlideArrow-in-a-wrapper this had a moment ago).
                animate={{width, ...}} on real CSS width/padding, not a
                `layout` prop — `layout` was tried first, and its FLIP
                technique animates size via a *scale* transform under the
                hood, which distorts a rounded-full pill's own curved ends
                as it stretches (they briefly go oval instead of staying
                circular) — reported directly as "stretching too much,
                unnecessarily." Animating the real width property instead
                has the browser reflow it genuinely, frame by frame, so
                border-radius stays correct throughout and the row/left
                arrow outside this button reflow in step automatically —
                no separate `layout` needed on that row any more either
                (see its own comment). PILL_WIDTH is a first-guess fixed
                target (enough for "Meet the Team" at this tracking/size
                plus its own padding) rather than an animatable `auto`,
                since framer can only tween real numbers. The icon and
                label are two absolutely-unrelated children swapped via
                AnimatePresence *inside* this same button (mode="popLayout"
                so the exiting one is pulled out of flow immediately and
                can't skew the button's own width measurement while both
                are briefly present) — delayed fade-in on the incoming one
                (~half the width transition) is what makes the label/arrow
                read as resolving into place once the shape has room for
                it, rather than both edges (border and glyph) moving in
                perfect lockstep. */}
            <motion.button
              type="button"
              onClick={isTeamOpen ? onTeamNext : showMeetButton ? onOpenTeam : goNext}
              disabled={isTeamOpen ? teamNextDisabled : false}
              animate={{
                width: showMeetButton ? PILL_WIDTH : 44,
                paddingLeft: showMeetButton ? 20 : 0,
                paddingRight: showMeetButton ? 20 : 0,
              }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              className="pointer-events-auto relative flex h-11 items-center justify-center overflow-hidden rounded-full border border-[#3B82F6] text-[#3B82F6] transition-colors duration-200 hover:border-white/40 hover:text-white/40 disabled:pointer-events-none disabled:opacity-25 disabled:hover:border-[#3B82F6] disabled:hover:text-[#3B82F6]"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {showMeetButton ? (
                  <motion.span
                    key="label"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.22, duration: 0.2 } }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    className="text-xs font-extralight tracking-[0.2em] whitespace-nowrap uppercase"
                  >
                    Meet the Team
                  </motion.span>
                ) : (
                  <motion.svg
                    key="arrow"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.22, duration: 0.15 } }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  >
                    <path d="M10 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </motion.svg>
                )}
              </AnimatePresence>
            </motion.button>
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
