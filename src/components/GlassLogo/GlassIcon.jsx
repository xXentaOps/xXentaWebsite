import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'
import { OVERLAY_LAYER } from './GlassLogoGroup'
import { glassMaterialProps, useGlowOverlayMaterial } from './glassMaterial'
import { TransmissionMaterial } from './TransmissionMaterial'
import { useExtrudedSvgGeometry } from './useExtrudedSvgGeometry'

// A small extruded-SVG glass accent (currently: the graduation cap beside
// Jeroen Krouwels's name in the Meet the Team detail view) — the exact same
// glass as GlassCircle and GoogleCloudPartnerBadge: TransmissionMaterial +
// glassMaterialProps + the two-tier glow split + the shared cursor tilt,
// just extruding an SVG's own shapes instead of a circle or a plaque.
//
// MUST be mounted in AboutUsSection's *main* (bottom) canvas, alongside
// those two — not the Google Cloud team-photo badge's separate overlay
// canvas. That is the whole ballgame for this component, and it cost
// several wrong turns to find: TransmissionMaterial refracts whatever a
// plain full-scene render of the *default* layer contains. In the main
// canvas that's the real grid and blob (see SeamlessGridBackdrop), so the
// glass shows grid lines through it with no extra rig at all — exactly how
// GlassCircle and GoogleCloudPartnerBadge get theirs, and how the hero
// logo gets its own. The overlay canvas is `alpha: true` and essentially
// empty on the default layer: everything the team-photo badge refracts
// there lives on CAPTURE_LAYER instead, visible only inside
// CaptureLayerGate's own brief per-frame window (see PhotoBackdropCapture).
// Mounted there, this icon captured nothing and rendered flat opaque with
// nothing visible behind it. Two TransmissionMaterial objects in one canvas
// is NOT the problem — GlassCircle and GoogleCloudPartnerBadge have both
// been doing exactly that in the main canvas all along.
const HERO_LOGO_VIEWBOX_SIZE = 407

// depthScale: how much deeper this is than the depth GlassCircle/the plaque
// use at their own shared ratio (5/407 of the shape's own size) — a prop,
// not a fixed constant, because how much amplification a shape needs to
// read as having *any* depth turned out to depend entirely on the shape
// itself, not on this being "an icon" generically. The graduation cap is
// thin arms (a diamond outline, a band, a tassel) with a lot of empty space
// between them — at the shared ratio alone that read as flat ("no depth
// wall, very 2D looking"), so it needed real amplification (depthScale 4,
// set where it's used in AboutUsSection/teamData.js). A solid, densely
// filled shape like a rounded rectangle has vastly more surface area
// showing off whatever depth it's given, so that same depthScale 4 read as
// "everyone's icon except the cap looks super thick" — confirmed directly.
// Defaulting to 1 here (the untouched shared ratio, the same one
// GlassCircle/the plaque already use and read correctly at) is what makes
// "the cap's thickness, which is like nothing" the actual default for every
// icon; the cap is the one exception overriding it upward, not the other
// way around.
// bevelEnabled: default true, matching GlassCircle/the plaque — a per-icon
// escape hatch for a source shape where the bevel itself is the problem,
// not its size. A bevel is an inward offset of the shape's own outline;
// where two edges of a *thin* feature (a narrow connecting line between two
// wider shapes, say) are already close together, that offset can cross
// itself before it reaches the requested bevelSize, producing degenerate,
// self-intersecting geometry right at the thin spot — reads as z-fighting/
// flicker, not as "a shape with a big bevel". Graph.svg (Ardie's icon,
// three circles linked by thin diagonal lines) is exactly that shape, and
// disabling the bevel there (still extruded, still real depth, just
// straight walls instead of a beveled edge) is what actually addresses the
// glitch — shrinking depthScale/sizeScale first, tried before this, didn't:
// the bevel's own inset math doesn't care how deep the extrusion is, only
// how thin the shape it's insetting into is.
function extrudeSettingsFor(viewBoxSize, depthScale, bevelEnabled = true) {
  const ratio = viewBoxSize / HERO_LOGO_VIEWBOX_SIZE
  return {
    depth: 5 * ratio * depthScale,
    bevelEnabled,
    // sqrt, not depthScale itself — a bevel scaling 1:1 with an amplified
    // depth would itself become oversized (a bevel as deep as the
    // extrusion swallows the flat front face entirely), but it still has
    // to reduce to exactly GlassCircle's own bevelThickness (0.6 * ratio,
    // no extra factor) when depthScale is 1, or the *default* case — every
    // icon except one with an explicit override — would already disagree
    // with GlassCircle before any amplification even entered into it. sqrt
    // is the simplest curve that satisfies both: 1 at depthScale 1, and
    // (not coincidentally) the same 2x this formula's own previous
    // depthScale/2 version gave at depthScale 4, so the cap's already-
    // approved look is unchanged.
    bevelThickness: 0.6 * ratio * Math.sqrt(depthScale),
    bevelSize: 0.6 * ratio * Math.sqrt(depthScale),
    bevelSegments: 4,
    curveSegments: 16,
  }
}

// Per-instance overrides on top of the shared glassMaterialProps — NOT
// edits to that shared object, which the hero logo and every other glass
// piece read from and which is explicitly not to be disturbed.
//
// The shared values are tuned for large glass over rich content; on a small
// icon they read as near-opaque, because two things dominate at this size:
// envMapIntensity 4.5 paints a bright reflected wash over the whole face,
// and transmission 0.75 only lets three quarters of the backdrop through
// underneath it. Together the grid behind essentially disappeared —
// reported as the cap still looking opaque. Full transmission plus a much
// calmer environment lets the grid lines actually come through, and a
// slightly stronger chromatic aberration adds the colour-fringing at the
// edges that reads as "this is refracting something".
const GLASS_OVERRIDES = {
  transmission: 1,
  envMapIntensity: 1.2,
  chromaticAberration: 0.035,
}

// Same two-tier glow split as GlassCircle/GoogleCloudPartnerBadge — a
// bright copy on OVERLAY_LAYER (kept out of TransmissionMaterial's own
// backdrop capture) plus a dim bleed-through copy on the default layer.
// This is what actually supplies the blue: plain TransmissionMaterial on
// its own reads closer to clear/gray (see GoogleCloudPartnerBadge's note).
// Lower than the 0.55 its siblings use. This overlay is additively blended
// over the glass, so on a small shape it stacks into an opaque blue film
// over exactly the area the backdrop needs to show through — the other half
// of why the grid wasn't reading. Enough left to still supply the blue
// (plain TransmissionMaterial reads clear/gray without it).
const GLOW_INTENSITY = 0.32
const BLEED_GLOW_INTENSITY = 0.08

// A mild nudge past the shared BASE_TILT its siblings use ({x:-0.12,
// y:0.1}) — enough to catch a bit of the now-deeper side wall at rest
// without reading as visibly tilted the way a much larger offset did
// (reported directly as "an insane angle"). MAX_TILT (the cursor-follow
// range) stays the shared 5° so the *motion* still matches every other
// glass object on the page.
const MAX_TILT = MathUtils.degToRad(5)
const BASE_TILT = { x: -0.14, y: 0.16 }
const TILT_LAMBDA = 4

// A short delay before this grows in, so it doesn't pop into place before
// the name panel it hangs off has visually arrived (that panel fades in
// over ~0.25s — see TILE_FADE_TRANSITION in MeetTheTeamGrid). Plain
// elapsed-time-since-mount, the same technique PhotoBackdropCapture's own
// crossfade uses, rather than new timer machinery.
const REVEAL_DELAY_MS = 250

// Same MathUtils.damp exponential ease the cursor tilt above uses (real
// velocity from the current value toward the target, continuously slowing,
// never overshooting) rather than a fixed-duration lerp — quiet and
// understated on purpose (asked for explicitly: "minimalistic, chic,
// elegant... very subtle" — an earlier bouncy spring-with-overshoot-and-spin
// pass was the opposite of that). Higher lambda than the tilt's own 4 since
// this only has to happen once, quickly, not track a moving target.
const REVEAL_LAMBDA = 10

// Window-level pointer tracking: DOM elements (detail backdrop, member cards,
// text) sit above Canvas 1 and consume mouse events, preventing R3F's canvas
// element from receiving pointermove. Tracking pointermove at the window level
// ensures both the decorative grid squares and the profile name icons smoothly
// follow the cursor everywhere on screen.
const windowPointer = { x: 0, y: 0 }
let hasWindowPointer = false

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointermove',
    (e) => {
      windowPointer.x = (e.clientX / window.innerWidth) * 2 - 1
      windowPointer.y = -(e.clientY / window.innerHeight) * 2 + 1
      hasWindowPointer = true
    },
    { passive: true }
  )
}

// domRect is a CSS px rect relative to this canvas — same contract, and the
// same px-to-world conversion, GlassCircle/GoogleCloudPartnerBadge use.
// depthScale/sizeScale/bevelEnabled are per-icon overrides (see
// extrudeSettingsFor's own comments) — all default to matching GlassCircle/
// the plaque exactly; teamData.js's nameIcon entries are the only place any
// of them should ever be set away from that default.
export function GlassIcon({
  svgUrl,
  viewBoxSize,
  domRect,
  isOpen,
  highQuality,
  depthScale = 1,
  sizeScale = 1,
  bevelEnabled = true,
  // Per-instance override of BASE_TILT — the name icons all want that
  // shared resting angle, but the decorative grid squares were asked to
  // face the camera dead-on by default, only tilting away from it on
  // cursor movement (not resting pre-tilted the way a name icon does).
  baseTilt = BASE_TILT,
  // Per-instance override of GLASS_OVERRIDES — see that constant's own
  // comment for why the name icons need it (a small shape reads near-opaque
  // at the shared glassMaterialProps' envMapIntensity/transmission). The
  // decorative grid squares are full-cell sized, much closer to GlassCircle's
  // own scale, and at GLASS_OVERRIDES' dimmed envMapIntensity (1.2 vs the
  // shared 4.5) they read visibly darker than GlassCircle/the hero logo/the
  // Google Cloud badge — reported directly. Passing {} gets them the exact
  // same brightness as those, unmodified.
  glassOverrides = GLASS_OVERRIDES,
  // Same story as glassOverrides above: GlassCircle/GoogleCloudPartnerBadge
  // use 0.55/0.15 for their own two-tier glow (see either's own comment) —
  // GLOW_INTENSITY/BLEED_GLOW_INTENSITY below are dimmed from that
  // specifically for small icons (a stronger glow reads as a solid film at
  // that size). The decorative squares want the un-dimmed siblings' values.
  glowIntensity = GLOW_INTENSITY,
  bleedGlowIntensity = BLEED_GLOW_INTENSITY,
  // Hides the group without unmounting it — for the decorative grid squares,
  // which need to disappear in the Meet the Team detail view but must stay
  // mounted the whole time (see AboutUsSection's own comment on why
  // mounting/unmounting this at all replays the mount-time reveal below).
  // A plain group.visible toggle, not another animated scale-out: revisiting
  // the reveal machinery for this would reintroduce exactly the repeated
  // pop-in this is meant to avoid — mountedAtRef/revealScaleRef are never
  // touched here, so flipping back to true just shows it already fully
  // grown in, instantly, with nothing to replay.
  visible = true,
  isWarming = false,
}) {
  const groupRef = useRef(null)
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)
  const pointer = useThree((state) => state.pointer)

  const extrudeSettings = extrudeSettingsFor(viewBoxSize, depthScale, bevelEnabled)
  const { mergedGeometry, center, size: shapeSize } = useExtrudedSvgGeometry(svgUrl, extrudeSettings)
  const glowOverlayMaterial = useGlowOverlayMaterial(glowIntensity)
  useEffect(() => () => glowOverlayMaterial.dispose(), [glowOverlayMaterial])
  const bleedGlowMaterial = useGlowOverlayMaterial(bleedGlowIntensity)
  useEffect(() => () => bleedGlowMaterial.dispose(), [bleedGlowMaterial])

  const z = 1.6
  const { width: viewWidth } = viewport.getCurrentViewport(camera, [0, 0, z])
  const perPx = viewWidth / size.width

  // sizeScale: a shape that fills its own bounding box densely (a solid
  // rounded rectangle) reads as visibly bigger than a sparse one (the cap's
  // thin arms with empty space between them) even once both are normalized
  // to the same bounding-box size below — confirmed directly ("Schilders's
  // icon is a bit too big, Juliana's a tiny bit too big"), both dense,
  // nearly-solid shapes. This is applied to the *target* world size before
  // that normalization, not as a further scale after it, so it composes
  // cleanly with the per-icon domRect/viewBoxSize math already happening
  // here rather than needing its own separate step.
  const iconWorldSize = domRect ? Math.min(domRect.width, domRect.height) * perPx * sizeScale : 0
  const worldX = domRect ? (domRect.left + domRect.width / 2 - size.width / 2) * perPx : 0
  const worldY = domRect ? -(domRect.top + domRect.height / 2 - size.height / 2) * perPx : 0
  const scale = iconWorldSize / Math.max(shapeSize.x, shapeSize.y, 0.0001)

  const mountedAtRef = useRef(0)
  if (!mountedAtRef.current) mountedAtRef.current = performance.now()
  const revealScaleRef = useRef(0)

  // Revealed by scale, not opacity — TransmissionMaterial's own patched
  // shader hardcodes its output alpha to 1.0 regardless of the material's
  // opacity prop (see GlassLogoGroup's matching comment on the hero logo),
  // so animating opacity here would do nothing visible.
  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return
    const activePointer = hasWindowPointer ? windowPointer : pointer
    const desiredX = baseTilt.x - activePointer.y * MAX_TILT
    const desiredY = baseTilt.y + activePointer.x * MAX_TILT
    group.rotation.x = MathUtils.damp(group.rotation.x, desiredX, TILT_LAMBDA, delta)
    group.rotation.y = MathUtils.damp(group.rotation.y, desiredY, TILT_LAMBDA, delta)

    const elapsed = performance.now() - mountedAtRef.current
    const delaying = elapsed < REVEAL_DELAY_MS
    group.visible = Boolean(visible && (isWarming || !delaying))
    if (delaying) return

    revealScaleRef.current = MathUtils.damp(revealScaleRef.current, 1, REVEAL_LAMBDA, delta)
    group.scale.setScalar(revealScaleRef.current)
  })

  if (!domRect) return null

  return (
    <group ref={groupRef} position={[worldX, worldY, z]}>
      <group position={[-center.x * scale, center.y * scale, 0]} scale={[scale, -scale, scale]}>
        <mesh geometry={mergedGeometry}>
          {highQuality ? (
            <TransmissionMaterial
              thickness={extrudeSettings.depth}
              {...glassMaterialProps}
              {...glassOverrides}
              active={(isOpen && visible) || isWarming}
            />
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

        <mesh
          geometry={mergedGeometry}
          material={glowOverlayMaterial}
          raycast={() => null}
          ref={(el) => el?.layers.set(OVERLAY_LAYER)}
        />

        <mesh geometry={mergedGeometry} material={bleedGlowMaterial} raycast={() => null} />
      </group>
    </group>
  )
}

export default GlassIcon
