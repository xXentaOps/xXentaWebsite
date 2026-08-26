import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OVERLAY_LAYER } from './GlassLogoGroup'
import { glassMaterialProps, useGlowOverlayMaterial } from './glassMaterial'
import { TransmissionMaterial } from './TransmissionMaterial'
import { useExtrudedSvgGeometry } from './useExtrudedSvgGeometry'

// The full Google Cloud Partner plaque (cloud icon + "Google Cloud Partner"
// wordmark + its own rounded-square frame, all one SVG) — same extruded-
// glass technique, same glassMaterialProps, and the same OVERLAY_LIGHTS glow
// overlay as GoogleCloudGlassBadge and GlassCircle, so this reads as the
// same glass as the rest of the page rather than a separately-invented
// material. The one deliberate difference from those siblings: no
// cursor-follow tilt. A flat rectangular plaque (unlike their curved/round
// shapes) read any off-axis angle as its own straight edges visibly bending
// in perspective — reported directly — so this one stays facing the camera
// dead-on instead.
const SVG_URL = '/google-cloud-partner.svg'
// google-cloud-partner.svg's own viewBox is 0 0 1341 1341, and its content
// (the outer frame) fills essentially the whole of it.
const SVG_VIEWBOX_SIZE = 1341
// No bevel and a near-zero depth, unlike GoogleCloudGlassBadge's own
// EXTRUDE_SETTINGS (which this used to copy outright): the glow overlay's
// OVERLAY_LIGHTS shader lights each fragment by its own surface normal, and
// on a curved letterform's depth walls and bevel facets that normal sweeps
// through every direction around the curve — reads as little glints
// scattered around each letter's edge, and (combined with the many small
// curves in this particular SVG's own text) as looking tilted/3D even
// though nothing here is. The front face's normal is constant everywhere
// (0,0,1), so it alone reads as one flat, evenly lit wash of the same blue
// — this keeps only that. depth is not literally 0: TransmissionMaterial's
// own `thickness` prop needs a real, if imperceptibly thin, volume to
// refract through.
const HERO_LOGO_VIEWBOX_SIZE = 407
const EXTRUDE_SETTINGS = {
  depth: 0.15 * (SVG_VIEWBOX_SIZE / HERO_LOGO_VIEWBOX_SIZE),
  bevelEnabled: false,
  curveSegments: 16,
}

// Same two-tier glow split as GoogleCloudGlassBadge/GlassCircle — see
// either's own comment for why the split exists at all. This is the actual
// source of the blue on every other glass piece on this page — plain
// TransmissionMaterial alone reads closer to clear/gray, confirmed directly
// once this was tried without it.
const GLOW_INTENSITY = 0.65
const BLEED_GLOW_INTENSITY = 0.15

// domRect positions this the same way GlassCircle's own anchor does: a CSS
// px rect (relative to this canvas), converted to world units at this
// shape's own z. Lives in AboutUsSection's main (bottom) canvas, not the
// team-photo badge's separate overlay one — this sits over the grid/blob in
// the copy column, not over the photo, so it needs none of the photo-
// specific capture rig (PhotoBackdropCapture/CornerBracketCapture) the other
// badge's canvas exists for.
export function GoogleCloudPartnerBadge({ domRect, isOpen, highQuality }) {
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)

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

  if (!domRect) return null

  return (
    <group position={[worldX, worldY, z]}>
      <group position={[-center.x * scale, center.y * scale, 0]} scale={[scale, -scale, scale]}>
        <mesh geometry={mergedGeometry}>
          {highQuality ? (
            <TransmissionMaterial thickness={EXTRUDE_SETTINGS.depth} {...glassMaterialProps} active={isOpen} />
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

        {/* On OVERLAY_LAYER — see GoogleCloudGlassBadge's own comment for
            why, same reasoning here. */}
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

export default GoogleCloudPartnerBadge
