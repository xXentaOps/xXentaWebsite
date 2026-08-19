import { useMemo } from 'react'
import { useLoader } from '@react-three/fiber'
import { Box2, Vector2 } from 'three'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'
import logoUrl from '../assets/logo-xxenta.svg?url'

// The SVG's own path data is authored in a y-down coordinate space (SVG
// convention). SVGLoader preserves those raw coordinates, so shapes come out
// upside-down relative to three.js's y-up convention unless the consumer
// flips the y axis. We centralize that fix here, plus centering, so every
// consumer (flat preview, extruded glass) sees identical, correctly
// oriented, centered shapes.
export function useLogoShapes() {
  const data = useLoader(SVGLoader, logoUrl)

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
