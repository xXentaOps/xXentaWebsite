import { useEffect, useRef } from 'react'

/**
 * Reusable touch swipe gesture hook.
 *
 * @param {Object} options
 * @param {Function} [options.onSwipeLeft]
 * @param {Function} [options.onSwipeRight]
 * @param {Function} [options.onSwipeUp]
 * @param {Function} [options.onSwipeDown]
 * @param {number} [options.threshold=40] Minimum distance in px to trigger a swipe
 * @param {number} [options.maxDuration=600] Maximum duration in ms for a gesture to count as a swipe
 * @param {boolean} [options.enabled=true]
 * @param {React.RefObject} [options.targetRef] Optional ref to attach listeners to (defaults to window if null)
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 40,
  maxDuration = 600,
  enabled = true,
  targetRef = null,
} = {}) {
  const startRef = useRef(null)

  useEffect(() => {
    if (!enabled) return

    const target = targetRef ? targetRef.current : (typeof window !== 'undefined' ? window : null)
    if (!target) return

    const handleTouchStart = (e) => {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      startRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      }
    }

    const handleTouchEnd = (e) => {
      if (!startRef.current) return
      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - startRef.current.x
      const deltaY = touch.clientY - startRef.current.y
      const elapsed = Date.now() - startRef.current.time
      startRef.current = null

      if (elapsed > maxDuration) return

      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      // Ensure gesture has sufficient distance and a clear dominant direction
      if (absX >= threshold && absX > absY * 1.3) {
        if (deltaX < 0) {
          onSwipeLeft?.()
        } else {
          onSwipeRight?.()
        }
      } else if (absY >= threshold && absY > absX * 1.3) {
        if (deltaY < 0) {
          onSwipeUp?.()
        } else {
          onSwipeDown?.()
        }
      }
    }

    target.addEventListener('touchstart', handleTouchStart, { passive: true })
    target.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      target.removeEventListener('touchstart', handleTouchStart)
      target.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, targetRef, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold, maxDuration])
}

export default useSwipe

