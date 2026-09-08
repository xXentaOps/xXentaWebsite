import { useLayoutEffect, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useLanguage } from '../../context/LanguageContext'
import { PAGE_MARGIN_VH } from './pageMargin'
import { XxentaWordmark } from './XxentaWordmark'

// The link columns. Labels reuse the site's own existing vocabulary rather
// than inventing a parallel one — "AI for Education/Enterprises/Achievers"
// are BackgroundGrid's own three buttons, and About Us / Contact / Security
// & Compliance are SiteNavbar's own links — so the footer reads as the same
// site rather than a generic template dropped underneath it. None of these
// have real destinations yet (neither do the navbar's), so they're spans
// with a hover state, not <a href>s pointing at routes that don't exist.
const LINK_COLUMNS = [
  {
    id: 'solutions',
    headingKey: 'footer.headings.solutions',
    defaultHeading: 'Solutions',
    links: [
      { id: 'education', labelKey: 'footer.links.education', defaultLabel: 'AI for Education' },
      { id: 'enterprises', labelKey: 'footer.links.enterprises', defaultLabel: 'AI for Enterprises' },
      { id: 'achievers', labelKey: 'footer.links.achievers', defaultLabel: 'AI for Achievers' },
    ],
  },
  {
    id: 'company',
    headingKey: 'footer.headings.company',
    defaultHeading: 'Company',
    links: [
      { id: 'aboutUs', labelKey: 'footer.links.aboutUs', defaultLabel: 'About Us' },
      { id: 'meetTheTeam', labelKey: 'footer.links.meetTheTeam', defaultLabel: 'Meet the Team' },
      { id: 'security', labelKey: 'footer.links.security', defaultLabel: 'Security & Compliance' },
      { id: 'contact', labelKey: 'footer.links.contact', defaultLabel: 'Contact' },
    ],
  },
]

// How much of the reveal's own scroll distance the fade takes, so the footer
// reads as settled by the time you arrive rather than still fading in at the
// last pixel of travel.
const FADE_FRACTION = 0.75

// How much of the reveal's own scroll distance the zoom/blur take — later
// than the fade (asked for directly: they were finishing at the same point
// opacity does, and reads as too quick relative to it) but still short of
// the whole window, so the content is fully sharp and settled a moment
// before the true end rather than still visibly moving at the last pixel.
const ZOOM_FADE_FRACTION = 0.95

// The footer's own cap, and — deliberately the same number — how much extra
// scroll the reveal costs. Tying these together is what actually answers
// "the page above never stops going up": that scroll distance used to be a
// flat h-screen (one full extra viewport) no matter how short the footer's
// real content was, which reads as an unending scroll for content this
// modest. A fixed max-height means the extra scroll is only ever as long as
// the footer actually needs.
//
// 60 (tried first) left a visible gap above the wordmark — content is
// bottom-aligned inside this box (see justify-end below), so any cap taller
// than the content itself just pushes empty space above it rather than
// changing where the content sits. Brought down close to the real content's
// own height instead of a generous round number, so the box ends close to
// where the wordmark actually starts. Still not a tight fit deliberately —
// there's no `overflow-hidden` anywhere on this box, so content taller than
// this on some viewport (a narrower one wrapping the link columns onto more
// rows, say) simply extends above the box's own top instead of clipping;
// this number only has to be *close*, not an exact ceiling.
export const FOOTER_MAX_VH = 50

// The content's own starting scale, before the reveal has made any
// progress — small enough to read as a deliberate "zooming in to position"
// arrival alongside the fade, not so small it looks like a different kind
// of motion (a pop, a slide) fighting the opacity for attention.
const CONTENT_START_SCALE = 0.9

// Real blur on the content itself at the start of the reveal — not a glow
// (a soft light bleeding around already-sharp shapes), an actual
// filter: blur() on the text and rules themselves, sharpening to 0 as the
// zoom finishes. Chosen to be strong enough that the wordmark and links
// read as genuinely out of focus at the small end of the zoom, not just
// a faint softening.
const CONTENT_START_BLUR_PX = 14

export function SiteFooter({
  activeCategoryIndex,
  onCategoryChange,
  scrollTo,
  onAboutUsClick,
  onContactClick,
  onSecurityClick,
  onFooterNavigate,
  isFooterSwiping = false,
  style,
}) {
  // scrollY (raw pixels), not scrollYProgress. Three earlier versions of
  // this measured something — the footer's own height via ResizeObserver,
  // the document height during render, a target element's rect through
  // useScroll's own `offset` — and every one of them put the fade window in
  // the wrong place: the footer fading back *out* at the true bottom, then
  // being invisible for all but a flash of the scroll.
  const { scrollY } = useScroll()
  const spacerRef = useRef(null)

  // window.innerHeight and document.documentElement.scrollHeight, cached in
  // a ref rather than read fresh inside the per-frame transform below (an
  // earlier version did exactly that — "no measured value that can be
  // stale" — which was true, but scrollHeight forces a synchronous layout
  // reflow on read, and doing that on every scroll frame during a hard flick
  // is real main-thread jank. This piece's own wheel-gesture rule that
  // scrolling up must always stop at the hero (see GlassLogoPreview's
  // gestureStartedAtTop) depends on the classifier reading gesture
  // boundaries off real event timing, which a stalled frame corrupts — that
  // file's own comments describe this exact failure mode at length. Caching
  // here instead — measured on mount, resize, and whenever the showcase category
  // changes or content resizes — keeps the per-frame read down to a plain
  // property lookup, no layout cost at all.
  const dimsRef = useRef({
    viewport: typeof window !== 'undefined' ? (window.innerHeight || 1) : 1,
    maxScroll:
      typeof window !== 'undefined'
        ? Math.max(0, (document.documentElement.scrollHeight || 1) - (window.innerHeight || 1))
        : 0,
  })
  useLayoutEffect(() => {
    function measure() {
      const viewport = window.innerHeight
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewport)
      dimsRef.current = { viewport, maxScroll }
    }
    measure()
    window.addEventListener('resize', measure)

    // Watch the preceding content container (the main page scrolling wrapper) for height changes.
    // When switching between showcase categories (Education vs Enterprises), this container's height changes.
    const previousElement = spacerRef.current?.previousElementSibling
    let observer = null
    if (previousElement) {
      observer = new ResizeObserver(measure)
      observer.observe(previousElement)
    }

    const rafId = requestAnimationFrame(measure)
    const timeoutId = setTimeout(measure, 100)

    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
      cancelAnimationFrame(rafId)
      clearTimeout(timeoutId)
    }
  }, [activeCategoryIndex])

  // The one shared 0->1 number opacity/scale/blur are all derived from —
  // computed once here rather than three times, so they can never drift out
  // of step with each other the way separately written copies of this same
  // formula eventually would. Unscaled by either FADE_FRACTION or
  // ZOOM_FADE_FRACTION: 0 exactly at revealStart, 1 exactly at the true end
  // of the reveal window, with each effect below applying its own fraction
  // to this same raw number rather than to each other's already-scaled
  // output. useTransform's function form re-runs whenever a motion value
  // read inside it changes — scrollY here — so this recomputes on every
  // scroll frame.
  const rawProgress = useTransform(scrollY, (latest) => {
    const { viewport, maxScroll } = dimsRef.current
    const vh = viewport || (typeof window !== 'undefined' ? window.innerHeight : 0) || 1
    const revealDistance = vh * (FOOTER_MAX_VH / 100)
    if (!revealDistance || revealDistance <= 0) return 0
    // The spacer below is the last `revealDistance` px of the document, so
    // its top edge reaches the bottom of the screen — the instant the
    // footer starts being uncovered — exactly this far down.
    const revealStart = maxScroll - revealDistance
    const p = (latest - revealStart) / revealDistance
    if (!Number.isFinite(p)) return 0
    return Math.min(1, Math.max(0, p))
  })
  const opacity = useTransform(rawProgress, (p) => {
    if (!Number.isFinite(p)) return 0
    return Math.min(1, Math.max(0, p / FADE_FRACTION))
  })
  const zoomProgress = useTransform(rawProgress, (p) => {
    if (!Number.isFinite(p)) return 0
    return Math.min(1, Math.max(0, p / ZOOM_FADE_FRACTION))
  })
  const scale = useTransform(zoomProgress, [0, 1], [CONTENT_START_SCALE, 1])
  // A real filter string, not a number — framer-motion animates `filter`
  // like any other CSS value as long as it's handed a valid one on every
  // frame, so this derives the whole `blur(...)` string directly rather
  // than animating a bare px number that would need converting separately.
  const filter = useTransform(zoomProgress, (p) => {
    const val = Number.isFinite(p) ? p : 0
    return `blur(${(1 - val) * CONTENT_START_BLUR_PX}px)`
  })
  const pointerEvents = useTransform(rawProgress, (p) => (Number.isFinite(p) && p > 0.4 ? 'auto' : 'none'))

  const displayOpacity = isFooterSwiping ? 1 : opacity
  const displayScale = isFooterSwiping ? 1 : scale
  const displayFilter = isFooterSwiping ? 'none' : filter
  const displayPointerEvents = isFooterSwiping ? 'none' : pointerEvents

  return (
    <>
      {/* The scroll room the footer is revealed through: FOOTER_MAX_VH,
          stated in CSS rather than measured off the footer. Matches the
          footer's own cap below exactly (see FOOTER_MAX_VH's own comment) —
          a round, fixed distance needs no measurement at all, and it's the
          same distance the transform above uses. */}
      <div ref={spacerRef} aria-hidden style={{ height: `${FOOTER_MAX_VH}vh` }} />

      {/* Capped to FOOTER_MAX_VH, not the full viewport — an earlier
          version pinned only the bottom edge at the footer's own natural
          height, which clips the top off the moment real content is taller
          than a visitor's viewport; spanning the full screen fixed that but
          made the reveal cost a whole extra viewport of scroll regardless of
          how little content there was to show. A fixed max-height splits
          the difference: still tall enough that ordinary copy can never hit
          it (so still no clipping), but no taller than that, so the scroll
          spent revealing it is proportional to what's actually being
          revealed. z-0 keeps it under the page's own sections (see the z-10
          wrapper in GlassLogoPreview), which is what makes this a reveal
          rather than an overlay — they're opaque navy, so the footer is
          only ever visible through the transparent spacer above. */}
      <motion.footer
        style={{
          height: `${FOOTER_MAX_VH}vh`,
          paddingLeft: `${PAGE_MARGIN_VH}vh`,
          paddingRight: `${PAGE_MARGIN_VH}vh`,
          willChange: isFooterSwiping ? 'transform' : 'auto',
          ...style,
        }}
        className={`pointer-events-none fixed inset-x-0 bottom-0 flex flex-col justify-end pb-10 ${
          isFooterSwiping ? 'z-20 bg-[#0F172B]' : 'z-0'
        }`}
      >
        {/* Opacity and scale on the content, not the <footer> box itself —
            the box is a positioning shell that should stay exactly where it
            is regardless of either. pointer-events-auto re-enabled here
            (the shell above is none) so the shell's own empty upper portion
            never sits in front of the page swallowing clicks.
            transformOrigin center — asked for explicitly over the content's
            own natural left/bottom anchor: this div stretches to the
            footer's full width (flex-col's default align-items: stretch),
            so its own horizontal center lands close to the screen's, and
            scaling from there reads as the whole block growing in from the
            middle of the viewport rather than growing outward from the
            wordmark's own corner. The trade-off is the one thing a
            non-content-anchored origin always costs: the wordmark's own
            position visibly drifts left/down as scale grows toward 1,
            settling into its resting spot only once the zoom finishes,
            rather than sitting still through the whole reveal. */}
        <motion.div
          style={{
            opacity: displayOpacity,
            scale: displayScale,
            filter: displayFilter,
            pointerEvents: displayPointerEvents,
            transformOrigin: '50% 50%',
          }}
          className={isFooterSwiping ? 'pointer-events-none' : 'pointer-events-auto'}
        >
          <SiteFooterContent
            activeCategoryIndex={activeCategoryIndex}
            onFooterNavigate={onFooterNavigate}
            onCategoryChange={onCategoryChange}
            scrollTo={scrollTo}
            onAboutUsClick={onAboutUsClick}
            onContactClick={onContactClick}
            onSecurityClick={onSecurityClick}
          />
        </motion.div>
      </motion.footer>
    </>
  )
}

export function SiteFooterContent({
  activeCategoryIndex,
  onFooterNavigate,
  onCategoryChange,
  scrollTo,
  onAboutUsClick,
  onContactClick,
  onSecurityClick,
}) {
  const { t } = useLanguage()

  return (
    <>
      {/* Everything left-justified against the page's shared left margin
          — the same edge the hero's title, About Us's copy, and the
          highlighted grid cell all start from (see pageMargin.js). */}
      <XxentaWordmark
        className={`block text-xs font-medium text-white/40 cursor-pointer hover:text-white/70 transition-colors duration-200`}
        onClick={() => {
          if (onFooterNavigate) {
            onFooterNavigate({ target: 'hero', categoryIndex: activeCategoryIndex ?? 0 })
          } else {
            scrollTo?.(0)
          }
        }}
      />

      <p className="mt-6 max-w-[340px] text-xs leading-[1.9] font-extralight text-white/35">
        {t('footer.tagline', "It's all about performance.")}
      </p>

      {/* 20vw — literally a fifth of the screen, as asked, rather than a
          fifth of the content column (which sits inside the margins and
          would read narrower than intended). */}
      <div className="mt-10 h-px w-[20vw] bg-white/10" />

      {/* Columns sized to their own content and spaced by a real gap,
          rather than an equal-thirds grid — the three headings then sit
          in a tight, deliberate group against the left margin instead of
          being pushed apart to fill a wide desktop viewport. Wraps below
          md, where three columns of tracked-out labels stop fitting. */}
      <div className="mt-10 flex flex-wrap gap-x-20 gap-y-10">
        {LINK_COLUMNS.map((column) => (
          <div key={column.id} className="flex flex-col">
            {/* Uppercase + wide tracking, matching how SiteNavbar sets
                its own links apart — here it separates a heading from
                the plain sentence-case links under it. */}
            <span className="text-[11px] font-normal tracking-[0.2em] text-white/50 uppercase">
              {t(column.headingKey, column.defaultHeading)}
            </span>
            <div className="mt-5 flex flex-col gap-3">
              {column.links.map((link) => {
                const handleClick = () => {
                  if (onFooterNavigate) {
                    if (link.id === 'education') {
                      onFooterNavigate({ target: 'showcase', categoryIndex: 0 })
                    } else if (link.id === 'enterprises') {
                      onFooterNavigate({ target: 'showcase', categoryIndex: 1 })
                    } else if (link.id === 'achievers') {
                      onFooterNavigate({ target: 'hero', categoryIndex: 2 })
                    } else if (link.id === 'aboutUs') {
                      onFooterNavigate({ target: 'about-us' })
                    } else if (link.id === 'meetTheTeam') {
                      onFooterNavigate({ target: 'meet-the-team' })
                    } else if (link.id === 'contact') {
                      onFooterNavigate({ target: 'contact' })
                    } else if (link.id === 'security') {
                      onFooterNavigate({ target: 'security' })
                    }
                    return
                  }
                  if (link.id === 'education') {
                    onCategoryChange?.(0)
                    scrollTo?.(0)
                  } else if (link.id === 'enterprises') {
                    onCategoryChange?.(1)
                    scrollTo?.(0)
                  } else if (link.id === 'achievers') {
                    onCategoryChange?.(2)
                    scrollTo?.(0)
                  } else if (link.id === 'aboutUs' || link.id === 'meetTheTeam') {
                    onAboutUsClick?.()
                  } else if (link.id === 'contact') {
                    onContactClick?.()
                  } else if (link.id === 'security') {
                    onSecurityClick?.()
                  }
                }

                return (
                  <span
                    key={link.id}
                    data-footer-link={link.defaultLabel}
                    onClick={handleClick}
                    className="cursor-pointer text-xs font-extralight text-white/30 transition-colors duration-200 hover:text-white/60"
                  >
                    {t(link.labelKey, link.defaultLabel)}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Full bleed between the two page margins — the footer's own
          padding is what those margins are, so a plain full-width child
          lands exactly on them with nothing to calculate. */}
      <div className="mt-12 h-px w-full bg-white/10" />

      <p className="mt-8 text-[11px] font-extralight tracking-[0.15em] text-white/25">
        © {new Date().getFullYear()} xXenta. {t('footer.allRightsReserved', 'All rights reserved.')}
      </p>
    </>
  )
}

export default SiteFooter
