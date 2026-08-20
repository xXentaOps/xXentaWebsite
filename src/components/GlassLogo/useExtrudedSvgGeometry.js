import { useEffect, useMemo } from 'react'
import { ExtrudeGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useSvgShapes } from '../../three/useSvgShapes'

function recenterZ(geometry) {
  geometry.computeBoundingBox()
  const zCenter = (geometry.boundingBox.min.z + geometry.boundingBox.max.z) / 2
  geometry.translate(0, 0, -zCenter)
}

// Generalized version of useGlassLogoGeometry (which stays hardcoded to the
// xXenta logo specifically) — identical technique, any SVG: extrudes each
// of the source SVG's own shapes individually (own ExtrudeGeometry per
// shape, so each keeps its own clean silhouette — no unioning, no holes),
// then merges all of them into one BufferGeometry for a single mesh.
// depth/bevel* are in the SVG's own local units (its viewBox, not world
// units — the caller scales the result to whatever target size it needs,
// same as GlassLogoGroup does), so a source SVG with a much smaller viewBox
// than the xXenta logo's (407x407) needs proportionally smaller values here
// — passing the hero's own depth=5/bevelSize=0.6 unchanged to, say, a 48x48
// icon would extrude it roughly 10x deeper relative to its own size.
export function useExtrudedSvgGeometry(
  url,
  { depth = 5, bevelEnabled = true, bevelThickness = 0.6, bevelSize = 0.6, bevelSegments = 3, curveSegments = 24 } = {},
) {
  const { shapes, center, size } = useSvgShapes(url)

  const mergedGeometry = useMemo(() => {
    const extrudeSettings = { depth, bevelEnabled, bevelThickness, bevelSize, bevelSegments, curveSegments }
    const perShape = shapes.map((shape) => new ExtrudeGeometry(shape, extrudeSettings))
    perShape.forEach(recenterZ)

    const merged = mergeGeometries(perShape, false)
    recenterZ(merged)
    perShape.forEach((g) => g.dispose())

    return merged
  }, [shapes, depth, bevelEnabled, bevelThickness, bevelSize, bevelSegments, curveSegments])

  useEffect(() => () => mergedGeometry.dispose(), [mergedGeometry])

  return { mergedGeometry, center, size, depth }
}

export default useExtrudedSvgGeometry
