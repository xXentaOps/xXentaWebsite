import { useEffect, useRef } from 'react'
import { Html } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import { GridPlane } from './BackgroundGrid'
import { DIRECT_STYLE, EDGE_STYLE, OVERSCALE, THROUGH_GLASS_STYLE } from './gridConstants'
import { pageMarginPx } from './pageMargin'
import { GradientBlob } from './GradientBlob'
import { BLOB_WIDTH_OVERSCALE, GRID_Z, PLANE_SIZE, PLANE_Z } from './sceneConstants'
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

// Zero velocity at both ends — same reasoning as this piece's other
// smoothstepEase duplicates (see BackgroundGrid/HeroTitle): a linear zoom
// tied directly to scroll position reads as mechanical, while easing both
// ends makes it read as a deliberate, weighted motion instead.
function smoothstepEase(t) {
  return t * t * (3 - 2 * t)
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
function SeamlessBackdrop({ carouselRef, isVisibleRef }) {
  // screenOffset 1 — this section continues the pattern one screen *below*
  // the hero (see useSeamlessGrid for the shared derivation of
  // yPhaseShiftCells/blobY this used to do inline).
  const { size, blobWidth, gridWidth, gridHeight, cellSize, repeat, yPhaseShiftCells, blobY } = useSeamlessGrid(1)
  // Carries just the two grid planes (not the blob — the ask was for the
  // grid specifically to zoom, and leaving the blob's own much larger,
  // softer shape untouched keeps it reading as the stable backdrop the grid
  // zooms *in front of*) so finalZoomScale can scale them as one unit.
  const gridGroupRef = useRef(null)

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
  })

  return (
    <>
      <color attach="background" args={['#0F172B']} />
      <GradientBlob position={[0, blobY, PLANE_Z]} scale={[blobWidth * BLOB_WIDTH_OVERSCALE, PLANE_SIZE, 1]} />
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
        />

        {/* Placeholder copy sitting beside the highlighted edge — inside
            gridGroupRef like the edge itself, so its *position* tracks the
            zoom (it moves/grows apart from center exactly as the cell it's
            labeling does) while its own font-size stays fixed screen
            pixels, same as BackgroundGrid's button labels do via drei's
            Html. text-xs matches those labels' own size, per the ask —
            everything else (weight/tracking/case) deliberately doesn't:
            those labels are short, uppercase, wide-tracked UI tags, and
            applying that same treatment to actual paragraph-length copy
            would read as shouted and be hard to scan. */}
        <Html
          position={[edgeX + cellSize * 0.3, (edgeBottomY + edgeTopY) / 2, GRID_Z + 0.01]}
          style={{ transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          {/* w-[...], not max-w-[...] — drei's Html positions this through a
              zero-width absolutely-positioned anchor div (its own internal
              transform wrapper), so a shrink-to-fit box here (anything
              without an explicit width) computes its width from that empty
              container rather than its own text, collapsing to the single
              longest word's width no matter how generous max-width was set.
              An explicit width sidesteps that shrink-to-fit calculation
              entirely instead of trying to bound it. */}
          <p className="w-[300px] animate-[fadeInUp_1s_ease-out_both] text-xs leading-loose font-extralight text-white/40">
            Placeholder copy for this callout — nothing to read here yet, just holding the spot until real content is ready. This block exists purely to
            check how a longer run of text sits next to the highlighted edge: how it wraps, how much vertical room it takes up, and whether the spacing
            still feels right once real copy replaces it. None of this is meant to be read closely — it's here to test layout, not to say anything in
            particular.
          </p>
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

export function BackgroundGlowSection({ carouselRef }) {
  const sectionRef = useRef(null)
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

  return (
    <section ref={sectionRef} className="relative h-screen w-full overflow-hidden bg-[#0F172B]">
      {/* Capped the same way GlassLogoHero's own canvas is — left uncapped,
          this renders at the browser's raw devicePixelRatio, which on a 3x
          phone/laptop panel is a lot of extra fill rate for a plain grid +
          gradient with no fine detail that benefits from it. */}
      <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 8], fov: 35 }} gl={{ antialias: true, alpha: false }}>
        <SeamlessBackdrop carouselRef={carouselRef} isVisibleRef={isVisibleRef} />
        <SceneRenderGate isVisibleRef={isVisibleRef} />
      </Canvas>
    </section>
  )
}

export default BackgroundGlowSection
