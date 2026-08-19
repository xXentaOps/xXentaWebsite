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
// shape as MathUtils.damp — see FORCE_SCROLL_LERP in useLenis.js) — is some
// flavor of exponential decay toward its target: real velocity from the
// first frame, continuously easing off, never a dead-stop start the way a
// cubic ease-in-out reads. This spring is the same family of motion as
// those (a damped harmonic oscillator, not a fixed bezier curve), which is
// what actually made the previous curve feel like an outlier next to them.
export const ABOUT_US_TRANSITION = {
  type: 'spring',
  bounce: 0,
  duration: 1.8,
}
