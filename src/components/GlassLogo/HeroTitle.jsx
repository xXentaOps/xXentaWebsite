import { useEffect, useMemo, useRef, useState } from 'react'
import { Text } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, ShaderMaterial, Vector2 } from 'three'
import { GlassLogoGroup, OVERLAY_LAYER, TEXT_SOURCE_LAYER } from './GlassLogoGroup'
import { MARGIN_EM as LEFT_MARGIN_EM, MARGIN_REFERENCE_FONT_FRACTION } from './pageMargin'
import { useBreakpoint } from './useBreakpoint'
import { useLanguage } from '../../context/LanguageContext'
import fontUrl from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-400-normal.woff?url'

// Behind the glass logo's own depth (the logo's extrusion spans roughly
// z ±0.7 around 0 at its current targetSize/scale) so it sits solidly
// behind it, not inside its thickness.
const Z = -1.2

// Margins as multiples of the focal word's own font size ("Learning" — see
// LEARNING_FONT_FRACTION below), not independent viewport fractions.
// Apple's typography guidance is explicit about this: spacing should scale
// *with* the text, not sit at a fixed/arbitrary size next to it — otherwise
// the margin-to-type ratio silently drifts. It matters concretely here
// because type size scales off viewport *height* while a plain left-margin
// fraction would scale off viewport *width*: on anything other than the
// aspect ratio it was tuned at, a width-based margin and a height-based
// font size drift apart. Deriving both from the same font size keeps them
// in a fixed, correct relationship at any aspect ratio.
// ~0.4x lands close to a typical confident display-type edge crop (tight
// enough to feel intentional, not so tight it collides with the glyphs'
// own side-bearing).
// LEFT_MARGIN_EM and MARGIN_REFERENCE_FONT_FRACTION are imported from
// pageMargin.js — this margin is the reference every left-glued element on
// the page lines up against, so it lives in one place rather than being
// restated wherever something needs to agree with it.
//
// Slightly smaller than LEFT_MARGIN_EM so the block sits a touch lower,
// closer to the bottom edge, than an even inset would put it. Stays local:
// nothing outside the hero has a bottom margin to match.
const BOTTOM_MARGIN_EM = 0.34
function useViewportAt(z) {
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  return viewport.getCurrentViewport(camera, [0, 0, z])
}

const LETTER_SPACING_FACTOR = -0.03
// Dialed down from a full 1 — #F8FAFC at full opacity against this dark
// background read brighter/more attention-grabbing than intended for the
// title as a whole.
const TITLE_FILL_OPACITY = 0.7

// First-load entrance for the static "New Way of" line (see CrispLine) —
// same fade+rise language the word-switch transition already uses (see
// WORD_SWITCH_RISE_EM/QUICK_FADE_DURATION below), just slower, since this
// only plays once and isn't standing in for a blur-to-sharp resolve.
const TITLE_ENTRANCE_DURATION = 0.9
const TITLE_ENTRANCE_RISE_EM = 0.15

// Scroll-driven parallax, vertical only — applied one level up via a
// wrapping group around both title lines (see the titleGroupRef useFrame in
// HeroTitle) rather than inside CrispLine/AnimatedWordLine themselves, so it
// stacks additively on top of each line's own entrance/word-switch motion
// without either needing to know about the other. Faster than
// GlassLogoGroup's own LOGO_PARALLAX_STRENGTH — the text is the "light"
// foreground element next to the heavy glass, so it slides further over the
// same scroll distance, giving the two visible separation instead of moving
// as one flat image. Progress runs 0 (top of page) to 1 once the hero has
// scrolled a full viewport height — same calc as BackgroundGrid/
// GlassLogoGroup, duplicated for the same reason smoothstepEase is
// duplicated across this piece's files: too small to be worth sharing.
const TITLE_PARALLAX_STRENGTH = 0.14
const TITLE_PARALLAX_LAMBDA = 3
// Same idea and magnitude as GlassLogoGroup's own POSITION_SETTLE_EPSILON —
// how far this group's damped position may still sit from its target before
// isTextMovingRef.current.title counts as settled.
const TITLE_POSITION_SETTLE_EPSILON = 0.001

// Guaranteed hidden period before the title's first-ever reveal starts, on
// top of (not instead of) the visible={false}/onSync gating below. That
// gating only protects against troika's own async layout race — it says
// nothing about how long that race actually takes, which varies by
// machine/font-cache state and was still visibly catching this in the wild.
// A flat, wall-clock delay (a real setTimeout, independent of rAF/troika/
// GPU readiness entirely) removes the guesswork: nothing from this title
// can appear before this fires, full stop, and the entrance always starts
// counting fresh from that moment rather than from whenever the component
// happened to mount.
const TITLE_REVEAL_DELAY_MS = 1000

function sharedTextProps(fontSize) {
  return {
    font: fontUrl,
    fontWeight: 400,
    anchorX: 'left',
    anchorY: 'middle',
    letterSpacing: LETTER_SPACING_FACTOR * fontSize,
  }
}

// Real geometry sitting behind the glass mesh in the scene, so normal
// depth-testing hides it wherever the logo's opaque-ish surface covers it
// (exactly like GridPlane's direct copy), and shows it plainly everywhere
// else — including through any gaps in the logo's own silhouette, which is
// fine: those spots are just as "not glass" as the open background around
// it.
// On *both* OVERLAY_LAYER (so MeshTransmissionMaterial's own backdrop
// capture never sees it, and it shows normally in the final render) *and*
// TEXT_SOURCE_LAYER (so GlassLogoGroup's separate capture pass can pick up
// this exact, real render — see useTextRevealMaterial there for why that's
// what makes the hidden-behind-glass portion guaranteed to align: it's a
// picture of this literal text, not a re-implementation of it).
function CrispLine({ text, x, y, fontSize, revealed, isTextMovingRef, isHeroVisibleRef, forceVisible }) {
  const meshRef = useRef(null)
  // Set on this line's own first frame (see the identical pattern in
  // AnimatedWordLine/GlassLogoGroup) — a one-time entrance, never reset, so
  // resizing afterward (which does change x/y/fontSize here) doesn't replay
  // it.
  const startRef = useRef(forceVisible ? 0 : null)
  // Set true once troika's own onSync confirms real, laid-out geometry
  // exists — see the onSync prop below. Kept separate from `revealed` (the
  // wall-clock delay owned by the parent): both must hold before this ever
  // shows, so neither a slow layout nor a too-early timer can expose it.
  const syncedRef = useRef(false)
  const { clock } = useThree()

  useFrame(() => {
    if (isHeroVisibleRef && !isHeroVisibleRef.current) return
    const node = meshRef.current
    if (!node) return
    if (!revealed && !forceVisible) {
      // Nothing below has started yet — not even the entrance timer, so it
      // begins counting fresh from the moment `revealed` actually flips,
      // not from whenever this component happened to mount.
      node.visible = false
      if (isTextMovingRef) isTextMovingRef.current.newWayOf = false
      return
    }
    if (forceVisible) {
      node.position.y = y
      node.fillOpacity = TITLE_FILL_OPACITY
      node.visible = syncedRef.current
      if (isTextMovingRef) isTextMovingRef.current.newWayOf = false
      return
    }
    if (startRef.current === null) startRef.current = clock.elapsedTime
    const t = Math.min((clock.elapsedTime - startRef.current) / TITLE_ENTRANCE_DURATION, 1)
    const eased = entranceEase(t)
    node.position.y = y - TITLE_ENTRANCE_RISE_EM * fontSize * (1 - eased)
    node.fillOpacity = eased * TITLE_FILL_OPACITY
    node.visible = syncedRef.current
    // See GlassLogoGroup's isSceneSettledRef — this line's own crisp text
    // feeds its TEXT_SOURCE_LAYER capture, so a recapture is only safe to
    // skip while this is settled too.
    if (isTextMovingRef) isTextMovingRef.current.newWayOf = t < 1
  })

  return (
    <Text
      {...sharedTextProps(fontSize)}
      // Matches useFrame's own t=0 state (lowered, invisible) — not the
      // final resting position/opacity. This mesh mounts with whatever
      // position/fillOpacity are given here for one frame *before*
      // useFrame ever runs (R3F commits the JSX first, then starts calling
      // per-frame callbacks), so leaving these at the final [x,y,Z]/
      // TITLE_FILL_OPACITY meant the line flashed in fully-settled for a
      // single frame while fonts were syncing, vanished, and then began its
      // real entrance from below.
      position={forceVisible ? [x, y, Z] : [x, y - TITLE_ENTRANCE_RISE_EM * fontSize, Z]}
      fontSize={fontSize}
      color="#F8FAFC"
      fillOpacity={forceVisible ? TITLE_FILL_OPACITY : 0}
      // Stays invisible until troika's own async layout (font load +
      // typesetting, which runs on a worker and can take a noticeable
      // beat on a cold load) actually finishes and this onSync fires —
      // rather than trusting fillOpacity={0} alone to hide whatever
      // geometry/material state exists in the meantime. useFrame above
      // keeps updating position/fillOpacity every frame regardless of
      // visibility, so whatever's committed by the time this flips true
      // is already the correct in-progress (or finished) entrance state,
      // never a stray default.
      visible={false}
      raycast={() => null}
      onSync={() => {
        syncedRef.current = true
      }}
      ref={(el) => {
        meshRef.current = el
        if (!el) return
        el.layers.set(OVERLAY_LAYER)
        el.layers.enable(TEXT_SOURCE_LAYER)
      }}
    >
      {text}
    </Text>
  )
}

// Blurred fade-in-from-below, used only for the one line whose word
// actually changes at runtime (see LEARNING_WORDS below).
//
// First attempt used troika's own `outlineBlur` (a per-glyph SDF edge
// feather) to fake the blur — wrong tool: it can only ever soften a glyph's
// own edges, never scramble it past recognition the way a real blur mixes
// neighboring pixels together, so no matter the radius it just read as a
// glow sitting on top of still-fully-legible letters.
// This instead reuses GlassLogoGroup's *actual* two-pass Gaussian blur
// (the exact same capture already driving the hidden-behind-glass text) —
// see blurredTextRef below, populated there — sampled through a small
// screen-space overlay quad sized to this line's own measured bounds
// (onSync's blockBounds) and cross-faded against the crisp glyphs as they
// fade in. Real blur, not a re-implementation of one.
const WORD_SWITCH_DURATION = 0.4
const WORD_SWITCH_RISE_EM = 0.12
// The crisp glyph's fade-in *and* the blur overlay's fade-out share this
// exact duration/curve (see AnimatedWordLine's useFrame) — deliberately
// shorter than, and independent of, WORD_SWITCH_DURATION above (which only
// drives the rise). They used to run on separate timelines (crisp arriving
// fast, blur clearing slowly), which meant the glyphs were already fully
// sharp for most of the blur's own fade — reading as a glow sitting on top
// of legible text, not as the word itself resolving from blurry to sharp.
// Tying them to one shared curve makes them exact complements instead.
const QUICK_FADE_DURATION = 0.15
// The word's *very first* reveal (page load, before any button has ever
// been hovered/selected) reused QUICK_FADE_DURATION/WORD_SWITCH_DURATION
// above at first — reasonable for a snappy switch between two already-
// visible words, but for the one-time first appearance it read as an
// abrupt flash arriving well before "New Way of"'s own slower
// TITLE_ENTRANCE_DURATION fade next to it had barely started. This is that
// same duration instead, so the two lines settle in together rather than
// one outrunning the other.
const INITIAL_REVEAL_DURATION = TITLE_ENTRANCE_DURATION
// How present the blurred stage reads at its peak — needs to be high
// enough to read clearly against the crisp glyph fading in underneath it.
const WORD_SWITCH_BLUR_OPACITY = 0.92
// Margin beyond the text's own measured ink bounds, so the overlay quad's
// hard rectangular edge sits safely outside the blur's own visible spread
// instead of clipping it.
const WORD_SWITCH_OVERLAY_PADDING = 1.4

// Zero velocity at *both* ends (unlike easeOutCubic, which starts at full
// speed) — reads as a smooth, gradual motion rather than a snap that then
// decelerates. Used for both the rise and the blur/fade crossfade below so
// the whole transition eases together rather than each piece moving with
// its own different feel.
function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

// The one-time first-load entrance (see entranceEase below, and
// TITLE_ENTRANCE_DURATION/INITIAL_REVEAL_DURATION) uses this instead of
// smoothstep, deliberately for the opposite reason smoothstep was chosen
// above: smoothstep's zero velocity at t=0 means the first ~10-15% of the
// duration is barely perceptible motion at all — fine for a word-switch,
// where something was already visible and moving a beat late reads as
// smooth, not stuck. For a first appearance there's nothing else on screen
// setting that expectation, so that same flat start instead reads as the
// title sitting motionless for a beat before "the animation" visibly
// begins — exactly the stuck-then-go effect this avoids by starting at
// full speed and only decelerating into place.
function entranceEase(t) {
  const inv = 1 - t
  return 1 - inv * inv * inv
}

// Same screen-space sampling trick as GlassLogoGroup's useTextRevealMaterial
// (gl_FragCoord/resolution, not this mesh's own UV) — this quad's geometry
// only decides *where on screen* the window sits; what shows through it is
// whatever the shared blurred capture has at that same screen position.
function useWordBlurOverlayMaterial() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          textSource: { value: null },
          resolution: { value: new Vector2(1, 1) },
          opacity: { value: 0 },
        },
        vertexShader: `
          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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

// Renders its own dedicated TEXT_SOURCE_LAYER copy (see the second <Text>
// below) rather than sharing CrispLine's "both layers, one mesh" contract —
// deliberately *not* the same rendering contract, despite looking similar
// at a glance. See that copy's own comment for why.
function AnimatedWordLine({ text, x, y, fontSize, blurredTextRef, maxTopY, revealed, isTextMovingRef, isHeroVisibleRef, forceVisible }) {
  const meshRef = useRef(null)
  const sourceMeshRef = useRef(null)
  const overlayMeshRef = useRef(null)
  // Set true once each Text's own onSync confirms real, laid-out geometry
  // exists — see CrispLine's identical pattern. Independent of `revealed`
  // (the parent's wall-clock delay): both must hold before the *initial*
  // reveal shows anything.
  const syncedRef = useRef(false)
  const sourceSyncedRef = useRef(false)
  // Fallback before the first onSync — replaced immediately once troika
  // measures the actual glyphs.
  const boundsRef = useRef({ minX: 0, minY: -0.5, maxX: 1, maxY: 0.5 })
  const prevTextRef = useRef(text)
  // null (not 0) — see the lazy-init in useFrame below, which is what
  // actually makes the *first* reveal animate too, not just later word
  // switches. Left at 0, elapsed would already be large by the time this
  // first renders (clock starts counting at scene creation, not this
  // line's own mount), so t/fadeT would both already read as "finished" on
  // the very first frame — the word would just appear instantly instead of
  // playing the same fade+rise every later switch gets.
  const startRef = useRef(forceVisible ? 0 : null)
  // True until the first *real* switch (a button hover/select actually
  // changing the word) — see the effect below. While true, the durations
  // used are INITIAL_REVEAL_DURATION for both rise and fade instead of the
  // much quicker WORD_SWITCH_DURATION/QUICK_FADE_DURATION, so the one-time
  // first appearance settles in at the same unhurried pace as "New Way of"
  // right above it, rather than the snappy timing tuned for switching
  // between two already-visible words.
  const isInitialRevealRef = useRef(!forceVisible)
  const { clock } = useThree()
  const overlayMaterial = useWordBlurOverlayMaterial()

  useEffect(() => {
    if (prevTextRef.current !== text) {
      prevTextRef.current = text
      startRef.current = clock.elapsedTime
      isInitialRevealRef.current = false
    }
  }, [text, clock])

  useFrame((state) => {
    if (isHeroVisibleRef && !isHeroVisibleRef.current) return
    const node = meshRef.current
    if (!node) return
    const isInitial = isInitialRevealRef.current
    if (forceVisible) {
      isInitialRevealRef.current = false
      node.position.y = y
      if (sourceMeshRef.current) sourceMeshRef.current.position.y = y
      node.fillOpacity = TITLE_FILL_OPACITY
      node.visible = syncedRef.current
      if (sourceMeshRef.current) sourceMeshRef.current.visible = sourceSyncedRef.current
      if (overlayMeshRef.current) overlayMaterial.uniforms.opacity.value = 0
      if (isTextMovingRef) isTextMovingRef.current.learning = false
      return
    }
    if (isInitial && !revealed && !forceVisible) {
      // Held entirely, same as CrispLine's identical gate — nothing here
      // has started counting yet, including the entrance timer itself, so
      // it begins fresh once `revealed` actually flips. A real word switch
      // (isInitial flips false via the effect above) bypasses this
      // immediately regardless of the delay — that's user-driven, already
      // mid-interaction, and was never the "stuck on load" complaint.
      node.visible = false
      if (sourceMeshRef.current) sourceMeshRef.current.visible = false
      if (overlayMeshRef.current) overlayMaterial.uniforms.opacity.value = 0
      if (isTextMovingRef) isTextMovingRef.current.learning = false
      return
    }
    if (startRef.current === null) startRef.current = clock.elapsedTime
    const elapsed = clock.elapsedTime - startRef.current
    const riseDuration = isInitial ? INITIAL_REVEAL_DURATION : WORD_SWITCH_DURATION
    const fadeDuration = isInitial ? INITIAL_REVEAL_DURATION : QUICK_FADE_DURATION
    const t = Math.min(elapsed / riseDuration, 1)
    // Purely motion, shared by the crisp text and the overlay so they stay
    // glued together as they move. entranceEase (not smoothstep) for the
    // one-time initial reveal — see its own comment for why a flat,
    // zero-velocity start reads as "stuck" there in a way it doesn't for a
    // word-switch, where something was already visible and moving.
    const riseEased = isInitial ? entranceEase(t) : smoothstep(t)
    const offsetY = -WORD_SWITCH_RISE_EM * fontSize * (1 - riseEased)
    node.position.y = y + offsetY
    // Same rise, so the glimpsed-through-glass copy moves in lockstep with
    // the on-screen word instead of sitting frozen at its resting position
    // — position is fine to animate here (glass shows wherever this mesh's
    // real geometry currently is, same as CrispLine); it's specifically
    // *opacity* that must stay constant on this copy — see its own fillOpacity
    // prop below and the comment on that second <Text>.
    if (sourceMeshRef.current) sourceMeshRef.current.position.y = y + offsetY

    // Crisp-in and blur-out below both read off this one curve, so they're
    // always exact complements (see fadeDuration above) — kept short and
    // independent of riseDuration, which only drives the rise above.
    const fadeT = Math.min(elapsed / fadeDuration, 1)
    const crossfade = isInitial ? entranceEase(fadeT) : smoothstep(fadeT)
    node.fillOpacity = crossfade * TITLE_FILL_OPACITY
    node.visible = syncedRef.current
    if (sourceMeshRef.current) sourceMeshRef.current.visible = sourceSyncedRef.current
    // See GlassLogoGroup's isSceneSettledRef — this word's crisp source
    // copy (sourceMeshRef, above) feeds its TEXT_SOURCE_LAYER capture the
    // same way CrispLine's does, so a recapture is only safe to skip while
    // both the rise and the fade/crossfade have actually finished, not just
    // whichever of the two is shorter.
    if (isTextMovingRef) isTextMovingRef.current.learning = t < 1 || fadeT < 1

    const overlay = overlayMeshRef.current
    if (overlay) {
      const b = boundsRef.current
      const width = Math.max(b.maxX - b.minX, 0.001) * WORD_SWITCH_OVERLAY_PADDING
      const rawHeight = Math.max(b.maxY - b.minY, 0.001) * WORD_SWITCH_OVERLAY_PADDING
      // Tracks the same rise offset as the crisp text so the blur window
      // stays glued over the moving glyph.
      const centerY = y + offsetY + (b.minY + b.maxY) / 2
      let top = centerY + rawHeight / 2
      const bottom = centerY - rawHeight / 2
      // Hard ceiling: this quad must never rise past the gap into "New Way
      // of"'s own line. troika's measured bounds are the line's full
      // font-metrics box (ascent/descent), not just this word's actual ink,
      // so WORD_SWITCH_OVERLAY_PADDING applied to that full box reaches
      // much further up than the padding's own purpose (containing the
      // blur's soft spread around the real glyphs) needs — far enough to
      // sample "New Way of"'s own blurred pixels too. Since this quad is
      // brightest at t=0 (see the opacity calc below), that read as a glow
      // with no obvious source right when each switch began.
      top = Math.min(top, maxTopY)
      const height = Math.max(top - bottom, 0.001)
      overlay.scale.set(width, height, 1)
      overlay.position.set(x + (b.minX + b.maxX) / 2, (top + bottom) / 2, Z + 0.001)
      const dpr = state.viewport.dpr
      // GlassLogoGroup only starts populating blurredTextRef once it has
      // rendered its own first capture pass — on a cold load that's a beat
      // after this line mounts. Before that, textSource is still null, and
      // sampling an unbound sampler is undefined per-GPU behavior (some
      // return opaque black) rather than reliably transparent. Since this
      // quad is *brightest* right at t=0 (opacity peaks when crossfade is
      // still 0) and sits at the entrance's low starting position, an
      // unguarded sample there was exactly what could read as "the title"
      // flashing low and solid before the real intro took over. Forcing
      // opacity to 0 until there's an actual texture to show removes that
      // window entirely — nothing renders through this quad until there's
      // something real to render.
      const hasBlurSource = !!blurredTextRef?.current
      overlayMaterial.uniforms.opacity.value = hasBlurSource ? (1 - crossfade) * WORD_SWITCH_BLUR_OPACITY : 0
      overlayMaterial.uniforms.textSource.value = blurredTextRef?.current ?? null
      overlayMaterial.uniforms.resolution.value.set(state.size.width * dpr, state.size.height * dpr)
    }
  })

  return (
    <>
      <Text
        {...sharedTextProps(fontSize)}
        // Matches useFrame's own t=0 state (lowered, invisible), not the
        // final resting position/opacity — see CrispLine's identical fix
        // for why: this mesh mounts with whatever's given here for one
        // frame before useFrame first runs, so leaving these at the final
        // values meant the word flashed in fully-settled, then jumped down
        // to its real starting point right as useFrame took over.
        position={forceVisible ? [x, y, Z] : [x, y - WORD_SWITCH_RISE_EM * fontSize, Z]}
        fontSize={fontSize}
        color="#F8FAFC"
        fillOpacity={forceVisible ? TITLE_FILL_OPACITY : 0}
        // See CrispLine's identical visible={false}/onSync pattern — stays
        // hidden until troika's own async layout finishes, so there's never
        // a stray-geometry/stray-opacity frame to catch on a cold load.
        visible={false}
        raycast={() => null}
        onSync={(troikaMesh) => {
          syncedRef.current = true
          const info = troikaMesh.textRenderInfo
          if (info?.blockBounds) {
            const [minX, minY, maxX, maxY] = info.blockBounds
            boundsRef.current = { minX, minY, maxX, maxY }
          }
        }}
        ref={(el) => {
          meshRef.current = el
          if (!el) return
          // OVERLAY_LAYER only now — see the dedicated TEXT_SOURCE_LAYER
          // copy just below for why this animated mesh no longer also
          // feeds GlassLogoGroup's capture the way it used to.
          el.layers.set(OVERLAY_LAYER)
          // Explicit, rather than relying on the ~0.001-unit Z gap between
          // this and the overlay quad to sort correctly on its own — that
          // gap is tiny enough relative to this mesh's actual camera
          // distance (~9 units) that its projected depth wasn't reliably
          // resolving the two in the right order every frame, so the
          // overlay would occasionally draw *before* this text instead of
          // after it — undoing the mask and leaving the crisp glyphs fully
          // legible right from the start of the transition.
          el.renderOrder = 0
        }}
      >
        {text}
      </Text>

      {/* A second, separate copy purely for GlassLogoGroup's
          TEXT_SOURCE_LAYER capture (see blurredTextRef) — deliberately
          *not* the animated mesh above, though it shares that mesh's rise
          (see sourceMeshRef.current.position.y above) so the glimpsed-
          through-glass word moves in the same lockstep it always did rather
          than sitting frozen at its resting spot.
          What it does *not* share is fillOpacity — that stays the constant
          TITLE_FILL_OPACITY below, never touched per-frame. Sharing the
          animated mesh's fillOpacity too (the original, one-mesh approach)
          fed every word switch's 0-to-full opacity ramp into this same
          capture, which GlassLogoGroup then blurs and re-displays through
          the glass — so each switch produced a real brightness flash
          sweeping across the glass, on top of (and independent from) the
          on-screen crossfade above. "New Way of" sits close enough to the
          glass's own silhouette that this flash was clearly visible right
          around it, reading as a stray glow with no obvious source. Motion
          without an opacity ramp avoids that: only the letter shapes and
          position change on a switch, never the captured brightness. */}
      <Text
        {...sharedTextProps(fontSize)}
        // Position only (not fillOpacity, which is deliberately constant —
        // see the comment above) matches useFrame's own t=0 state, same
        // reason as the two Text elements above: avoids a one-frame jump
        // from the resting position down to the real starting one.
        position={forceVisible ? [x, y, Z] : [x, y - WORD_SWITCH_RISE_EM * fontSize, Z]}
        fontSize={fontSize}
        color="#F8FAFC"
        fillOpacity={TITLE_FILL_OPACITY}
        // Same reasoning as the two visible={false}/onSync uses above —
        // this copy feeds GlassLogoGroup's own capture, so a stray synced
        // frame here would show up as a flash glimpsed through the glass
        // rather than directly, but it's the same underlying race either way.
        visible={false}
        raycast={() => null}
        onSync={() => {
          sourceSyncedRef.current = true
        }}
        ref={(el) => {
          sourceMeshRef.current = el
          if (!el) return
          el.layers.set(TEXT_SOURCE_LAYER)
        }}
      >
        {text}
      </Text>
      <mesh
        material={overlayMaterial}
        raycast={() => null}
        ref={(el) => {
          overlayMeshRef.current = el
          if (!el) return
          el.layers.set(OVERLAY_LAYER)
          // Guarantees this draws after (and therefore on top of) the
          // crisp text above, regardless of depth-sort precision — see the
          // comment on the text's own ref above.
          el.renderOrder = 1
        }}
      >
        <planeGeometry args={[1, 1]} />
      </mesh>
    </>
  )
}

// A scratch canvas is still needed for two *positioning* measurements
// (where the margin sits relative to the screen edge) — unrelated to the
// crisp/blurred-through-glass rendering itself, which no longer involves
// Canvas 2D at all (see GlassLogoGroup's useTextRevealMaterial for why that
// was dropped: two independent text-shaping engines never quite agreed).
const CANVAS_FONT_FAMILY = 'XxentaHeroMetricsFont'
let canvasFontPromise = null
function loadCanvasFont() {
  if (!canvasFontPromise) {
    const face = new FontFace(CANVAS_FONT_FAMILY, `url(${fontUrl})`, { weight: '400' })
    canvasFontPromise = face.load().then((loaded) => {
      document.fonts.add(loaded)
      return loaded
    })
  }
  return canvasFontPromise
}

function useCanvasFontReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    loadCanvasFont().then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return ready
}

// Reference size for the scratch-canvas metric measurements below —
// arbitrary (results are read back as ratios, not absolute pixels), just
// needs to be large enough for measureText's sub-pixel rounding to stay
// negligible.
const METRICS_PX_FONT_SIZE = 640

// troika's anchorX: 'left' (see its source: anchorXOffset is 0 for 'left')
// aligns the *pen* position of the first glyph to x, not its ink. Left-side
// bearing (the gap between pen and ink) varies per starting letter, so "New
// Way of" and "Learning" sharing one x wouldn't put their ink at the same
// spot without this — N's bearing isn't L's.
let scratchCtx = null
function useLeftBearingCorrection(text, fontSize, ready) {
  return useMemo(() => {
    if (!ready || !text || !text[0]) return 0
    scratchCtx ??= document.createElement('canvas').getContext('2d')
    scratchCtx.font = `400 ${METRICS_PX_FONT_SIZE}px ${CANVAS_FONT_FAMILY}`
    scratchCtx.textAlign = 'left'
    // Per spec, positive means the ink sits *left* of the pen position;
    // typical left-aligned glyphs have their ink to the *right* of the pen
    // instead (the normal, positive left-side-bearing case), which this
    // reports as negative — i.e. exactly "how far left of the target the
    // pen needs to sit so the ink, arriving `bearing` further right, lands
    // on target." Added directly to the desired ink x, not negated.
    const bearingPx = scratchCtx.measureText(text[0]).actualBoundingBoxLeft
    return bearingPx * (fontSize / METRICS_PX_FONT_SIZE)
  }, [text, fontSize, ready])
}

// With anchorY: 'middle', a line's y is its font-box *center*, not its
// bottom — so a bottom margin measured from y alone was actually only
// reaching halfway down the glyphs, leaving the real visible bottom edge
// to hang past it, and needs this added back on top of the margin.
// Specifically measures 'g' (every current word — Learning/Managing/
// Growing — ends in one) rather than the font's generic descent metric:
// a font's nominal descent line usually has some built-in headroom below
// where any actual glyph's ink ends, so using it directly overstated the
// gap to the *real* visible bottom edge — the same class of pen-vs-ink
// mismatch useLeftBearingCorrection corrects for on the left.
// actualBoundingBoxDescent is 'g's real ink extent below the baseline;
// fontBoundingBoxAscent/Descent are font-level (same for any character) —
// together these place the true ink-bottom relative to the font-box
// center (see anchorY comment above) that troika's 'middle' anchors to.
function useBottomInkCorrection(text, fontSize, ready) {
  return useMemo(() => {
    if (!ready || !text) return 0
    scratchCtx ??= document.createElement('canvas').getContext('2d')
    scratchCtx.font = `400 ${METRICS_PX_FONT_SIZE}px ${CANVAS_FONT_FAMILY}`
    const metrics = scratchCtx.measureText(text)
    const distancePx = metrics.actualBoundingBoxDescent + (metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) / 2
    return distancePx * (fontSize / METRICS_PX_FONT_SIZE)
  }, [text, fontSize, ready])
}

// "Learning" is the focal word — bigger than "New Way of," which sits just
// above it, smaller and secondary.
const LEARNING_FONT_FRACTION = 0.34
const NEW_WAY_OF_FONT_FRACTION = 0.09

// Both fractions above scale off viewport *height* only — fine at a wide
// desktop aspect ratio, but on a narrow/portrait phone screen the available
// *width* shrinks much faster than the height does, so the same
// height-relative font size starts overflowing it. FOV can't fix this (world
// width is always height × pixel-aspect-ratio, whatever the FOV), so this
// scales the fractions themselves down on narrower breakpoints instead. A
// first-pass estimate — tune live against real device widths.
const FONT_FRACTION_SCALE_BY_BREAKPOINT = { mobile: 0.62, tablet: 0.82, desktop: 1 }

// Swaps in place of "Learning" to match whichever grid button (see
// BackgroundGrid's BUTTON_LABELS, same order/index: Education/Enterprises/
// Achievers) is currently hovered or selected — index 0 ("AI for
// Education") is the default, so "Learning" is what shows with nothing
// hovered.
const LEARNING_WORDS = ['Learning', 'Managing', 'Growing']

function useHeroTitleLines(activeIndex) {
  const { width, height } = useViewportAt(Z)
  const fontReady = useCanvasFontReady()
  const { t } = useLanguage()
  const learningWords = t('hero.learningWords') || LEARNING_WORDS
  const newWaysOfText = t('hero.newWaysOf') || 'New Ways of'

  const safeIndex =
    activeIndex != null && activeIndex >= 0 && activeIndex < learningWords.length
      ? activeIndex
      : 0
  const learningWord = learningWords[safeIndex]
  const breakpoint = useBreakpoint()
  const fontFractionScale = FONT_FRACTION_SCALE_BY_BREAKPOINT[breakpoint] ?? 1

  const targetLearningFontSize = height * LEARNING_FONT_FRACTION * fontFractionScale
  const maxWordWidthUnits = width * (breakpoint === 'mobile' ? 0.85 : breakpoint === 'tablet' ? 0.88 : 0.92)
  const approxWordAspect = 4.3
  const maxLearningSizeByWidth = maxWordWidthUnits / approxWordAspect
  const learningFontSize = Math.min(targetLearningFontSize, maxLearningSizeByWidth)
  const effectiveScale = targetLearningFontSize > 0 ? learningFontSize / targetLearningFontSize : 1
  const newWayOfFontSize = height * NEW_WAY_OF_FONT_FRACTION * fontFractionScale * effectiveScale
  // Margins scale off this fixed reference, not learningFontSize — see
  // MARGIN_REFERENCE_FONT_FRACTION.
  const marginFontSize = Math.min(height * MARGIN_REFERENCE_FONT_FRACTION, width * 0.12)
  const leftX = -width / 2 + LEFT_MARGIN_EM * marginFontSize
  // BOTTOM_MARGIN_EM is the gap below the active word's actual ink-bottom; y itself is
  // the font-box center (anchorY: 'middle'), so that real ink-to-center
  // distance has to be added back on top of the margin — see
  // useBottomInkCorrection. That correction uses the real learningFontSize
  // (it's tied to the actual glyphs' physical size), even though the
  // margin itself doesn't. Mirrors useLeftBearingCorrection below: same
  // LEFT_MARGIN_EM/BOTTOM_MARGIN_EM value, same marginFontSize reference,
  // so ink-left-edge and ink-bottom-edge end up exactly the
  // same distance from their respective screen edges.
  const learningY = -height / 2 + BOTTOM_MARGIN_EM * marginFontSize + useBottomInkCorrection(learningWord, learningFontSize, fontReady)
  // Stacked above the focal word — a fraction of their combined line-height as
  // clearance between the two baselines.
  const newWayOfY = learningY + (learningFontSize + newWayOfFontSize) * 0.48

  // Bearing is per-word (its own first letter's ink-to-pen gap), so this is
  // re-measured against whichever word is currently showing.
  const learningX = leftX + useLeftBearingCorrection(learningWord, learningFontSize, fontReady)
  const newWayOfX = leftX + useLeftBearingCorrection(newWaysOfText, newWayOfFontSize, fontReady)

  return [
    { id: 'newWayOf', text: newWaysOfText, x: newWayOfX, y: newWayOfY, fontSize: newWayOfFontSize },
    { id: 'learning', text: learningWord, x: learningX, y: learningY, fontSize: learningFontSize },
  ]
}

export function HeroTitle({ targetSize, highQuality, activeIndex, isHeroVisibleRef, forceVisible }) {
  const lines = useHeroTitleLines(activeIndex)
  const { height } = useViewportAt(Z)
  const canvasSize = useThree((state) => state.size)
  // Carries both title lines (and everything each one owns — the animated
  // word's own source/overlay meshes included) so the scroll parallax below
  // moves them as one unit, additive on top of each line's own already-
  // absolute x/y — see TITLE_PARALLAX_STRENGTH.
  const titleGroupRef = useRef(null)
  // Filled in every frame by GlassLogoGroup with its already-blurred text
  // capture — a plain ref (not state) since it's a per-frame texture
  // handoff, not something that should ever trigger a re-render.
  const blurredTextRef = useRef(null)
  // Written by this title-group's own parallax useFrame ('title') and by
  // CrispLine/AnimatedWordLine's own entrance/word-switch animations
  // ('newWayOf'/'learning') — each owns exactly one key, so there's never a
  // race where one writer's `false` stomps another's `true` from the same
  // frame. Read by GlassLogoGroup (threaded down as a prop, same handoff
  // pattern as blurredTextRef) to decide whether its own capture+blur pass
  // is safe to skip this frame — see isSceneSettledRef there.
  const isTextMovingRef = useRef({ title: false, newWayOf: false, learning: false })
  // A flat, real setTimeout — deliberately not tied to rAF/troika/GPU
  // readiness at all (see TITLE_REVEAL_DELAY_MS) — guarantees the title is
  // withheld for a solid beat on every load before its entrance starts,
  // regardless of how long font loading/layout/first-paint actually takes
  // on a given machine.
  const [revealed, setRevealed] = useState(forceVisible || false)
  useEffect(() => {
    if (forceVisible) return
    const timer = setTimeout(() => setRevealed(true), TITLE_REVEAL_DELAY_MS)
    return () => clearTimeout(timer)
  }, [forceVisible])
  // Midpoint between the two lines' own Y positions — see AnimatedWordLine's
  // maxTopY, the hard ceiling that keeps its word-switch blur overlay from
  // ever reaching up into "New Way of"'s own line.
  const newWayOfLine = lines.find((line) => line.id === 'newWayOf')
  const learningLine = lines.find((line) => line.id === 'learning')
  const maxTopY = (newWayOfLine.y + learningLine.y) / 2

  // Scroll-driven parallax — see TITLE_PARALLAX_STRENGTH. A separate
  // useFrame from GlassLogoGroup's own (different component, different
  // ref), so the two run independently even though they share the same
  // scroll-progress shape.
  useFrame((_, delta) => {
    if (isHeroVisibleRef && !isHeroVisibleRef.current) return
    const group = titleGroupRef.current
    if (!group) return

    const progress = MathUtils.clamp(window.scrollY / canvasSize.height, 0, 1)
    const desiredY = progress * TITLE_PARALLAX_STRENGTH * height

    group.position.y = MathUtils.damp(group.position.y, desiredY, TITLE_PARALLAX_LAMBDA, delta)
    // See isTextMovingRef above/GlassLogoGroup's isSceneSettledRef.
    isTextMovingRef.current.title = Math.abs(group.position.y - desiredY) > TITLE_POSITION_SETTLE_EPSILON
  })

  return (
    <>
      <group ref={titleGroupRef}>
        {lines.map((line) =>
          line.id === 'learning' ? (
            <AnimatedWordLine
              key={line.id}
              text={line.text}
              x={line.x}
              y={line.y}
              fontSize={line.fontSize}
              blurredTextRef={blurredTextRef}
              maxTopY={maxTopY}
              revealed={revealed}
              isTextMovingRef={isTextMovingRef}
              isHeroVisibleRef={isHeroVisibleRef}
              forceVisible={forceVisible}
            />
          ) : (
            <CrispLine
              key={line.id}
              text={line.text}
              x={line.x}
              y={line.y}
              fontSize={line.fontSize}
              revealed={revealed}
              isTextMovingRef={isTextMovingRef}
              isHeroVisibleRef={isHeroVisibleRef}
              forceVisible={forceVisible}
            />
          ),
        )}
      </group>
      <GlassLogoGroup
        targetSize={targetSize}
        highQuality={highQuality}
        blurredTextRef={blurredTextRef}
        isTextMovingRef={isTextMovingRef}
        isHeroVisibleRef={isHeroVisibleRef}
      />
    </>
  )
}
