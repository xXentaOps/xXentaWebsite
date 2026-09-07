import { forwardRef } from 'react'

const CARD_BG = 'rgba(241, 245, 249, 0.3)'
const INNER_CARD_BG = 'rgba(255, 255, 255, 0.15)'
const BORDER_COLOR = 'rgba(255, 255, 255, 0.3)'
const TEXT_COLOR = '#645A57'
const SUBTITLE_COLOR = '#645A57'
const BTN_BG = 'rgba(150, 142, 139, 0.6)'
const BTN_BORDER = '0.5px solid rgba(147, 140, 137, 0.3)'
const BTN_TEXT = '#E8E6E6'

export const SyllabusProductionPanel = forwardRef(function SyllabusProductionPanel(
  { style, className = '' },
  ref
) {
  return (
    <div
      ref={ref}
      className={className}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '22px 24px',
        gap: 16,
        width: '100%',
        minHeight: 575,
        height: 575,
        background: CARD_BG,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `0.666667px solid ${BORDER_COLOR}`,
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
        borderRadius: 24,
        position: 'relative',
        willChange: 'transform, opacity',
        ...style,
      }}
    >
      {/* Top Header Container */}
      <div
        style={{
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          width: '100%',
          flexShrink: 0,
        }}
      >
        {/* Left: Badge 4 + Heading & Subtitle */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          {/* Badge "4" */}
          <div
            style={{
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              width: 21,
              height: 22,
              background: '#CC0001',
              border: '0.666667px solid #AE0818',
              borderRadius: 9999,
              flexShrink: 0,
              marginTop: 3,
            }}
          >
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                lineHeight: '20px',
                textAlign: 'center',
                color: '#E0DDDC',
              }}
            >
              4
            </span>
          </div>

          {/* Heading 2 & Paragraph */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 18,
                lineHeight: '28px',
                color: TEXT_COLOR,
              }}
            >
              Syllabus Production
            </h2>
            <p
              style={{
                margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 400,
                fontSize: 12,
                lineHeight: '20px',
                color: SUBTITLE_COLOR,
              }}
            >
              Review and publish course materials with confidence.
            </p>
          </div>
        </div>

        {/* Right: 4 Progress Indicator Dots */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              background: '#CC0001',
              borderRadius: 9999,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              width: 8,
              height: 8,
              background: '#CC0001',
              borderRadius: 9999,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              width: 8,
              height: 8,
              background: '#CC0001',
              borderRadius: 9999,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              width: 8,
              height: 8,
              background: '#CC0001',
              borderRadius: 9999,
              flexShrink: 0,
            }}
          />
        </div>
      </div>

      {/* Inner Card: "Review Syllabus" + Action Buttons + Document Preview Sheet */}
      <div
        style={{
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '18px 22px',
          gap: 14,
          width: '100%',
          flex: 1,
          background: INNER_CARD_BG,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `0.666667px solid ${BORDER_COLOR}`,
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
          borderRadius: 20,
        }}
      >
        {/* Inner Header Bar: Title + 3 Buttons */}
        <div
          style={{
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              lineHeight: '24px',
              color: TEXT_COLOR,
            }}
          >
            Review Syllabus
          </h3>

          {/* Action Buttons: Focus, Export, Print */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Focus Button */}
            <button
              type="button"
              style={{
                boxSizing: 'border-box',
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: 80,
                height: 26,
                padding: '0 10px',
                background: BTN_BG,
                border: BTN_BORDER,
                borderRadius: 8,
                color: BTN_TEXT,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 12,
                fontWeight: 500,
                lineHeight: '16px',
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle
                  cx="5.375"
                  cy="5.375"
                  r="4.5"
                  stroke="#E8E6E6"
                  strokeWidth="1.67"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line
                  x1="11.625"
                  y1="11.625"
                  x2="8.938"
                  y2="8.938"
                  stroke="#E8E6E6"
                  strokeWidth="1.67"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Focus</span>
            </button>

            {/* Export Button */}
            <button
              type="button"
              style={{
                boxSizing: 'border-box',
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: 84,
                height: 26,
                padding: '0 10px',
                background: BTN_BG,
                border: BTN_BORDER,
                borderRadius: 8,
                color: BTN_TEXT,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 12,
                fontWeight: 500,
                lineHeight: '16px',
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M12.625 9.875V12.375C12.625 12.707 12.493 13.024 12.259 13.259C12.024 13.493 11.707 13.625 11.375 13.625H2.625C2.293 13.625 1.976 13.493 1.741 13.259C1.507 13.024 1.375 12.707 1.375 12.375V9.875"
                  stroke="#E8E6E6"
                  strokeWidth="1.67"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.875 6.75L7 9.875L10.125 6.75"
                  stroke="#E8E6E6"
                  strokeWidth="1.67"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 9.875V2.375"
                  stroke="#E8E6E6"
                  strokeWidth="1.67"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Export</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              style={{
                boxSizing: 'border-box',
                display: 'inline-flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: 72,
                height: 26,
                padding: '0 10px',
                background: BTN_BG,
                border: BTN_BORDER,
                borderRadius: 8,
                color: BTN_TEXT,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 12,
                fontWeight: 500,
                lineHeight: '16px',
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3.5 5.25V1.167H10.5V5.25"
                  stroke="#E8E6E6"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.5 10.5H2.334C2.024 10.5 1.727 10.377 1.509 10.158C1.29 9.939 1.167 9.643 1.167 9.333V6.417C1.167 6.107 1.29 5.81 1.509 5.592C1.727 5.373 2.024 5.25 2.334 5.25H11.667C11.976 5.25 12.273 5.373 12.492 5.592C12.711 5.81 12.834 6.107 12.834 6.417V9.333C12.834 9.643 12.711 9.939 12.492 10.158C12.273 10.377 11.976 10.5 11.667 10.5H10.5"
                  stroke="#E8E6E6"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.5 8.167H10.5V12.833H3.5V8.167Z"
                  stroke="#E8E6E6"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Document Sheet Canvas */}
        <div
          style={{
            boxSizing: 'border-box',
            width: '100%',
            height: 365,
            minHeight: 365,
            background: '#FFFFFF',
            borderRadius: 12,
            border: '0.666667px solid rgba(255, 255, 255, 0.8)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0px 1px 1px rgba(255, 255, 255, 0.9)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 0%, black 60%, rgba(0, 0, 0, 0.7) 80%, transparent 100%)',
            maskImage:
              'linear-gradient(to bottom, black 0%, black 60%, rgba(0, 0, 0, 0.7) 80%, transparent 100%)',
          }}
        >
          <img
            src="/syllabus.png"
            alt="Entrepreneurial Management Syllabus"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 30%',
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  )
})

export default SyllabusProductionPanel

