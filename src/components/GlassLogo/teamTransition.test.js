import { describe, expect, it } from 'vitest'
import { aboutUsGridMetrics, getAboutUsZoomScale } from './aboutUsGridCells'
import { GRID_SPEED, gridPhaseShiftCells, mainSlidePx } from './teamTransition'

describe('gridPhaseShiftCells alignment with DOM MeetTheTeamGrid', () => {
  const resolutions = [
    { w: 1920, h: 1080 },
    { w: 1920, h: 960 },
    { w: 1920, h: 1200 },
    { w: 1600, h: 900 },
    { w: 1440, h: 900 },
    { w: 1440, h: 800 },
    { w: 1280, h: 720 },
    { w: 1024, h: 768 },
  ]

  it('aligns WebGL shader grid lines and DOM phaseX with zero residual across standard resolutions', () => {
    for (const { w, h } of resolutions) {
      const scale = getAboutUsZoomScale(w, h)
      const settled = aboutUsGridMetrics(w, h)
      const cell = settled.cell
      const wrap = (val) => ((val % cell) + cell) % cell

      // DOM MeetTheTeamGrid phaseX at progress 1:
      const domPhaseX = wrap(settled.phaseX + mainSlidePx(1, w) * GRID_SPEED)

      // WebGL shader phase shift uniform with dynamic cellPx:
      const uXPhaseShiftCells = gridPhaseShiftCells(1, w, cell)

      // Screen position of shader vertical line (where fract(...) == 0):
      // fract((xScreen - firstX) / cell + uXPhaseShiftCells) == 0 => xScreen = firstX - uXPhaseShiftCells * cell
      const shaderPhaseX = wrap(settled.firstX - uXPhaseShiftCells * cell)

      // Difference between DOM phaseX and shader grid lines modulo cell:
      const rawDiff = wrap(domPhaseX - shaderPhaseX)
      const errorPx = Math.min(rawDiff, cell - rawDiff)

      expect(errorPx).toBeCloseTo(0, 4)
    }
  })

  it('maintains continuous 1:1 speed with mainSlidePx during team transition progress', () => {
    const w = 1920
    const h = 1080
    const settled = aboutUsGridMetrics(w, h)
    const cell = settled.cell

    for (let progress = 0; progress <= 1.0; progress += 0.1) {
      const uXPhaseShiftCells = gridPhaseShiftCells(progress, w, cell)
      const physicalShaderShiftPx = -uXPhaseShiftCells * cell
      const domSlidePx = mainSlidePx(progress, w) * GRID_SPEED

      expect(physicalShaderShiftPx).toBeCloseTo(domSlidePx, 4)
    }
  })
})

