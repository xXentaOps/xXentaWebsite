import { useState } from 'react'
import { motion } from 'framer-motion'

// Placeholder links with no page of their own yet — clicking one just
// toggles the same grey a selected grid button uses (see BackgroundGrid's
// visibleIndex), purely as a placeholder cue. "About Us" is different: it
// opens/closes the About Us overlay (see isAboutUsOpen in GlassLogoPreview),
// so its color is driven by whether that overlay is actually open
// (isAboutUsActive), not by an independent click toggle of its own, and
// clicking it opens/closes that overlay instead of merely changing color.
const OTHER_NAV_LINKS = ['Contact', 'Security & Compliance']

// Fixed, not absolute — this used to be part of GlassLogoHero's own markup,
// positioned absolute within the hero section, which meant it scrolled away
// the instant a visitor scrolled past the hero into the carousel/glow
// sections below. Lifted out to GlassLogoPreview's own top level and pinned
// to the viewport instead, so it now stays on screen through every section
// and through the About Us open/close transition, same as a real site's
// navbar would.
export function SiteNavbar({ isAboutUsActive, onAboutUsClick, onLogoClick }) {
  const [selectedLink, setSelectedLink] = useState(null)

  return (
    <div className="pointer-events-none fixed inset-x-6 top-5 z-20 flex items-center justify-between md:inset-x-8 md:top-6">
      {/* A shared flex row (items-center), rather than two independently
          absolute-positioned elements at the same `top`, is what actually
          guarantees xXenta and the nav links land on the same visual
          center — different font sizes carry different line-heights, so
          equal `top` offsets alone can leave baselines a few pixels apart
          even when (as now) the sizes themselves match. */}
      <motion.span
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        onClick={onLogoClick}
        // Same click-affordance treatment as the nav links (cursor-pointer,
        // the same hover brighten) — clicking it brings you back to the
        // hero, the standard "logo = home" convention, so it should read as
        // clickable the same way those do. pointer-events-auto of its own,
        // not inherited: the wrapping div above is pointer-events-none (so
        // its own empty margin doesn't block the canvas underneath), same
        // reasoning the nav links' own wrapper already opts back into.
        className="pointer-events-auto cursor-pointer text-xs font-medium tracking-[0.25em] text-white/15 transition-colors duration-200 hover:text-white/40"
      >
        {/* A tiny nudge left, purely a hand-tuned visual balance
            adjustment — barely perceptible on its own. */}
        <span className="inline-block -translate-x-[0.03em]">x</span>
        {/* The capital X, replaced with the actual logo mark (same path
            as src/assets/logo-xxenta.svg) — fill="currentColor" rather
            than the source file's own hardcoded white, so it automatically
            matches this span's text-white/40, transparency included, and
            stays in sync if that color ever changes. */}
        <svg
          viewBox="0 0 406.77 407"
          fill="currentColor"
          aria-hidden="true"
          // align-baseline (not align-middle) so the mark's own bottom
          // edge sits on the text baseline, flush with the bottom of the
          // surrounding letters — none of "x"/"enta" have a descender, so
          // baseline *is* their visual bottom. The parent's tracking-
          // [0.25em] already adds trailing space after "x" itself (a real
          // character), so the gap on this element's *left* is correct
          // with no extra margin — only the right needed one, since
          // tracking doesn't apply after this inline-block SVG itself,
          // leaving "e" flush against it with no gap otherwise.
          className="mr-[0.25em] inline-block h-[0.95em] w-[0.95em] align-baseline"
        >
          <path d="M295.54,19.1C308.26,6.37,324.94,0,341.61,0s33.35,6.37,46.08,19.1c25.44,25.46,25.44,66.73,0,92.2l-46.08,46.1-46.07,46.11c25.44-25.47,25.44-66.74,0-92.2-25.44-25.47-66.71-25.47-92.15,0l46.07-46.11,46.08-46.1h0ZM19.08,387.9c12.73,12.73,29.4,19.1,46.08,19.1s33.35-6.37,46.07-19.1,19.08-29.41,19.08-46.1-6.36-33.37-19.08-46.11c-12.72-12.72-29.39-19.09-46.07-19.09s-33.35,6.37-46.08,19.09c-25.44,25.47-25.44,66.74,0,92.2h0ZM387.69,295.7l-92.15-92.19c-25.44,25.46-38.17,58.83-38.17,92.2s12.73,66.73,38.17,92.19c12.72,12.73,29.39,19.1,46.07,19.1s33.35-6.37,46.08-19.1,19.08-29.41,19.08-46.1-6.35-33.37-19.08-46.11h0ZM111.24,149.48c33.35,0,66.7-12.72,92.15-38.18L111.24,19.1c-25.44-25.47-66.71-25.47-92.15,0C6.36,31.82,0,48.51,0,65.2s6.35,33.37,19.08,46.11c25.45,25.46,58.8,38.18,92.15,38.18h0Z" />
        </svg>
        enta
      </motion.span>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        className="pointer-events-auto flex items-center gap-2 text-xs font-extralight tracking-[0.2em] uppercase md:gap-4"
      >
        <span
          onClick={onAboutUsClick}
          className={`cursor-pointer px-2 py-2 transition-colors duration-200 ${
            isAboutUsActive ? 'text-white/40' : 'text-white/15 hover:text-white/40'
          }`}
        >
          About Us
        </span>
        {OTHER_NAV_LINKS.map((label) => (
          // Same hover/select treatment BackgroundGrid's own labels use —
          // padding pads out the actual hoverable box beyond just the
          // glyphs themselves, gap above trimmed by the same amount so the
          // visible spacing between labels is unchanged.
          <span
            key={label}
            onClick={() => setSelectedLink((current) => (current === label ? null : label))}
            className={`cursor-pointer px-2 py-2 transition-colors duration-200 ${
              selectedLink === label ? 'text-white/40' : 'text-white/15 hover:text-white/40'
            }`}
          >
            {label}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

export default SiteNavbar
