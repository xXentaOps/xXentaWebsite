import { useEffect, useMemo } from 'react'
import { ExtrudeGeometry } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useLogoShapes } from '../../three/useLogoShapes'

function recenterZ(geometry) {
  geometry.computeBoundingBox()
  const zCenter = (geometry.boundingBox.min.z + geometry.boundingBox.max.z) / 2
  geometry.translate(0, 0, -zCenter)
}

// Extrudes each of the logo's 4 shapes individually (own ExtrudeGeometry per
// shape, so each keeps its own clean silhouette — no unioning, no holes),
// then merges all 4 into one BufferGeometry for the single visible mesh.
export function useGlassLogoGeometry({
  depth = 5,
  bevelEnabled = true,
  bevelThickness = 0.6,
  bevelSize = 0.6,
  bevelSegments = 3,
  curveSegments = 24,
} = {}) {
  const { shapes, center, size } = useLogoShapes()

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
