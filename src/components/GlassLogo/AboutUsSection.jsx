import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { motion, useTransform } from 'framer-motion'
import { MathUtils } from 'three'
import { AboutUsIntro } from './AboutUsIntro'
import { GridPlane } from './BackgroundGrid'
import { ABOUT_US_GRID_ZOOM_SCALE, DIRECT_STYLE, THROUGH_GLASS_STYLE } from './gridConstants'
import GridAlignmentOverlay from './GridAlignmentOverlay'
import { gridScreenMetrics } from './gridScreenMetrics'
import { OVERLAY_LAYER } from './GlassLogoGroup'
import { GoogleCloudGlassBadge } from './GoogleCloudGlassBadge'
import { GradientBlob } from './GradientBlob'
import { ReflectionEnvironment } from './ReflectionEnvironment'
import { BLOB_WIDTH_OVERSCALE, GRID_Z, PLANE_SIZE, PLANE_Z } from './sceneConstants'
import { usePerformanceTier } from './usePerformanceTier'
import { useSeamlessGrid } from './useSeamlessGrid'

// Same "second canvas, phase-shifted to continue the hero's own pattern"
// trick BackgroundGlowSection uses to continue the grid below the hero (past
// the clients' carousel) — just shifted one screen *up* instead of down
// (screenOffset -1, see useSeamlessGrid for the shared math), since this
// reads as sitting just above the hero for as long as it's revealed.
//
// The zoom itself is a much simpler version of BackgroundGlowSection's own:
// that one keys a continuous "progress" off the carousel's live scroll
// position because it's zooming *while scrolled through*, landing a
// highlighted edge at an exact pixel target along the way. This section
// isn't scrolled through at all — it's revealed and hidden as a whole (see
// AboutUsSection's own y slide) — so there's no continuous progress to key
// off and no edge to land; how far the reveal has got is the only input the
// zoom needs.
//
// Driven by aboutUsProgress — literally the same motion value the section's
// own y slide reads below, and the same one BackgroundGrid's copy of this
// zoom reads in the other canvas (see GlassLogoPreview) — not a separate
// MathUtils.damp — tried first, and it read as a visible cut: this canvas
// sits directly against the hero's own (separate-canvas) grid along the
// seam between them for the entire slide, so *any* mismatch between how far
// the slide has physically gotten and how far the zoom has eased
// independently shows up immediately as a cell-size jump right at that
// seam. A damp settles on its own schedule — different from, and generally
// faster than, a 1.6s spring — so the zoom was consistently arriving well
// ahead of the slide, sitting at its final (zoomed) size while the seam was
// still visible. Animating a plain 0-1 value with the identical transition
// guarantees the two can never drift apart: the zoom is only ever exactly
// as far along as the slide is, at every instant.
//
// Scaling alone still wasn't enough, even once both grids moved in lockstep
// — see position.y below, and BackgroundGrid's own matching comment for the
// full reasoning: scaling around this group's local origin (this canvas's
// own vertical center) makes the one row of cells actually at the seam
// visibly squeeze together, since both this canvas's cells and the hero's
// drift *toward* the seam as each grows from its own separate center. This
// canvas's own bottom edge (world Y = -gridHeight/2) is the seam (see
// GlassLogoHero's y-slide comment for why the two canvases' facing edges
// are always exactly coincident), so position.y is solved each frame to
// keep whatever pattern feature sits there fixed while everything else
// scales around it, the mirror image of BackgroundGrid's own top-edge
// version.
function SeamlessGridBackdrop({ aboutUsProgress, gridMetricsRef }) {
  const { size, blobWidth, blobY, gridWidth, gridHeight, repeat, yPhaseShiftCells } = useSeamlessGrid(-1)
  // Only the grid planes, not the blob — leaving the blob's own much
  // larger, softer shape untouched keeps it reading as the stable backdrop
  // the grid zooms in front of, the same split BackgroundGlowSection uses.
  // aboutUsProgress is owned and animated by GlassLogoPreview and handed to
  // both canvases — see there for why this is one shared value rather than a
  // spring started independently on each side.
  const gridGroupRef = useRef(null)

  useFrame(() => {
    const group = gridGroupRef.current
    if (!group) return
    const scale = MathUtils.lerp(1, ABOUT_US_GRID_ZOOM_SCALE, aboutUsProgress.get())
    group.scale.set(scale, scale, 1)
    group.position.y = (gridHeight / 2) * (scale - 1)
    // Publish where the cells land, for AboutUsIntro's photo window — see
    // gridScreenMetrics. Written into a plain ref rather than state because
    // it changes on every frame of the zoom and nothing about it should cost
    // a re-render; read the same frame it is written, one element away, the
    // same handoff shape badgeAnchorRef already uses in the other direction.
    if (gridMetricsRef) {
      gridMetricsRef.current = gridScreenMetrics({
        width: size.width,
        height: size.height,
        scale,
        // -1 — this canvas continues the hero's pattern one screen above it,
        // the same offset useSeamlessGrid was given above.
        screenOffset: -1,
      })
    }
  })

  return (
    <>
      <color attach="background" args={['#0F172B']} />
      <GradientBlob position={[0, blobY, PLANE_Z]} scale={[blobWidth * BLOB_WIDTH_OVERSCALE, PLANE_SIZE, 1]} />
      {/* Same layer-0-only, THROUGH_GLASS_STYLE-then-DIRECT_STYLE pairing
          BackgroundGlowSection uses for the same reason — there's no glass
          logo in this canvas either, so both planes composite into what's
          actually seen directly, and the soft plane alone is what gives the
          crisp lines their glow. */}
      <group ref={gridGroupRef}>
        <GridPlane z={GRID_Z} width={gridWidth} height={gridHeight} repeat={repeat} style={THROUGH_GLASS_STYLE} layer={0} yPhaseShiftCells={yPhaseShiftCells} />
        <GridPlane z={GRID_Z} width={gridWidth} height={gridHeight} repeat={repeat} style={DIRECT_STYLE} layer={0} yPhaseShiftCells={yPhaseShiftCells} />
      </group>
    </>
  )
}

// Owns this canvas's one real visible render, for two reasons that both need
// the same hook:
//
//  - The Google Cloud badge's glint overlay lives on OVERLAY_LAYER
//    precisely so its own backdrop capture (a priority-0 useFrame,
//    guaranteed to have already run by the time this one does) can't see
//    it — the same split the hero's own glass logo and the old team panel
//    both relied on.
//  - This section is an always-mounted fixed overlay, so without a gate its
//    canvas would keep drawing every frame for as long as the tab is open,
//    including the great majority of the time it's parked off-screen above
//    the hero. Skipping the render entirely while it's out of view costs
//    the hero nothing.
//
// Giving any useFrame a priority turns off R3F's own automatic render,
// which is what makes taking it over here possible at all — and also why
// the render below has to run unconditionally whenever the section is
// visible, since nothing else will do it.
function SceneRenderGate({ isVisibleRef }) {
  useFrame((state) => {
    if (!isVisibleRef.current) return
    state.camera.layers.enable(OVERLAY_LAYER)
    state.gl.render(state.scene, state.camera)
    state.camera.layers.disable(OVERLAY_LAYER)
  }, 1)
  return null
}

// Tracks a plain DOM element's own real rect (CSS px), measured relative to
// containerRef rather than the viewport — used to position
// GoogleCloudGlassBadge's WebGL plaque exactly under AboutUsIntro's photo,
// from a single source of truth (the DOM layout) rather than two
// independently-maintained copies of the same numbers that would drift the
// moment either side's layout changed.
//
// Relative to the container because the badge is drawn *in* that container's
// own canvas and converts this rect using that canvas's size — see measure()
// below for the whole of it, and for why a viewport rect meant the plaque
// spent every reveal parked a screen above the screen.
//
// Returns [rect, remeasure] — remeasure is exposed, not just called
// internally, because none of this hook's own triggers (ResizeObserver, a
// plain window resize listener) fire for a change of *position* alone, which
// is a real gap: a transform changes where an element paints, not its layout
// size, and neither trigger sees that. It used to be load-bearing, back when
// the section's own slide moved this anchor through every offset between one
// screen up and none — confirmed directly at the time, the first measurement
// (taken while the section was still parked off-screen) was the only one ever
// taken, and the badge rendered off in the dark rather than under the photo.
// Measuring against the container removes that motion from the number
// entirely, so what remains is a safety net for ordinary layout shifts;
// AboutUsSection still calls it when the reveal's progress lands on 0 or 1.
function useDomAnchorRect(ref, containerRef) {
  const [rect, setRect] = useState(null)
  const measureRef = useRef(() => {})

  useEffect(() => {
    const el = ref.current
    if (!el) return
    function measure() {
      const box = el.getBoundingClientRect()
      // Relative to the container, not the viewport, because
      // getBoundingClientRect reports where a thing *paints* — ancestor
      // transforms included — and this section spends nearly all its life
      // translated a whole screen up, then slides through every offset in
      // between. GoogleCloudGlassBadge converts this rect using its canvas's
      // own size, and that canvas is this very section, so a viewport rect
      // hands it the section's transform a second time and puts the plaque
      // one screen out.
      //
      // That is the whole of why the badge used to "arrive late": it was
      // being drawn a screen above the viewport for the entire reveal, and
      // only the remeasure at the very end of the slide brought it back.
      // Subtracting the container cancels the transform (both rects carry
      // it), which leaves a number that is right at every point of the slide
      // and does not change during it at all.
      const container = containerRef?.current?.getBoundingClientRect()
      const originLeft = container?.left ?? 0
      const originTop = container?.top ?? 0
      setRect({
        left: box.left - originLeft,
        top: box.top - originTop,
        width: box.width,
        height: box.height,
      })
    }
    measureRef.current = measure
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref, containerRef])

  return [rect, () => measureRef.current()]
}

// A fixed overlay, not a normal-flow section — the top of the site must
// always be GlassLogoHero, reachable at real scrollY 0 exactly as before
// this existed, with nothing scrollable above it. This never touches real
// document scroll at all: it sits pinned to the viewport, resting just
// above it at (p - 1) * 100% and sliding down to cover the screen as the
// shared reveal progress reaches 1 — the exact opposite of GlassLogoHero's
// own p * 100%, read off that same one number (see aboutUsProgress in
// GlassLogoPreview), so the two are one screen apart by arithmetic and the
// seam between them cannot open up. z-10 (now on the offset
// wrapper below, which is what actually does the positioning): above the
// hero (default stacking) so it visibly covers it once revealed, below the
// navbar's own z-20 so that stays on top throughout.
// Read once at module scope — see GridAlignmentOverlay, ?gridlines to show it.
const SHOW_GRID_LINES = new URLSearchParams(window.location.search).has('gridlines')

export function AboutUsSection({ isOpen, openScrollComp, aboutUsProgress }) {
  const tier = usePerformanceTier()
  const sectionRef = useRef(null)
  const badgeAnchorRef = useRef(null)
  // Cell size and boundary phase in CSS pixels, written every frame by
  // SeamlessGridBackdrop inside the canvas and read by AboutUsIntro outside
  // it, so the photo can sit on whole grid squares rather than near them.
  const gridMetricsRef = useRef(null)
  const [badgeRect, remeasureBadgeRect] = useDomAnchorRect(badgeAnchorRef, sectionRef)
  // Down from just above the viewport as About Us opens — the exact opposite
  // of GlassLogoHero's own offset, derived from the same shared number so the
  // pair is one screen apart at every value it can take (see aboutUsProgress
  // in GlassLogoPreview).
  const slideY = useTransform(aboutUsProgress, (p) => `${(p - 1) * 100}%`)
  // Remeasure the badge anchor once the slide has genuinely landed, which is
  // what this used to get from the section's own onAnimationComplete before
  // the slide moved out to a shared motion value. A settling spring lands
  // exactly on its target, so an equality check here fires once, at the end,
  // and never mid-flight — including when a hurried close retargets it (see
  // ABOUT_US_HURRY_CLOSE_TRANSITION), which onAnimationComplete would have
  // reported twice.
  const remeasureRef = useRef(remeasureBadgeRect)
  remeasureRef.current = remeasureBadgeRect
  useEffect(
    () => aboutUsProgress.on('change', (p) => {
      if (p === 0 || p === 1) remeasureRef.current()
    }),
    [aboutUsProgress],
  )
  // Whether this section is actually painting anywhere on screen — see
  // SceneRenderGate. An IntersectionObserver rather than the isOpen prop:
  // it tracks the section's real painted position, CSS transform included,
  // so it stays true for the whole of the slide-out (during which the
  // section is still very much visible) and only drops once it has genuinely
  // left the viewport, which isOpen — flipping at the *start* of that
  // animation — would get wrong in exactly the way that freezes the last
  // frame on screen mid-slide.
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

  // ReflectionEnvironment's one-time cube bake is paid for at mount, and
  // this section is mounted from the very first frame even though it starts
  // parked off-screen — left eager, that bake lands squarely on top of the
  // hero's own first paint and delays it badly (measured directly, the last
  // time this piece needed the same guard: the hero was still completely
  // blank at 3.4s and only finished at ~6.4s on a local dev server).
  // Deferring it to the browser's first idle moment gets the hero back to
  // painting on its own schedule, while still having the bake fully done
  // long before anyone can reach it (opening it requires either a
  // deliberate scroll-up at the top of the page or a nav click). The isOpen
  // branch is the safety net for the case where someone gets there first
  // anyway.
  const [sceneReady, setSceneReady] = useState(false)
  useEffect(() => {
    if (isOpen) setSceneReady(true)
  }, [isOpen])
  useEffect(() => {
    if (sceneReady) return
    // The timeout is what guarantees it still happens on a page that never
    // goes idle; requestIdleCallback alone could otherwise wait indefinitely.
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(() => setSceneReady(true), { timeout: 4000 })
      return () => cancelIdleCallback(handle)
    }
    const timer = setTimeout(() => setSceneReady(true), 2500)
    return () => clearTimeout(timer)
  }, [sceneReady])

  return (
    // Carries openScrollComp — the pixel offset that hides open()'s snap to
    // the top (see GlassLogoPreview) — for GlassLogoHero's own reason: the
    // section below needs its single translateY for the percentage slide,
    // so the compensation gets an element of its own. This one has to hold
    // the fixed positioning too, not just wrap it: a transformed ancestor
    // becomes the containing block for any fixed descendant, so leaving
    // `fixed` on the section inside would pin it to this wrapper's box the
    // moment the offset went non-zero. The wrapper is fixed instead and the
    // section is absolute within it, which is the same geometry with none
    // of that. pointer-events-none because this covers the viewport even
    // while closed; the section re-enables them for itself when open.
    <motion.div className="pointer-events-none fixed inset-0 z-10" style={{ y: openScrollComp }}>
    <motion.section
      ref={sectionRef}
      style={{ y: slideY }}
      aria-hidden={!isOpen}
      className={`absolute inset-0 h-full w-full overflow-hidden bg-[#0F172B] ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <Canvas dpr={tier === 'high' ? [1, 2] : 1} camera={{ position: [0, 0, 8], fov: 35 }} gl={{ antialias: true, alpha: false }}>
        <SeamlessGridBackdrop aboutUsProgress={aboutUsProgress} gridMetricsRef={gridMetricsRef} />
        {/* Same modest white light the hero gives its own glass (see
            Backdrop) — the blue reflection environment below is meant to be
            the dominant source, this is just enough for the badge's edges
            to catch a highlight. */}
        <directionalLight position={[4, 5, 6]} intensity={0.5} />
        <Suspense fallback={null}>
          {/* Mounted once sceneReady (not remounted per isOpen toggle) — see
              GoogleCloudGlassBadge's own top comment for why its one-time
              setup and its ongoing per-frame cost need two different gates,
              not one. */}
          {sceneReady && <GoogleCloudGlassBadge domRect={badgeRect} isOpen={isOpen} highQuality={tier === 'high'} />}
          {/* Gated on sceneReady (see above), not isOpen, unlike the badge —
              this is a one-time bake (see its own bakedRef guard), not an
              ongoing per-frame cost, so conditionally mounting/unmounting it
              on isOpen (tried first) bought no savings while open and cost a
              full re-bake — six 1024px cube-face renders plus a PMREM
              convolution pass, roughly 80 meshes — every single time About
              Us opened. Confirmed directly: that bake blocking the main
              thread is exactly what read as "scrolling takes a couple of
              seconds to respond" right around opening/closing About Us. The
              badge's material carries envMapIntensity (it's the hero's own
              glassMaterialProps, imported wholesale), so without an
              environment to reflect it would render as a flat, nearly
              featureless slab — the same abstract blue glow bake the hero
              itself uses, holding no scene-specific content, just light. */}
          {sceneReady && tier === 'high' && <ReflectionEnvironment environmentIntensity={1.3} />}
        </Suspense>
        <SceneRenderGate isVisibleRef={isVisibleRef} />
      </Canvas>

      <AboutUsIntro isOpen={isOpen} badgeAnchorRef={badgeAnchorRef} />
      {SHOW_GRID_LINES && <GridAlignmentOverlay gridMetricsRef={gridMetricsRef} />}
    </motion.section>
    </motion.div>
  )
}

export default AboutUsSection
