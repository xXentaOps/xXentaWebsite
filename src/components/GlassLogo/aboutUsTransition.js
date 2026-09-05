// Shared between GlassLogoHero (which slides itself down and away) and
// AboutUsSection (which slides down into view from above) for the "About
// Us" reveal — both need the *exact* same duration/easing, not just
// visually similar ones. Hero animates y from 0% to 100%, AboutUsSection
// animates from -100% to 0% — a constant 100% (one screen height) apart at
// every instant only if both are driven by one shared transition
// definition, not two hand-tuned ones that happen to look alike; any drift
// between them would open a visible gap (or overlap) at the seam partway
// through the animation.
//
// A critically-damped spring (bounce: 0 — no overshoot/oscillation), not a
// symmetric ease-in-out tween (tried first): every other piece of scroll-
// linked motion here — the grid/logo/title parallax (MathUtils.damp), the
// "AI for Achievers" force-scroll and the logo's own scroll-back-to-hero
// (both Lenis's lerp-based scrollTo, itself the same damped-toward-target
// shape as MathUtils.damp — see SCROLL_LERP in useLenis.js) — is some
// flavor of exponential decay toward its target: real velocity from the
// first frame, continuously easing off, never a dead-stop start the way a
// cubic ease-in-out reads. This spring is the same family of motion as
// those (a damped harmonic oscillator, not a fixed bezier curve), which is
// what actually made the previous curve feel like an outlier next to them.
// Purely how the slide *looks* — this used to also double as the pace
// scroll responsiveness had to keep up with, which went through a few
// wrong turns worth recording:
//
// GlassLogoPreview's wheel handling first released its scroll lock the
// instant the dismissing gesture's own momentum died down (often under a
// second), independent of this duration — which let a fast double-scroll
// down from About Us move real scroll well before this slide had visually
// finished, so the still-retreating grid ended up sitting over Hero content
// the page had already scrolled down to (reported directly). Tried fixing
// it by shortening *this* duration instead — first to 0.6s to comfortably
// outrun the lock's release, which read as jarringly mismatched against
// opening's slower pace once closing no longer matched it (also reported
// directly); splitting into two separate durations by direction (via
// getAboutUsTransition) was the right structural move there, but no
// duration for the shared one actually solved the real problem, which
// wasn't this value at all — it was that the *lock* raced ahead of
// whatever this was set to. Fixed at the source instead: the lock now
// waits out this same duration before releasing on its own (see
// dismiss()'s fallbackTimer in GlassLogoPreview), so this can go back to
// being purely cosmetic, both directions sharing one unhurried pace again,
// exactly as before any of this started.
//
// Retuned from 1.6s to 2.4s (asked for directly: "smoother and slower, it's
// too fast now compared to the scroll we get from the Hero to the Showcases
// below"). At 1.6s, a critically-damped spring moved over 70% of the screen
// height in the first ~350ms, reading as an abrupt snap compared to the
// gentle, weighted descent of scrolling down to the showcases (~2.2s–2.5s).
// At 2.4s, peak initial speed is reduced by over a third and the journey
// distributes gracefully across the full duration, giving the upward reveal
// the exact same measured, luxurious weight as the rest of the page.
export const ABOUT_US_OPEN_TRANSITION = {
  type: 'spring',
  bounce: 0,
  duration: 2.4,
}
export const ABOUT_US_CLOSE_TRANSITION = {
  type: 'spring',
  bounce: 0,
  duration: 2.4,
}

// isOpen here means "which direction is this animating in" — the target
// state being animated *toward*, not necessarily the current, in-flight
// one. Every call site already has this same boolean in scope for its own
// animate target, so picking the matching transition from it costs nothing
// extra and can't drift out of sync with which direction is actually
// playing.
// Once a visitor asks to move on — a second downward gesture while the close
// is still playing — the reveal commits to being off the screen within this
// long, no matter how gently they asked.
//
// Their scroll still drives it directly and can beat this easily (see
// driveCloseWithScroll in GlassLogoPreview); this is the floor underneath
// that, and it exists because scroll alone cannot serve a light gesture. The
// drive is a damped travel along one axis, so it only clears the panel once
// the distance asked for overshoots what was left — which a hard swipe does
// immediately and a gentle one may never do at all. Without a floor, a light
// second swipe crept the panel a little and then sat waiting out its own
// momentum tail before anything finished: about two seconds, against a hard
// swipe's third of one, for the same request. Reported directly, along with
// the entirely fair offer to just ignore light swipes instead — this is the
// better half of that trade, since there is nothing ambiguous about the
// gesture, only about how far it happened to travel.
//
// A quarter second: brisk enough to read as answering the swipe rather than
// finishing an animation, slow enough to still be movement.
export const ABOUT_US_CLOSE_COMMIT_SECONDS = 0.25
// The decay rate of a critically-damped spring that settles in that long.
// x(t) = (1 + wt)e^-wt reaches about 1% of where it started at wt = 6.6, so
// the rate is that over the duration — the same shape as every other easing
// on this piece, just solved for directly rather than handed to framer,
// since it has to be combined per-frame with the scroll drive rather than
// run on its own.
export const ABOUT_US_CLOSE_COMMIT_OMEGA = 6.6 / ABOUT_US_CLOSE_COMMIT_SECONDS

export function getAboutUsTransition(isOpen) {
  return isOpen ? ABOUT_US_OPEN_TRANSITION : ABOUT_US_CLOSE_TRANSITION
}
