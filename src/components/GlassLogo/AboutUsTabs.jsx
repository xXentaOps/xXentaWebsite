import { motion } from 'framer-motion'

const TABS = [
  { id: 'mission', label: 'Our Mission' },
  { id: 'team', label: 'Meet the Team' },
]

// Replaces the section's old static title — this is what "About Us" opens
// to now, and it doubles as the only navigation between its two
// subsections. A sliding underline (framer-motion's layoutId, the same
// primitive tab bars everywhere use) rather than any bigger motion: the
// content switch itself is a plain crossfade (see OurMission/TeamScene's
// own isOpen/visible props) — restrained on purpose, after an earlier pass
// here (a tilted "loose photo on a table" you clicked to open) read as
// gimmicky rather than professional.
export function AboutUsTabs({ activeTab, onSelect, isOpen }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: isOpen ? 0.5 : 0 }}
      className={`absolute inset-x-0 top-20 z-20 flex items-center justify-center gap-10 md:top-24 ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`relative pb-3 text-xs font-extralight tracking-[0.25em] uppercase transition-colors duration-200 ${
              active ? 'text-white/90' : 'text-white/35 hover:text-white/60'
            }`}
          >
            {tab.label}
            {active && (
              <motion.span
                layoutId="about-us-tab-underline"
                transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                className="absolute inset-x-0 bottom-0 h-px bg-[#6BB9FF]"
              />
            )}
          </button>
        )
      })}
    </motion.div>
  )
}

export default AboutUsTabs
