import { useEffect, useRef, useState } from 'react'
import { Html, shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import { DIRECT_STYLE, EDGE_STYLE, OVERSCALE, TARGET_CELL_PX, THROUGH_GLASS_STYLE } from './gridConstants'
import { OVERLAY_LAYER } from './GlassLogoGroup'

// Three of the grid's own cells, promoted into square buttons — their 4
// corners drawn as bigger, brighter blue versions of the ambient grid's own
// plus marks (see cornerMask in GridPatternMaterial), still sized/spaced
// off the same TARGET_CELL_PX grid everything else here uses, so they read
// as part of the grid rather than something pasted on top of it. Each
// carries a label (see BackgroundGrid) that shows only while it's hovered
// or selected.
const BUTTON_STYLE = {
  halfWidthPx: 1.5,
  blurPx: 1.5,
  armLengthPx: 14,
  armBlurPx: 2,
  opacity: 0.9,
  color: [0.23, 0.51, 0.96], // #3B82F6 — the same blue used elsewhere on the piece
}
// Hand-picked (not derived from BUTTON_STYLE.color — attempts to lighten or
// saturate the base blue via HSL/HSV kept reading as a muted version of it,
// no matter how the math was tuned) vivid sky blue for whichever button is
// currently hovered. A pure hover cue, deliberately not tied to selection: a
// selected-but-unhovered button's corners fall back to the plain base blue,
// same as the other two (see activeIndex={hoveredIndex} in BackgroundGrid).
// Applied per button (see uButtonIntensity), so only the hovered square's
// own corners shift color.
const BUTTON_ACTIVE_COLOR = [107 / 255, 185 / 255, 255 / 255] // #6BB9FF
// Exponential-smoothing time constant (see GridPlane's useFrame) for easing
// each button's intensity toward its target (1 = hovered, 0 otherwise) —
// just enough to keep the color shift from hard-cutting on a quick hover
// flicker, not a visible animation in its own right.
const BUTTON_ACTIVE_TAU = 0.15
// First-load entrance (see uEntranceOpacity in GridPatternMaterial, and
// entranceStartRef in GridPlane's useFrame) — how long the whole pattern
// (ambient grid, plus marks, and button corners together) takes to fade in
// from nothing the first time each plane has something to show. Applies
// equally to the hero's own grid and BackgroundGlowSection's, since both
// render through this same GridPlane.
const ENTRANCE_DURATION = 1
// Zero velocity at both ends (unlike easeOutCubic, which starts at full
// speed) — same reasoning as HeroTitle's own identically-named helper,
// duplicated rather than imported since these two files don't otherwise
// share code and a single trivial function isn't worth a shared module for.
function smoothstepEase(t) {
  return t * t * (3 - 2 * t)
}
// Columns are counted in from the right edge of the grid (not an absolute
// index) so the buttons stay the same number of cells from the edge
// regardless of window width — 2 in from the last full column, for a
// little breathing room off the screen edge.
const BUTTON_COLUMN_FROM_RIGHT = 2
// Row offsets from true vertical center (y=0 in this viewport's local
// coordinates — see buttonPositions in BackgroundGrid), in whole cells —
// adjacent cells (one TARGET_CELL_PX apart) rather than spread further out,
// so the three read as one grouped control rather than three unrelated
// marks, and symmetric (1, 0, -1) so the block is always exactly centered
// regardless of window height. Larger offset = further up the screen (+Y)
// — paired with BUTTON_LABELS below in the same top-to-bottom order the
// labels were given in.
const BUTTON_ROW_OFFSETS = [1, 0, -1]
const BUTTON_LABELS = ['AI for Academia', 'AI for Enterprises', 'AI for Achievers']
// Which button gets the "[COMING SOON]" caption below its own label — a
// label lookup, not a hardcoded row index, so this keeps pointing at the
// right button if BUTTON_LABELS' own order ever changes again.
const COMING_SOON_LABEL = 'AI for Achievers'
// Offsets from that button's own label start (see LABEL_START_X_FACTOR),
// in fractions of a cell: right, to sit further in than "AI for Achievers"
// itself rather than lining up flush under its first letter — and down,
// just enough clearance below the label's own line for a second line to
// read as "under" it rather than crowding it.
const COMING_SOON_RIGHT_OFFSET = 0.5
const COMING_SOON_Y_OFFSET = 0.14

// Procedural, like GradientBlob — a plane + a cheap fragment shader instead
// of a CanvasTexture. Draws a faint grid with a soft, feathered (not crisp)
// plus mark at each intersection, plus (optionally, see uButtonsEnabled)
// three larger blue ones marking the button cells.
const GridPatternMaterial = shaderMaterial(
  {
    uRepeat: [1, 1],
    // Added to the Y-phase below (see uYPhaseShiftCells in the fragment
    // shader) — 0 for every existing use (the hero's own grid), so this
    // changes nothing here. Exists purely so a *second*, separate canvas
    // elsewhere on the page (see BackgroundGlowSection) can tile its own
    // copy of this same pattern starting exactly where the hero's grid
    // leaves off, instead of restarting its own phase from its own center.
    uYPhaseShiftCells: 0,
    uLineHalfWidth: 0.002,
    uLineBlur: 0.006,
    uPlusHalfWidth: 0.002,
    uPlusBlur: 0.012,
    uPlusArmLength: 0.02,
    uPlusArmBlur: 0.018,
    uLineOpacity: 0.05,
    uPlusOpacity: 0.11,
    uButtonsEnabled: 0,
    uButtonColumnLeftUV: 0,
    uButtonColumnRightUV: 0,
    uButtonBottomUV: [0, 0, 0],
    uButtonTopUV: [0, 0, 0],
    uButtonHalfWidth: 0.01,
    uButtonBlur: 0.01,
    uButtonArmLength: 0.08,
    uButtonArmBlur: 0.01,
    uButtonOpacity: 0.9,
    uButtonColor: [0.23, 0.51, 0.96],
    uButtonActiveColor: [0.23, 0.51, 0.96],
    // Per-button 0..1 hover/select intensity, eased in GridPlane's
    // useFrame — see BUTTON_ACTIVE_COLOR/BUTTON_ACTIVE_TAU.
    uButtonIntensity: [0, 0, 0],
    // A single highlighted edge — see EDGE_STYLE. uEdgeX/BottomUV/TopUV are
    // real grid-line coordinates computed in JS (BackgroundGlowSection), not
    // derived from this pattern's own cell index, so the line stays exactly
    // where an adjacent label expects it, the same relationship the button
    // corners above have with their own JS-computed UVs.
    uEdgeEnabled: 0,
    uEdgeX: 0,
    uEdgeBottomUV: 0,
    uEdgeTopUV: 0,
    uEdgeHalfWidth: 0.01,
    uEdgeBlur: 0.05,
    uEdgeColor: [0.23, 0.51, 0.96],
    uEdgeOpacity: 0.9,
    // First-load entrance — see ENTRANCE_DURATION in GridPlane's useFrame.
    // A single multiplier on the final alpha, not a per-style/per-button
    // opacity change, so the whole pattern (ambient lines, plus marks, and
    // button corners together) fades in as one piece instead of each
    // needing its own separate ramp. Defaults to 0, not 1 — this plane
    // mounts showing whatever's given here for one frame before useFrame
    // ever runs, so starting at 1 meant the grid flashed in at full
    // strength, then dropped back to 0 the instant useFrame took over and
    // began the real fade-in — a visible stutter, exactly backwards from
    // an entrance.
    uEntranceOpacity: 0,
  },
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    uniform vec2 uRepeat;
    uniform float uYPhaseShiftCells;
    uniform float uLineHalfWidth;
    uniform float uLineBlur;
    uniform float uPlusHalfWidth;
    uniform float uPlusBlur;
    uniform float uPlusArmLength;
    uniform float uPlusArmBlur;
    uniform float uLineOpacity;
    uniform float uPlusOpacity;
    uniform float uButtonsEnabled;
    uniform float uButtonColumnLeftUV;
    uniform float uButtonColumnRightUV;
    uniform vec3 uButtonBottomUV;
    uniform vec3 uButtonTopUV;
    uniform float uButtonHalfWidth;
    uniform float uButtonBlur;
    uniform float uButtonArmLength;
    uniform float uButtonArmBlur;
    uniform float uButtonOpacity;
    uniform vec3 uButtonColor;
    uniform vec3 uButtonActiveColor;
    uniform vec3 uButtonIntensity;
    uniform float uEdgeEnabled;
    uniform float uEdgeX;
    uniform float uEdgeBottomUV;
    uniform float uEdgeTopUV;
    uniform float uEdgeHalfWidth;
    uniform float uEdgeBlur;
    uniform vec3 uEdgeColor;
    uniform float uEdgeOpacity;
    uniform float uEntranceOpacity;

    // Distance along one axis, but only counted on the side of the corner
    // where sign(dSigned) matches requiredSign (±1) — the arm's "inward"
    // direction. On the other side, returns 1.0 (far outside any arm's
    // halfWidth/armLength, both « 1 in cell units), so that half of the
    // cross never draws.
    float cornerArmDist(float dSigned, float requiredSign) {
      float allowed = requiredSign * dSigned;
      return allowed >= 0.0 ? allowed : 1.0;
    }

    // Same arm-cross shape as the ambient plus above, evaluated around one
    // specific grid corner (colUV, rowUV) with each axis optionally
    // restricted to one inward direction — see cornerArmDist.
    float cornerMask(vec2 uv, vec2 repeatCells, float colUV, float colSign, float rowUV, float rowSign,
                      float halfWidth, float blur, float armLength, float armBlur) {
      float dx = cornerArmDist((uv.x - colUV) * repeatCells.x, colSign);
      float dy = cornerArmDist((uv.y - rowUV) * repeatCells.y, rowSign);
      float armV = (1.0 - smoothstep(halfWidth, halfWidth + blur, dx))
                 * (1.0 - smoothstep(armLength, armLength + armBlur, dy));
      float armH = (1.0 - smoothstep(halfWidth, halfWidth + blur, dy))
                 * (1.0 - smoothstep(armLength, armLength + armBlur, dx));
      return max(armV, armH);
    }

    void main() {
      // Position within the current cell, as distance to the nearest grid
      // line on each axis (0 at the line, up to 0.5 at the cell center).
      // X keeps the plane's own left-edge phase (vUv.x = 0), matching
      // buttonColumn's own left-edge-anchored cell counting in JS. Y is
      // rephased around vUv.y = 0.5 — the viewport's true vertical center —
      // instead: a plain fract(vUv.y * uRepeat.y) ties the grid's corners to
      // the plane's *bottom* edge, which drifts relative to true center as
      // the window resizes (repeat.y is rarely a whole number), so nothing
      // in JS could reliably land a button square's corners on real grid
      // corners *and* keep the block centered at the same time. Anchoring
      // the phase at the center directly instead guarantees a grid corner
      // sits at exactly worldY = ±0.5*cellSize, ±1.5*cellSize, ... for any
      // window height — precisely where BackgroundGrid's buttonPositions
      // (offsets of a whole cellSize from y=0) put each button square's own
      // corners, so the two now can't drift apart.
      vec2 cell = vec2(
        fract(vUv.x * uRepeat.x),
        fract((vUv.y - 0.5) * uRepeat.y + 0.5 + uYPhaseShiftCells)
      );
      vec2 dLine = min(cell, 1.0 - cell);

      float vLine = 1.0 - smoothstep(uLineHalfWidth, uLineHalfWidth + uLineBlur, dLine.x);
      float hLine = 1.0 - smoothstep(uLineHalfWidth, uLineHalfWidth + uLineBlur, dLine.y);
      float gridMask = max(vLine, hLine) * uLineOpacity;

      // Plus = a short arm along each axis, centered on the intersection.
      float armV = (1.0 - smoothstep(uPlusHalfWidth, uPlusHalfWidth + uPlusBlur, dLine.x))
                 * (1.0 - smoothstep(uPlusArmLength, uPlusArmLength + uPlusArmBlur, dLine.y));
      float armH = (1.0 - smoothstep(uPlusHalfWidth, uPlusHalfWidth + uPlusBlur, dLine.y))
                 * (1.0 - smoothstep(uPlusArmLength, uPlusArmLength + uPlusArmBlur, dLine.x));
      float plusMask = max(armV, armH) * uPlusOpacity;

      // Button squares: not one big plus per button, but the *corners* of
      // each button square — a bigger, brighter blue version of the same
      // arm-cross the ambient grid draws at every intersection, but only
      // the one or two arms that reach into that square. Evaluated per
      // button (its own bottom/top from uButtonBottomUV/uButtonTopUV, left/
      // right shared by all three), each with all 4 corner arms pointing
      // inward — so a button's own 4 corners always draw a consistent
      // "square", and where two buttons share a corner, each contributes
      // its own inward half. Shape/size is the same for all three; the only
      // thing that changes per button is color — see uButtonIntensity below
      // — so whichever button's mask is currently strongest at this pixel
      // also decides the color drawn there. Positioned from UV-space
      // geometry computed in BackgroundGrid (see buttonBottomY/buttonTopY
      // there), not this pattern's own cell index, so they stay exactly
      // where the JS-side hit-zones/labels expect them regardless of window
      // resize.
      float buttonMask = 0.0;
      vec3 buttonColor = uButtonColor;
      // Alpha-blending even the fully-saturated uButtonActiveColor at the
      // base uButtonOpacity (0.9) against the dark backdrop dilutes it back
      // toward muted — the composited pixel, not just the source color, is
      // what actually reads as "vivid." Fading opacity up to fully opaque
      // alongside the color removes that dilution right when it matters.
      float buttonOpacity = uButtonOpacity;
      if (uButtonsEnabled > 0.5) {
        float left = uButtonColumnLeftUV;
        float right = uButtonColumnRightUV;
        float bottoms[3];
        bottoms[0] = uButtonBottomUV.x;
        bottoms[1] = uButtonBottomUV.y;
        bottoms[2] = uButtonBottomUV.z;
        float tops[3];
        tops[0] = uButtonTopUV.x;
        tops[1] = uButtonTopUV.y;
        tops[2] = uButtonTopUV.z;
        float intensities[3];
        intensities[0] = uButtonIntensity.x;
        intensities[1] = uButtonIntensity.y;
        intensities[2] = uButtonIntensity.z;

        for (int i = 0; i < 3; i++) {
          float bl = cornerMask(vUv, uRepeat, left,  1.0, bottoms[i],  1.0, uButtonHalfWidth, uButtonBlur, uButtonArmLength, uButtonArmBlur);
          float br = cornerMask(vUv, uRepeat, right, -1.0, bottoms[i],  1.0, uButtonHalfWidth, uButtonBlur, uButtonArmLength, uButtonArmBlur);
          float tl = cornerMask(vUv, uRepeat, left,  1.0, tops[i],    -1.0, uButtonHalfWidth, uButtonBlur, uButtonArmLength, uButtonArmBlur);
          float tr = cornerMask(vUv, uRepeat, right, -1.0, tops[i],   -1.0, uButtonHalfWidth, uButtonBlur, uButtonArmLength, uButtonArmBlur);
          float squareMask = max(max(bl, br), max(tl, tr));
          if (squareMask > buttonMask) {
            buttonMask = squareMask;
            buttonColor = mix(uButtonColor, uButtonActiveColor, intensities[i]);
            buttonOpacity = mix(uButtonOpacity, 1.0, intensities[i]);
          }
        }
        buttonMask *= buttonOpacity;
      }

      // A single highlighted edge: a solid line-segment (not a corner
      // cross) along vUv.x = uEdgeX, spanning only from uEdgeBottomUV to
      // uEdgeTopUV — one cell's own height. Only the line's *width* gets
      // uEdgeHalfWidth/uEdgeBlur's small anti-aliasing feather (dx is in
      // the same "fraction of a cell" units as dLine.x above, uRepeat.x
      // converting UV distance to cell units, so it compares directly the
      // same way uLineHalfWidth/uLineBlur do for the ambient grid's lines)
      // — the two ends are a hard step(), landing exactly on
      // uEdgeBottomUV/uEdgeTopUV with no feather at all, so the segment
      // reads as a crisp rectangle rather than a glow that fades out top
      // and bottom.
      float edgeMask = 0.0;
      if (uEdgeEnabled > 0.5) {
        float dx = abs(vUv.x - uEdgeX) * uRepeat.x;
        float line = 1.0 - smoothstep(uEdgeHalfWidth, uEdgeHalfWidth + uEdgeBlur, dx);
        float within = step(uEdgeBottomUV, vUv.y) * step(vUv.y, uEdgeTopUV);
        edgeMask = line * within * uEdgeOpacity;
      }

      float alpha = max(max(max(gridMask, plusMask), buttonMask), edgeMask) * uEntranceOpacity;
      vec3 color = mix(vec3(1.0), buttonColor, step(0.0001, buttonMask));
      color = mix(color, uEdgeColor, step(0.0001, edgeMask));
      gl_FragColor = vec4(color, alpha);
    }
  `,
)

extend({ GridPatternMaterial })

export function GridPlane({
  z,
  width,
  height,
  repeat,
  style,
  layer,
  yPhaseShiftCells = 0,
  buttonColumnLeftUV,
  buttonColumnRightUV,
  buttonBottomUV,
  buttonTopUV,
  activeIndex,
  edgeXUV,
  edgeBottomUV,
  edgeTopUV,
}) {
  const pxToFraction = (px) => px / TARGET_CELL_PX
  const buttonsEnabled = buttonColumnLeftUV != null
  const edgeEnabled = edgeXUV != null
  const materialRef = useRef(null)
  // Each button's own eased 0..1 color-mix intensity (see uButtonActiveColor
  // in GridPatternMaterial), exponentially smoothed toward whichever index
  // is currently hovered (activeIndex — see BUTTON_ACTIVE_TAU) — a ref, not
  // state, since it changes every frame and only ever needs to reach the
  // shader uniform, never trigger a re-render.
  const intensityRef = useRef([0, 0, 0])
  // First-load entrance (see uEntranceOpacity in GridPatternMaterial) — set
  // on this plane's own first frame, same one-time-only pattern as
  // GlassLogoGroup/HeroTitle's entrances.
  const entranceStartRef = useRef(null)

  useFrame((state, delta) => {
    const material = materialRef.current
    if (!material) return

    if (entranceStartRef.current === null) entranceStartRef.current = state.clock.elapsedTime
    const entranceT = Math.min((state.clock.elapsedTime - entranceStartRef.current) / ENTRANCE_DURATION, 1)
    material.uniforms.uEntranceOpacity.value = smoothstepEase(entranceT)

    if (!buttonsEnabled) return
    const intensity = intensityRef.current
    // 1 - e^(-delta/tau): frame-rate-independent exponential smoothing —
    // each frame closes the same *fraction* of the remaining gap to the
    // target regardless of how long that frame took.
    const rate = 1 - Math.exp(-delta / BUTTON_ACTIVE_TAU)
    for (let i = 0; i < intensity.length; i++) {
      const target = i === activeIndex ? 1 : 0
      intensity[i] += (target - intensity[i]) * rate
    }
    // uButtonIntensity's default ([0, 0, 0], see GridPatternMaterial) is a
    // plain array, not a THREE.Vector3 — drei's shaderMaterial doesn't
    // upgrade array defaults to vector instances, so .value has no .set();
    // mutate the array's own elements in place instead.
    const value = material.uniforms.uButtonIntensity.value
    value[0] = intensity[0]
    value[1] = intensity[1]
    value[2] = intensity[2]
  })

  return (
    <mesh
      position={[0, 0, z]}
      scale={[width * OVERSCALE, height * OVERSCALE, 1]}
      raycast={() => null}
      ref={(el) => el?.layers.set(layer)}
    >
      <planeGeometry args={[1, 1]} />
      <gridPatternMaterial
        ref={materialRef}
        uRepeat={repeat}
        uYPhaseShiftCells={yPhaseShiftCells}
        uLineHalfWidth={pxToFraction(style.lineHalfWidthPx)}
        uLineBlur={pxToFraction(style.lineBlurPx)}
        uPlusHalfWidth={pxToFraction(style.plusHalfWidthPx)}
        uPlusBlur={pxToFraction(style.plusBlurPx)}
        uPlusArmLength={pxToFraction(style.plusArmLengthPx)}
        uPlusArmBlur={pxToFraction(style.plusArmBlurPx)}
        uLineOpacity={style.lineOpacity}
        uPlusOpacity={style.plusOpacity}
        uButtonsEnabled={buttonsEnabled ? 1 : 0}
        uButtonColumnLeftUV={buttonColumnLeftUV ?? 0}
        uButtonColumnRightUV={buttonColumnRightUV ?? 0}
        uButtonBottomUV={buttonBottomUV ?? [0, 0, 0]}
        uButtonTopUV={buttonTopUV ?? [0, 0, 0]}
        uButtonHalfWidth={pxToFraction(BUTTON_STYLE.halfWidthPx)}
        uButtonBlur={pxToFraction(BUTTON_STYLE.blurPx)}
        uButtonArmLength={pxToFraction(BUTTON_STYLE.armLengthPx)}
        uButtonArmBlur={pxToFraction(BUTTON_STYLE.armBlurPx)}
        uButtonOpacity={BUTTON_STYLE.opacity}
        uButtonColor={BUTTON_STYLE.color}
        uButtonActiveColor={BUTTON_ACTIVE_COLOR}
        uEdgeEnabled={edgeEnabled ? 1 : 0}
        uEdgeX={edgeXUV ?? 0}
        uEdgeBottomUV={edgeBottomUV ?? 0}
        uEdgeTopUV={edgeTopUV ?? 0}
        uEdgeHalfWidth={pxToFraction(EDGE_STYLE.halfWidthPx)}
        uEdgeBlur={pxToFraction(EDGE_STYLE.blurPx)}
        uEdgeColor={EDGE_STYLE.color}
        uEdgeOpacity={EDGE_STYLE.opacity}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

// Invisible but still `visible` (Three.js's raycaster skips truly invisible
// objects) — opacity 0 is what actually hides it. Left on the default
// layer deliberately: R3F's pointer-event raycaster has its own `.layers`
// (separate from whatever the camera's own layers happen to be toggled to
// mid-frame for GlassLogoGroup's capture passes — see OVERLAY_LAYER there),
// defaulting to layer 0 only, so putting this on OVERLAY_LAYER would make
// it silently unclickable.
function ButtonHitZone({ x, y, z, size, onHover, onLeave, onSelect }) {
  return (
    <mesh
      position={[x, y, z]}
      onPointerEnter={onHover}
      onPointerLeave={onLeave}
      onClick={onSelect}
    >
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

// Rendered as a real DOM label (via drei's Html) using "Building the
// Future"'s own literal Tailwind classes, rather than a troika 3D-text
// approximation of them — the earlier attempt to hand-convert text-xs /
// tracking-[0.2em] / text-white/40 into troika fontSize/letterSpacing/
// fillOpacity units never actually matched, because troika and CSS are two
// independent text-rendering engines with their own font metrics (the same
// class of problem the hero title's crisp/blurred text alignment ran into
// earlier — see GlassLogoGroup). Reusing the identical className sidesteps
// that entirely: it's the same browser text engine rendering the same CSS,
// so it can't help but match.
//
// Fraction of a cell, from the cross, for the label's start point — a
// little under 0.5 (dead center) so it starts slightly left of center
// rather than exactly on it.
const LABEL_START_X_FACTOR = 0.4

// Sits between the blob backdrop and the glass logo in scene depth, so the
// logo's own depth-test occludes both planes below like any other object in
// the scene.
//
// Rendered as two coincident planes rather than one, because "crisp
// directly, soft through the glass" can't come from a single shader pass:
// MeshTransmissionMaterial's backdrop capture and the normal direct view are
// two different renders of the same default-layer content, so one mesh only
// has one look available to both. Splitting by layer gives each render its
// own version — see OVERLAY_LAYER in GlassLogoGroup for the on/off-per-pass
// mechanism this relies on:
//   - the through-glass plane stays on the default layer, so only the
//     capture pass (and thus the glass's own refraction) ever sees it;
//   - the direct plane sits on OVERLAY_LAYER, invisible to that capture,
//     so it only shows up in the final, straight-on view.
//
// The three button crosses (see BUTTON_STYLE) only render on the direct
// plane — they're meant to be seen and clicked, not glimpsed faintly
// through the logo. Their hit-zones and labels are computed here (not
// inside GridPlane) from the exact same repeat/cellSize the shader uses, so
// the interactive area and the label both land precisely on the visible
// cross regardless of window size — the same "compute once, share" approach
// that avoided drift everywhere else this piece uses derived layout math.
export function BackgroundGrid({ z, onActiveIndexChange, onScrollLockChange, isForceScrollingRef }) {
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)
  const { width, height } = viewport.getCurrentViewport(camera, [0, 0, z])
  // World-units-per-pixel at this depth, times the fixed pixel target — the
  // world-space cell size that projects to exactly TARGET_CELL_PX on screen
  // regardless of window size.
  const cellSize = TARGET_CELL_PX * (width / size.width)
  const repeat = [(width * OVERSCALE) / cellSize, (height * OVERSCALE) / cellSize]

  const buttonColumn = Math.floor(repeat[0]) - BUTTON_COLUMN_FROM_RIGHT
  // Left/right edges of the button column's cell — x doesn't need exact
  // centering (only top/bottom margins do), so this stays quantized to the
  // grid's own column phase like before.
  const buttonLeftX = -(width * OVERSCALE) / 2 + buttonColumn * cellSize
  const buttonRightX = buttonLeftX + cellSize
  const buttonCenterX = buttonLeftX + cellSize / 2
  // Each button's own world-space center, offset by whole cells from y=0 —
  // the viewport's true vertical center at this depth (see
  // useViewportAt/getCurrentViewport elsewhere in this piece). Building the
  // three centers directly from 0 keeps the block exactly 3*cellSize tall
  // and exactly centered — equal top/bottom margins at any window height,
  // guaranteed by construction rather than by rounding to the nearest row.
  // Hit-zones and labels (below) are sized/positioned off these centers.
  const buttonPositions = BUTTON_ROW_OFFSETS.map((offset) => ({
    x: buttonCenterX,
    y: offset * cellSize,
  }))
  // Looked up once here rather than inline in the JSX below, so a missing
  // match (BUTTON_LABELS edited without updating COMING_SOON_LABEL) fails
  // as "caption never shows" instead of crashing on a null buttonPositions
  // access.
  const comingSoonIndex = BUTTON_LABELS.indexOf(COMING_SOON_LABEL)
  const comingSoonPos = buttonPositions[comingSoonIndex]
  // Each button's own bottom/top row *corners* (not its center) — half a
  // cell below/above it, same order as buttonPositions/BUTTON_ROW_OFFSETS.
  // This reads as "three squares carved out of the grid" (rather than UI
  // floating independently over it) only because the shader's own y-phase
  // is deliberately matched to these same offsets: see GridPatternMaterial's
  // cell.y (fract((vUv.y - 0.5) * uRepeat.y + 0.5)), which — for any window
  // height — puts a real grid corner at exactly worldY = ±0.5*cellSize,
  // ±1.5*cellSize, .... Change one side of this without the other and the
  // button squares stop sitting on real grid intersections.
  const buttonBottomY = BUTTON_ROW_OFFSETS.map((offset) => (offset - 0.5) * cellSize)
  const buttonTopY = BUTTON_ROW_OFFSETS.map((offset) => (offset + 0.5) * cellSize)
  // Same geometry, expressed in UV space for the shader (see
  // uButtonColumnLeftUV/RightUV/uButtonBottomUV/uButtonTopUV in
  // GridPatternMaterial) — it only ever sees vUv, not world units.
  const buttonColumnLeftUV = (buttonLeftX + (width * OVERSCALE) / 2) / (width * OVERSCALE)
  const buttonColumnRightUV = (buttonRightX + (width * OVERSCALE) / 2) / (width * OVERSCALE)
  const buttonBottomUV = buttonBottomY.map((y) => (y + (height * OVERSCALE) / 2) / (height * OVERSCALE))
  const buttonTopUV = buttonTopY.map((y) => (y + (height * OVERSCALE) / 2) / (height * OVERSCALE))

  const [hoveredIndex, setHoveredIndex] = useState(null)
  // Starts on "AI for Academia" (index 0) rather than nothing selected, so
  // that label — and the hero title's matching "Learning" — show by
  // default instead of only on interaction.
  const [selectedIndex, setSelectedIndex] = useState(0)
  const visibleIndex = hoveredIndex ?? selectedIndex

  // Bubbles the currently-showing button up so the hero title (a sibling
  // under Canvas, not a descendant of this component) can swap its focal
  // word to match — see LEARNING_WORDS in HeroTitle.
  useEffect(() => {
    onActiveIndexChange?.(visibleIndex)
  }, [visibleIndex, onActiveIndexChange])

  // selectedIndex, not hoveredIndex — this used to key off hoveredIndex
  // specifically (a scroll lock that outlives the pointer leaving the
  // button, tied to selectedIndex, had no guaranteed way back once
  // scrolled somewhere the other two buttons weren't reachable to hover
  // instead). useLenis's own locked handling now closes that gap a
  // different way — forcing scroll back to the top *before* it actually
  // locks (see useLenis.js) — which guarantees all three buttons are
  // reachable the entire time the lock can possibly be engaged, so
  // selectedIndex persisting after hover is safe again here, and matches
  // "selected" (not just "currently hovering") actually meaning what it
  // says. Bubbled up to GlassLogoPreview, the nearest ancestor that owns
  // Lenis — see onScrollLockChange there.
  useEffect(() => {
    onScrollLockChange?.(selectedIndex === comingSoonIndex)
  }, [selectedIndex, comingSoonIndex, onScrollLockChange])

  return (
    <>
      <GridPlane z={z} width={width} height={height} repeat={repeat} style={THROUGH_GLASS_STYLE} layer={0} />
      <GridPlane
        z={z}
        width={width}
        height={height}
        repeat={repeat}
        style={DIRECT_STYLE}
        layer={OVERLAY_LAYER}
        buttonColumnLeftUV={buttonColumnLeftUV}
        buttonColumnRightUV={buttonColumnRightUV}
        buttonBottomUV={buttonBottomUV}
        buttonTopUV={buttonTopUV}
        // hoveredIndex, not visibleIndex — the color brighten is a pure
        // hover cue. Selecting a button keeps its label/hero-title tie-in
        // (see visibleIndex below) but its corners fall back to the same
        // base blue as the other two once the pointer leaves it.
        activeIndex={hoveredIndex}
      />

      {buttonPositions.map((pos, i) => (
        <ButtonHitZone
          key={i}
          // pos is already this button's square's own center (see
          // buttonPositions above), so the hit-zone sits directly on it —
          // no corner-to-center offset needed.
          x={pos.x}
          y={pos.y}
          z={z}
          size={cellSize}
          // Hovering a button *is* selecting it now — setSelectedIndex here
          // too, not just setHoveredIndex, so it's what's left showing
          // (visibleIndex falls back to selectedIndex) once the cursor
          // moves off again, rather than snapping back to whichever button
          // was selected before. onSelect (a real click) still sets it
          // independently — the only path that still matters on touch
          // devices, which have no hover at all.
          // isForceScrollingRef guards specifically against the moment
          // right after selecting "AI for Achievers": useLenis animates the
          // page back to the top over the next second or so (see
          // onScrollLockChange/isForceScrollingRef in useLenis.js), and the
          // *content* moving underneath a cursor that hasn't itself moved
          // can land it on a different button's now-shifted hit-zone —
          // registering as a genuine hover from this component's own point
          // of view, even though nothing about the user's actual pointer
          // gesture asked for it. Left unguarded, that silently re-selects
          // whatever button ends up under the cursor, undoing the very lock
          // that scroll-back exists to enforce, mid-animation, reading as a
          // jittery, unfinished-looking snap back. Ignoring hover
          // entirely while this is true removes that path completely; the
          // instant the user's pointer actually moves again once things
          // have settled, hover works normally.
          onHover={() => {
            if (isForceScrollingRef?.current) return
            setHoveredIndex(i)
            setSelectedIndex(i)
          }}
          onLeave={() => setHoveredIndex((current) => (current === i ? null : current))}
          onSelect={() => setSelectedIndex(i)}
        />
      ))}

      {/* All three always mounted (not just the visible one) — same
          "faint until hovered/selected" treatment as the navbar links (see
          NAV_LINKS in GlassLogoHero): dim by default, brightening to the
          same text-white/40 on a CSS color transition rather than
          mounting/unmounting with a rise+blur entrance. pos is each
          button's own square center, so its left edge sits cellSize/2 back
          from pos.x; the label starts a little further in than that
          (LABEL_START_X_FACTOR, just under half a cell) — a point a little
          left of the square's exact horizontal center. Vertically, drei's
          Html positions at pos.y directly plus the translateY(-50%) style
          below, since pos.y is already the square's vertical center.
          The text is a real, directly clickable button — same as the
          navbar links — via its own onClick below, since a DOM click here
          is consumed by this element and never reaches ButtonHitZone's mesh
          underneath. Hover is deliberately *not* independently handled
          here, though: R3F's raycaster runs off live pointer coordinates
          every frame regardless of which DOM element is visually on top
          (see eventSource in GlassLogoHero, which is what keeps those
          coordinates updating at all while over this label), so
          ButtonHitZone underneath already correctly reports "hovering"
          across the *entire* square, label included — this text is only a
          sub-region of it, positioned inside it. A first attempt gave the
          label its own onMouseEnter/onMouseLeave too, which seemed
          harmless (same hoveredIndex, same value) but wasn't: leaving the
          label's own small DOM box while still well inside the square
          fired this element's onMouseLeave and cleared hoveredIndex, with
          no compensating re-enter from the mesh (it never left, so it
          never re-fires) — so the button would drop back out of its
          hovered state the moment the cursor crossed from the text onto
          the rest of its own square. Leaving hover to the mesh alone,
          which already tracks the true full-square boundary correctly,
          avoids that entirely. */}
      {buttonPositions.map((pos, i) => (
        <Html
          key={i}
          position={[pos.x - cellSize / 2 + cellSize * LABEL_START_X_FACTOR, pos.y, z + 0.01]}
          // drei's Html only honors pointer-events via this inline style
          // (its `pointerEvents` prop is a no-op outside `transform`
          // mode) — kept pass-through on the wrapper itself (its box is
          // larger than the visible glyphs, e.g. line-height padding) so
          // that empty margin doesn't block ButtonHitZone's 3D hit-zone
          // underneath; the span below opts itself back in with its own
          // pointer-events-auto, so only the actual text is clickable.
          style={{ transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <span
            onClick={() => setSelectedIndex(i)}
            // fadeInUp (see index.css) is a first-load-only entrance, kept
            // separate from the transition-colors hover/select fade below —
            // that one needs to keep firing on every hover, this one only
            // once, ever, per label.
            className={`pointer-events-auto block animate-[fadeInUp_1s_ease-out_both] cursor-pointer select-none whitespace-nowrap text-xs font-extralight tracking-[0.2em] uppercase transition-colors duration-200 ${
              visibleIndex === i ? 'text-white/40' : 'text-white/15'
            }`}
          >
            {BUTTON_LABELS[i]}
          </span>
        </Html>
      ))}

      {/* "AI for Achievers"'s own caption — always mounted like the labels
          above (same reasoning: a fade, not a mount/unmount pop), but
          opacity-only, not color-only, since at rest this should be fully
          invisible rather than merely dim like the unselected labels are.
          Positioned off comingSoonPos directly, not derived from the label
          span above, so "AI for Achievers" itself never moves regardless of
          whether this is showing. */}
      {comingSoonPos && (
        <Html
          position={[
            comingSoonPos.x - cellSize / 2 + cellSize * (LABEL_START_X_FACTOR + COMING_SOON_RIGHT_OFFSET),
            comingSoonPos.y - cellSize * COMING_SOON_Y_OFFSET,
            z + 0.01,
          ]}
          style={{ transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <span
            // text-white/15 — the same grey GlassLogoHero's own nav links
            // (NAV_LINKS there) sit at while unselected, not the brighter
            // text-white/40 the grid labels above use, so this reads as a
            // quieter aside next to "AI for Achievers" rather than
            // competing with it for attention.
            className={`block cursor-default select-none whitespace-nowrap text-xs font-extralight tracking-[0.2em] uppercase text-white/15 transition-opacity duration-200 ${
              visibleIndex === comingSoonIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            [COMING SOON]
          </span>
        </Html>
      )}
    </>
  )
}
