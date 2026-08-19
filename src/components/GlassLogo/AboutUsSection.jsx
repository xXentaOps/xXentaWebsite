import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { motion } from 'framer-motion'
import { AboutUsTabs } from './AboutUsTabs'
import { ABOUT_US_TRANSITION } from './aboutUsTransition'
import { GridPlane } from './BackgroundGrid'
import { OVERLAY_LAYER } from './GlassLogoGroup'
import { DIRECT_STYLE, THROUGH_GLASS_STYLE } from './gridConstants'
import { GradientBlob } from './GradientBlob'
import { OurMission } from './OurMission'
import { ReflectionEnvironment } from './ReflectionEnvironment'
import { BLOB_WIDTH_OVERSCALE, GRID_Z, PLANE_SIZE, PLANE_Z } from './sceneConstants'
import { TeamPanelContent } from './TeamPanelContent'
import { TeamScene } from './TeamScene'
import { usePerformanceTier } from './usePerformanceTier'
import { useSeamlessGrid } from './useSeamlessGrid'

// Grace period between the pointer leaving a member (or the glass panel) and
// the panel actually falling back to the team blurb. The pointer has to
// cross real photo pixels belonging to neither on the way from one to the
// other, which without this reads as a leave and flips the panel back for an
// instant mid-move.
const CLOSE_DELAY_MS = 160

// Same "second canvas, phase-shifted to continue the hero's own pattern"
// trick BackgroundGlowSection uses to continue the grid below the hero (past
// the clients' carousel) — just shifted one screen *up* instead of down
// (screenOffset -1, see useSeamlessGrid for the shared math), since this
// reads as sitting just above the hero for as long as it's revealed. No
// scroll-driven zoom or highlighted edge of its own, unlike that section —
// there's no "progress" value here for a zoom to key off, since this isn't
// scrolled *through*, just revealed and hidden again as a whole.
function SeamlessGridBackdrop() {
  const { blobWidth, blobY, gridWidth, gridHeight, repeat, yPhaseShiftCells } = useSeamlessGrid(-1)

  return (
    <>
      <color attach="background" args={['#0F172B']} />
      <GradientBlob position={[0, blobY, PLANE_Z]} scale={[blobWidth * BLOB_WIDTH_OVERSCALE, PLANE_SIZE, 1]} />
      {/* Same layer-0-only, THROUGH_GLASS_STYLE-then-DIRECT_STYLE pairing
          BackgroundGlowSection uses for the same reason — there's no glass
          logo in this canvas either, so both planes composite into what's
          actually seen directly, and the soft plane alone is what gives the
          crisp lines their glow. */}
      <GridPlane z={GRID_Z} width={gridWidth} height={gridHeight} repeat={repeat} style={THROUGH_GLASS_STYLE} layer={0} yPhaseShiftCells={yPhaseShiftCells} />
      <GridPlane z={GRID_Z} width={gridWidth} height={gridHeight} repeat={repeat} style={DIRECT_STYLE} layer={0} yPhaseShiftCells={yPhaseShiftCells} />
    </>
  )
}

// Owns this canvas's one real visible render, for two reasons that both need
// the same hook:
//
//  - The glass panel's glint overlay lives on OVERLAY_LAYER precisely so
//    GlassInfoPanel's own backdrop capture (a priority-0 useFrame,
//    guaranteed to have already run by the time this one does) can't see it.
//    Something has to switch that layer on for the visible render and off
//    again afterward, and this is it — the same job GlassLogoGroup's own
//    priority-1 useFrame does in the hero.
//  - This section is an always-mounted fixed overlay, so without a gate its
//    canvas would keep drawing the grid, the photo and a full transmission
//    pass every frame for as long as the tab is open, including the great
//    majority of the time it is parked off-screen above the hero. Skipping
//    the render entirely while it's out of view costs the hero nothing.
//
// Giving any useFrame a priority turns off R3F's own automatic render, which
// is what makes taking it over here possible at all — and also why the
// render below has to run unconditionally whenever the section is visible,
// since nothing else will do it.
function SceneRenderGate({ isVisibleRef }) {
  useFrame((state) => {
    if (!isVisibleRef.current) return
    state.camera.layers.enable(OVERLAY_LAYER)
    state.gl.render(state.scene, state.camera)
    state.camera.layers.disable(OVERLAY_LAYER)
  }, 1)
  return null
}

// A fixed overlay, not a normal-flow section — the top of the site must
// always be GlassLogoHero, reachable at real scrollY 0 exactly as before
// this existed, with nothing scrollable above it. This never touches real
// document scroll at all: it sits pinned to the viewport, resting just
// above it (y: '-100%') until isOpen flips, then slides down to cover the
// screen (y: '0%') — see ABOUT_US_TRANSITION, shared with GlassLogoHero's
// own opposite slide (0% -> 100%, down and out) so the two move in lock-
// step and the seam between them never opens up. z-10: above the hero
// (default stacking) so it visibly covers it once revealed, below the
// navbar's own z-20 so that stays on top throughout.
export function AboutUsSection({ isOpen }) {
  const tier = usePerformanceTier()
  const [activeId, setActiveId] = useState(null)
  // Which of the section's two subsections is showing — driven by
  // AboutUsTabs. Independent of isOpen (which just controls whether the
  // whole section is on screen at all, see GlassLogoPreview's own
  // scroll-lock state machine): isOpen answers "is About Us open",
  // activeTab answers "which of its two subsections is showing" once it is.
  const [activeTab, setActiveTab] = useState('mission')
  const teamOpen = activeTab === 'team'
  const closeTimerRef = useRef(null)
  const sectionRef = useRef(null)
  // Whether this section is actually painting anywhere on screen — see
  // SceneRenderGate. An IntersectionObserver rather than the isOpen prop:
  // it tracks the section's real painted position, CSS transform included,
  // so it stays true for the whole of the slide-out (during which the
  // section is still very much visible) and only drops once it has genuinely
  // left the viewport, which isOpen — flipping at the *start* of that
  // animation — would get wrong in exactly the way that freezes the last
  // frame on screen mid-slide.
  const isVisibleRef = useRef(true)
  // The same fact as isVisibleRef, kept as state as well because two
  // different things need it at two different rates: the render gate reads
  // it every frame (a ref, so it never causes a re-render), while mounting
  // and unmounting the glass panel is a React decision that has to re-render
  // to happen at all. It changes exactly twice per open/close.
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting
      setIsVisible(entry.isIntersecting)
    })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // The photo texture, the transmission material's buffers and the
  // reflection environment's one-time cube bake are all paid for at mount,
  // and this section is mounted from the very first frame even though it
  // starts parked off-screen. Left eager, that work lands squarely on top of
  // the hero's own first paint and delays it badly — measured directly: the
  // hero was still completely blank at 3.4s and only finished at ~6.4s, on a
  // local dev server. Deferring it to the browser's first idle moment gets
  // the hero back to painting on its own schedule, while still having the
  // section fully built long before anyone can reach it (opening it requires
  // either a deliberate scroll-up at the top of the page or a nav click).
  // The isOpen branch is the safety net for the case where someone gets
  // there first anyway.
  const [sceneReady, setSceneReady] = useState(false)
  useEffect(() => {
    if (isOpen) setSceneReady(true)
  }, [isOpen])
  useEffect(() => {
    if (sceneReady) return
    // The timeout is what guarantees it still happens on a page that never
    // goes idle; requestIdleCallback alone could otherwise wait indefinitely.
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(() => setSceneReady(true), { timeout: 4000 })
      return () => cancelIdleCallback(handle)
    }
    const timer = setTimeout(() => setSceneReady(true), 2500)
    return () => clearTimeout(timer)
  }, [sceneReady])

  useEffect(() => () => clearTimeout(closeTimerRef.current), [])
  // Closing the section never fires a pointer-leave of its own — the whole
  // thing simply slides away under a stationary cursor — so without this,
  // whoever was last hovered would still be showing on the panel the next
  // time it opened. Resetting activeTab alongside it is the same idea one
  // level up: reopening About Us should always land back on Our Mission,
  // not wherever it happened to be left mid-visit.
  useEffect(() => {
    if (!isOpen) {
      setActiveId(null)
      setActiveTab('mission')
    }
  }, [isOpen])

  function openMember(id) {
    clearTimeout(closeTimerRef.current)
    setActiveId(id)
  }
  function holdMember() {
    clearTimeout(closeTimerRef.current)
  }
  function closeMemberSoon() {
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => setActiveId(null), CLOSE_DELAY_MS)
  }

  return (
    <motion.section
      ref={sectionRef}
      initial={false}
      animate={{ y: isOpen ? '0%' : '-100%' }}
      transition={ABOUT_US_TRANSITION}
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-10 h-screen w-full overflow-hidden bg-[#0F172B] ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <Canvas dpr={tier === 'high' ? [1, 2] : 1} camera={{ position: [0, 0, 8], fov: 35 }} gl={{ antialias: true, alpha: false }}>
        <SeamlessGridBackdrop />
        {/* Same modest white light the hero gives its own glass (see
            Backdrop) — the blue reflection environment below is meant to be
            the dominant source, this is just enough for the panel's edges to
            catch a highlight. */}
        <directionalLight position={[4, 5, 6]} intensity={0.5} />
        <Suspense fallback={null}>
          {sceneReady && (
            <TeamScene
              activeId={activeId}
              highQuality={tier === 'high'}
              visible={teamOpen}
              showPanel={isVisible && teamOpen}
              onOpen={openMember}
              onHold={holdMember}
              onCloseSoon={closeMemberSoon}
            />
          )}
          {/* The glass panel's material carries envMapIntensity 4.5 (it is
              the hero's own material, imported wholesale), so without an
              environment to reflect it would render as a flat, nearly
              featureless slab. This is the same abstract blue glow bake the
              hero uses — it holds no scene-specific content, just light. */}
          {sceneReady && tier === 'high' && <ReflectionEnvironment environmentIntensity={1.3} />}
        </Suspense>
        <SceneRenderGate isVisibleRef={isVisibleRef} />
      </Canvas>

      <AboutUsTabs activeTab={activeTab} onSelect={setActiveTab} isOpen={isOpen} />

      <OurMission isOpen={isOpen && !teamOpen} />

      <TeamPanelContent activeId={activeId} isOpen={isOpen && teamOpen} onHold={holdMember} />
    </motion.section>
  )
}

export default AboutUsSection
