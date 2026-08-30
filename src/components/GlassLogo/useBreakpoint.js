import { useEffect, useState } from 'react'

// Mirrors Tailwind v4's own default breakpoints (md=768, lg=1024) so CSS
// `md:`/`lg:` classes and this JS branch always agree on where the line
// falls. `matchMedia`'s own change listener (not a `resize` listener) only
// fires when the match actually flips, so a drag-resize doesn't re-render
// on every intermediate pixel.
const MOBILE_QUERY = '(max-width: 767px)'
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1023px)'

function readBreakpoint() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'desktop'
  if (window.matchMedia(MOBILE_QUERY).matches) return 'mobile'
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet'
  return 'desktop'
}

export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState(readBreakpoint)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined

    const mobileQuery = window.matchMedia(MOBILE_QUERY)
    const tabletQuery = window.matchMedia(TABLET_QUERY)
    const update = () => setBreakpoint(readBreakpoint())

    mobileQuery.addEventListener('change', update)
    tabletQuery.addEventListener('change', update)
    return () => {
      mobileQuery.removeEventListener('change', update)
      tabletQuery.removeEventListener('change', update)
    }
  }, [])

  return breakpoint
}
