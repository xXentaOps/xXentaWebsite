import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { Color, ExtrudeGeometry, Shape, ShaderMaterial, Vector2 } from 'three'
import { glassMaterialProps, useGlowOverlayMaterial, useSeparableBlurMaterial } from './glassMaterial'
import { OVERLAY_LAYER } from './GlassLogoGroup'
import { PANEL } from './teamLayout'

// This panel used to be a real-time refractive slab (drei/TransmissionMaterial),
// the same technique the hero's logo uses: capture whatever's behind it into a
// buffer, then bend per-pixel sample rays through that buffer based on the
// surface normal, IOR and roughness. That's the right tool for the logo (a
// compact, curved, always-clear shape catching light from every angle), but
// wrong for this panel, and in two ways that kept showing up as artifacts
// no amount of tuning removed:
//
//  - "Blur" in that model comes from jittering each sample ray's direction and
//    averaging many of them (a Monte Carlo estimate) — noise in that estimate
//    falls off only with roughly 1/sqrt(samples), so at any sample count cheap
//    enough to run every frame it reads as a grainy, sandblasted texture, not
//    a smooth optical blur. That grain is real "frost", the specific look this
//    panel was never supposed to have.
//  - A flat panel near the edge of the canvas puts some of those bent rays'
//    landing points outside the captured buffer entirely; the GPU clamps them
//    to the buffer's last valid column instead of erroring, which reads as a
//    hard vertical strip of stretched, wrong pixels right at the panel's edge
///   that shifts and reappears as the photo behind it changes angle.
//
// Neither is fixable by tuning roughness/samples/resolution — they're
// consequences of refraction sampling itself, not of any particular setting.
// So this panel doesn't refract anything anymore: it captures the same
// default-layer content (photo + grid backdrop) into a texture once per
// frame, real-Gaussian-blurs it (useSeparableBlurMaterial — a deterministic
// two-pass convolution, the exact same shader the hero's own text-reveal
// blur uses, so there is only one blur quality on this whole piece), tints
// it, and paints that directly as this mesh's own color, sampled in plain
// screen space (gl_FragCoord/resolution). There is no per-pixel ray bending
// left to land outside the buffer, so there is nothing left to clamp/strip —
// and a real convolution has no sample count to be noisy at.
// This canvas (AboutUsSection's) is entirely separate from the hero's — see
// GlassLogoGroup's own OVERLAY_LAYER/TEXT_SOURCE_LAYER/BLUR_PASS_LAYER —
// so reusing a small layer index here doesn't collide with those; layer
// masks are per camera/scene, not global. OVERLAY_LAYER (1) is imported
// from there purely for naming consistency between the two glass pieces,
// not because the two share a scene.
const PANEL_BLUR_LAYER = 2

// Lower than the hero's own MAIN_GLOW_INTENSITY (0.55, GlassLogoGroup) —
// several of the shared OVERLAY_LIGHTS lobes are deliberately top-weighted
// (see glassMaterial.js), which on the hero's curved logo spreads across a
// rounded surface, but on this panel's flat top edge concentrates into one
// bright highlight line right along the top border — reading as much more
// "visible bevel/depth" there than the rest of the panel's edges. Turned
// down specifically so that line stays a faint suggestion instead of a
// bright stripe; the panel-local constant (not the hero's) is what makes
// this adjustable without touching the hero's own look at all.
const GLOW_INTENSITY = 0.22
// A fraction of PANEL.depth (see useGlowOverlayMaterial's `push`), not a
// fixed number — this slab is deliberately thin (a bare hint of depth, see
// PANEL.depth's own comment), and a push sized for the logo's much thicker
// geometry would stand the overlay visibly off this one's surface, detaching
// it into a floating shell instead of a coat of light sitting on the glass.
const GLOW_PUSH = PANEL.depth * 0.08

// How much of the captured-and-blurred backdrop shows through versus the
// flat tint — literally a mix() in the fragment shader below. Kept low: the
// hero's own glass material actually carries almost none of this color
// itself (glassMaterialProps.roughness/color are 0/white — a materially
// clear surface); its blue reading comes mostly from what's *behind* it (a
// blue gradient backdrop, see Backdrop/GradientBlob) showing through, plus
// the glint overlay's highlights on top. This panel doesn't have a blue
// backdrop to show through — it's over a photo and the grid — so a strong
// flat tint here just paints over both instead of matching that look; kept
// low enough that the grid's own lines (blurred, but real content, not
// this tint) stay the thing actually visible behind the panel where it
// isn't over the photo.
const TINT_STRENGTH = 0.2
// A very lightly desaturated version of glassMaterialProps.specularColor
// (the hero's own blue) — a small trim, not a big one: an earlier pass here
// cut saturation to 55% and that read as most of the blue being gone
// entirely, not "a little less." This keeps it much closer to the raw
// color, just softened.
const TINT_COLOR = new Color(glassMaterialProps.specularColor)
const _tintHSL = { h: 0, s: 0, l: 0 }
TINT_COLOR.getHSL(_tintHSL)
TINT_COLOR.setHSL(_tintHSL.h, _tintHSL.s * 0.85, _tintHSL.l)

// Backdrop capture runs at the canvas's real device-pixel resolution — full,
// not a fraction of it (unlike the hero's TEXT_CAPTURE_SCALE=0.5, which
// blurs fine glyph edges heavily enough that the extra detail genuinely
// never survives). This panel's blur radius is comparatively modest by
// design (it needs to still read as "a photo," just softened — see
// BLUR_STEP_PX below), so a downscaled source was visibly undersampled: the
// blur ended up smoothing between a too-coarse grid of texels instead of
// real photo detail, which read as soft-edged blocks rather than a
// photographic blur. This is one plain scene render per frame (photo + grid
// backdrop, nothing per-fragment-expensive the way the old refraction
// material's sample loop was), so full resolution here is cheap. Still
// tracks the canvas's actual aspect ratio, which is what keeps this panel's
// edges rectangular instead of the smeared/streaked non-square capture the
// old drei-based material had (see TransmissionMaterial.jsx).
const CAPTURE_SCALE = 1
// Several passes at a tight step, not one heavier pass — a blur convolution
// suppresses periodic high-frequency detail (the grid's own thin repeating
// lines/crosses) much faster than it does broad continuous-tone content
// (the photo), so running the same small kernel several times fades the
// grid's pattern further while barely touching the photo's own softness —
// unlike TINT_STRENGTH above (a flat mix, blind to what it's muting) or a
// single wider-step pass (which respreads the photo too, the "too spread
// out" problem this started at). Step is in device pixels *at full canvas
// resolution*, not this capture's own (downscaled) size — see the
// priority-0 useFrame below for why that's what keeps the on-screen blur
// radius consistent regardless of CAPTURE_SCALE.
const BLUR_PASSES = 3
const BLUR_STEP_PX = 3

// Samples the already-blurred backdrop capture directly in screen space —
// no local UV, no refraction math — and mixes it toward a flat navy tint.
// Rendered with the mesh's own real transform (unlike the blur quad below,
// which ignores the camera entirely), so this just needs a plain vertex
// pass-through; "where this shows up" is ordinary GPU rasterization of the
// panel's actual current shape.
//
// linearToOutputTexel at the end of main() is not decoration — without it
// this read as much too dark, independent of any tint. Three.js's own
// materials (the photo's meshBasicMaterial, the grid) render correctly
// exposed here because it renders into the *canvas* in the renderer's
// output color space (sRGB), but any custom render target — captureFBO,
// blurHFBO/blurVFBO — is filled in *linear* space instead (confirmed in
// three's own WebGLRenderer: it only switches to the output color space
// when the active render target is the canvas itself). Built-in materials
// correct for that automatically via a chunk (`colorspace_fragment`) baked
// into their shaders; a bare custom ShaderMaterial like this one doesn't
// get that chunk for free, so without calling the same conversion function
// ourselves, this shader was reading already-linear pixels out of the blur
// target and writing them straight to the canvas unconverted — which
// displays as darker than the source ever was, in exact proportion to how
// far a color sits from either end of the 0-1 range (sRGB's gamma curve
// lifts midtones the most). linearToOutputTexel itself needs no import:
// three injects it into every compiled shader's prelude, matched to
// whatever the renderer is actually being asked to output to.
function usePanelBackdropMaterial() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          backdrop: { value: null },
          resolution: { value: new Vector2(1, 1) },
          tint: { value: new Color(TINT_COLOR) },
          tintStrength: { value: TINT_STRENGTH },
        },
        vertexShader: `
          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D backdrop;
          uniform vec2 resolution;
          uniform vec3 tint;
          uniform float tintStrength;
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution;
            vec3 blurred = texture2D(backdrop, uv).rgb;
            vec3 mixed = mix(blurred, tint, tintStrength);
            gl_FragColor = linearToOutputTexel(vec4(mixed, 1.0));
          }
        `,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])
  return material
}

// A rounded rectangle extruded with a bevel — the same way the logo's own
// geometry is built (see useGlassLogoGeometry), so the panel's edges catch
// light the same way its edges do rather than reading as a flat cut slab.
// The shape is inset by the bevel on each side so the *finished* solid comes
// out at exactly the requested width/height; ExtrudeGeometry grows the
// silhouette outward by bevelSize, so building the shape at full size would
// overshoot the rectangle the DOM text is positioned against.
function buildPanelGeometry(width, height, radius, depth) {
  const bevel = Math.min(radius * 0.35, depth * 0.25)
  const w = width - bevel * 2
  const h = height - bevel * 2
  const r = Math.max(radius - bevel, 0.0001)
  const x = -w / 2
  const y = -h / 2

  const shape = new Shape()
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r)
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)

  const geometry = new ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 6,
    curveSegments: 16,
  })
  // Extrusion runs from z=0 forward, so without this the slab would sit
  // entirely in front of the position it's placed at rather than centered on
  // it — and its front face, not its middle, is what the caller's z position
  // is chosen against.
  geometry.center()
  return geometry
}

// Deliberately has no motion of its own: no tilt, no pointer response, no
// entrance drift. The photo behind it already leans with the cursor, and the
// whole point of a permanent panel is that it is the one fixed thing on the
// screen — the blurred backdrop moving as the photo moves behind it is the
// effect, and a panel that also moved would double that motion for no added
// meaning.
//
// Pure geometry renderer: x/y/width/height/radius arrive already resolved to
// world units by the caller (TeamScene's usePanelWorld), which derives them
// from the same PANEL constants (teamLayout.js) the DOM text panel
// (TeamPanelContent) positions itself from — this component has no layout
// opinion of its own, on purpose, so there is exactly one place that decides
// where the panel sits.
export function GlassInfoPanel({ x, y, width, height, radius, highQuality, onHold, onReleaseSoon }) {
  const geometry = useMemo(() => buildPanelGeometry(width, height, radius, PANEL.depth), [width, height, radius])
  useEffect(() => () => geometry.dispose(), [geometry])

  const glowMaterial = useGlowOverlayMaterial(GLOW_INTENSITY, GLOW_PUSH)
  useEffect(() => () => glowMaterial.dispose(), [glowMaterial])
  const backdropMaterial = usePanelBackdropMaterial()
  const blurMaterial = useSeparableBlurMaterial()

  const mainMeshRef = useRef(null)
  const canvasSize = useThree((state) => state.size)
  const viewport = useThree((state) => state.viewport)
  const captureWidth = canvasSize.width * viewport.dpr * CAPTURE_SCALE
  const captureHeight = canvasSize.height * viewport.dpr * CAPTURE_SCALE
  const captureFBO = useFBO(captureWidth, captureHeight)
  const blurHFBO = useFBO(captureWidth, captureHeight)
  const blurVFBO = useFBO(captureWidth, captureHeight)

  // Priority-0 (the R3F default), so it always runs before AboutUsSection's
  // own SceneRenderGate (priority 1) — the same ordering guarantee the old
  // TransmissionMaterial capture relied on, see its own comment. Only runs
  // at all while highQuality and this component are both mounted — showPanel
  // in TeamScene already gates that (see the comment there).
  useFrame((state) => {
    if (!highQuality || !mainMeshRef.current) return

    const prevTarget = state.gl.getRenderTarget()

    // 1. Capture the default layer (photo + grid backdrop) with this panel's
    // own mesh hidden — it can't meaningfully appear in its own backdrop,
    // and hasn't been drawn yet this frame regardless. A plain .visible
    // toggle, not a layer change: raycasting (onPointerOver/onPointerOut
    // below) goes through R3F's default raycaster, which only tests layer 0
    // — moving this mesh to another layer to hide it from the capture would
    // silently break hover. Only this one mesh needs hiding; the glow
    // overlay is already invisible to layer-0-only rendering (see
    // OVERLAY_LAYER).
    mainMeshRef.current.visible = false
    state.gl.setRenderTarget(captureFBO)
    state.gl.render(state.scene, state.camera)
    mainMeshRef.current.visible = true

    // 2. Blur it, horizontally then vertically, BLUR_PASSES times — see
    // BLUR_PASSES/BLUR_STEP_PX above. The blur quad lives on its own layer
    // so these passes render only it, not another copy of the whole scene.
    const dpr = state.viewport.dpr
    const resolutionPx = { x: state.size.width * dpr, y: state.size.height * dpr }
    state.camera.layers.disable(0)
    state.camera.layers.enable(PANEL_BLUR_LAYER)

    let source = captureFBO.texture
    for (let i = 0; i < BLUR_PASSES; i++) {
      blurMaterial.uniforms.source.value = source
      blurMaterial.uniforms.texel.value.set(BLUR_STEP_PX / resolutionPx.x, BLUR_STEP_PX / resolutionPx.y)
      blurMaterial.uniforms.direction.value.set(1, 0)
      state.gl.setRenderTarget(blurHFBO)
      state.gl.render(state.scene, state.camera)

      blurMaterial.uniforms.source.value = blurHFBO.texture
      blurMaterial.uniforms.direction.value.set(0, 1)
      state.gl.setRenderTarget(blurVFBO)
      state.gl.render(state.scene, state.camera)

      source = blurVFBO.texture
    }

    state.camera.layers.disable(PANEL_BLUR_LAYER)
    state.camera.layers.enable(0)
    state.gl.setRenderTarget(prevTarget)

    // 3. Point the panel's own material at the finished blur and keep its
    // screen-space sampling in sync with the canvas's real resolution.
    backdropMaterial.uniforms.backdrop.value = source
    backdropMaterial.uniforms.resolution.value.set(resolutionPx.x, resolutionPx.y)
  })

  return (
    <group position={[x, y, PANEL.z]}>
      <mesh
        ref={mainMeshRef}
        geometry={geometry}
        // Holds whoever is currently shown rather than clearing them. The
        // panel covers part of the photo, so without this, moving off a
        // person and onto the glass to actually read their paragraph (or
        // reach their LinkedIn link) would swap the panel back to the team
        // blurb the moment the pointer arrived on it. stopPropagation keeps
        // the hit zone of whoever is standing behind the panel from firing
        // through it, which would otherwise select a person by pointing at
        // the glass.
        onPointerOver={(event) => {
          event.stopPropagation()
          onHold?.()
        }}
        onPointerOut={() => onReleaseSoon?.()}
      >
        {highQuality ? (
          <primitive object={backdropMaterial} attach="material" />
        ) : (
          <meshPhysicalMaterial
            color="#e2e8f0"
            specularColor="#3B82F6"
            specularIntensity={0.6}
            transparent
            opacity={0.28}
            roughness={0.5}
            metalness={0}
          />
        )}
      </mesh>

      <mesh geometry={geometry} material={glowMaterial} raycast={() => null} ref={(el) => el?.layers.set(OVERLAY_LAYER)} />

      {/* Full-screen quad the blur passes render through — see the
          priority-0 useFrame above. Its material ignores the camera/scene
          transform entirely (raw position.xy as clip space), so this mesh's
          own position/parent doesn't matter; it's placed here purely so it
          isn't caught up in the panel's own group transform for no reason. */}
      <mesh material={blurMaterial} raycast={() => null} ref={(el) => el?.layers.set(PANEL_BLUR_LAYER)}>
        <planeGeometry args={[2, 2]} />
      </mesh>
    </group>
  )
}

export default GlassInfoPanel
