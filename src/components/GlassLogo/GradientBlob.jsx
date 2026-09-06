import { useRef } from 'react'
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { Color } from 'three'
import {
  BLOB_CENTER,
  BLOB_CENTER_ANGRY,
  BLOB_CENTER_DIM,
  BLOB_CENTER_DRP,
  SCENE_BACKDROP,
  SCENE_BACKDROP_ANGRY,
  SCENE_BACKDROP_DIM,
  SCENE_BACKDROP_DRP,
  SCENE_BACKDROP_DRP_BRIGHT_TOP,
  SCENE_BACKDROP_DRP_BRIGHT_BOTTOM,
} from './sceneConstants'

const CENTER_DRP_BRIGHT_TOP = new Color(SCENE_BACKDROP_DRP_BRIGHT_TOP)
const CENTER_DRP_BRIGHT_BOTTOM = new Color(SCENE_BACKDROP_DRP_BRIGHT_BOTTOM)

// Procedural — no CanvasTexture allocation, just a plane + a cheap fragment
// shader. An irregular (non-circular) radius modulated by a few sine waves
// at different angular frequencies, slowly rotated over time.
const GradientBlobMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorCenter: new Color(BLOB_CENTER),
    uColorEdge: new Color(SCENE_BACKDROP),
    uColorTopBright: CENTER_DRP_BRIGHT_TOP,
    uColorBottomBright: CENTER_DRP_BRIGHT_BOTTOM,
    uRevealProgress: 0,
    // First-load entrance (see ENTRANCE_DURATION in GradientBlob's
    // useFrame). This material is always fully opaque (no `transparent`
    // prop set below — alpha is always written as 1.0), so an entrance
    // can't fade it out via alpha the way GridPlane's does; mixing the
    // output color toward uColorEdge instead works regardless, since
    // uColorEdge is already exactly the scene's own flat background color
    // — at 0 this plane reads as indistinguishable from empty background,
    // and at 1 it's the real, unmodified gradient.
    uEntranceProgress: 0,
  },
  /* glsl */ `
    varying vec2 vUv;
    varying vec4 vClipPos;
    void main() {
      vUv = uv;
      vClipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_Position = vClipPos;
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    varying vec4 vClipPos;
    uniform float uTime;
    uniform vec3 uColorCenter;
    uniform vec3 uColorEdge;
    uniform vec3 uColorTopBright;
    uniform vec3 uColorBottomBright;
    uniform float uRevealProgress;
    uniform float uEntranceProgress;

    void main() {
      vec2 p = vUv - 0.5;
      float angle = atan(p.y, p.x) + uTime * 0.05;
      float radius = length(p) * 2.0;

      // Very small, high-frequency perturbations only — this should read
      // as essentially circular with the faintest organic irregularity,
      // not a lobed/scalloped blob.
      // Subtle organic perturbation — kept gentle to prevent rippling wave-fronts
      float wobble = 0.0;
      wobble += sin(angle * 4.0 + uTime * 0.08) * 0.012;
      wobble += sin(angle * 6.0 - uTime * 0.12) * 0.008;

      float edge = 0.85 + wobble;
      float core = 0.08;
      float t = clamp((radius - core) / max(edge - core, 0.0001), 0.0, 1.0);
      // Ken Perlin's smootherstep (C2 continuous: zero 1st and 2nd derivatives at boundaries)
      // Completely eliminates perceptual inflection rings / Mach banding at the edge
      float smoother = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
      float falloff = clamp(1.0 - smoother, 0.0, 1.0);
      // Guard pow against infinitesimally zero/negative inputs that trigger GPU driver NaNs
      float glow = (falloff > 0.0001) ? pow(falloff, 1.6) * 0.5 : 0.0;
      vec3 color = mix(uColorEdge, uColorCenter, glow);
      // See uEntranceProgress above — blending the *result* back toward
      // uColorEdge (rather than, say, scaling glow itself down to 0) is
      // what makes 0 read as flat background instead of a dimmer-but-still
      // visible glow shape.
      color = mix(uColorEdge, color, uEntranceProgress);

      // Bright DRP_2 reveal state: vertical linear gradient spanning grid space
      // from #D9D7D7 on the top (screenY = 1.0) to #CBC7C6 on the bottom (screenY = 0.0)
      float screenY = clamp((vClipPos.y / vClipPos.w) * 0.5 + 0.5, 0.0, 1.0);
      vec3 brightGradient = mix(uColorBottomBright, uColorTopBright, screenY);
      color = mix(color, brightGradient, uRevealProgress);

      gl_FragColor = vec4(color, 1.0);
      #include <colorspace_fragment>

      // Screen-space high-frequency dithering (TPDF with Interleaved Gradient Noise)
      // Completely eliminates 8-bit color quantization banding and concentric rings
      vec2 screenCoord = gl_FragCoord.xy;
      float r1 = fract(52.9829189 * fract(dot(screenCoord, vec2(0.06711056, 0.00583715))));
      float r2 = fract(52.9829189 * fract(dot(screenCoord + vec2(17.3, 31.7), vec2(0.06711056, 0.00583715))));
      float r3 = fract(52.9829189 * fract(dot(screenCoord + vec2(43.9, 79.1), vec2(0.06711056, 0.00583715))));
      float r4 = fract(52.9829189 * fract(dot(screenCoord + vec2(89.3, 11.3), vec2(0.06711056, 0.00583715))));
      vec3 dither = vec3(
        r1 + r2 - 1.0,
        r2 + r3 - 1.0,
        r3 + r4 - 1.0
      ) * (1.25 / 255.0);
      gl_FragColor.rgb = clamp(gl_FragColor.rgb + dither, 0.0, 1.0);
    }
  `,
)

extend({ GradientBlobMaterial })

// A little slower than the grid/logo/title's own ~1-1.1s entrances — this
// is a big, soft ambient wash rather than a distinct foreground element, so
// a more gradual arrival reads as atmosphere settling in rather than
// competing with them for attention.
const ENTRANCE_DURATION = 1.4

function smoothstepEase(t) {
  return t * t * (3 - 2 * t)
}

// Every mood's own colour, built once at module scope rather than per frame.
// three.js colour-manages a hex string on construction, so these are already
// in the working space the uniforms below expect — lerping between two of
// them stays in that space, which lerping toward a raw hex parsed each frame
// would not reliably do.
const CENTER_LIT = new Color(BLOB_CENTER)
const CENTER_DIM = new Color(BLOB_CENTER_DIM)
const CENTER_ANGRY = new Color(BLOB_CENTER_ANGRY)
const CENTER_DRP = new Color(BLOB_CENTER_DRP)
const EDGE_LIT = new Color(SCENE_BACKDROP)
const EDGE_DIM = new Color(SCENE_BACKDROP_DIM)
const EDGE_ANGRY = new Color(SCENE_BACKDROP_ANGRY)
const EDGE_DRP = new Color(SCENE_BACKDROP_DRP)

export function GradientBlob({
  position,
  scale,
  dimRef,
  angryRef,
  drpRef,
  revealRef,
  centerColorRef,
  edgeColorRef,
}) {
  const materialRef = useRef(null)
  // Set on this blob's own first frame — same one-time-only entrance
  // pattern used throughout this piece (see GlassLogoGroup/HeroTitle/
  // GridPlane), so it plays exactly once per mount regardless of anything
  // else (position/scale) changing afterward.
  const entranceStartRef = useRef(null)

  useFrame((state) => {
    const material = materialRef.current
    if (!material) return
    material.uTime = state.clock.elapsedTime
    if (entranceStartRef.current === null) entranceStartRef.current = state.clock.elapsedTime
    const t = Math.min((state.clock.elapsedTime - entranceStartRef.current) / ENTRANCE_DURATION, 1)
    material.uEntranceProgress = smoothstepEase(t)

    // Optional dynamic color overrides (e.g. Noordhuys Showcase theme transition)
    if (centerColorRef?.current) {
      material.uniforms.uColorCenter.value.copy(centerColorRef.current)
    }
    if (edgeColorRef?.current) {
      material.uniforms.uColorEdge.value.copy(edgeColorRef.current)
    }

    // Optional, and absent for every caller but the chat showcase's own
    // backdrop: three independent 0..1 moods, each draining the glow and the
    // ground it fades into toward its own colour — grey for the stretch the
    // visitor spends in the unconscious patient's thread, red for Carla's
    // own once she's pulled aside and angry, DRP Showcase's own taupe once
    // the case is over and the pan past it has taken over. Refs rather than
    // props because they change on every scroll frame — mutating the
    // uniforms' own Colors in place, so there's nothing allocated per frame
    // either.
    //
    // Applied one after the other rather than as a weighted blend: dim/angry
    // never overlap in the script (there's exactly one open segment at a
    // time), and drpRef never overlaps either of them — it only ever starts
    // moving once the chat itself is over, at which point dim/angry have
    // always already resolved back to lit — so lerping each already-mixed
    // result toward the next is equivalent to a true multi-way mix here, and
    // simpler. Any ref being 0 leaves its own lerp a no-op.
    if (dimRef) {
      material.uniforms.uColorCenter.value.lerpColors(CENTER_LIT, CENTER_DIM, dimRef.current)
      material.uniforms.uColorEdge.value.lerpColors(EDGE_LIT, EDGE_DIM, dimRef.current)
    }
    if (angryRef) {
      material.uniforms.uColorCenter.value.lerp(CENTER_ANGRY, angryRef.current)
      material.uniforms.uColorEdge.value.lerp(EDGE_ANGRY, angryRef.current)
    }
    if (drpRef) {
      material.uniforms.uColorCenter.value.lerp(CENTER_DRP, drpRef.current)
      material.uniforms.uColorEdge.value.lerp(EDGE_DRP, drpRef.current)
    }
    if (revealRef) {
      material.uniforms.uRevealProgress.value = revealRef.current
    }
  })

  return (
    <mesh position={position} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <gradientBlobMaterial ref={materialRef} toneMapped={false} />
    </mesh>
  )
}
