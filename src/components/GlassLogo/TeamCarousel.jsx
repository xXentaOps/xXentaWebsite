import { useEffect, useRef } from 'react'
import { CornerBrackets } from './CornerBrackets'
import { TEAM_MEMBERS } from './teamData'

// Each card's share of the scroller's own visible width, not the viewport's
// — a flex-basis percentage is relative to its flex container's content
// box, so this holds regardless of screen size or the scroller's own side
// padding. Comfortably over half on purpose: enough width for one card to
// read as "the" card currently in view, while what's left (under 40%,
// across the gap below) can only ever show a partial next card, never a
// second full one — that partial edge is the whole point, the visual cue
// that there's more to slide to. Capped by maxWidthPx so cards don't grow
// absurdly wide on very large monitors.
const CARD_BASIS_PERCENT = 62
const CARD_MAX_WIDTH_PX = 460
const CARD_GAP_PX = 40

function TeamMemberCard({ member }) {
  return (
    <div
      className="snap-start"
      style={{ flex: `0 0 ${CARD_BASIS_PERCENT}%`, maxWidth: CARD_MAX_WIDTH_PX }}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-white/5">
        <img
          src={`/team/${member.id}.jpg`}
          alt={member.name}
          draggable={false}
          className="h-full w-full object-cover"
        />
        <CornerBrackets />
      </div>
      <div className="mt-5">
        {!member.isDog && <p className="text-[9px] tracking-[0.3em] text-[#6BB9FF] uppercase">{member.role}</p>}
        <p className="mt-1.5 text-[17px] font-extralight text-white/90">{member.name}</p>
        {/* bio is an array of paragraphs (see teamData.js) — joined into one
            run for this compact preview, since line-clamp-3 truncates it
            anyway and paragraph breaks don't survive a 3-line clip. */}
        <p className="mt-2 line-clamp-3 text-[12px] leading-[1.8] font-extralight text-white/55">{member.bio.join(' ')}</p>
      </div>
    </div>
  )
}

// Replaces the old hover-over-the-group-photo interaction entirely — every
// member (people, then the two dogs, same order as teamData.js) now gets
// their own dedicated square photo in a horizontal, snap-scrolling row
// instead of a shared photo with hover-revealed detail.
export function TeamCarousel({ isOpen }) {
  const scrollerRef = useRef(null)

  // A plain vertical mouse wheel does nothing on a horizontally-scrolling
  // element by default (browsers only map wheel deltaY to scrollLeft for
  // *overflowing* content with no vertical scroll of its own, which isn't
  // reliably true here since this sits inside a fixed, non-scrolling
  // section). Redirecting it here means the same "just scroll" gesture that
  // works with a trackpad's horizontal swipe also works with an ordinary
  // mouse — nobody has to discover that this needs shift-scroll.
  //
  // A native listener, not React's onWheel: React registers wheel handlers
  // as passive by default (for scroll-performance reasons that make sense
  // for the common case of *not* calling preventDefault), which silently
  // breaks preventDefault below — the browser logs a warning and scrolls
  // the page vertically anyway, on top of whatever this does. Attaching the
  // listener directly with { passive: false } is the only way to actually
  // claim the gesture.
  //
  // stopPropagation matters just as much as preventDefault here, for a
  // reason specific to this site: GlassLogoPreview's own scroll-lock state
  // machine listens for wheel input on `window` to decide when to dismiss
  // About Us back to the hero. preventDefault alone stops the *browser's*
  // default vertical scroll but does nothing about that separate listener
  // — confirmed directly, a wheel gesture over this carousel was closing
  // the whole section and jumping back to the hero mid-scroll, since that
  // listener still saw every tick bubble past it. Stopping propagation here
  // is what keeps "scroll the carousel" and "scroll-dismiss About Us" from
  // fighting over the same gesture.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    function handleWheel(event) {
      if (event.deltaY === 0) return
      event.preventDefault()
      event.stopPropagation()
      scroller.scrollBy({ left: event.deltaY })
    }
    scroller.addEventListener('wheel', handleWheel, { passive: false })
    return () => scroller.removeEventListener('wheel', handleWheel)
  }, [])

  function scrollByCard(direction) {
    const scroller = scrollerRef.current
    if (!scroller) return
    const cardWidth = Math.min(scroller.clientWidth * (CARD_BASIS_PERCENT / 100), CARD_MAX_WIDTH_PX)
    scroller.scrollBy({ left: direction * (cardWidth + CARD_GAP_PX), behavior: 'smooth' })
  }

  return (
    <div
      className={`absolute inset-0 flex items-center transition-opacity duration-500 ${
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <div
        ref={scrollerRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth px-8 md:px-16"
        style={{ gap: CARD_GAP_PX }}
      >
        {/* Empty spacers, not extra scroll-padding: a snap-start card flush
            against the scroller's own edge would sit half-hidden behind the
            section's side padding at rest — these give the first and last
            cards somewhere to snap to that isn't the container edge, while
            still letting the very first scroll gesture immediately reveal
            the second card peeking in from the right. */}
        <div aria-hidden="true" className="flex-none" style={{ width: 1 }} />
        {TEAM_MEMBERS.map((member) => (
          <TeamMemberCard key={member.id} member={member} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => scrollByCard(-1)}
        aria-label="Previous team member"
        className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/15 bg-[#0F172B]/70 p-2.5 text-white/50 backdrop-blur transition-colors duration-200 hover:text-white md:block"
      >
        <ChevronIcon direction="left" />
      </button>
      <button
        type="button"
        onClick={() => scrollByCard(1)}
        aria-label="Next team member"
        className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/15 bg-[#0F172B]/70 p-2.5 text-white/50 backdrop-blur transition-colors duration-200 hover:text-white md:block"
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  )
}

function ChevronIcon({ direction }) {
  const d = direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default TeamCarousel
