import { useEffect, useState } from 'react'

// Opt-in frame-time readout: add ?fps to the URL. Never shown otherwise, so
// it can sit in the tree permanently rather than being added and removed
// around each investigation — and it works against a production build too,
// which matters, because the thing worth measuring is the real browser at a
// real window size, not a dev server in a small embedded preview.
//
// Reports the worst frame in each window alongside the average, because the
// average hides exactly what you go looking for. A steady 60 with one 90ms
// frame in it is a visible hitch and a flawless-looking number; 45 flat is a
// comfortable number and reads as uniformly heavy. Those need telling apart.
const SAMPLE_WINDOW_MS = 500

export function FrameRateMeter() {
  const [reading, setReading] = useState(null)

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    let frames = 0
    let elapsed = 0
    let worst = 0

    const step = (now) => {
      const dt = now - last
      last = now
      frames += 1
      elapsed += dt
      if (dt > worst) worst = dt
      if (elapsed >= SAMPLE_WINDOW_MS) {
        setReading({ fps: Math.round((frames * 1000) / elapsed), worst: Math.round(worst) })
        frames = 0
        elapsed = 0
        worst = 0
      }
      frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [])

  if (!reading) return null
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-50 rounded bg-black/70 px-2 py-1 font-mono text-[11px] leading-tight text-white/80 tabular-nums">
      <div>{reading.fps} fps</div>
      <div className="text-white/45">worst {reading.worst} ms</div>
    </div>
  )
}

export default FrameRateMeter
