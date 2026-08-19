import { motion } from 'framer-motion'

// Same placeholder-bracket convention as TeamPanelContent's own GroupBlurb/
// MemberProfile and teamData.js's role/bio fields — real copy doesn't exist
// yet, and this makes that obvious rather than reading as finished content.
export function OurMission({ isOpen }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: isOpen ? 0.15 : 0 }}
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
    >
      <p className="max-w-[560px] text-[15px] leading-[1.9] font-extralight text-white/70 md:text-[16px]">
        [ A paragraph on why xXenta exists and who it's for — to be added. ]
      </p>
    </motion.div>
  )
}

export default OurMission
