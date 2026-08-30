import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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
  // Sets each mesh's capture-only layer the instant React attaches it,
  // rather than in a useEffect keyed on current/outgoing. An effect runs
  // after commit — a real gap on this canvas, since it's the same one
  // GoogleCloudGlassBadge renders normally into: a freshly-mounted mesh
  // sits on the *default* layer for however long that gap lasts, which
  // means it's actually visible here for a frame, as a flat undistorted
  // rectangle popping in over the glass, before the effect catches up and
  // moves it onto CAPTURE_LAYER (invisible except through the badge's own
  // refraction). outgoingMeshRef's mesh is the one this actually bit: it
  // mounts fresh every time a new dissolve starts, and rapid back-and-forth
  // clicking starts a lot of those in quick succession, chaining fades
  // (see startFade/pendingRef below) far more often than clicking one
  // direction repeatedly does — reported as the badge "glitching" on rapid
  // direction changes specifically. A callback ref fires synchronously
  // while React attaches it, before anything can paint, closing that gap.
  // useCallback (stable identity) rather than a plain inline function — a
  // callback ref that changes identity every render gets detached and
  // reattached by React on every one of them (null, then the element again)
  // even though the underlying mesh never actually unmounts. Harmless here
  // either way since it's synchronous within the same commit, but there's
  // no reason to churn it needlessly.
  const setCurrentMesh = useCallback((mesh) => {
    currentMeshRef.current = mesh
    mesh?.layers.set(CAPTURE_LAYER)
  }, [])
  const setOutgoingMesh = useCallback((mesh) => {
    outgoingMeshRef.current = mesh
    mesh?.layers.set(CAPTURE_LAYER)
  }, [])
  // The in-flight fade's completion timer, and the authority on whether a
  // fade is currently playing. A timer handle rather than a mirror of the
  // `outgoing` state, deliberately: state doesn't commit until React
  // re-renders, so two loads resolving in the same tick would both see
  // "not fading" and the second would stomp the first. This is set
  // synchronously by startFade below, so the answer is right immediately.
  const fadeTimerRef = useRef(0)
  const isFading = () => fadeTimerRef.current !== 0
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

  // Ends the fade that just completed and starts whatever queued up behind
  // it. Driven by a plain timer scheduled when the fade *starts* — see
  // startFade — rather than by watching progress inside useFrame and
  // calling setState the moment it reaches 1, which is what this used to
  // do. That was the source of a real crash: useFrame runs inside
  // react-three-fiber's own render loop, and a setState from there can land
  // while React is already committing elsewhere in the tree (rapid arrow
  // clicks driving AboutUsIntro's own state), producing "Cannot commit the
  // same tree as before" — an uncaught error that didn't just break this
  // canvas but left the whole app's state updates silently not applying
  // afterward. Deferring it by a microtask (tried first) only narrowed the
  // window rather than closing it: a microtask queued from inside the frame
  // callback still drains within that same frame's task. A timer is a
  // genuinely separate task, so this can no longer contend with a commit
  // in progress at all — and it's the same shape AboutUsIntro's own
  // finishTransition already uses for exactly this reason.
  const finishFade = () => {
    fadeTimerRef.current = 0
    const pending = pendingRef.current
    if (pending) {
      pendingRef.current = null
      startFade(currentRef.current, pending)
    } else {
      setOutgoing(null)
    }
  }

  const startFade = (from, to) => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    setOutgoing(from)
    setCurrent(to)
    // Kept in step synchronously so a fade chained straight out of
    // finishFade above snapshots what's actually on screen rather than the
    // value from the last committed render.
    currentRef.current = to
    fadeStartRef.current = performance.now()
    fadeTimerRef.current = setTimeout(finishFade, CROSSFADE_MS + 80)
  }

  // useLayoutEffect, not useEffect — see AboutUsIntro's own matching
  // onPhotoChange effect for why: this is the second (and last) hop in the
  // relay that gets a new slide's photo from the DOM's own click handler to
  // this component's fade. A passive effect waits for the browser to judge
  // the main thread idle enough to run it; on this dev setup's software
  // WebGL fallback that idle window can be scarce, and every hop that waits
  // for it stacks into real, visible delay — the badge still showing the
  // previous photo well after the DOM had already moved on. This runs
  // synchronously in the commit phase instead, ahead of paint.
  useLayoutEffect(() => {
    let cancelled = false
    loadCachedTexture(target, (texture) => {
      if (cancelled) return
      const loaded = { src: target, texture }
      if (isFading()) {
        pendingRef.current = loaded
        return
      }
      const prevCurrent = currentRef.current
      // Nothing to dissolve from on the very first load, or if this load
      // finished after target had already moved on again (its own texture
      // will already be in flight to replace it).
      if (prevCurrent && prevCurrent.src !== target) {
        startFade(prevCurrent, loaded)
      } else {
        setCurrent(loaded)
        currentRef.current = loaded
      }
    })
    return () => {
      cancelled = true
    }
  }, [target])

  useEffect(() => () => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
  }, [])

  // Pure animation — writes one material uniform and nothing else. No React
  // state is touched from inside the frame loop at all (see finishFade above
  // for what used to be here, and why that mattered).
  useFrame(() => {
    if (!outgoing || !outgoingMeshRef.current) return
    const t = Math.min(1, (performance.now() - fadeStartRef.current) / CROSSFADE_MS)
    outgoingMeshRef.current.material.opacity = 1 - easeInOut(t)
  })

  const world = useDomRectWorld(domRect)
  if (!world || !current) return null

  return (
    <>
      <mesh ref={setCurrentMesh} position={[world.x, world.y, world.z]} raycast={() => null}>
        <planeGeometry args={[world.width, world.height]} />
        <meshBasicMaterial map={current.texture} color={WHITE_DIM_COLOR} toneMapped={false} />
      </mesh>
      {outgoing && (
        // renderOrder + depthTest (rather than leaning on z position) is
        // what actually guarantees this draws on top of current — both
        // planes share the same world.z, so any stacking that depended on
        // depth alone would be a coin flip on which one wins. Plain
        // meshBasicMaterial, same as the current plane's own — the outgoing
        // photo just dissolves via opacity (see the useFrame above), the
        // same plain-crossfade shape MeetTheTeamGrid's own photo swap uses,
        // rather than a custom per-pixel blur shader trying to match the DOM
        // photo's CSS blur+fade exactly. Viewed through the badge's own
        // refractive, already-softened glass, that extra blur wasn't doing
        // visible work worth its GPU cost (25 texture samples a pixel) or
        // the shader code it took to keep it sRGB-correct.
        <mesh
          ref={setOutgoingMesh}
          position={[world.x, world.y, world.z]}
          renderOrder={1}
          raycast={() => null}
        >
          <planeGeometry args={[world.width, world.height]} />
          <meshBasicMaterial
            map={outgoing.texture}
            color={WHITE_DIM_COLOR}
            toneMapped={false}
            transparent
            depthTest={false}
            opacity={1}
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
  // Callback refs, not useEffect — see the matching ones in
  // PhotoBackdropCapture above for why setting the layer at attach time
  // (rather than after commit) is what actually keeps these off the
  // default, directly-visible layer with no gap.
  const setBottomMesh = useCallback((mesh) => {
    bottomRef.current = mesh
    mesh?.layers.set(CAPTURE_LAYER)
  }, [])
  const setRightMesh = useCallback((mesh) => {
    rightRef.current = mesh
    mesh?.layers.set(CAPTURE_LAYER)
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
      <mesh ref={setBottomMesh} position={[bottomBar.x, bottomBar.y, bottomBar.z]} raycast={() => null}>
        <planeGeometry args={[bottomBar.width, bottomBar.height]} />
        <bracketBlurMaterial color={BRACKET_COLOR} transparent toneMapped={false} />
      </mesh>
      <mesh ref={setRightMesh} position={[rightBar.x, rightBar.y, rightBar.z]} raycast={() => null}>
        <planeGeometry args={[rightBar.width, rightBar.height]} />
        <bracketBlurMaterial color={BRACKET_COLOR} transparent toneMapped={false} />
      </mesh>
    </>
  )
}

export default PhotoBackdropCapture
