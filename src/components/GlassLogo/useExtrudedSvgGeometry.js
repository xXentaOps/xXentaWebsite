import { useEffect, useMemo } from 'react'
import { Box2, ExtrudeGeometry, Vector2 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useSvgShapes } from '../../three/useSvgShapes'

function recenterZ(geometry) {
  geometry.computeBoundingBox()
  const zCenter = (geometry.boundingBox.min.z + geometry.boundingBox.max.z) / 2
  geometry.translate(0, 0, -zCenter)
}

// Same box-from-points measurement useSvgShapes itself uses — recomputed
// here for just the shapes a filter left standing, since removing e.g. a
// full-canvas border shape changes what "center" and "size" should mean for
// the ones that remain.
function measureShapes(shapes) {
  const box = new Box2()
  for (const shape of shapes) {
    for (const p of shape.getPoints()) box.expandByPoint(p)
    for (const hole of shape.holes) {
      for (const p of hole.getPoints()) box.expandByPoint(p)
    }
  }
  return { center: box.getCenter(new Vector2()), size: box.getSize(new Vector2()) }
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
// filterShapes: optional (shape) => boolean, applied before extruding —
// lets a caller drop specific shapes from the source SVG (e.g. a border/
// frame path meant to stay in the asset for other consumers but not appear
// on this particular mesh) without needing its own copy of this file's
// extrude-and-merge logic. center/size are recomputed from the surviving
// shapes only, so scaling/centering still matches what's actually drawn.
export function useExtrudedSvgGeometry(
  url,
  { depth = 5, bevelEnabled = true, bevelThickness = 0.6, bevelSize = 0.6, bevelSegments = 3, curveSegments = 24 } = {},
  filterShapes,
) {
  const { shapes: allShapes, center: allCenter, size: allSize } = useSvgShapes(url)
  const { shapes, center, size } = useMemo(() => {
    if (!filterShapes) return { shapes: allShapes, center: allCenter, size: allSize }
    const filtered = allShapes.filter(filterShapes)
    return { shapes: filtered, ...measureShapes(filtered) }
  }, [allShapes, allCenter, allSize, filterShapes])

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
