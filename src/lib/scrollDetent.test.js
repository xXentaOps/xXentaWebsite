import { describe, expect, it } from 'vitest'
import { createScrollDetent } from './scrollDetent'

describe('createScrollDetent', () => {
  const INTRO_THRESHOLD = 3000

  it('allows normal scrolling above the threshold when active', () => {
    const detent = createScrollDetent()
    detent.setConfig({ threshold: INTRO_THRESHOLD, active: true })

    const data = { deltaY: 50 }
    const allowed = detent.handleVirtualScroll(data, 1000, 1000)

    expect(allowed).toBe(true)
    expect(data.deltaY).toBe(50)
  })

  it('clamps arrival scroll deltaY so target lands exactly on threshold', () => {
    const detent = createScrollDetent()
    detent.setConfig({ threshold: INTRO_THRESHOLD, active: true })

    // User is scrolling down from Floren (2950), a 100px flick would overshoot to 3050
    const data = { deltaY: 100 }
    const allowed = detent.handleVirtualScroll(data, 2950, 2950)

    expect(allowed).toBe(true)
    // Clamped to exactly 3000 - 2950 = 50px!
    expect(data.deltaY).toBe(50)
  })

  it('swallows residual momentum tail from the arrival gesture', () => {
    const detent = createScrollDetent()
    detent.setConfig({ threshold: INTRO_THRESHOLD, active: true })

    // Initial flick arrives from 2900 with deltaY 150 -> clamped to 100 (lands on 3000)
    let t = 1000
    const firstEvent = { deltaY: 150, event: { timeStamp: t } }
    detent.handleVirtualScroll(firstEvent, 2900, 2900)
    expect(firstEvent.deltaY).toBe(100)

    // Momentum tail arrives 16ms later while target is at 3000
    t += 16
    let prevented = false
    const tailEvent1 = {
      deltaY: 80,
      event: {
        timeStamp: t,
        cancelable: true,
        preventDefault: () => { prevented = true },
      },
    }
    const allowed1 = detent.handleVirtualScroll(tailEvent1, 2950, 3000)
    expect(allowed1).toBe(false)
    expect(tailEvent1.deltaY).toBe(0)
    expect(prevented).toBe(true)

    // Another momentum event arrives 16ms later
    t += 16
    const tailEvent2 = { deltaY: 50, event: { timeStamp: t } }
    const allowed2 = detent.handleVirtualScroll(tailEvent2, 3000, 3000)
    expect(allowed2).toBe(false)
    expect(tailEvent2.deltaY).toBe(0)

    // The detent remains latched
    expect(detent.getState().isLatched).toBe(true)
  })

  it('unlatches on an intentional second downward scroll after resting on Intro', () => {
    const detent = createScrollDetent()
    detent.setConfig({ threshold: INTRO_THRESHOLD, active: true })

    // Arrive at Intro
    let t = 1000
    detent.handleVirtualScroll({ deltaY: 100, event: { timeStamp: t } }, 2950, 2950)

    // Momentum tail finishes at t = 1100
    t = 1100
    detent.handleVirtualScroll({ deltaY: 20, event: { timeStamp: t } }, 3000, 3000)
    expect(detent.getState().isLatched).toBe(true)

    // User rests on the Intro page for 300ms (reading Introduction)
    t = 1400

    // User makes a deliberate, intentional downward scroll to proceed into Syllabus Overview
    const secondScroll = { deltaY: 60, event: { timeStamp: t } }
    const allowed = detent.handleVirtualScroll(secondScroll, 3000, 3000)

    // Latch is unlocked!
    expect(allowed).toBe(true)
    expect(secondScroll.deltaY).toBe(60)
    expect(detent.getState().isLatched).toBe(false)

    // Subsequent scrolling passes through unhindered
    t += 16
    const thirdScroll = { deltaY: 55, event: { timeStamp: t } }
    const allowedThird = detent.handleVirtualScroll(thirdScroll, 3060, 3060)
    expect(allowedThird).toBe(true)
    expect(thirdScroll.deltaY).toBe(55)
  })

  it('allows upward scrolling at all times without latch interference', () => {
    const detent = createScrollDetent()
    detent.setConfig({ threshold: INTRO_THRESHOLD, active: true })

    // User at threshold scrolls UP (deltaY negative)
    const upEvent = { deltaY: -50 }
    const allowed = detent.handleVirtualScroll(upEvent, 3000, 3000)

    expect(allowed).toBe(true)
    expect(upEvent.deltaY).toBe(-50)
  })

  it('automatically re-arms latch when user scrolls back up past the Intro', () => {
    const detent = createScrollDetent()
    detent.setConfig({ threshold: INTRO_THRESHOLD, active: true })

    // Arrive, unlatch
    detent.handleVirtualScroll({ deltaY: 100, event: { timeStamp: 1000 } }, 2950, 2950)
    detent.handleVirtualScroll({ deltaY: 50, event: { timeStamp: 1400 } }, 3000, 3000)
    expect(detent.getState().isLatched).toBe(false)

    // User scrolls back up into Floren / pan (e.g. 2960 < 3000 - 15)
    detent.handleVirtualScroll({ deltaY: -40, event: { timeStamp: 1800 } }, 2960, 2960)

    // Latch is re-armed!
    expect(detent.getState().isLatched).toBe(true)

    // Scrolling down again will stop at 3000
    const arriveAgain = { deltaY: 80, event: { timeStamp: 2000 } }
    detent.handleVirtualScroll(arriveAgain, 2970, 2970)
    expect(arriveAgain.deltaY).toBe(30) // Clamped to 3000 - 2970
  })

  it('handles keyboard navigation detenting and unlatching', () => {
    const detent = createScrollDetent()
    detent.setConfig({ threshold: INTRO_THRESHOLD, active: true })

    let scrolledTarget = null
    const scrollTo = (t) => { scrolledTarget = t }

    // Down arrow from 2970 (step 40) would overshoot 3000 -> clamps to threshold
    let prevented = false
    const downEvent = {
      key: 'ArrowDown',
      preventDefault: () => { prevented = true },
    }
    detent.handleKeyDown(downEvent, 2970, scrollTo)
    expect(prevented).toBe(true)
    expect(scrolledTarget).toBe(3000)
    expect(detent.getState().isLatched).toBe(true)

    // Now resting at Intro (3000), pressing Down key intentional unlocks latch
    detent.handleKeyDown({ key: 'ArrowDown' }, 3000, scrollTo)
    expect(detent.getState().isLatched).toBe(false)
  })
})

