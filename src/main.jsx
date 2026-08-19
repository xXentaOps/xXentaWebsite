import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Temporary isolated-component preview route: visit ?preview=logo to view
// the glass logo work in progress without touching the real homepage.
const isLogoPreview = new URLSearchParams(window.location.search).get('preview') === 'logo'

// Dynamic imports, not static ones — App and GlassLogoPreview pull in
// entirely separate, unrelated Three.js scenes (App's own placeholder cube
// + postprocessing bloom vs. the real hero's shaders/geometry/environment
// bake), and only one of them ever actually renders per page load, decided
// above. Static imports of both would bundle both into every visitor's
// download regardless of which branch runs; loading only the chosen one
// on demand keeps whichever page a visitor lands on from paying for the
// other's code.
const App = lazy(() => import('./App.jsx'))
const GlassLogoPreview = lazy(() => import('./components/GlassLogo/GlassLogoPreview.jsx'))

// Browsers restore the previous scroll offset on refresh by default. On a
// single-page-tall site that's invisible; now that this preview scrolls
// across hero/carousel/glow sections, refreshing after having scrolled down
// loads the page already scrolled — the hero (and its title, pinned near
// its own bottom margin) renders cut off near the bottom of the viewport
// for a beat, until layout/Lenis settle and it reads as the title "snapping"
// into its intro animation from the wrong place. Forcing manual restoration
// and scrolling to the top before React even mounts (rather than in a
// useEffect, which would already be a frame too late) removes that stale
// starting position entirely, every load.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}
window.scrollTo(0, 0)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>{isLogoPreview ? <GlassLogoPreview /> : <App />}</Suspense>
  </StrictMode>,
)
