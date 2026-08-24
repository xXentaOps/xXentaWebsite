import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ABOUT_US_GRID_ZOOM_SCALE } from './gridConstants'
import { gridScreenMetrics } from './gridScreenMetrics'

// teamLayout.js (which used to export this) was deleted along with the old
// hover-based team scene — this is the only place that still needs the
// photo's path, so it's a plain local constant rather than resurrecting
// that file for one string.
const TEAM_PHOTO_SRC = '/team-photo-web.jpg'

// The photo's window, in grid cells. Three across by two down — six squares,
// and deliberately wider than it is tall, because the photo is neither: it
// is taller than two cells at three cells wide, and what is left over is the
// whole point (see PARALLAX_TRAVEL).
const PHOTO_CELLS_X = 3
const PHOTO_CELLS_Y = 2
// How far the photo runs past the window, in cells — how much there is to
// reveal, in other words, and the reason the parallax is worth having.
//
// Set here rather than left to the photo's own proportions, which is what
// this did first and is why nothing appeared to move: the file is 2600x1985,
// so at three cells wide it stands 458px against a 400px window. Fifty-eight
// pixels of overflow, most of which PARALLAX_TRAVEL holds back, came out as
// about twenty pixels of travel — real, and far too small to read as
// anything. Sizing the image to a whole cell past the window instead makes
// the amount hidden a property of the design rather than of whichever
// photograph happens to be in the slot.
const PHOTO_OVERFLOW_CELLS = 1
// Whole cells of breathing room between the window and the right edge of the
// screen. In cells rather than pixels so the margin belongs to the same
// rhythm everything else here is placed on.
const PHOTO_MARGIN_CELLS_X = 0
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

// Which six squares the photo occupies, as whole cell indices off the grid's
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
  // Right-aligned: the last boundary that still fits on screen, less the
  // margin, is the window's right edge.
  const lastBoundary = Math.floor((width - phaseX) / cell)
  const column = lastBoundary - PHOTO_MARGIN_CELLS_X - PHOTO_CELLS_X
  // ...and vertically centred, to the nearest whole cell.
  const row = Math.round((height / 2 - (PHOTO_CELLS_Y * cell) / 2 - phaseY) / cell)
  return { column, row }
}

// Same placeholder-bracket convention the rest of this piece's still-
// unwritten copy uses (see teamData.js, OurMission.jsx's own retired
// version) — three generic slots, not real certification names, so none of
// this could be mistaken for finished content.
const CERTIFICATION_PLACEHOLDERS = ['[ Certification ]', '[ Certification ]', '[ Certification ]']

// The literal "About Us" page — replaces the old Our Mission/Meet the Team
// tabs entirely (see AboutUsSection). The team photo sits in a six-square
// window cut out of the grid on the right, with the Google Cloud glass badge
// underneath it (the badge itself is a separate WebGL element — see
// GoogleCloudGlassBadge — positioned against badgeAnchorRef, a plain empty
// div reserving its footprint in the DOM layout so the two stay in sync
// without either side hardcoding the other's size), and the headline/body/
// certifications block to the left of it.
//
// The photo block is placed against the grid rather than by flow, since
// which squares it covers is the whole point of it; the copy is placed
// against the viewport, and given the room the photo leaves.
export function AboutUsIntro({ isOpen, badgeAnchorRef }) {
  const blockRef = useRef(null)
  const windowRef = useRef(null)
  const imageRef = useRef(null)
  // Where the pointer is asking the photo to sit, -1 (top of the overflow)
  // to 1, and where it has eased to so far.
  const pointerRef = useRef(0)
  const easedRef = useRef(0)
  // How much of the photo is hidden, in px — written by the layout pass, read
  // by the parallax loop, so the loop never has to recompute the layout just
  // to know how far it may move things.
  const overflowRef = useRef(0)

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
    block.style.left = `${phaseX + column * cell}px`
    block.style.top = `${phaseY + row * cell}px`
    const windowHeight = cell * PHOTO_CELLS_Y
    windowEl.style.width = `${cell * PHOTO_CELLS_X}px`
    windowEl.style.height = `${windowHeight}px`
    // Sized rather than measured — see PHOTO_OVERFLOW_CELLS. object-cover on
    // the image then crops whichever axis has to give, so the window is
    // always filled edge to edge whatever shape the photo is.
    const imageHeight = windowHeight + PHOTO_OVERFLOW_CELLS * cell
    image.style.height = `${imageHeight}px`
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
  // grid to arrive underneath it, the six squares are still growing into
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
      if (image && overflow > 0) {
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: isOpen ? 0.5 : 0 }}
      className="pointer-events-none absolute inset-0"
    >
      {/* Left: headline, body copy, certifications. */}
      <div className="absolute top-1/2 left-[6vw] max-w-[420px] -translate-y-1/2 md:left-[8vw]">
        <h1 className="text-[28px] leading-[1.25] font-extralight text-white/90 md:text-[34px]">
          [ A short, catchy line about xXenta — to be added. ]
        </h1>
        <p className="mt-6 text-[13px] leading-[1.9] font-extralight text-white/60">
          [ A paragraph on our work as a small team, and on being a Google
          Cloud partner — to be added. ]
        </p>
        <div className="mt-10 flex items-center gap-6">
          {CERTIFICATION_PLACEHOLDERS.map((label, i) => (
            <div
              key={i}
              className="flex h-14 w-24 items-center justify-center border border-white/10 px-2 text-center text-[8px] leading-tight tracking-[0.15em] text-white/30 uppercase"
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Right: the team photo behind its six-square window, badge below.
          left/top are written every frame by the loop above — see
          photoCellIndices for why nothing here is measured. */}
      <div ref={blockRef} className="absolute">
        <div ref={windowRef} className="overflow-hidden">
          <img
            ref={imageRef}
            src={TEAM_PHOTO_SRC}
            alt="The xXenta team"
            draggable={false}
            // Full window width, natural height — taller than the window,
            // which is what leaves something to reveal. Positioned from the
            // top and moved by transform only, so the overflow maths above
            // has a single, predictable origin to work from.
            className="w-full max-w-none object-cover"
          />
        </div>
        {/* Empty on purpose — see GoogleCloudGlassBadge, which renders into
            this exact footprint from the WebGL canvas underneath. */}
        <div ref={badgeAnchorRef} className="mx-auto mt-8 aspect-square w-[150px]" />
      </div>
    </motion.div>
  )
}

export default AboutUsIntro
