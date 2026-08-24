import { useEffect, useRef, useState } from 'react'
import { animate, useMotionValue } from 'framer-motion'
import { useLenis } from '../../lib/useLenis'
import {
  ABOUT_US_CLOSE_TRANSITION,
  ABOUT_US_HURRY_CLOSE_TRANSITION,
  ABOUT_US_OPEN_TRANSITION,
  getAboutUsTransition,
} from './aboutUsTransition'
import AboutUsSection from './AboutUsSection'
import BackgroundGlowSection from './BackgroundGlowSection'
import ClientLogoCarousel from './ClientLogoCarousel'
import GlassLogoHero from './GlassLogoHero'
import { createGestureClassifier, GESTURE_END_MS } from './scrollGestureClassifier'
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
  // This flag is only the *request*; what actually moves is aboutUsProgress
  // below, which both GlassLogoHero's slide-away and AboutUsSection's
  // slide-in are derived from directly, so they cannot be anywhere but one
  // screen apart — see the comments on each.
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
  // How far the page still had left to coast when About Us opened, as a
  // negative pixel offset applied to GlassLogoHero and AboutUsSection alike
  // — the one piece of state that lets open() snap real scroll to the top
  // without that snap being seen.
  //
  // Opening while the page is mid-coast is the normal case, not an edge one
  // (see ARRIVING_EPSILON_PX): a second swipe up is honored the instant it
  // lands, which is generally a beat before Lenis has finished easing to
  // the top. That leaves real scrollY somewhere above 0, and everything
  // downstream of that is a problem:
  //  - leave the page there and the viewport's bottom edge is showing
  //    ClientLogoCarousel, which paints *over* the descending hero (later
  //    sibling, both position: relative, so DOM order decides) and so stays
  //    visible for the whole coast. Reported directly, as the client banner
  //    appearing along the bottom of an opening About Us.
  //  - snap the page to 0 and everything in flow jumps down by that same
  //    distance in one frame, which is the "cut" reported before it.
  // Both are the same fact seen from two sides: the reveal cannot start
  // until the page is at the top, and getting it there takes real distance.
  //
  // So: snap real scroll to 0 (the carousel goes off-screen where it
  // belongs) and hand that distance to a transform instead, which puts the
  // two sliding sections back exactly where they were painted a frame
  // earlier and then eases it off. Driven by ABOUT_US_OPEN_TRANSITION, the
  // same spring instance the slide itself uses, for the reason every other
  // piece of this reveal shares it: applied identically to both sections,
  // one spring can't drift, so the two stay exactly one screen apart at
  // every instant and the seam never opens. All it costs is a sliver of
  // page background below the hero for the first ~100ms, until the slide
  // itself has travelled further than the offset being undone.
  const openScrollComp = useMotionValue(0)
  // How far the About Us reveal has got, 0 (closed) to 1 (open). Every
  // moving part of it is a pure function of this one number: GlassLogoHero's
  // slide is `p * 100%`, AboutUsSection's is `(p - 1) * 100%` — one screen
  // apart by construction, at any value of p, with no second animation that
  // could be anywhere else — and both grids' zoom is the same p again (see
  // ABOUT_US_GRID_ZOOM_SCALE), so the two sides of the seam are always at
  // the same cell size too.
  //
  // That the seam holds is arithmetic here, not coordination. It used to be
  // four separate animations started from one shared spring *config*, which
  // is not the same thing and does not survive being interrupted.
  //
  // One value animated once here, rather than each canvas animating its own
  // copy from the same shared spring *config*, which is what this used to be
  // — and which is not the same thing at all. Two springs agree only for as
  // long as neither is interrupted: they live in separate react-three-fiber
  // roots, so they don't even start on the same tick, and an interrupted
  // spring restarts from wherever *it* had got to, at its own velocity. Toggle
  // About Us slowly and both always land on a clean 0 or 1, so nothing shows;
  // toggle it fast enough to keep cutting them off mid-flight and that initial
  // sliver of difference is carried into each restart and compounds, until
  // the two grids are visibly at different cell sizes across the seam.
  // Reported exactly that way — a mismatch that depends on how fast you
  // scroll back and forth. Sharing the value itself, not the recipe for it,
  // is what makes them incapable of disagreeing.
  const aboutUsProgress = useMotionValue(0)
  useEffect(() => {
    const controls = animate(aboutUsProgress, isAboutUsOpen ? 1 : 0, getAboutUsTransition(isAboutUsOpen))
    return () => controls.stop()
  }, [isAboutUsOpen, aboutUsProgress])
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
    // Nothing below ever *defers* acting on input. A gesture either takes
    // effect on its very first event or is ignored outright, and which one
    // is decided synchronously, from the events themselves. That's the
    // whole point: every earlier version of this file asked "how long
    // should I wait before deciding?" — quiet periods, arrival-settle
    // windows, ceilings, animation-duration holds — and every one of them
    // left a deliberate scroll sitting there doing nothing. See
    // scrollGestureClassifier.js for how a genuinely new push is told apart
    // from the gesture already in flight, without ever waiting to decide.
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
    // Holds the in-flight scroll-compensation animation (see openScrollComp
    // above) so a second open can't stack a new one on top of it.
    let compAnimation = null
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
    // Rolling shape of the event stream — see scrollGestureClassifier.js.
    const classifier = createGestureClassifier()
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
    // The classifier's own state deliberately survives: it describes the
    // shape of the stream, not the gesture, and the *next* event needs it
    // to still be there. Clearing it (tried first) meant a push arriving
    // shortly after a tail petered out had nothing to be a rise out of, so
    // it wasn't recognised as deliberate and could be held back while the
    // page was still easing to a stop — the exact "I scrolled and had to
    // wait" this is meant to eliminate.
    function endGesture() {
      gestureScrolled = false
      gestureUsed = false
      // Used to also release a dismiss's scroll lock right here, the
      // instant the dismissing gesture's own momentum died down (often
      // under a second) — see dismiss()'s fallbackTimer for why that's no
      // longer this function's job.
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
    // screen "cutting" mid-scroll, reported directly. Two rounds of trying
    // to avoid the snap outright (skipping it while merely coasting, then
    // deferring the scroll lock so it couldn't clamp the page either) both
    // failed the same way, because they were the wrong half of the problem:
    // whatever else is true, real scroll has to *be* at 0 for this reveal,
    // or the viewport's bottom edge is showing the section below the hero
    // (see openScrollComp). So the snap is unconditional again, and the
    // distance it covers is handed to openScrollComp to put back visually
    // and ease away — which is what makes it unseen rather than merely
    // skipped.
    //
    // The two cases differ in whether that compensation applies at all.
    // Arriving here from a scroll-up, the page is already committed to the
    // top and only the last stretch of coast is left, which is exactly what
    // wants putting back. From the nav link, a visitor can be anywhere on
    // the real page, and starting Hero's slide from thousands of pixels up
    // would be nonsense — that jump is the intended behavior, not an
    // artifact, so it stays a plain snap.
    function open() {
      const committedToTop = getTargetScroll() <= TOP_EPSILON_PX
      const residualPx = window.scrollY
      if (residualPx > TOP_EPSILON_PX) {
        window.scrollTo(0, 0)
        if (committedToTop) {
          compAnimation?.stop()
          openScrollComp.set(-residualPx)
          compAnimation = animate(openScrollComp, 0, ABOUT_US_OPEN_TRANSITION)
        }
      }
      isOpenNow = true
      setIsAboutUsOpen(true)
      // Reopening while a close is still playing: drop that close's pending
      // release, or it fires partway through this open and unlocks the page
      // underneath it. Cheap here, and it used to happen for free — the
      // preempting unlock this replaces cleared the same flag on the way
      // past (see dismiss).
      unlockWhenGestureEnds = false
      hurrying = false
      clearTimeout(fallbackTimer)
      lock()
    }
    // Called on every path that closes About Us (re-clicking it, the logo,
    // or the scroll-down/downward-key dismiss below). The instant,
    // unanimated jump to real scrollY 0 guarantees a visitor landing back
    // on the hero from anywhere else never sees Hero's slide-back animation
    // start from the wrong place.
    //
    // The lock stays on for the close animation's own duration (fallbackTimer
    // below) rather than releasing the instant the dismissing gesture's own
    // momentum dies down, which — briefly, earlier today — is what this did
    // instead. That was both faster *and* wrong: a hard flick down from About
    // Us can settle in well under a second, long before Hero and the grid
    // behind it have finished visually sliding back into place, so real
    // scroll started moving again mid-animation — reported directly, as the
    // still-retreating grid ending up on top of Hero's logo. Rule 1 (a
    // dismissing flick, however hard, only ever lands on the hero — never
    // below — see releasesLock/SPENT_FRACTION) already means that gesture's
    // own momentum was never going anywhere during this wait regardless, so
    // holding it a little longer costs that gesture nothing.
    //
    // This timer is now the *only* thing that releases the lock. A genuinely
    // new, separate gesture arriving mid-close used to preempt it and unlock
    // on the spot, on the reasoning that a fresh request must never be made
    // to wait — which is true of every other decision in this file, and
    // wrong here, because it reopened the exact hole the hold was added to
    // close. AboutUsSection is a fixed, z-10 overlay: it does not move with
    // real scroll, so a page allowed to scroll while the close is still
    // playing does not leave it behind, it slides *under* it, and whatever
    // is left of the About Us backdrop sits over the top of the screen for
    // the rest of the animation. Reported directly, scrolling down from
    // About Us toward the section below and still seeing About Us up there.
    // A slow scroll is the worst case, not the best one: its events are far
    // enough apart to read as new gestures (see GESTURE_END_MS), where one
    // continuous flick is a single gesture that never asks to preempt at
    // all.
    //
    // The cost is real and deliberate: continued scrolling is ignored, not
    // queued, until the close has visually finished. Everything the reveal
    // owns is exactly one screen tall, so there is no partial state to hand
    // over mid-flight — the page either belongs to the reveal or to the
    // document, and the reveal's own duration is how long that is. Shorten
    // ABOUT_US_CLOSE_TRANSITION (already split from the open direction for
    // this kind of reason) to trade feel against that wait.
    function dismiss() {
      window.scrollTo(0, 0)
      isOpenNow = false
      setIsAboutUsOpen(false)
      lock()
      unlockWhenGestureEnds = true
      clearTimeout(fallbackTimer)
      // unlockWhenGestureEnds is re-checked when this fires, not just here:
      // open() clears it, so a visitor who reopens About Us mid-close never
      // has this land afterwards and quietly unlock the page under an open
      // overlay.
      fallbackTimer = setTimeout(() => {
        if (!unlockWhenGestureEnds) return
        unlockWhenGestureEnds = false
        unlock()
      }, ABOUT_US_CLOSE_TRANSITION.duration * 1000)
    }

    // The visitor has dismissed About Us and is already pushing on down the
    // page. Retarget the close — every part of it, since all of it is one
    // motion value now — to land in ABOUT_US_HURRY_CLOSE_TRANSITION instead
    // of the leisurely close it's partway through, and release the lock the
    // moment it lands rather than on dismiss()'s own timer. animate() on a
    // motion value supersedes whatever that value was already running, so
    // there is nothing to stop first; the timer stays armed underneath as a
    // backstop and its own unlockWhenGestureEnds check makes it a no-op once
    // this has fired.
    let hurrying = false
    function hurryClose() {
      if (hurrying || isOpenNow) return
      hurrying = true
      animate(aboutUsProgress, 0, ABOUT_US_HURRY_CLOSE_TRANSITION).then(() => {
        hurrying = false
        if (!unlockWhenGestureEnds) return
        unlockWhenGestureEnds = false
        unlock()
      })
    }

    function onWheel(event) {
      const delta = event.deltaY
      const absDelta = Math.abs(delta)
      const now = performance.now()
      const { fresh, deliberate } = classifier.classify(delta, absDelta, now)

      classifier.lastEventAt = now
      if (absDelta >= MIN_DELTA) {
        classifier.lastDir = Math.sign(delta)
      }
      if (fresh) {
        gestureScrolled = false
        gestureUsed = false
      }
      // A new downward gesture arriving mid-close doesn't get to unlock
      // early — see dismiss() for what scrolling out from under a fixed
      // overlay looks like — but it does get the close to stop dawdling.
      // `fresh` rather than the classifier's releasesLock: identical value
      // (releasesLock is what fresh is derived from), and this is the one
      // call site left, so it reads off the flag it actually means.
      if (fresh && delta > 0 && unlockWhenGestureEnds) hurryClose()
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
          classifier.lastActionAt = now
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
        classifier.lastActionAt = now
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
      compAnimation?.stop()
    }
    // resize/getTargetScroll are both stable, [] -deps useCallbacks (see
    // useLenis.js), so listing them here doesn't turn this back into a
    // re-running effect.
  }, [resize, getTargetScroll, openScrollComp, aboutUsProgress])
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
          // SCROLL_LERP in useLenis.js), not an instant jump, since
          // there's no overlay here to hide a jump behind.
          if (isAboutUsOpen) {
            lockApiRef.current?.dismiss()
          } else {
            scrollTo(0)
          }
        }}
      />
      <GlassLogoHero
        openScrollComp={openScrollComp}
        aboutUsProgress={aboutUsProgress}
        onScrollLockChange={setScrollLocked}
        isForceScrollingRef={isForceScrollingRef}
      />
      <ClientLogoCarousel sectionRef={carouselRef} />
      <BackgroundGlowSection carouselRef={carouselRef} />
      <AboutUsSection isOpen={isAboutUsOpen} openScrollComp={openScrollComp} aboutUsProgress={aboutUsProgress} />
    </>
  )
}
