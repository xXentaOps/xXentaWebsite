import { forwardRef } from 'react'

const TEXT_COLOR = '#645A57'
const SUBTITLE_COLOR = '#645A57'
const MUTED_COLOR = 'rgba(150, 142, 139, 0.6)'
const BORDER_COLOR = 'rgba(255, 255, 255, 0.3)'
const CARD_BG = 'rgba(241, 245, 249, 0.3)'
const ITEM_BG = 'rgba(255, 255, 255, 0.3)'

function StudyCriteriaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', flexShrink: 0 }}>
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="#645A57" strokeWidth="1.33333" />
      <line x1="8" y1="4.5" x2="8" y2="14" stroke="#645A57" strokeWidth="1.33333" />
    </svg>
  )
}

function NextArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', flexShrink: 0 }}>
      <path d="M5 12H19" stroke="#B1A8A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 5L19 12L12 19" stroke="#B1A8A5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const GripDotsIcon = forwardRef(function GripDotsIcon({ style, opacity = 0.6 }, ref) {
  return (
    <svg
      ref={ref}
      width="8"
      height="12"
      viewBox="0 0 8 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0, opacity, ...style }}
    >
      <circle cx="2" cy="2" r="1.1" fill={TEXT_COLOR} />
      <circle cx="6" cy="2" r="1.1" fill={TEXT_COLOR} />
      <circle cx="2" cy="6" r="1.1" fill={TEXT_COLOR} />
      <circle cx="6" cy="6" r="1.1" fill={TEXT_COLOR} />
      <circle cx="2" cy="10" r="1.1" fill={TEXT_COLOR} />
      <circle cx="6" cy="10" r="1.1" fill={TEXT_COLOR} />
    </svg>
  )
})

function PlannerCursor({ cursorRef, rippleRef }) {
  return (
    <div
      ref={cursorRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 80,
        opacity: 0,
        transformOrigin: '0px 0px',
        willChange: 'transform, opacity',
      }}
    >
      <div
        ref={rippleRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: '1.5px solid rgba(204, 0, 1, 0.8)',
          background: 'rgba(204, 0, 1, 0.15)',
          transform: 'translate(-50%, -50%) scale(0)',
          opacity: 0,
          pointerEvents: 'none',
          transformOrigin: 'center center',
          willChange: 'transform, opacity',
        }}
      />
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          display: 'block',
          filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35))',
          transformOrigin: '0px 0px',
        }}
      >
        <path
          d="M0.5 0.5L7.5 19L10.5 12L17.5 9L0.5 0.5Z"
          fill="#2D2826"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

export const MacroPlannerHeader = forwardRef(function MacroPlannerHeader({ style }, ref) {
  return (
    <div
      ref={ref}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px',
        width: '100%',
        minHeight: 88,
        background: CARD_BG,
        backgroundBlendMode: 'soft-light',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `0.666667px solid ${BORDER_COLOR}`,
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
        borderRadius: 24,
        flexShrink: 0,
        ...style,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {/* Badge "2" */}
        <div
          style={{
            boxSizing: 'border-box',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: 21,
            height: 22,
            background: '#CC0001',
            border: '0.666667px solid #AE0818',
            borderRadius: 9999,
            flexShrink: 0,
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
            2
          </span>
        </div>

        {/* Title & Subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: 18,
              lineHeight: '26px',
              color: TEXT_COLOR,
            }}
          >
            Study Planner
          </h2>
          <p
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 400,
              fontSize: 12,
              lineHeight: '18px',
              color: SUBTITLE_COLOR,
            }}
          >
            Manage reference materials that guide the AI's behavior and responses.
          </p>
        </div>
      </div>

      {/* Next Button */}
      <div
        style={{
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          width: 92,
          height: 36,
          padding: '6px 12px',
          gap: 6,
          background: 'rgba(255, 255, 255, 0.3)',
          opacity: 0.4,
          border: `0.666667px solid ${BORDER_COLOR}`,
          borderRadius: 12,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            lineHeight: '24px',
            textAlign: 'center',
            color: '#B1A8A5',
          }}
        >
          Next
        </span>
        <NextArrowIcon />
      </div>
    </div>
  )
})

function CriteriaItemCard({ title, opacity = 1 }) {
  return (
    <div
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        padding: '9px 11px',
        gap: 10,
        width: '100%',
        minHeight: 56,
        background: ITEM_BG,
        border: `0.666667px solid ${BORDER_COLOR}`,
        borderRadius: 12,
        flexShrink: 0,
        opacity,
      }}
    >
      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          fontSize: 12,
          lineHeight: '16px',
          color: TEXT_COLOR,
          flex: 1,
        }}
      >
        {title}
      </span>
    </div>
  )
}

function PeriodItemCard({ title, impact, isHighlighted = false }) {
  const isRed = isHighlighted
  return (
    <div
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '8px 10px',
        gap: 2,
        width: '100%',
        minHeight: 52,
        background: isRed ? 'rgba(204, 0, 1, 0.05)' : ITEM_BG,
        border: isRed ? '0.666667px solid #CC0001' : `0.666667px solid ${BORDER_COLOR}`,
        borderRadius: 10,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          fontSize: 11,
          lineHeight: '15px',
          color: isRed ? '#CC0001' : TEXT_COLOR,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          width: '100%',
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 500,
          fontSize: 9,
          lineHeight: '13px',
          letterSpacing: '0.25px',
          textTransform: 'uppercase',
          color: isRed ? '#CC0001' : TEXT_COLOR,
          opacity: isRed ? 0.8 : 0.6,
        }}
      >
        {impact}
      </span>
    </div>
  )
}

export const MacroPlannerContainer = forwardRef(function MacroPlannerContainer(
  {
    style,
    plannerCursorRef,
    plannerRippleRef,
    draggedCardRef,
    dropPlaceholderRef,
    droppedCardRef,
    sidebarPreparingCardRef,
    sidebarGripRef,
    criteriaCountRef,
    p12CountRef,
  },
  ref
) {
  return (
    <div
      ref={ref}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        width: '100%',
        minHeight: 520,
        background: CARD_BG,
        backgroundBlendMode: 'soft-light',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `0.666667px solid ${BORDER_COLOR}`,
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
        borderRadius: 24,
        position: 'relative',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Planner Cursor & Ripple */}
      <PlannerCursor cursorRef={plannerCursorRef} rippleRef={plannerRippleRef} />

      {/* Floating Dragged Card that follows the cursor (exact design of Preparing for Entrepreneurship card) */}
      <div
        ref={draggedCardRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 203,
          minHeight: 56,
          boxSizing: 'border-box',
          display: 'none',
          flexDirection: 'row',
          alignItems: 'center',
          padding: '9px 11px',
          gap: 10,
          background: ITEM_BG,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `0.666667px solid ${BORDER_COLOR}`,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
          borderRadius: 12,
          zIndex: 75,
          pointerEvents: 'none',
          willChange: 'transform, opacity',
        }}
      >
        <GripDotsIcon opacity={1} />
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: 12,
            lineHeight: '16px',
            color: TEXT_COLOR,
            flex: 1,
          }}
        >
          Preparing for Entrepreneurship
        </span>
      </div>

      {/* Left Sidebar: Study Criteria Background */}
      <div
        style={{
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '22px 18px 20px',
          gap: 20,
          width: 250,
          background: 'rgba(241, 245, 249, 0.2)',
          backgroundBlendMode: 'soft-light',
          borderRight: `0.666667px solid ${BORDER_COLOR}`,
          borderRadius: '24px 0px 0px 24px',
          flexShrink: 0,
        }}
      >
        {/* Study Criteria Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <StudyCriteriaIcon />
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 12,
                lineHeight: '16px',
                letterSpacing: '-0.2px',
                color: TEXT_COLOR,
              }}
            >
              Study Criteria
            </span>
          </div>
          <span
            ref={criteriaCountRef}
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              fontSize: 10,
              lineHeight: '15px',
              color: TEXT_COLOR,
            }}
          >
            2
          </span>
        </div>

        {/* Criteria Cards Column */}
        <div
          style={{
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            paddingLeft: 10,
            gap: 8,
            width: '100%',
            borderLeft: '1px solid rgba(147, 140, 137, 0.3)',
          }}
        >
          <CriteriaItemCard title="Development of an Entrepreneurial Concept" opacity={0.5} />
          
          {/* Card 2: Preparing for Entrepreneurship with 6 dots grip on hover */}
          <div
            ref={sidebarPreparingCardRef}
            style={{
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: '9px 11px',
              width: '100%',
              minHeight: 56,
              background: ITEM_BG,
              border: `0.666667px solid ${BORDER_COLOR}`,
              borderRadius: 12,
              flexShrink: 0,
              opacity: 0.5,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              ref={sidebarGripRef}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: 0,
                marginRight: 0,
                opacity: 0,
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <GripDotsIcon opacity={1} />
            </div>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 12,
                lineHeight: '16px',
                color: TEXT_COLOR,
                flex: 1,
              }}
            >
              Preparing for Entrepreneurship
            </span>
          </div>
        </div>
      </div>

      {/* Right Content Area: Years Slider & Period Columns */}
      <div
        style={{
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: '20px 20px 18px',
          gap: 16,
          flex: 1,
          minWidth: 0,
          position: 'relative',
        }}
      >
        {/* Top: Years Slider */}
        <div
          style={{
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '3px 5px',
            gap: 6,
            width: 300,
            height: 34,
            background: 'rgba(255, 255, 255, 0.3)',
            border: `0.666667px solid ${BORDER_COLOR}`,
            borderRadius: 10,
          }}
        >
          {/* 2026 - 2027 Active Button */}
          <div
            style={{
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 95,
              height: 26,
              background: 'rgba(147, 140, 137, 0.3)',
              border: '0.666667px solid rgba(147, 140, 137, 0.3)',
              boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 13.5,
                lineHeight: '18px',
                textAlign: 'center',
                color: TEXT_COLOR,
              }}
            >
              2026 - 2027
            </span>
          </div>

          {/* 2027 - 2028 */}
          <div style={{ padding: '2px 6px', cursor: 'pointer' }}>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                lineHeight: '18px',
                textAlign: 'center',
                color: MUTED_COLOR,
              }}
            >
              2027 - 2028
            </span>
          </div>

          {/* 2028 - 2029 */}
          <div style={{ padding: '2px 6px', cursor: 'pointer' }}>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: 13,
                lineHeight: '18px',
                textAlign: 'center',
                color: MUTED_COLOR,
              }}
            >
              2028 - 2029
            </span>
          </div>
        </div>

        {/* Period Columns Container (3 columns with no scrollbars) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 10,
            width: '100%',
            flex: 1,
          }}
        >
          {/* Column P1.1 (5/5) */}
          <div
            style={{
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              padding: '10px 8px',
              gap: 10,
              flex: 1,
              minWidth: 0,
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Column Header */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0 2px',
              }}
            >
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  lineHeight: '15px',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color: TEXT_COLOR,
                }}
              >
                p1.1
              </span>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: 10,
                  lineHeight: '15px',
                  color: TEXT_COLOR,
                }}
              >
                5/5
              </span>
            </div>

            {/* Column Cards */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                overflow: 'hidden',
              }}
            >
              <PeriodItemCard title="Market Research" impact="high impact" />
              <PeriodItemCard title="Creating a Financial Plan for..." impact="medium impact" isHighlighted={true} />
              <PeriodItemCard title="Choosing a Form of Entrepre..." impact="high impact" />
              <PeriodItemCard title="Selection of the Value Propo..." impact="low impact" />
              <PeriodItemCard title="Building a Business Model" impact="high impact" />
            </div>
          </div>

          {/* Column P1.2 (3/5 -> 4/5 when dropped) */}
          <div
            style={{
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              padding: '10px 8px',
              gap: 10,
              flex: 1,
              minWidth: 0,
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Column Header */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0 2px',
              }}
            >
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  lineHeight: '15px',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color: TEXT_COLOR,
                }}
              >
                p1.2
              </span>
              <span
                ref={p12CountRef}
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: 10,
                  lineHeight: '15px',
                  color: TEXT_COLOR,
                  transition: 'color 0.2s ease',
                }}
              >
                3/5
              </span>
            </div>

            {/* Column Cards */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 5,
                overflow: 'hidden',
              }}
            >
              <PeriodItemCard title="Setting up a Business Network" impact="high impact" />
              <PeriodItemCard title="Customer-Business Relations" impact="medium impact" />
              <PeriodItemCard title="Product Sales" impact="medium impact" />

              {/* Drop slot dashed outline placeholder */}
              <div
                ref={dropPlaceholderRef}
                style={{
                  boxSizing: 'border-box',
                  display: 'none',
                  height: 48,
                  width: '100%',
                  border: '1.5px dashed rgba(204, 0, 1, 0.5)',
                  background: 'rgba(204, 0, 1, 0.04)',
                  borderRadius: 10,
                  flexShrink: 0,
                }}
              />

              {/* Dropped Card: Preparing for Entrepreneurship under Product Sales */}
              <div
                ref={droppedCardRef}
                style={{
                  boxSizing: 'border-box',
                  display: 'none',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  padding: '8px 10px',
                  gap: 2,
                  width: '100%',
                  minHeight: 52,
                  background: 'rgba(204, 0, 1, 0.05)',
                  border: '0.666667px solid #CC0001',
                  borderRadius: 10,
                  flexShrink: 0,
                  animation: 'fadeIn 0.2s ease',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                    fontSize: 11,
                    lineHeight: '15px',
                    color: '#CC0001',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%',
                  }}
                >
                  Preparing for Entrepreneurship
                </span>
                <span
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 500,
                    fontSize: 9,
                    lineHeight: '13px',
                    letterSpacing: '0.25px',
                    textTransform: 'uppercase',
                    color: '#CC0001',
                    opacity: 0.8,
                  }}
                >
                  high impact
                </span>
              </div>
            </div>
          </div>

          {/* Column P1.3 (0/5) */}
          <div
            style={{
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              padding: '10px 8px',
              gap: 10,
              flex: 1,
              minWidth: 0,
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Column Header */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0 2px',
              }}
            >
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  lineHeight: '15px',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color: TEXT_COLOR,
                }}
              >
                p1.3
              </span>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 500,
                  fontSize: 10,
                  lineHeight: '15px',
                  color: TEXT_COLOR,
                }}
              >
                0/5
              </span>
            </div>

            {/* Empty State Content */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                padding: '20px 8px',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 11.5,
                  lineHeight: '15px',
                  textAlign: 'center',
                  color: TEXT_COLOR,
                  opacity: 0.5,
                  marginBottom: 6,
                }}
              >
                Nothing Planned
              </span>
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: 9.5,
                  lineHeight: '14px',
                  textAlign: 'center',
                  letterSpacing: '0.2px',
                  color: TEXT_COLOR,
                  opacity: 0.6,
                  maxWidth: 120,
                }}
              >
                Drag-and-drop criteria onto this period to fill it.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export const MacroPlannerView = forwardRef(function MacroPlannerView(
  {
    style,
    headerRef,
    containerRef,
    plannerCursorRef,
    plannerRippleRef,
    draggedCardRef,
    dropPlaceholderRef,
    droppedCardRef,
    sidebarPreparingCardRef,
    sidebarGripRef,
    criteriaCountRef,
    p12CountRef,
  },
  ref
) {
  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        width: '100%',
        willChange: 'transform, opacity',
        ...style,
      }}
    >
      <MacroPlannerHeader ref={headerRef} />
      <MacroPlannerContainer
        ref={containerRef}
        plannerCursorRef={plannerCursorRef}
        plannerRippleRef={plannerRippleRef}
        draggedCardRef={draggedCardRef}
        dropPlaceholderRef={dropPlaceholderRef}
        droppedCardRef={droppedCardRef}
        sidebarPreparingCardRef={sidebarPreparingCardRef}
        sidebarGripRef={sidebarGripRef}
        criteriaCountRef={criteriaCountRef}
        p12CountRef={p12CountRef}
      />
    </div>
  )
})
