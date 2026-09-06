import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'
import { OVERLAY_LAYER } from './GlassLogoGroup'
import { glassMaterialProps, useGlowOverlayMaterial } from './glassMaterial'
import { TransmissionMaterial } from './TransmissionMaterial'
import { useExtrudedSvgGeometry } from './useExtrudedSvgGeometry'

// The Google Cloud icon itself — a real 3D glass structure, the same
// technique and material as the hero's own xXenta logo (TransmissionMaterial
// + glassMaterialProps + useGlowOverlayMaterial + a cursor-following tilt),
// not the flat capture-and-blur panel technique this piece otherwise
// standardizes on for everything else. That standard exists for flat DOM-
// sized panels; this is the one thing on the page that's meant to be an
// actual dimensional object catching light as it turns, which is exactly
// what TransmissionMaterial's real refraction is for (see its own file and
// GlassLogoGroup's comments) — the reason it was reserved for the hero logo
// specifically until now.
const SVG_URL = '/google-cloud.svg'
// google-cloud.svg's own viewBox is 0 0 48 48.
const SVG_VIEWBOX_SIZE = 48
// Proportional to the hero logo's own depth=5/bevelThickness=0.6/
// bevelSize=0.6 relative to *its* 407-unit viewBox (see
// useGlassLogoGeometry/useExtrudedSvgGeometry) — the same ratio, scaled down
// to this SVG's much smaller one, so this reads as a smaller version of the
// same kind of object rather than a proportionally much deeper slab.
const HERO_LOGO_VIEWBOX_SIZE = 407
const EXTRUDE_SETTINGS = {
  depth: 5 * (SVG_VIEWBOX_SIZE / HERO_LOGO_VIEWBOX_SIZE),
  bevelEnabled: true,
  bevelThickness: 0.6 * (SVG_VIEWBOX_SIZE / HERO_LOGO_VIEWBOX_SIZE),
  bevelSize: 0.6 * (SVG_VIEWBOX_SIZE / HERO_LOGO_VIEWBOX_SIZE),
  bevelSegments: 4,
  curveSegments: 16,
}

// Same two-tier glow split as GlassLogoGroup: a bright copy on OVERLAY_LAYER
// (invisible to TransmissionMaterial's own backdrop capture, so it reads as
// a reflection sitting *on* the glass rather than getting baked into what
// the glass refracts) and a dim "bleed-through" copy left on the default
// layer, so a soft hint of the same blue glint carries into the glass's own
// depth instead of stopping dead at the front face.
const GLOW_INTENSITY = 0.55
const BLEED_GLOW_INTENSITY = 0.15

// Same tilt language as the hero logo's own (MAX_TILT/BASE_TILT/TILT_LAMBDA
// in GlassLogoGroup) — this badge is much smaller, so the angle doesn't need
// scaling down the way a physically large object might, but the resting
// pose and damping feel should match exactly, since the ask was specifically
// "just like the xXenta logo."
const MAX_TILT = MathUtils.degToRad(5)
const BASE_TILT = { x: -0.12, y: 0.1 }
const TILT_LAMBDA = 4

// domRect is the badge anchor's own real rect (CSS px, relative to this
// canvas rather than the viewport — see AboutUsSection's useDomAnchorRect,
// which subtracts the section so the section's own slide transform is not
// counted twice), converted here to a
// world position/scale at this badge's own Z — the same px-to-world
// approach used throughout this piece for syncing a DOM layout to WebGL
// content.
//
// Mounted once (see sceneReady in AboutUsSection), not remounted on every
// isOpen toggle — this component's own setup (loading+extruding the SVG
// into mergedGeometry, building the glow materials) is real, one-time work,
// and conditionally mounting the *whole* component on isOpen (tried first)
// paid that cost fresh every single time About Us opened, on top of
// ReflectionEnvironment's own re-bake (see AboutUsSection's own comment on
// that — the two together were the full "scrolling takes a couple of
// seconds" bug). isOpen is threaded down as a prop instead, passed straight
// through to TransmissionMaterial's own `active` prop (see its comment) so
// the *mesh* stays mounted permanently too — conditionally mounting just
// the mesh+material on isOpen (tried next) fixed the closing side but left
// opening still paying TransmissionMaterial's FBO allocation and first
// render fresh every time, which is exactly what read as "scrolling up to
// About Us still takes a couple of seconds" once the closing side was
// already fast. `active` lets the element stay mounted (FBO allocated once,
// whenever sceneReady first turns on) while still skipping its ongoing
// per-frame backdrop-capture cost for the large majority of this section's
// life that it spends closed.
export function GoogleCloudGlassBadge({ domRect, isOpen, isWarming = false, highQuality, teamProgress, isTeamOpen }) {
  const groupRef = useRef(null)
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)
  const pointer = useThree((state) => state.pointer)

  const { mergedGeometry, center, size: shapeSize } = useExtrudedSvgGeometry(SVG_URL, EXTRUDE_SETTINGS)
  const glowOverlayMaterial = useGlowOverlayMaterial(GLOW_INTENSITY)
  useEffect(() => () => glowOverlayMaterial.dispose(), [glowOverlayMaterial])
  const bleedGlowMaterial = useGlowOverlayMaterial(BLEED_GLOW_INTENSITY)
  useEffect(() => () => bleedGlowMaterial.dispose(), [bleedGlowMaterial])

  const z = 1.6
  const { width: viewWidth } = viewport.getCurrentViewport(camera, [0, 0, z])
  const perPx = viewWidth / size.width

  const badgeWorldSize = domRect ? Math.min(domRect.width, domRect.height) * perPx : 0
  const worldX = domRect ? (domRect.left + domRect.width / 2 - size.width / 2) * perPx : 0
  const worldY = domRect ? -(domRect.top + domRect.height / 2 - size.height / 2) * perPx : 0
  const scale = badgeWorldSize / Math.max(shapeSize.x, shapeSize.y, 0.0001)

  const isActiveRef = useRef(true)

  useFrame((_, delta) => {
    const isOffscreen = Boolean(isTeamOpen && teamProgress && teamProgress.get() > 0.65)
    isActiveRef.current = (isOpen || isWarming) && !isOffscreen
    if (isOffscreen) return

    const group = groupRef.current
    if (!group) return
    const desiredX = BASE_TILT.x - pointer.y * MAX_TILT
    const desiredY = BASE_TILT.y + pointer.x * MAX_TILT
    group.rotation.x = MathUtils.damp(group.rotation.x, desiredX, TILT_LAMBDA, delta)
    group.rotation.y = MathUtils.damp(group.rotation.y, desiredY, TILT_LAMBDA, delta)
  })

  const isTransmissionActive = isOpen || isWarming

  if (!domRect) return null

  return (
    <group ref={groupRef} position={[worldX, worldY, z]}>
      <group position={[-center.x * scale, center.y * scale, 0]} scale={[scale, -scale, scale]}>
        {/* Mounted permanently — see this component's own top comment for
            why isOpen now only gates TransmissionMaterial's internal
            `active` (its ongoing per-frame cost), not this mesh's own
            mount/unmount. */}
        <mesh geometry={mergedGeometry}>
          {highQuality ? (
            <TransmissionMaterial
              thickness={EXTRUDE_SETTINGS.depth}
              {...glassMaterialProps}
              active={isTransmissionActive}
              activeRef={isActiveRef}
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

        {/* On OVERLAY_LAYER so TransmissionMaterial's own backdrop capture
            (a full default-layer scene render it does internally every
            frame) never sees it — see OVERLAY_LAYER's own comment in
            GlassLogoGroup for why that split exists at all. */}
        <mesh
          geometry={mergedGeometry}
          material={glowOverlayMaterial}
          raycast={() => null}
          ref={(el) => el?.layers.set(OVERLAY_LAYER)}
        />

        {/* Left on the default layer (no ref override) so the backdrop
            capture above *does* pick it up, softly refracting it into the
            glass's own depth. */}
        <mesh geometry={mergedGeometry} material={bleedGlowMaterial} raycast={() => null} />
      </group>
    </group>
  )
}

export default GoogleCloudGlassBadge
