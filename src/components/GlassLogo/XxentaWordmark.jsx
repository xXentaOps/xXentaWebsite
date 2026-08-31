// The xXenta wordmark: lowercase "x", the logo mark standing in for the
// capital X, then "enta". Extracted from SiteNavbar once the footer needed
// the identical mark — the same reasoning pageMargin.js gives for collapsing
// its own duplicated constants ("two constants agreeing today is not the
// same thing as one constant"). The spacing between the three pieces is
// genuinely load-bearing here (see the tracking/margin notes below), so a
// second hand-copied version would be exactly the kind of thing that drifts
// silently.
//
// Renders the mark and nothing else — no color, size, weight, or animation.
// Every caller wraps it in its own element (SiteNavbar in an animated,
// clickable motion.span; the footer in a plain one) and owns those there,
// so this stays the one thing they actually share.
export function XxentaWordmark({ className = '' }) {
  return (
    // tracking lives here rather than on each caller: it isn't decoration on
    // this mark, it's part of its construction. The gap to the *left* of the
    // logo mark below is produced entirely by the letter-spacing trailing
    // the real "x" character before it — take the tracking away and the mark
    // collides with the x, which is why it can't be a caller's choice.
    <span className={`tracking-[0.25em] ${className}`}>
      {/* A tiny nudge left, purely a hand-tuned visual balance
          adjustment — barely perceptible on its own. */}
      <span className="inline-block -translate-x-[0.03em]">x</span>
      {/* The capital X, replaced with the actual logo mark (same path as
          src/assets/logo-xxenta.svg) — fill="currentColor" rather than the
          source file's own hardcoded white, so it automatically matches
          whatever text color the caller sets, transparency included, and
          stays in sync if that color ever changes. */}
      <svg
        viewBox="0 0 406.77 407"
        fill="currentColor"
        aria-hidden="true"
        // align-baseline (not align-middle) so the mark's own bottom edge
        // sits on the text baseline, flush with the bottom of the
        // surrounding letters — none of "x"/"enta" have a descender, so
        // baseline *is* their visual bottom. The parent's tracking already
        // adds trailing space after "x" itself (a real character), so the
        // gap on this element's *left* is correct with no extra margin —
        // only the right needed one, since tracking doesn't apply after
        // this inline-block SVG itself, leaving "e" flush against it with
        // no gap otherwise.
        className="mr-[0.25em] inline-block h-[0.95em] w-[0.95em] align-baseline"
      >
        <path d="M295.54,19.1C308.26,6.37,324.94,0,341.61,0s33.35,6.37,46.08,19.1c25.44,25.46,25.44,66.73,0,92.2l-46.08,46.1-46.07,46.11c25.44-25.47,25.44-66.74,0-92.2-25.44-25.47-66.71-25.47-92.15,0l46.07-46.11,46.08-46.1h0ZM19.08,387.9c12.73,12.73,29.4,19.1,46.08,19.1s33.35-6.37,46.07-19.1,19.08-29.41,19.08-46.1-6.36-33.37-19.08-46.11c-12.72-12.72-29.39-19.09-46.07-19.09s-33.35,6.37-46.08,19.09c-25.44,25.47-25.44,66.74,0,92.2h0ZM387.69,295.7l-92.15-92.19c-25.44,25.46-38.17,58.83-38.17,92.2s12.73,66.73,38.17,92.19c12.72,12.73,29.39,19.1,46.07,19.1s33.35-6.37,46.08-19.1,19.08-29.41,19.08-46.1-6.35-33.37-19.08-46.11h0ZM111.24,149.48c33.35,0,66.7-12.72,92.15-38.18L111.24,19.1c-25.44-25.47-66.71-25.47-92.15,0C6.36,31.82,0,48.51,0,65.2s6.35,33.37,19.08,46.11c25.45,25.46,58.8,38.18,92.15,38.18h0Z" />
      </svg>
      enta
    </span>
  )
}

export default XxentaWordmark
