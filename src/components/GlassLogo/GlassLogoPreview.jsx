import { useEffect, useRef, useState } from 'react'
import { animate, useMotionValue } from 'framer-motion'
import { SCROLL_LERP, useLenis } from '../../lib/useLenis'
import {
  ABOUT_US_CLOSE_TRANSITION,
  ABOUT_US_CLOSE_COMMIT_OMEGA,
  ABOUT_US_OPEN_TRANSITION,
  getAboutUsTransition,
} from './aboutUsTransition'
import AboutUsSection from './AboutUsSection'
import BackgroundGlowSection from './BackgroundGlowSection'
import ClientLogoCarousel from './ClientLogoCarousel'
import FrameRateMeter from './FrameRateMeter'
import GlassLogoHero from './GlassLogoHero'
import { createGestureClassifier, GESTURE_END_MS } from './scrollGestureClassifier'
import SiteFooter from './SiteFooter'
import SiteNavbar from './SiteNavbar'

// Read once, at module scope: it never changes for the life of the page, and
// this keeps it out of every render. See FrameRateMeter — ?fps to show it.
const SHOW_FRAME_RATE = new URLSearchParams(window.location.search).has('fps')

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
  // real scrollY 0, always, exactly as before this feature existed.
  //
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
  // is not the same thing at all: two springs agree only for as long as
  // neither is interrupted. They live in separate react-three-fiber
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
  // Whatever animation is currently driving that value, so the scroll-lock
  // effect below can stop it and take the reveal over by hand — see
  // driveCloseWithScroll. Written on every start, including its own.
  const progressAnimRef = useRef(null)
  useEffect(() => {
    const controls = animate(aboutUsProgress, isAboutUsOpen ? 1 : 0, getAboutUsTransition(isAboutUsOpen))
    progressAnimRef.current = controls
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
  // AboutUsSection's own imperative handle — currently just closeTeam, for
  // the navbar's "About Us" click below to back out of the Meet the Team
  // stage without dismissing the whole overlay (see that handle's own
  // comment in AboutUsSection.jsx).
  const aboutUsSectionRef = useRef(null)
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
    // How long after a dismiss the scroll lock may be held at the very most,
    // whatever the event stream is doing. Comfortably past both the close
    // animation and any real momentum tail, so it never fires in normal use
    // — it exists so that the release has one trigger a visitor cannot
    // influence at all. See gestureEndedSinceDismiss.
    const CLOSE_HOLD_CEILING_MS = 2600

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
    // Whether this gesture started below the hero — see where it is set. A
    // per-gesture fact, deliberately, not a per-event one.
    let gestureStartedAtTop = false
    // Set once this gesture has already opened or dismissed, so the rest of
    // its own momentum can't immediately undo what it just did (or sail on
    // through into the section beyond).
    let gestureUsed = false
    // Set by a wheel-driven dismiss: the scroll lock it takes out is
    // released when that gesture's momentum actually dies, not on a timer —
    // or the instant a genuinely new push arrives, whichever comes first.
    let unlockWhenGestureEnds = false
    // The two halves of "the reveal has finished with the page": the close
    // animation having played out, and the gesture that started it having
    // actually stopped. See dismiss() for why waiting on either alone was
    // wrong, in opposite directions.
    let closeAnimationDone = false
    // Whether any gesture has genuinely ended since About Us was dismissed.
    // The scroll drive releases the lock, so it must only ever be reachable
    // by a gesture that is not the dismissing one — and `fresh` is not proof
    // of that: it is the classifier's best reading of a stream, and a spike
    // deep in a hard flick's own tail can still read as a new push. That is
    // enough to release the lock mid-flick and let the rest of that same
    // flick carry the page past the hero. Requiring the momentum to have
    // actually stopped once cannot be faked by anything inside a single
    // gesture. The cost is that a second swipe landing *during* the first
    // one's tail no longer drives the close — it waits for the ordinary
    // release instead, which is the right way round: a missed acceleration
    // is a smaller wrong than a broken rule.
    //
    // It is set from two places, and the pair of them is the whole point.
    //
    // This one condition has now been got wrong three times running, each
    // time by reaching for something that is only *usually* true, so it is
    // worth writing down what it actually has to satisfy. It must be
    // impossible to postpone by scrolling — or someone scrolling because
    // nothing is happening becomes the reason nothing happens, which is a
    // deadlock, twice reported. And it must be impossible to produce from
    // inside the dismissing gesture itself — or that gesture's own leftover
    // momentum unlocks the page and carries it past the hero, which is the
    // overshoot, three times reported.
    //
    // Almost nothing satisfies both. `endGesture` fails the first (it is a
    // timer re-armed by every wheel event). The classifier's `fresh` fails
    // the second (it includes a magnitude spike, and a hard flick's own tail
    // throws those). What survives is:
    //
    //  - a real gap in *event* time. A gesture that has genuinely stopped
    //    delivering for GESTURE_END_MS is over, and no spike inside a live
    //    stream can manufacture one. Set below in onWheel, so scrolling again
    //    is what resolves a pending release rather than deferring it.
    //  - the wall clock. Momentum is bounded; past CLOSE_HOLD_CEILING_MS
    //    there is nothing left to leak whatever the event stream says. A
    //    timer nothing can re-arm, so the release cannot starve.
    //
    // endGesture keeps setting it too, since when it does fire it is right —
    // it is simply not something to rely on alone.
    let gestureEndedSinceDismiss = false
    // The ceiling timer itself — see the second bullet above.
    let closeHoldCeiling = null
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
      // This is a wall-clock timer, and a wall-clock timer cannot tell "the
      // visitor stopped scrolling" from "this page stopped running". Both
      // look like 150ms in which nothing was processed.
      //
      // It matters because everything downstream treats this as proof the
      // gesture is over: it clears the per-gesture guards and, after a
      // dismiss, is one of the things that releases the scroll lock. Firing
      // it in the middle of a live flick therefore hands the rest of that
      // flick's momentum to the page — which is the swipe down from About Us
      // sailing past the hero into the section below, reported repeatedly and
      // always worse in a real browser, where slow frames are ordinary.
      //
      // The events themselves know better. Browsers deliver input ahead of
      // timers, so by the time this runs after a stall the wheel events from
      // that stall have already been processed and lastEventAt is current. If
      // it says the stream is still live, the gesture is still live: re-arm
      // for whatever is actually left rather than declaring it finished.
      //
      // Same correction as eventTime() below, applied to the other half of
      // the file's sense of time. Fixing the classifier's timestamps while
      // leaving this reading the clock was fixing one of two.
      const sinceLastEvent = performance.now() - classifier.lastEventAt
      if (sinceLastEvent < GESTURE_END_MS) {
        gestureTimer = setTimeout(endGesture, GESTURE_END_MS - sinceLastEvent)
        return
      }
      gestureScrolled = false
      gestureUsed = false
      gestureEndedSinceDismiss = true
      // The dismissing gesture has finally run out — one of the three things
      // that can complete a pending release. See releaseIfCloseFinished.
      releaseIfCloseFinished()
    }

    // The page goes back to the document when the close has both played out
    // and stopped being able to leak the dismissing gesture's momentum into
    // it. Deliberately callable from every event that can make either of
    // those true — the animation's timer, the gesture ending, and a new
    // gesture starting — rather than owned by whichever one is usually last.
    // Assuming an order is what produced two deadlocks in a row.
    function releaseIfCloseFinished() {
      if (!unlockWhenGestureEnds || !closeAnimationDone) return
      if (!gestureEndedSinceDismiss) return
      unlockWhenGestureEnds = false
      unlock()
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
      closeAnimationDone = false
      stopCloseDrive()
      clearTimeout(fallbackTimer)
      clearTimeout(closeHoldCeiling)
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
    // That leaves this timer as the release for a visitor who dismisses and
    // then does nothing — the only case left that waits on a clock at all.
    // Anyone who keeps scrolling waits on nothing: their own scroll is what
    // moves the panel, and the lock lifts the instant it is gone. See
    // driveCloseWithScroll.
    function dismiss() {
      window.scrollTo(0, 0)
      isOpenNow = false
      setIsAboutUsOpen(false)
      lock()
      unlockWhenGestureEnds = true
      closeAnimationDone = false
      gestureEndedSinceDismiss = false
      clearTimeout(closeHoldCeiling)
      // The backstop that makes this release impossible to starve. Nothing a
      // visitor does can re-arm it. See gestureEndedSinceDismiss.
      closeHoldCeiling = setTimeout(() => {
        gestureEndedSinceDismiss = true
        releaseIfCloseFinished()
      }, CLOSE_HOLD_CEILING_MS)
      clearTimeout(fallbackTimer)
      // unlockWhenGestureEnds is re-checked when this fires, not just here:
      // open() clears it, so a visitor who reopens About Us mid-close never
      // has this land afterwards and quietly unlock the page under an open
      // overlay.
      //
      // And the animation finishing is only half of what has to be true. The
      // other half is that the gesture which dismissed About Us is actually
      // over. A hard flick's momentum runs a second or two on its own, so
      // releasing purely on this timer handed whatever was left of it
      // straight to Lenis, which carried the page down past the hero — the
      // first scroll down from About Us overshooting into the section below,
      // reported directly. Rule 1 says a dismissing flick, however hard, only
      // ever lands on the hero; that rule only holds for as long as the lock
      // does.
      //
      // This file has been round this loop once already in the other
      // direction: releasing on the gesture ending alone (which is what it
      // did originally) let go while the hero was still visibly sliding back.
      // Neither event is reliably the later one, so the answer is not to pick
      // one — it is to wait for both, whichever order they arrive in. See
      // endGesture for the other side of it.
      fallbackTimer = setTimeout(() => {
        if (!unlockWhenGestureEnds) return
        // This timer's only job is to record that the animation is done. It
        // is one-shot, so it must not also be the only place the release can
        // happen — being mid-scroll at the instant it fired used to mean the
        // release simply never occurred.
        closeAnimationDone = true
        releaseIfCloseFinished()
      }, ABOUT_US_CLOSE_TRANSITION.duration * 1000)
    }

    // Wheel deltas arrive in three different units depending on the input
    // device. This is the one place on this piece where the number has to
    // mean real distance rather than just "how hard", so it converts, using
    // the same constants Lenis normalizes with internally (LINE_HEIGHT of
    // 100/6, a page being one viewport) — a given gesture then moves the
    // panel by exactly what it would have moved the page.
    const WHEEL_LINE_PX = 100 / 6
    function deltaToPixels(event) {
      if (event.deltaMode === 1) return event.deltaY * WHEEL_LINE_PX
      if (event.deltaMode === 2) return event.deltaY * window.innerHeight
      return event.deltaY
    }

    // Wheel deltas move a *target*, which the reveal then eases toward, and
    // never the reveal itself. Applying them straight to aboutUsProgress
    // (which is what this did first) makes the panel step by whole raw
    // deltas: the opening event of a quick swipe is often 150-250px, so it
    // teleports a quarter of a screen in a single frame before the rest of
    // the gesture eases along behind it — reported directly, as the hero
    // jumping to another position before it started scrolling.
    //
    // Real scrolling on this piece never does that: Lenis damps toward a
    // target it accumulates deltas into, which is exactly the weight that
    // was tuned in (see SCROLL_LERP). Since the whole point here is that
    // this *is* scrolling, as far as the visitor's hand is concerned, it
    // damps against that same constant — lerp times 60 is the lambda, the
    // conversion Lenis itself uses internally — rather than against a second
    // rate that merely looked similar.
    const CLOSE_DRIVE_LAMBDA = SCROLL_LERP * 60

    // True while the visitor's own scrolling — rather than a clock — is what
    // is moving the closing reveal.
    let closeDrivenByScroll = false
    // Both in pixels along one continuous axis that runs from -viewportHeight
    // (About Us fully covering the screen) through 0 (the hero, at real
    // scrollY 0) and onward into the real page. Pixels rather than progress,
    // and unclamped rather than stopping at 0, because the whole point is
    // that this axis does not end where the reveal does — see
    // driveCloseWithScroll.
    let closeDriveAt = 0
    let closeDriveTarget = 0
    let closeDriveFrame = 0
    let closeDriveLastAt = 0
    // Where the reveal was, and when, at the moment the visitor asked to move
    // on — the two things the commitment floor is measured from. See
    // ABOUT_US_CLOSE_COMMIT_OMEGA.
    let closeCommitFrom = 0
    let closeCommitStartedAt = 0
    // ...and how fast it was already travelling at that moment, in progress
    // per second. Carried into both of the things that take over from the
    // close spring, neither of which starts from rest — see the handover in
    // driveCloseWithScroll.
    let closeCommitVelocity = 0

    // The visitor dismissed About Us and is already pushing on down the page
    // with the close still playing. Real scroll cannot start yet (see
    // dismiss), but the reason it has nowhere to go is that About Us is
    // still in the way — and About Us is, in every sense the geometry cares
    // about, one screen above the hero. aboutUsProgress *is* that offset: at
    // p the panel spans viewport [(p-1)h, p*h] and the hero picks up exactly
    // where it ends, at [p*h, (1+p)h]. Dropping p by d/h moves both up by d,
    // which is precisely what scrolling down by d does to a document.
    //
    // So the visitor's scroll drives it directly, 1:1, and the wait stops
    // being something to shorten — there is no clock left in the path to
    // wait out. Nothing jumps either, because nothing is skipped: the same
    // slide plays, at the pace of the hand doing it. When p reaches 0 the
    // hero is sitting exactly at real scrollY 0 and the lock lifts, so the
    // handover to real scroll is continuous rather than a switch.
    //
    // Only ever a *later* gesture, never the dismissing one: the gesture
    // that closes About Us has to land on the hero and stop there, however
    // hard it was thrown (see gestureUsed, and rule 1 in dismiss). Its own
    // momentum tail must not be able to keep pushing the panel and sail on
    // into the carousel behind it.
    function driveCloseWithScroll(pixels) {
      if (isOpenNow || !unlockWhenGestureEnds) return
      if (!closeDrivenByScroll) {
        closeDrivenByScroll = true
        // Hand over from the spring cleanly — left running, it writes its
        // own value back over this one on the very next frame. The axis
        // starts where the spring had got to, so the handover itself moves
        // nothing; only the delta below does.
        // Read before stopping it: the close spring is mid-flight and the
        // reveal is already travelling. Handing over to something that
        // starts from rest — which both the drive and the commitment floor
        // below do, left to themselves — stalls it for a frame or two and
        // then accelerates hard into the new pace, which is a tiny but real
        // cut in the middle of the hero sliding back. Reported directly.
        // Continuity of position was never the problem; continuity of speed
        // was.
        closeCommitVelocity = aboutUsProgress.getVelocity()
        progressAnimRef.current?.stop()
        closeDriveAt = -aboutUsProgress.get() * window.innerHeight
        // A damped travel moves at lambda times the distance still to cover,
        // so seeding the target this far ahead means the drive's very first
        // frame continues at exactly the speed the spring was doing, with
        // the visitor's own deltas landing on top of it from there.
        closeDriveTarget =
          closeDriveAt + (-closeCommitVelocity * window.innerHeight) / CLOSE_DRIVE_LAMBDA
        closeCommitFrom = aboutUsProgress.get()
        closeDriveLastAt = performance.now()
        closeCommitStartedAt = closeDriveLastAt
        closeDriveFrame = requestAnimationFrame(stepCloseDrive)
      }
      // Deliberately not clamped at 0. A swipe asks to travel some distance;
      // if that is further than the panel had left to go, the excess belongs
      // to the page beyond it, not in the bin. Clamping here (which is what
      // this did first) threw that excess away and then made the lock wait
      // for an exponential ease to converge on a target it had already been
      // pinned to — about a second and a half of pure asymptote after the
      // panel was, to look at, already gone. Reported directly, as the second
      // swipe taking a couple of seconds to start scrolling.
      closeDriveTarget += pixels
    }

    function stepCloseDrive(now) {
      closeDriveFrame = 0
      if (!closeDrivenByScroll) return
      // Clamped, so a stalled tab resuming can't apply one enormous step and
      // reintroduce the jump this whole loop exists to remove.
      const dt = Math.min(0.05, (now - closeDriveLastAt) / 1000)
      closeDriveLastAt = now
      closeDriveAt += (closeDriveTarget - closeDriveAt) * (1 - Math.exp(-CLOSE_DRIVE_LAMBDA * dt))
      // Whichever is further along: what the visitor's own scrolling has
      // reached, or the commitment that the reveal will be gone within
      // ABOUT_US_CLOSE_COMMIT_SECONDS of being asked. A hard swipe overtakes
      // the floor and keeps its 1:1 feel; a light one is carried by it
      // instead of stranding the panel somewhere in the middle.
      const drivenProgress = Math.min(1, -closeDriveAt / window.innerHeight)
      const sinceCommit = (now - closeCommitStartedAt) / 1000
      const decay = ABOUT_US_CLOSE_COMMIT_OMEGA * sinceCommit
      // The critically-damped solution with a starting speed, rather than the
      // from-rest form of it: e^-wt * [x0 + (v0 + w*x0)t]. With v0 of 0 the
      // bracket collapses back to x0(1 + wt), which is what this was before
      // the reveal's existing motion had to survive the handover.
      const committedProgress =
        Math.exp(-decay) *
        (closeCommitFrom + (closeCommitVelocity + ABOUT_US_CLOSE_COMMIT_OMEGA * closeCommitFrom) * sinceCommit)
      const progress = Math.min(drivenProgress, committedProgress)
      // Reaching 0 is the panel's bottom edge reaching the top of the screen
      // — the reveal is off, the hero is exactly where real scrollY 0 puts
      // it, and there is nothing left for this loop to own. Release on that,
      // not on either easing settling: those are different moments, and both
      // land a long way after anything is still visible. Half a pixel of a
      // screen is the same as none.
      if (progress * window.innerHeight < 0.5) {
        aboutUsProgress.set(0)
        releaseAfterClose()
        return
      }
      aboutUsProgress.set(progress)
      closeDriveFrame = requestAnimationFrame(stepCloseDrive)
    }

    function stopCloseDrive() {
      closeDrivenByScroll = false
      cancelAnimationFrame(closeDriveFrame)
      closeDriveFrame = 0
    }

    function releaseAfterClose() {
      stopCloseDrive()
      closeAnimationDone = false
      clearTimeout(fallbackTimer)
      if (!unlockWhenGestureEnds) return
      unlockWhenGestureEnds = false
      unlock()
    }

    // When the event actually happened, not when this handler got round to
    // running — and on a page this heavy those are not the same thing.
    //
    // Everything the classifier decides is read out of the *spacing* between
    // events: a gap ends a gesture, and the envelope it measures a push
    // against decays over elapsed time. Stamping them with performance.now()
    // inside the handler measures the main thread instead of the hand. A
    // frame that takes 150ms leaves the wheel events of that frame queued and
    // then delivers them in one burst, so the first of them appears to arrive
    // a whole gesture-boundary after the last one — and the burst that
    // follows appears to arrive with no spacing at all.
    //
    // Which is not a subtle inaccuracy: it is the classifier being told a
    // gesture ended and a new one began, once per stalled frame. Downstream,
    // that let a *new* downward gesture appear mid-flick while About Us was
    // closing, which releases the scroll lock (see driveCloseWithScroll), and
    // the rest of the dismissing flick's momentum then carried the page
    // straight past the hero into the section below. Reported three times,
    // always worse in a real browser window than in a small preview, and
    // always intermittent — because it needs a slow frame to land in the
    // wrong place. Harder flicks made it likelier for the plainest possible
    // reason: more momentum left over to leak.
    //
    // The classifier's own comments have flagged exactly this hazard from the
    // start ("a plain gap can't [be trusted]: that's the signal a stalled
    // frame can imitate") and the open path guards against it by refusing to
    // act on a gap alone. The guard was never the real answer: the timestamp
    // was simply wrong, and the browser has had the right one all along.
    //
    // The fallback is for the legacy epoch-based timeStamp; anything past the
    // year 2001 in milliseconds cannot be a page-relative time.
    function eventTime(event) {
      return event.timeStamp > 0 && event.timeStamp < 1e12 ? event.timeStamp : performance.now()
    }

    function onWheel(event) {
      const delta = event.deltaY
      const absDelta = Math.abs(delta)
      const now = eventTime(event)
      // Real silence in the event stream, read before the classifier folds
      // this event in. A gesture that stopped delivering for this long is
      // over — proof a spike inside a live tail cannot fabricate, and proof
      // that scrolling again supplies rather than defers. See
      // gestureEndedSinceDismiss.
      if (now - classifier.lastEventAt > GESTURE_END_MS) {
        gestureEndedSinceDismiss = true
        releaseIfCloseFinished()
      }
      // `deliberate` is deliberately not destructured any more — the open
      // path below used to accept it as an override for pageStillSettling
      // and must not (see that condition's own comment). classify() still
      // returns it; nothing here has any business acting on it.
      const { fresh } = classifier.classify(delta, absDelta, now)

      classifier.lastEventAt = now
      if (absDelta >= MIN_DELTA) {
        classifier.lastDir = Math.sign(delta)
      }
      if (fresh) {
        gestureScrolled = false
        gestureUsed = false
        // Where this gesture *began*, settled once and then left alone for
        // its whole life, momentum tail included.
        //
        // Asked per event instead (which is what it was), it answers a
        // different question every frame, and a single harsh swipe up from
        // the section below gets a different answer partway through: it
        // starts below the hero, where it must not be able to open About Us,
        // and its own momentum then carries the page up through the hero,
        // at which point its remaining events are sitting on the hero and
        // free to. One gesture, both boundaries crossed, which is the exact
        // thing the rule exists to prevent — and it is not caught by
        // gestureScrolled either, because a harsh enough first event drives
        // Lenis's target straight to 0 and that flag is read from the target
        // *after* Lenis has already clamped it, so the gesture never looks
        // like it scrolled anywhere at all.
        // The whole rule, in one line, asked once when the gesture begins
        // and then fixed for its entire life.
        //
        // It replaces "did this gesture start below the hero", which sounds
        // equivalent and is not: this site's entire document is barely two
        // viewports tall, so "below the hero" covers only the bottom tenth of
        // the scrollable range. From the other ninety per cent — which is
        // most of the section it was supposed to be guarding — it was simply
        // never true, and an upward gesture could carry the page to the top
        // and straight on into About Us without ever stopping. That is the
        // failure reported over and over: swipe up from below, land in About
        // Us, never see the hero.
        //
        // Asking whether the gesture *started at the top* has no such hole.
        // It cannot be satisfied by momentum, because where a gesture starts
        // is not something its own momentum can change. Reaching the hero and
        // opening About Us are now necessarily two separate gestures, which
        // is what "must stop at the hero" means.
        gestureStartedAtTop = window.scrollY <= ARRIVING_EPSILON_PX
      }
      clearTimeout(gestureTimer)
      gestureTimer = setTimeout(endGesture, GESTURE_END_MS)

      // Judged on the target, not the eased position: a flick that has
      // already spent all its scroll must stop re-arming this while the
      // page merely coasts the last pixels, or the coast itself keeps
      // blocking the visitor's next request. See ARRIVING_EPSILON_PX.
      if (getTargetScroll() > TOP_EPSILON_PX) gestureScrolled = true
      if (absDelta < MIN_DELTA) return

      // A downward push while the close is still playing moves the panel
      // itself — see driveCloseWithScroll. `fresh` opens the door (a later
      // gesture, never the dismissing one); closeDrivenByScroll then keeps
      // it open for the rest of that same gesture, momentum tail included,
      // so a flick carries the panel exactly as far as it would have carried
      // the page.
      if (
        delta > 0 &&
        unlockWhenGestureEnds &&
        gestureEndedSinceDismiss &&
        (fresh || closeDrivenByScroll)
      ) {
        driveCloseWithScroll(deltaToPixels(event))
        return
      }

      if (isOpenNow) {
        // A downward push closes About Us on the first event that asks for
        // it — but only one per gesture: gestureUsed swallows the rest of
        // the same burst so a hard flick can't close it *and* carry on into
        // the carousel in a single go.
        //
        // Suppressed entirely while the Meet the Team stage is up (see
        // AboutUsSection's own isTeamOpen getter, exposed through this same
        // ref for exactly this check): scrolling down from Meet the Team
        // used to fall through to this same dismiss and send the visitor
        // all the way back to the hero, past About Us, in one motion —
        // asked for directly to do nothing instead. The `return` below
        // still fires either way, so a scroll down here is simply inert,
        // the same as it already is for every other wheel event this
        // branch doesn't act on.
        if (delta > 0 && !gestureUsed && !aboutUsSectionRef.current?.isTeamOpen()) {
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
      // flight.
      //
      // This used to accept a `deliberate` event (a reversal, or a confirmed
      // fresh push) as an override for the second guard, on the reasoning
      // that momentum alone can't produce either — true of a *single*
      // gesture's own tail, but not of what the visitor actually does once
      // the distance back to the hero got long enough that one swipe no
      // longer covers it (see the reveal's own reach in SiteFooter.jsx):
      // several separate, genuine swipes, each its own real gesture, with no
      // pause anywhere near long enough to look deliberate about arriving.
      // The classifier correctly reports each of those as a fresh, confirmed
      // push — it has no way to know they're all still "get me to the hero,"
      // not "and then past it" — so the override let the last one open About
      // Us the instant it crossed the hero's threshold, mid-flight, with no
      // stop the visitor could perceive at all. Reported directly, and this
      // rule has no second line of defence behind it: the fix is to stop
      // trusting the override here, not to retune it. The one thing it was
      // added for — a gentle follow-up swipe landing while only Lenis's own
      // residual easing is still finishing, the visitor's hand having
      // already stopped — costs that visitor nothing but the same fraction
      // of a second the page is visibly still doing anyway; that was always
      // the tradeoff on offer, this just stops giving away the rule to get
      // it.
      //
      // "Nowhere left above to scroll to" is a question about the scroll
      // target, not about where the easing happens to have got to. Those two
      // are a long way apart after a flick up from the section below: the
      // target pins to 0 immediately, while the visible position takes about
      // 0.45s to ease from a screen away into the ARRIVING_EPSILON_PX the
      // opening snap can swallow unseen. So the visible position decides
      // *when* this is honoured, never whether it is — the wait is always at
      // most that same fraction of a second, on every request, not a queue.
      //
      // Deliberately not a queue of one *gesture* — gestureUsed already makes
      // this at most one request per gesture, and the flag is dropped the
      // moment anything contradicts it (see below).
      const committedToTop = getTargetScroll() <= TOP_EPSILON_PX
      const pageStillSettling = now - lastScrollMoveAt < SCROLL_SETTLE_MS
      // ...and near enough that the hero is what's on screen. Being committed
      // to the top is not on its own a statement about where the visitor
      // *is*: one firm push from the section below sets Lenis's target to 0
      // on its very first event, so the page counts as committed while still
      // a whole screen away. gestureScrolled is meant to catch exactly that
      // and cannot, because it reads the target after Lenis has already
      // clamped it — the event that asks to travel a screen looks identical
      // to one that asks for nothing.
      //
      // So a second test that does not depend on reading intent out of a
      // single event: an upward gesture from below the hero means "take me to
      // the hero", and only one made *on* the hero can mean "and then past
      // it". Without this, one swipe up from the section below opened About
      // Us the moment its coast landed, skipping the hero entirely — which
      // is the rule this whole file exists to enforce, broken by the fix that
      // stopped early requests being discarded. Reported directly.
      if (
        delta < 0 &&
        !gestureScrolled &&
        !gestureUsed &&
        committedToTop &&
        gestureStartedAtTop &&
        !pageStillSettling
      ) {
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
      clearTimeout(closeHoldCeiling)
      cancelAnimationFrame(closeDriveFrame)
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
          // Clicking "About Us" is only ever a way *in*, never a way out —
          // once inside, it backs out of Meet the Team to the last About Us
          // slide if that stage is open, or does nothing at all if About Us
          // itself is already showing. Dismissing the whole overlay used to
          // happen here too (a plain open/closed toggle), which is exactly
          // what let this link kick a visitor back out to the Hero from
          // inside the section it's meant to keep them on.
          if (isAboutUsOpen) {
            aboutUsSectionRef.current?.closeTeam()
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
      {/* The page's own scrolling content, lifted onto its own layer so it
          paints over SiteFooter below. The footer is fixed at z-0 and the
          three sections here are all opaque navy, so this wrapper is what
          keeps it hidden underneath them until the footer's own spacer
          scrolls the page off the bottom of them and uncovers it. z-10
          rather than a bare z-index-less `relative`: these sections are
          positioned but z-index: auto, which paints in tree order against
          the footer's own z-0 — and the footer, being last in the DOM,
          would win that. AboutUsSection is also z-10 and stays a later
          sibling than this, so it still covers the page when open, and the
          navbar's z-20 still covers everything. */}
      <div className="relative z-10">
        <GlassLogoHero
          openScrollComp={openScrollComp}
          aboutUsProgress={aboutUsProgress}
          onScrollLockChange={setScrollLocked}
          isForceScrollingRef={isForceScrollingRef}
        />
        <ClientLogoCarousel sectionRef={carouselRef} />
        <BackgroundGlowSection carouselRef={carouselRef} />
      </div>
      <SiteFooter />
      {SHOW_FRAME_RATE && <FrameRateMeter />}
      <AboutUsSection
        ref={aboutUsSectionRef}
        isOpen={isAboutUsOpen}
        openScrollComp={openScrollComp}
        aboutUsProgress={aboutUsProgress}
      />
    </>
  )
}
