import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, events } from '@react-three/fiber'
import { motion } from 'framer-motion'
import { ABOUT_US_TRANSITION } from './aboutUsTransition'
import { Backdrop } from './Backdrop'
import { HeroTitle } from './HeroTitle'
import { ReflectionEnvironment } from './ReflectionEnvironment'
import { usePerformanceTier } from './usePerformanceTier'

// R3F's own `eventPrefix="client"` (tried first, in place of this) computes
// pointer NDC as clientX/clientY divided straight through by the canvas's
// pixel size, with no adjustment for the canvas's own position on the page
// — see createPointerEvents's eventPrefix branch in react-three-fiber's own
// source, which skips the getBoundingClientRect() subtraction the *default*
// offsetX/Y-based compute gets for free from the browser itself. That only
// produces correct coordinates when the canvas's top-left happens to sit at
// the viewport's own origin — true at scrollY=0, false the moment the page
// scrolls at all, since clientX/Y are viewport-relative but this never
// adjusted for how far the canvas has scrolled away from (0,0). Every
// pointer-driven interaction in the hero — BackgroundGrid's button hover/
// select specifically — silently missed its target by exactly the current
// scroll offset as a result, confirmed directly: hovering right where a
// button visibly was, once scrolled even slightly, simply stopped
// registering. This wraps R3F's own default web event manager (still
// needed for eventSource's cross-element listening — see the comment on
// eventSourceRef below) with a corrected compute that subtracts the
// canvas's actual current position first, so it stays correct at any
// scroll offset instead of only at the very top of the page.
function computeClientPointer(event, state) {
  const rect = state.gl.domElement.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  state.pointer.set((x / state.size.width) * 2 - 1, -(y / state.size.height) * 2 + 1)
  state.raycaster.setFromCamera(state.pointer, state.camera)
}

function createFixedPointerEvents(store) {
  return { ...events(store), compute: computeClientPointer }
}

export function GlassLogoHero({ isAboutUsOpen, onScrollLockChange, isForceScrollingRef }) {
  const tier = usePerformanceTier()
  // Lifted here because BackgroundGrid (inside Backdrop) and HeroTitle are
  // siblings under Canvas, not parent/child — this is the nearest shared
  // ancestor that can pass the active grid button down to both.
  const [activeIndex, setActiveIndex] = useState(0)
  // R3F normally listens for pointer events on the canvas element itself —
  // fine until a real DOM element (the grid buttons' labels, now clickable;
  // see BackgroundGrid) sits visually on top of it. The browser delivers
  // mousemove to whichever element is topmost under the cursor, so once the
  // cursor was over a label, the canvas stopped receiving movement at all —
  // freezing GlassLogoGroup's pointer-driven tilt right there. Pointing
  // eventSource at this shared ancestor instead makes R3F listen where the
  // event actually still bubbles to, regardless of which child (canvas or
  // label) the browser delivered it to — paired with createFixedPointerEvents
  // above (read clientX/Y, viewport-relative, rather than offsetX/Y, which
  // would otherwise be relative to whichever element fired the event; and
  // unlike R3F's own eventPrefix="client", correctly adjusted for the
  // canvas's actual current scroll position too).
  const eventSourceRef = useRef(null)
  // This section is exactly one screen tall, and GlassLogoGroup's own
  // multi-pass capture+blur+reveal pipeline (see its priority-1 useFrame)
  // costs several full-canvas renders every frame regardless of whether the
  // section is actually on screen. Once a visitor scrolls past it into the
  // carousel/glow sections below, none of that is visible, but without this
  // it would keep paying that cost indefinitely for as long as the tab
  // stays open. A plain ref, not state — toggling R3F's own `frameloop`
  // prop instead (the first thing tried here) turned out to reset the
  // scene's clock.elapsedTime on every change (see react-three-fiber's own
  // setFrameloop), which corrupted CrispLine/AnimatedWordLine's entrance-
  // timer refs (anchored to that same clock) and left the title invisible
  // for several seconds after scrolling back — a real, reproduced
  // regression, not a hypothetical one. Threaded down to GlassLogoGroup
  // (same handoff pattern as blurredTextRef/isTextMovingRef) so its own
  // useFrame can skip its render calls entirely while this is false,
  // without R3F's loop or clock ever being touched.
  const isHeroVisibleRef = useRef(true)
  useEffect(() => {
    const section = eventSourceRef.current
    if (!section) return
    // IntersectionObserver tracks the section's actual *painted* position,
    // CSS transforms included — so this keeps working unchanged once
    // isAboutUsOpen starts translating the section off-screen below (see
    // the motion.section below): the render-pause correctly engages the
    // moment it's fully slid out of view, exactly as it already did when a
    // visitor scrolled past this section the ordinary way.
    const observer = new IntersectionObserver(([entry]) => {
      isHeroVisibleRef.current = entry.isIntersecting
    })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    // A transform (animate={{ y }}), not a layout property — this section
    // keeps contributing exactly the same h-screen of document flow either
    // way, so ClientLogoCarousel/BackgroundGlowSection right after it never
    // shift, and real scrolling into them stays completely unaffected by
    // whether About Us is open. isAboutUsOpen just visually displaces this
    // section's own painted pixels downward, out of the viewport — paired
    // with AboutUsSection animating the exact opposite offset (-100% -> 0%)
    // over the identical ABOUT_US_TRANSITION, so the seam between the two
    // never opens up: at any instant they're moving together, exactly one
    // screen height apart, giving the illusion of one continuous surface
    // sliding down to reveal what was "above" it, with no real scroll (and
    // so no change to this section's own real position) ever involved.
    <motion.section
      ref={eventSourceRef}
      initial={false}
      animate={{ y: isAboutUsOpen ? '100%' : '0%' }}
      transition={ABOUT_US_TRANSITION}
      className="relative h-screen w-full overflow-hidden bg-[#0F172B]"
    >
      <Canvas
        dpr={tier === 'high' ? [1, 2] : 1}
        camera={{ position: [0, 0, 8], fov: 35 }}
        gl={{ antialias: true, alpha: false }}
        eventSource={eventSourceRef}
        events={createFixedPointerEvents}
      >
        <Backdrop
          onActiveIndexChange={setActiveIndex}
          onScrollLockChange={onScrollLockChange}
          isForceScrollingRef={isForceScrollingRef}
        />
        <Suspense fallback={null}>
          <HeroTitle targetSize={4} highQuality={tier === 'high'} activeIndex={activeIndex} isHeroVisibleRef={isHeroVisibleRef} />
          {tier === 'high' && <ReflectionEnvironment environmentIntensity={1.3} />}
        </Suspense>
      </Canvas>
    </motion.section>
  )
}

export default GlassLogoHero
