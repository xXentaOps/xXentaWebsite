import { createGestureClassifier, GESTURE_END_MS } from '../components/GlassLogo/scrollGestureClassifier'

// Modular scrollDetent state machine.
// Halts downward scrolling at a threshold (e.g. DRP Showcase Introduction),
// absorbs any residual arrival momentum so the visitor cannot accidentally
// blow past the page, and requires an intentional second downward gesture
// (or downward keypress) initiated while on the page to unlatch and proceed.
export function createScrollDetent(options = {}) {
  const rearmOffset = options.rearmOffset ?? 15
  const arrivalEpsilon = options.arrivalEpsilon ?? 6
  const settleEpsilon = options.settleEpsilon ?? 8

  let threshold = null
  let active = false
  let isLatched = true
  let gestureStartScroll = null
  let lastArrivalEventAt = 0

  const classifier = createGestureClassifier()

  function setConfig(config) {
    if (!config) {
      active = false
      threshold = null
      return
    }
    const prevThreshold = threshold
    threshold = config.threshold ?? null
    active = !!config.active
    if (config.threshold !== prevThreshold && config.threshold != null) {
      const current = config.currentScroll ?? 0
      if (current < config.threshold - rearmOffset) {
        isLatched = true
        gestureStartScroll = null
      }
    }
  }

  function handleVirtualScroll(data, currentScroll, targetScroll) {
    if (!active || threshold == null) return true

    const delta = data.deltaY
    const absDelta = Math.abs(delta)
    const now = (data.event && 'timeStamp' in data.event) ? data.event.timeStamp : (typeof performance !== 'undefined' ? performance.now() : Date.now())

    // Re-arm condition:
    // If user scrolls back up toward Floren / pan transition, re-arm the latch
    if (currentScroll < threshold - rearmOffset) {
      isLatched = true
      gestureStartScroll = null
    }

    // If already unlatched, pass through freely
    if (!isLatched) return true

    // If scrolling UP (delta <= 0), allow completely unhindered
    if (delta <= 0) return true

    // Downward scrolling (delta > 0) while latched:
    const { fresh, deliberate } = classifier.classify(delta, absDelta, now)
    classifier.lastEventAt = now
    if (absDelta >= 3) {
      classifier.lastDir = Math.sign(delta)
    }

    // Snapshot where this gesture originated when it started fresh
    if (fresh || gestureStartScroll === null) {
      gestureStartScroll = currentScroll
    }

    // Did this gesture start above the Intro page?
    const isArrivalGesture = gestureStartScroll < threshold - arrivalEpsilon

    if (isArrivalGesture) {
      lastArrivalEventAt = now
      const target = targetScroll ?? currentScroll
      if (target < threshold) {
        if (target + delta >= threshold) {
          // Clamp so target lands EXACTLY at threshold
          data.deltaY = Math.max(0, threshold - target)
          return true
        }
        return true
      } else {
        // Already reached or at threshold: absorb arrival momentum tail
        data.deltaY = 0
        if (data.event?.cancelable && typeof data.event.preventDefault === 'function') {
          data.event.preventDefault()
        }
        return false
      }
    }

    // If gesture started while already resting at the Intro page:
    const isAtIntro = Math.abs(currentScroll - threshold) <= settleEpsilon
    const arrivalSpent = (now - lastArrivalEventAt > GESTURE_END_MS) || deliberate

    if (isAtIntro && arrivalSpent) {
      // Intentional second scroll on Intro detected! Unlock latch!
      isLatched = false
      return true
    }

    // Absorb any unexpected events while settling
    data.deltaY = 0
    if (data.event?.cancelable && typeof data.event.preventDefault === 'function') {
      data.event.preventDefault()
    }
    return false
  }

  function handleKeyDown(event, currentScroll, scrollTo) {
    if (!active || threshold == null || !isLatched) return

    const isDownKey = event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ' || event.key === 'Spacebar'
    if (!isDownKey) return

    // Approaching from above:
    if (currentScroll < threshold - arrivalEpsilon) {
      const step = (event.key === 'ArrowDown') ? 40 : (typeof window !== 'undefined' ? window.innerHeight * 0.8 : 600)
      if (currentScroll + step >= threshold) {
        if (typeof event.preventDefault === 'function') event.preventDefault()
        scrollTo?.(threshold)
      }
      return
    }

    // At Intro page: intentional keypress unlocks latch
    if (Math.abs(currentScroll - threshold) <= settleEpsilon) {
      isLatched = false
    }
  }

  function getState() {
    return {
      threshold,
      active,
      isLatched,
      gestureStartScroll,
      lastArrivalEventAt,
    }
  }

  return {
    setConfig,
    handleVirtualScroll,
    handleKeyDown,
    getState,
  }
}

