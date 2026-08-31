import { forwardRef, Suspense, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { shaderMaterial, Text } from '@react-three/drei'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { AdditiveBlending, Color, MathUtils } from 'three'
// Same font file, weight, letter-spacing factor, color and fill opacity as
// HeroTitle's own "New Way of Learning" — asked for directly ("same grey
// color, boldness, everything") for the "Members of the Board" title below.
import fontUrl from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff?url'
import {
  ACCENT_SPEED,
  gridPhaseShiftCells,
  mainSlidePx,
  teamContentSlidePx,
  TEAM_SLIDE_TRANSITION,
  TEAM_SLIDE_Z,
} from './teamTransition'
import { AboutUsIntro } from './AboutUsIntro'
import { SLIDE_PHOTOS } from './aboutUsSlides'
import {
  aboutUsGridMetrics,
  PHOTO_CELLS_Y,
  photoOriginOffsets,
  statsOriginOffsets,
} from './aboutUsGridCells'
import { GridPlane } from './BackgroundGrid'
import { ABOUT_US_GRID_ZOOM_SCALE, DIRECT_STYLE, THROUGH_GLASS_STYLE } from './gridConstants'
import GridAlignmentOverlay from './GridAlignmentOverlay'
import { gridScreenMetrics } from './gridScreenMetrics'
import { GlassIcon } from './GlassIcon'
import { OVERLAY_LAYER } from './GlassLogoGroup'
import { GlassCircle } from './GlassCircle'
import { GoogleCloudGlassBadge } from './GoogleCloudGlassBadge'
import { GradientBlob } from './GradientBlob'
import { computeLayout, MEMBERS, MeetTheTeamGrid, TEAM_MEMBER_COUNT } from './MeetTheTeamGrid'
import {
  CAPTURE_LAYER,
  CaptureLayerGate,
  CornerBracketCapture,
  PhotoBackdropCapture,
  preloadPhotoTextures,
} from './PhotoBackdropCapture'
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

// Carries its children through the About Us -> Meet the Team slide, in world
// space, so none of the glass components themselves need to know the
// transition exists. They all position from a measured DOM rect, and a rect
// is exactly the wrong thing to animate this with: useDomAnchorRect's own
// triggers don't fire for a change of position alone (see its comment), so a
// DOM transform would move the photo while leaving every glass object behind
// until something happened to force a remeasure.
//
// `speed` is a plain multiplier on the shared travel — 1 for everything
// locked to the photo (the capture planes, the partner plaque), ACCENT_SPEED
// for the glass objects that lead the rest. Reading progress inside useFrame
// rather than taking it as a prop keeps the whole slide off React's render
// path: one motion value is mutated per frame and this writes one number.
//
// `slidePx` (default mainSlidePx) is which of teamTransition.js's own
// functions of (progress, viewportWidth) this group's travel is computed
// from — added for the Meet the Team detail photo's own corner icons, which
// need to travel exactly as MeetTheTeamGrid's DOM content does
// (teamContentSlidePx), not as a speed-scaled multiple of mainSlidePx: that
// function adds a constant screen-width offset on top of mainSlidePx, which
// `speed` alone (a pure multiplier) can't express.
//
// `z` (default TEAM_SLIDE_Z) is which depth the px -> world-unit conversion
// itself is computed at — see TEAM_SLIDE_Z's own comment for why that has
// to match where the children actually render, not just be some shared
// constant: perspective means a group moved a fixed number of world units
// covers a different number of screen px at a different z, so a child
// sitting far from TEAM_SLIDE_Z's own default (glass-object depth, ~1.6)
// travels the *wrong* number of screen pixels unless told to compute the
// conversion at its own actual depth instead. Added for RandomGridGlow,
// whose squares sit near GRID_Z (-5) specifically to align with the
// background grid — at the default z they visibly drifted off their own
// grid cells over the course of the slide, reported directly.
function SlideGroup({ progress, speed = 1, slidePx = mainSlidePx, z = TEAM_SLIDE_Z, children }) {
  const groupRef = useRef(null)
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)
  const { width: viewWidth } = viewport.getCurrentViewport(camera, [0, 0, z])
  const perPx = viewWidth / size.width

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    group.position.x = slidePx(progress.get(), size.width) * speed * perPx
  })

  return <group ref={groupRef}>{children}</group>
}

// Asked for explicitly ("the exact same... size") to match GlassCircle, the
// 3D circle behind the About Us slideshow — hoisted here (GlassCircle's own
// copy is declared inside the component, further down, purely as a local
// convenience) so both actually share one number instead of two constants
// that could quietly drift apart.
const CIRCLE_SIZE = 220
const NAME_ICON_SIZE_PX = CIRCLE_SIZE

// A square domRect (CSS px, the section-relative space useDomAnchorRect
// already produces) centered on nameIconMarkerRect — a near-zero-size DOM
// marker MeetTheTeamGrid positions immediately beside (and vertically
// centred on) a member's name via plain flexbox (see nameIconAnchorRef's
// own comment there), so this only ever needs to turn that single point
// into a same-size square for GlassIcon.
function nameIconDomRect(markerRect) {
  const centerX = markerRect.left + markerRect.width / 2
  const centerY = markerRect.top + markerRect.height / 2
  return {
    left: centerX - NAME_ICON_SIZE_PX / 2,
    top: centerY - NAME_ICON_SIZE_PX / 2,
    width: NAME_ICON_SIZE_PX,
    height: NAME_ICON_SIZE_PX,
  }
}

// Purely decorative glass squares sitting in specific otherwise-empty
// squares of the Meet the Team grid (see DECORATIVE_SQUARE_CELLS in
// MeetTheTeamGrid.jsx) — the exact same GlassIcon technique the per-member
// name icons use, just extruding a plain filled square (public/square.svg)
// instead of a member-specific symbol. Positioned analytically from the
// same computeLayout math the actual photo tiles use, not a measured DOM
// rect — there's no DOM element for an empty grid square to measure in the
// first place, and computeLayout is a pure function of window width/height
// with no transform baked in, exactly the "resting" coordinate space
// SlideGroup's own slidePx expects (see nameIconDomRect's neighboring
// GlassIcon for the DOM-measured version of this same contract).
function DecorativeGridSquares({ teamProgress, isOpen, highQuality, visible }) {
  const [squares, setSquares] = useState(() => computeLayout(window.innerWidth, window.innerHeight).decorativeSquares)
  useEffect(() => {
    const relayout = () => setSquares(computeLayout(window.innerWidth, window.innerHeight).decorativeSquares)
    relayout()
    window.addEventListener('resize', relayout)
    return () => window.removeEventListener('resize', relayout)
  }, [])

  return squares.map((square, i) => (
    <SlideGroup key={i} progress={teamProgress} slidePx={teamContentSlidePx}>
      <GlassIcon
        svgUrl="/square.svg"
        viewBoxSize={100}
        domRect={{ left: square.left, top: square.top, width: square.size, height: square.size }}
        isOpen={isOpen}
        highQuality={highQuality}
        visible={visible}
        // Faces the camera dead-on at rest, unlike the name icons' own
        // pre-tilted BASE_TILT — asked for directly: only the cursor-follow
        // motion should move these away from flat.
        baseTilt={{ x: 0, y: 0 }}
        // Plain glassMaterialProps, not the name icons' dimmed-for-small-
        // shapes overrides — these squares are full-cell sized, and at the
        // name icons' own overrides they read visibly darker than
        // GlassCircle/the hero logo/the Google Cloud badge (reported
        // directly). Glow pushed past even GlassCircle's own 0.55/0.15 —
        // asked for "a bit more blue" on top of that already-matched look,
        // and the glow overlay is literally what supplies the blue (plain
        // TransmissionMaterial alone reads clear/gray).
        glassOverrides={{}}
        glowIntensity={0.75}
        bleedGlowIntensity={0.2}
      />
    </SlideGroup>
  ))
}

// A flat-fill glow quad for RandomGridGlow below — deliberately its own
// tiny material rather than reusing GradientBlobMaterial: that one is
// always fully opaque (fine for a backdrop wash, wrong for a mark that has
// to fade to nothing) and radially falls off, not a flat fill. No falloff
// here at all — asked for directly: the whole square lights evenly, no
// gradient toward the edges.
// uColor mixed a little toward white from the shared #3B82F6 — asked for
// directly, "less saturated" — same mild desaturation move as the
// decorative squares' own specularColor override.
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

// Fixed set of squares, hand-picked once (not re-rolled per mount/reload) —
// asked for directly: "they shouldn't actually change location every time
// I refresh the page... pick random places for them to sit and stay
// there." Columns/rows span the same generous margin beyond the actual 5x3
// photo layout (cols 0-4, rows 0-2) DECORATIVE_SQUARE_CELLS/TITLE_WORDS
// already use, so most land on genuinely empty squares rather than under a
// photo (opaque DOM, so a square there just wouldn't show at all).
// Opacity range mirrors the same "some more transparent than others" spread
// the earlier randomized version used, eased back down a little from that
// round's brightness ceiling (0.05) — asked for directly, "a little less
// visible". Two positions were also moved off their original random spots:
// the one diagonal to Norma's (bottom-left, col 2/row 3) one square left to
// col 1; the one diagonal to Schilders's (top-right, col 1/row -1) one
// square right to col 2 — landing it directly above Ardie (col 2, row 0).
const GRID_GLOWS = [
  { col: -2, row: 3, opacity: 0.016 },
  { col: 2, row: -1, opacity: 0.035 },
  { col: 4, row: 4, opacity: 0.023 },
  { col: -3, row: 0, opacity: 0.014 },
  { col: 6, row: -2, opacity: 0.031 },
  { col: 1, row: 3, opacity: 0.02 },
  { col: -1, row: -2, opacity: 0.039 },
  { col: 7, row: 2, opacity: 0.017 },
]
// Just in front of the grid lines (GRID_Z), same margin BoardTitleWord's
// own TITLE_Z uses for the same reason — needs to draw over them, not fight
// for the same depth.
const GRID_GLOW_Z = GRID_Z + 0.1

// Static ambient grid squares — a fixed set of squares around the grid
// (GRID_GLOWS above), each at its own steady, low opacity. Unconditional on
// sceneReady alone at the mount site (not gated on isTeamOpen), same as
// DecorativeGridSquares/BoardTitleWord: mounting/unmounting with isTeamOpen
// popped these in and out instantly instead of sliding with the grid —
// asked for directly, "show up (slide left and right) together with the
// grid" — since SlideGroup's own teamContentSlidePx only carries something
// *already mounted* along with the slide, it can't produce a slide-in for
// something that only starts existing once the slide is already underway.
//
// Position is genuinely static; only opacity still needs a per-frame
// touch, multiplied by teamProgress — the same fix Board's own text needed
// for the identical reason (its own comment has the full story): merely
// riding the slide's *position* doesn't guarantee something fully clears
// the screen at rest, and these squares' columns range wider than Board's
// single one ever did. This is not the "animated" behavior that was
// explicitly rejected — each square's own opacity ceiling stays fixed;
// only the overall group fades with the slide itself, the same as every
// other piece on this stage already does.
//
// Cell math mirrors DecorativeGridSquares/BoardTitleWord exactly — same
// computeLayout, same "resting" CSS-px coordinate space, same SlideGroup
// travel — just at fixed columns/rows of its own instead of member cells.
function RandomGridGlow({ teamProgress }) {
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)
  const [layout, setLayout] = useState(() => computeLayout(window.innerWidth, window.innerHeight))
  useEffect(() => {
    const relayout = () => setLayout(computeLayout(window.innerWidth, window.innerHeight))
    relayout()
    window.addEventListener('resize', relayout)
    return () => window.removeEventListener('resize', relayout)
  }, [])

  const meshRefs = useRef([])

  useFrame(() => {
    const p = teamProgress.get()
    for (let i = 0; i < GRID_GLOWS.length; i++) {
      const mesh = meshRefs.current[i]
      if (mesh) mesh.material.uOpacity = GRID_GLOWS[i].opacity * p
    }
  })

  const { width: viewWidth } = viewport.getCurrentViewport(camera, [0, 0, GRID_GLOW_Z])
  const perPx = viewWidth / size.width
  const worldXOf = (px) => (px - size.width / 2) * perPx
  const worldYOf = (px) => -(px - size.height / 2) * perPx
  const cellWorldSize = layout.cell * perPx

  return (
    <SlideGroup progress={teamProgress} slidePx={teamContentSlidePx} z={GRID_GLOW_Z}>
      <group>
        {GRID_GLOWS.map((glow, i) => (
          <mesh
            key={i}
            ref={(el) => {
              meshRefs.current[i] = el
            }}
            position={[
              worldXOf(layout.origin.x + (glow.col + 0.5) * layout.cell),
              worldYOf(layout.origin.y + (glow.row + 0.5) * layout.cell),
              GRID_GLOW_Z,
            ]}
            scale={[cellWorldSize, cellWorldSize, 1]}
            raycast={() => null}
          >
            <planeGeometry args={[1, 1]} />
            <gridGlowMaterial transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </SlideGroup>
  )
}

// The same faint ambient squares RandomGridGlow puts around the Meet the
// Team grid, asked for on About Us too — same GridGlowMaterial, same
// additive blending, same low-opacity spread, just on this page's own grid
// and at specific squares rather than a scattered set.
//
// Positions are given relative to one of two anchors — anchor: 'stats' or
// 'photo' — rather than as absolute grid indices, because that is how they
// were actually specified each time ("one on the 99.8% square... under
// 12.4K", then later "the two squares to the bottom-left of the slideshow
// pictures") and because both the stats' and the photo's own column/row
// move with the viewport (see statsCellIndices/photoCellIndices), so
// absolute indices would only be right at the size they were picked at.
//
// For anchor: 'stats', col is an offset from the stats' first square
// (12.4K = 0, 99.8% = 1, 40+ = 2), row an offset from the stats' own row.
// For anchor: 'photo', col/row are offsets from the photo window's own
// top-left cell.
//
// Opacities sit in the same "all very faint, some more than others" band
// GRID_GLOWS uses — deliberately not uniform, so squares sharing an anchor
// don't read as one deliberate block.
const ABOUT_US_GLOWS = [
  // On the 99.8% square.
  { anchor: 'stats', col: 1, row: 0, opacity: 0.03 },
  // ...and its neighbour to the right, the 40+ square.
  { anchor: 'stats', col: 2, row: 0, opacity: 0.018 },
  // Under 12.4K.
  { anchor: 'stats', col: 0, row: 1, opacity: 0.035 },
  // ...and one further left again, off the stats' own span entirely.
  { anchor: 'stats', col: -1, row: 1, opacity: 0.022 },
  // Directly left of the photo's own bottom-left cell...
  { anchor: 'photo', col: -1, row: PHOTO_CELLS_Y - 1, opacity: 0.019 },
  // ...and one further left again — a horizontal pair on the same row now,
  // not the L this started as (moved off row PHOTO_CELLS_Y, one row lower,
  // to sit beside the other instead of under it).
  { anchor: 'photo', col: -2, row: PHOTO_CELLS_Y - 1, opacity: 0.014 },
]

// Ambient squares on About Us's own grid, at the four cells above. The Meet
// the Team twin (RandomGridGlow) fades *in* with teamProgress since it
// belongs to that stage; this one is the mirror image — it belongs to About
// Us, so it fades *out* as the team stage takes over (1 - p), and rides the
// same mainSlidePx travel the rest of this page's content does rather than
// teamContentSlidePx.
//
// Position and size are recomputed every frame from gridMetricsRef — the
// *live* metrics SeamlessGridBackdrop publishes, zoom included — rather than
// from the settled ones the DOM is laid out against. That difference is the
// whole point: the grid zooms from scale 1 to ABOUT_US_GRID_ZOOM_SCALE over
// the reveal, and a square placed once at its settled position sits still
// while the squares around it grow into place underneath it, which reads as
// it floating free of the grid. Asked for directly — these must be attached
// to the grid, so if the grid zooms in, so do they. Tracking the live cell
// means each square is glued to its own grid square through the whole zoom
// and simply arrives where the stat is, since at progress 1 the live metrics
// *are* the settled ones.
//
// Built from statsOriginOffsets (the unwrapped origin), not the wrapped
// phase gridMetricsRef itself carries — see that function's own comment for
// why: the wrapped phase's fold count depends on cell size, so a position
// built from phaseX/phaseY + a fixed cell index (tried first) jumped by a
// whole cell partway through the zoom, at the exact instant the fold count
// changed. Reported directly, as the squares appearing on the wrong row and
// then snapping. gridMetricsRef is still where cell/firstX/firstY themselves
// come from each frame; only the index they're multiplied against changed.
//
// This is the opposite choice from AboutUsIntro's photo window, deliberately
// (see its own long note): that one holds at the settled position because
// tracking the live grid fed back into its own layout and made it jump. No
// such loop exists here — nothing measures these, so there is nothing for
// them to disturb.
function AboutUsGridGlow({ teamProgress, gridMetricsRef }) {
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)
  // The two anchors' own cells, each as a fixed offset from the grid's
  // unwrapped origin — a fact about the layout, not about any one scale, so
  // this only needs recomputing on resize (the viewport can genuinely move
  // which cell either anchor lands on), never per frame. Both computed
  // regardless of whether ABOUT_US_GLOWS currently uses each one, so adding
  // a glow against either anchor later never needs a third state variable.
  const [origins, setOrigins] = useState(() => ({
    stats: statsOriginOffsets(window.innerWidth, window.innerHeight),
    photo: photoOriginOffsets(window.innerWidth, window.innerHeight),
  }))
  useEffect(() => {
    const relayout = () =>
      setOrigins({
        stats: statsOriginOffsets(window.innerWidth, window.innerHeight),
        photo: photoOriginOffsets(window.innerWidth, window.innerHeight),
      })
    relayout()
    window.addEventListener('resize', relayout)
    return () => window.removeEventListener('resize', relayout)
  }, [])

  const meshRefs = useRef([])

  const { width: viewWidth } = viewport.getCurrentViewport(camera, [0, 0, GRID_GLOW_Z])
  const perPx = viewWidth / size.width

  useFrame(() => {
    // Falls back to the settled metrics only for the frame or two before
    // SeamlessGridBackdrop has written its first live ones (it renders
    // earlier in the same canvas, so its useFrame runs first from then on).
    const metrics = gridMetricsRef?.current ?? aboutUsGridMetrics(size.width, size.height)
    const { cell, firstX, firstY } = metrics
    const cellWorldSize = cell * perPx
    const p = teamProgress.get()
    for (let i = 0; i < ABOUT_US_GLOWS.length; i++) {
      const mesh = meshRefs.current[i]
      if (!mesh) continue
      const glow = ABOUT_US_GLOWS[i]
      const origin = origins[glow.anchor]
      const px = firstX + (origin.nX + glow.col + 0.5) * cell
      const py = firstY + (origin.nY + glow.row + 0.5) * cell
      mesh.position.x = (px - size.width / 2) * perPx
      mesh.position.y = -(py - size.height / 2) * perPx
      // Grows with the cell it sits on, so it stays exactly one square
      // through the zoom rather than a fixed-size patch drifting over a
      // grid that is changing size around it.
      mesh.scale.set(cellWorldSize, cellWorldSize, 1)
      mesh.material.uOpacity = glow.opacity * (1 - p)
    }
  })

  return (
    <SlideGroup progress={teamProgress} z={GRID_GLOW_Z}>
      <group>
        {ABOUT_US_GLOWS.map((glow, i) => (
          <mesh
            key={i}
            ref={(el) => {
              meshRefs.current[i] = el
            }}
            position={[0, 0, GRID_GLOW_Z]}
            raycast={() => null}
          >
            <planeGeometry args={[1, 1]} />
            <gridGlowMaterial transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </SlideGroup>
  )
}

// A first guess, tuned relative to the grid's own cell size rather than a
// viewport-height fraction the way HeroTitle's own LEARNING_FONT_FRACTION
// works — "Board" is asked to align with a specific grid square, which
// only makes sense if its font size scales with the grid's own cell size,
// not independently of it.
const TITLE_FONT_SIZE_CELL_RATIO = 0.6
const TITLE_LETTER_SPACING_FACTOR = -0.03
const TITLE_FILL_OPACITY = 0.7
// Behind the decorative glass squares' own fixed z (1.6, inside GlassIcon)
// so one sitting in front could still show anything behind it refracted
// through, the same backdrop-capture mechanism that already shows the grid
// lines through every piece of glass on this page. Ahead of GRID_Z/PLANE_Z
// (-5/-6) so this draws over the grid lines, per the same depth-test
// everything else in this canvas already relies on.
const TITLE_Z = 0.8

// "Board" — the small half of "Board Members" (see TITLE_WORDS in
// MeetTheTeamGrid.jsx for exactly where it starts and why: two squares left
// of Schilders, some letters intentionally landing behind his photo). On top
// of the grid lines (TITLE_Z above) but below the actual photos, which are
// DOM and so always paint over this canvas regardless of any WebGL depth
// value. Same font/weight/letter-spacing/color/opacity as HeroTitle's own
// "New Way of Learning" — asked for directly, "same grey color, boldness,
// everything" — and no glass/tilt of its own: this is plain flat text, the
// same as Hero's title is.
//
// "Members" (the big half, matching Hero's own "Learning" in size) is
// *not* rendered here — it lives as a DOM element instead, inside
// MeetTheTeamGrid's own JSX. troika's Text has no way to genuinely blur its
// own glyph fill (only outlineBlur, a per-glyph SDF edge feather — tried
// first, and it read exactly as HeroTitle's own comment on that same prop
// warns: "a glow sitting on top of still-fully-legible letters," reported
// directly). A real blur needs either the heavy capture+two-pass-Gaussian
// rig GlassLogoGroup already runs for HeroTitle's word-switch effect, or
// plain CSS `filter: blur()` on a DOM element — the second is dramatically
// simpler and "Members" needs no glass/tilt/refraction of its own, so
// there's no real cost to moving just this one word to DOM.
// hideForDetail is a plain instant cut (matches the tiles' own fade-to-0 for
// a *different* transition — opening/closing a detail view — untouched by
// any of this). For the About Us <-> Meet the Team slide itself: entering
// (isTeamOpen true) keeps the original instant appearance — asked for
// directly, that direction already read fine, sliding in already at full
// opacity — but exiting used a boolean `visible` toggle tied to isTeamOpen
// that flipped the instant that state changed, well before teamProgress had
// actually finished easing back to 0, reading as an abrupt cut. Only the
// exit now fades continuously off of teamProgress itself (Board has no
// glass/TransmissionMaterial, so real fillOpacity fading works, unlike
// GlassIcon) — isTeamOpen false is exactly "closing or already closed," so
// this also still keeps it properly invisible at rest on the About Us page.
function BoardTitleWord({ teamProgress, isTeamOpen, hideForDetail }) {
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)
  const textRef = useRef(null)
  const [layout, setLayout] = useState(() => computeLayout(window.innerWidth, window.innerHeight))
  useEffect(() => {
    const relayout = () => setLayout(computeLayout(window.innerWidth, window.innerHeight))
    relayout()
    window.addEventListener('resize', relayout)
    return () => window.removeEventListener('resize', relayout)
  }, [])

  useFrame(() => {
    const node = textRef.current
    if (!node) return
    if (hideForDetail) {
      node.fillOpacity = 0
    } else if (isTeamOpen) {
      // Entering: instant, same as the original visible toggle — the slide
      // itself (SlideGroup below) is what visibly carries it in.
      node.fillOpacity = TITLE_FILL_OPACITY
    } else {
      // Exiting (or already closed/at rest): fades with the same progress
      // value driving the position slide, rather than cutting the instant
      // isTeamOpen flips.
      node.fillOpacity = TITLE_FILL_OPACITY * teamProgress.get()
    }
  })

  const { width: viewWidth } = viewport.getCurrentViewport(camera, [0, 0, TITLE_Z])
  const perPx = viewWidth / size.width
  const worldXOf = (px) => (px - size.width / 2) * perPx
  const worldYOf = (px) => -(px - size.height / 2) * perPx

  const boardWord = layout.titleWords.find((word) => word.text === 'Board')
  const boardFontSize = layout.cell * TITLE_FONT_SIZE_CELL_RATIO * perPx
  // A tiny nudge right of its analytical column — asked for directly, a
  // small tweak rather than a full column move. Tune live.
  const BOARD_OFFSET_X_PX = 12

  return (
    <SlideGroup progress={teamProgress} slidePx={teamContentSlidePx}>
      <group position={[worldXOf(boardWord.left + BOARD_OFFSET_X_PX), worldYOf(boardWord.top + layout.cell / 2), TITLE_Z]}>
        <Text
          ref={textRef}
          font={fontUrl}
          fontWeight={400}
          anchorX="left"
          anchorY="middle"
          letterSpacing={TITLE_LETTER_SPACING_FACTOR * boardFontSize}
          fontSize={boardFontSize}
          color="#F8FAFC"
          fillOpacity={0}
        >
          Board
        </Text>
      </group>
    </SlideGroup>
  )
}

function SeamlessGridBackdrop({
  aboutUsProgress,
  teamProgress,
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
  // Handed down to both GridPlanes below and copied into their shader's own
  // uXPhaseShiftCells every frame — see that uniform's comment for why the
  // grid's share of the Meet the Team slide is a phase shift rather than a
  // move. teamProgress is optional: CaptureGridBackdrop renders this same
  // component for the badge's refraction and has no slide of its own to
  // track (the badge canvas's own copy is only ever seen *through* glass
  // that is itself sliding, so shifting it again would double the motion).
  const gridXPhaseRef = useRef(0)

  useFrame(() => {
    const group = gridGroupRef.current
    if (!group) return
    gridXPhaseRef.current = teamProgress
      ? gridPhaseShiftCells(teamProgress.get(), size.width)
      : 0
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
        <GridPlane z={GRID_Z} width={gridWidth} height={gridHeight} repeat={repeat} style={scaleStyleForZoom(THROUGH_GLASS_STYLE, ABOUT_US_GRID_ZOOM_SCALE, throughGlassOpacityScale)} layer={0} yPhaseShiftCells={yPhaseShiftCells} xPhaseShiftCellsRef={gridXPhaseRef} />
        {/* Skipped for the badge's own capture-only copy (see
            CaptureGridBackdrop) — the hero's own glass logo never refracts
            this crisp plane either (see BackgroundGrid.jsx, where it sits on
            OVERLAY_LAYER specifically to stay out of the glass's backdrop
            capture); only THROUGH_GLASS_STYLE, the soft one above, is meant
            to be seen *through* glass. Left on layer 0 here regardless of
            includeCrispLines, same as always, since only this prop (not the
            layer) decides whether it renders at all in a given copy. */}
        {includeCrispLines && (
          <GridPlane z={GRID_Z} width={gridWidth} height={gridHeight} repeat={repeat} style={scaleStyleForZoom(DIRECT_STYLE, ABOUT_US_GRID_ZOOM_SCALE)} layer={0} yPhaseShiftCells={yPhaseShiftCells} xPhaseShiftCellsRef={gridXPhaseRef} />
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
//
// teamProgress is forwarded straight through, not adjusted for the badge's
// own faster ACCENT_SPEED travel (see the SlideGroup wrapping the badge
// mesh itself in this same canvas). Those are two different questions: this
// copy stands in for "what does the grid look like right now," which is the
// same everywhere on the page regardless of who's looking at it, while the
// badge's own SlideGroup answers "where does the badge itself sit." Omitting
// this prop entirely (tried first) left this copy frozen at its rest phase
// while the two real, on-screen grid layers kept sliding — reported directly
// as a third, blurrier grid that looked like it "stopped earlier in the
// slide animation," which is exactly what a phase stuck at 0 while
// everything else advances looks like.
function CaptureGridBackdrop({ aboutUsProgress, teamProgress }) {
  const groupRef = useRef(null)
  useEffect(() => {
    groupRef.current?.traverse((obj) => obj.layers.set(CAPTURE_LAYER))
  }, [])
  return (
    <group ref={groupRef}>
      <SeamlessGridBackdrop
        aboutUsProgress={aboutUsProgress}
        teamProgress={teamProgress}
        includeBackground={false}
        includeCrispLines={false}
      />
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

// Same measurement useDomAnchorRect does (container-relative
// getBoundingClientRect, kept fresh via ResizeObserver/window resize), but
// keyed off the DOM *node* itself rather than a ref object — needed
// specifically for an anchor whose target element mounts and unmounts
// (rather than always existing, like every useDomAnchorRect caller in this
// file), since a plain ref's own identity never changes just because
// ref.current does, so useDomAnchorRect's effect would never know to
// re-attach once the element actually showed up. A state-backed node
// (set via a callback ref) does trigger a normal re-render/effect run when
// that happens, which is all this needs — used for the Meet the Team name
// icon anchor, whose marker (see MeetTheTeamGrid's own nameIconAnchorRef
// comment) only exists while a member with one is selected.
function useDomAnchorRectForNode(node, containerRef) {
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (!node) {
      setRect(null)
      return
    }
    function measure() {
      const box = node.getBoundingClientRect()
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
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [node, containerRef])

  return rect
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

// forwardRef + closeTeam: the navbar's "About Us" link (in GlassLogoPreview,
// a sibling with no other route to this section's own isTeamOpen state)
// needs to be able to back out of the Meet the Team stage without closing
// About Us entirely — clicking it while already on this stage should land
// back on the last-viewed About Us slide, not drop all the way to the Hero.
// An imperative handle is the narrow way to reach in for that one action
// without lifting isTeamOpen itself (and everything that already reads/sets
// it below) out of this component.
export const AboutUsSection = forwardRef(function AboutUsSection({ isOpen, openScrollComp, aboutUsProgress }, ref) {
  const tier = usePerformanceTier()
  const sectionRef = useRef(null)
  const badgeAnchorRef = useRef(null)
  // The photo window's own DOM node — owned here (not inside AboutUsIntro)
  // for the same reason badgeAnchorRef is: something outside the DOM needs
  // its real rect. This one feeds PhotoBackdropCapture, so the badge's
  // glass has the actual photo to refract instead of empty canvas.
  const photoWindowRef = useRef(null)
  // A near-zero-size marker MeetTheTeamGrid positions immediately beside
  // (and vertically centred on) the open member's name — same handoff
  // *shape* as badgeAnchorRef, but this one only exists in the DOM while a
  // member with a nameIcon is actually selected (badgeAnchorRef's own
  // target is always mounted), so it's a callback-ref-backed state value
  // rather than a plain useRef — see useDomAnchorRectForNode's own comment
  // above for why that distinction matters here. Passed straight through
  // as the `ref` MeetTheTeamGrid attaches to that marker; a callback ref
  // works there exactly like an object ref would.
  const [nameIconAnchorNode, setNameIconAnchorNode] = useState(null)
  const nameIconMarkerRect = useDomAnchorRectForNode(nameIconAnchorNode, sectionRef)
  // Cell size and boundary phase in CSS pixels, written every frame by
  // SeamlessGridBackdrop inside the canvas and read by AboutUsIntro outside
  // it, so the photo can sit on whole grid squares rather than near them.
  const gridMetricsRef = useRef(null)
  const [badgeRect, remeasureBadgeRect] = useDomAnchorRect(badgeAnchorRef, sectionRef)
  const [photoRect, remeasurePhotoRect] = useDomAnchorRect(photoWindowRef, sectionRef)
  // Which photo (if any) AboutUsIntro's own slideshow is currently showing —
  // reported up via onPhotoChange (see its own comment there) so
  // PhotoBackdropCapture refracts whatever's actually behind the badge
  // instead of a hardcoded one. null on the two photo-less slides, which
  // PhotoBackdropCapture itself falls back to a plain white rectangle for.
  const [currentPhoto, setCurrentPhoto] = useState(null)
  // GlassCircle's own anchor — centered near the photo window's top-left
  // corner (the same point the top-left CornerBrackets mark sits at, offset
  // right by CIRCLE_X_OFFSET), so most of it hides behind the photo and the
  // rest peeks out into the grid/blob behind it. Derived from photoRect
  // rather than its own DOM measurement since there's no real element to
  // measure — this circle is purely a computed offset, the same way
  // CornerBracketCapture's own bars are. CIRCLE_SIZE itself now lives at
  // module scope (see its own comment there) — NAME_ICON_SIZE_PX shares it.
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
  // Warms PhotoBackdropCapture's texture cache for every slide up front —
  // see preloadPhotoTextures' own comment for why. Gated the same as
  // PhotoBackdropCapture itself (sceneReady && tier==='high'): preloading on
  // a tier that never mounts the badge at all would just be wasted GPU
  // uploads nothing ever reads.
  useEffect(() => {
    if (sceneReady && tier === 'high') preloadPhotoTextures(SLIDE_PHOTOS)
  }, [sceneReady, tier])

  // Meet the Team: not a route or a separate section, but the same stage with
  // About Us slid off it. 0 = About Us in place, 1 = fully handed over. Kept
  // as a motion value rather than component state so the slide itself never
  // re-renders anything — the DOM side reads it through useTransform, and
  // every WebGL side reads it inside its own frame loop (see SlideGroup and
  // the grid's x phase above). isTeamOpen exists alongside it only for the
  // things that genuinely are discrete: which way the next animation runs,
  // and what the arrows do when clicked.
  const [isTeamOpen, setIsTeamOpen] = useState(false)
  const teamProgress = useMotionValue(0)
  useEffect(() => {
    const controls = animate(teamProgress, isTeamOpen ? 1 : 0, TEAM_SLIDE_TRANSITION)
    return () => controls.stop()
  }, [isTeamOpen, teamProgress])
  // Closing About Us entirely (scrolling back down to the hero) leaves the
  // team stage open behind it otherwise, so re-opening About Us later would
  // land on a screen with everything already slid away and no way back to it
  // but the arrow. Reset rather than animate — this happens while the whole
  // section is off-screen, where a visible transition would be wasted work
  // no one sees.
  useEffect(() => {
    if (!isOpen && isTeamOpen) {
      setIsTeamOpen(false)
      teamProgress.set(0)
    }
  }, [isOpen, isTeamOpen, teamProgress])
  // The one thing exposed to the navbar (see the forwardRef comment above) —
  // animated, not reset outright, since this is reachable while the section
  // is fully visible and on screen, unlike the instant reset just above.
  // A no-op when isTeamOpen is already false, which is exactly what should
  // happen when "About Us" is clicked from About Us proper: nothing moves.
  // A getter, not the raw boolean — useImperativeHandle's factory here only
  // ever runs once (empty deps), so a plain `isTeamOpen` value captured at
  // that first render would freeze at whatever it was then. isTeamOpenRef
  // is kept current by the effect below; reading through it at call time
  // (from GlassLogoPreview's own wheel handler, to suppress the scroll-down
  // dismiss while the team stage is up) always sees the live value.
  const isTeamOpenRef = useRef(isTeamOpen)
  useEffect(() => {
    isTeamOpenRef.current = isTeamOpen
  }, [isTeamOpen])
  useImperativeHandle(
    ref,
    () => ({ closeTeam: () => setIsTeamOpen(false), isTeamOpen: () => isTeamOpenRef.current }),
    [],
  )

  // Which member's enlarged profile is showing, or null for the seven-photo
  // grid. Lives here rather than inside MeetTheTeamGrid because the arrows
  // that walk through it are AboutUsIntro's, so this is the nearest place
  // that renders both.
  const [selectedMember, setSelectedMember] = useState(null)
  // Leaving the team stage drops any open profile with it — otherwise
  // re-opening later would land straight back inside a detail view rather
  // than on the grid it was reached from.
  useEffect(() => {
    if (!isTeamOpen) setSelectedMember(null)
  }, [isTeamOpen])

  // What the two arrows do while the team stage is up. Three different jobs
  // share the same pair of controls, so the branching lives here (one place
  // that knows all three states) rather than being spread across the arrows
  // themselves:
  //
  // - grid showing: left goes back to About Us, right has nowhere to go.
  // - a profile open: the arrows walk through the members in layout order.
  // - either end of that order: stepping past it returns to the grid, which
  //   is the only way out of detail mode.
  const teamPrev = () => {
    if (selectedMember == null) {
      setIsTeamOpen(false)
    } else if (selectedMember === 0) {
      setSelectedMember(null)
    } else {
      setSelectedMember(selectedMember - 1)
    }
  }
  const teamNext = () => {
    if (selectedMember == null) return
    if (selectedMember === TEAM_MEMBER_COUNT - 1) {
      setSelectedMember(null)
    } else {
      setSelectedMember(selectedMember + 1)
    }
  }

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
        <SeamlessGridBackdrop aboutUsProgress={aboutUsProgress} teamProgress={teamProgress} gridMetricsRef={gridMetricsRef} />
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
          {/* ACCENT_SPEED, not the main travel — GlassCircle is one of the
              two glass objects asked to leave at their own pace (see
              teamTransition). */}
          <SlideGroup progress={teamProgress} speed={ACCENT_SPEED}>
            {sceneReady && <GlassCircle domRect={circleRect} isOpen={isOpen} highQuality={tier === 'high'} />}
          </SlideGroup>
          {/* A glass icon beside whichever member's name is open in the Meet
              the Team detail view (see MEMBERS[...].nameIcon in teamData.js).
              In THIS canvas, deliberately — not the team-photo badge's
              overlay one — for the same reason GlassCircle and the plaque
              above are here: this canvas's own grid/blob are on the default
              layer, so TransmissionMaterial's plain backdrop capture picks
              them up and the glass actually shows grid lines through it. See
              GlassIcon's own top comment for what happens when it isn't.
              Being behind the DOM (this canvas sits under AboutUsIntro and
              MeetTheTeamGrid) is fine: those are transparent except for
              their own text/photos, and this icon lands in the empty space
              beside the name.
              Anchored to nameIconMarkerRect — measured via
              useDomAnchorRectForNode (see that hook's own comment for why
              a measured rect is right here) rather than computed from grid
              layout. slidePx is teamContentSlidePx, not the mainSlidePx
              every other SlideGroup here defaults to: this icon belongs to
              MeetTheTeamGrid's own DOM content, which travels on that
              different function (see teamTransition.js). */}
          {sceneReady && isTeamOpen && nameIconMarkerRect && MEMBERS[selectedMember]?.nameIcon && (
            // Its own nested Suspense boundary, not just relying on the
            // outer one this whole block already sits inside — each
            // member's nameIcon SVG is a distinct URL, so useLoader
            // genuinely suspends on the *first* time a given member's icon
            // is requested (cached, and silent, on every later visit to the
            // same profile — the exact pattern reported: "flashes the first
            // time... only when going back to previously seen profiles does
            // the flashing stop"). Without an inner boundary, that
            // suspension bubbles up to the outer Suspense wrapping this
            // entire canvas's content, which falls back to fallback={null}
            // for *everything* under it — RandomGridGlow, DecorativeGridSquares,
            // GlassCircle, the badges — unmounting and remounting all of
            // them, which is what actually read as "the lit up squares
            // flash." Scoping the fallback to just this one icon's own
            // subtree means only it (briefly, invisibly) disappears and
            // reappears, never its unrelated siblings.
            <Suspense fallback={null}>
              {/* Keyed on the member, same as MemberDetailPanel's own key —
                  without this, switching between two members who both have a
                  nameIcon just updates props on the *same* GlassIcon instance
                  (same component, same position in the tree), so its entrance
                  animation — driven by a mount-time ref inside GlassIcon —
                  only ever plays once per session, for whichever member's
                  icon happened to be the first one shown. Reported directly as
                  "why don't they all have the entrance animation". A fresh key
                  forces a genuine remount on every switch, replaying it for
                  every profile. */}
              <SlideGroup key={MEMBERS[selectedMember].id} progress={teamProgress} slidePx={teamContentSlidePx}>
                <GlassIcon
                  svgUrl={`/${MEMBERS[selectedMember].nameIcon.svg}.svg`}
                  viewBoxSize={MEMBERS[selectedMember].nameIcon.viewBoxSize}
                  depthScale={MEMBERS[selectedMember].nameIcon.depthScale}
                  sizeScale={MEMBERS[selectedMember].nameIcon.sizeScale}
                  bevelEnabled={MEMBERS[selectedMember].nameIcon.bevelEnabled}
                  domRect={nameIconDomRect(nameIconMarkerRect)}
                  isOpen={isOpen}
                  highQuality={tier === 'high'}
                />
              </SlideGroup>
            </Suspense>
          )}
          {/* Unconditional on sceneReady alone — same as GlassCircle just
              above, never gated on isTeamOpen.
              Positioned purely analytically (computeLayout, no DOM rect to
              wait on), so unlike nameIcon there's no technical reason to
              mount/unmount this at all: SlideGroup's own teamContentSlidePx
              already carries it off past the right edge while About Us
              shows (progress 0) and into place as the team stage slides in
              (progress 1), exactly the way the real DOM photo tiles arrive —
              gating this on isTeamOpen as well was still replaying the
              reveal animation (and popping the squares in/out) on every
              About Us <-> Meet the Team toggle, reported directly as still
              happening after the first fix (which only addressed the
              grid<->detail toggle). Staying mounted the whole time removes
              the mount/unmount cycle entirely — visible (a plain
              group.visible toggle inside GlassIcon, not another mount) is
              what hides these specifically in the detail view, since they
              shouldn't show there either but must stay mounted to avoid
              replaying the reveal a third way. */}
          {sceneReady && (
            <DecorativeGridSquares
              teamProgress={teamProgress}
              isOpen={isOpen}
              highQuality={tier === 'high'}
              visible={selectedMember == null}
            />
          )}
          {/* Same unconditional-on-sceneReady/visible-toggle treatment as
              DecorativeGridSquares just above, for the same reason: plain
              text has no mount-time reveal to worry about replaying, but
              keeping it consistently mounted and just toggling visible
              avoids re-deriving that argument twice. */}
          {/* No isTeamOpen/visible gate any more — see BoardTitleWord's own
              comment: it now fades its real fillOpacity continuously off of
              teamProgress itself, which is what actually fixed both the
              abrupt disappearance *and* keeps it invisible at rest without
              a separate boolean cutoff. hideForDetail is the one remaining
              instant cut, for the unrelated grid<->detail transition. */}
          {sceneReady && (
            <BoardTitleWord teamProgress={teamProgress} isTeamOpen={isTeamOpen} hideForDetail={selectedMember != null} />
          )}
          {/* Unconditional on sceneReady alone, same as DecorativeGridSquares/
              BoardTitleWord and for the same reason — see RandomGridGlow's
              own comment: mounting/unmounting with isTeamOpen prevented it
              from ever sliding with the grid at all. */}
          {sceneReady && <RandomGridGlow teamProgress={teamProgress} />}
          {/* The same faint squares on About Us's own side of the slide —
              mounted unconditionally for the identical reason, so it can
              ride the slide out rather than popping. */}
          {sceneReady && <AboutUsGridGlow teamProgress={teamProgress} gridMetricsRef={gridMetricsRef} />}
          {sceneReady && tier === 'high' && <ReflectionEnvironment environmentIntensity={1.3} />}
        </Suspense>
        <SceneRenderGate isVisibleRef={isVisibleRef} />
      </Canvas>

      {/* Click-anywhere-to-close backdrop for the detail view — asked for
          directly: clicking anywhere on the Detailed Profiles screen that
          isn't the text, the scrollbar, or the arrows brings the user back
          to the grid. Positioned here, before both AboutUsIntro (the
          arrows) and MeetTheTeamGrid (the name/role/bio text, each given
          their own pointer-events-auto specifically to sit above this) so
          plain DOM stacking order — not a z-index fight — is what keeps
          every exempted element clickable: this has no explicit z-index of
          its own, so it always paints beneath both siblings' own z-50
          content, regardless of screen position. pointer-events-auto only
          while a profile is actually open, so it never intercepts clicks
          on the grid itself or on About Us. */}
      {selectedMember != null && (
        <div className="pointer-events-auto absolute inset-0" onClick={() => setSelectedMember(null)} />
      )}
      <AboutUsIntro
        isOpen={isOpen}
        aboutUsProgress={aboutUsProgress}
        badgeAnchorRef={badgeAnchorRef}
        windowRef={photoWindowRef}
        onPhotoChange={setCurrentPhoto}
        teamProgress={teamProgress}
        isTeamOpen={isTeamOpen}
        onOpenTeam={() => setIsTeamOpen(true)}
        onTeamPrev={teamPrev}
        onTeamNext={teamNext}
        teamNextDisabled={selectedMember == null}
      />
      {/* The stage About Us hands over to — parked one slide-distance to the
          right until teamProgress moves. Sits here, before the badge's own
          overlay canvas below, so the badge's glass still paints over these
          photos on the way past rather than under them. */}
      <MeetTheTeamGrid
        teamProgress={teamProgress}
        isTeamOpen={isTeamOpen}
        selectedIndex={selectedMember}
        onSelect={setSelectedMember}
        nameIconAnchorRef={setNameIconAnchorNode}
      />
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
            {/* ACCENT_SPEED — the Google Cloud logo is the other glass object
                that leads the slide (see teamTransition). It drifts away from
                the photo it normally hangs off as it goes, which is the whole
                point of giving the two different speeds. */}
            <SlideGroup progress={teamProgress} speed={ACCENT_SPEED}>
              {sceneReady && <GoogleCloudGlassBadge domRect={badgeRect} isOpen={isOpen} highQuality={tier === 'high'} />}
            </SlideGroup>
            {/* Gives the badge's glass an actual backdrop to refract — see
                PhotoBackdropCapture's own top comment. Gated on tier==='high'
                alongside ReflectionEnvironment below, not on isOpen or
                sceneReady alone: it's meaningless without the real
                TransmissionMaterial the low-quality meshPhysicalMaterial
                branch skips entirely (see GoogleCloudGlassBadge). Loads its
                own texture by hand rather than via useTexture now (see its
                own top comment) specifically so it no longer suspends on
                every slideshow swap — back on the shared boundary below
                rather than one of its own, since there's nothing left here
                that would trigger it. */}
            {/* Both capture planes ride the *main* speed, not the badge's:
                they exist to stand in for the DOM photo and its corner mark
                inside the glass's refraction, so they have to stay locked to
                where that photo actually is on screen. Wrapped together in
                one group for exactly that reason. */}
            <SlideGroup progress={teamProgress}>
              {sceneReady && tier === 'high' && <PhotoBackdropCapture domRect={photoRect} src={currentPhoto} />}
              {/* See CornerBracketCapture's own top comment — the bottom-right
                  bracket mark sits under the badge just like the photo does,
                  and needs the same treatment to stay visible through it. */}
              {sceneReady && tier === 'high' && <CornerBracketCapture windowRect={photoRect} />}
            </SlideGroup>
            {/* See CaptureGridBackdrop's own top comment — the other half
                of what the badge's glass refracts, alongside the photo
                above. */}
            {sceneReady && tier === 'high' && <CaptureGridBackdrop aboutUsProgress={aboutUsProgress} teamProgress={teamProgress} />}
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
})

export default AboutUsSection
