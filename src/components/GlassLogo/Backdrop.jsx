import { useThree } from '@react-three/fiber'
import { BackgroundGrid } from './BackgroundGrid'
import { GradientBlob } from './GradientBlob'
import { BLOB_WIDTH_OVERSCALE, PLANE_SIZE, PLANE_Z } from './sceneConstants'

// Lives inside the Canvas: a real scene-space gradient (not CSS) so
// MeshTransmissionMaterial's backbuffer sampling can actually pick it up and
// blur/refract it through the glass.
export function Backdrop({ onActiveIndexChange, onScrollLockChange, isForceScrollingRef, aboutUsProgress, activeIndex, onCategorySelect, forceVisible }) {
  const camera = useThree((state) => state.camera)
  const viewport = useThree((state) => state.viewport)

  // Precise visible extent at the plane's own depth (not the origin), used
  // to anchor the blob low on screen, close to the bottom edge, and to
  // stretch it to the full screen width below.
  const { width: visibleWidthAtPlane, height: visibleHeightAtPlane } = viewport.getCurrentViewport(camera, [0, 0, PLANE_Z])
  const planeY = -visibleHeightAtPlane * 0.6

  return (
    <>
      <color attach="background" args={['#0F172B']} />
      {/* X scale is the viewport's full visible width at this depth, times
          BLOB_WIDTH_OVERSCALE — see that constant's comment above for why
          the plain viewport width alone left visible dark margins at the
          sides. */}
      <GradientBlob position={[0, planeY, PLANE_Z]} scale={[visibleWidthAtPlane * BLOB_WIDTH_OVERSCALE, PLANE_SIZE, 1]} />
      {/* Sits in front of the blob plane and behind the glass logo, so the
          logo occludes it via normal depth-testing instead of a DOM overlay
          drawing over the top of everything. */}
      <BackgroundGrid
        z={PLANE_Z + 1}
        aboutUsProgress={aboutUsProgress}
        onActiveIndexChange={onActiveIndexChange}
        onScrollLockChange={onScrollLockChange}
        isForceScrollingRef={isForceScrollingRef}
        activeIndex={activeIndex}
        onCategorySelect={onCategorySelect}
        forceVisible={forceVisible}
      />
      {/* Lower than it was — with the glass now less transmissive (see
          GlassLogoGroup), more of its diffuse/specular response to real
          scene lights shows through, and this white light was washing the
          whole logo grey and drowning out the blue reflection environment,
          which is meant to be the dominant light source now. */}
      <directionalLight position={[4, 5, 6]} intensity={0.5} />
    </>
  )
}
