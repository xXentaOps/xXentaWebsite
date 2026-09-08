import React from 'react'
import { useLanguage } from '../../context/LanguageContext'

// SVG Icons matching the design's vectors and styling
function AvatarIcon({ className = 'w-5 h-5 text-white/90' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
    </svg>
  )
}

function TrainingIcon({ className = 'w-6 h-6 text-white' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Graduation cap / course video icon */}
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5" />
    </svg>
  )
}

function TranslatorIcon({ className = 'w-6 h-6 text-white' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Live audio translation waveform / language icon */}
      <path d="M5 8l6 6M4 14l6-6 2-3M2 5h12M7 2h1" />
      <path d="M22 22l-5-10-5 10M14 18h6" />
    </svg>
  )
}

function MessagesIcon({ className = 'w-6 h-6 text-white' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Chat bubbles */}
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8M8 13h5" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ScheduleIcon({ className = 'w-6 h-6 text-white' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Calendar icon */}
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeWidth="2.5" />
    </svg>
  )
}

function ClockIcon({ className = 'w-3.5 h-3.5 text-[#79716B]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function ChevronRightIcon({ className = 'w-3 h-3 text-[#577158]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}


export function NoordhuysAppPanel() {
  const { t } = useLanguage()
  return (
    <div
      className="relative flex flex-col items-start select-none shadow-[0px_25px_60px_-15px_rgba(0,0,0,0.35),0px_0px_0px_1px_rgba(255,255,255,0.6)]"
      style={{
        width: 448,
        maxWidth: 448,
        height: 838.67,
        padding: 24,
        borderRadius: 44,
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.72) 0%, rgba(246, 248, 246, 0.65) 100%)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. TOP BANNER HEADER (400px x 88px) */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          width: 400,
          height: 88,
          padding: '24px 32px',
          borderRadius: 32,
          background:
            'linear-gradient(90deg, #000000 0%, #000000 7.14%, #010201 14.29%, #030503 21.43%, #070D07 28.57%, #0E150E 35.71%, #151E15 42.86%, #1C271D 50%, #243125 57.14%, #2C3B2D 64.29%, #344535 71.43%, #3D503D 78.57%, #455B46 85.71%, #4E664F 92.86%, #577158 100%)',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
          boxSizing: 'border-box',
        }}
      >
        {/* Left: Avatar Button */}
        <div className="relative">
          <div
            className="flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-105"
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <AvatarIcon className="w-5 h-5 text-white/90" />
          </div>
          {/* Active Status Dot */}
          <span
            className="absolute"
            style={{
              width: 10,
              height: 10,
              borderRadius: 9999,
              backgroundColor: '#577158',
              boxShadow: '0px 0px 0px 2px #FFFFFF',
              left: 28,
              top: 28,
            }}
          />
        </div>

        {/* Right: Noordhuys Logo */}
        <div style={{ width: 103.04, height: 32, opacity: 0.95 }} className="flex items-center justify-end">
          <img
            src="/Noordhuys.svg"
            alt="Noordhuys"
            style={{
              width: 103.04,
              height: 32,
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
      </div>

      {/* 2. GREETING HEADER */}
      <div
        className="flex flex-col items-start justify-start shrink-0"
        style={{
          width: 400,
          marginTop: 20,
          marginBottom: 26,
          boxSizing: 'border-box',
        }}
      >
        <h1
          style={{
            fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontWeight: 700,
            fontSize: 30,
            lineHeight: '36px',
            letterSpacing: '-0.354px',
            color: '#292524',
            margin: 0,
            width: 400,
          }}
        >
          <div>{t('noordhuys.app.greeting')}</div>
          <div>Jeroen</div>
        </h1>
        <p
          style={{
            fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            fontWeight: 500,
            fontSize: 16,
            lineHeight: '24px',
            letterSpacing: '-0.3125px',
            color: '#79716B',
            margin: '4px 0 0 0',
          }}
        >
          {t('noordhuys.app.readyPrompt')}
        </p>
      </div>

      {/* 3. 2x2 GRID OF FEATURE GLASS CARDS (400px x 320.67px) */}
      <div
        className="relative shrink-0"
        style={{
          width: 400,
          height: 320.67,
          marginBottom: 24,
        }}
      >
        {/* Card 1: Training */}
        <div
          className="absolute group origin-center transition-transform duration-300 ease-out hover:scale-[1.04] hover:z-10 cursor-pointer"
          style={{
            width: 192,
            height: 152.33,
            left: 0,
            top: 0,
            borderRadius: 24,
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            overflow: 'hidden',
            transformOrigin: 'center center',
          }}
        >
          <img
            src="/leaves.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            style={{ objectPosition: 'center' }}
          />
          {/* Frosted Icon Box */}
          <div
            className="absolute flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              left: 20,
              top: 20,
              borderRadius: 16,
              background: 'rgba(255, 255, 255, 0.2)',
              boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <TrainingIcon />
          </div>
          {/* Card Typography */}
          <div className="absolute flex flex-col items-start" style={{ left: 20, top: 88, width: 152 }}>
            <span
              style={{
                fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 700,
                fontSize: 18,
                lineHeight: '28px',
                letterSpacing: '-0.439453px',
                color: '#FFFFFF',
              }}
            >
              {t('noordhuys.app.training')}
            </span>
            <span
              style={{
                fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 700,
                fontSize: 10,
                lineHeight: '15px',
                letterSpacing: '0.617188px',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {t('noordhuys.app.trainingSub')}
            </span>
          </div>
        </div>

        {/* Card 2: Translator */}
        <div
          className="absolute group origin-center transition-transform duration-300 ease-out hover:scale-[1.04] hover:z-10 cursor-pointer"
          style={{
            width: 192,
            height: 152.33,
            left: 208,
            top: 0,
            borderRadius: 24,
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            overflow: 'hidden',
            transformOrigin: 'center center',
          }}
        >
          <img
            src="/leaves.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            style={{ objectPosition: 'center' }}
          />
          <div
            className="absolute flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              left: 20,
              top: 20,
              borderRadius: 16,
              background: 'rgba(255, 255, 255, 0.2)',
              boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <TranslatorIcon />
          </div>
          <div className="absolute flex flex-col items-start" style={{ left: 20, top: 88, width: 152 }}>
            <span
              style={{
                fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 700,
                fontSize: 18,
                lineHeight: '28px',
                letterSpacing: '-0.439453px',
                color: '#FFFFFF',
              }}
            >
              {t('noordhuys.app.translator')}
            </span>
            <span
              style={{
                fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 700,
                fontSize: 10,
                lineHeight: '15px',
                letterSpacing: '0.617188px',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {t('noordhuys.app.translatorSub')}
            </span>
          </div>
        </div>

        {/* Card 3: Messages */}
        <div
          className="absolute group origin-center transition-transform duration-300 ease-out hover:scale-[1.04] hover:z-10 cursor-pointer"
          style={{
            width: 192,
            height: 152.33,
            left: 0,
            top: 168.33,
            borderRadius: 24,
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            overflow: 'hidden',
            transformOrigin: 'center center',
          }}
        >
          <img
            src="/leaves.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            style={{ objectPosition: 'center' }}
          />
          <div
            className="absolute flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              left: 20,
              top: 20,
              borderRadius: 16,
              background: 'rgba(255, 255, 255, 0.2)',
              boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <MessagesIcon />
          </div>
          <div className="absolute flex flex-col items-start" style={{ left: 20, top: 88, width: 152 }}>
            <span
              style={{
                fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 700,
                fontSize: 18,
                lineHeight: '28px',
                letterSpacing: '-0.439453px',
                color: '#FFFFFF',
              }}
            >
              {t('noordhuys.app.messages')}
            </span>
            <span
              style={{
                fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 700,
                fontSize: 10,
                lineHeight: '15px',
                letterSpacing: '0.617188px',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {t('noordhuys.app.messagesSub')}
            </span>
          </div>
        </div>

        {/* Card 4: Schedule */}
        <div
          className="absolute group origin-center transition-transform duration-300 ease-out hover:scale-[1.04] hover:z-10 cursor-pointer"
          style={{
            width: 192,
            height: 152.33,
            left: 208,
            top: 168.33,
            borderRadius: 24,
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            overflow: 'hidden',
            transformOrigin: 'center center',
          }}
        >
          <img
            src="/leaves.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            style={{ objectPosition: 'center' }}
          />
          <div
            className="absolute flex items-center justify-center"
            style={{
              width: 52,
              height: 52,
              left: 20,
              top: 20,
              borderRadius: 16,
              background: 'rgba(255, 255, 255, 0.2)',
              boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            <ScheduleIcon />
          </div>
          <div className="absolute flex flex-col items-start" style={{ left: 20, top: 88, width: 152 }}>
            <span
              style={{
                fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 700,
                fontSize: 18,
                lineHeight: '28px',
                letterSpacing: '-0.439453px',
                color: '#FFFFFF',
              }}
            >
              {t('noordhuys.app.schedule')}
            </span>
            <span
              style={{
                fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 700,
                fontSize: 10,
                lineHeight: '15px',
                letterSpacing: '0.617188px',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            >
              {t('noordhuys.app.scheduleSub')}
            </span>
          </div>
        </div>
      </div>

      {/* 4. "UP NEXT" SCHEDULE SECTION (400px x 212px) */}
      <div
        className="flex flex-col items-start shrink-0"
        style={{
          width: 400,
          boxSizing: 'border-box',
        }}
      >
        {/* Section Header Row */}
        <div
          className="flex items-center justify-between"
          style={{
            width: 400,
            height: 40,
            padding: '0 4px 12px',
            boxSizing: 'border-box',
          }}
        >
          <span
            style={{
              fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 700,
              fontSize: 18,
              lineHeight: '28px',
              letterSpacing: '-0.439453px',
              color: '#292524',
            }}
          >
            {t('noordhuys.app.upNext')}
          </span>
          <button
            type="button"
            className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0"
          >
            <span
              style={{
                fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 600,
                fontSize: 12,
                lineHeight: '16px',
                color: '#577158',
              }}
            >
              {t('noordhuys.app.viewAll')}
            </span>
            <ChevronRightIcon className="w-3 h-3 text-[#577158]" />
          </button>
        </div>

        {/* Schedule GlassCard (400px x 172px) */}
        <div
          className="relative flex flex-col items-start"
          style={{
            width: 400,
            height: 172,
            background: 'rgba(255, 255, 255, 0.4)',
            border: '0.666667px solid rgba(255, 255, 255, 0.6)',
            boxShadow: '0px 8px 30px rgba(0, 0, 0, 0.04)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 24,
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {/* Subtle Diagonal Specular Reflection Layer */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0) 100%)',
              opacity: 0.5,
            }}
          />

          {/* Row 1: Thursday 18 (Morning Shift) */}
          <div
            className="flex items-center gap-4 transition-colors hover:bg-white/30 cursor-pointer"
            style={{
              width: 398.67,
              height: 85.67,
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.25)',
              borderBottom: '0.666667px solid rgba(231, 229, 228, 0.4)',
              boxSizing: 'border-box',
            }}
          >
            {/* Date Badge: Thu 18 */}
            <div
              className="flex flex-col items-center justify-center shrink-0"
              style={{
                width: 56,
                height: 53,
                background: 'rgba(87, 113, 88, 0.08)',
                borderRadius: 14,
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontWeight: 700,
                  fontSize: 10,
                  lineHeight: '15px',
                  letterSpacing: '0.617188px',
                  textTransform: 'uppercase',
                  color: 'rgba(87, 113, 88, 0.8)',
                }}
              >
                {t('noordhuys.app.thu')}
              </span>
              <span
                style={{
                  fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontWeight: 700,
                  fontSize: 20,
                  lineHeight: '20px',
                  letterSpacing: '-0.449219px',
                  color: '#577158',
                  marginTop: 2,
                }}
              >
                18
              </span>
            </div>

            {/* Event Info Column */}
            <div className="flex flex-col justify-center flex-1 min-w-0" style={{ gap: 4 }}>
              <div className="flex items-center justify-between">
                <span
                  style={{
                    fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontWeight: 700,
                    fontSize: 16,
                    lineHeight: '24px',
                    letterSpacing: '-0.3125px',
                    color: '#44403B',
                  }}
                >
                  {t('noordhuys.app.morningShift')}
                </span>
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    padding: '2px 8px',
                    background: 'rgba(87, 113, 88, 0.12)',
                    borderRadius: 9999,
                    fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontWeight: 700,
                    fontSize: 10,
                    lineHeight: '15px',
                    letterSpacing: '0.117188px',
                    color: '#577158',
                  }}
                >
                  8.5h
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClockIcon />
                <span
                  style={{
                    fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontWeight: 500,
                    fontSize: 12,
                    lineHeight: '16px',
                    color: '#79716B',
                  }}
                >
                  08:30 - 17:00
                </span>
              </div>
            </div>

            {/* Trailing Chevron */}
            <ChevronRightIcon className="w-4 h-4 text-[#A8A29E] shrink-0" />
          </div>

          {/* Row 2: Friday 19 (Brainstorming Meeting) */}
          <div
            className="flex items-center gap-4 transition-colors hover:bg-white/30 cursor-pointer"
            style={{
              width: 398.67,
              height: 85,
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.25)',
              boxSizing: 'border-box',
            }}
          >
            {/* Date Badge: Fri 19 */}
            <div
              className="flex flex-col items-center justify-center shrink-0"
              style={{
                width: 56,
                height: 53,
                background: 'rgba(87, 113, 88, 0.08)',
                borderRadius: 14,
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontWeight: 700,
                  fontSize: 10,
                  lineHeight: '15px',
                  letterSpacing: '0.617188px',
                  textTransform: 'uppercase',
                  color: 'rgba(87, 113, 88, 0.8)',
                }}
              >
                {t('noordhuys.app.fri')}
              </span>
              <span
                style={{
                  fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontWeight: 700,
                  fontSize: 20,
                  lineHeight: '20px',
                  letterSpacing: '-0.449219px',
                  color: '#577158',
                  marginTop: 2,
                }}
              >
                19
              </span>
            </div>

            {/* Event Info Column */}
            <div className="flex flex-col justify-center flex-1 min-w-0" style={{ gap: 4 }}>
              <div className="flex items-center justify-between">
                <span
                  style={{
                    fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontWeight: 700,
                    fontSize: 16,
                    lineHeight: '24px',
                    letterSpacing: '-0.3125px',
                    color: '#44403B',
                  }}
                >
                  {t('noordhuys.app.brainstorming')}
                </span>
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    padding: '2px 8px',
                    background: 'rgba(87, 113, 88, 0.12)',
                    borderRadius: 9999,
                    fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontWeight: 700,
                    fontSize: 10,
                    lineHeight: '15px',
                    letterSpacing: '0.117188px',
                    color: '#577158',
                  }}
                >
                  1.5h
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClockIcon />
                <span
                  style={{
                    fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontWeight: 500,
                    fontSize: 12,
                    lineHeight: '16px',
                    color: '#79716B',
                  }}
                >
                  09:30 - 11:00
                </span>
              </div>
            </div>

            {/* Trailing Chevron */}
            <ChevronRightIcon className="w-4 h-4 text-[#A8A29E] shrink-0" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default NoordhuysAppPanel
