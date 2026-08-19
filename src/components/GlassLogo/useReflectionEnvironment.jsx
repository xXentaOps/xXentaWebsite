import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, Color, CubeCamera, HalfFloatType, PMREMGenerator, Scene, ShaderMaterial, Vector3, WebGLCubeRenderTarget } from 'three'

// No photographed HDRI — deliberately abstract instead of realistic scenery
// (no sky, no recognizable objects reflected in the glass). Everything
// below is rendered as a soft radial-gradient glow (not solid geometry —
// low-poly spheres/hard-edged rectangles read as "blocky," not as light)
// with additive blending, so overlapping glows actually brighten where
// they overlap instead of just occluding each other — that's what gives
// the layered, "many soft reflections" look instead of a scatter of flat
// dots. Baked once — nothing here animates.
const BACKGROUND_COLOR = new Color('#0d1c38')

// Soft elongated glow bars (a blurred take on the earlier hard striplight
// panels) — broad sweeps of light as the logo tilts.
const STRIPE_A = new Color(0.9, 2.2, 6.2)
const STRIPE_B = new Color(0.6, 1.7, 4.8)
const STRIPE_C = new Color(0.4, 1.2, 3.4)
function buildStripeRow(prefix, count, xSpread, y, z, size, color, phaseOffset) {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1) - 0.5
    return { role: `${prefix}${i}`, kind: 'stripe', position: [t * xSpread + phaseOffset, y, z], size, color }
  })
}
const STRIPES = [
  ...buildStripeRow('outer', 8, 46, 13, 14, [3.4, 20], STRIPE_A, 0),
  ...buildStripeRow('mid', 6, 38, -10, 11, [3, 16], STRIPE_B, 2.5),
  ...buildStripeRow('inner', 5, 26, 3, 8, [2.4, 12], STRIPE_C, -1.5),
]

// Many soft round glows, deterministically "randomized" (a seeded PRNG,
// not Math.random()) so the field is dense and organic but stable across
// reloads. Spread wide — this is what makes many different parts of the
// logo pick up *some* glow as it tilts, rather than only one or two spots.
function seededRandom(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}
const rand = seededRandom(1337)
const SPEC_TIERS = [
  new Color(2.2, 4.8, 11), // hottest highlights
  new Color(1.1, 2.8, 7.5),
  new Color(0.5, 1.5, 4.2),
  new Color(0.28, 0.9, 2.6), // faint fill
]
const SPECS = Array.from({ length: 40 }, (_, i) => {
  const x = (rand() - 0.5) * 76
  const y = (rand() - 0.5) * 56
  const z = 5 + rand() * 15
  const radius = 0.9 + rand() * 3.4
  const color = SPEC_TIERS[Math.floor(rand() * SPEC_TIERS.length)]
  return { role: `spec${i}`, kind: 'spec', position: [x, y, z], size: [radius * 2, radius * 2], color }
})

// The wide SPECS field above mostly overshoots what a piece actually
// reflects at rest (no hover, no tilt) — measured directly (see
// GlassLogoGroup's `?debugReflectRest=1` diagnostic), every piece only
// reflects a narrow cone within roughly ±14° of dead-ahead at rest, only a
// few units wide out at this depth. Without something *in* that cone, rest
// pose shows nothing no matter how reflective the material is. This is a
// dense, overlapping cluster placed specifically inside it, so the glow is
// there immediately, not only once you tilt or hover.
const rand2 = seededRandom(777)
const CENTER_SPECS = Array.from({ length: 22 }, (_, i) => {
  const x = (rand2() - 0.5) * 11
  const y = (rand2() - 0.5) * 9
  const z = 8 + rand2() * 7
  const radius = 1.2 + rand2() * 3.8
  const color = SPEC_TIERS[Math.floor(rand2() * SPEC_TIERS.length)]
  return { role: `centerSpec${i}`, kind: 'spec', position: [x, y, z], size: [radius * 2, radius * 2], color }
})

const ORIGIN = new Vector3(0, 0, 0)

// Shared glow shader: a soft radial (specs) or soft elongated (stripes)
// gradient instead of a hard geometric edge, with additive blending so
// overlapping glows brighten each other like real overlapping light does.
function makeGlowMaterial(color, kind) {
  const falloff =
    kind === 'spec'
      ? `
        vec2 c = vUv - 0.5;
        float d = length(c) * 2.0;
        float alpha = pow(smoothstep(1.0, 0.0, d), 1.6);
      `
      : `
        float wx = abs(vUv.x - 0.5) * 2.0;
        float wy = abs(vUv.y - 0.5) * 2.0;
        float alpha = pow(smoothstep(1.0, 0.15, wx), 1.4) * pow(smoothstep(1.0, 0.3, wy), 1.1);
      `
  return new ShaderMaterial({
    uniforms: { color: { value: color } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      varying vec2 vUv;
      void main() {
        ${falloff}
        gl_FragColor = vec4(color, alpha);
      }
    `,
  })
}

// Bakes the abstract blue scene (soft glow bars, soft glow specs) into a
// single static environment cubemap (captured once, not per-frame —
// nothing here animates). The glass's specular reflection then naturally
// shows this — brightly at grazing/curved regions, faintly at rest — as
// the logo tilts. Deliberately glow shapes only, no text/label content —
// baking flat text through this material's roughness-clamped clearcoat
// pipeline is inherently blurry no matter how it's tuned.
export function useReflectionEnvironment() {
  const gl = useThree((state) => state.gl)
  const [envMap, setEnvMap] = useState(null)
  const glowRefs = useRef({})
  const bakedRef = useRef(false)

  const offscreenScene = useMemo(() => {
    const scene = new Scene()
    scene.background = BACKGROUND_COLOR
    return scene
  }, [])

  // 1024, not the 1536 this started at — this only ever feeds a PMREM
  // env map sampled through the glass's own roughness/clearcoat blur (see
  // glassMaterialProps in GlassLogoGroup), so the extra resolution wasn't
  // visible in the final reflections, just a bigger one-time bake cost
  // (cube render target + PMREM pass) before target.dispose() below frees
  // it.
  const target = useMemo(() => new WebGLCubeRenderTarget(1024, { type: HalfFloatType }), [])
  const cubeCamera = useMemo(() => new CubeCamera(0.1, 100, target), [target])

  const glows = useMemo(() => [...STRIPES, ...SPECS, ...CENTER_SPECS], [])
  const glowMaterials = useMemo(() => glows.map((g) => makeGlowMaterial(g.color, g.kind)), [glows])

  useEffect(
    () => () => {
      envMap?.dispose()
      for (const material of glowMaterials) material.dispose()
    },
    [envMap, glowMaterials],
  )

  // The actual capture happens here — inside useFrame, properly sequenced
  // between frames by R3F, rather than during React's render/commit phase,
  // which was corrupting the renderer's render-target state when it
  // collided with MeshTransmissionMaterial's own FBO capture, occasionally
  // blanking the whole canvas.
  useFrame(() => {
    if (bakedRef.current) return
    bakedRef.current = true

    // Glow planes default to facing local +Z. Left unrotated, from way out
    // at each position they're nearly edge-on to the CubeCamera at the
    // origin — technically visible but foreshortened to a sliver a few
    // pixels wide. lookAt() points -Z at the target, so flip 180° to bring
    // +Z (the actual front face) to bear.
    for (const ref of Object.values(glowRefs.current)) {
      if (!ref) continue
      ref.lookAt(ORIGIN)
      ref.rotateY(Math.PI)
    }

    cubeCamera.update(gl, offscreenScene)
    const pmremGenerator = new PMREMGenerator(gl)
    const baked = pmremGenerator.fromCubemap(target.texture)
    pmremGenerator.dispose()
    // Only the (much smaller, fixed-size) PMREM output needs to stick
    // around — the raw cubemap was just scaffolding for this one bake.
    target.dispose()
    setEnvMap(baked.texture)
  })

  // Rendered into the offscreen scene via portal (not the visible one).
  const portal = createPortal(
    <>
      {glows.map(({ role, position, size }, i) => (
        <mesh
          key={role}
          ref={(el) => {
            glowRefs.current[role] = el
          }}
          position={position}
          material={glowMaterials[i]}
        >
          <planeGeometry args={size} />
        </mesh>
      ))}
    </>,
    offscreenScene,
  )

  return { envMap, portal }
}
