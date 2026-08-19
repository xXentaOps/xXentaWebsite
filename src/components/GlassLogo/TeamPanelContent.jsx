import { AnimatePresence, motion } from 'framer-motion'
import { TEAM_MEMBERS } from './teamData'
import { PANEL } from './teamLayout'

// The text shown on the glass panel. A plain DOM block positioned on exactly
// the rectangle GlassInfoPanel's mesh occupies (both read PANEL — see
// teamLayout for why pixels are the shared unit), not something rendered
// into the 3D scene: type sampled through a transmission shader would be
// blurred and chromatically fringed by the very material that makes the
// panel look like glass. Sitting on top of the canvas instead, it stays
// crisp browser-rendered text while the glass does its work behind it.
//
// Pointer-events stay off the block as a whole so the glass mesh underneath
// keeps receiving hover (which is what holds the current member in place —
// see GlassInfoPanel); only the two links opt back in.
const HOLD_HANDLERS = 'pointer-events-auto'

// A soft dark halo carried by the glyphs themselves, rather than a scrim
// behind the whole block. This is what lets the glass stay properly
// transmissive (see PANEL_GLASS in GlassInfoPanel): the panel sits over
// whatever part of the photograph happens to be beneath it — pale studio
// wall in places — and any tint strong enough to guarantee contrast across
// all of that would have killed the refraction. Two shadows, one tight and
// one wide: the tight one keeps the letterforms crisp against a busy
// background, the wide one lifts the whole line off it. Invisible against
// the dark areas, which are most of them.
const TEXT_HALO = { textShadow: '0 1px 8px rgba(4,9,20,0.95), 0 0 26px rgba(4,9,20,0.8)' }

// At rest the panel is not empty — it carries the section's own "about the
// group" copy, which is also what makes it read as a permanent part of the
// composition rather than an empty box waiting for a hover.
function GroupBlurb() {
  return (
    <>
      <p className="text-[9px] tracking-[0.3em] text-[#6BB9FF] uppercase">The Team</p>
      <p className="mt-4 text-[12px] leading-[1.85] font-extralight text-white/85">
        Seven people and two dogs, in one room, on one of the rare days all of us stood still.
      </p>
      <p className="mt-3 text-[12px] leading-[1.85] font-extralight text-white/55">
        [ A short paragraph about the team as a whole — to be added. ]
      </p>
      <p className="mt-auto pt-4 text-[9px] tracking-[0.22em] text-white/45 uppercase">Hover over anyone in the photo</p>
    </>
  )
}

function MemberProfile({ member, onHold }) {
  return (
    <>
      <p className="text-[9px] tracking-[0.3em] text-[#6BB9FF] uppercase">{member.role}</p>
      <p className="mt-2 text-[17px] leading-tight font-extralight text-white/90">{member.name}</p>
      {/* The bio is the one thing here whose length isn't known in advance.
          The panel is a fixed rectangle on purpose (a resizing pane of glass
          would be exactly the extra motion this design is avoiding), so an
          over-long paragraph is clipped rather than allowed to overflow the
          glass — and faded out at the cut instead of sliced mid-line, so it
          degrades as "there is more" rather than as a bug. Scrolling isn't an
          option: About Us closes on any downward scroll gesture (see
          GlassLogoPreview), so a scrollable region inside it would fight the
          gesture that dismisses it. */}
      <div
        className="mt-4 min-h-0 flex-1 overflow-hidden text-[12px] leading-[1.85] font-extralight text-white/70"
        style={{
          maskImage: 'linear-gradient(to bottom, black calc(100% - 24px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 24px), transparent 100%)',
        }}
      >
        {member.bio}
      </div>
      {!member.isDog && (
        <div className={`mt-4 flex items-center gap-3 text-[9px] tracking-[0.22em] uppercase ${HOLD_HANDLERS}`} onMouseEnter={onHold}>
          <a
            href={member.linkedin}
            target="_blank"
            rel="noreferrer"
            className="text-white/40 transition-colors duration-200 hover:text-[#6BB9FF]"
          >
            LinkedIn
          </a>
          <span className="h-2.5 w-px bg-white/15" />
          <a href={`mailto:${member.email}`} className="text-white/40 transition-colors duration-200 hover:text-[#6BB9FF]">
            Email
          </a>
        </div>
      )}
    </>
  )
}

export function TeamPanelContent({ activeId, isOpen, onHold }) {
  const member = TEAM_MEMBERS.find((entry) => entry.id === activeId) ?? null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isOpen ? 1 : 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: isOpen ? 0.8 : 0 }}
      className="pointer-events-none absolute"
      style={{
        right: PANEL.margin,
        bottom: PANEL.margin,
        width: PANEL.width,
        height: PANEL.height,
        // Above drei's Html markers inside the canvas (which are capped at 12
        // — see TeamMarker), so a marker near the panel can't cover its text.
        zIndex: 20,
      }}
    >
      {/* Padding is inset from the glass's own edge rather than flush to it,
          so the text sits within the slab's flat face instead of running out
          over the bevel, where the refraction distorts what's behind it most. */}
      <div className="flex h-full w-full flex-col px-7 py-6" style={TEXT_HALO}>
        {/* Keyed so a change of subject crossfades rather than swapping
            word-for-word in place, which at this text size reads as a
            flicker as the pointer moves along the row of faces. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeId ?? 'group'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex h-full min-h-0 w-full flex-col"
          >
            {member ? <MemberProfile member={member} onHold={onHold} /> : <GroupBlurb />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default TeamPanelContent
