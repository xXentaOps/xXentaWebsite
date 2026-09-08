import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { ClientLogoCarousel } from './ClientLogoCarousel'

describe('ClientLogoCarousel', () => {
  it('renders xXenta wordmark logos instead of Client placeholders', () => {
    const html = renderToString(<ClientLogoCarousel />)

    // Should NOT contain any placeholder client names
    expect(html).not.toContain('Client A')
    expect(html).not.toContain('Client B')
    expect(html).not.toContain('Client C')
    expect(html).not.toContain('Client D')
    expect(html).not.toContain('Client E')
    expect(html).not.toContain('Client F')

    // Should contain xXenta wordmarks with their SVG logo mark
    expect(html).toContain('>x<')
    expect(html).toContain('viewBox="0 0 406.77 407"')
    expect(html).toContain('enta')

    // Should contain the carousel container and track
    expect(html).toContain('data-client-carousel')
    expect(html).toContain('animate-[marquee_32s_linear_infinite]')
  })
})
