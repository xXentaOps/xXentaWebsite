import { useMemo } from 'react'

// Synchronous, dependency-free heuristic (no GPU benchmark fetch) — good
// enough to gate an expensive transmission material off touch/low-core
// devices without adding an async detection step before first paint.
export function usePerformanceTier() {
  return useMemo(() => {
    if (typeof window === 'undefined') return 'high'

    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
    const lowCores = (navigator.hardwareConcurrency ?? 8) <= 4
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    return coarsePointer || lowCores || reducedMotion ? 'low' : 'high'
  }, [])
}
