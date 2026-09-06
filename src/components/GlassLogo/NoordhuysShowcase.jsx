import { useEffect, useLayoutEffect, useRef } from 'react'
import { Canvas, extend, useFrame } from '@react-three/fiber'
import { Html, shaderMaterial } from '@react-three/drei'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { Color, MathUtils } from 'three'
import { GridPlane } from './BackgroundGrid'
import { GradientBlob } from './GradientBlob'
import { DIRECT_STYLE, EDGE_STYLE, OVERSCALE, TARGET_CELL_PX, THROUGH_GLASS_STYLE } from './gridConstants'
import { PAGE_MARGIN_VH, pageMarginPx } from './pageMargin'
import {
  BLOB_CENTER,
  BLOB_WIDTH_OVERSCALE,
  GRID_Z,
  PLANE_SIZE,
  PLANE_Z,
  SCENE_BACKDROP,
} from './sceneConstants'
import { useSeamlessGrid } from './useSeamlessGrid'
import { NoordhuysAppPanel } from './NoordhuysAppPanel'
import { NoordhuysVideoContainer } from './NoordhuysVideoContainer'
import { NoordhuysEmblem } from './NoordhuysEmblem'
import { XxentaWordmark } from './XxentaWordmark'
import { WeeklyPlanningDashboard } from './WeeklyPlanningDashboard'

const GridGlowMaterial = shaderMaterial(
  { uOpacity: 0.05, uColor: new Color('#6CA1F8') },
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  /* glsl */ `
    uniform float uOpacity;
    uniform vec3 uColor;
    void main() {
      gl_FragColor = vec4(uColor, uOpacity);
    }
  `,
)
extend({ GridGlowMaterial })

const SQUARE_LIT = new Color('#6CA1F8')
const SQUARE_GREEN = new Color('#9CD3B1')
const LIT_SQUARE_OPACITY = 0.05
const PUNCH_TEXT_BASE_OPACITY = 0.8
const EXAMS_TEXT_LEFT_MARGIN_PX = 32
const LOGO_TEXT = 'xXenta'
const LOGO_AVG_CHAR_EM = 0.6
const LOGO_TRACKING_EM = 0.2
const EXAMS_LOGO_NUDGE_EM = 0.05
const TITLE_TEXT = 'Custom Apps'
const TITLE_AVG_CHAR_EM = 0.58

function smoothstepEase(t) {
  return t * t * (3 - 2 * t)
}

function easeOutQuad(t) {
  return t * (2 - t)
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// ============================================================================
// SAVED CALLOUT CONFIGURATION (Preserved for reuse per user directive)
// ============================================================================
export const SAVED_NOORDHUYS_CALLOUT = {
  text: "Real-time multilingual operations for the modern greenhouse. From daily shifts to live translation, workers stay connected, trained, and aligned across every harvest.",
  columnFromLeft: 3,
  edgeStyle: EDGE_STYLE,
}

const ROW_DRIVE_START = 0.0
const ROW_DRIVE_END = 0.9
const EDGE_COLUMN_FROM_LEFT = 3
const DRIFT_SLACK_FRACTION = 0.5
const STAGE_SETTLE_SCALE = 0.985
const STAGE_SETTLE_SPRING = { stiffness: 180, damping: 28, mass: 0.6 }

const INTRO_VH = 100
const MOBILE_STAY_VH = 320
const TRANSITION_VH = 380
const PLANNING_STAY_VH = 320
const SHOWCASE_SCROLL_VH = MOBILE_STAY_VH + TRANSITION_VH + PLANNING_STAY_VH
const SECTION_VH = INTRO_VH + SHOWCASE_SCROLL_VH
const ENTRY_RISE_PX = 80

const BLOB_CENTER_BLUE = new Color(BLOB_CENTER)
const SCENE_BACKDROP_NAVY = new Color(SCENE_BACKDROP)
const NOORDHUYS_GLOW_GREEN = new Color('#355f45')
const NOORDHUYS_BACKDROP_DARK = new Color('#0d1610')

// ChoXPro dark grey scheme sharing the exact hue (225°) and saturation (11%) of ChoXPro (#2F323B)
const CHOXPRO_GLOW_GREY = new Color('#363a44')
const CHOXPRO_BACKDROP_DARK = new Color('#090a0c')
const SQUARE_GREY = new Color('#9fa3b0')

// Transition triggers when moving from Noordhuys to ChoXPro
const TRANSITION_START = MOBILE_STAY_VH / SHOWCASE_SCROLL_VH
const TRANSITION_END = (MOBILE_STAY_VH + TRANSITION_VH) / SHOWCASE_SCROLL_VH
const CHOX_COLOR_TRIGGER_START = TRANSITION_START
const CHOX_COLOR_TRIGGER_END = TRANSITION_END

// Reusable scratch colors to prevent allocations inside useFrame
const tempCenterColor = new Color()
const tempEdgeColor = new Color()
const tempSquareColor = new Color()

const CHOX_DESIGN_WIDTH = 1160
const CHOX_DESIGN_HEIGHT = 810

// Trigger later into scrolling as the showcase reveals into view
const COLOR_TRIGGER_START = 0.40
const COLOR_TRIGGER_END = 0.80

function NoordhuysBackdrop({ carouselRef, isVisibleRef, pinnedProgressRef, designRef, sectionRef, emblemRef, choxRef }) {
  const { size, blobWidth, blobHeight, gridWidth, gridHeight, cellSize, repeat, yPhaseShiftCells, blobY } = useSeamlessGrid(1)
  const blobMeshHeight = Math.max(PLANE_SIZE * 1.6, blobHeight * 2.5)
  const gridGroupRef = useRef(null)
  const backgroundRef = useRef(null)
  const punchRef = useRef(null)
  const logoTextRef = useRef(null)
  const titleTextRef = useRef(null)
  const litSquareRefs = useRef([])
  const centerColorRef = useRef(new Color(BLOB_CENTER))
  const edgeColorRef = useRef(new Color(SCENE_BACKDROP))
  const squareColorRef = useRef(new Color(SQUARE_LIT))
  const colorProgressRef = useRef(0)
  const choxColorProgressRef = useRef(0)

  const edgeX = -(gridWidth * OVERSCALE) / 2 + EDGE_COLUMN_FROM_LEFT * cellSize

  const heroMarginPx = pageMarginPx(size.height)
  const heroMarginWorld = heroMarginPx * (gridWidth / size.width)
  const targetEdgeLeftX = -gridWidth / 2 + heroMarginWorld
  const edgeHalfWidthWorld = EDGE_STYLE.halfWidthPx * (gridWidth / size.width)
  const finalZoomScale = targetEdgeLeftX / (edgeX - edgeHalfWidthWorld)
  const driftWorld = Math.max(0, ((gridHeight * (OVERSCALE * finalZoomScale - 1)) / 2) * DRIFT_SLACK_FRACTION)

  // 2 rows below row 3 (k = 2) geometry
  const centerPhase = 0.5 + yPhaseShiftCells
  const edgeBottomY = cellSize * (Math.floor(centerPhase) - centerPhase)
  const edgeTopY = edgeBottomY + cellSize
  const ROW_K = 2
  const targetRowY = (edgeBottomY + edgeTopY) / 2 - ROW_K * cellSize
  const litSquareCenters = [
    { x: edgeX + 0.5 * cellSize, y: targetRowY },
    { x: edgeX + 1.5 * cellSize, y: targetRowY },
  ]

  useFrame((_, delta) => {
    if (!isVisibleRef.current) return
    const group = gridGroupRef.current
    const carousel = carouselRef?.current
    if (!group || !carousel) return

    const rect = carousel.getBoundingClientRect()
    const totalTravel = window.innerHeight + rect.height
    const progress = MathUtils.clamp((window.innerHeight - rect.top) / totalTravel, 0, 1)
    const targetScale = MathUtils.lerp(1, finalZoomScale, smoothstepEase(progress))
    const nextScale = MathUtils.damp(group.scale.x, targetScale, 8, delta)
    group.scale.set(nextScale, nextScale, 1)

    // Trigger background glow & backdrop transition a bit after scrolling begins
    const rawColorT = MathUtils.clamp(
      (progress - COLOR_TRIGGER_START) / (COLOR_TRIGGER_END - COLOR_TRIGGER_START),
      0,
      1
    )
    const targetColorT = smoothstepEase(rawColorT)
    colorProgressRef.current = MathUtils.damp(colorProgressRef.current, targetColorT, 8, delta)

    const pinned = pinnedProgressRef.current
    const rawChoxColorT = MathUtils.clamp(
      (pinned - CHOX_COLOR_TRIGGER_START) / (CHOX_COLOR_TRIGGER_END - CHOX_COLOR_TRIGGER_START),
      0,
      1
    )
    const targetChoxColorT = smoothstepEase(rawChoxColorT)
    choxColorProgressRef.current = MathUtils.damp(choxColorProgressRef.current, targetChoxColorT, 8, delta)

    // Step 1: Base entrance transition: Navy/Blue -> Noordhuys Green
    tempCenterColor.lerpColors(BLOB_CENTER_BLUE, NOORDHUYS_GLOW_GREEN, colorProgressRef.current)
    tempEdgeColor.lerpColors(SCENE_BACKDROP_NAVY, NOORDHUYS_BACKDROP_DARK, colorProgressRef.current)
    tempSquareColor.lerpColors(SQUARE_LIT, SQUARE_GREEN, colorProgressRef.current)

    // Step 2: Showcase transition: Noordhuys Green -> ChoXPro Grey
    centerColorRef.current.lerpColors(tempCenterColor, CHOXPRO_GLOW_GREY, choxColorProgressRef.current)
    edgeColorRef.current.lerpColors(tempEdgeColor, CHOXPRO_BACKDROP_DARK, choxColorProgressRef.current)
    squareColorRef.current.lerpColors(tempSquareColor, SQUARE_GREY, choxColorProgressRef.current)

    if (backgroundRef.current) {
      backgroundRef.current.copy(edgeColorRef.current)
    }

    if (sectionRef?.current) {
      sectionRef.current.style.backgroundColor = edgeColorRef.current.getStyle()
    }

    // Nudge the background grid (all grid layers) so that the edge where the
    // line was lands flush against the left edge of the screen (-gridWidth / 2)
    const targetX = -heroMarginWorld * smoothstepEase(progress)
    group.position.x = MathUtils.damp(group.position.x, targetX, 8, delta)

    const targetY = driftWorld * pinned
    group.position.y = MathUtils.damp(group.position.y, targetY, 8, delta)

    // Synchronous world matrix update so Html doesn't lag 1 frame behind
    group.updateMatrixWorld(true)

    // Match text color to the Three.js scene background color (cutout punch-through effect)
    // Punch text stays permanently visible alongside both stages
    if (punchRef.current && backgroundRef.current) {
      punchRef.current.style.color = backgroundRef.current.getStyle()
      punchRef.current.style.opacity = `${PUNCH_TEXT_BASE_OPACITY}`
      punchRef.current.style.visibility = 'visible'
    }

    // Keep lit squares updated with lit color and opacity
    for (const mesh of litSquareRefs.current) {
      if (mesh?.material) {
        mesh.material.uColor.copy(squareColorRef.current)
        mesh.material.uOpacity = LIT_SQUARE_OPACITY
      }
    }

    // Responsive typography scaling based on on-screen cell dimensions —
    // sized to match the visual scale and weight of the DRP Showcase lockup
    const onScreenCellPx = TARGET_CELL_PX * nextScale
    const widthBudgetPx = Math.max(0, onScreenCellPx * 2 - EXAMS_TEXT_LEFT_MARGIN_PX)
    if (logoTextRef.current) {
      const heightPx = onScreenCellPx * 0.16
      const widthPx = widthBudgetPx / (LOGO_TEXT.length * (LOGO_AVG_CHAR_EM + LOGO_TRACKING_EM))
      const logoFontPx = Math.min(heightPx, widthPx)
      logoTextRef.current.style.fontSize = `${logoFontPx}px`
      logoTextRef.current.style.marginLeft = `${logoFontPx * EXAMS_LOGO_NUDGE_EM}px`
    }
    if (titleTextRef.current) {
      // 0.22 * onScreenCellPx yields ~59px at standard viewport zoom,
      // perfectly matching the visual scale and weight of 'Exams & Syllabi' in the DRP Showcase
      const heightPx = onScreenCellPx * 0.22
      const widthPx = widthBudgetPx / (TITLE_TEXT.length * TITLE_AVG_CHAR_EM)
      titleTextRef.current.style.fontSize = `${Math.min(heightPx, widthPx)}px`
    }

    let currentDesignScale = 1
    if (designRef?.current) {
      const zoomFactor = nextScale / finalZoomScale
      const marginPx = Math.max(24, (PAGE_MARGIN_VH / 100) * size.height)
      const baseScale = Math.min(1, (0.86 * size.height) / 838.67, (0.92 * size.width) / 960)
      const designWidthPx = 960 * baseScale
      const screenCenterX = (size.width - marginPx) - designWidthPx / 2
      const finalDeltaX = screenCenterX - size.width / 2

      const currentDeltaX = finalDeltaX * zoomFactor
      currentDesignScale = baseScale * zoomFactor

      designRef.current.style.transform = `translate3d(${currentDeltaX}px, 0px, 0) scale(${currentDesignScale})`
    }

    // Keep transparent Noordhuys emblem behind video matching the lit squares color & opacity,
    // and scrolling in lockstep with the background grid
    if (emblemRef?.current) {
      const rgbStyle = squareColorRef.current.getStyle()
      emblemRef.current.style.color = rgbStyle.replace('rgb', 'rgba').replace(')', `, ${LIT_SQUARE_OPACITY})`)

      const emblemDeltaY = (-group.position.y * (size.height / gridHeight)) / (currentDesignScale || 1)
      emblemRef.current.style.transform = `translate3d(0, ${emblemDeltaY}px, 0)`
    }

    if (choxRef?.current) {
      const zoomFactor = nextScale / finalZoomScale
      const marginPx = Math.max(24, (PAGE_MARGIN_VH / 100) * size.height)
      const maxAvailableWidth = Math.max(400, size.width - marginPx - 460)
      const maxAvailableHeight = Math.max(300, size.height - 2 * marginPx)
      const choxScale = Math.min(
        1,
        maxAvailableHeight / CHOX_DESIGN_HEIGHT,
        (0.96 * maxAvailableWidth) / CHOX_DESIGN_WIDTH
      )
      const choxWidthPx = CHOX_DESIGN_WIDTH * choxScale
      const choxScreenCenterX = (size.width - marginPx) - choxWidthPx / 2
      const finalChoxDeltaX = choxScreenCenterX - size.width / 2

      const currentDeltaX = finalChoxDeltaX * zoomFactor
      const currentScale = choxScale * zoomFactor

      choxRef.current.style.transform = `translate3d(${currentDeltaX}px, 0px, 0) scale(${currentScale})`
    }
  })

  return (
    <>
      <color ref={backgroundRef} attach="background" args={[SCENE_BACKDROP]} />
      <GradientBlob
        position={[0, blobY, PLANE_Z]}
        scale={[blobWidth * BLOB_WIDTH_OVERSCALE, blobMeshHeight, 1]}
        centerColorRef={centerColorRef}
        edgeColorRef={edgeColorRef}
      />
      <group ref={gridGroupRef}>
        <GridPlane
          z={GRID_Z}
          width={gridWidth}
          height={gridHeight}
          repeat={repeat}
          style={THROUGH_GLASS_STYLE}
          layer={0}
          yPhaseShiftCells={yPhaseShiftCells}
        />
        <GridPlane
          z={GRID_Z}
          width={gridWidth}
          height={gridHeight}
          repeat={repeat}
          style={DIRECT_STYLE}
          layer={0}
          yPhaseShiftCells={yPhaseShiftCells}
        />

        {/* The two lit squares 2 rows below row 3, first two columns on the left */}
        {litSquareCenters.map((center, i) => (
          <mesh
            key={i}
            ref={(el) => {
              litSquareRefs.current[i] = el
            }}
            position={[center.x, center.y, GRID_Z + 0.01]}
            scale={[cellSize, cellSize, 1]}
            renderOrder={2}
            raycast={() => null}
          >
            <planeGeometry args={[1, 1]} />
            <gridGlowMaterial transparent depthWrite={false} toneMapped={false} />
          </mesh>
        ))}

        {/* Lockup with xXenta logo and 'Noordhuys' below, matching DRP Showcase */}
        <Html
          zIndexRange={[10, 0]}
          position={[edgeX, targetRowY, GRID_Z + 0.02]}
          style={{ transform: `translate(${EXAMS_TEXT_LEFT_MARGIN_PX}px, -50%)`, pointerEvents: 'none' }}
        >
          <div id="noordhuys-punch-text" ref={punchRef} className="flex flex-col items-start" style={{ opacity: PUNCH_TEXT_BASE_OPACITY }}>
            <span ref={logoTextRef} className="font-medium tracking-[0.2em] whitespace-nowrap">
              <XxentaWordmark />
            </span>
            <p ref={titleTextRef} className="leading-none font-semibold whitespace-nowrap">
              {TITLE_TEXT}
            </p>
          </div>
        </Html>
      </group>
    </>
  )
}

function SceneRenderGate({ isVisibleRef }) {
  useFrame((state) => {
    if (!isVisibleRef.current) return
    state.gl.render(state.scene, state.camera)
  }, 1)
  return null
}

function usePinnedProgress(sectionRef, carouselRef) {
  const { scrollY } = useScroll()
  const rangeRef = useRef({ start: 0, distance: 1, arrivalStart: 0 })

  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!section) return
    function measure() {
      const start = section.getBoundingClientRect().top + window.scrollY
      rangeRef.current = {
        start,
        distance: Math.max(1, window.innerHeight * (SHOWCASE_SCROLL_VH / 100)),
        arrivalStart: start - window.innerHeight,
      }
    }
    measure()
    window.addEventListener('resize', measure)
    const carousel = carouselRef?.current
    const observer = carousel ? new ResizeObserver(measure) : null
    if (carousel) observer.observe(carousel)
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [sectionRef, carouselRef])

  const progress = useTransform(scrollY, (latest) => {
    const { start, distance } = rangeRef.current
    return MathUtils.clamp((latest - start) / distance, 0, 1)
  })

  const arrival = useTransform(scrollY, (latest) => {
    const { arrivalStart, start } = rangeRef.current
    return MathUtils.clamp((latest - arrivalStart) / (start - arrivalStart), 0, 1)
  })

  const progressRef = useRef(0)
  useEffect(() => {
    progressRef.current = progress.get()
    return progress.on('change', (value) => {
      progressRef.current = value
    })
  }, [progress])

  return { progress, progressRef, arrival }
}

export function NoordhuysShowcase({ carouselRef }) {
  const sectionRef = useRef(null)
  const designRef = useRef(null)
  const emblemRef = useRef(null)
  const choxRef = useRef(null)
  const { progress, progressRef, arrival } = usePinnedProgress(sectionRef, carouselRef)
  const isVisibleRef = useRef(true)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting
    })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  const stageScale = useSpring(useTransform(arrival, [0, 1], [STAGE_SETTLE_SCALE, 1]), STAGE_SETTLE_SPRING)
  const entry = useTransform(arrival, easeOutQuad)

  // Mobile stage arrival and exit motion: cleanly separated for rock-solid Framer Motion evaluation
  const mobileArriveOpacity = useTransform(entry, [0, 0.35, 1], [0, 0.8, 1])
  const mobileArriveY = useTransform(entry, [0, 1], [ENTRY_RISE_PX, 0])

  const transitionSpan = TRANSITION_END - TRANSITION_START
  const mobileExitOpacity = useTransform(
    progress,
    [TRANSITION_START + transitionSpan * 0.05, TRANSITION_START + transitionSpan * 0.60],
    [1, 0]
  )
  const mobileExitY = useTransform(progress, (p) => {
    if (p <= TRANSITION_START) return 0
    const exitT = MathUtils.clamp((p - TRANSITION_START) / (transitionSpan * 0.75), 0, 1)
    const exitDist = typeof window !== 'undefined' ? window.innerHeight * 1.25 : 1200
    return -easeInOutCubic(exitT) * exitDist
  })
  const mobileExitScale = useTransform(progress, (p) => {
    if (p <= TRANSITION_START) return 1
    const exitT = MathUtils.clamp((p - TRANSITION_START) / (transitionSpan * 0.75), 0, 1)
    return MathUtils.lerp(1, 0.95, easeInOutCubic(exitT))
  })
  const mobilePointerEvents = useTransform(progress, (p) =>
    p > TRANSITION_START + transitionSpan * 0.30 ? 'none' : 'auto'
  )

  // ChoXPro Weekly Planning stage: comes up smoothly from below into the right-hand showcase area
  const choxY = useTransform(progress, (p) => {
    const enterDist = typeof window !== 'undefined' ? window.innerHeight * 1.25 : 1200
    const enterStart = TRANSITION_START + transitionSpan * 0.20
    if (p <= enterStart) return enterDist
    const enterT = MathUtils.clamp((p - enterStart) / (TRANSITION_END - enterStart), 0, 1)
    return (1 - easeInOutCubic(enterT)) * enterDist
  })
  const choxOpacity = useTransform(
    progress,
    [TRANSITION_START + transitionSpan * 0.25, TRANSITION_START + transitionSpan * 0.80],
    [0, 1]
  )
  const choxPointerEvents = useTransform(progress, (p) =>
    p > TRANSITION_START + transitionSpan * 0.75 ? 'auto' : 'none'
  )

  const initialBaseScale = typeof window !== 'undefined'
    ? Math.min(1, (0.86 * window.innerHeight) / 838.67, (0.92 * window.innerWidth) / 960)
    : 1
  const initialMargin = typeof window !== 'undefined'
    ? Math.max(24, (PAGE_MARGIN_VH / 100) * window.innerHeight)
    : 82
  const initialDeltaX = typeof window !== 'undefined'
    ? ((window.innerWidth - initialMargin) - (960 * initialBaseScale) / 2) - window.innerWidth / 2
    : 0

  const initialChoxBaseScale = typeof window !== 'undefined'
    ? Math.min(
        1,
        Math.max(300, window.innerHeight - 2 * initialMargin) / CHOX_DESIGN_HEIGHT,
        (0.96 * Math.max(400, window.innerWidth - initialMargin - 460)) / CHOX_DESIGN_WIDTH
      )
    : 1
  const initialChoxDeltaX = typeof window !== 'undefined'
    ? ((window.innerWidth - initialMargin) - (CHOX_DESIGN_WIDTH * initialChoxBaseScale) / 2) - window.innerWidth / 2
    : 0

  return (
    <section ref={sectionRef} className="relative w-full bg-[#0F172B]" style={{ height: `${SECTION_VH}vh` }}>
      <motion.div className="sticky top-0 h-screen w-full overflow-hidden" style={{ scale: stageScale }}>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 8], fov: 35 }}
          gl={{ antialias: true, alpha: false, localClippingEnabled: true }}
        >
          <NoordhuysBackdrop
            carouselRef={carouselRef}
            isVisibleRef={isVisibleRef}
            pinnedProgressRef={progressRef}
            designRef={designRef}
            sectionRef={sectionRef}
            emblemRef={emblemRef}
            choxRef={choxRef}
          />
          <SceneRenderGate isVisibleRef={isVisibleRef} />
        </Canvas>

        {/* Floating Showcase Stage: Background Video Container & Foreground Mobile App */}
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
          style={{
            opacity: mobileArriveOpacity,
            y: mobileArriveY,
          }}
        >
          <motion.div
            className="w-full h-full flex items-center justify-center"
            style={{
              opacity: mobileExitOpacity,
              y: mobileExitY,
              scale: mobileExitScale,
              pointerEvents: mobilePointerEvents,
            }}
          >
            <div
              ref={designRef}
              id="noordhuys-design-stage"
              className="transform-gpu relative flex items-center justify-center"
              style={{
                width: 960,
                height: 838.67,
                transform: `translate3d(${initialDeltaX}px, 0px, 0) scale(${initialBaseScale})`,
                transformOrigin: 'center center',
              }}
            >
              {/* Large Noordhuys Geometric Emblem behind both video and phone */}
              <div
                ref={emblemRef}
                id="noordhuys-bg-emblem"
                className="pointer-events-none absolute z-0 select-none flex items-center justify-center transition-opacity duration-500"
                style={{
                  left: -280,
                  top: 30,
                  width: 1200,
                  height: 470,
                  color: 'rgba(108, 161, 248, 0.05)',
                }}
              >
                <NoordhuysEmblem className="w-full h-full" />
              </div>

              {/* Background Video Container underneath app */}
              <div className="absolute z-10 flex items-center justify-center">
                <NoordhuysVideoContainer width={960} height={540} />
              </div>

              {/* Foreground Mobile App Panel */}
              <div className="relative z-20">
                <NoordhuysAppPanel />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* ChoXPro Weekly Planning Stage: Glides up from below into place beside 'xXenta Custom Apps' */}
        <motion.div
          id="weekly-planning-stage"
          className="pointer-events-none absolute inset-0 flex items-center justify-center z-20"
          style={{
            y: choxY,
            opacity: choxOpacity,
            pointerEvents: choxPointerEvents,
          }}
        >
          <div
            ref={choxRef}
            id="choxpro-design-stage"
            className="transform-gpu relative flex items-center justify-center"
            style={{
              width: CHOX_DESIGN_WIDTH,
              height: CHOX_DESIGN_HEIGHT,
              transform: `translate3d(${initialChoxDeltaX}px, 0px, 0) scale(${initialChoxBaseScale})`,
              transformOrigin: 'center center',
            }}
          >
            <div className="relative w-full h-full rounded-[24px] overflow-hidden border border-white/15 bg-[#2F323B] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] backdrop-blur-md">
              {/* Subtle top edge glass reflection */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent z-40" />
              <WeeklyPlanningDashboard scrollProgress={progress} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default NoordhuysShowcase
