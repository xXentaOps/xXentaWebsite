import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useFBO } from '@react-three/drei'
import { Color, MathUtils, ShaderMaterial, Vector2 } from 'three'
import { glassMaterialProps, useGlowOverlayMaterial, useSeparableBlurMaterial } from './glassMaterial'
import { useGlassLogoGeometry } from './useGlassLogoGeometry'
import { TransmissionMaterial } from './TransmissionMaterial'


// TransmissionMaterial (a local fork of drei's MeshTransmissionMaterial —
// see TransmissionMaterial.jsx for why) captures "what's behind the glass"
// for its own refraction effect by doing its own extra
// state.gl.render(state.scene, state.camera) every frame — a full scene
// render, with only the glass
// mesh itself swapped to an invisible discard material. Nothing else in the
// scene is excluded from that capture by default, so the glow overlay
// (bright, additive, meant to read as a reflection sitting ON the glass)
// was getting baked into that backdrop and then refracted through the
// glass's thickness — showing up as a smear of plain white "inside" the
// glass depth.
// Fix: put it on its own THREE.Layers bit, off by default so it's invisible
// to that capture, and enable it only for the one real, visible render each
// frame (done manually below — see the priority-1 useFrame). Giving a
// useFrame a priority > 0 tells R3F "don't auto-render, I'll do it myself"
// (sorted so priority 0 callbacks, including TransmissionMaterial's own
// capture, always run first); this is the only reliable way to guarantee
// our layer toggle brackets its capture correctly every frame.
export const OVERLAY_LAYER = 1
// Content that should be captured as a screen-space "source picture" for
// the glass to reveal, blurred, on its own surface — see
// useTextRevealMaterial and the priority-1 useFrame below. HeroTitle puts
// its crisp text on this layer (in addition to OVERLAY_LAYER, for its own
// normal direct visibility) so a real, undisplaced render of it exists to
// sample from.
export const TEXT_SOURCE_LAYER = 2
// A full-screen quad used internally for the two-pass blur (see
// useSeparableBlurMaterial) — never touched by anything outside this file.
const BLUR_PASS_LAYER = 3
// The glass's own TransmissionMaterial ignores `opacity`/`transparent`
// for this scene — its patched transmission shader hardcodes the output
// alpha to 1.0 regardless of what those props are set to (verified: even
// opacity={0} rendered fully solid). What actually reads as "how solid the
// glass looks" is this always-on glint overlay layered on top, so overall
// opacity is controlled here instead.
const MAIN_GLOW_INTENSITY = 0.55
// Fixed dimming for the blue light overlay's bleed-through-the-glass-depth
// copy (see bleedGlowMaterial below) — its specular highlights are already
// fairly tight/sharp against a dark field, so a full-brightness copy
// refracted through the glass's depth reads as a distracting smear; this
// keeps it a subtle accent instead.
const BLEED_GLOW_INTENSITY = 0.15

const MAX_TILT = MathUtils.degToRad(5)
// A perfectly flat (0,0) pose reflects almost nothing — the material's
// Fresnel reflectance is lowest at dead-on viewing, by a wide margin, no
// matter how bright/reflective the environment or material is tuned to be.
// Rather than fight that, the resting pose (pointer at the center of the
// screen) carries a small permanent tilt so it's never perfectly flat.
const BASE_TILT = { x: -0.12, y: 0.1 }
// Lower = slower/heavier settle. The whole logo continuously, subtly leans
// toward wherever the cursor is anywhere on screen — this damping is what
// keeps that feel smooth and weighted rather than snappy/twitchy.
const TILT_LAMBDA = 4

// Scroll-driven parallax, vertical only, layered on top of the pointer-tilt
// above (same useFrame, a different axis) rather than fighting it in a
// second one. Progress runs 0 (top of page) to 1 once the hero has scrolled
// a full viewport height — see BackgroundGrid's identical calc, duplicated
// here rather than shared for the same reason smoothstepEase is duplicated
// across files elsewhere on this piece: too small to be worth a shared
// module. Slower than HeroTitle's own TITLE_PARALLAX_STRENGTH — the glass is
// the heaviest-reading element on screen, so it drifts the least, same
// weighted-object language as TILT_LAMBDA above.
const LOGO_PARALLAX_STRENGTH = 0.06
const LOGO_PARALLAX_LAMBDA = 3

// How far (radians for tilt, world units for the parallax position) this
// group's own damped rotation/position may still sit from their targets
// before the priority-1 useFrame below treats the scene as genuinely still
// moving — see isSceneSettledRef/SKIP_CAPTURE_WHEN_IDLE there. Small enough
// to be visually meaningless on its own (a capture taken at this residual
// offset vs. one taken dead-on would look pixel-identical), but large
// enough that MathUtils.damp's asymptotic approach actually crosses it a
// couple of seconds after the pointer/scroll stops, rather than being
// "technically still moving" forever in floating point.
const TILT_SETTLE_EPSILON = 0.0005
const POSITION_SETTLE_EPSILON = 0.001


// The glass's base layer (roughness 0 — see glassMaterialProps, kept
// mirror-sharp on purpose so it reads as clear, not frosted) lets the
// scene's one real light (Backdrop's directionalLight) cast a genuine
// specular highlight, on top of the baked envMap reflections and the
// OVERLAY_LIGHTS glint shader above. At most tilt angles that's fine, but
// at the specific angle this direct-light highlight peaks (reachable by
// resting the pointer in the screen's top-right corner), a roughness-0 GGX
// response to a real light is bright enough on its own that every color
// channel clips to 1.0, which the renderer's tone mapping then desaturates
// to a pure-white "ball" right where the highlight should read as
// blue-white. (Confirmed empirically: temporarily raising `roughness`
// removes it; raising `clearcoatRoughness` instead does not — the clearcoat
// layer was already soft enough and isn't the source.) Patched here rather
// than raising `roughness` itself because that softens the base layer's
// envMap reflections everywhere on the piece too (measured: thousands of
// changed pixels even in the resting pose); this instead clamps only the
// real light's direct contribution, by peak channel (preserving its hue
// instead of letting the GPU clip channels independently toward white),
// leaving the envMap reflections, the overlay glints, and the rest of the
// shading untouched.
const SPECULAR_COMBINE_GLSL =
  'vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;\n\tvec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;'
const SPECULAR_COMBINE_GLSL_CLAMPED = `
  vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
  vec3 clampedDirectSpecular = reflectedLight.directSpecular;
  float directSpecularPeak = max( clampedDirectSpecular.r, max( clampedDirectSpecular.g, clampedDirectSpecular.b ) );
  if ( directSpecularPeak > 1.0 ) clampedDirectSpecular /= directSpecularPeak;
  vec3 totalSpecular = clampedDirectSpecular + reflectedLight.indirectSpecular;
`

function useClampDirectSpecularHighlight(materialRef) {
  useEffect(() => {
    const material = materialRef.current
    if (!material) return
    const baseOnBeforeCompile = material.onBeforeCompile
    material.onBeforeCompile = (shader, renderer) => {
      baseOnBeforeCompile(shader, renderer)
      shader.fragmentShader = shader.fragmentShader.replace(SPECULAR_COMBINE_GLSL, SPECULAR_COMBINE_GLSL_CLAMPED)
    }
    // needsUpdate alone doesn't force a real recompile here — three's
    // program cache is keyed off material defines/settings, not
    // onBeforeCompile's identity, so without a distinct cache key it just
    // reattaches the already-compiled (unpatched) program from the first
    // mount-time compile above.
    material.customProgramCacheKey = () => 'xxenta-clamped-direct-specular'
    material.needsUpdate = true
  }, [materialRef])
}

// Scratch object for saving/restoring the renderer's clear color around the
// text-source capture — see the priority-1 useFrame below. Reused rather
// than allocated per-frame since it's only ever read synchronously within
// that one callback.
const scratchClearColor = new Color()

// Real transmission through the glass laterally displaces whatever it
// reveals — how much depends on ior, thickness, and the local curvature at
// that point, so there's no way to make it land in the exact same spot as
// a normally-rendered copy of the same content sitting right beside it (see
// HeroTitle: "Learning" needs the two to connect seamlessly at the glass's
// edge). A prior version tried to sidestep that by re-implementing the
// hidden portion as a separately-generated texture (a Canvas 2D render of
// the same text) positioned to match — but Canvas 2D and troika are two
// independent text-shaping engines reading the same font file, and even
// with painstakingly matched metrics they never quite agreed, worse
// further into a word (confirmed: visibly fine at "Le", badly split apart
// by "ng").
// This is more direct: capture the *actual* crisp text — TEXT_SOURCE_LAYER,
// rendered normally by the real camera, so it's pixel-identical to what's
// on screen, not a re-implementation — into a texture, blur that (see
// useSeparableBlurMaterial and the priority-1 useFrame below), then simply
// sample the already-blurred result here, directly in screen space
// (gl_FragCoord/resolution, not local UV) — no blur math needed in this
// shader itself anymore. Rendered with the glass's own geometry/transform,
// so "where is this visible" is just normal GPU rasterization of the
// glass's actual current shape — tilt, resize, everything — with no
// separate mask or position-matching required at all.
function useTextRevealMaterial() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          textSource: { value: null },
          resolution: { value: new Vector2(1, 1) },
          // Dimmed down from a full 1 — at full strength the blurred copy
          // read as bright/white as the crisp text itself, more like a
          // second layer of plain text than something glimpsed softly
          // through glass.
          opacity: { value: 0.45 },
        },
        vertexShader: `
          void main() {
            // Same small push-out as useGlowOverlayMaterial, for the same
            // reason — avoids z-fighting against the base glass mesh on
            // the extrusion's low-segment bevel.
            vec3 pushed = position + normalize(normal) * 0.03;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pushed, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D textSource;
          uniform vec2 resolution;
          uniform float opacity;
          void main() {
            vec2 uv = gl_FragCoord.xy / resolution;
            vec4 texColor = texture2D(textSource, uv);
            gl_FragColor = vec4(texColor.rgb, texColor.a * opacity);
          }
        `,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])
  return material
}

export function GlassLogoGroup({ targetSize = 4, highQuality = true, blurredTextRef, isTextMovingRef, isHeroVisibleRef, ...props }) {
  const groupRef = useRef(null)
  const transmissionMaterialRef = useRef(null)
  const { mergedGeometry, center, size, depth } = useGlassLogoGeometry({ bevelSegments: 8 })
  const pointer = useThree((state) => state.pointer)
  const canvasSize = useThree((state) => state.size)
  const viewport = useThree((state) => state.viewport)
  // Set at the end of the tilt/parallax useFrame below, read at the top of
  // the priority-1 capture+blur useFrame further down — see
  // SKIP_CAPTURE_WHEN_IDLE there for why this group's own settledness is
  // only half of what decides that; isTextMovingRef (HeroTitle's own text
  // motion, threaded down as a prop) is the other half.
  const isSceneSettledRef = useRef(false)
  useClampDirectSpecularHighlight(transmissionMaterialRef)
  const glowOverlayMaterial = useGlowOverlayMaterial(MAIN_GLOW_INTENSITY)
  useEffect(() => () => glowOverlayMaterial.dispose(), [glowOverlayMaterial])
  // A second, independent instance left on the default layer so it's
  // visible to TransmissionMaterial's backdrop capture and refracts a
  // subtle blue glow into the glass's depth, instead of the reflections
  // stopping dead at the front face.
  const bleedGlowMaterial = useGlowOverlayMaterial(BLEED_GLOW_INTENSITY)
  useEffect(() => () => bleedGlowMaterial.dispose(), [bleedGlowMaterial])
  const textRevealMaterial = useTextRevealMaterial()
  const blurMaterial = useSeparableBlurMaterial()

  const scale = targetSize / Math.max(size.x, size.y)

  // Half the canvas's actual pixel resolution, not full (drei's useFBO with
  // no args) — every one of these three ends up Gaussian-blurred (see the
  // priority-1 useFrame below) before it's ever shown, so the extra detail
  // full resolution would preserve gets thrown away by the blur anyway;
  // rendering at half res up front cuts this pass's fill-rate and memory
  // cost by 4x with no visible difference. Still tracks the canvas's actual
  // aspect ratio (just scaled down), which matters here specifically:
  // useTextRevealMaterial and useSeparableBlurMaterial both sample via
  // gl_FragCoord/resolution *at full canvas resolution* — that stays
  // correct regardless of these textures' own native size, since GPU
  // texture sampling always reads normalized 0..1 UV coordinates, and the
  // blur's own texel step is likewise computed relative to full-canvas
  // resolution (see stepPx below), so a smaller physical texture just means
  // each tap covers more of it — exactly what keeps the on-screen blur
  // radius the same regardless of this scale factor. textCaptureFBO holds
  // the raw crisp-text capture; blurHFBO and blurVFBO are the two
  // separable-blur passes over it, in order — blurVFBO is the final, fully-
  // blurred result useTextRevealMaterial actually displays.
  const TEXT_CAPTURE_SCALE = 0.5
  const textCaptureWidth = canvasSize.width * viewport.dpr * TEXT_CAPTURE_SCALE
  const textCaptureHeight = canvasSize.height * viewport.dpr * TEXT_CAPTURE_SCALE
  const textCaptureFBO = useFBO(textCaptureWidth, textCaptureHeight)
  const blurHFBO = useFBO(textCaptureWidth, textCaptureHeight)
  const blurVFBO = useFBO(textCaptureWidth, textCaptureHeight)

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const desiredX = BASE_TILT.x - pointer.y * MAX_TILT
    const desiredY = BASE_TILT.y + pointer.x * MAX_TILT

    group.rotation.x = MathUtils.damp(group.rotation.x, desiredX, TILT_LAMBDA, delta)
    group.rotation.y = MathUtils.damp(group.rotation.y, desiredY, TILT_LAMBDA, delta)

    const scrollProgress = MathUtils.clamp(window.scrollY / canvasSize.height, 0, 1)
    const desiredPositionY = scrollProgress * LOGO_PARALLAX_STRENGTH * viewport.height
    group.position.y = MathUtils.damp(group.position.y, desiredPositionY, LOGO_PARALLAX_LAMBDA, delta)

    // Feeds the priority-1 useFrame below — "settled" means this frame's
    // capture+blur pass (if it ran) would come out pixel-identical to the
    // last one, not that rotation/position have reached their targets
    // exactly (damp() never quite does that). isTextMovingRef covers the
    // other thing that pass depends on: HeroTitle's own text, which this
    // group knows nothing about directly.
    const tiltSettled =
      Math.abs(group.rotation.x - desiredX) < TILT_SETTLE_EPSILON && Math.abs(group.rotation.y - desiredY) < TILT_SETTLE_EPSILON
    const positionSettled = Math.abs(group.position.y - desiredPositionY) < POSITION_SETTLE_EPSILON
    const textMoving = isTextMovingRef?.current
    const textSettled = !textMoving || !(textMoving.title || textMoving.newWayOf || textMoving.learning)
    isSceneSettledRef.current = tiltSettled && positionSettled && textSettled
  })

  // Runs after every priority-0 callback in the frame — including
  // TransmissionMaterial's own backdrop capture above, guaranteeing
  // that capture always happens first. In order: a TEXT_SOURCE_LAYER-only
  // render (HeroTitle's crisp text, at its real position, rendered by the
  // real camera) into textCaptureFBO; a horizontal then vertical blur pass
  // over that (BLUR_PASS_LAYER's full-screen quad, reused for both — see
  // useSeparableBlurMaterial); then the one real, visible render
  // (OVERLAY_LAYER on). Camera layers persist frame-to-frame, so each
  // toggle here is undone right after use, leaving the camera on just the
  // default layer for next frame's capture.
  useFrame((state) => {
    // Section isn't on screen (see isHeroVisibleRef in GlassLogoHero) — skip
    // every step, including the one real visible render below, not just the
    // capture+blur pass. Nothing calls state.gl.render this frame, so the
    // canvas simply keeps showing whatever was last drawn (irrelevant, since
    // it isn't visible) at zero further GPU cost, without touching R3F's own
    // frameloop/clock machinery — see isHeroVisibleRef's own comment for why
    // that route (tried first) isn't safe to use here.
    if (isHeroVisibleRef && !isHeroVisibleRef.current) return

    // Steps 1-3 (the capture + two blur passes) only ever change what's
    // visible if the glass's own tilt/position or the text's own position
    // moved since the last frame they ran — see isSceneSettledRef above.
    // blurVFBO's texture just sits there holding last frame's result
    // otherwise, which useTextRevealMaterial keeps sampling from below
    // exactly as if this had run again and produced the same thing, at
    // zero cost. Step 4, the one real visible render, still has to run
    // every frame regardless — R3F disables its own auto-render entirely
    // once *any* useFrame carries a priority (this one does, see the `1`
    // below), so skipping it unconditionally would leave the canvas blank.
    if (!isSceneSettledRef.current) {
      const prevTarget = state.gl.getRenderTarget()

      // scene.background is applied as the render target's clear/fill
      // whenever this scene renders, regardless of camera layer masking —
      // layers only filter which *objects* draw, not the scene-level
      // background. Nulling it out isn't enough on its own, though: with no
      // scene background, the renderer falls back to *its own* default clear
      // (opaque black, alpha 1) — still a fully opaque flat fill covering the
      // glass, just black instead of navy. Both together (null background +
      // an explicit zero-alpha clear color) are what actually make empty
      // regions transparent, so useTextRevealMaterial's blending only
      // contributes where real text ink is, leaving the base glass showing
      // through everywhere else. Needed for the whole sequence below, not
      // just the first capture — the blur passes read/write plain RGBA too.
      const oldBackground = state.scene.background
      state.scene.background = null
      const oldClearAlpha = state.gl.getClearAlpha()
      state.gl.getClearColor(scratchClearColor)
      state.gl.setClearColor(0x000000, 0)

      // 1. Capture the crisp text as-is.
      state.camera.layers.disable(0)
      state.camera.layers.enable(TEXT_SOURCE_LAYER)
      state.gl.setRenderTarget(textCaptureFBO)
      state.gl.render(state.scene, state.camera)
      state.camera.layers.disable(TEXT_SOURCE_LAYER)

      // 2-3. Blur it, horizontally then vertically. texel is the per-tap
      // spacing in UV units — kept small (a few device pixels) so the kernel
      // stays properly sampled against even fairly thin strokes; see
      // useSeparableBlurMaterial for why a wide/sparse kernel doesn't work.
      const dpr = state.viewport.dpr
      const resolutionPx = { x: state.size.width * dpr, y: state.size.height * dpr }
      const stepPx = 3
      state.camera.layers.enable(BLUR_PASS_LAYER)

      blurMaterial.uniforms.source.value = textCaptureFBO.texture
      blurMaterial.uniforms.texel.value.set(stepPx / resolutionPx.x, stepPx / resolutionPx.y)
      blurMaterial.uniforms.direction.value.set(1, 0)
      state.gl.setRenderTarget(blurHFBO)
      state.gl.render(state.scene, state.camera)

      blurMaterial.uniforms.source.value = blurHFBO.texture
      blurMaterial.uniforms.direction.value.set(0, 1)
      state.gl.setRenderTarget(blurVFBO)
      state.gl.render(state.scene, state.camera)

      state.camera.layers.disable(BLUR_PASS_LAYER)
      state.camera.layers.enable(0)

      state.scene.background = oldBackground
      state.gl.setClearColor(scratchClearColor, oldClearAlpha)
      state.gl.setRenderTarget(prevTarget)
    }

    // 4. The one real, visible render.
    state.camera.layers.enable(OVERLAY_LAYER)
    state.gl.render(state.scene, state.camera)
    state.camera.layers.disable(OVERLAY_LAYER)
  }, 1)

  useFrame((state) => {
    const dpr = state.viewport.dpr
    textRevealMaterial.uniforms.textSource.value = blurVFBO.texture
    textRevealMaterial.uniforms.resolution.value.set(state.size.width * dpr, state.size.height * dpr)
    // Shares this same already-blurred (real two-pass Gaussian, not a
    // per-glyph SDF halo) capture out to HeroTitle, for its own on-screen
    // blurred-word transition — see AnimatedWordLine there. Just a texture
    // reference handoff (blurVFBO itself is reused frame to frame), so this
    // is free.
    if (blurredTextRef) blurredTextRef.current = blurVFBO.texture
  })

  return (
    <>
      <group ref={groupRef} {...props}>
        <group
          position={[-center.x * scale, center.y * scale, 0]}
          scale={[scale, -scale, scale]}
        >
          <mesh geometry={mergedGeometry}>
            {highQuality ? (
              <TransmissionMaterial ref={transmissionMaterialRef} thickness={depth} {...glassMaterialProps} />
            ) : (
              <meshPhysicalMaterial
                color="#e2e8f0"
                specularColor="#3B82F6"
                specularIntensity={0.6}
                transparent
                opacity={0.35}
                roughness={0.5}
                metalness={0}
              />
            )}
          </mesh>

          {/* Real-time multi-light glint overlay — see useGlowOverlayMaterial.
              Shares the same geometry/transform as the glass mesh above so it
              sits exactly on its surface; raycasting disabled since it has no
              interaction of its own. On OVERLAY_LAYER (not the default layer
              0) so TransmissionMaterial's own backdrop capture — which
              renders the whole scene on the default layer — never sees it;
              see the OVERLAY_LAYER comment above. */}
          <mesh
            geometry={mergedGeometry}
            material={glowOverlayMaterial}
            raycast={() => null}
            ref={(el) => el?.layers.set(OVERLAY_LAYER)}
          />

          {/* Dim bleed-through copy of the blue light overlay — see
              bleedGlowMaterial above. Left on the default layer (no ref
              override) so TransmissionMaterial's backdrop capture picks
              it up and softly refracts it into the glass's depth. */}
          <mesh geometry={mergedGeometry} material={bleedGlowMaterial} raycast={() => null} />

          {/* Reveals HeroTitle's crisp text, blurred, wherever the glass's
              own shape covers it — see useTextRevealMaterial. Same
              geometry/transform as the glass mesh, so "where this shows up"
              is just normal rasterization of the glass's actual current
              shape, tilt included — no separate mask needed. On
              OVERLAY_LAYER for the same reason as the glint overlay above:
              invisible to TransmissionMaterial's own backdrop capture. */}
          <mesh
            geometry={mergedGeometry}
            material={textRevealMaterial}
            raycast={() => null}
            ref={(el) => el?.layers.set(OVERLAY_LAYER)}
          />
        </group>
      </group>

      {/* The full-screen quad useSeparableBlurMaterial's two passes render
          through — see the priority-1 useFrame above. Its vertex shader
          ignores the camera/scene transform entirely (raw position.xy as
          clip space), so this mesh's own position/parent doesn't matter;
          it's a sibling of groupRef purely so it isn't caught up in the
          tilt rotation for no reason. */}
      <mesh material={blurMaterial} raycast={() => null} ref={(el) => el?.layers.set(BLUR_PASS_LAYER)}>
        <planeGeometry args={[2, 2]} />
      </mesh>
    </>
  )
}
