import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PAGE_MARGIN_VH } from './pageMargin'
import { XxentaWordmark } from './XxentaWordmark'

const SECTIONS = [
  { id: 'commitment', num: '01', title: 'Our commitment' },
  { id: 'scope', num: '02', title: 'Scope' },
  { id: 'controls', num: '03', title: 'Security measures & control areas' },
  { id: 'risk', num: '04', title: 'Risk management' },
  { id: 'privacy', num: '05', title: 'Privacy & protection of personal data' },
  { id: 'incidents', num: '06', title: 'Incident & breach management' },
  { id: 'suppliers', num: '07', title: 'Suppliers & sub-processors' },
  { id: 'governance', num: '08', title: 'Governance & continuous improvement' },
  { id: 'roadmap', num: '09', title: 'ISO/IEC 27001 roadmap & certification' },
  { id: 'regulatory', num: '10', title: 'Regulatory readiness & NIS2' },
  { id: 'contact', num: '11', title: 'Transparency & contact' },
]

const CONTROL_AREAS = [
  {
    title: 'Identity and access management',
    desc: 'Access is assigned according to role and business need, with access rights reviewed as processes mature.',
  },
  {
    title: 'Cloud and infrastructure security',
    desc: 'xXenta uses managed cloud services and applies security requirements to the configuration and operation of relevant environments.',
  },
  {
    title: 'Data handling',
    desc: 'Customer information is handled according to defined purposes, access needs and applicable contractual and legal requirements.',
  },
  {
    title: 'Secure development and change',
    desc: 'Security requirements are being integrated into software development, testing, release and change-management practices.',
  },
  {
    title: 'Monitoring and incident response',
    desc: 'Procedures support the identification, reporting, assessment, containment and follow-up of information-security events and incidents.',
  },
  {
    title: 'Business continuity and recovery',
    desc: 'Dependencies, recovery needs and continuity arrangements are being assessed and documented.',
  },
  {
    title: 'People and awareness',
    desc: 'Responsibilities, confidentiality expectations and security awareness form part of the developing control framework.',
  },
  {
    title: 'Supplier assurance',
    desc: 'Security and privacy considerations are included in the selection and review of relevant service providers.',
  },
]

const GOVERNANCE_PHASES = [
  'Finalising the ISMS scope and policy framework',
  'Completing and maintaining the risk assessment, risk treatment plan and Statement of Applicability',
  'Strengthening control evidence, metrics and review routines',
  'Performing internal audits and management review',
  'Addressing identified nonconformities and improvement actions',
  'Engaging an accredited certification body when the ISMS is ready for independent assessment',
]

const REFERENCE_FRAMEWORKS = [
  {
    title: 'ISO/IEC 27001:2022',
    subtitle: 'Information security management systems (including Amendment 1:2024)',
    badge: 'In Implementation',
  },
  {
    title: 'EU GDPR / AVG',
    subtitle: 'Security of processing and personal-data breach obligations',
    badge: 'Compliant Standard',
  },
  {
    title: 'EU NIS2 & Dutch Cyberbeveiligingswet',
    subtitle: 'Cybersecurity risk management, incident reporting and supply-chain security (in force 15 August 2026)',
    badge: 'Monitored Standard',
  },
]

export function SecurityCompliancePage({ isOpen, onClose, onContactClick }) {
  const panelRef = useRef(null)
  const [activeSection, setActiveSection] = useState('commitment')

  // Lock background Lenis scroll and focus panel when open
  useEffect(() => {
    if (!isOpen) return
    window.__lenis?.stop()
    const timer = setTimeout(() => {
      panelRef.current?.focus()
    }, 50)
    return () => {
      clearTimeout(timer)
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

  const scrollToSection = (id) => {
    setActiveSection(id)
    const el = document.getElementById(`sec-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dimmed backdrop */}
          <motion.div
            key="security-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
            aria-hidden="true"
          />

          {/* Top-anchored Security Sheet (Full screen, reaching bottom edge, no scrollbar) */}
          <motion.div
            key="security-panel"
            ref={panelRef}
            tabIndex={-1}
            initial={{ y: '-100%' }}
            animate={{ y: '0%' }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.65, ease: [0.4, 0, 0.1, 1] }}
            className="fixed inset-0 z-50 h-screen overflow-y-auto overscroll-contain touch-pan-y bg-[#0F172B] shadow-2xl no-scrollbar outline-none"
            role="dialog"
            aria-modal="true"
            aria-label="Security and Compliance Information"
            data-security-panel
            data-lenis-prevent
            style={{
              paddingLeft: `max(1.5rem, ${PAGE_MARGIN_VH}vh)`,
              paddingRight: `max(1.5rem, ${PAGE_MARGIN_VH}vh)`,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {/* Animated content entry */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
              transition={{ duration: 0.85, ease: [0.4, 0, 0.1, 1], delay: 0.05 }}
              style={{ transformOrigin: '50% 20%' }}
              className="mx-auto flex w-full max-w-6xl flex-col pt-8 pb-16 md:pt-12 md:pb-24"
            >
              {/* Sticky / Top Header */}
              <div className="sticky -top-8 z-20 -mx-4 flex items-center justify-between border-b border-white/[0.08] bg-[#0F172B]/95 px-4 pb-5 backdrop-blur-md md:-top-12 md:-mx-6 md:px-6 md:pb-6">
                <div className="flex flex-wrap items-center gap-3 md:gap-4">
                  <XxentaWordmark className="text-xs font-medium text-white/60" />
                  <span className="text-white/20">/</span>
                  <span className="text-[11px] font-normal tracking-[0.2em] text-white/50 uppercase">
                    Security & Trust
                  </span>
                  <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-light tracking-wider text-white/40 uppercase sm:inline-flex">
                    Updated: 5 August 2026
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2B7FFF]/40 bg-[#2B7FFF]/10 px-2.5 py-1 text-[10px] font-light tracking-wider text-[#51A2FF] uppercase">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#51A2FF] animate-pulse" />
                    ISO 27001 Aligned
                  </span>

                  <button
                    type="button"
                    data-security-close
                    onClick={onClose}
                    className="group flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors duration-200 hover:text-white"
                    aria-label="Close Security & Compliance Dialog"
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
              </div>

              {/* Title & Hero */}
              <div className="mt-8 md:mt-12">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono tracking-widest text-[#51A2FF] uppercase">
                    xXenta Trust Center
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-light tracking-tight text-white/95 sm:text-3xl md:text-4xl lg:text-[42px] lg:leading-[1.15]">
                  SECURITY & TRUST AT xXENTA
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-extralight text-white/60 sm:text-base leading-relaxed">
                  How we protect information and build operational resilience
                </p>

                {/* Current Status Banner */}
                <div className="mt-6 rounded-xl border border-[#2B7FFF]/30 bg-[#2B7FFF]/10 p-5 backdrop-blur-sm md:p-6">
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-baseline">
                    <span className="inline-flex shrink-0 items-center gap-2 text-xs font-medium tracking-wider text-[#51A2FF] uppercase">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-[#51A2FF] opacity-75 animate-ping" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#51A2FF]" />
                      </span>
                      Our current status
                    </span>
                    <span className="hidden text-white/30 sm:inline">—</span>
                    <p className="text-xs font-light leading-relaxed text-white/80 md:text-[13px]">
                      xXenta is implementing an Information Security Management System (ISMS) aligned with{' '}
                      <span className="font-normal text-white">ISO/IEC 27001:2022</span>. We are not yet ISO/IEC 27001 certified and do not present our current programme as certification or independent assurance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Jump Navigation Pill Bar */}
              <div className="relative mt-8">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-white/[0.06] pt-2">
                  {SECTIONS.map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-light tracking-wider transition-all duration-200 cursor-pointer ${
                        activeSection === sec.id
                          ? 'border border-[#2B7FFF]/60 bg-[#2B7FFF]/20 text-[#51A2FF]'
                          : 'border border-white/[0.08] bg-white/[0.02] text-white/50 hover:border-white/20 hover:text-white/80'
                      }`}
                    >
                      <span className="font-mono text-[#51A2FF]/90 mr-1.5">{sec.num}</span>
                      {sec.title}
                    </button>
                  ))}
                </div>
                {/* Fade out gradient at right edge */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-0 bottom-2 w-20 md:w-32 bg-gradient-to-l from-[#0F172B] via-[#0F172B]/85 to-transparent z-10"
                />
              </div>

              {/* Sections Container */}
              <div className="mt-10 space-y-10">
                {/* 1. Our commitment */}
                <section
                  id="sec-commitment"
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 transition-colors hover:border-white/[0.12] md:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-[#51A2FF]">01</span>
                    <span className="h-px w-6 bg-[#51A2FF]/30" />
                    <h2 className="text-base font-normal tracking-wide text-white/95 md:text-lg">
                      Our commitment
                    </h2>
                  </div>
                  <div className="mt-4 space-y-3.5 text-xs font-extralight leading-relaxed text-white/70 md:text-[13px]">
                    <p>
                      The confidentiality, integrity and availability of information are fundamental to xXenta’s services and to the trust customers place in us. We take a structured, risk-based approach to security and work to improve our governance, processes and technical safeguards as our services and the threat landscape evolve.
                    </p>
                    <p>
                      Security is a shared responsibility across management, product development, operations, employees and relevant service providers. Our aim is to make security part of day-to-day decisions—not a one-time compliance exercise.
                    </p>
                  </div>
                </section>

                {/* 2. Scope */}
                <section
                  id="sec-scope"
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 transition-colors hover:border-white/[0.12] md:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-[#51A2FF]">02</span>
                    <span className="h-px w-6 bg-[#51A2FF]/30" />
                    <h2 className="text-base font-normal tracking-wide text-white/95 md:text-lg">
                      Scope
                    </h2>
                  </div>
                  <div className="mt-4 space-y-4 text-xs font-extralight leading-relaxed text-white/70 md:text-[13px]">
                    <p>Our security programme is being developed to cover:</p>
                    <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {[
                        'Customer information processed through xXenta services;',
                        'xXenta’s internal systems, devices and cloud environments;',
                        'Software development, testing, deployment and change management;',
                        'Employees, contractors and other people involved in service delivery; and',
                        'Third-party services and suppliers that may affect the security or continuity of our services.',
                      ].map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 text-white/80"
                        >
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#51A2FF]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="pt-2 text-white/50">
                      The formal ISMS scope, boundaries, dependencies and interfaces are being documented as part of the implementation programme.
                    </p>
                  </div>
                </section>

                {/* 3. Security measures and control areas */}
                <section
                  id="sec-controls"
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 transition-colors hover:border-white/[0.12] md:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-[#51A2FF]">03</span>
                    <span className="h-px w-6 bg-[#51A2FF]/30" />
                    <h2 className="text-base font-normal tracking-wide text-white/95 md:text-lg">
                      Security measures and control areas
                    </h2>
                  </div>
                  <p className="mt-3 text-xs font-extralight text-white/60 md:text-[13px]">
                    xXenta’s current control foundation and implementation programme address the following areas:
                  </p>

                  <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    {CONTROL_AREAS.map((item, idx) => (
                      <div
                        key={idx}
                        className="group flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-200 hover:border-[#2B7FFF]/40 hover:bg-white/[0.035]"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#51A2FF]" />
                            <h3 className="text-xs font-medium tracking-wide text-white/90">
                              {item.title}
                            </h3>
                          </div>
                          <p className="mt-2 text-[12px] font-extralight leading-relaxed text-white/65">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="mt-6 text-xs font-extralight leading-relaxed text-white/50 italic">
                    Specific safeguards may differ by service, risk and customer arrangement. Further information can be provided where appropriate and subject to confidentiality and security restrictions.
                  </p>
                </section>

                {/* 4. Risk management */}
                <section
                  id="sec-risk"
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 transition-colors hover:border-white/[0.12] md:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-[#51A2FF]">04</span>
                    <span className="h-px w-6 bg-[#51A2FF]/30" />
                    <h2 className="text-base font-normal tracking-wide text-white/95 md:text-lg">
                      Risk management
                    </h2>
                  </div>
                  <div className="mt-4 space-y-4 text-xs font-extralight leading-relaxed text-white/70 md:text-[13px]">
                    <p>Our risk-management approach includes:</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {[
                        'Identifying information assets, business processes, dependencies and owners;',
                        'Assessing threats, vulnerabilities and impacts on confidentiality, integrity and availability;',
                        'Selecting proportionate technical and organisational controls;',
                        'Documenting risk treatment decisions and residual risk; and',
                        'Reviewing risks following material changes, incidents or at planned intervals.',
                      ].map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 text-white/80"
                        >
                          <span className="font-mono text-[10px] text-[#51A2FF]/80 shrink-0 mt-0.5">
                            0{idx + 1}.
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                    <p className="pt-2 text-white/50">
                      The approach is intended to connect security priorities to business objectives, customer commitments and the evolving risk environment.
                    </p>
                  </div>
                </section>

                {/* 5. Privacy and protection of personal data */}
                <section
                  id="sec-privacy"
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 transition-colors hover:border-white/[0.12] md:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-[#51A2FF]">05</span>
                    <span className="h-px w-6 bg-[#51A2FF]/30" />
                    <h2 className="text-base font-normal tracking-wide text-white/95 md:text-lg">
                      Privacy and protection of personal data
                    </h2>
                  </div>
                  <div className="mt-4 space-y-3.5 text-xs font-extralight leading-relaxed text-white/70 md:text-[13px]">
                    <p>
                      Where xXenta processes personal data, we apply the requirements of the EU General Data Protection Regulation (GDPR/AVG) and other applicable privacy legislation. This includes applying appropriate technical and organisational measures based on the nature of the processing and the associated risks.
                    </p>
                    <p>
                      Roles and responsibilities for personal-data processing are addressed in the relevant agreements and privacy information. Data minimisation, purpose limitation, access control, retention and secure deletion are considered within the applicable process and service context.
                    </p>
                  </div>
                </section>

                {/* 6. Incident and personal-data breach management */}
                <section
                  id="sec-incidents"
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 transition-colors hover:border-white/[0.12] md:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-[#51A2FF]">06</span>
                    <span className="h-px w-6 bg-[#51A2FF]/30" />
                    <h2 className="text-base font-normal tracking-wide text-white/95 md:text-lg">
                      Incident and personal-data breach management
                    </h2>
                  </div>
                  <div className="mt-4 space-y-3.5 text-xs font-extralight leading-relaxed text-white/70 md:text-[13px]">
                    <p>
                      xXenta maintains and further develops procedures to report, assess, respond to and learn from security incidents. Activities include classification and escalation, containment and recovery, evidence and decision recording, communication with affected parties where required, and post-incident improvement.
                    </p>
                    <p>
                      Potential personal-data breaches are assessed promptly. Where xXenta acts as a processor, we notify the relevant customer in accordance with the applicable data-processing agreement. Where xXenta has a direct statutory reporting duty, notifications are made within the legally required timeframe.
                    </p>
                  </div>
                </section>

                {/* 7. Suppliers and sub-processors */}
                <section
                  id="sec-suppliers"
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 transition-colors hover:border-white/[0.12] md:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-[#51A2FF]">07</span>
                    <span className="h-px w-6 bg-[#51A2FF]/30" />
                    <h2 className="text-base font-normal tracking-wide text-white/95 md:text-lg">
                      Suppliers and sub-processors
                    </h2>
                  </div>
                  <div className="mt-4 space-y-3.5 text-xs font-extralight leading-relaxed text-white/70 md:text-[13px]">
                    <p>
                      We take a risk-based approach to third parties that support our services. Relevant considerations include the provider’s security capabilities, access to information, contractual safeguards, continuity arrangements, data-processing role, location of processing and available independent assurance. Access is intended to be limited to what is necessary for the service provided.
                    </p>
                    <p>
                      Where a third party processes personal data on our behalf, the applicable privacy and contractual requirements are addressed through appropriate agreements and oversight.
                    </p>
                  </div>
                </section>

                {/* 8. Governance and continuous improvement */}
                <section
                  id="sec-governance"
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 transition-colors hover:border-white/[0.12] md:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-[#51A2FF]">08</span>
                    <span className="h-px w-6 bg-[#51A2FF]/30" />
                    <h2 className="text-base font-normal tracking-wide text-white/95 md:text-lg">
                      Governance and continuous improvement
                    </h2>
                  </div>
                  <div className="mt-4 space-y-4 text-xs font-extralight leading-relaxed text-white/70 md:text-[13px]">
                    <p>
                      Information-security responsibilities are assigned within xXenta and are being embedded in governance, product and operational decision-making. Policies, procedures, control ownership and evidence are maintained and improved through a structured cycle.
                    </p>
                    <p className="font-normal text-white/90">The next implementation phases include:</p>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {GOVERNANCE_PHASES.map((phase, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 text-white/80"
                        >
                          <svg
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#51A2FF]"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>{phase}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* 9. ISO/IEC 27001 roadmap and certification status */}
                <section
                  id="sec-roadmap"
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 transition-colors hover:border-white/[0.12] md:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-[#51A2FF]">09</span>
                    <span className="h-px w-6 bg-[#51A2FF]/30" />
                    <h2 className="text-base font-normal tracking-wide text-white/95 md:text-lg">
                      ISO/IEC 27001 roadmap and certification status
                    </h2>
                  </div>
                  <div className="mt-4 space-y-3.5 text-xs font-extralight leading-relaxed text-white/70 md:text-[13px]">
                    <p>
                      xXenta is working towards certification against ISO/IEC 27001:2022. The programme also takes account of the 2024 climate-action amendment to the standard where relevant to the organisation’s context. Certification will only be claimed after a successful independent audit and the formal issue of a valid certificate by an accredited certification body.
                    </p>
                    <p>
                      We do not currently publish a fixed certification date. This avoids creating an assurance that depends on completion of internal implementation, audit readiness and the certification process. We will update this page when our status materially changes.
                    </p>
                  </div>
                </section>

                {/* 10. Regulatory readiness and customer supply chains */}
                <section
                  id="sec-regulatory"
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-6 transition-colors hover:border-white/[0.12] md:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-[#51A2FF]">10</span>
                    <span className="h-px w-6 bg-[#51A2FF]/30" />
                    <h2 className="text-base font-normal tracking-wide text-white/95 md:text-lg">
                      Regulatory readiness and customer supply chains
                    </h2>
                  </div>
                  <div className="mt-4 space-y-3.5 text-xs font-extralight leading-relaxed text-white/70 md:text-[13px]">
                    <p>
                      xXenta monitors legal and contractual developments relevant to its services, including the GDPR and the Dutch Cyberbeveiligingswet, which implements the EU NIS2 Directive and enters into force on 15 August 2026.
                    </p>
                    <p>
                      Even where a requirement does not apply directly to xXenta, customers may need assurance from suppliers as part of their own risk-management and supply-chain obligations. Our ISMS programme is therefore designed to support proportionate customer due-diligence requests and to provide clear, evidence-based responses without disclosing information that could weaken security.
                    </p>
                  </div>
                </section>

                {/* 11. Transparency, assurance and contact */}
                <section
                  id="sec-contact"
                  className="rounded-2xl border border-[#2B7FFF]/30 bg-gradient-to-b from-white/[0.03] to-[#2B7FFF]/10 p-6 md:p-8"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-medium text-[#51A2FF]">11</span>
                    <span className="h-px w-6 bg-[#51A2FF]/30" />
                    <h2 className="text-base font-normal tracking-wide text-white/95 md:text-lg">
                      Transparency, assurance and contact
                    </h2>
                  </div>
                  <div className="mt-4 space-y-3.5 text-xs font-extralight leading-relaxed text-white/70 md:text-[13px]">
                    <p>
                      We aim to communicate accurately about our security maturity. Information shared publicly is necessarily high level. Depending on the nature of the request, contract and confidentiality arrangements, customers may request further information such as relevant policies, data-processing terms, sub-processor information, security questionnaires or other available evidence.
                    </p>
                    <p>
                      To report a suspected security issue or ask a security-related question, please use xXenta’s published contact channel and clearly mark the message ‘Security’. Please do not include passwords, access tokens, full datasets or other sensitive material in an initial report.
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-4 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose?.()
                          onContactClick?.()
                        }}
                        className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-[#2B7FFF]/50 bg-[#2B7FFF]/15 px-5 py-2.5 text-xs font-normal tracking-wider text-[#51A2FF] transition-all duration-200 hover:border-[#51A2FF] hover:bg-[#2B7FFF]/30 hover:text-white"
                      >
                        <span>Contact Security Team</span>
                        <svg
                          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              {/* Reference Framework Footer Box */}
              <div className="mt-14 border-t border-white/10 pt-8">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-normal tracking-[0.2em] text-white/50 uppercase">
                    Reference framework
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {REFERENCE_FRAMEWORKS.map((ref, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-medium text-white/90">{ref.title}</h4>
                          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-mono text-white/50 uppercase">
                            {ref.badge}
                          </span>
                        </div>
                        <p className="mt-2 text-[11px] font-extralight leading-relaxed text-white/50">
                          {ref.subtitle}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row">
                  <span className="text-[11px] font-extralight tracking-wider text-white/30">
                    © {new Date().getFullYear()} xXenta. Information Security & Compliance.
                  </span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs font-extralight tracking-wider text-white/40 hover:text-white transition-colors cursor-pointer"
                  >
                    Back to website ↑
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default SecurityCompliancePage
