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
  const { scrollTo, resize, getTargetScroll } = useLenis(scrollLocked || scrollLockActive, isForceScrollingRef)
  // Everything about the About Us scroll-lock/dismiss state machine lives
  // in one persistent, mount-once effect using plain closure variables
  // (isLocked/isOpenNow and the per-gesture flags below), not React state
  // read across several
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
    // One physical wheel/trackpad gesture arrives as an unbroken burst of
    // events: first while the user's fingers are actually moving, then a
    // decaying momentum tail the OS keeps synthesizing after they've lifted
    // off. Within that burst events land every ~8-16ms.
    //
    // Nothing below ever *defers* acting on input. A gesture either takes
    // effect on its very first event or is ignored outright, and which one
    // is decided synchronously, from the events themselves. That's the
    // whole point: every earlier version of this file asked "how long
    // should I wait before deciding?" — quiet periods, arrival-settle
    // windows, ceilings, animation-duration holds — and every one of them
    // left a deliberate scroll sitting there doing nothing.
    //
    // A silence this long definitely ends a gesture, but silence alone is
    // not enough to *start* one: a momentum tail can run a second or two,
    // and waiting it out before honoring fresh input is exactly the bug
    // (reported directly: "I have to wait a couple of seconds until the
    // page allows me to scroll up"). See startsNewGesture below for the two
    // signals that catch a new push mid-tail, without any waiting at all.
    const GESTURE_END_MS = 150
    // Telling a genuine second push apart from the leftovers of the first
    // gesture is the whole problem, and it can't be done on timing alone.
    // These are tuned against a real trackpad flick captured from this page
    // (~200 events over two seconds) and replayed through this exact logic:
    //
    //   fingers down:  50 44 45 28 87 83 37 74 99 69 67 78 7 60 54 75 ...
    //   fingers lifted: 39 20 20 30 8 19 13 22 18 12 18 17 15 16 17 15 ...
    //
    // Both halves are noisy — the tail is *not* a clean monotonic decay
    // (assuming it was, and looking for a run of decreases, failed against
    // the real numbers). What does separate them is scale: a decaying tail
    // stays under an envelope that falls with it, while a fresh push jumps
    // well clear of that envelope. So track a decaying peak and treat
    // anything comfortably above it as a hand.
    //
    // The envelope has to fall *faster* than real momentum does or it sits
    // above the tail forever and nothing is ever detected; 0.85 per event
    // against momentum's own ~0.98 keeps it hugging the tail closely.
    const ENV_DECAY = 0.85
    // Two is not a round number picked for taste — replaying the captured
    // flick against a grid of settings, it is exactly the boundary: every
    // ratio below it lets some part of the flick's own fluctuation read as
    // a new push, which breaks the rules above.
    const PUSH_RATIO = 2
    // ...and an absolute floor, so the tail's own jitter down at single
    // digits can never clear the ratio on its own.
    const PUSH_MIN = 12
    // Releasing the scroll lock a dismiss took out is the one decision with
    // no second line of defence behind it: get it wrong and the flick that
    // closed About Us carries straight on past the hero. (Opening has one —
    // gestureScrolled — which is why opening can afford to trust `pushed`
    // on its own.) A swipe still in progress hovers near its own peak and
    // occasionally throws a spike big enough to look like a fresh push;
    // measured against the captured flick, one such spike came within 5% of
    // clearing the bar. So the lock additionally requires the gesture to
    // have actually spent itself: the envelope must have fallen to a small
    // fraction of this gesture's own peak. Momentum always decays there
    // eventually; a swipe that's still being driven never does.
    const SPENT_FRACTION = 0.4
    // The one genuinely load-bearing time guard, and only a short one:
    // measured from an open/dismiss, not from the gesture's start. Right
    // after a dismiss the same swipe is often still accelerating, and that
    // acceleration is indistinguishable from a fresh push — without this,
    // one hard flick down from About Us dismisses it and then unlocks
    // itself, carrying on into the carousel. Verified by removing it: the
    // rules break immediately.
    //
    // A longer, gesture-relative version of this used to sit alongside it
    // (the "ignore anything in the first 700ms" rule). Replaying the real
    // capture showed it earned nothing at all — the rules hold identically
    // with it set to zero, because what actually enforces them is
    // gestureScrolled and the lock, not elapsed time — while it did make a
    // quick second swipe wait for no reason. Removed.
    const RAMP_GUARD_MS = 200
    // Below this, a wheel event is sub-pixel jitter, not scroll intent.
    const MIN_DELTA = 4
    // Slack on the scroll *target* (see getTargetScroll in useLenis) — the
    // position the page is committed to, which lands exactly on 0 rather
    // than approaching it asymptotically, so this only needs to absorb
    // rounding.
    const TOP_EPSILON_PX = 2
    // ...and slack on the *visible* position, which is a different question
    // with a different answer. Lenis eases exponentially, so after a hard
    // flick back to the top the target pins at 0 while the page keeps
    // coasting down through the last hundred-ish pixels for the best part
    // of a second. Requiring the visible position to have fully arrived
    // (which it effectively never does) is what made scrolling *up* feel
    // laggy when scrolling down felt instant — dismissing has nothing to
    // travel, so it was never affected, which is exactly the asymmetry that
    // was reported. Once the target is spent, anything inside this much of
    // the top counts as arrived: open() snaps the remainder away in the
    // same frame the slide starts, so it isn't visible. Big enough to cover
    // the coast, small enough that a genuine mid-page scroll can't qualify
    // — and it can't anyway, since a scroll that still has somewhere to go
    // leaves a target above 0.
    const ARRIVING_EPSILON_PX = 120

    let isLocked = false
    // Whether About Us is currently showing. Tracked here as a plain local
    // (not read back off React state) so every handler below sees the value
    // the *previous* event already established, with no re-render in
    // between — the same reason this whole state machine lives in one
    // mount-once effect (see the comment on lockApiRef above).
    let isOpenNow = false
    let gestureTimer = null
    let fallbackTimer = null
    // Set the moment this gesture does any real page scrolling at all. A
    // hard flick up from the carousel/glow sections *is* a scrolling
    // gesture: its momentum keeps firing events long after it has already
    // carried the page to the top, and honoring those would reveal About Us
    // off the back of a gesture that only ever meant "get me back to the
    // hero." Because this is per-gesture rather than a time window, the
    // very next gesture — a genuinely separate, deliberate one — opens
    // About Us on its own first event, with nothing to wait out.
    let gestureScrolled = false
    // Set once this gesture has already opened or dismissed, so the rest of
    // its own momentum can't immediately undo what it just did (or sail on
    // through into the section beyond).
    let gestureUsed = false
    // Set by a wheel-driven dismiss: the scroll lock it takes out is
    // released when that gesture's momentum actually dies, not on a timer —
    // or the instant a genuinely new push arrives, whichever comes first.
    let unlockWhenGestureEnds = false
    // Rolling shape of the event stream, for classifyEvent below.
    let lastEventAt = 0
    let lastAbsDelta = 0
    let lastDir = 0
    let lastActionAt = 0
    // Decaying peak of recent deltas — see ENV_DECAY. Kept across gesture
    // boundaries on purpose: once a tail has decayed away, the first event
    // of whatever comes next stands well clear of it, which is exactly what
    // makes it recognisable as a new push.
    let envelope = 0
    // Largest delta seen in the gesture currently in flight — the yardstick
    // SPENT_FRACTION measures the envelope against. Reset per gesture, so
    // "spent" is relative to how hard this particular flick was.
    let gesturePeak = 0
    // When the page's real scroll position last actually changed. Wheel
    // cadence alone can lie on a machine that janks — a long enough stall
    // mid-gesture looks exactly like the gap that separates two gestures —
    // whereas this reflects what the page is genuinely doing, so it's the
    // sturdier half of the "is the previous gesture still playing out?"
    // question. Used only to gate opening About Us, which is the one thing
    // that must never happen off a flick's leftovers.
    let lastScrollMoveAt = 0
    function onScroll() {
      lastScrollMoveAt = performance.now()
    }
    const SCROLL_SETTLE_MS = 150

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

    // The current gesture's momentum has actually stopped — the per-gesture
    // flags reset here, and a dismiss that was holding the scroll lock open
    // for exactly this long finally releases it.
    //
    // lastAbsDelta/lastDir/envelope deliberately survive: they describe the
    // shape of the stream, not the gesture, and the *next* event needs them
    // to still be there. Clearing them (tried first) meant a push arriving
    // shortly after a tail petered out had nothing to be a rise out of, so
    // it wasn't recognised as deliberate and could be held back while the
    // page was still easing to a stop — the exact "I scrolled and had to
    // wait" this is meant to eliminate.
    function endGesture() {
      gestureScrolled = false
      gestureUsed = false
      if (unlockWhenGestureEnds) {
        unlockWhenGestureEnds = false
        unlock()
      }
    }

    // Is this event the start of a genuinely new push, rather than more of
    // the gesture already in flight? Answered from the shape of the stream
    // itself, so a new push is honored the instant it lands — never after
    // waiting for the previous gesture's momentum to run out.
    //
    // Three signals, and the distinction between them matters:
    //  - a real gap in the stream. Usually means the previous tail died,
    //    but it's the one signal a janky frame can fake, so it marks a
    //    gesture boundary without on its own proving a hand was involved.
    //  - a reversal of direction. A decaying tail never turns around, so an
    //    upward flick's momentum can't be mistaken for the downward push a
    //    visitor makes to leave About Us again (reported directly: "once
    //    I'm in About Us, it takes a couple of tries to scroll down").
    //  - a delta standing clear of the decaying envelope: a hand pushing
    //    again, however soon after the last one. See ENV_DECAY/PUSH_RATIO.
    //
    // The last two can only come from a person, so they're reported
    // separately as `deliberate` — see how the open path below trusts them
    // over the page's own still-settling motion, and trusts nothing else.
    function classifyEvent(delta, absDelta, now) {
      const dir = Math.sign(delta)
      const gapped = now - lastEventAt > GESTURE_END_MS
      if (gapped) gesturePeak = 0
      const reversed = dir !== 0 && lastDir !== 0 && dir !== lastDir
      // Read before the envelope absorbs this event — otherwise a push's
      // own first tick raises the bar its next ticks are measured against,
      // and a gentle one ends up masking itself.
      const pushed =
        absDelta >= PUSH_MIN &&
        absDelta > envelope * PUSH_RATIO &&
        now - lastActionAt >= RAMP_GUARD_MS
      // See SPENT_FRACTION — read before the update too, for the same reason.
      const spent = gesturePeak > 0 && envelope <= gesturePeak * SPENT_FRACTION
      envelope = Math.max(absDelta, envelope * ENV_DECAY)
      gesturePeak = Math.max(gesturePeak, absDelta)
      const deliberate = reversed || pushed
      return {
        fresh: gapped || deliberate,
        deliberate,
        // A reversal or a real pause proves a new gesture outright; a push
        // only counts here once this gesture has visibly run down.
        releasesLock: gapped || reversed || (pushed && spent),
      }
    }

    // Called on every path that opens About Us: the nav link, and scrolling
    // up (or an upward key) from the hero.
    //
    // The instant, unanimated jump to real scrollY 0 is for the nav-link
    // path — a visitor could click "About Us" from anywhere on the real
    // page (scrolled down into the carousel/glow sections), and sliding the
    // hero down over content that isn't it would look wrong. It is
    // deliberately skipped when the page is merely coasting the last
    // stretch to a top it's already committed to (see ARRIVING_EPSILON_PX):
    // there, snapping is both unnecessary and visible — it read as the
    // screen "cutting" mid-scroll, reported directly. Leaving it alone lets
    // lock() below hand the remaining distance to useLenis's own animated
    // scroll-to-top, which eases it away smoothly underneath the slide.
    function open() {
      if (getTargetScroll() > TOP_EPSILON_PX) window.scrollTo(0, 0)
      isOpenNow = true
      setIsAboutUsOpen(true)
      lock()
    }
    // Called on every path that closes About Us (re-clicking it, the logo,
    // or the scroll-down/downward-key dismiss below). The instant,
    // unanimated jump to real scrollY 0 guarantees a visitor landing back
    // on the hero from anywhere else never sees Hero's slide-back animation
    // start from the wrong place.
    //
    // The lock stays on until the dismissing gesture's own momentum dies
    // (see endGesture) rather than for a fixed stretch of time. Holding it
    // for the close animation's duration instead — what this did before —
    // was wrong in both directions at once: too short for a hard flick,
    // whose momentum outlives the animation and then leaked straight
    // through into the carousel below (reported directly: "scroll down hard
    // from About Us and you land on the Placeholder page"), and too long
    // for an ordinary one, which left the page feeling stuck for a beat
    // after About Us had visibly gone. Tying it to the input itself is both
    // stricter and faster: the gesture that closed About Us can never also
    // scroll past the hero, and the next gesture is free immediately.
    // fallbackTimer covers the click paths, which have no gesture to end.
    function dismiss() {
      window.scrollTo(0, 0)
      isOpenNow = false
      setIsAboutUsOpen(false)
      lock()
      unlockWhenGestureEnds = true
      clearTimeout(fallbackTimer)
      fallbackTimer = setTimeout(() => {
        unlockWhenGestureEnds = false
        unlock()
      }, ABOUT_US_TRANSITION.duration * 1000)
    }

    function onWheel(event) {
      const delta = event.deltaY
      const absDelta = Math.abs(delta)
      const now = performance.now()
      const { fresh, deliberate, releasesLock } = classifyEvent(delta, absDelta, now)

      lastEventAt = now
      if (absDelta >= MIN_DELTA) {
        lastAbsDelta = absDelta
        lastDir = Math.sign(delta)
      }
      if (fresh) {
        gestureScrolled = false
        gestureUsed = false
      }
      // A genuinely new request must never be held back by the *previous*
      // gesture's leftover scroll lock — releasing it right here is what
      // lets a visitor keep scrolling down past the hero the moment they
      // actually ask to, instead of once the dismissing flick's momentum
      // finally runs out. Gated more tightly than `fresh` is: see
      // releasesLock/SPENT_FRACTION for why this one decision can't afford
      // to trust a mid-swipe spike.
      if (releasesLock && unlockWhenGestureEnds) {
        unlockWhenGestureEnds = false
        unlock()
      }
      // Once a real gesture is in play, it — not the click-path fallback in
      // dismiss() — owns when the lock releases.
      if (unlockWhenGestureEnds) clearTimeout(fallbackTimer)
      clearTimeout(gestureTimer)
      gestureTimer = setTimeout(endGesture, GESTURE_END_MS)

      // Judged on the target, not the eased position: a flick that has
      // already spent all its scroll must stop re-arming this while the
      // page merely coasts the last pixels, or the coast itself keeps
      // blocking the visitor's next request. See ARRIVING_EPSILON_PX.
      if (getTargetScroll() > TOP_EPSILON_PX) gestureScrolled = true
      if (absDelta < MIN_DELTA) return

      if (isOpenNow) {
        // A downward push closes About Us on the first event that asks for
        // it — but only one per gesture: gestureUsed swallows the rest of
        // the same burst so a hard flick can't close it *and* carry on into
        // the carousel in a single go.
        if (delta > 0 && !gestureUsed) {
          gestureUsed = true
          lastActionAt = now
          dismiss()
        }
        return
      }
      // Locked but not open: the tail of a gesture that just dismissed.
      // Deliberately inert — see dismiss().
      if (isLocked) return

      // At the top of the real page there's nothing above the hero left for
      // an upward push to scroll, so it opens About Us — immediately, on
      // the gesture's very first event.
      //
      // Two independent things keep a hard flick up from *below* the hero
      // from doing this off its own leftovers, because this is the case
      // that must never misfire: gestureScrolled (that gesture already
      // spent itself scrolling, so it isn't asking for anything more), and
      // the page's own motion — while it's still visibly easing to a stop,
      // an upward event is assumed to belong to whatever is already in
      // flight. Only a `deliberate` event overrides the second one, since a
      // reversal or a fresh shove is something momentum cannot produce. A
      // plain gap can't, deliberately: that's the signal a stalled frame
      // can imitate, and trusting it here is what would let a stutter
      // reveal About Us mid-flick.
      // "Nowhere left above to scroll to" is a question about the scroll
      // target, not about where the easing happens to have got to — with
      // the visible position only used to make sure the leftover snap is
      // small enough not to be seen. See ARRIVING_EPSILON_PX.
      const atTop =
        getTargetScroll() <= TOP_EPSILON_PX && window.scrollY <= ARRIVING_EPSILON_PX
      const pageStillSettling = now - lastScrollMoveAt < SCROLL_SETTLE_MS
      if (delta < 0 && !gestureScrolled && !gestureUsed && atTop && (!pageStillSettling || deliberate)) {
        gestureUsed = true
        lastActionAt = now
        open()
      }
    }
    // Keyboard scrolling has no momentum tail, so each keypress is its own
    // discrete gesture and none of the per-gesture guards above apply.
    function onKeyDown(event) {
      if (isOpenNow) {
        if (DOWNWARD_KEYS.has(event.key)) dismiss()
        return
      }
      if (isLocked) return
      if (UPWARD_KEYS.has(event.key) && getTargetScroll() <= TOP_EPSILON_PX) open()
    }

    lockApiRef.current = { open, dismiss }
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll)
      clearTimeout(gestureTimer)
      clearTimeout(fallbackTimer)
    }
    // resize/getTargetScroll are both stable, [] -deps useCallbacks (see
    // useLenis.js), so listing them here doesn't turn this back into a
    // re-running effect.
  }, [resize, getTargetScroll])
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
