import { useRef } from 'react'
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { Color } from 'three'
import {
  BLOB_CENTER,
  BLOB_CENTER_ANGRY,
  BLOB_CENTER_DIM,
  SCENE_BACKDROP,
  SCENE_BACKDROP_ANGRY,
  SCENE_BACKDROP_DIM,
} from './sceneConstants'

// Procedural — no CanvasTexture allocation, just a plane + a cheap fragment
// shader. An irregular (non-circular) radius modulated by a few sine waves
// at different angular frequencies, slowly rotated over time.
const GradientBlobMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorCenter: new Color(BLOB_CENTER),
    uColorEdge: new Color(SCENE_BACKDROP),
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
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    uniform float uTime;
    uniform vec3 uColorCenter;
    uniform vec3 uColorEdge;
    uniform float uEntranceProgress;

    void main() {
      vec2 p = vUv - 0.5;
      float angle = atan(p.y, p.x) + uTime * 0.05;
      float radius = length(p) * 2.0;

      // Very small, high-frequency perturbations only — this should read
      // as essentially circular with the faintest organic irregularity,
      // not a lobed/scalloped blob.
      float wobble = 0.0;
      wobble += sin(angle * 4.0 + uTime * 0.10) * 0.02;
      wobble += sin(angle * 6.0 - uTime * 0.15) * 0.015;

      // Pushed out from 0.65 — lets the glow spread over a wider area
      // before fading out completely, rather than being contained to a
      // tighter core.
      float edge = 0.85 + wobble;
      // A wide gap between core and edge (rather than glow peaking at a
      // single point, or cutting off sharply) makes the falloff gradual so
      // it blends smoothly into the navy background instead of reading as
      // a distinct shape with a visible boundary.
      float core = 0.12;
      float falloff = 1.0 - smoothstep(core, edge, radius);
      // Raising the linear falloff to a power thins out the outer layers
      // specifically — values already close to 1 (near the core) barely
      // move, while the partial, fractional values further out (the
      // "outer layers") get pushed down much more, reading as sparser and
      // more transparent even though the glow now reaches further overall.
      float glow = pow(falloff, 1.8) * 0.5;
      vec3 color = mix(uColorEdge, uColorCenter, glow);
      // See uEntranceProgress above — blending the *result* back toward
      // uColorEdge (rather than, say, scaling glow itself down to 0) is
      // what makes 0 read as flat background instead of a dimmer-but-still
      // visible glow shape.
      color = mix(uColorEdge, color, uEntranceProgress);
      gl_FragColor = vec4(color, 1.0);
      // uColorCenter/uColorEdge arrive linear (three.js color-manages hex
      // uniforms); convert back to the renderer's output space so this
      // matches the scene background exactly instead of crushing toward black.
      #include <colorspace_fragment>
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
const EDGE_LIT = new Color(SCENE_BACKDROP)
const EDGE_DIM = new Color(SCENE_BACKDROP_DIM)
const EDGE_ANGRY = new Color(SCENE_BACKDROP_ANGRY)

export function GradientBlob({ position, scale, dimRef, angryRef }) {
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

    // Optional, and absent for every caller but the chat showcase's own
    // backdrop: two independent 0..1 moods, each draining the glow and the
    // ground it fades into toward its own colour — grey for the stretch the
    // visitor spends in the unconscious patient's thread, red for Carla's
    // own once she's pulled aside and angry. Refs rather than props because
    // they change on every scroll frame — mutating the uniforms' own Colors
    // in place, so there's nothing allocated per frame either.
    //
    // Applied one after the other rather than as a three-way weighted blend:
    // the two moods never overlap in the script (there's exactly one open
    // segment at a time), so lerping the *already-dimmed* result toward
    // angry is equivalent to a true three-way mix here, and simpler. Either
    // ref being 0 leaves its own lerp a no-op.
    if (dimRef) {
      material.uniforms.uColorCenter.value.lerpColors(CENTER_LIT, CENTER_DIM, dimRef.current)
      material.uniforms.uColorEdge.value.lerpColors(EDGE_LIT, EDGE_DIM, dimRef.current)
    }
    if (angryRef) {
      material.uniforms.uColorCenter.value.lerp(CENTER_ANGRY, angryRef.current)
      material.uniforms.uColorEdge.value.lerp(EDGE_ANGRY, angryRef.current)
    }
  })

  return (
    <mesh position={position} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <gradientBlobMaterial ref={materialRef} toneMapped={false} />
    </mesh>
  )
}
