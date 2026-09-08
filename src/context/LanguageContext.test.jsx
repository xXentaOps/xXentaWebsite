import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { LanguageProvider, useLanguage } from './LanguageContext'
import { translations } from '../i18n'

function TestConsumer({ testKey, fallback }) {
  const { language, t } = useLanguage()
  const val = t(testKey, fallback)
  return (
    <div>
      <span data-testid="lang">{language}</span>
      <span data-testid="val">{typeof val === 'object' ? JSON.stringify(val) : val}</span>
    </div>
  )
}

describe('LanguageContext and i18n System', () => {
  it('provides translations for both English and Dutch dictionaries', () => {
    expect(translations.en).toBeDefined()
    expect(translations.nl).toBeDefined()
    expect(translations.en.common.navbar.contact).toBe('Contact')
    expect(translations.nl.common.navbar.contact).toBe('Contact')
    expect(translations.en.hero.newWaysOf).toBe('New Ways of')
    expect(translations.nl.hero.newWaysOf).toBe('Nieuwe Manieren van')
    expect(translations.en.simulations.tag).toBe('Experiential Learning')
    expect(translations.nl.simulations.tag).toBe('Ervaringsgericht Leren')
  })

  it('renders English by default and resolves dot notation paths', () => {
    const html = renderToString(
      <LanguageProvider>
        <TestConsumer testKey="common.navbar.aboutUs" />
      </LanguageProvider>
    )
    expect(html).toContain('About Us')
  })

  it('resolves arrays and complex nested objects correctly', () => {
    const html = renderToString(
      <LanguageProvider>
        <TestConsumer testKey="hero.learningWords" />
      </LanguageProvider>
    )
    expect(html).toContain('Learning')
    expect(html).toContain('Managing')
    expect(html).toContain('Growing')
  })

  it('falls back gracefully to fallback string or path when key not found', () => {
    const html = renderToString(
      <LanguageProvider>
        <TestConsumer testKey="nonexistent.deep.key" fallback="Custom Fallback" />
      </LanguageProvider>
    )
    expect(html).toContain('Custom Fallback')
  })

  it('all critical top-level sections exist in both dictionaries', () => {
    const requiredSections = [
      'common',
      'hero',
      'simulations',
      'examsSyllabi',
      'syllabusOverview',
      'aiImpact',
      'noordhuys',
      'aboutUs',
      'footer',
      'contact',
      'security',
    ]

    for (const section of requiredSections) {
      expect(translations.en[section], `en missing ${section}`).toBeDefined()
      expect(translations.nl[section], `nl missing ${section}`).toBeDefined()
    }
  })

  it('provides all 5 Floren Showcase guided messages in both English and Dutch', () => {
    expect(translations.en.simulations.guidedMessages).toHaveLength(5)
    expect(translations.nl.simulations.guidedMessages).toHaveLength(5)

    expect(translations.en.simulations.guidedMessages[0]).toContain('Every case runs live')
    expect(translations.nl.simulations.guidedMessages[0]).toContain('Elke casus verloopt live')

    translations.nl.simulations.guidedMessages.forEach((msg, idx) => {
      expect(typeof msg).toBe('string')
      expect(msg.length).toBeGreaterThan(10)
    })
  })
})
