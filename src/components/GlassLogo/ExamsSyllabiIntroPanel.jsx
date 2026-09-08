import { forwardRef } from 'react'
import { useLanguage } from '../../context/LanguageContext'

export const DRP_INTRO_PANEL_DESIGN_WIDTH = 883
export const DRP_INTRO_PANEL_DESIGN_HEIGHT = 525
export const DRP_INTRO_PANEL_MARGIN = 40

const INNER_CARD_BG = 'rgba(255, 255, 255, 0.26)'
const BORDER_COLOR = 'rgba(255, 255, 255, 0.26)'
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
  { elementRefs },
  ref
) {
  const { t } = useLanguage()
  const pipeline = t('examsSyllabi.pipeline') || []

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
        ref={(el) => {
          if (elementRefs && elementRefs.current) elementRefs.current[0] = el
        }}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          width: '100%',
          gap: 16,
          willChange: 'transform, opacity',
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
          {t('examsSyllabi.headline') || 'Curriculums built in hours, not semesters.'}{' '}
          <span style={{ fontWeight: 500, opacity: 0.85 }}>
            {t('examsSyllabi.highlight') || 'Zero external contractors.'}
          </span>
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
          {t('examsSyllabi.badge') || 'INSTITUTIONAL SUITE • v.2026'}
        </span>
      </div>

      {/* Subhead Paragraph with generous breathing room before the cards */}
      <p
        ref={(el) => {
          if (elementRefs && elementRefs.current) elementRefs.current[1] = el
        }}
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
          willChange: 'transform, opacity',
        }}
      >
        {t('examsSyllabi.description') ||
          'Educational institutions spend thousands of euros on outsourced syllabus writers and manual exam consultants. xXenta replaces external overhead with an automated studio that guides educators step-by-step from institutional guidelines to audit-ready, accredited syllabi in a fraction of the time.'}
      </p>

      {/* 3 Metric Cards */}
      <div
        ref={(el) => {
          if (elementRefs && elementRefs.current) elementRefs.current[2] = el
        }}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: 14,
          width: '100%',
          marginBottom: 13,
          willChange: 'transform, opacity',
        }}
      >
        <StatCard
          stat={t('examsSyllabi.stats.savings.val') || '€74,000+'}
          title={t('examsSyllabi.stats.savings.title') || 'Avg. Contractor Savings'}
          description={
            t('examsSyllabi.stats.savings.desc') ||
            'Eliminates external syllabus drafting, format rework, and outsourced exam design.'
          }
        />
        <StatCard
          stat={t('examsSyllabi.stats.speed.val') || '85% Faster'}
          title={t('examsSyllabi.stats.speed.title') || 'From Standard to Sign-Off'}
          description={
            t('examsSyllabi.stats.speed.desc') ||
            'Compresses 8-week administrative committee loops into a single interactive session.'
          }
        />
        <StatCard
          stat={t('examsSyllabi.stats.control.val') || '100% Faculty'}
          title={t('examsSyllabi.stats.control.title') || 'Direct Pedagogical Control'}
          description={
            t('examsSyllabi.stats.control.desc') ||
            'Teachers calibrate student AI depth, lesson milestones, and academic rigor in real time.'
          }
        />
      </div>

      {/* 4-Stage Faculty Pipeline Preview */}
      <div
        ref={(el) => {
          if (elementRefs && elementRefs.current) elementRefs.current[3] = el
        }}
        style={{
          boxSizing: 'border-box',
          width: '100%',
          padding: '13px 18px',
          background: 'rgba(255, 255, 255, 0.30)',
          border: `1px solid ${BORDER_COLOR}`,
          borderRadius: 18,
          boxShadow: '0 2px 8px rgba(100, 90, 87, 0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 22,
          willChange: 'transform, opacity',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span
            style={{
              fontFamily: BADGE_FONT,
              fontWeight: 700,
              fontSize: 10,
              color: TEXT_COLOR,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}
          >
            {t('examsSyllabi.pipelineTitle') || 'The 4-Stage Faculty Pipeline'}
          </span>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 400,
              fontSize: 9.5,
              color: SUBTITLE_COLOR,
              lineHeight: '13px',
            }}
          >
            {t('examsSyllabi.pipelinePreloaded') || '* Institutional Criteria Preloaded'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' }}>
          <PipelineStep
            stepNumber={pipeline[0]?.num || '01'}
            title={pipeline[0]?.title || 'AI Impact Analysis'}
            detail={pipeline[0]?.detail || 'Faculty depth calibration'}
          />
          <PipelineStep
            stepNumber={pipeline[1]?.num || '02'}
            title={pipeline[1]?.title || 'Study Block Planner'}
            detail={pipeline[1]?.detail || 'Interactive topic scheduling'}
          />
          <PipelineStep
            stepNumber={pipeline[2]?.num || '03'}
            title={pipeline[2]?.title || 'Week-by-Week Setup'}
            detail={pipeline[2]?.detail || 'Weekly topics, materials & exams'}
          />
          <PipelineStep
            stepNumber={pipeline[3]?.num || '04'}
            title={pipeline[3]?.title || 'Audit-Ready Syllabus'}
            detail={pipeline[3]?.detail || 'Accredited final document'}
            isLast
          />
        </div>
      </div>

      {/* Centered Scroll Indicator */}
      <div
        ref={(el) => {
          if (elementRefs && elementRefs.current) elementRefs.current[4] = el
        }}
        style={{
          alignSelf: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          willChange: 'transform, opacity',
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 600,
            fontSize: 15.5,
            lineHeight: '20px',
            color: 'rgba(255, 255, 255, 0.58)',
            display: 'flex',
            alignItems: 'center',
            letterSpacing: '0.2px',
            textShadow: '0 1px 3px rgba(100, 90, 87, 0.18)',
          }}
        >
          {t('examsSyllabi.scrollExplore') || 'Scroll to Explore'}{' '}
          <span
            className="intro-arrow-bob"
            style={{
              fontSize: 16.5,
              marginLeft: 7,
            }}
          >
            ↓
          </span>
        </span>
      </div>
    </div>
  )
})
