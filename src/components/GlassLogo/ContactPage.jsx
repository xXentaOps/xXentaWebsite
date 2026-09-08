import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../../context/LanguageContext'
import { PAGE_MARGIN_VH } from './pageMargin'
import { XxentaWordmark } from './XxentaWordmark'

const TOPICS = [
  { id: 'enterprises', labelKey: 'contact.topics.enterprises', defaultLabel: 'AI for Enterprises' },
  { id: 'education', labelKey: 'contact.topics.education', defaultLabel: 'AI for Education' },
  { id: 'general', labelKey: 'contact.topics.general', defaultLabel: 'General Inquiry' },
]

export function ContactPage({ isOpen, onClose, onSecurityClick }) {
  const { t } = useLanguage()
  const [selectedTopic, setSelectedTopic] = useState('enterprises')
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('idle') // 'idle' | 'submitting' | 'submitted'

  // Lock background Lenis scroll when open
  useEffect(() => {
    if (!isOpen) return
    window.__lenis?.stop()
    return () => {
      window.__lenis?.start()
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return
    setStatus('submitting')
    // Simulated smooth network response
    setTimeout(() => {
      setStatus('submitted')
    }, 600)
  }

  const handleReset = () => {
    setFormData({ name: '', email: '', message: '' })
    setStatus('idle')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dimmed backdrop covering lower screen */}
          <motion.div
            key="contact-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          {/* Top-anchored Contact Sheet */}
          <motion.div
            key="contact-panel"
            initial={{ y: '-100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.65, ease: [0.4, 0, 0.1, 1] }}
            className="fixed inset-x-0 top-0 z-50 max-h-[92vh] overflow-y-auto overscroll-contain touch-pan-y border-b border-white/10 bg-[#0F172B] shadow-2xl"
            data-contact-panel
            data-lenis-prevent
            style={{
              paddingLeft: `max(1.5rem, ${PAGE_MARGIN_VH}vh)`,
              paddingRight: `max(1.5rem, ${PAGE_MARGIN_VH}vh)`,
            }}
          >
            {/* Signature Footer-matched content animation:
                appears small (scale 0.9) and blurry (blur 14px), sharpening to crisp scale 1 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, filter: 'blur(14px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.94, filter: 'blur(10px)' }}
              transition={{ duration: 0.85, ease: [0.4, 0, 0.1, 1], delay: 0.05 }}
              style={{ transformOrigin: '50% 25%' }}
              className="mx-auto flex w-full max-w-7xl flex-col py-10"
            >
              {/* Header Row */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-6">
                <div className="flex items-center gap-4">
                  <XxentaWordmark className="text-xs font-medium text-white/60" />
                  <span className="text-white/20">/</span>
                  <span className="text-[11px] font-normal tracking-[0.2em] text-white/50 uppercase">
                    {t('contact.header', 'Contact & Inquiries')}
                  </span>
                </div>

                <button
                  type="button"
                  data-contact-close
                  onClick={onClose}
                  className="group flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors duration-200 hover:text-white"
                  aria-label={t('contact.closeAria', 'Close Contact Dialog')}
                >
                  <svg
                    className="h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Two-Column Responsive Content */}
              <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 lg:items-center">
                {/* Left Column: Basic Information */}
                <div className="flex flex-col lg:col-span-5">
                  <h2 className="text-xl font-light tracking-tight text-white/95 sm:text-2xl md:text-3xl">
                    {t('contact.title', 'Let’s build something intelligent together.')}
                  </h2>

                  <p className="mt-4 max-w-md text-xs leading-[1.9] font-extralight text-white/40">
                    {t(
                      'contact.description',
                      'Whether you are looking to deploy responsive AI simulations, build enterprise automation pipelines, or explore a strategic partnership, our team is ready to connect.'
                    )}
                  </p>

                  {/* Signature 20vw Divider */}
                  <div className="my-8 h-px w-[20vw] bg-white/10" />

                  {/* Contact Channels */}
                  <div className="space-y-6">
                    <div>
                      <span className="text-[11px] font-normal tracking-[0.2em] text-white/50 uppercase">
                        {t('contact.directInquiries', 'Direct Inquiries')}
                      </span>
                      <a
                        href="mailto:contact@xxenta.com"
                        className="mt-2 block text-xs font-extralight text-white/80 transition-colors duration-200 hover:text-white"
                      >
                        contact@xxenta.com
                      </a>
                    </div>

                    <div>
                      <span className="text-[11px] font-normal tracking-[0.2em] text-white/50 uppercase">
                        {t('contact.phoneLabel', 'Phone')}
                      </span>
                      <a
                        href="tel:+310418794055"
                        className="mt-2 block text-xs font-extralight text-white/80 transition-colors duration-200 hover:text-white"
                      >
                        +31 0418 794 055
                      </a>
                    </div>

                    <div>
                      <span className="text-[11px] font-normal tracking-[0.2em] text-white/50 uppercase">
                        {t('contact.officeLocationLabel', 'Office Location')}
                      </span>
                      <span className="mt-2 block text-xs font-extralight text-white/50">
                        {t('contact.officeLocationText', 'xXenta B.V. · Zaltbommel, The Netherlands')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Contact Form */}
                <div className="flex flex-col lg:col-span-7">
                  {status === 'submitted' ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex h-full min-h-[320px] flex-col justify-center rounded-2xl border border-white/10 bg-white/[0.02] p-8 md:p-12"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-400">
                        ✓
                      </div>
                      <h3 className="mt-5 text-lg font-light text-white/95">
                        {t('contact.successTitle', 'Message sent successfully')}
                      </h3>
                      <p className="mt-2 max-w-md text-xs leading-[1.8] font-extralight text-white/50">
                        {t(
                          'contact.successBody',
                          'Thank you for reaching out, {name}. Our team has received your message and will review your inquiry shortly.'
                        ).replace('{name}', formData.name)}
                      </p>
                      <div className="mt-8">
                        <button
                          type="button"
                          onClick={handleReset}
                          className="cursor-pointer text-xs font-extralight tracking-[0.1em] text-white/50 underline transition-colors duration-200 hover:text-white"
                        >
                          {t('contact.sendAnother', 'Send another message')}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
                      {/* Topic Pill Selector */}
                      <div>
                        <label className="block text-[11px] font-normal tracking-[0.2em] text-white/50 uppercase">
                          {t('contact.areaOfInterest', 'Area of Interest')}
                        </label>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {TOPICS.map((topic) => {
                            const isSelected = selectedTopic === topic.id
                            return (
                              <button
                                key={topic.id}
                                type="button"
                                onClick={() => setSelectedTopic(topic.id)}
                                className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-extralight transition-all duration-200 ${
                                  isSelected
                                    ? 'border border-white/40 bg-white/15 text-white'
                                    : 'border border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20 hover:text-white/70'
                                }`}
                              >
                                {t(topic.labelKey, topic.defaultLabel)}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Name & Email Fields */}
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="contact-name"
                            className="block text-[11px] font-normal tracking-[0.2em] text-white/50 uppercase"
                          >
                            {t('contact.nameLabel', 'Name')}
                          </label>
                          <input
                            id="contact-name"
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={t('contact.namePlaceholder', 'Your name or organization')}
                            className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-extralight text-white placeholder-white/20 transition-colors duration-200 focus:border-white/30 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor="contact-email"
                            className="block text-[11px] font-normal tracking-[0.2em] text-white/50 uppercase"
                          >
                            {t('contact.emailLabel', 'Email')}
                          </label>
                          <input
                            id="contact-email"
                            required
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder={t('contact.emailPlaceholder', 'name@company.com')}
                            className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-extralight text-white placeholder-white/20 transition-colors duration-200 focus:border-white/30 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Message Field */}
                      <div>
                        <label
                          htmlFor="contact-message"
                          className="block text-[11px] font-normal tracking-[0.2em] text-white/50 uppercase"
                        >
                          {t('contact.messageLabel', 'Message')}
                        </label>
                        <textarea
                          id="contact-message"
                          required
                          rows={4}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder={t('contact.messagePlaceholder', 'Tell us about your project, goals, or questions...')}
                          className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-extralight text-white placeholder-white/20 transition-colors duration-200 focus:border-white/30 focus:outline-none"
                        />
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={status === 'submitting'}
                          className="cursor-pointer rounded-full border border-white/20 bg-white/[0.06] px-6 py-2.5 text-xs font-normal tracking-[0.1em] text-white transition-all duration-300 hover:border-white/40 hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {status === 'submitting'
                            ? t('contact.sendingButton', 'Sending...')
                            : t('contact.sendButton', 'Send Message')}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Bottom Divider & Copyright */}
              <div className="mt-10 h-px w-full bg-white/10" />

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] font-extralight tracking-[0.15em] text-white/25">
                <span>© {new Date().getFullYear()} xXenta. {t('contact.allRightsReserved', 'All rights reserved.')}</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose?.()
                    onSecurityClick?.()
                  }}
                  className="cursor-pointer transition-colors duration-200 hover:text-white/60"
                >
                  {t('contact.securityLink', 'Security & Compliance')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default ContactPage
