import { useEffect, useMemo } from 'react'
import { AdditiveBlending, ShaderMaterial, Vector2, Vector3 } from 'three'

// The glass look shared by the hero's logo (GlassLogoGroup) and the About Us
// info panel (GlassInfoPanel): the transmission material's own settings, and
// the real-time glint shader layered over it. Kept in a module of its own
// rather than exported from GlassLogoGroup so that neither piece owns the
// look the other borrows, and so both component files stay exports-only for
// fast refresh.

// Real-time, always-on blue "light" reflections computed directly from the
// glass's own live surface normal each frame — deliberately independent of
// MeshTransmissionMaterial's baked-environment/clearcoat pipeline, which
// (being genuinely Fresnel-based) only lights up within a narrow viewing-
// angle window and was reading as "one faint light, only on hover" no
// matter how the baked environment or material properties were tuned.
// This is a classic multi-highlight "fake reflection" shader instead: a
// fixed set of light directions, each contributing a specular-style glint
// wherever the surface's reflected-view-direction lines up with it, summed
// and additively blended over the glass. Because it's a direct per-pixel
// calculation (not sampling a baked texture through a Fresnel term), it's
// visible immediately at any angle, not just grazing ones, and different
// lights catch different curved parts of the logo as it tilts.
// x>0,y>0 here reads as top-right on screen in view space (camera has no
// roll) — the brightest entries are concentrated there on purpose, with
// everywhere else dimmer than before (and dimmer overall than the previous
// pass) so the top-right reads as the clear highlight instead of an even
// wash.
const OVERLAY_LIGHTS = [
  { dir: [0.55, 0.62, 0.68], power: 20, color: [0.1, 0.36, 0.95] },
  { dir: [0.68, 0.38, 0.66], power: 26, color: [0.08, 0.3, 0.82] },
  { dir: [0.32, 0.72, 0.66], power: 15, color: [0.06, 0.22, 0.62] },
  { dir: [0.15, 0.7, 0.7], power: 14, color: [0.035, 0.13, 0.4] },
  { dir: [-0.45, 0.35, 0.8], power: 18, color: [0.03, 0.11, 0.34] },
  { dir: [0.55, -0.25, 0.79], power: 22, color: [0.025, 0.09, 0.28] },
  { dir: [-0.5, -0.4, 0.77], power: 24, color: [0.025, 0.09, 0.28] },
  { dir: [-0.2, -0.65, 0.73], power: 18, color: [0.02, 0.075, 0.24] },
  { dir: [-0.65, 0.2, 0.73], power: 20, color: [0.02, 0.075, 0.24] },
  { dir: [-0.1, 0.15, 0.98], power: 12, color: [0.018, 0.065, 0.2] },
  // Covers the logo's top-right curvature specifically — that region
  // doesn't sweep close enough to any of the lights above at a high enough
  // power to catch a visible glint otherwise. A lower power here means a
  // broader, more forgiving lobe — easier for the curved surface to
  // actually catch — at a similarly modest color to its neighbors, not the
  // brightest tier.
  { dir: [0.54, -0.6, 0.59], power: 10, color: [0.05, 0.16, 0.45] },
]

// MeshTransmissionMaterial's refraction sampling breaks down right at the
// silhouette — where the extrusion's depth walls face almost exactly
// perpendicular to the camera — reading as a thin flat-black outline
// instead of anything reflective, no matter how the envMap/lights are
// tuned (that's real light hitting real geometry; the artifact is in how
// the transmission shader samples its backdrop capture at grazing
// incidence, not a lighting gap). Cheaper to paper over than to fix at the
// source: a standard Fresnel rim term, brightest exactly where dot(N,V)
// approaches 0 (i.e. exactly the silhouette/depth-wall band), added to
// this same per-pixel overlay so the dark edge reads as a soft glow
// instead of an outline.
const RIM_COLOR = [0.14, 0.22, 0.4]
const RIM_POWER = 2.5

// `push` is how far each vertex is displaced along its own normal before
// rasterizing (see the vertex shader) — exported as a parameter rather than
// left hardcoded because it is a *world-space* distance, so the value that
// reads as "sitting exactly on the surface" depends on how physically large
// the piece is. 0.03 is right for the logo at its hero size; the About Us
// glass panel is a much shallower slab and needs a proportionally smaller
// one, or the overlay visibly detaches into a shell floating off the glass.
export function useGlowOverlayMaterial(intensity = 1, push = 0.03) {
  return useMemo(() => {
    const lightDirs = OVERLAY_LIGHTS.map(({ dir }) => new Vector3(...dir).normalize())
    const lightColors = OVERLAY_LIGHTS.map(({ color }) => new Vector3(...color))
    const lightPowers = OVERLAY_LIGHTS.map(({ power }) => power)
    return new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        lightDirs: { value: lightDirs },
        lightColors: { value: lightColors },
        lightPowers: { value: lightPowers },
        rimColor: { value: new Vector3(...RIM_COLOR) },
        rimPower: { value: RIM_POWER },
        intensity: { value: intensity },
        push: { value: push },
      },
      vertexShader: `
        uniform float push;
        varying vec3 vViewNormal;
        varying vec3 vViewPos;
        void main() {
          // Pushed out along the local normal (a small, fixed offset in
          // object space) rather than using polygonOffset — on the
          // extrusion's low-segment bevel, polygonOffset's per-triangle
          // depth bias combined with a sharp specular power caused visible
          // flickering/dashing right on the bevel where triangle facets
          // meet. An actual position offset avoids that entirely.
          vec3 pushed = position + normalize(normal) * push;
          vViewNormal = normalize(normalMatrix * normal);
          vec4 viewPos4 = modelViewMatrix * vec4(pushed, 1.0);
          vViewPos = viewPos4.xyz;
          gl_Position = projectionMatrix * viewPos4;
        }
      `,
      fragmentShader: `
        uniform vec3 lightDirs[${OVERLAY_LIGHTS.length}];
        uniform vec3 lightColors[${OVERLAY_LIGHTS.length}];
        uniform float lightPowers[${OVERLAY_LIGHTS.length}];
        uniform vec3 rimColor;
        uniform float rimPower;
        uniform float intensity;
        varying vec3 vViewNormal;
        varying vec3 vViewPos;
        void main() {
          vec3 N = normalize(vViewNormal);
          vec3 V = normalize(-vViewPos);
          vec3 R = reflect(-V, N);
          vec3 color = vec3(0.0);
          for (int i = 0; i < ${OVERLAY_LIGHTS.length}; i++) {
            float d = max(dot(R, lightDirs[i]), 0.0);
            color += lightColors[i] * pow(d, lightPowers[i]);
          }
          float fresnel = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), rimPower);
          color += rimColor * fresnel;
          gl_FragColor = vec4(color * intensity, 1.0);
        }
      `,
    })
  }, [intensity, push])
}

// One axis of a two-pass separable Gaussian blur (run horizontally into an
// intermediate texture, then vertically from that) rather than a single 2D
// kernel. A single-pass kernel wide enough to visibly soften fine detail at
// its target size undersamples badly: once the gap between taps exceeds a
// stroke's/edge's own width, consecutive taps skip clean over it into the
// gaps beside it, so the result reads hollow/ringed instead of smoothly
// soft. A separable blur lets each pass use many more, much more closely
// spaced taps for the same cost (9 taps x 2 passes here vs. the 25 taps a
// single dense-enough 2D kernel would need), which is what actually avoids
// that undersampling. Shared by both the hero's own text-reveal blur
// (GlassLogoGroup) and the About Us panel's photo-backdrop blur
// (GlassInfoPanel) — same shader, different source texture and blur radius,
// so the two never drift into two independently-tuned blur qualities.
// Ignores the camera's real transform entirely (position.xy straight to
// clip space) — this is a full-screen quad, not scene geometry; it just
// needs to cover every pixel of whatever render target it's pointed at.
export function useSeparableBlurMaterial() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        depthWrite: false,
        depthTest: false,
        uniforms: {
          source: { value: null },
          texel: { value: new Vector2(1, 1) },
          direction: { value: new Vector2(1, 0) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D source;
          uniform vec2 texel;
          uniform vec2 direction;
          varying vec2 vUv;
          // Straight (non-premultiplied) RGBA, averaged directly, mixes each
          // sample's *own* RGB with whatever color sits at fully-transparent
          // neighboring pixels — normally invisible since alpha=0 hides it,
          // but averaging drags that hidden color into the result before
          // alpha fades it out. Empty regions here are cleared black, so
          // white ink blurring into them picked up a visible dark fringe
          // right at the edge, even though alpha was fading correctly.
          // Premultiplying before the average (and un-premultiplying after)
          // is the standard fix: a transparent pixel contributes (0,0,0,0)
          // regardless of its nominal color, so it can't darken anything.
          vec4 sampleStraight(vec2 uv) {
            vec4 c = texture2D(source, uv);
            return vec4(c.rgb * c.a, c.a);
          }
          void main() {
            // 9-tap binomial-weight kernel (Pascal's-triangle row 8),
            // weights summing to 256 — closely spaced (see texel/step at
            // each call site) so it stays properly sampled even against
            // fairly thin/detailed source content.
            float w[5];
            w[0] = 70.0; w[1] = 56.0; w[2] = 28.0; w[3] = 8.0; w[4] = 1.0;
            vec4 sum = sampleStraight(vUv) * w[0];
            for (int i = 1; i < 5; i++) {
              vec2 offset = direction * texel * float(i);
              sum += sampleStraight(vUv + offset) * w[i];
              sum += sampleStraight(vUv - offset) * w[i];
            }
            sum /= 256.0;
            vec3 straightRgb = sum.a > 0.0001 ? sum.rgb / sum.a : sum.rgb;
            gl_FragColor = vec4(straightRgb, sum.a);
          }
        `,
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])
  return material
}

// Exported so the About Us glass info panel is literally the same material,
// not a second set of hand-matched numbers that would drift out of sync the
// next time these are tuned.
export const glassMaterialProps = {
  // Clear, texture-free glass — roughness/distortion/anisotropicBlur all
  // zeroed so the surface has no frosted grain and reads as smooth, clear
  // glass instead.
  roughness: 0,
  ior: 1.6,
  transmission: 0.75,
  chromaticAberration: 0.015,
  anisotropicBlur: 0,
  distortion: 0,
  distortionScale: 0.25,
  temporalDistortion: 0,
  clearcoat: 1,
  // A perfectly mirror-sharp clearcoat (0) reflects the scene's real
  // directionalLight as a small, fully-saturated point — bright enough
  // that at the one angle catching it dead-on, the renderer's tonemapping
  // compresses it into a distractingly bright near-white "ball" (no light,
  // OVERLAY_LIGHTS entry, or any other material value causes this — it's
  // specifically this mirror sharpness). A slight softening spreads that
  // same reflected energy over a few more pixels instead, each dimmer, so
  // it no longer clips — everywhere else this is subtle enough not to read
  // as frosted.
  clearcoatRoughness: 0.35,
  envMapIntensity: 4.5,
  color: '#ffffff',
  specularColor: '#3B82F6',
  specularIntensity: 1,
  attenuationColor: '#ffffff',
  attenuationDistance: 6,
  samples: 6,
  resolution: 512,
}
