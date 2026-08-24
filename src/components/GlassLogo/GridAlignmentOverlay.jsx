import { useEffect, useRef } from 'react'

// Opt-in alignment check: add ?gridlines to the URL. Draws a line wherever
// gridScreenMetrics says a cell boundary is, so "does this sit on the grid"
// stops being a matter of opinion.
//
// It earns its place because the real grid is deliberately almost invisible
// — DIRECT_STYLE puts its lines at 0.012 opacity and its corner crosses at
// 0.027 — which is lovely to look at and useless to check against. A phase
// error of most of a cell reads as "hmm, slightly off" rather than as the
// 75px it actually is. These lines are drawn at full strength in a colour
// nothing else here uses, on top of everything, so a mismatch is obvious
// rather than arguable.
//
// Reads the same ref the photo does, so it is showing what the layout is
// actually being given, not a second opinion computed alongside it — if
// these are wrong, the photo is wrong in precisely the same way.
export function GridAlignmentOverlay({ gridMetricsRef }) {
  const ref = useRef(null)

  useEffect(() => {
    let frame = 0
    const step = () => {
      const el = ref.current
      const metrics = gridMetricsRef?.current
      if (el && metrics) {
        const { cell, phaseX, phaseY } = metrics
        // Each line is drawn twice, magenta against black, because half of
        // what it has to be legible over is a brightly lit photograph and the
        // other half is near-black navy — a single colour loses one or the
        // other. A 1px 60% line (which is what this was) reads perfectly
        // where it crosses the background and vanishes where it crosses the
        // photo, which looks exactly like a misalignment and is not one.
        //
        // Offset by a whole cell before the phase so the first line is drawn
        // above and left of the viewport rather than inside it — repeating
        // gradients tile forward from their origin only.
        el.style.backgroundImage =
          'repeating-linear-gradient(to right, rgba(255,0,255,0.95) 0 2px, rgba(0,0,0,0.85) 2px 3px, transparent 3px 100%),' +
          'repeating-linear-gradient(to bottom, rgba(255,0,255,0.95) 0 2px, rgba(0,0,0,0.85) 2px 3px, transparent 3px 100%)'
        el.style.backgroundSize = `${cell}px 100%, 100% ${cell}px`
        el.style.backgroundPosition = `${phaseX - cell}px 0, 0 ${phaseY - cell}px`
      }
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [gridMetricsRef])

  return <div ref={ref} className="pointer-events-none absolute inset-0 z-40" />
}

export default GridAlignmentOverlay
