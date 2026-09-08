import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { XxentaWordmark } from './XxentaWordmark'
import { useLanguage } from '../../context/LanguageContext'

// Placeholder links with no page of their own yet — clicking one just
// toggles the same grey a selected grid button uses (see BackgroundGrid's
// visibleIndex), purely as a placeholder cue. "About Us" is different: it
// opens/closes the About Us overlay (see isAboutUsOpen in GlassLogoPreview),
// so its color is driven by whether that overlay is actually open
// (isAboutUsActive), not by an independent click toggle of its own, and
// clicking it opens/closes that overlay instead of merely changing color.
// "About Us", "Contact", and "Security & Compliance" open/close their
// respective overlays, so their appearance is driven by isAboutUsActive,
// isContactActive, and isSecurityActive.
const OTHER_NAV_LINKS = []

// Fixed, not absolute — this used to be part of GlassLogoHero's own markup,
// positioned absolute within the hero section, which meant it scrolled away
// the instant a visitor scrolled past the hero into the carousel/glow
// sections below. Lifted out to GlassLogoPreview's own top level and pinned
// to the viewport instead, so it now stays on screen through every section
// and through the About Us open/close transition, same as a real site's
// navbar would.
function navLinkClass(isActive, isDrp) {
  if (isDrp) {
    return `cursor-pointer px-2 py-2 transition-colors duration-300 ${
      isActive ? 'text-[#E3E1E1]' : 'text-[#E3E1E1] hover:text-white'
    }`
  }
  return `cursor-pointer px-2 py-2 transition-colors duration-300 ${
    isActive ? 'text-white/40' : 'text-white/15 hover:text-white/40'
  }`
}

export function SiteNavbar({
  isAboutUsActive,
  isContactActive = false,
  isSecurityActive = false,
  isDrpActive = false,
  onAboutUsClick,
  onContactClick,
  onSecurityClick,
  onLogoClick,
}) {
  const [selectedLink, setSelectedLink] = useState(null)
  // Below `md`, "About Us" / "Contact" / "Security & Compliance" plus the
  // wordmark no longer fit in one row (confirmed: three tracked-out labels
  // alongside the logo overflow a phone-width viewport) — collapsed behind
  // this toggle into a dropdown instead, same links, same click handlers.
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const { language, setLanguage, t } = useLanguage()

  // In About Us, Contact, or Security overlay, isDrpActive should not apply because they are dark navy
  const effectiveDrp = isDrpActive && !isAboutUsActive && !isContactActive && !isSecurityActive

  return (
    <div className="pointer-events-none fixed inset-x-6 top-5 z-30 flex items-center justify-between md:inset-x-8 md:top-6">
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
        // Logo-click behaves identically to the "HOME" link on the original
        // hero, the standard "logo = home" convention, so it should read as
        // clickable the same way those do. pointer-events-auto of its own,
        // not inherited: the wrapping div above is pointer-events-none (so
        // its own empty margin doesn't block the canvas underneath), same
        // reasoning the nav links' own wrapper already opts back into.
        className={`pointer-events-auto cursor-pointer text-xs font-medium transition-colors duration-300 ${
          effectiveDrp ? 'text-[#E3E1E1] hover:text-white' : 'text-white/15 hover:text-white/40'
        }`}
      >
        {/* The mark itself lives in XxentaWordmark now — shared verbatim
            with the footer, which needs the identical construction (see
            that file for why the spacing inside it can't be duplicated by
            hand). Size, weight, color, and the click affordance above stay
            here, where they differ between the two. */}
        <XxentaWordmark />
      </motion.span>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
        className="pointer-events-auto hidden items-center gap-2 text-xs font-extralight tracking-[0.2em] uppercase md:flex md:gap-4"
      >
        <span onClick={onAboutUsClick} className={navLinkClass(isAboutUsActive, effectiveDrp)}>
          {t('common.navbar.aboutUs')}
        </span>
        <span
          data-nav-contact
          onClick={onContactClick}
          className={navLinkClass(isContactActive, effectiveDrp)}
        >
          {t('common.navbar.contact')}
        </span>
        <span
          data-nav-security
          onClick={onSecurityClick}
          className={navLinkClass(isSecurityActive, effectiveDrp)}
        >
          {t('common.navbar.security')}
        </span>
        {OTHER_NAV_LINKS.map((label) => (
          // Same hover/select treatment BackgroundGrid's own labels use —
          // padding pads out the actual hoverable box beyond just the
          // glyphs themselves, gap above trimmed by the same amount so the
          // visible spacing between labels is unchanged.
          <span
            key={label}
            onClick={() => setSelectedLink((current) => (current === label ? null : label))}
            className={navLinkClass(selectedLink === label, effectiveDrp)}
          >
            {label}
          </span>
        ))}

        {/* Desktop Language Switcher: EN / NL */}
        <div className="ml-4 flex items-center gap-1.5 text-xs font-extralight tracking-[0.2em]">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`cursor-pointer transition-colors duration-200 ${
              language === 'en'
                ? effectiveDrp
                  ? 'font-normal text-black/80'
                  : 'font-normal text-[#F8FAFC]/70'
                : effectiveDrp
                ? 'text-black/35 hover:text-black/70'
                : 'text-[#F8FAFC]/30 hover:text-[#F8FAFC]/60'
            }`}
            aria-label="Switch to English"
          >
            EN
          </button>
          <span
            className={`select-none text-[10px] font-thin ${
              effectiveDrp ? 'text-black/20' : 'text-[#F8FAFC]/20'
            }`}
          >
            /
          </span>
          <button
            type="button"
            onClick={() => setLanguage('nl')}
            className={`cursor-pointer transition-colors duration-200 ${
              language === 'nl'
                ? effectiveDrp
                  ? 'font-normal text-black/80'
                  : 'font-normal text-[#F8FAFC]/70'
                : effectiveDrp
                ? 'text-black/35 hover:text-black/70'
                : 'text-[#F8FAFC]/30 hover:text-[#F8FAFC]/60'
            }`}
            aria-label="Schakel naar Nederlands"
          >
            NL
          </button>
        </div>
      </motion.div>

      {/* Mobile-only control row: language switcher + hamburger button */}
      <div className="flex items-center gap-3 md:hidden">
        {/* Mobile Language Switcher */}
        <div className="pointer-events-auto flex items-center gap-1.5 text-xs font-extralight tracking-[0.2em]">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`cursor-pointer transition-colors duration-200 ${
              language === 'en'
                ? effectiveDrp
                  ? 'font-normal text-black/80'
                  : 'font-normal text-[#F8FAFC]/70'
                : effectiveDrp
                ? 'text-black/35 hover:text-black/70'
                : 'text-[#F8FAFC]/30 hover:text-[#F8FAFC]/60'
            }`}
            aria-label="Switch to English"
          >
            EN
          </button>
          <span
            className={`select-none text-[10px] font-thin ${
              effectiveDrp ? 'text-black/20' : 'text-[#F8FAFC]/20'
            }`}
          >
            /
          </span>
          <button
            type="button"
            onClick={() => setLanguage('nl')}
            className={`cursor-pointer transition-colors duration-200 ${
              language === 'nl'
                ? effectiveDrp
                  ? 'font-normal text-black/80'
                  : 'font-normal text-[#F8FAFC]/70'
                : effectiveDrp
                ? 'text-black/35 hover:text-black/70'
                : 'text-[#F8FAFC]/30 hover:text-[#F8FAFC]/60'
            }`}
            aria-label="Schakel naar Nederlands"
          >
            NL
          </button>
        </div>

        {/* Mobile hamburger toggle */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          onClick={() => setIsMenuOpen((current) => !current)}
          aria-label={isMenuOpen ? t('common.navbar.menuClose') : t('common.navbar.menuOpen')}
          className="pointer-events-auto flex h-10 w-10 flex-col items-center justify-center gap-1.5"
        >
          <span
            className={`h-px w-5 transition-all duration-300 ${effectiveDrp ? 'bg-[#E3E1E1]' : 'bg-white/40'} ${
              isMenuOpen ? 'translate-y-[3.5px] rotate-45' : ''
            }`}
          />
          <span
            className={`h-px w-5 transition-all duration-300 ${effectiveDrp ? 'bg-[#E3E1E1]' : 'bg-white/40'} ${
              isMenuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`h-px w-5 transition-all duration-300 ${effectiveDrp ? 'bg-[#E3E1E1]' : 'bg-white/40'} ${
              isMenuOpen ? '-translate-y-[3.5px] -rotate-45' : ''
            }`}
          />
        </motion.button>
      </div>

      {/* Dropdown panel for the toggle above — same links/handlers as the
          desktop row, just stacked. Positioned relative to the outer fixed
          wrapper (its own positioning context), not the button itself. */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-auto absolute top-full right-0 mt-3 flex flex-col items-end gap-1 rounded-lg bg-[#0F172B]/90 px-3 py-3 text-xs font-extralight tracking-[0.2em] uppercase backdrop-blur-sm md:hidden"
          >
            <span
              onClick={() => {
                onAboutUsClick()
                setIsMenuOpen(false)
              }}
              className={navLinkClass(isAboutUsActive, effectiveDrp)}
            >
              {t('common.navbar.aboutUs')}
            </span>
            <span
              onClick={() => {
                onContactClick?.()
                setIsMenuOpen(false)
              }}
              className={navLinkClass(isContactActive, effectiveDrp)}
            >
              {t('common.navbar.contact')}
            </span>
            <span
              data-nav-security-mobile
              onClick={() => {
                onSecurityClick?.()
                setIsMenuOpen(false)
              }}
              className={navLinkClass(isSecurityActive, effectiveDrp)}
            >
              {t('common.navbar.security')}
            </span>
            {OTHER_NAV_LINKS.map((label) => (
              <span
                key={label}
                onClick={() => {
                  setSelectedLink((current) => (current === label ? null : label))
                  setIsMenuOpen(false)
                }}
                className={navLinkClass(selectedLink === label, effectiveDrp)}
              >
                {label}
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SiteNavbar
