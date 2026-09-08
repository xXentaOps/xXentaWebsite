import { forwardRef } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { MacroPlannerView } from './MacroPlannerPanel'
import { SyllabusProductionPanel } from './SyllabusProductionPanel'

export const AI_IMPACT_PANEL_DESIGN_WIDTH = 883
export const AI_IMPACT_PANEL_MARGIN = 40

const CARD_BG = 'rgba(241, 245, 249, 0.3)'
const INNER_CARD_BG = 'rgba(255, 255, 255, 0.3)'
const BORDER_COLOR = 'rgba(255, 255, 255, 0.3)'
const TEXT_COLOR = '#645A57'
const SUBTITLE_COLOR = '#968E8B'
const PLACEHOLDER_TEXT_COLOR = 'rgba(150, 142, 139, 0.6)'
const DIVIDER_COLOR = 'rgba(150, 142, 139, 0.2)'
const LEVEL_FONT = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"

const DEFAULT_NAV_ITEMS = ['AI Analysis', 'Planning', 'Structure', 'Production']

function ShieldAlertIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', flexShrink: 0 }}>
      <path
        d="M12 3.5L4 6.5V11.5C4 16 7.5 19.8 12 21C16.5 19.8 20 16 20 11.5V6.5L12 3.5Z"
        stroke={TEXT_COLOR}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 8V11.5"
        stroke={TEXT_COLOR}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="14.8" r="0.95" fill={TEXT_COLOR} />
    </svg>
  )
}

function EditPenIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', opacity: 0.45, flexShrink: 0, cursor: 'pointer' }}>
      <path
        d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
        stroke={TEXT_COLOR}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function NavChevron() {
  return (
    <svg width="5" height="9" viewBox="0 0 5 9" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', flexShrink: 0 }}>
      <path
        d="M1 1.25L3.75 4.5L1 7.75"
        stroke="rgba(150, 142, 139, 0.6)"
        strokeWidth="1.33333"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MinimalCursor({ cursorRef, rippleRef }) {
  return (
    <div
      ref={cursorRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 50,
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

function ImpactCard({
  title,
  description,
  impactTitle = 'AI Impact',
  impactDesc = 'Generative AI can analyze trends, generate creative concepts, and outline the societal impact of ideas at lightning speed.',
  lowImpactText = 'Low Impact',
  highImpactText = 'High Impact',
  placeholderText = 'Specify focus for LLM',
  sliderFillWidth,
  thumbLeft,
  sliderFillRef,
  sliderThumbRef,
  llmInputRef,
  llmTextRef,
  llmPlaceholderRef,
  llmCaretRef,
}) {
  return (
    <div
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '20px 22px',
        gap: 16,
        width: '100%',
        background: INNER_CARD_BG,
        border: `0.666667px solid ${BORDER_COLOR}`,
        borderRadius: 20,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
        <h3 style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 17, color: TEXT_COLOR }}>{title}</h3>
        <p style={{ margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: SUBTITLE_COLOR }}>{description}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', width: '100%', gap: 20 }}>
        {/* Left Column: AI Impact */}
        <div style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <ShieldAlertIcon />
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: TEXT_COLOR }}>{impactTitle}</span>
            </div>
            <EditPenIcon />
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 400,
              fontSize: 11.5,
              lineHeight: '17px',
              color: TEXT_COLOR,
            }}
          >
            {impactDesc}
          </p>
        </div>

        {/* Vertical Divider */}
        <div
          style={{
            width: 1,
            background: DIVIDER_COLOR,
            alignSelf: 'stretch',
            flexShrink: 0,
          }}
        />

        {/* Right Column: Impact Slider & LLM Focus */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          {/* Impact Slider */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              width: '100%',
            }}
          >
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: 11.5,
                lineHeight: '16px',
                color: TEXT_COLOR,
                whiteSpace: 'nowrap',
              }}
            >
              {lowImpactText}
            </span>

            {/* Slider Track */}
            <div
              style={{
                position: 'relative',
                flex: 1,
                maxWidth: 240,
                height: 12,
                background: CARD_BG,
                borderRadius: 9999,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {/* Active Fill */}
              <div
                ref={sliderFillRef}
                style={{
                  width: sliderFillWidth,
                  height: 10.7,
                  background: 'rgba(204, 0, 1, 0.2)',
                  border: '0.666667px solid #CC0001',
                  borderRadius: 9999,
                  boxSizing: 'border-box',
                  willChange: 'width',
                }}
              />
              {/* Slider Thumb */}
              <div
                ref={sliderThumbRef}
                style={{
                  position: 'absolute',
                  left: thumbLeft,
                  top: -2,
                  width: 16,
                  height: 16,
                  background: '#CC0001',
                  border: '2px solid #CC0001',
                  boxShadow:
                    '0px 10px 15px -3px rgba(0, 0, 0, 0.1), 0px 4px 6px -4px rgba(0, 0, 0, 0.1)',
                  borderRadius: 9999,
                  boxSizing: 'border-box',
                  willChange: 'left, transform',
                  transformOrigin: 'center center',
                }}
              />
            </div>

            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: 11.5,
                lineHeight: '16px',
                color: TEXT_COLOR,
                whiteSpace: 'nowrap',
              }}
            >
              {highImpactText}
            </span>
          </div>

          {/* LLM Focus Input */}
          <div
            ref={llmInputRef}
            style={{
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: '4px 12px',
              width: '100%',
              height: 34,
              background: CARD_BG,
              border: `0.67px solid ${BORDER_COLOR}`,
              borderRadius: 8,
              position: 'relative',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
          >
            {/* Placeholder */}
            <span
              ref={llmPlaceholderRef}
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 400,
                fontSize: 11.5,
                lineHeight: '15px',
                color: PLACEHOLDER_TEXT_COLOR,
                position: 'absolute',
                left: 12,
                userSelect: 'none',
                pointerEvents: 'none',
                transition: 'opacity 0.15s ease',
              }}
            >
              {placeholderText}
            </span>

            {/* Typed Text */}
            <span
              ref={llmTextRef}
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: 12,
                lineHeight: '16px',
                color: TEXT_COLOR,
                userSelect: 'none',
              }}
            />

            {/* Blinking Cursor */}
            <span
              ref={llmCaretRef}
              style={{
                display: 'inline-block',
                width: 1.5,
                height: 14,
                background: '#CC0001',
                marginLeft: 2,
                opacity: 0,
                borderRadius: 1,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export const AiImpactAnalysisPanel = forwardRef(function AiImpactAnalysisPanel(
  {
    cursorRef,
    cursorRippleRef,
    sliderFillRef,
    sliderThumbRef,
    llmInputRef,
    llmTextRef,
    llmPlaceholderRef,
    llmCaretRef,
    aiImpactCardRef,
    macroPlannerViewRef,
    macroPlannerHeaderRef,
    macroPlannerContainerRef,
    plannerCursorRef,
    plannerRippleRef,
    draggedCardRef,
    dropPlaceholderRef,
    droppedCardRef,
    sidebarPreparingCardRef,
    sidebarGripRef,
    criteriaCountRef,
    p12CountRef,
    p11FinancialCardRef,
    p11FinancialTitleRef,
    p11FinancialImpactRef,
    navAiAnalysisRef,
    navPlanningRef,
    navProductionRef,
    syllabusProductionViewRef,
  },
  ref,
) {
  const { t } = useLanguage()
  const rawNavItems = t('aiImpact.tabs')
  const navItems = Array.isArray(rawNavItems) ? rawNavItems : DEFAULT_NAV_ITEMS

  return (
    <div
      ref={ref}
      style={{
        width: AI_IMPACT_PANEL_DESIGN_WIDTH,
        boxSizing: 'border-box',
        paddingLeft: AI_IMPACT_PANEL_MARGIN,
        paddingRight: AI_IMPACT_PANEL_MARGIN,
        transformOrigin: 'center center',
        willChange: 'transform, opacity, clip-path',
        display: 'flex',
        flexDirection: 'column',
        gap: 21,
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Minimal Cursor for AI Impact Analysis */}
      <MinimalCursor cursorRef={cursorRef} rippleRef={cursorRippleRef} />

      {/* Top Navigation — aligned to top right (Persistent Header) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          width: '100%',
          height: 36,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {navItems.map((item, idx) => {
            const isAi = idx === 0
            const isPlan = idx === 1
            const isProd = idx === 3
            const itemRef = isAi ? navAiAnalysisRef : isPlan ? navPlanningRef : isProd ? navProductionRef : null
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  ref={itemRef}
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: isAi ? 700 : 500,
                    fontSize: 10,
                    lineHeight: '20px',
                    textAlign: 'center',
                    color: isAi ? '#645A57' : 'rgba(150, 142, 139, 0.6)',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'color 0.2s ease, font-weight 0.2s ease',
                  }}
                >
                  {item}
                </span>
                {idx < navItems.length - 1 && <NavChevron />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Course Title Header (Persistent Header) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          width: '100%',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 500,
            fontSize: 25,
            lineHeight: '32px',
            color: TEXT_COLOR,
          }}
        >
          {t('aiImpact.courseTitle') || 'Entrepreneurial Management'}
        </h1>

        {/* Badges container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
          }}
        >
          {/* lvl • 4 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 17,
              padding: '0 7px',
              background: 'rgba(147, 140, 137, 0.3)',
              borderRadius: 8,
            }}
          >
            <span
              style={{
                fontFamily: LEVEL_FONT,
                fontWeight: 700,
                fontSize: 9.5,
                lineHeight: '14px',
                letterSpacing: '0.45px',
                textTransform: 'uppercase',
                color: TEXT_COLOR,
              }}
            >
              {t('aiImpact.level') || 'lvl • 4'}
            </span>
          </div>

          {/* Draft */}
          <div
            style={{
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 17,
              padding: '0 8px',
              border: '0.666667px solid rgba(147, 140, 137, 0.3)',
              borderRadius: 9999,
            }}
          >
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 9.5,
                lineHeight: '16px',
                textAlign: 'center',
                color: 'rgba(150, 142, 139, 0.6)',
              }}
            >
              {t('aiImpact.draft') || 'Draft'}
            </span>
          </div>
        </div>
      </div>

      {/* Sliding Content Container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 580,
          marginTop: 6,
          overflow: 'visible',
        }}
      >
        {/* Step 1: AI Impact Analysis Card (slides left and fades out when 70% hidden) */}
        <div
          ref={aiImpactCardRef}
          style={{
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '22px 24px',
            gap: 18,
            width: '100%',
            background: CARD_BG,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `0.666667px solid ${BORDER_COLOR}`,
            boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
            borderRadius: 24,
            position: 'absolute',
            top: 0,
            left: 0,
            willChange: 'transform, opacity',
          }}
        >
          {/* Section Header */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
            {/* Badge "1" */}
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
                marginTop: 2,
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
                1
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
                {t('aiImpact.analysisTitle') || 'AI Impact Analysis'}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 400,
                  fontSize: 12,
                  lineHeight: '18px',
                  color: TEXT_COLOR,
                }}
              >
                {t('aiImpact.analysisSubtitle') || "Manage reference materials that guide the AI's behavior and responses."}
              </p>
            </div>
          </div>

          {/* Impact Cards */}
          <ImpactCard
            title={t('aiImpact.cards.concept.title') || 'Development of an Entrepreneurial Concept'}
            description={t('aiImpact.cards.concept.description') || "Manage reference materials that guide the AI's behavior and responses."}
            impactTitle={t('aiImpact.cards.concept.impactTitle') || 'AI Impact'}
            impactDesc={t('aiImpact.cards.concept.impactDesc') || 'Generative AI can analyze trends, generate creative concepts, and outline the societal impact of ideas at lightning speed.'}
            lowImpactText={t('aiImpact.cards.concept.lowImpact') || 'Low Impact'}
            highImpactText={t('aiImpact.cards.concept.highImpact') || 'High Impact'}
            placeholderText={t('aiImpact.cards.concept.placeholder') || 'Specify focus for LLM'}
            sliderFillWidth={26}
            thumbLeft={18}
            sliderFillRef={sliderFillRef}
            sliderThumbRef={sliderThumbRef}
            llmInputRef={llmInputRef}
            llmTextRef={llmTextRef}
            llmPlaceholderRef={llmPlaceholderRef}
            llmCaretRef={llmCaretRef}
          />

          <ImpactCard
            title={t('aiImpact.cards.prep.title') || 'Preparing for Entrepreneurship'}
            description={t('aiImpact.cards.prep.description') || "Manage reference materials that guide the AI's behavior and responses."}
            impactTitle={t('aiImpact.cards.concept.impactTitle') || 'AI Impact'}
            impactDesc={t('aiImpact.cards.concept.impactDesc') || 'Generative AI can analyze trends, generate creative concepts, and outline the societal impact of ideas at lightning speed.'}
            lowImpactText={t('aiImpact.cards.concept.lowImpact') || 'Low Impact'}
            highImpactText={t('aiImpact.cards.concept.highImpact') || 'High Impact'}
            sliderFillWidth={65}
            thumbLeft={55}
          />
        </div>

        {/* Step 2: Macro Planner / Study Planner View (slides in from the right) */}
        <MacroPlannerView
          ref={macroPlannerViewRef}
          headerRef={macroPlannerHeaderRef}
          containerRef={macroPlannerContainerRef}
          plannerCursorRef={plannerCursorRef}
          plannerRippleRef={plannerRippleRef}
          draggedCardRef={draggedCardRef}
          dropPlaceholderRef={dropPlaceholderRef}
          droppedCardRef={droppedCardRef}
          sidebarPreparingCardRef={sidebarPreparingCardRef}
          sidebarGripRef={sidebarGripRef}
          criteriaCountRef={criteriaCountRef}
          p12CountRef={p12CountRef}
          p11FinancialCardRef={p11FinancialCardRef}
          p11FinancialTitleRef={p11FinancialTitleRef}
          p11FinancialImpactRef={p11FinancialImpactRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'translateX(1150px)',
            opacity: 0,
          }}
        />

        {/* Step 4: Syllabus Production View (slides in from the right) */}
        <SyllabusProductionPanel
          ref={syllabusProductionViewRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'translateX(1150px)',
            opacity: 0,
          }}
        />
      </div>
    </div>
  )
})
