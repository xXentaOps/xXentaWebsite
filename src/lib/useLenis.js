import { useCallback, useEffect, useRef } from 'react'
import Lenis from 'lenis'
import { createScrollDetent } from './scrollDetent'

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

// The one damping rate every scroll on this piece runs at: ordinary wheel
// scrolling (handed to Lenis's own constructor below), the forced scroll-
// back-to-top, the logo's scroll-to-hero, and — exported for it — the
// hand-driven About Us close in GlassLogoPreview, which is scrolling in
// every sense except that what it moves is the reveal rather than the page,
// and so has to carry the identical weight or the handover between them is
// felt as a change of pace.
//
// Lenis's lerp-based scrolling damps toward its target exactly like
// MathUtils.damp elsewhere on this piece — internally, `lerp * 60` becomes
// that damp call's own lambda, so this is directly comparable to (and tuned
// to sit close to) TILT_LAMBDA in GlassLogoGroup. Lenis's default lerp (0.1
// → lambda 6) read as noticeably brisker than that, jarring next to how
// weighted everything else here feels — this trims it down to lambda 4.5,
// the same "heavier" pace, without slowing it enough to feel sluggish for
// what's otherwise a large, fast scroll distance.
//
// Applying it to plain wheel scrolling too (rather than only to the
// programmatic scrolls, which is all it used to cover) is what makes the
// weight actually consistent: moving between the hero and the section below
// it is exactly one screen of travel, the same journey as moving between
// the hero and About Us — but that one is a 1.6s spring while this was
// still running at Lenis's brisk default, so ordinary scrolling felt
// distinctly *lighter* than the reveal it sits next to (reported directly).
// One lambda for every way the page moves means there's nothing left for
// either to feel light or heavy against.
export const SCROLL_LERP = 0.075

export function useLenis(locked = false, isForceScrollingRef) {
  const lenisRef = useRef(null)
  const scrollDetentRef = useRef(createScrollDetent())

  useEffect(() => {
    // See SCROLL_LERP — passed here, not just to the scrollTo calls below,
    // so a visitor's own wheel scrolling carries the same weight as every
    // scroll this file performs on their behalf.
    function handleVirtualScroll(data) {
      const lenis = lenisRef.current
      const currentScroll = lenis?.animatedScroll ?? window.scrollY
      const targetScroll = lenis?.targetScroll ?? currentScroll
      return scrollDetentRef.current.handleVirtualScroll(data, currentScroll, targetScroll)
    }

    const lenis = new Lenis({ lerp: SCROLL_LERP, virtualScroll: handleVirtualScroll })
    lenisRef.current = lenis
    if (typeof window !== 'undefined') window.__lenis = lenis

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => {
      if (typeof window !== 'undefined') delete window.__lenis
      lenis.destroy()
    }
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
        lerp: SCROLL_LERP,
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

  useEffect(() => {
    function onKeyDown(event) {
      const currentScroll = lenisRef.current?.animatedScroll ?? window.scrollY
      scrollDetentRef.current.handleKeyDown(event, currentScroll, (target) => {
        lenisRef.current?.scrollTo(target, { lerp: SCROLL_LERP })
      })
    }

    window.addEventListener('keydown', onKeyDown, { passive: false })
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // General-purpose smooth scroll for callers outside the locked/forced
  // mechanism above — currently just the xXenta logo (see onLogoClick in
  // GlassLogoPreview), which needs to animate back to the hero on demand
  // when clicked from further down the page (the carousel/glow sections),
  // with no locking behavior of its own once it gets there. SCROLL_LERP
  // as the default (not Lenis's own, brisker default) gives it the same
  // "weighted" pace as the rest of this piece's scroll-linked motion.
  const scrollTo = useCallback((target, options = {}) => {
    const { duration, easing, lerp, ...rest } = options
    if (duration !== undefined) {
      lenisRef.current?.scrollTo(target, { duration, easing, ...rest })
    } else {
      lenisRef.current?.scrollTo(target, { lerp: lerp ?? SCROLL_LERP, ...rest })
    }
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

  // Where the page is *committed* to ending up, as opposed to where it has
  // eased to so far. Lenis approaches its target exponentially, so after a
  // hard flick back to the top the target pins at 0 while the visible
  // position keeps coasting down through the last hundred-odd pixels for
  // the best part of a second. Callers that need to know "is there anything
  // left above to scroll to" want this, not window.scrollY — see
  // GlassLogoPreview, where using the eased position made a deliberate
  // second scroll-up sit and wait for that coast to finish before it would
  // open About Us.
  const getTargetScroll = useCallback(() => lenisRef.current?.targetScroll ?? window.scrollY, [])

  // Allows sticky sections (such as BackgroundGlowSection's DRP Showcase Introduction)
  // to register an intentional stopping point. Any continuous scrolling or momentum
  // originating from above halts cleanly at the threshold, requiring a separate,
  // intentional downward scroll gesture to unlatch and proceed.
  const setDetent = useCallback((config) => {
    scrollDetentRef.current.setConfig(config ? {
      ...config,
      currentScroll: lenisRef.current?.targetScroll ?? window.scrollY,
    } : null)
  }, [])

  // Allows freezing scroll input during transitions without resetting scroll position.
  const stop = useCallback(() => {
    lenisRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    lenisRef.current?.start()
  }, [])

  return { scrollTo, resize, getTargetScroll, setDetent, stop, start }
}

