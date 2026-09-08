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

// The root is cached on the container rather than created fresh on every
// evaluation of this module, because this module does not only run once.
// Vite re-executes it whenever an edit invalidates the module graph all the
// way up to here (any change to a non-component export several files down
// will do it), and a bare createRoot() call then mounts a *second* complete
// copy of the app into the same container, appended below the first —
// hero, carousel, glow, hero, carousel, glow, on and on, looking exactly
// like the page had started repeating itself. Two of everything comes with
// it: two sets of wheel/keydown listeners racing to open and dismiss About
// Us, two Lenis instances driving the same scroll, and two of each R3F
// canvas animating the same grids out of step with one another. React warns
// about this ("call root.render() on the existing root instead"); reusing
// the root is what it is asking for, and it makes an HMR reload behave the
// same as a cold one.
import { LanguageProvider } from './context/LanguageContext'

const container = document.getElementById('root')
container.__reactRoot ??= createRoot(container)
container.__reactRoot.render(
  <StrictMode>
    <LanguageProvider>
      <Suspense fallback={null}>{isLogoPreview ? <GlassLogoPreview /> : <App />}</Suspense>
    </LanguageProvider>
  </StrictMode>,
)

