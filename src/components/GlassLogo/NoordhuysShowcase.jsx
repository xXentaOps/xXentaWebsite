import { useEffect, useLayoutEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { MathUtils } from 'three'
import { GridPlane } from './BackgroundGrid'
import { GradientBlob } from './GradientBlob'
import { DIRECT_STYLE, EDGE_STYLE, OVERSCALE, THROUGH_GLASS_STYLE } from './gridConstants'
import { pageMarginPx } from './pageMargin'
import {
  BLOB_WIDTH_OVERSCALE,
  GRID_Z,
  PLANE_SIZE,
  PLANE_Z,
  SCENE_BACKDROP,
} from './sceneConstants'
import { useSeamlessGrid } from './useSeamlessGrid'
import { NoordhuysAppPanel } from './NoordhuysAppPanel'

function smoothstepEase(t) {
  return t * t * (3 - 2 * t)
}

function easeOutQuad(t) {
  return t * (2 - t)
}

const EDGE_COLUMN_FROM_LEFT = 3
const DRIFT_SLACK_FRACTION = 0.6
const STAGE_SETTLE_SCALE = 0.985
const STAGE_SETTLE_SPRING = { stiffness: 180, damping: 28, mass: 0.6 }
const INTRO_VH = 100
const SHOWCASE_SCROLL_VH = 160
const SECTION_VH = INTRO_VH + SHOWCASE_SCROLL_VH
const ENTRY_RISE_PX = 80

function NoordhuysBackdrop({ carouselRef, isVisibleRef, pinnedProgressRef }) {
  const { size, blobWidth, blobHeight, gridWidth, gridHeight, cellSize, repeat, yPhaseShiftCells, blobY } = useSeamlessGrid(1)
  const blobMeshHeight = Math.max(PLANE_SIZE * 1.6, blobHeight * 2.5)
  const gridGroupRef = useRef(null)
  const calloutGroupRef = useRef(null)

  const edgeX = -(gridWidth * OVERSCALE) / 2 + EDGE_COLUMN_FROM_LEFT * cellSize
  const edgeXUV = (edgeX + (gridWidth * OVERSCALE) / 2) / (gridWidth * OVERSCALE)

  const heroMarginPx = pageMarginPx(size.height)
  const heroMarginWorld = heroMarginPx * (gridWidth / size.width)
  const targetEdgeLeftX = -gridWidth / 2 + heroMarginWorld
  const edgeHalfWidthWorld = EDGE_STYLE.halfWidthPx * (gridWidth / size.width)
  const finalZoomScale = targetEdgeLeftX / (edgeX - edgeHalfWidthWorld)
  const driftWorld = Math.max(0, ((gridHeight * (OVERSCALE * finalZoomScale - 1)) / 2) * DRIFT_SLACK_FRACTION)

  const centerPhase = 0.5 + yPhaseShiftCells
  const edgeBottomY = cellSize * (Math.floor(centerPhase) - centerPhase)
  const edgeTopY = edgeBottomY + cellSize
  const edgeBottomUV = (edgeBottomY + (gridHeight * OVERSCALE) / 2) / (gridHeight * OVERSCALE)
  const edgeTopUV = (edgeTopY + (gridHeight * OVERSCALE) / 2) / (gridHeight * OVERSCALE)

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
    if (calloutGroupRef.current) calloutGroupRef.current.scale.set(nextScale, nextScale, 1)

    const pinned = pinnedProgressRef.current
    const targetY = driftWorld * pinned
    group.position.y = MathUtils.damp(group.position.y, targetY, 8, delta)
    if (calloutGroupRef.current) calloutGroupRef.current.position.y = MathUtils.damp(calloutGroupRef.current.position.y, targetY, 8, delta)
  })

  return (
    <>
      <color attach="background" args={[SCENE_BACKDROP]} />
      <GradientBlob
        position={[0, blobY, PLANE_Z]}
        scale={[blobWidth * BLOB_WIDTH_OVERSCALE, blobMeshHeight, 1]}
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
          edgeXUV={edgeXUV}
          edgeBottomUV={edgeBottomUV}
          edgeTopUV={edgeTopUV}
        />
      </group>
      <group ref={calloutGroupRef}>
        <Html
          position={[edgeX + cellSize * 0.3, (edgeBottomY + edgeTopY) / 2, GRID_Z + 0.01]}
          style={{ transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <div className="w-[300px]">
            <p className="text-xs leading-loose font-extralight text-white/50 animate-[fadeInUp_1s_ease-out_both]">
              {"Real-time multilingual operations for the modern greenhouse. From daily shifts to live translation, workers stay connected, trained, and aligned across every harvest."}
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
  const { progressRef, arrival } = usePinnedProgress(sectionRef, carouselRef)
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
  const y = useTransform(entry, [0, 1], [ENTRY_RISE_PX, 0])
  const appOpacity = useTransform(entry, [0, 0.35, 1], [0, 0.8, 1])

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
          />
          <SceneRenderGate isVisibleRef={isVisibleRef} />
        </Canvas>

        {/* Floating Mobile App Panel over Canvas */}
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center z-10 px-4"
          style={{ opacity: appOpacity, y }}
        >
          <div
            className="pointer-events-auto transform-gpu"
            style={{
              transform: 'scale(min(1, calc(86vh / 838.67px)))',
              transformOrigin: 'center center',
            }}
          >
            <NoordhuysAppPanel />
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default NoordhuysShowcase
