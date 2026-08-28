import { useEffect, useRef, useState } from 'react'
import { extend, useFrame, useThree } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import { Color, TextureLoader } from 'three'

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

// A single white pixel, stretched — AboutUsIntro's first two slides have no
// photo at all (see SLIDES there), and src is null for those. useTexture
// can't be called conditionally (this component's own hook order has to
// stay identical across a src that changes between renders on the *same*
// mounted instance, not just between mounts), so this gives it something to
// always load instead of skipping the call — a plain white rectangle in the
// badge's own reflection everywhere the real photo isn't, rather than the
// glass refracting nothing at all.
const WHITE_PLACEHOLDER_SRC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

// How long the outgoing plane takes to dissolve — matches the DOM photo's
// own duration-500 in AboutUsIntro exactly. Went back and forth on this
// (500, then 280, then 500, then 300 — see prior comments/git history) while
// the real problem was never actually the duration: easeInOut below was a
// smoothstep curve, a materially different *shape* from the DOM's own
// cubic-bezier(0.4,0,0.2,1) ease-in-out, so even a duration picked to land
// both transitions at the same instant still had them moving at visibly
// different instantaneous rates throughout — reported as "different speed"
// no matter which duration this was tuned to. Now that easeInOut is the
// same curve, not just a same-shaped one, matching the duration exactly is
// what actually keeps them in lockstep, rather than another guess at a
// compensating offset.
const CROSSFADE_MS = 500

// The exact same curve Tailwind's ease-in-out class resolves to (see
// --ease-in-out in the generated CSS: cubic-bezier(0.4, 0, 0.2, 1)) — not a
// same-*shaped* approximation like the smoothstep this replaced. Two curves
// that are both "slow-fast-slow" can still disagree on *how much* slower at
// any given instant, which is exactly what made the badge and the real
// photo feel like they were playing at different speeds even once their
// start times and total durations lined up. Standard bezier-solve-by-x
// (Newton-Raphson on the parametric curve) — the same technique browsers
// themselves use to evaluate CSS bezier easings — so this is a faithful
// reproduction, not another approximation.
function makeCubicBezierEase(x1, y1, x2, y2) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t) => ((ay * t + by) * t + cy) * t
  const sampleDerivX = (t) => (3 * ax * t + 2 * bx) * t + cx
  return (x) => {
    let t = x
    for (let i = 0; i < 8; i++) {
      const dx = sampleX(t) - x
      const d = sampleDerivX(t)
      if (Math.abs(d) < 1e-6) break
      t -= dx / d
    }
    return sampleY(t)
  }
}
const easeInOut = makeCubicBezierEase(0.4, 0, 0.2, 1)

// Keyed by src, shared across every mount/slide-change rather than a fresh
// TextureLoader firing per click — drei's useTexture gave this for free via
// THREE.Cache; losing that when it was dropped below (see the component's
// own comment) meant every revisit to an already-seen photo re-decoded and
// re-uploaded it to the GPU from scratch. Cheap under normal WebGL, real
// main-thread work under the software fallback this dev environment logs
// — enough of it to visibly stall the DOM photo's own independent CSS
// transition running at the same time, which is what "the flicker gets
// worse and never goes away again" actually was: not a logic bug in the
// crossfade itself, repeated, avoidable decode cost piling up because nothing
// was ever being reused. Never invalidated — SLIDES is a small, fixed set of
// photos, so this holds at most a handful of textures for the component's
// whole lifetime.
const textureCache = new Map()
function loadCachedTexture(url, onLoad) {
  const cached = textureCache.get(url)
  if (cached) {
    onLoad(cached)
    return
  }
  new TextureLoader().load(url, (texture) => {
    textureCache.set(url, texture)
    onLoad(texture)
  })
}

// Warms textureCache for a known set of URLs ahead of time — called once
// from AboutUsSection with AboutUsIntro's own SLIDE_PHOTOS list, as soon as
// the scene is ready, well before the slideshow's first click. Closes the
// badge's own load-latency gap at the source: by the time any slide change
// actually asks for one of these, loadCachedTexture above finds it already
// sitting in the cache and resolves synchronously, rather than only *then*
// kicking off the fetch+decode+GPU-upload that was making this crossfade
// start later than the DOM photo's own every time.
export function preloadPhotoTextures(urls) {
  urls.forEach((url) => loadCachedTexture(url, () => {}))
}

// How far the blur samples spread, in UV units (the plane's own 0–1 texture
// space, not world or screen px — so this scales with the photo regardless
// of how big the badge itself ends up on screen). Picked to roughly match
// the DOM photo's own blur(16px) over its ~800px-wide window (16/800 = 0.02)
// — approximate, since UV-space blur doesn't map 1:1 onto a CSS pixel radius
// the way the DOM's own filter does, but it's the same order of softness.
const MAX_BLUR_UV = 0.02

// Same shape as BracketBlurMaterial below — a small custom shader rather
// than a plain meshBasicMaterial — because meshBasicMaterial has no blur
// lever at all. Without this the outgoing plane could only ever fade
// (opacity), never soften the way the DOM photo's own
// transition-[opacity,filter] does, so the two visibly read as two
// different *kinds* of transition side by side rather than the same one.
// A real multi-pass separable Gaussian would need its own render target —
// a lot of machinery for a plane this small and a dissolve this brief — so
// this is a single-pass 5x5 tap blur instead, weighted with the 1-4-6-4-1
// Pascal's-triangle row (outer product across both axes) rather than a flat
// box average: a *uniformly*-weighted box blur has a visibly different
// character from CSS's own Gaussian filter — flatter, more "smeared" at the
// edges of the blurred region instead of tapering off — which was part of
// why this read as a different kind of blur even after the color-space fix
// below fixed the brightening. This kernel isn't a true Gaussian either, but
// it tapers the same way one does, which a flat box average never will
// regardless of sample count.
const PhotoDissolveMaterial = shaderMaterial(
  { map: null, color: new Color(WHITE_DIM_COLOR), opacity: 1, blurAmount: 0 },
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    varying vec2 vUv;
    uniform sampler2D map;
    uniform vec3 color;
    uniform float opacity;
    uniform float blurAmount;

    // Cheap sRGB<->linear approximation (gamma 2.2) — texture2D returns
    // whatever's in the JPEG's own gamma-encoded space, and averaging those
    // values directly (the first version of this shader) systematically
    // biases bright: gamma encoding compresses highlights, so a plain mean
    // of two gamma values reads brighter than the true mean of the colors
    // they represent. Barely visible per sample, but stacks up over a 5x5
    // box blur on high-contrast photo content (dark clothing against a
    // bright studio backdrop, here) into a visible whitening — reported as
    // a "white flash" mid-transition, and part of why this blur read as a
    // different *kind* of blur than the DOM photo's own CSS filter, which
    // the browser already blurs in the correct space. Decoding to linear
    // before averaging and re-encoding after fixes the math without
    // changing anything at blurAmount 0 — a single sample decoded then
    // immediately re-encoded is the same value it always was (mod float
    // rounding) — since nothing was wrong there to begin with; this only
    // touches what happens while actually blurred.
    vec3 srgbToLinear(vec3 c) { return pow(c, vec3(2.2)); }
    vec3 linearToSrgb(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

    // Pascal's-triangle row for a 5-tap 1D kernel (1,4,6,4,1) — the same
    // weights a real 5-tap Gaussian approximation uses, indexed by tap
    // offset (-2..2).
    float tapWeight(int i) {
      if (i == 0) return 6.0;
      if (i == -1 || i == 1) return 4.0;
      return 1.0;
    }

    void main() {
      vec4 sum = vec4(0.0);
      float total = 0.0;
      for (int x = -2; x <= 2; x++) {
        for (int y = -2; y <= 2; y++) {
          float weight = tapWeight(x) * tapWeight(y);
          vec4 s = texture2D(map, vUv + vec2(float(x), float(y)) * blurAmount);
          sum += vec4(srgbToLinear(s.rgb), s.a) * weight;
          total += weight;
        }
      }
      vec4 avg = sum / total;
      gl_FragColor = vec4(linearToSrgb(avg.rgb) * color, avg.a * opacity);
    }
  `,
)
extend({ PhotoDissolveMaterial })

// A plain textured plane holding the team photo, sized and placed to land
// exactly where the real DOM photo paints — so refracting it reads as the
// badge sitting on the actual photo, not on a placeholder.
//
// Loads with a plain TextureLoader (via loadCachedTexture above) rather than
// drei's useTexture — that hook suspends the whole component on every src
// change (every slideshow swap, see AboutUsIntro's onPhotoChange), which
// discards whatever was already rendered, old texture included, the instant
// a new one starts loading. There'd be nothing left to dissolve *from*.
// Loading by hand and only swapping current once the new texture actually
// arrives keeps the old one in hand as outgoing, the same "stay
// covered/visible until the replacement is ready" shape AboutUsIntro's own
// DOM photo uses.
export function PhotoBackdropCapture({ domRect, src }) {
  const target = src || WHITE_PLACEHOLDER_SRC
  // The fully-loaded texture currently on screen, plus the src it belongs
  // to — the src is kept alongside it so a repeated load (e.g. TextureLoader
  // resolving after target has already changed again) can be told apart
  // from a real change.
  const [current, setCurrent] = useState(null)
  // A frozen previous texture dissolving away on top of current — see the
  // crossfade useFrame below. null once there's nothing left to fade.
  const [outgoing, setOutgoing] = useState(null)
  const fadeStartRef = useRef(0)
  const currentMeshRef = useRef(null)
  const outgoingMeshRef = useRef(null)
  // Mirrors outgoing for the load callback below, the same "read the latest
  // value off a ref inside an async callback instead of a stale closure"
  // shape AboutUsIntro's own outgoingRef uses for its parallax loop.
  const isFadingRef = useRef(false)
  isFadingRef.current = outgoing !== null
  // A texture that finished loading while a fade was already playing — held
  // here instead of starting its own crossfade immediately. The DOM photo's
  // own transition gates each click on the previous one finishing (see
  // startTransition in AboutUsIntro), but that only protects the DOM side:
  // this component reacts to the src prop the instant a click happens, and
  // its own load+500ms-fade timeline runs independently of the DOM one (a
  // slow texture upload can easily still be fading well after the DOM has
  // already finished and re-enabled the arrows for another click). Without
  // this, a second load landing mid-fade replaced outgoing outright — same
  // "new content, no transition to play it over" pop as the DOM bug this
  // mirrors, just on this layer instead. Queuing it here means a rapid
  // back-and-forth plays out as a clean chain of full dissolves rather than
  // two overlapping ones stepping on each other.
  const pendingRef = useRef(null)
  // Mirrors current for the load callback below — read instead of using
  // setCurrent's functional-update form to reach the previous value, since
  // that form's updater can run more than once for the same update (React
  // does this deliberately in StrictMode, to catch impure updaters) and
  // setOutgoing was being called as a side effect from inside it. Two plain,
  // independent setters below instead.
  const currentRef = useRef(null)
  currentRef.current = current

  useEffect(() => {
    let cancelled = false
    loadCachedTexture(target, (texture) => {
      if (cancelled) return
      const loaded = { src: target, texture }
      if (isFadingRef.current) {
        pendingRef.current = loaded
        return
      }
      const prevCurrent = currentRef.current
      // Nothing to dissolve from on the very first load, or if this load
      // finished after target had already moved on again (its own texture
      // will already be in flight to replace it).
      if (prevCurrent && prevCurrent.src !== target) {
        setOutgoing(prevCurrent)
        fadeStartRef.current = performance.now()
      }
      setCurrent(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [target])

  useEffect(() => {
    currentMeshRef.current?.layers.set(CAPTURE_LAYER)
  }, [current])
  useEffect(() => {
    outgoingMeshRef.current?.layers.set(CAPTURE_LAYER)
  }, [outgoing])

  // Guards the "this fade just finished" branch below against running more
  // than once for the same completion — useFrame keeps calling this every
  // frame while t stays clamped at 1 (waiting for the deferred setState
  // below to actually commit), and without this it queued/cleared on every
  // one of those frames instead of just the first.
  const finishedRef = useRef(false)

  useFrame(() => {
    if (!outgoing || !outgoingMeshRef.current) return
    const t = Math.min(1, (performance.now() - fadeStartRef.current) / CROSSFADE_MS)
    const eased = easeInOut(t)
    outgoingMeshRef.current.material.opacity = 1 - eased
    outgoingMeshRef.current.material.blurAmount = eased * MAX_BLUR_UV
    if (t < 1 || finishedRef.current) return
    finishedRef.current = true
    // setOutgoing/setCurrent are deliberately not called synchronously from
    // here. useFrame runs inside react-three-fiber's own render loop, and
    // calling setState directly from it can race with a React commit
    // already in flight elsewhere in the tree (here, specifically: rapid
    // arrow clicks driving AboutUsIntro's own setState calls) — R3F and
    // this component's own tree share one React root, so a collision isn't
    // contained to this canvas. That raced into "Cannot commit the same
    // tree as before", an uncaught error that didn't just crash this
    // component — it left the *whole app's* state updates silently not
    // taking effect afterward (reported as the slideshow arrows looking
    // clickable but permanently doing nothing). Deferring with a
    // microtask — still effectively immediate, just outside useFrame's own
    // synchronous call stack — lets React schedule this update through its
    // normal path instead of contending with the frame loop for the same
    // commit.
    queueMicrotask(() => {
      const pending = pendingRef.current
      finishedRef.current = false
      if (pending) {
        pendingRef.current = null
        setOutgoing(current)
        setCurrent(pending)
        fadeStartRef.current = performance.now()
      } else {
        setOutgoing(null)
      }
    })
  })

  const world = useDomRectWorld(domRect)
  if (!world || !current) return null

  return (
    <>
      <mesh ref={currentMeshRef} position={[world.x, world.y, world.z]} raycast={() => null}>
        <planeGeometry args={[world.width, world.height]} />
        <meshBasicMaterial map={current.texture} color={WHITE_DIM_COLOR} toneMapped={false} />
      </mesh>
      {outgoing && (
        // renderOrder + depthTest (rather than leaning on z position) is
        // what actually guarantees this draws on top of current — both
        // planes share the same world.z, so any stacking that depended on
        // depth alone would be a coin flip on which one wins.
        <mesh
          ref={outgoingMeshRef}
          position={[world.x, world.y, world.z]}
          renderOrder={1}
          raycast={() => null}
        >
          <planeGeometry args={[world.width, world.height]} />
          <photoDissolveMaterial
            map={outgoing.texture}
            color={WHITE_DIM_COLOR}
            toneMapped={false}
            transparent
            depthTest={false}
            opacity={1}
            blurAmount={0}
          />
        </mesh>
      )}
    </>
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
