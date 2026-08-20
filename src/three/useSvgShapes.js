import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { Box2, Vector2 } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

// Generalized version of useLogoShapes (which stays hardcoded to the
// xXenta logo specifically) — same fix, any SVG: its own path data is
// authored in a y-down coordinate space (SVG convention), so shapes come
// out upside-down relative to three.js's y-up convention, and off-center,
// unless the consumer corrects both. Centralized here once so every
// extruded-SVG consumer (the hero logo, the Google Cloud badge) sees
// identical, correctly oriented, centered shapes rather than each
// re-deriving this.
export function useSvgShapes(url) {
  const data = useLoader(SVGLoader, url)

  return useMemo(() => {
    const shapes = data.paths.flatMap((path) => path.toShapes())

    const box = new Box2()
    for (const shape of shapes) {
      for (const p of shape.getPoints()) box.expandByPoint(p)
      for (const hole of shape.holes) {
        for (const p of hole.getPoints()) box.expandByPoint(p)
      }
    }

    const center = box.getCenter(new Vector2())
    const size = box.getSize(new Vector2())

    return { shapes, center, size }
  }, [data])
}

export default useSvgShapes
