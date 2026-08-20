import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { animate, motion, useMotionValue } from 'framer-motion'
import { MathUtils } from 'three'
import { AboutUsIntro } from './AboutUsIntro'
import { ABOUT_US_TRANSITION } from './aboutUsTransition'
import { GridPlane } from './BackgroundGrid'
import { ABOUT_US_GRID_ZOOM_SCALE, DIRECT_STYLE, THROUGH_GLASS_STYLE } from './gridConstants'
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
// off and no edge to land; isOpen is the only input the zoom needs.
//
// Driven by a framer-motion value animated with ABOUT_US_TRANSITION itself
// (the exact same spring instance the section's own y slide uses below, and
// BackgroundGrid's own copy of this same zoom uses too), not a separate
// MathUtils.damp — tried first, and it read as a visible cut: this canvas
// sits directly against the hero's own (separate-canvas) grid along the
// seam between them for the entire slide, so *any* mismatch between how far
// the slide has physically gotten and how far the zoom has eased
// independently shows up immediately as a cell-size jump right at that
// seam. A damp settles on its own schedule — different from, and generally
// faster than, an 1.8s spring — so the zoom was consistently arriving well
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
function SeamlessGridBackdrop({ isOpen }) {
  const { blobWidth, blobY, gridWidth, gridHeight, repeat, yPhaseShiftCells } = useSeamlessGrid(-1)
  // Only the grid planes, not the blob — leaving the blob's own much
  // larger, softer shape untouched keeps it reading as the stable backdrop
  // the grid zooms in front of, the same split BackgroundGlowSection uses.
  const gridGroupRef = useRef(null)
  const zoomProgress = useMotionValue(isOpen ? 1 : 0)

  useEffect(() => {
    const controls = animate(zoomProgress, isOpen ? 1 : 0, ABOUT_US_TRANSITION)
    return () => controls.stop()
  }, [isOpen, zoomProgress])

  useFrame(() => {
    const group = gridGroupRef.current
    if (!group) return
    const scale = MathUtils.lerp(1, ABOUT_US_GRID_ZOOM_SCALE, zoomProgress.get())
    group.scale.set(scale, scale, 1)
    group.position.y = (gridHeight / 2) * (scale - 1)
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

// Tracks a plain DOM element's own real screen rect (CSS px, viewport-
// relative) — used to position GoogleCloudGlassBadge's WebGL plaque exactly
// under AboutUsIntro's photo, from a single source of truth (the DOM
// layout) rather than two independently-maintained copies of the same
// numbers that would drift the moment either side's layout changed.
//
// Returns [rect, remeasure] — remeasure is exposed, not just called
// internally, because none of this hook's own triggers (ResizeObserver, a
// plain window resize listener) fire for the one thing that actually moves
// this anchor: the whole section's own CSS transform sliding it in from
// y:-100%. A transform changes where an element paints, not its layout size,
// so neither trigger sees it — confirmed directly, the very first measurement
// (taken the instant this section mounts, while it's still sitting off-
// screen above the viewport) was the *only* one ever taken, leaving the
// badge positioned using a rect from before the slide-in ever happened
// (top around -410px on a 1000px-tall screen) and never updated again,
// which is why it rendered somewhere off in the dark rather than under the
// photo. AboutUsSection calls remeasure from the section's own
// onAnimationComplete, once the slide genuinely finishes.
function useDomAnchorRect(ref) {
  const [rect, setRect] = useState(null)
  const measureRef = useRef(() => {})

  useEffect(() => {
    const el = ref.current
    if (!el) return
    function measure() {
      const box = el.getBoundingClientRect()
      setRect({ left: box.left, top: box.top, width: box.width, height: box.height })
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
  }, [ref])

  return [rect, () => measureRef.current()]
}

// A fixed overlay, not a normal-flow section — the top of the site must
// always be GlassLogoHero, reachable at real scrollY 0 exactly as before
// this existed, with nothing scrollable above it. This never touches real
// document scroll at all: it sits pinned to the viewport, resting just
// above it (y: '-100%') until isOpen flips, then slides down to cover the
// screen (y: '0%') — see ABOUT_US_TRANSITION, shared with GlassLogoHero's
// own opposite slide (0% -> 100%, down and out) so the two move in lock-
// step and the seam between them never opens up. z-10: above the hero
// (default stacking) so it visibly covers it once revealed, below the
// navbar's own z-20 so that stays on top throughout.
export function AboutUsSection({ isOpen }) {
  const tier = usePerformanceTier()
  const sectionRef = useRef(null)
  const badgeAnchorRef = useRef(null)
  const [badgeRect, remeasureBadgeRect] = useDomAnchorRect(badgeAnchorRef)
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
    <motion.section
      ref={sectionRef}
      initial={false}
      animate={{ y: isOpen ? '0%' : '-100%' }}
      transition={ABOUT_US_TRANSITION}
      onAnimationComplete={remeasureBadgeRect}
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-10 h-screen w-full overflow-hidden bg-[#0F172B] ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <Canvas dpr={tier === 'high' ? [1, 2] : 1} camera={{ position: [0, 0, 8], fov: 35 }} gl={{ antialias: true, alpha: false }}>
        <SeamlessGridBackdrop isOpen={isOpen} />
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
    </motion.section>
  )
}

export default AboutUsSection
