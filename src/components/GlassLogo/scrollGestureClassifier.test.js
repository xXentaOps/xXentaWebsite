import { describe, expect, it } from 'vitest'
import { createGestureClassifier } from './scrollGestureClassifier'

// Real wheel events captured from an actual hard flick up from the
// Placeholder page toward Hero/About Us, logged directly from the browser
// (t = performance.now() in ms, delta = event.deltaY). The gesture reverses
// direction at t=4188 (the genuine, single gesture boundary) and then runs
// as one unbroken momentum tail all the way to t=4684 — no real gap, no real
// reversal anywhere in it, just natural trackpad noise.
//
// Before the fix in this file, that noise produced two spurious "new
// gesture" classifications mid-tail (at t=4466 and t=4684), which reset the
// guards meant to stop a flick's own leftover momentum from reopening About
// Us — and it did: the real browser opened About Us off this exact
// momentum, well after the scroll target had already settled at the hero.
// This test replays the raw event stream and asserts that never happens
// again, regardless of what else changes in this file.
const CAPTURED_HARD_FLICK_UP = [
  { t: 4188, delta: -3 },
  { t: 4198, delta: -200 },
  { t: 4205, delta: -105 },
  { t: 4213, delta: -130 },
  { t: 4222, delta: -218 },
  { t: 4231, delta: -103 },
  { t: 4239, delta: 0 },
  { t: 4248, delta: -115 },
  { t: 4255, delta: -92 },
  { t: 4264, delta: -53 },
  { t: 4273, delta: -40 },
  { t: 4281, delta: -45 },
  { t: 4289, delta: -38 },
  { t: 4298, delta: -38 },
  { t: 4306, delta: -40 },
  { t: 4315, delta: -39 },
  { t: 4323, delta: -39 },
  { t: 4331, delta: -32 },
  { t: 4340, delta: -40 },
  { t: 4348, delta: -35 },
  { t: 4356, delta: -36 },
  { t: 4365, delta: -33 },
  { t: 4374, delta: -35 },
  { t: 4382, delta: -36 },
  { t: 4390, delta: -30 },
  { t: 4399, delta: -32 },
  { t: 4408, delta: -34 },
  { t: 4418, delta: -27 },
  { t: 4428, delta: -33 },
  { t: 4436, delta: -30 },
  { t: 4445, delta: -31 },
  { t: 4459, delta: -28 },
  { t: 4466, delta: -65 }, // isolated noise spike — misfired before the fix
  { t: 4475, delta: -23 },
  { t: 4488, delta: -27 },
  { t: 4497, delta: -26 },
  { t: 4510, delta: -27 },
  { t: 4518, delta: -63 }, // another isolated spike
  { t: 4526, delta: -15 },
  { t: 4535, delta: -27 },
  { t: 4545, delta: -25 },
  { t: 4558, delta: -26 },
  { t: 4565, delta: -51 },
  { t: 4574, delta: -19 },
  { t: 4587, delta: -25 },
  { t: 4594, delta: -25 },
  { t: 4607, delta: -24 },
  { t: 4616, delta: -43 },
  { t: 4624, delta: -22 },
  { t: 4633, delta: -21 },
  { t: 4642, delta: -21 },
  { t: 4654, delta: -23 },
  { t: 4663, delta: -21 },
  { t: 4675, delta: -20 },
  { t: 4684, delta: -44 }, // the spike that actually opened About Us in the real browser
]

// Replays a sequence through a fresh classifier, applying the same external
// state updates GlassLogoPreview's onWheel does around each classify() call.
function replay(events) {
  const classifier = createGestureClassifier()
  const results = []
  for (const { t, delta } of events) {
    const absDelta = Math.abs(delta)
    const result = classifier.classify(delta, absDelta, t)
    results.push({ t, delta, ...result })
    classifier.lastEventAt = t
    if (absDelta >= 4) classifier.lastDir = Math.sign(delta)
  }
  return results
}

describe('createGestureClassifier', () => {
  it('does not treat mid-tail noise in a real hard flick as a new gesture', () => {
    const results = replay(CAPTURED_HARD_FLICK_UP)
    const boundaries = results.filter((r) => r.fresh || r.releasesLock).map((r) => r.t)
    // Exactly one genuine boundary: the reversal at the very start (t=4188).
    // Everything after it is the same gesture's own decaying tail — if this
    // ever reports more than one boundary, something in this file has
    // regressed back to trusting an isolated noise spike as a fresh push.
    expect(boundaries).toEqual([4188])
  })

  it('confirms a genuine new push within one tick, on either a hard or gentle swipe', () => {
    // A previous gesture whose tail has already decayed to near nothing —
    // the state a real flick settles into once it's actually finished.
    // gesturePeak isn't reset until a real gap occurs (see classify), so it
    // still holds that gesture's own peak here, same as it would in
    // production for a second swipe landing before the first tail goes
    // fully silent.
    for (const ticks of [
      [55, 60], // hard genuine second swipe
      [18, 20], // gentle genuine second swipe — regression guard: an
      // averaging-based version of this fix (tried first) required a
      // gentle swipe's first tick to clear the bar on its own averaged
      // against the *previous* gesture's already-decayed tail, and a
      // gentle swipe often couldn't. Confirming against the *next* tick
      // instead doesn't have that problem.
    ]) {
      const classifier = createGestureClassifier()
      classifier.envelope = 5
      classifier.gesturePeak = 90
      classifier.lastDir = -1
      classifier.lastActionAt = 0
      classifier.lastEventAt = 1000

      const [tick1, tick2] = ticks
      const first = classifier.classify(-tick1, tick1, 1008)
      classifier.lastEventAt = 1008
      classifier.lastDir = -1
      const second = classifier.classify(-tick2, tick2, 1016)

      // A genuinely new push is honored one tick (~8ms) after it starts —
      // imperceptible — never after waiting for the previous gesture's
      // momentum to actually finish. This applies equally to releasesLock:
      // a second downward push right after a dismiss must be able to carry
      // the user on past the hero immediately, not just re-arm `fresh`.
      expect(first.fresh, `tick 1 of [${ticks}]`).toBe(false)
      expect(second.deliberate, `tick 2 of [${ticks}]`).toBe(true)
      expect(second.fresh, `tick 2 of [${ticks}]`).toBe(true)
      expect(second.releasesLock, `tick 2 of [${ticks}]`).toBe(true)
    }
  })

  it('recognizes a gentle swipe after a pause, however long the pause was', () => {
    // A flick that ends abruptly while still at a decent magnitude — which
    // is what happens every time one is spent against the top of the page
    // (Lenis clamps at 0, so the gesture stops delivering while its events
    // are still 20-30px) — then a real pause, then a deliberate but GENTLE
    // second swipe.
    //
    // Regression guard for two separate bugs that each made this
    // impossible, and together produced the reported symptom: a second
    // swipe that sometimes worked, sometimes lagged, sometimes did nothing,
    // with harsh swipes working far more reliably than gentle ones.
    //  - the envelope decayed per *event*, so it froze at the tail's last
    //    magnitude the moment events stopped and never fell again. A gentle
    //    18-22px swipe could not clear that bar after any length of pause.
    //  - `spent` required gesturePeak > 0, but a pause resets gesturePeak,
    //    so the first event after any pause could never confirm a push.
    // Both are about a *pause*, so any pause length must work — including
    // ones far longer than the gesture-boundary threshold.
    const tailEndingAtSpeed = [-30, -28, -27, -26, -25, -24, -23, -22]
    // Two strengths, because how hard the second swipe is must not decide
    // whether it works at all. The feather one is the regression guard for
    // a third bug in the same family, and the one that outlived the two
    // above: PUSH_MIN sat at 12, so ticks this small were never even
    // candidates, and a genuinely light second swipe could not open About
    // Us after *any* pause — the reported "sometimes the quick second
    // scroll up doesn't register if it's too light". Both strengths are
    // equally deliberate gestures and both must register.
    const secondSwipes = {
      gentle: [-18, -20, -22],
      feather: [-10, -11, -10],
    }

    for (const [strength, secondSwipe] of Object.entries(secondSwipes)) {
      for (const pauseMs of [200, 400, 800, 2000]) {
        const classifier = createGestureClassifier()
        let t = 1000
        for (const delta of tailEndingAtSpeed) {
          classifier.classify(delta, Math.abs(delta), t)
          classifier.lastEventAt = t
          classifier.lastDir = -1
          t += 9
        }

        t += pauseMs
        const results = []
        for (const delta of secondSwipe) {
          results.push(classifier.classify(delta, Math.abs(delta), t))
          classifier.lastEventAt = t
          classifier.lastDir = -1
          t += 9
        }

        // The open path needs `deliberate`, not just `fresh`, whenever the
        // page is still visibly easing to a stop — which it invariably is
        // this soon after a flick. Without it the swipe is silently dropped.
        expect(
          results.some((r) => r.deliberate),
          `${strength} swipe after a ${pauseMs}ms pause`,
        ).toBe(true)
      }
    }
  })
})
