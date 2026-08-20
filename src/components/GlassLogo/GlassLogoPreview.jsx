import { useEffect, useRef, useState } from 'react'
import { useLenis } from '../../lib/useLenis'
import { ABOUT_US_TRANSITION } from './aboutUsTransition'
import AboutUsSection from './AboutUsSection'
import BackgroundGlowSection from './BackgroundGlowSection'
import ClientLogoCarousel from './ClientLogoCarousel'
import GlassLogoHero from './GlassLogoHero'
import SiteNavbar from './SiteNavbar'

export default function GlassLogoPreview() {
  // Lifted here (the nearest ancestor that both owns Lenis and sits above
  // GlassLogoHero) so the "AI for Achievers" grid button — several
  // components down, inside the hero's own canvas — can lock page scroll
  // while it's selected. See onScrollLockChange in GlassLogoHero for how
  // that state actually gets here.
  const [scrollLocked, setScrollLocked] = useState(false)
  // Whether the About Us overlay is showing — a pure visual toggle, not a
  // scroll position. AboutUsSection is a `position: fixed` overlay (see
  // there), not a real section in document flow, so opening/closing it
  // never *moves* real scroll: the top of the site stays GlassLogoHero at
  // real scrollY 0, always, exactly as before this feature existed. Both
  // GlassLogoHero's own slide-away and AboutUsSection's slide-in key off
  // this same flag, driven by the identical ABOUT_US_TRANSITION so the two
  // move in lockstep — see the comments on each.
  const [isAboutUsOpen, setIsAboutUsOpen] = useState(false)
  // Written by useLenis itself, for exactly as long as the forced
  // scroll-back-to-top animation (triggered by scrollLocked turning on) is
  // actually in flight — threaded back down to BackgroundGrid so it can
  // ignore hover on the *other* two buttons for that same window. Without
  // it, a hover landing on one of them purely because the page moved
  // underneath a stationary cursor (not because the user actually moved
  // toward it) would re-select it mid-animation, undoing the lock and
  // reading as a jittery, unfinished-looking scroll-back.
  const isForceScrollingRef = useRef(false)
  // scrollLocked (Achievers) OR scrollLockActive (About Us) — both go
  // through this same call, not two independent locks, so Lenis's own
  // internal scroll-position bookkeeping never falls out of sync with
  // reality. Driving the About Us lock purely through raw CSS overflow
  // (tried first) left Lenis itself still nominally "started" the whole
  // time — it kept listening for wheel input even while overflow:hidden
  // silently stopped that from reaching the DOM — confirmed directly,
  // scrollY stuck at 0 through a fresh, isolated wheel event, after the
  // same event worked fine before ever touching About Us. Running it
  // through useLenis's own lock/stop()/start() keeps Lenis's bookkeeping
  // authoritative, the same as Achievers already relies on.
  const [scrollLockActive, setScrollLockActive] = useState(false)
  const { scrollTo, resize } = useLenis(scrollLocked || scrollLockActive, isForceScrollingRef)
  // Everything about the About Us scroll-lock/dismiss state machine lives
  // in one persistent, mount-once effect using plain closure variables
  // (isLocked/isClosing below), not React state read across several
  // separately re-running effects (tried first, and genuinely raced):
  // splitting "detect a scroll-down dismiss while open" and "extend the
  // lock while closing" into two effects, each keyed off isAboutUsOpen,
  // meant the *second* effect's own wheel listener didn't exist yet for
  // the handful of milliseconds between the dismiss-triggering event and
  // React actually re-rendering with isAboutUsOpen=false — confirmed
  // directly, by logging every extend/release call against a live capture
  // of Lenis's own state: real trackpad-momentum wheel events landing in
  // that gap weren't caught by anything, so the lock could release while
  // the gesture was still ongoing, leaking a partial scroll through (and,
  // separately, revealed the Lenis dimension-cache bug fixed by resize()
  // above). A single listener that's always mounted and reacts to plain,
  // synchronously-updated local variables has no such gap: it's live for
  // the very first event of a gesture, not just the ones after React
  // catches up.
  const lockApiRef = useRef(null)
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    // Space/PageDown/ArrowDown/End — "scroll down"-shaped keyboard input,
    // for the same reason useLenis's own SCROLL_KEYS guard exists: wheel
    // alone misses keyboard-driven scrolling entirely.
    const DOWNWARD_KEYS = new Set([' ', 'Spacebar', 'PageDown', 'ArrowDown', 'End'])
    // The mirror image, for scrolling up from the hero into About Us below.
    const UPWARD_KEYS = new Set(['PageUp', 'ArrowUp', 'Home'])
    // Once wheel input has gone quiet for this long, the trailing momentum
    // from whatever dismissed About Us is assumed to be over. 250ms (tried
    // first) was too tight a margin: real momentum-scroll ticks don't
    // arrive on a perfectly steady cadence — they can space out noticeably,
    // especially as the deceleration nears zero — so a gap merely a little
    // larger than 250ms between two genuinely-still-decaying events was
    // enough to fire an early release mid-gesture, letting its remaining
    // tail scroll through for real — confirmed directly, by logging every
    // event's own timing against when release actually fired.
    const QUIET_PERIOD_MS = 450
    // A hard backstop on how long a single gesture's momentum can keep
    // re-arming the quiet-period timer — generous, no ordinary trackpad
    // flick's momentum runs anywhere near this long — purely so a visitor
    // who starts a genuinely new, deliberate scroll right after landing on
    // the hero isn't kept locked out indefinitely by their own next
    // gesture continuously re-arming this one.
    const WHEEL_CEILING_MS = 2500

    let isLocked = false
    let isClosing = false
    let releaseTimer = null
    let ceilingTimer = null
    // When the current dismiss() happened — lets onWheel tell "trailing
    // momentum from the dismiss gesture itself, still within the close
    // animation's own duration" apart from "a visitor who's simply resumed
    // scrolling down the real page, same as they would if this feature
    // didn't exist." Both look identical at the wheel-event level (more
    // deltaY>0 ticks while isClosing), but only the first is what
    // QUIET_PERIOD_MS's re-arming below exists to wait out — once the
    // close animation has actually finished, continuing to defer the
    // unlock by another QUIET_PERIOD_MS per tick has nothing left to
    // protect against, and it's what made an ordinary "keep scrolling down
    // after About Us closes" gesture feel like the page had stopped
    // responding — reported directly as "a couple of extra seconds before
    // the scroll actually happens."
    let dismissedAt = 0
    // The last time a wheel event was seen while real scrollY was still >0
    // — i.e., the page was genuinely still scrolling through the carousel/
    // glow sections, not yet resting at the hero. 0 (an effectively
    // infinite time ago relative to performance.now()) so a visitor who's
    // sitting at the hero from the very start can open About Us on their
    // first upward scroll, with nothing to "settle" from yet.
    let lastScrollingAt = 0
    // How long real scroll activity has to have been quiet before an
    // upward tick at scrollY 0 counts as a deliberate "open About Us" —
    // not just "not locked, and scrollY happens to be 0 this instant"
    // (tried first): a hard, fast scroll-up from deep in the carousel/glow
    // sections carries real momentum straight through scrollY 0 and keeps
    // firing wheel events for a while after arriving — reported directly,
    // scrolling up hard from below the hero could accidentally reveal
    // About Us, when the obvious intent was just "get back to the hero
    // quickly." Requiring a quiet gap since scrollY was last actually >0
    // before honoring an upward tick lets that same hard flick land
    // cleanly on the hero and stop, the same way it would if this feature
    // didn't exist at all, while a visitor already resting at the hero who
    // then deliberately scrolls up still opens it immediately.
    //
    // 450, not the original 900 — matching QUIET_PERIOD_MS below (the
    // dismiss side's own tuned answer to the same "how long can trailing
    // wheel momentum keep firing after a scroll gesture hits its stop"
    // question). 900 swallowed a *second*, genuinely deliberate upward
    // gesture whenever it started soon after landing on the hero — with
    // nothing left to actually scroll (already at scrollY 0), that second
    // gesture produced no feedback at all, reported directly as "the
    // scroll up doesn't register." If a hard flick's momentum turns out to
    // still poke through occasionally at 450 (worth checking — landing on
    // the hero from a fast flick should still always just land there, never
    // reveal About Us on its own), raise this back toward 900 rather than
    // dropping QUIET_PERIOD_MS instead, which is tuned against a separate,
    // already-confirmed regression.
    const ARRIVAL_SETTLE_MS = 450

    function lock() {
      if (isLocked) return
      isLocked = true
      html.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
      setScrollLockActive(true)
    }
    function unlock() {
      if (!isLocked) return
      isLocked = false
      isClosing = false
      clearTimeout(releaseTimer)
      clearTimeout(ceilingTimer)
      html.style.overflow = ''
      body.style.overflow = ''
      setScrollLockActive(false)
      // Lenis caches its own scroll limit off document.documentElement's
      // measured size via a ResizeObserver, and toggling that same
      // element's overflow to 'hidden' and back left that cache stuck at 0
      // — confirmed directly, by dumping Lenis's own live internal state
      // through the sequence — silently clamping every future scrollTo()
      // straight back to 0 with no error anywhere. Forcing a
      // re-measurement here, right after the real overflow is restored, is
      // what actually fixes it.
      resize()
    }
    function scheduleRelease(delay) {
      clearTimeout(releaseTimer)
      releaseTimer = setTimeout(unlock, delay)
    }

    // Called on every path that opens About Us: the nav link, and now
    // scrolling up (or an upward key) from the hero too. The instant,
    // unanimated jump to real scrollY 0 covers the nav-link path
    // specifically — a visitor could click "About Us" from anywhere on the
    // real page (scrolled down into the carousel/glow sections), and
    // sliding the hero down over content that isn't it would look wrong;
    // the scroll/key path never needs it (it only ever fires already at
    // scrollY 0 — see the guards in onWheel/onKeyDown below) but doing it
    // unconditionally is harmless there, not just for the click path. A
    // single discrete trigger either way — even the scroll/key path only
    // ever fires once per gesture (same guards) — so there's no trailing-
    // momentum concern here the way closing has: once locked, nothing this
    // function does needs undoing until a dismiss() actually happens.
    function open() {
      window.scrollTo(0, 0)
      setIsAboutUsOpen(true)
      lock()
    }
    // Called on every path that closes About Us (re-clicking it, the
    // logo, or the scroll-down/downward-key dismiss below) — the instant,
    // unanimated jump to real scrollY 0 guarantees a visitor landing back
    // on the hero from anywhere else (the carousel/glow sections) never
    // sees Hero's slide-back animation start from the wrong place, and
    // keeps the lock engaged through both the close animation's own
    // duration and however long the current gesture's momentum lasts.
    function dismiss() {
      window.scrollTo(0, 0)
      setIsAboutUsOpen(false)
      lock()
      isClosing = true
      dismissedAt = performance.now()
      clearTimeout(ceilingTimer)
      ceilingTimer = setTimeout(unlock, WHEEL_CEILING_MS)
      scheduleRelease(ABOUT_US_TRANSITION.duration * 1000)
    }

    // Scrolling up while already resting at the very top of the real page
    // (the hero, nothing above it in document flow) opens About Us — the
    // mirror of scrolling down while on About Us closing it back to the
    // hero. window.scrollY <= 0 alone, not just "not locked": scrolling up
    // from *inside* the carousel/glow sections should keep behaving like
    // plain scroll-back-toward-the-hero, not jump straight to About Us —
    // this only fires once there's nowhere further up left for a real
    // scroll to go, which is exactly when an *additional* upward wheel/key
    // tick is otherwise wasted input. See lastScrollingAt/
    // ARRIVAL_SETTLE_MS above for why scrollY<=0 alone still isn't quite
    // enough on its own.
    function isRestingAtTop() {
      return window.scrollY <= 0 && performance.now() - lastScrollingAt > ARRIVAL_SETTLE_MS
    }
    function onWheel(event) {
      if (window.scrollY > 0) lastScrollingAt = performance.now()
      if (isLocked && !isClosing) {
        if (event.deltaY > 4) dismiss()
        return
      }
      if (isClosing) {
        // Past the close animation's own duration, there's no more
        // trailing-momentum ambiguity left to wait out — see dismissedAt's
        // own comment above.
        if (performance.now() - dismissedAt >= ABOUT_US_TRANSITION.duration * 1000) {
          unlock()
        } else {
          scheduleRelease(QUIET_PERIOD_MS)
        }
        return
      }
      if (event.deltaY < -4 && isRestingAtTop()) open()
    }
    function onKeyDown(event) {
      if (isLocked && !isClosing) {
        if (DOWNWARD_KEYS.has(event.key)) dismiss()
        return
      }
      if (!isLocked && UPWARD_KEYS.has(event.key) && isRestingAtTop()) open()
    }

    lockApiRef.current = { open, dismiss }
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      clearTimeout(releaseTimer)
      clearTimeout(ceilingTimer)
    }
    // resize is itself a stable, [] -deps useCallback (see useLenis.js), so
    // listing it here doesn't turn this back into a re-running effect.
  }, [resize])
  // Shared here (the nearest common ancestor) so BackgroundGlowSection's own
  // grid-zoom effect can measure the carousel's real, current position/
  // height every frame (see carouselRef in BackgroundGlowSection) — a DOM
  // ref, not scroll math replicated from assumptions about the carousel's
  // own padding/font-size, so it keeps tracking correctly if that content
  // ever changes.
  const carouselRef = useRef(null)

  return (
    <>
      <SiteNavbar
        isAboutUsActive={isAboutUsOpen}
        onAboutUsClick={() => {
          // open()/dismiss() are the single source of truth for both
          // transitions now — the same two functions the scroll-up/scroll-
          // down gestures use (see the lock effect above), so a click and a
          // scroll always produce identical behavior.
          if (isAboutUsOpen) {
            lockApiRef.current?.dismiss()
          } else {
            lockApiRef.current?.open()
          }
        }}
        onLogoClick={() => {
          // Standard "logo = home" convention — brings you back to the hero
          // from either of the two ways you can currently be away from it:
          // closes the About Us overlay if it's open (via the same
          // dismiss() every other close path uses), or, if you're scrolled
          // further down the real page instead (the carousel/glow
          // sections), smoothly scrolls back up to it — the same Lenis-
          // damped pace as this piece's other scroll-linked motion (see
          // FORCE_SCROLL_LERP in useLenis.js), not an instant jump, since
          // there's no overlay here to hide a jump behind.
          if (isAboutUsOpen) {
            lockApiRef.current?.dismiss()
          } else {
            scrollTo(0)
          }
        }}
      />
      <GlassLogoHero
        isAboutUsOpen={isAboutUsOpen}
        onScrollLockChange={setScrollLocked}
        isForceScrollingRef={isForceScrollingRef}
      />
      <ClientLogoCarousel sectionRef={carouselRef} />
      <BackgroundGlowSection carouselRef={carouselRef} />
      <AboutUsSection isOpen={isAboutUsOpen} />
    </>
  )
}
