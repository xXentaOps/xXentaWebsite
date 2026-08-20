import { motion } from 'framer-motion'

// teamLayout.js (which used to export this) was deleted along with the old
// hover-based team scene — this is the only place that still needs the
// photo's path, so it's a plain local constant rather than resurrecting
// that file for one string.
const TEAM_PHOTO_SRC = '/team-photo-web.jpg'

// Same placeholder-bracket convention the rest of this piece's still-
// unwritten copy uses (see teamData.js, OurMission.jsx's own retired
// version) — three generic slots, not real certification names, so none of
// this could be mistaken for finished content.
const CERTIFICATION_PLACEHOLDERS = ['[ Certification ]', '[ Certification ]', '[ Certification ]']

// The literal "About Us" page — replaces the old Our Mission/Meet the Team
// tabs entirely (see AboutUsSection). Two columns: a headline/body/
// certifications block on the left, and the team photo with the Google
// Cloud glass badge underneath it on the right (the badge itself is a
// separate WebGL element — see GoogleCloudGlassBadge — positioned against
// badgeAnchorRef, a plain empty div reserving its footprint in the DOM
// layout so the two stay in sync without either side hardcoding the
// other's size).
export function AboutUsIntro({ isOpen, badgeAnchorRef }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: isOpen ? 0.5 : 0 }}
      className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 md:px-16"
    >
      <div className="flex w-full max-w-[1180px] flex-col items-center gap-14 md:flex-row md:items-center md:justify-between md:gap-16">
        {/* Left: headline, body copy, certifications. */}
        <div className="max-w-[480px] text-center md:text-left">
          <h1 className="text-[28px] leading-[1.25] font-extralight text-white/90 md:text-[34px]">
            [ A short, catchy line about xXenta — to be added. ]
          </h1>
          <p className="mt-6 text-[13px] leading-[1.9] font-extralight text-white/60">
            [ A paragraph on our work as a small team, and on being a Google
            Cloud partner — to be added. ]
          </p>
          <div className="mt-10 flex items-center justify-center gap-6 md:justify-start">
            {CERTIFICATION_PLACEHOLDERS.map((label, i) => (
              <div
                key={i}
                className="flex h-14 w-24 items-center justify-center border border-white/10 px-2 text-center text-[8px] leading-tight tracking-[0.15em] text-white/30 uppercase"
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Right: team photo, Google Cloud glass badge underneath it. */}
        <div className="w-full max-w-[360px]">
          <img src={TEAM_PHOTO_SRC} alt="The xXenta team" draggable={false} className="w-full rounded-sm object-cover shadow-2xl" />
          {/* Empty on purpose — see GoogleCloudGlassBadge, which renders
              into this exact footprint from the WebGL canvas underneath. */}
          <div ref={badgeAnchorRef} className="mx-auto mt-8 aspect-square w-[150px]" />
        </div>
      </div>
    </motion.div>
  )
}

export default AboutUsIntro
