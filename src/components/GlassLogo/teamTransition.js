import { ABOUT_US_OPEN_TRANSITION } from './aboutUsTransition'
import { ABOUT_US_GRID_ZOOM_SCALE, TARGET_CELL_PX } from './gridConstants'

// The About Us -> Meet the Team hand-off: About Us slides bodily out to the
// left and Meet the Team is what's left behind (navbar, xXenta logo, the
// grid, and the slide arrows parked at the bottom centre).
//
// Every number the slide depends on lives here rather than at its several
// call sites, because the sides that have to agree are in different
// rendering worlds entirely — DOM transforms in AboutUsIntro, world-space
// groups in AboutUsSection's two canvases, and a shader phase in the grid —
// and nothing but shared constants keeps them moving as one piece. A speed
// tweaked in one place and not the others reads immediately as elements
// tearing away from each other mid-slide.
//
// One progress value (0 = About Us, 1 = Meet the Team) drives all of it, and
// the easing lives on that value's own animation (see TEAM_SLIDE_TRANSITION),
// not on the individual offsets — so every offset below is a plain linear
// function of an already-eased number, and adding another one later can't
// accidentally introduce a second, disagreeing curve.

// How far the main group travels, as a multiple of viewport width. Needs to
// be >1 so the content is genuinely clear of the frame rather than resting
// with its trailing edge on the boundary: the photo block starts on the
// right-hand side of the screen, so its own left edge has most of a screen
// to cross before the block's right edge even reaches x=0.
//
// 1.35 (tried first) cleared the frame with room to spare — literally: at a
// 1600px viewport the photo's own trailing edge landed 810px past the left
// edge, against only 1350px of travel actually needed to reach it, so over
// a third of the full slide was pure overshoot nothing on screen needed.
// Harmless for the DOM content itself, which just stops being visible once
// it's off-frame either way — but the grid tracks this same distance 1:1
// (GRID_SPEED below), and a *repeating pattern* sliding that much further
// than necessary reads as much more distance than solid content moving the
// same amount: every extra cell that scrolls past registers as its own unit
// of travel, in a way a photo simply leaving the frame does not. Reported
// as the grid making the transition feel like the camera travelled far
// further than it actually needed to. 1.05 keeps the same margin-for-safety
// reasoning (still comfortably >1, nothing rests on the boundary) while
// cutting the excess roughly in half.
export const MAIN_SLIDE_VW = 1.05

// The glass objects — GlassCircle and the Google Cloud badge — travel faster
// than everything else, so the scene comes apart in layers instead of moving
// as one flat sheet. Faster (not slower) deliberately: these two sit nearest
// the viewer in the depth language this page already uses, and nearer things
// covering more ground is the direction that reads as parallax rather than
// as lag.
export const ACCENT_SPEED = 1.32

// The grid tracks the content one-to-one — asked for directly ("the
// background grid should also follow"). Its own travel is applied as a
// shader phase shift, so unlike everything else here it never runs out of
// pattern (see uXPhaseShiftCells in BackgroundGrid).
export const GRID_SPEED = 1

// The "slight curve to the acceleration" this slide asked for — reusing the
// About Us reveal's own critically-damped spring (see aboutUsTransition.js's
// own long comment) rather than picking a fresh curve for this slide. Tried
// a hand-tuned cubic-bezier first (ease-in-out-ish, 900ms) — mechanically
// reasonable, but it read as harsh and out of place next to everything else
// on this page, for exactly the reason that file's comment already lays
// out: essentially all of this page's other motion — the grid/logo/title
// parallax, the scroll-driven reveals, Lenis's own scrollTo — is some flavor
// of exponential decay toward a target, real velocity from frame one,
// continuously easing off, never a dead-stop start the way a bezier ease
// reads. A spring is the right *family* of motion here, not a coincidence
// that one already existed for the page's other big slide — reusing it
// outright is what actually guarantees the two feel like the same page
// rather than two separately-tuned approximations of the same idea.
export const TEAM_SLIDE_TRANSITION = ABOUT_US_OPEN_TRANSITION

// Screen-space px the main group has moved at a given eased progress.
// Negative — everything leaves to the left.
export const mainSlidePx = (progress, viewportWidth) =>
  -progress * viewportWidth * MAIN_SLIDE_VW

export const accentSlidePx = (progress, viewportWidth) =>
  mainSlidePx(progress, viewportWidth) * ACCENT_SPEED

// The grid's own travel, expressed in cells rather than px because that's
// what the shader's phase uniform wants. Negated because increasing the
// phase moves the pattern toward -x: the boundary that satisfies
// fract(u*repeat + shift) == 0 sits at a smaller u as shift grows, so a
// positive shift is a leftward move, and gridSlidePx is already negative for
// a leftward one.
export const gridPhaseShiftCells = (progress, viewportWidth) => {
  const cellPx = TARGET_CELL_PX * ABOUT_US_GRID_ZOOM_SCALE
  return -(mainSlidePx(progress, viewportWidth) * GRID_SPEED) / cellPx
}

// The depth every sliding WebGL element sits at (GlassCircle, both Google
// Cloud badges, and the photo/bracket capture planes all independently pick
// this same z). Named here because the px -> world-unit conversion for the
// sliding groups is only correct at the depth its contents actually occupy —
// perspective means a group moved a fixed number of world units covers a
// different number of screen px at a different z.
export const TEAM_SLIDE_Z = 1.6
