import { useEffect, useRef } from 'react'
import { extend, useFrame, useThree } from '@react-three/fiber'
import { shaderMaterial, useTexture } from '@react-three/drei'
import { Color } from 'three'

// Own layer, not the default 0 — enabled on the camera for the one
// frame-internal moment TransmissionMaterial captures its own backdrop (a
// plain, unprioritized useFrame, so it runs at the implicit default
// priority 0), then disabled again before this canvas's real, visible
// render (priority 1, see SceneRenderGate). That's what lets the Google
// Cloud badge's glass refract the actual team photo — show what's behind
// it, the same way the badge always has, just against a different backdrop
// now that it lives in its own canvas above the photo instead of sharing
// one with the grid — without a second, opaque copy of the photo ever
// painting into the canvas's normal output and covering the DOM photo (or
// the badge) underneath it.
export const CAPTURE_LAYER = 3

// Brackets the capture with the layer toggle: enabled one tick before it
// (-1), disabled one tick after (0.5, still ahead of the real render at 1).
export function CaptureLayerGate() {
  useFrame((state) => {
    state.camera.layers.enable(CAPTURE_LAYER)
  }, -1)
  useFrame((state) => {
    state.camera.layers.disable(CAPTURE_LAYER)
  }, 0.5)
  return null
}

// Same dimming HeroTitle's own text-reveal material applies to the hero's
// white text before the glass shows it (see useTextRevealMaterial's
// `opacity: 0.45` in GlassLogoGroup.jsx — "at full strength the blurred
// copy read as bright/white as the crisp text itself"). The photo's own
// whites (jackets, the studio backdrop) were getting no such treatment —
// a raw, undimmed texture read straight into the capture — so they came
// out of the glass reading as blown-out/neon next to the hero's own muted
// glimpsed-through-glass whites.
//
// A flat color multiply isn't quite the same lever HeroTitle's opacity is,
// though: text is binary (glyph or nothing), so scaling it down only ever
// touches white pixels. A photo has real midtones and shadows too, and the
// same multiply dims those right along with the highlights — 0.5 (tried
// first) crushed the whole image toward gray instead of just taking the
// edge off the brightest areas. Backed off to a much lighter touch, since
// the goal is tamed highlights, not a duller photo.
const WHITE_DIM_COLOR = '#d9d9d9'

// Shared by every capture-only plane in this file — the same CSS-px-rect-
// to-world-units conversion GoogleCloudGlassBadge uses for its own anchor,
// factored out once both the photo and the corner bracket bars below needed
// it. z fixed at 1.6 to match the badge's own depth (see
// GoogleCloudGlassBadge) — these are all meant to sit at "the photo's
// surface," not staggered in front of or behind one another.
function useDomRectWorld(domRect) {
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)
  const z = 1.6
  const { width: viewWidth } = viewport.getCurrentViewport(camera, [0, 0, z])
  const perPx = viewWidth / size.width
  if (!domRect) return null
  return {
    z,
    x: (domRect.left + domRect.width / 2 - size.width / 2) * perPx,
    y: -(domRect.top + domRect.height / 2 - size.height / 2) * perPx,
    width: domRect.width * perPx,
    height: domRect.height * perPx,
  }
}

// A plain textured plane holding the team photo, sized and placed to land
// exactly where the real DOM photo paints — so refracting it reads as the
// badge sitting on the actual photo, not on a placeholder.
export function PhotoBackdropCapture({ domRect, src }) {
  const texture = useTexture(src)
  const meshRef = useRef(null)

  useEffect(() => {
    meshRef.current?.layers.set(CAPTURE_LAYER)
  }, [])

  const world = useDomRectWorld(domRect)
  if (!world) return null

  return (
    <mesh ref={meshRef} position={[world.x, world.y, world.z]} raycast={() => null}>
      <planeGeometry args={[world.width, world.height]} />
      <meshBasicMaterial map={texture} color={WHITE_DIM_COLOR} toneMapped={false} />
    </mesh>
  )
}

// Same blue as the corner bracket's own CSS border-color (#3B82F6, see
// CornerBrackets.jsx).
const BRACKET_COLOR = '#3B82F6'

// A flat meshBasicMaterial rectangle (tried first) reads as a hard-edged
// cutout next to the photo and grid, both genuinely softened by
// TransmissionMaterial's own low-res capture (see GoogleCloudGlassBadge) —
// asked to blur to match.
//
// The first version of this material (a smoothstep from fully solid at the
// bar's own true edge down to transparent at the padding's outer edge)
// still kept a 100%-opaque, hard-edged core the exact size of the original
// bar — so what padding added was a soft halo *around* an unchanged solid
// center, which reads as the bar getting thicker, not blurred. A real blur
// redistributes energy rather than adding to it: even the center of a
// blurred line is dimmer than the unblurred original, with no flat, fully-
// opaque plateau anywhere. Dropping the two-tier core/falloff split for one
// continuous curve peaking at (a reduced) PEAK_ALPHA exactly at the center
// and falling smoothly all the way to the padded edge — the same
// no-hard-edge shape useReflectionEnvironment's own stripe glow uses (see
// makeGlowMaterial's "stripe" falloff there) — is what actually reads as
// soft instead of just wider.
const PEAK_ALPHA = 0.75
const BracketBlurMaterial = shaderMaterial(
  { color: new Color(BRACKET_COLOR), falloffPower: [1.4, 1.4] },
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    uniform vec3 color;
    uniform vec2 falloffPower;
    void main() {
      vec2 c = abs(vUv - 0.5) * 2.0;
      float ax = pow(clamp(1.0 - c.x, 0.0, 1.0), falloffPower.x);
      float ay = pow(clamp(1.0 - c.y, 0.0, 1.0), falloffPower.y);
      gl_FragColor = vec4(color, ${PEAK_ALPHA} * ax * ay);
    }
  `,
)
extend({ BracketBlurMaterial })

// The bottom-right corner bracket (see CornerBrackets.jsx, rendered with
// size=40/thickness=5/overhang=10 in AboutUsIntro.jsx) is a plain DOM
// element sitting in the same spot the badge now covers — a <canvas>, even
// this transparent overlay one, still paints as one flat layer above
// everything before it in the DOM (see this file's own top comment, and
// AboutUsSection's matching one on why the badge needed its own canvas at
// all), so the mark was simply gone wherever the badge sat over it, DOM
// z-index notwithstanding. Reconstructing it here as two thin capture-only
// bars — same geometry the CSS border trick draws, an L of a 40px
// bottom-right box with only its bottom and right edges (5px each) visible,
// 10px past the window's own corner — puts it back, refracted through the
// glass exactly like the photo and grid already are, rather than just gone.
export function CornerBracketCapture({ windowRect }) {
  const bottomRef = useRef(null)
  const rightRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.layers.set(CAPTURE_LAYER)
    rightRef.current?.layers.set(CAPTURE_LAYER)
  }, [])

  const SIZE = 40
  const THICKNESS = 5
  const OVERHANG = 10
  // Padding added to every side of each bar's own true footprint before
  // conversion to world units, in DOM px — the geometry itself grows by
  // this much so BracketBlurMaterial has room to fade out into. The same
  // pixel amount on both axes is deliberate (not a fraction of each bar's
  // own length) — that's what makes it an even, isotropic blur radius
  // rather than one that scales with how long or thick a given bar is.
  const BLUR_PADDING_PX = 10
  // The CSS box's own edges, in the window's local px space (see
  // CornerBrackets.jsx: right:-overhang/bottom:-overhang position the box's
  // own bottom-right corner OVERHANG px past the window's, and its
  // width/height put the box's top-left corner SIZE further back from that).
  // Hooks below must run unconditionally regardless of windowRect (React's
  // own rule), so a missing rect flows through as null props rather than an
  // early return before them; useDomRectWorld already tolerates that.
  const boxRight = windowRect ? windowRect.width + OVERHANG : 0
  const boxBottom = windowRect ? windowRect.height + OVERHANG : 0
  const boxLeft = boxRight - SIZE
  const boxTop = boxBottom - SIZE

  const bottomBar = useDomRectWorld(
    windowRect && {
      left: windowRect.left + boxLeft - BLUR_PADDING_PX,
      top: windowRect.top + boxBottom - THICKNESS - BLUR_PADDING_PX,
      width: SIZE + BLUR_PADDING_PX * 2,
      height: THICKNESS + BLUR_PADDING_PX * 2,
    },
  )
  const rightBar = useDomRectWorld(
    windowRect && {
      left: windowRect.left + boxRight - THICKNESS - BLUR_PADDING_PX,
      top: windowRect.top + boxTop - BLUR_PADDING_PX,
      width: THICKNESS + BLUR_PADDING_PX * 2,
      height: SIZE + BLUR_PADDING_PX * 2,
    },
  )
  if (!bottomBar || !rightBar) return null

  return (
    <>
      <mesh ref={bottomRef} position={[bottomBar.x, bottomBar.y, bottomBar.z]} raycast={() => null}>
        <planeGeometry args={[bottomBar.width, bottomBar.height]} />
        <bracketBlurMaterial color={BRACKET_COLOR} transparent toneMapped={false} />
      </mesh>
      <mesh ref={rightRef} position={[rightBar.x, rightBar.y, rightBar.z]} raycast={() => null}>
        <planeGeometry args={[rightBar.width, rightBar.height]} />
        <bracketBlurMaterial color={BRACKET_COLOR} transparent toneMapped={false} />
      </mesh>
    </>
  )
}

export default PhotoBackdropCapture
