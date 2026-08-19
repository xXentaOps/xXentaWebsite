// Placeholder wordmarks — swap for real client logos/names when available.
// Bracket style ("[ Client A ]") deliberately reads as an obvious stand-in
// slot rather than a real logo, so it can't be mistaken for an actual
// client claim.
const PLACEHOLDER_CLIENTS = ['Client A', 'Client B', 'Client C', 'Client D', 'Client E', 'Client F']

// Four copies, not two — the animation moves the track exactly -25% of its
// own width (see marquee keyframes in index.css), the width of *one* copy,
// so each copy lands pixel-perfect where the previous one started, looping
// seamlessly forever. Two copies (tried first) got the seam itself exactly
// right but missed a different requirement: the *viewport* is wider
// (1440px on a typical laptop) than one copy's own rendered width (~1216px
// at this font size/tracking/margins), so for part of every cycle — right
// before it loops — the second copy's last item was the last thing that
// existed in the DOM at all, with nothing behind it to keep covering the
// screen's right edge. Read as the track visibly running out and snapping
// back, once per 32s cycle. Four copies covers viewports up to roughly
// 3×1216 ≈ 3650px wide before the same gap could reappear — comfortably
// past any realistic browser window, ultrawide monitors included.
const TRACK_ITEMS = [...PLACEHOLDER_CLIENTS, ...PLACEHOLDER_CLIENTS, ...PLACEHOLDER_CLIENTS, ...PLACEHOLDER_CLIENTS]

export function ClientLogoCarousel({ sectionRef }) {
  return (
    <section ref={sectionRef} className="relative w-full overflow-hidden bg-[#0F172B] py-12">
      {/* The mask lives on this static wrapper — not the section (tried
          first: faded the section's own navy background right along with
          the logos, revealing whatever sits behind it there instead of a
          clean edge-to-edge navy strip) and not the animated track itself
          (also tried: a mask-image's percentages are relative to its own
          element's box, so putting it on the track meant the fade zone
          scrolled *with* the content instead of staying pinned to the
          section's edges — for most of each 32s loop the fade had drifted
          off-screen entirely, showing hard-edged logos, until the one
          moment per cycle it swept back through, reading as an abrupt
          jump right at the loop point instead of a continuous scroll).
          This wrapper never moves, so its edges are always the section's
          own edges — exactly where the fade needs to stay. */}
      <div
        className="w-full"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}
      >
        {/* mr-20 on every item, not a flex `gap` — with `gap`, the spacing
            between the last item of one copy and the first item of the next
            is still just one more uniform gap, but that gap is split
            *between* items rather than owned by either one, so N copies'
            worth of items only add up to (N×6 - 1) gaps' worth of spacing,
            not N×6. -25% of that (what the animation actually moves) comes
            out short of one true copy's own repeat width by a fraction of a
            single gap — small, but a real snap right at the loop point
            every cycle. Giving each item its own trailing margin instead
            makes the gap part of the item's own box, so every copy cleanly
            contributes exactly 6 items + 6 margins on its own, and -25%
            lands exactly on one copy's true width with nothing left over. */}
        <div className="flex w-max animate-[marquee_32s_linear_infinite]">
          {TRACK_ITEMS.map((name, i) => (
            <span
              key={i}
              className="mr-20 select-none whitespace-nowrap text-sm font-extralight tracking-[0.3em] text-white/20 uppercase"
            >
              [ {name} ]
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ClientLogoCarousel
