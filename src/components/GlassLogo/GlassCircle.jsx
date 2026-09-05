import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils, Shape, ExtrudeGeometry } from 'three'
import { OVERLAY_LAYER } from './GlassLogoGroup'
import { glassMaterialProps, useGlowOverlayMaterial } from './glassMaterial'
import { TransmissionMaterial } from './TransmissionMaterial'

// A plain circle, extruded with the exact same depth/bevel proportions as
// GoogleCloudGlassBadge's own EXTRUDE_SETTINGS (calibrated there against
// google-cloud.svg's 48-unit viewBox) — RADIUS=24 keeps this shape's own
// bounding size at 48 units too, so "the same depth" reads as the same
// relative thickness, not a proportionally deeper or shallower slab the
// way reusing those exact numbers against a differently-sized shape would.
const RADIUS = 24
const SHAPE_SIZE = RADIUS * 2
const HERO_LOGO_VIEWBOX_SIZE = 407
const EXTRUDE_SETTINGS = {
  depth: 5 * (SHAPE_SIZE / HERO_LOGO_VIEWBOX_SIZE),
  bevelEnabled: true,
  bevelThickness: 0.6 * (SHAPE_SIZE / HERO_LOGO_VIEWBOX_SIZE),
  bevelSize: 0.6 * (SHAPE_SIZE / HERO_LOGO_VIEWBOX_SIZE),
  bevelSegments: 4,
  curveSegments: 32,
}

// Same two-tier glow split as GoogleCloudGlassBadge/GlassLogoGroup — see
// either's own comment for why the split exists at all.
const GLOW_INTENSITY = 0.55
const BLEED_GLOW_INTENSITY = 0.15

// Same tilt language as the hero logo and the Google Cloud badge (MAX_TILT/
// BASE_TILT/TILT_LAMBDA) — kept identical rather than re-derived, so this
// reads as one more instance of the same glass object language, not a
// differently-tuned one.
const MAX_TILT = MathUtils.degToRad(5)
const BASE_TILT = { x: -0.12, y: 0.1 }
const TILT_LAMBDA = 4

// domRect positions this the same way GoogleCloudGlassBadge's own anchor
// does — CSS px rect, relative to this canvas, converted to world units at
// this shape's own z. Unlike the badge, this lives in AboutUsSection's main
// (bottom) canvas, not the badge's separate overlay one — placed there
// specifically so it paints *behind* the DOM photo (which sits above that
// canvas, below the badge's own overlay canvas — see AboutUsSection's own
// canvas-ordering comments) rather than on top of it. That also means its
// TransmissionMaterial backdrop capture needs no special photo/grid capture
// rig the way the badge's does: the grid and blob it should refract already
// live in this same canvas, so a plain unprioritized capture picks them up
// exactly like the hero's own logo does.
export function GlassCircle({ domRect, isOpen, isWarming = false, highQuality }) {
  const groupRef = useRef(null)
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)
  const size = useThree((state) => state.size)
  const pointer = useThree((state) => state.pointer)

  const mergedGeometry = useMemo(() => {
    const shape = new Shape()
    shape.absarc(0, 0, RADIUS, 0, Math.PI * 2, false)
    const geometry = new ExtrudeGeometry(shape, EXTRUDE_SETTINGS)
    geometry.computeBoundingBox()
    const zCenter = (geometry.boundingBox.min.z + geometry.boundingBox.max.z) / 2
    geometry.translate(0, 0, -zCenter)
    return geometry
  }, [])
  useEffect(() => () => mergedGeometry.dispose(), [mergedGeometry])

  const glowOverlayMaterial = useGlowOverlayMaterial(GLOW_INTENSITY)
  useEffect(() => () => glowOverlayMaterial.dispose(), [glowOverlayMaterial])
  const bleedGlowMaterial = useGlowOverlayMaterial(BLEED_GLOW_INTENSITY)
  useEffect(() => () => bleedGlowMaterial.dispose(), [bleedGlowMaterial])

  const z = 1.6
  const { width: viewWidth } = viewport.getCurrentViewport(camera, [0, 0, z])
  const perPx = viewWidth / size.width

  const worldSize = domRect ? Math.min(domRect.width, domRect.height) * perPx : 0
  const worldX = domRect ? (domRect.left + domRect.width / 2 - size.width / 2) * perPx : 0
  const worldY = domRect ? -(domRect.top + domRect.height / 2 - size.height / 2) * perPx : 0
  const scale = worldSize / SHAPE_SIZE

  useFrame((_, delta) => {
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
      <group scale={[scale, -scale, scale]}>
        <mesh geometry={mergedGeometry}>
          {highQuality ? (
            <TransmissionMaterial thickness={EXTRUDE_SETTINGS.depth} {...glassMaterialProps} active={isTransmissionActive} />
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

export default GlassCircle
