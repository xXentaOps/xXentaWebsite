import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { SecurityCompliancePage } from './SecurityCompliancePage'

describe('SecurityCompliancePage', () => {
  it('renders without error when isOpen is false', () => {
    const html = renderToString(
      <SecurityCompliancePage isOpen={false} onClose={() => {}} onContactClick={() => {}} />
    )
    expect(html).toBe('')
  })

  it('renders all key sections and official copy when isOpen is true', () => {
    const html = renderToString(
      <SecurityCompliancePage isOpen={true} onClose={() => {}} onContactClick={() => {}} />
    )

    // Header & Title
    expect(html).toContain('SECURITY &amp; TRUST AT xXENTA')
    expect(html).toContain('How we protect information and build operational resilience')
    expect(html).toContain('Updated: 5 August 2026')
    expect(html).toContain('ISO 27001 Aligned')

    // Status banner
    expect(html).toContain('Our current status')
    expect(html).toContain('ISO/IEC 27001:2022')
    expect(html).toContain('We are not yet ISO/IEC 27001 certified')

    // 11 Sections
    expect(html).toContain('01')
    expect(html).toContain('Our commitment')
    expect(html).toContain('02')
    expect(html).toContain('Scope')
    expect(html).toContain('03')
    expect(html).toContain('Security measures &amp; control areas')
    expect(html).toContain('04')
    expect(html).toContain('Risk management')
    expect(html).toContain('05')
    expect(html).toContain('Privacy &amp; protection of personal data')
    expect(html).toContain('06')
    expect(html).toContain('Incident &amp; breach management')
    expect(html).toContain('07')
    expect(html).toContain('Suppliers &amp; sub-processors')
    expect(html).toContain('08')
    expect(html).toContain('Governance &amp; continuous improvement')
    expect(html).toContain('09')
    expect(html).toContain('ISO/IEC 27001 roadmap &amp; certification')
    expect(html).toContain('10')
    expect(html).toContain('Regulatory readiness &amp; NIS2')
    expect(html).toContain('11')
    expect(html).toContain('Transparency &amp; contact')

    // Control areas
    expect(html).toContain('Identity and access management')
    expect(html).toContain('Cloud and infrastructure security')
    expect(html).toContain('Data handling')
    expect(html).toContain('Secure development and change')
    expect(html).toContain('Monitoring and incident response')
    expect(html).toContain('Business continuity and recovery')
    expect(html).toContain('People and awareness')
    expect(html).toContain('Supplier assurance')

    // NIS2 date check
    expect(html).toContain('15 August 2026')

    // Reference Frameworks
    expect(html).toContain('Reference framework')
    expect(html).toContain('EU GDPR / AVG')
    expect(html).toContain('Dutch Cyberbeveiligingswet')

    // Contact button action
    expect(html).toContain('Contact Security Team')
  })
})
