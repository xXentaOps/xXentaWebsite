import { describe, it, expect } from 'vitest'
import { computeLayout } from './MeetTheTeamGrid'

describe('MeetTheTeamGrid Mobile Layout', () => {
  const screens = [
    { name: 'iPhone SE', w: 375, h: 667 },
    { name: 'Android Small', w: 360, h: 640 },
    { name: 'iPhone 14/15', w: 390, h: 844 },
    { name: 'Pixel 7', w: 412, h: 915 },
    { name: 'iPhone 15 Pro Max', w: 430, h: 932 },
  ]

  screens.forEach(({ name, w, h }) => {
    it(`computes correct mobile layout for ${name} (${w}x${h})`, () => {
      const layout = computeLayout(w, h)
      expect(layout.isMobile).toBe(true)
      expect(layout.tiles).toHaveLength(7)
      expect(layout.cell).toBeGreaterThan(50)
      expect(layout.cell).toBeLessThanOrEqual(108)

      // Ensure all tiles fit within the screen width
      for (const tile of layout.tiles) {
        expect(tile.left).toBeGreaterThanOrEqual(0)
        expect(tile.left + layout.cell).toBeLessThanOrEqual(w)
      }

      // Check detail bounds
      expect(layout.detail.size).toBeLessThanOrEqual(220)
      expect(layout.detail.left).toBeGreaterThanOrEqual(0)
      expect(layout.detail.left + layout.detail.size).toBeLessThanOrEqual(w)
      expect(layout.panelHeight).toBeGreaterThanOrEqual(140)
    })
  })

  it('preserves desktop layout for viewports >= 768px', () => {
    const layout = computeLayout(1920, 1080)
    expect(layout.isMobile).toBe(false)
    expect(layout.tiles).toHaveLength(7)
  })
})

