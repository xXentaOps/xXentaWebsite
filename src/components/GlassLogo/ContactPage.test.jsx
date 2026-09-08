import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { ContactPage } from './ContactPage'
import { LanguageProvider } from '../../context/LanguageContext'

describe('ContactPage', () => {
  it('renders nothing when isOpen is false', () => {
    const html = renderToString(
      <LanguageProvider>
        <ContactPage isOpen={false} onClose={() => {}} onSecurityClick={() => {}} />
      </LanguageProvider>
    )
    expect(html).toBe('')
  })

  it('renders contact dialog, form fields, and topic options when isOpen is true', () => {
    const html = renderToString(
      <LanguageProvider>
        <ContactPage isOpen={true} onClose={() => {}} onSecurityClick={() => {}} />
      </LanguageProvider>
    )

    // Header & Titles
    expect(html).toContain('Contact &amp; Inquiries')
    expect(html).toContain('Let’s build something intelligent together.')
    expect(html).toContain('contact@xxenta.com')
    expect(html).toContain('+31 0418 794 055')

    // Topics
    expect(html).toContain('AI for Enterprises')
    expect(html).toContain('AI for Education')
    expect(html).toContain('General Inquiry')

    // Form inputs
    expect(html).toContain('id="contact-name"')
    expect(html).toContain('id="contact-email"')
    expect(html).toContain('id="contact-message"')

    // Honeypot field
    expect(html).toContain('name="botcheck"')

    // Submit button
    expect(html).toContain('Send Message')
  })
})

