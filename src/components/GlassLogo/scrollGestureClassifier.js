// Tells a genuine new wheel/trackpad push apart from the leftovers of the
// gesture already in flight — the one piece of GlassLogoPreview's scroll-lock
// logic that turned out to be genuinely hard to get right, and the one this
// module exists to keep testable in isolation (see scrollGestureClassifier.test.js,
// which replays real captured trackpad data through it). Pulled out of
// GlassLogoPreview's mount-once effect verbatim — same behavior, just now
// importable without a DOM.

// One physical wheel/trackpad gesture arrives as an unbroken burst of events:
// first while the user's fingers are actually moving, then a decaying
// momentum tail the OS keeps synthesizing after they've lifted off. Within
// that burst events land every ~8-16ms.
//
// A silence this long definitely ends a gesture, but silence alone is not
// enough to *start* one: a momentum tail can run a second or two, and
// waiting it out before honoring fresh input reads as "I scrolled and had to
// wait." See classify() below for the two signals that catch a new push
// mid-tail, without any waiting at all.
export const GESTURE_END_MS = 150
// Telling a genuine second push apart from the leftovers of the first
// gesture is the whole problem, and it can't be done on timing alone. These
// are tuned against real captured trackpad flicks and replayed through this
// exact logic — see the test file for the actual traces.
//
// Both halves of a real gesture are noisy — the tail is *not* a clean
// monotonic decay. What does separate them is scale: a decaying tail stays
// under an envelope that falls with it, while a fresh push jumps well clear
// of that envelope. So track a decaying peak and treat anything comfortably
// above it as a hand.
//
// The envelope has to fall *faster* than real momentum does or it sits above
// the tail forever and nothing is ever detected; 0.85 per event against
// momentum's own ~0.98 keeps it hugging the tail closely.
//
// Applied over elapsed *time* (see NOMINAL_EVENT_MS), not once per event.
// Per-event decay alone has a hole in it that no amount of tuning closes:
// the envelope only falls when events arrive, so the moment a stream stops
// it freezes at whatever magnitude it happened to end on — and a flick
// spent against the top of the page ends abruptly, still at 20-30px, rather
// than trailing to nothing. Measured directly: after that, a deliberate
// gentle second swipe (18-22px) could never clear the resulting bar, not
// after 200ms, not after 800ms, not ever — the previous gesture's long-dead
// momentum was still setting it. Since the envelope is meant to describe
// motion *currently* in flight, and nothing is in flight during a silence,
// decaying it across that silence is what it was always supposed to mean.
export const ENV_DECAY = 0.85
// The cadence ENV_DECAY is quoted against — real wheel/trackpad bursts land
// every ~8-16ms (measured across both halves of several real captures, mean
// ~9ms). At exactly this spacing the time-based decay above is arithmetically
// identical to the per-event decay it replaces, so an uninterrupted stream
// behaves exactly as it did before; only genuine gaps behave differently.
export const NOMINAL_EVENT_MS = 9
// Two is not a round number picked for taste — replaying a captured flick
// against a grid of settings, it sits just above the boundary: re-measured
// against that same trace, 1.8 is still clean and 1.6 is where some of the
// flick's own fluctuation starts reading as a new push. Kept at 2 rather
// than trimmed to the edge, since the margin costs nothing: lowering it
// turned out to buy no light-swipe sensitivity at all (see PUSH_MIN below,
// which is what that actually depended on).
export const PUSH_RATIO = 2
// ...and an absolute floor, so the tail's own jitter down at single digits
// can never clear the ratio on its own.
//
// Ten, not twelve: twelve was over-conservative against that very
// description, excluding genuine but feather-light swipes too — the kind
// whose ticks sit right around 10-11px, which could then never open About
// Us at *any* delay, not after 200ms, not after two full seconds. That is
// the "sometimes a light second scroll up doesn't register" reported
// directly, and it was this floor, not the ratio, doing it. Swept against
// the captured hard flick above: every floor from 10 down leaves that trace
// exactly as clean (the PUSH_RATIO test is what rejects its noise, not
// this), gains nothing further below 10 (the ratio becomes the binding
// constraint there, not the floor), and 10 is the tightest of them that
// still keeps the literal promise this floor was written for — no
// single-digit delta ever counts.
export const PUSH_MIN = 10
// Releasing the scroll lock a dismiss took out is the one decision with no
// second line of defence behind it: get it wrong and the flick that closed
// About Us carries straight on past the hero. A swipe still in progress
// hovers near its own peak and occasionally throws a spike big enough to
// look like a fresh push, so releasing the lock additionally requires the
// gesture to have actually spent itself: the envelope must have fallen to a
// small fraction of this gesture's own peak. Momentum always decays there
// eventually; a swipe that's still being driven never does.
//
// This alone doesn't catch every spike, though — see CONFIRM_RATIO below
// for the other half of that story.
export const SPENT_FRACTION = 0.4
// The one genuinely load-bearing time guard, and only a short one: measured
// from an open/dismiss, not from the gesture's start. Right after a dismiss
// the same swipe is often still accelerating, and that acceleration is
// indistinguishable from a fresh push — without this, one hard flick down
// from About Us dismisses it and then unlocks itself, carrying on into the
// carousel.
export const RAMP_GUARD_MS = 200
// A push only counts once the *next* tick confirms it stayed elevated,
// rather than judging a single tick's magnitude alone — see classify()'s
// pendingPush for why. This is how loose that confirming tick is allowed to
// be relative to the one that raised the candidacy: a genuine push's ticks
// stay close to each other (a gentle real swipe's ticks in a real capture
// sat within ~10% of one another), while an isolated noise spike collapses
// straight back to the tail's own size on the very next tick (in the same
// capture, back to under 40% of the spike). 0.5 sits in the gap between
// those two real, measured behaviors.
export const CONFIRM_RATIO = 0.5

export function createGestureClassifier() {
  return {
    lastEventAt: 0,
    lastDir: 0,
    lastActionAt: 0,
    // Decaying peak of recent deltas — see ENV_DECAY. Kept across gesture
    // boundaries on purpose: once a tail has decayed away, the first event
    // of whatever comes next stands well clear of it, which is exactly what
    // makes it recognisable as a new push.
    envelope: 0,
    // Largest delta seen in the gesture currently in flight — the yardstick
    // SPENT_FRACTION measures the envelope against. Reset per gesture, so
    // "spent" is relative to how hard this particular flick was.
    gesturePeak: 0,
    // The last event, *if* it cleared PUSH_RATIO on its own — a candidate
    // push, waiting on the very next tick to confirm it's a real, sustained
    // push and not a one-tick spike. null when the last event wasn't a
    // candidate, or once a gap has invalidated it. Carries its own `spent`
    // (see SPENT_FRACTION) captured at the moment it became a candidate,
    // rather than recomputed once confirmed — recomputing it then would
    // measure the gesture's shape *after* the candidate's own magnitude had
    // already been folded into the envelope, corrupting the very check
    // meant to judge whether the gesture that came before it had run down.
    pendingPush: null,

    // Is this event the start of a genuinely new push, rather than more of
    // the gesture already in flight? Answered from the shape of the stream
    // itself, so a new push is honored the instant it lands — never after
    // waiting for the previous gesture's momentum to run out.
    //
    // Three signals, and the distinction between them matters:
    //  - a real gap in the stream. Usually means the previous tail died,
    //    but it's the one signal a janky frame can fake, so it marks a
    //    gesture boundary without on its own proving a hand was involved.
    //  - a reversal of direction. A decaying tail never turns around.
    //  - a delta standing clear of the decaying envelope: a hand pushing
    //    again, however soon after the last one. See ENV_DECAY/PUSH_RATIO.
    //
    // The last two can only come from a person, so they're reported
    // separately as `deliberate` — the caller's open path trusts them over
    // the page's own still-settling motion, and trusts nothing else.
    classify(delta, absDelta, now) {
      const dir = Math.sign(delta)
      const gapped = now - this.lastEventAt > GESTURE_END_MS
      if (gapped) {
        this.gesturePeak = 0
        this.pendingPush = null
      }
      // Decay the envelope across any silence *beyond* the cadence a live
      // stream keeps — see ENV_DECAY/NOMINAL_EVENT_MS. Strictly additive:
      // during an uninterrupted burst this is a no-op and the per-event
      // decay below is the only one that applies, exactly as before. It is
      // only a real pause that this touches at all.
      const excessSilenceMs = Math.max(0, now - this.lastEventAt - NOMINAL_EVENT_MS)
      if (excessSilenceMs > 0) this.envelope *= ENV_DECAY ** (excessSilenceMs / NOMINAL_EVENT_MS)
      const reversed = dir !== 0 && this.lastDir !== 0 && dir !== this.lastDir
      // Read before the envelope absorbs this event — otherwise a push's
      // own first tick raises the bar its next ticks are measured against,
      // and a gentle one ends up masking itself.
      //
      // Confirmed against the *next* tick, not judged on this one alone — a
      // real captured hard flick showed why: deep in an otherwise ordinary
      // decaying tail, one single isolated tick can still clear PUSH_RATIO
      // on pure noise, and SPENT_FRACTION below doesn't catch it, because by
      // then the gesture's envelope has long since fallen under its own
      // peak. A genuine push, gentle or hard, stays elevated for more than
      // one tick; an isolated noise spike collapses straight back down on
      // the very next one. Averaging against the *previous* tick (tried
      // first) protected against the same noise, but penalized a gentle
      // genuine push too: its first tick, averaged against the previous
      // gesture's already-decayed tail, often couldn't clear the bar at
      // all. Waiting one tick for confirmation instead costs a real push
      // nothing perceptible (the very next event, ~10ms later) while still
      // rejecting a spike that doesn't hold up.
      const candidatePush = absDelta >= PUSH_MIN && absDelta > this.envelope * PUSH_RATIO
      // See SPENT_FRACTION — captured now, before this event's own magnitude
      // updates the envelope below, for the pendingPush comment's reason.
      //
      // gesturePeak of 0 means no gesture is in flight at all (a real pause
      // just reset it, above), so there is nothing left un-spent to guard
      // against and this is trivially satisfied. Requiring `gesturePeak > 0`
      // instead — as this did — meant the first event after any pause could
      // never be confirmed as a push, so a gentle second swipe following a
      // deliberate stop registered as `fresh` but never as `deliberate`,
      // and the open path needs the latter while the page is still easing.
      const spentBeforeThisEvent =
        this.gesturePeak === 0 || this.envelope <= this.gesturePeak * SPENT_FRACTION
      const pushed =
        this.pendingPush !== null &&
        absDelta >= this.pendingPush.absDelta * CONFIRM_RATIO &&
        this.pendingPush.spent &&
        now - this.lastActionAt >= RAMP_GUARD_MS
      this.envelope = Math.max(absDelta, this.envelope * ENV_DECAY)
      this.gesturePeak = Math.max(this.gesturePeak, absDelta)
      this.pendingPush = candidatePush ? { absDelta, spent: spentBeforeThisEvent } : null
      const deliberate = reversed || pushed
      // A reversal or a real pause proves a new gesture outright; a
      // confirmed push only counts as one once the gesture it interrupted
      // had visibly run down (see SPENT_FRACTION).
      //
      // releasesLock was briefly restricted to just gapped/reversed here,
      // theorizing that a confirmed push could still be late-tail noise from
      // the dismissing gesture's own momentum, slipping past a scroll lock
      // that (at the time) held for a full 1.8s. Undone: it broke the actual,
      // common case it was guarding an edge case against — a genuine second
      // downward push, same direction, arriving before the first gesture's
      // tail goes silent, stopped registering at all (reported directly).
      // The theorized noise case was never actually confirmed against real
      // data the way the fix two commits up this file was; this one needs
      // that same real-capture verification before being tried again, not
      // another guess.
      const gestureEnded = gapped || reversed || pushed
      return {
        fresh: gestureEnded,
        deliberate,
        releasesLock: gestureEnded,
      }
    },
  }
}
