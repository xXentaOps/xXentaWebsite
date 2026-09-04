import { useEffect, useRef, useState } from 'react'

/**
 * NoordhuysVideoContainer
 *
 * Renders an automatically playing, looping video container situated underneath
 * the Noordhuys mobile app panel.
 *
 * Capabilities:
 * - Autoplays by default (muted + loop + playsInline).
 * - Can be paused or resumed by clicking on the exposed video container.
 * - Performance guard: Uses IntersectionObserver & document.visibilitychange
 *   to immediately pause decoding when out of view, and resume when visible.
 */
export function NoordhuysVideoContainer({
  width = 960,
  height = 540,
  className = '',
  style = {},
}) {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const isManuallyPausedRef = useRef(false)

  // Ensure DOM video element properties are strictly set for autoplay
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.muted = true
    video.defaultMuted = true

    // Attempt initial play
    const startPlay = () => {
      video.play().then(() => {
        setIsPlaying(true)
      }).catch((err) => {
        console.warn('Autoplay prevented or deferred:', err)
      })
    }

    startPlay()
  }, [])

  // Visibility & Performance management
  useEffect(() => {
    const video = videoRef.current
    const container = containerRef.current
    if (!video || !container) return

    let isIntersecting = false

    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry.isIntersecting
        if (!entry.isIntersecting) {
          // Out of viewport: halt video playback to save GPU/CPU cycles
          if (!video.paused) {
            video.pause()
            setIsPlaying(false)
          }
        } else {
          // Back in viewport: resume playback only if the user hasn't manually paused it
          if (!isManuallyPausedRef.current) {
            video.play().then(() => {
              setIsPlaying(true)
            }).catch(() => {})
          }
        }
      },
      {
        threshold: [0, 0.1],
      }
    )

    observer.observe(container)

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (!video.paused) {
          video.pause()
          setIsPlaying(false)
        }
      } else {
        if (isIntersecting && !isManuallyPausedRef.current) {
          video.play().then(() => {
            setIsPlaying(true)
          }).catch(() => {})
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (video) {
        video.pause()
      }
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      isManuallyPausedRef.current = false
      video.play().then(() => {
        setIsPlaying(true)
      }).catch(() => {})
    } else {
      isManuallyPausedRef.current = true
      video.pause()
      setIsPlaying(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      togglePlay()
    }
  }

  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label={isPlaying ? 'Pause background video' : 'Play background video'}
      onClick={togglePlay}
      onKeyDown={handleKeyDown}
      className={`group relative select-none cursor-pointer overflow-hidden rounded-[28px] border border-white/15 bg-[#08101e] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] transition-all duration-300 hover:border-white/25 ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src="/Noordhuys.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="h-full w-full object-cover transition-opacity duration-500"
      />

      {/* Subtle glass reflection highlight on top edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
        aria-hidden="true"
      />

      {/* Minimalistic Pause / Play Button in top-right corner */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          togglePlay()
        }}
        aria-label={isPlaying ? 'Pause video' : 'Play video'}
        title={isPlaying ? 'Pause video' : 'Play video'}
        className="absolute top-4 right-5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/85 shadow-sm backdrop-blur-md cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        {isPlaying ? (
          /* Minimalistic Pause Icon */
          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <rect x="6" y="5" width="3.5" height="14" rx="1" />
            <rect x="14.5" y="5" width="3.5" height="14" rx="1" />
          </svg>
        ) : (
          /* Minimalistic Play Icon */
          <svg className="ml-0.5 h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11-7.36a1 1 0 0 0 0-1.72l-11-7.36A1 1 0 0 0 8 5.14z" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default NoordhuysVideoContainer
