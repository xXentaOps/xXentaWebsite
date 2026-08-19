import { useCallback, useEffect, useRef } from 'react'
import Lenis from 'lenis'

// Keys that scroll the page natively — needed because Lenis's own stop()
// only intercepts wheel/touch input (it registers no keydown listener at
// all), so with nothing else, Space/Page Down/arrow keys would still scroll
// the page even while "locked".
// (Tried Lenis's own `autoToggle` option first, which sets `overflow: clip`
// on the root element instead of engaging its own wheel/touch interception
// — per its source, `stop()` returns immediately after setting that CSS
// property without ever setting `isStopped = true`. That CSS alone didn't
// reliably block scrolling here, and skipped isStopped entirely, so nothing
// else was blocking it either — confirmed via a real scrollY check, not
// just an assumption. Plain stop()/start() below use Lenis's own tested
// wheel/touch interception instead, with this keydown listener covering
// the one input path that leaves untouched.)
const SCROLL_KEYS = new Set([' ', 'Spacebar', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'])

// Lenis's own lerp-based scrollTo (no duration/easing given, so it falls
// back to this) damps toward its target exactly like MathUtils.damp
// elsewhere on this piece — internally, `lerp * 60` becomes that damp
// call's own lambda, so this is directly comparable to (and tuned to sit
// close to) TILT_LAMBDA in GlassLogoGroup. The default lerp (0.1 → lambda
// 6) read as noticeably brisker than that, jarring next to how weighted
// everything else here feels — this trims it down to lambda 4.5, the same
// "heavier" pace, without slowing it enough to feel sluggish for what's
// otherwise a large, fast scroll distance.
const FORCE_SCROLL_LERP = 0.075

export function useLenis(locked = false, isForceScrollingRef) {
  const lenisRef = useRef(null)

  useEffect(() => {
    const lenis = new Lenis()
    lenisRef.current = lenis

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => lenis.destroy()
  }, [])

  useEffect(() => {
    const lenis = lenisRef.current
    if (!lenis) return
    if (locked) {
      // Animates back to the top *before* actually stopping, rather than
      // freezing wherever the page already was — the caller (BackgroundGrid's
      // "AI for Achievers" selection) wants scrolling into the rest of the
      // site blocked entirely while locked, not just frozen mid-page, and
      // this is also what makes locking on *selection* (which, unlike
      // hover, persists after the pointer leaves the button) safe: every
      // other button stays reachable, always, because the page is always
      // sitting at the top while this is engaged. `lock: true` keeps
      // isLocked on for the animation's own duration, blocking wheel/touch
      // input from interrupting the scroll-back before stop() below takes
      // over for good; `force` lets this run even if a previous lock cycle
      // left Lenis stopped.
      // isForceScrollingRef flips on synchronously here, not inside
      // Lenis's own onStart (which only fires on the next animation
      // frame) — no gap where a hover landing on a *different* button
      // (easy to do by accident while the page is visibly moving
      // underneath a cursor that hasn't itself moved) could still slip
      // through and re-select it mid-animation, undoing the very lock
      // this scroll-back exists to enforce. See its read site in
      // BackgroundGrid, which ignores hover entirely while this is true.
      if (isForceScrollingRef) isForceScrollingRef.current = true
      lenis.scrollTo(0, {
        lock: true,
        force: true,
        lerp: FORCE_SCROLL_LERP,
        onComplete: () => {
          if (isForceScrollingRef) isForceScrollingRef.current = false
          lenis.stop()
        },
      })
    } else {
      lenis.start()
    }
  }, [locked, isForceScrollingRef])

  useEffect(() => {
    if (!locked) return
    function onKeyDown(event) {
      if (SCROLL_KEYS.has(event.key)) event.preventDefault()
    }
    // Not passive — the whole point is calling preventDefault.
    window.addEventListener('keydown', onKeyDown, { passive: false })
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [locked])

  // General-purpose smooth scroll for callers outside the locked/forced
  // mechanism above — currently just the xXenta logo (see onLogoClick in
  // GlassLogoPreview), which needs to animate back to the hero on demand
  // when clicked from further down the page (the carousel/glow sections),
  // with no locking behavior of its own once it gets there. FORCE_SCROLL_LERP
  // as the default (not Lenis's own, brisker default) gives it the same
  // "weighted" pace as the rest of this piece's scroll-linked motion.
  const scrollTo = useCallback((target, options) => {
    lenisRef.current?.scrollTo(target, { lerp: FORCE_SCROLL_LERP, ...options })
  }, [])

  // Forces Lenis to re-measure its own cached scroll dimensions — needed by
  // GlassLogoPreview's own overflow-hidden scroll lock (see scrollLockActive
  // there): Lenis observes document.documentElement's size via a
  // ResizeObserver to compute its own internal scroll limit, and toggling
  // that same element's overflow to 'hidden' and back — confirmed directly,
  // by dumping Lenis's own live internal state through the sequence — left
  // that cached limit stuck at 0 (measured, apparently, while overflow was
  // still hidden) even once the lock released and overflow was restored,
  // silently clamping every future scrollTo() call (`clamp(0, target,
  // this.limit)`) back down to 0 forever after — wheel scrolling looked
  // completely dead from that point on, with no error or warning anywhere.
  // Calling this once the real overflow is back in place re-measures
  // against the now-correct DOM state, undoing that.
  const resize = useCallback(() => {
    lenisRef.current?.resize()
  }, [])

  return { scrollTo, resize }
}
