// The page's own left margin: where "New Way of" starts in the hero, where
// the highlighted blue cell edge lands beside the placeholder copy, and now
// where About Us's copy begins and how far in from the right its photo is
// allowed to reach.
//
// Measured against viewport *height*, not width, and that is deliberate.
// HeroTitle's type scales off height, so a width-based margin would drift
// against the type at every aspect ratio other than the one it was tuned at
// (HeroTitle's own note has the longer version). 0.4em of a reference size
// that is itself 19% of the viewport height works out at 7.6% of the height
// — about 68px on a 900px screen, 82px on a 1080px one.
//
// One definition, three readers. It used to be two copies of the same two
// numbers: HeroTitle's, and BackgroundGlowSection's HERO_-prefixed
// duplicate, kept apart on the reasoning that the two canvases had nothing
// else in common. They have this in common, and it is the only thing that
// matters here — everything glued to the left of this page has to agree on
// where left is, and two constants agreeing today is not the same thing as
// one constant. About Us would have made it three.
export const MARGIN_EM = 0.4
export const MARGIN_REFERENCE_FONT_FRACTION = 0.19

// As a fraction of viewport height, which is what every reader actually
// wants; the two constants above are kept separate only because HeroTitle
// needs the reference size on its own for its bottom margin too.
export const PAGE_MARGIN_HEIGHT_FRACTION = MARGIN_EM * MARGIN_REFERENCE_FONT_FRACTION

// ...and the same number in the unit CSS can state directly, so a DOM
// element can sit on this margin without measuring anything.
export const PAGE_MARGIN_VH = PAGE_MARGIN_HEIGHT_FRACTION * 100

export function pageMarginPx(viewportHeight) {
  return PAGE_MARGIN_HEIGHT_FRACTION * viewportHeight
}
