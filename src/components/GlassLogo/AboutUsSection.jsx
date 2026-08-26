import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { motion, useTransform } from 'framer-motion'
import { MathUtils } from 'three'
import { AboutUsIntro, TEAM_PHOTO_SRC } from './AboutUsIntro'
import { GridPlane } from './BackgroundGrid'
import { ABOUT_US_GRID_ZOOM_SCALE, DIRECT_STYLE, THROUGH_GLASS_STYLE } from './gridConstants'
import GridAlignmentOverlay from './GridAlignmentOverlay'
import { gridScreenMetrics } from './gridScreenMetrics'
import { OVERLAY_LAYER } from './GlassLogoGroup'
import { GlassCircle } from './GlassCircle'
import { GoogleCloudGlassBadge } from './GoogleCloudGlassBadge'
import { GradientBlob } from './GradientBlob'
import { CAPTURE_LAYER, CaptureLayerGate, CornerBracketCapture, PhotoBackdropCapture } from './PhotoBackdropCapture'
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
// GridPlane converts every pixel dimension in a style (line widths, blurs)
// to a UV-space fraction via a *fixed* px/TARGET_CELL_PX ratio (see
// pxToFraction in BackgroundGrid.jsx) — it has no way to know that whatever
// renders it will later be scaled. gridGroupRef below scales this whole
// group up by ABOUT_US_GRID_ZOOM_SCALE once About Us is open (to 1.25x, the
// zoomed-in read this section wants), which magnifies those already-fixed
// UV fractions right along with the geometry: a blur baked in for a crisp
// 11px on screen renders at 13.75px once the 1.25x transform lands, 25%
// softer than the *same style constant* produces in the hero's own grid,
// which is never scaled at all. Confirmed directly by comparing the two
// side by side — this is what read as "the About Us grid is blurrier than
// the hero's, and I never asked for that." Pre-dividing every pixel value
// by the settled zoom scale here cancels the transform's own magnification,
// so the *rendered* blur/line-width lands back at the same absolute size
// the hero's unscaled grid shows, matching it exactly once the zoom has
// settled at 1.25x (the state actually being compared) — not exactly
// mid-transition, when the live scale is still short of that target, but
// that's a brief ~1.6s window, not the resting state anyone is judging this
// against.
function scaleStyleForZoom(style, scale, opacityScale = 1) {
  const scaled = { ...style }
  for (const key of Object.keys(scaled)) {
    if (key.endsWith('Px')) scaled[key] /= scale
    else if (key.endsWith('Opacity')) scaled[key] *= opacityScale
  }
  return scaled
}

function SeamlessGridBackdrop({
  aboutUsProgress,
  gridMetricsRef,
  includeBackground = true,
  includeCrispLines = true,
  // Only the soft THROUGH_GLASS_STYLE plane — not DIRECT_STYLE, and not the
  // badge's own capture-only copy (see CaptureGridBackdrop, which keeps this
  // at the default 1: the whole point there is for it to read clearly once
  // seen through the glass). Tried toning this down for this canvas's own
  // direct render (un-refracted, it read as more present than the hero's own
  // grid once the zoom-scale blur bug above stopped washing it out) — reverted:
  // this plane is the *only* thing that reliably supplies the soft glow during
  // the reveal itself. GlassCircle's own refraction of it reads as noticeably
  // blurrier, but GlassCircle is gated behind sceneReady and (on first open,
  // before the idle-callback prewarm has finished) a multi-second synchronous
  // ReflectionEnvironment bake — so a visitor who scrolls up before that
  // prewarm lands sees only crisp DIRECT_STYLE lines with no glow at all for
  // as long as the bake takes. This plane can't depend on that finishing to
  // be legible.
  throughGlassOpacityScale = 1,
}) {
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
      {/* Skipped for the badge's own capture-only copy below (see
          CaptureGridBackdrop) — a scene.background attach applies to the
          canvas's real, visible render too, not just TransmissionMaterial's
          internal capture, and would paint over that canvas's alpha:true
          transparency with solid navy. */}
      {includeBackground && <color attach="background" args={['#0F172B']} />}
      <GradientBlob position={[0, blobY, PLANE_Z]} scale={[blobWidth * BLOB_WIDTH_OVERSCALE, PLANE_SIZE, 1]} />
      {/* Same layer-0-only, THROUGH_GLASS_STYLE-then-DIRECT_STYLE pairing
          BackgroundGlowSection uses for the same reason — there's no glass
          logo in this canvas either, so both planes composite into what's
          actually seen directly, and the soft plane alone is what gives the
          crisp lines their glow. */}
      <group ref={gridGroupRef}>
        <GridPlane z={GRID_Z} width={gridWidth} height={gridHeight} repeat={repeat} style={scaleStyleForZoom(THROUGH_GLASS_STYLE, ABOUT_US_GRID_ZOOM_SCALE, throughGlassOpacityScale)} layer={0} yPhaseShiftCells={yPhaseShiftCells} />
        {/* Skipped for the badge's own capture-only copy (see
            CaptureGridBackdrop) — the hero's own glass logo never refracts
            this crisp plane either (see BackgroundGrid.jsx, where it sits on
            OVERLAY_LAYER specifically to stay out of the glass's backdrop
            capture); only THROUGH_GLASS_STYLE, the soft one above, is meant
            to be seen *through* glass. Left on layer 0 here regardless of
            includeCrispLines, same as always, since only this prop (not the
            layer) decides whether it renders at all in a given copy. */}
        {includeCrispLines && (
          <GridPlane z={GRID_Z} width={gridWidth} height={gridHeight} repeat={repeat} style={scaleStyleForZoom(DIRECT_STYLE, ABOUT_US_GRID_ZOOM_SCALE)} layer={0} yPhaseShiftCells={yPhaseShiftCells} />
        )}
      </group>
    </>
  )
}

// A second copy of the grid+blob, mounted in the badge's own overlay canvas
// (see PhotoBackdropCapture for why that canvas exists at all) so the
// badge's glass has it to refract wherever the badge hangs off the photo's
// edge — the "blurred grid" look this piece had before the badge moved to
// its own canvas, lost when that canvas's only backdrop content became the
// photo. On CAPTURE_LAYER only (see PhotoBackdropCapture's own top
// comment): invisible in this canvas's real render, present only for
// TransmissionMaterial's internal capture pass. A group-traverse rather
// than per-mesh layer props because GradientBlob doesn't expose one the way
// GridPlane does, and traversing once covers both uniformly regardless.
//
// includeCrispLines={false} — confirmed directly against BackgroundGrid.jsx
// (the hero's own grid): its crisp DIRECT_STYLE plane sits on OVERLAY_LAYER
// specifically to stay out of the hero glass logo's own backdrop capture,
// so what that glass refracts is only ever the soft THROUGH_GLASS_STYLE
// plane. The first version of this component included both — reusing the
// *other* SeamlessGridBackdrop usage's "both on layer 0" pairing, which is
// only correct there because that copy has no glass reading it — so the
// badge's own glass was refracting crisp lines the hero's never does,
// reading as noticeably less blurred by comparison. Dropping the crisp
// plane entirely (not just re-layering it) matches the hero exactly.
function CaptureGridBackdrop({ aboutUsProgress }) {
  const groupRef = useRef(null)
  useEffect(() => {
    groupRef.current?.traverse((obj) => obj.layers.set(CAPTURE_LAYER))
  }, [])
  return (
    <group ref={groupRef}>
      <SeamlessGridBackdrop aboutUsProgress={aboutUsProgress} includeBackground={false} includeCrispLines={false} />
    </group>
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
  // The photo window's own DOM node — owned here (not inside AboutUsIntro)
  // for the same reason badgeAnchorRef is: something outside the DOM needs
  // its real rect. This one feeds PhotoBackdropCapture, so the badge's
  // glass has the actual photo to refract instead of empty canvas.
  const photoWindowRef = useRef(null)
  // Cell size and boundary phase in CSS pixels, written every frame by
  // SeamlessGridBackdrop inside the canvas and read by AboutUsIntro outside
  // it, so the photo can sit on whole grid squares rather than near them.
  const gridMetricsRef = useRef(null)
  const [badgeRect, remeasureBadgeRect] = useDomAnchorRect(badgeAnchorRef, sectionRef)
  const [photoRect, remeasurePhotoRect] = useDomAnchorRect(photoWindowRef, sectionRef)
  // GlassCircle's own anchor — centered near the photo window's top-left
  // corner (the same point the top-left CornerBrackets mark sits at, offset
  // right by CIRCLE_X_OFFSET), so most of it hides behind the photo and the
  // rest peeks out into the grid/blob behind it. Derived from photoRect
  // rather than its own DOM measurement since there's no real element to
  // measure — this circle is purely a computed offset, the same way
  // CornerBracketCapture's own bars are.
  const CIRCLE_SIZE = 220
  const CIRCLE_X_OFFSET = 35
  const circleRect = photoRect && {
    left: photoRect.left - CIRCLE_SIZE / 2 + CIRCLE_X_OFFSET,
    top: photoRect.top - CIRCLE_SIZE / 2,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
  }
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
  const remeasureRef = useRef(() => {
    remeasureBadgeRect()
    remeasurePhotoRect()
  })
  remeasureRef.current = () => {
    remeasureBadgeRect()
    remeasurePhotoRect()
  }
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
        {/* Same modest white light the badge's own canvas gives its glass
            (see GoogleCloudGlassBadge) — enough for GlassCircle's edges to
            catch a highlight, with the reflection environment below meant
            to be the dominant source.
            GlassCircle stays in this shared canvas deliberately, not split
            into its own the way the badge's was — tried that once (its own
            canvas + a second CaptureGridBackdrop, faded via the same
            motion.div technique as the badge below) and the persistent grid
            above started visibly brightening and dimming in step with that
            fade, on a page the user had already confirmed as correct and
            explicitly asked to never touch again. Never fully root-caused
            given how urgently it needed reverting, but sharing this canvas
            removes the second grid copy entirely rather than trying to get
            its exclusion right a second time — the safer fix. The real
            cost: GlassCircle can only pop in (domRect existing), not
            cross-fade, the same constraint the badge has via
            TransmissionMaterial but without that other canvas's own DOM
            element to paper over it with a CSS fade. */}
        <directionalLight position={[4, 5, 6]} intensity={0.5} />
        <Suspense fallback={null}>
          {sceneReady && <GlassCircle domRect={circleRect} isOpen={isOpen} highQuality={tier === 'high'} />}
          {sceneReady && tier === 'high' && <ReflectionEnvironment environmentIntensity={1.3} />}
        </Suspense>
        <SceneRenderGate isVisibleRef={isVisibleRef} />
      </Canvas>

      <AboutUsIntro isOpen={isOpen} badgeAnchorRef={badgeAnchorRef} windowRef={photoWindowRef} />
      {SHOW_GRID_LINES && <GridAlignmentOverlay gridMetricsRef={gridMetricsRef} />}

      {/* The badge's own canvas, stacked (via className z-index) above
          AboutUsIntro's DOM instead of sharing the backdrop canvas above.
          The two used to be one canvas, with the badge drawn first in DOM
          order — which meant the badge, however it was positioned, could
          never paint over the team photo: a <canvas> composites as one flat
          layer in the page's stacking order, so nothing about *where inside
          it* a mesh is drawn changes which DOM elements it paints above or
          below. Splitting the badge into its own transparent canvas, placed
          after AboutUsIntro, is what lets it actually sit on top of the
          photo rather than merely being told to via z-index on an empty
          anchor div (which only ever controlled the anchor's own measured
          rect, not paint order). alpha:true plus no `<color background>`
          keeps everything but the badge itself invisible, so the grid/blob
          backdrop still reads as sitting behind the photo, same as before. */}
      {/* R3F's Canvas forwards `style` but not `className` to its own
          wrapper div (confirmed directly — the wrapper's class came back
          empty, `position: static`, with a className prop set this same
          way), so the z-index this canvas exists for never landed. Wrapping
          it in a plain positioned div instead, and letting Canvas fill that
          div the way it fills any parent by default, sidesteps the prop
          entirely. */}
      {/* motion.div, not a plain one — a real DOM element wrapping this
          canvas can fade normally via ordinary CSS opacity, even though the
          TransmissionMaterial mesh painted inside it can't (its patched
          shader hardcodes output alpha to 1.0 regardless of the material's
          own opacity prop — see GlassLogoGroup's matching comment, "even
          opacity={0} rendered fully solid"). The browser composites the
          canvas's already-rendered pixels at reduced alpha regardless of
          what the shader did internally, so this fades the badge exactly
          the way AboutUsIntro's own motion.div fades the photo/copy in —
          same opacity curve, same 0.5s delay, same 0.5s duration — because
          it's the identical technique, not an approximation of it. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: isOpen ? 0.5 : 0 }}
        className="pointer-events-none absolute inset-0 z-[60]"
      >
        <Canvas
          dpr={tier === 'high' ? [1, 2] : 1}
          camera={{ position: [0, 0, 8], fov: 35 }}
          gl={{ antialias: true, alpha: true }}
          // pointer-events-none above is load-bearing (this canvas must not
          // steal clicks meant for the photo/copy underneath it) but it has
          // a side effect: the browser never dispatches pointer/mouse events
          // to an element with pointer-events:none, so R3F's own listeners
          // — attached to this canvas's own dom node by default — never
          // fire, and this canvas's `pointer` state (what drives the
          // badge's cursor-follow tilt in GoogleCloudGlassBadge, same
          // formula as the hero's own logo) sits frozen at its initial
          // value forever. Confirmed directly: five different real cursor
          // positions produced pixel-identical screenshots of the badge —
          // it never actually left its resting pose. eventSource redirects
          // R3F's listeners to document.body (still receives every mousemove
          // regardless of what's pointer-events:none), while this canvas's
          // own full-viewport rect is still what the resulting coordinates
          // get measured against, so the math comes out the same as if this
          // canvas were listening directly. eventSource alone isn't enough,
          // though: the default coordinate math divides event.offsetX/Y by
          // this canvas's own size, and offsetX/Y are relative to whatever
          // element the browser actually hit-tested (event.target) — not
          // document.body, the mere listener target — so once the event has
          // bubbled, those numbers are relative to a different element every
          // time, essentially noise. eventPrefix="client" swaps in
          // viewport-relative clientX/clientY instead, which lines up
          // correctly with this canvas's own size since it's a plain
          // absolute inset-0 covering the full viewport with no offset.
          eventSource={document.body}
          eventPrefix="client"
        >
          {/* Same modest white light the hero gives its own glass (see
              Backdrop) — the blue reflection environment below is meant to be
              the dominant source, this is just enough for the badge's edges
              to catch a highlight. */}
          <directionalLight position={[4, 5, 6]} intensity={0.5} />
          <Suspense fallback={null}>
            {/* Mounted once sceneReady (not remounted per isOpen toggle) —
                see GoogleCloudGlassBadge's own top comment for why its
                one-time setup and its ongoing per-frame cost need two
                different gates, not one. */}
            {sceneReady && <GoogleCloudGlassBadge domRect={badgeRect} isOpen={isOpen} highQuality={tier === 'high'} />}
            {/* Gives the badge's glass an actual backdrop to refract — see
                PhotoBackdropCapture's own top comment. Gated on tier==='high'
                alongside ReflectionEnvironment below, not on isOpen or
                sceneReady alone: it's meaningless without the real
                TransmissionMaterial the low-quality meshPhysicalMaterial
                branch skips entirely (see GoogleCloudGlassBadge). */}
            {sceneReady && tier === 'high' && <PhotoBackdropCapture domRect={photoRect} src={TEAM_PHOTO_SRC} />}
            {/* See CornerBracketCapture's own top comment — the bottom-right
                bracket mark sits under the badge just like the photo does,
                and needs the same treatment to stay visible through it. */}
            {sceneReady && tier === 'high' && <CornerBracketCapture windowRect={photoRect} />}
            {/* See CaptureGridBackdrop's own top comment — the other half
                of what the badge's glass refracts, alongside the photo
                above. */}
            {sceneReady && tier === 'high' && <CaptureGridBackdrop aboutUsProgress={aboutUsProgress} />}
            {/* Gated on sceneReady (see above), not isOpen, unlike the badge
                — this is a one-time bake (see its own bakedRef guard), not
                an ongoing per-frame cost, so conditionally
                mounting/unmounting it on isOpen (tried first) bought no
                savings while open and cost a full re-bake — six 1024px
                cube-face renders plus a PMREM convolution pass, roughly 80
                meshes — every single time About Us opened. Confirmed
                directly: that bake blocking the main thread is exactly what
                read as "scrolling takes a couple of seconds to respond"
                right around opening/closing About Us. The badge's material
                carries envMapIntensity (it's the hero's own
                glassMaterialProps, imported wholesale), so without an
                environment to reflect it would render as a flat, nearly
                featureless slab — the same abstract blue glow bake the hero
                itself uses, holding no scene-specific content, just light.
                Baked separately from the backdrop canvas's own copy now that
                the badge lives in its own WebGL context — a second context
                can't read the first one's cubemap, so this is a second
                one-time bake, not a shared one; still gated the same way, so
                it costs nothing per frame either. */}
            {sceneReady && tier === 'high' && <ReflectionEnvironment environmentIntensity={1.3} />}
          </Suspense>
          <CaptureLayerGate />
          <SceneRenderGate isVisibleRef={isVisibleRef} />
        </Canvas>
      </motion.div>
    </motion.section>
    </motion.div>
  )
}

export default AboutUsSection
