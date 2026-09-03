import { forwardRef } from 'react'

export const DRP_INTRO_PANEL_DESIGN_WIDTH = 883
export const DRP_INTRO_PANEL_DESIGN_HEIGHT = 525
export const DRP_INTRO_PANEL_MARGIN = 40

const CARD_BG = 'rgba(241, 245, 249, 0.35)'
const INNER_CARD_BG = 'rgba(255, 255, 255, 0.38)'
const BORDER_COLOR = 'rgba(255, 255, 255, 0.35)'
const TEXT_COLOR = '#645A57'
const SUBTITLE_COLOR = '#968E8B'
const ACCENT_RED = '#CC0001'
const BADGE_FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

function ArrowRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', flexShrink: 0, opacity: 0.55 }}>
      <path
        d="M5 12H19M19 12L12 5M19 12L12 19"
        stroke={TEXT_COLOR}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StatCard({ stat, title, description }) {
  return (
    <div
      style={{
        flex: 1,
        boxSizing: 'border-box',
        padding: '16px 18px',
        background: INNER_CARD_BG,
        border: `1px solid ${BORDER_COLOR}`,
        borderRadius: 18,
        boxShadow: '0 2px 6px rgba(100, 90, 87, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontFamily: BADGE_FONT,
            fontWeight: 700,
            fontSize: 24,
            lineHeight: '28px',
            color: TEXT_COLOR,
            letterSpacing: '-0.02em',
          }}
        >
          {stat}
        </span>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: 12,
            lineHeight: '16px',
            color: TEXT_COLOR,
          }}
        >
          {title}
        </span>
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 400,
          fontSize: 10.5,
          lineHeight: '15px',
          color: SUBTITLE_COLOR,
        }}
      >
        {description}
      </p>
    </div>
  )
}

function PipelineStep({ stepNumber, title, detail, isLast }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span
            style={{
              fontFamily: BADGE_FONT,
              fontWeight: 700,
              fontSize: 10,
              color: ACCENT_RED,
              lineHeight: '13px',
            }}
          >
            {stepNumber}
          </span>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              fontSize: 11,
              color: TEXT_COLOR,
              lineHeight: '14px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </span>
        </div>
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 400,
            fontSize: 9.5,
            color: SUBTITLE_COLOR,
            lineHeight: '13px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {detail}
        </span>
      </div>
      {!isLast && <ArrowRightIcon />}
    </div>
  )
}

export const ExamsSyllabiIntroPanel = forwardRef(function ExamsSyllabiIntroPanel(
  props,
  ref
) {
  return (
    <div
      ref={ref}
      style={{
        width: DRP_INTRO_PANEL_DESIGN_WIDTH,
        boxSizing: 'border-box',
        padding: `4px ${DRP_INTRO_PANEL_MARGIN}px 10px ${DRP_INTRO_PANEL_MARGIN}px`,
        transformOrigin: 'center center',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Row: Hero Headline & Institutional Metadata */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          width: '100%',
          gap: 16,
        }}
      >
        <h2
          style={{
            margin: 0,
            marginTop: -5,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: 25,
            lineHeight: '30px',
            color: TEXT_COLOR,
            letterSpacing: '-0.02em',
          }}
        >
          Curriculums built in hours, not semesters.{' '}
          <span style={{ fontWeight: 500, opacity: 0.85 }}>Zero external contractors.</span>
        </h2>

        <span
          style={{
            fontFamily: BADGE_FONT,
            fontWeight: 500,
            fontSize: 11,
            lineHeight: '14px',
            color: SUBTITLE_COLOR,
            letterSpacing: '0.2px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          INSTITUTIONAL SUITE • v.2026
        </span>
      </div>

      {/* Subhead Paragraph with generous breathing room before the cards */}
      <p
        style={{
          margin: 0,
          marginTop: 9,
          marginBottom: 22,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 400,
          fontSize: 12,
          lineHeight: '18px',
          color: '#766D6A',
          maxWidth: 730,
        }}
      >
        Educational institutions spend thousands of euros on outsourced syllabus writers and manual exam consultants.
        xXenta replaces external overhead with an automated studio that guides educators step-by-step from institutional
        guidelines to audit-ready, accredited syllabi in 40 minutes.
      </p>

      {/* 3 Metric Cards */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: 14, width: '100%', marginBottom: 13 }}>
        <StatCard
          stat="€74,000+"
          title="Avg. Contractor Savings"
          description="Eliminates external syllabus drafting, format rework, and outsourced exam design."
        />
        <StatCard
          stat="85% Faster"
          title="From Standard to Sign-Off"
          description="Compresses 8-week administrative committee loops into a single 40-minute interactive session."
        />
        <StatCard
          stat="100% Faculty"
          title="Direct Pedagogical Control"
          description="Teachers calibrate student AI depth, lesson milestones, and academic rigor in real time."
        />
      </div>

      {/* 4-Stage Faculty Pipeline Preview */}
      <div
        style={{
          boxSizing: 'border-box',
          width: '100%',
          padding: '13px 18px',
          background: 'rgba(255, 255, 255, 0.45)',
          border: `1px solid ${BORDER_COLOR}`,
          borderRadius: 18,
          boxShadow: '0 2px 8px rgba(100, 90, 87, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span
            style={{
              fontFamily: BADGE_FONT,
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}
          >
            The 4-Stage Faculty Pipeline
          </span>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: ACCENT_RED, flexShrink: 0 }} />
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 400,
                fontSize: 9.5,
                color: SUBTITLE_COLOR,
                lineHeight: '13px',
              }}
            >
              Institution Criteria Preloaded
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' }}>
          <PipelineStep
            stepNumber="01"
            title="AI Impact Analysis"
            detail="Faculty depth calibration"
          />
          <PipelineStep
            stepNumber="02"
            title="Study Block Planner"
            detail="Interactive topic scheduling"
          />
          <PipelineStep
            stepNumber="03"
            title="Week-by-Week Setup"
            detail="Weekly topics, materials & exams"
          />
          <PipelineStep
            stepNumber="04"
            title="Audit-Ready Syllabus"
            detail="Accredited final document"
            isLast
          />
        </div>
      </div>

      {/* Centered Scroll Indicator */}
      <div
        style={{
          alignSelf: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 600,
            fontSize: 15.5,
            lineHeight: '20px',
            color: 'rgba(255, 255, 255, 0.65)',
            display: 'flex',
            alignItems: 'center',
            letterSpacing: '0.2px',
            textShadow: '0 1px 3px rgba(100, 90, 87, 0.22)',
          }}
        >
          Scroll to explore <span style={{ fontSize: 16.5, transform: 'translateY(1px)' }}>↓</span>
        </span>
      </div>
    </div>
  )
})
