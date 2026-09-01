import { forwardRef } from 'react'

export const AI_IMPACT_PANEL_DESIGN_WIDTH = 882

const TEXT_COLOR = '#645A57'
const SUBTITLE_COLOR = 'rgba(100, 90, 87, 0.6)'
const PLACEHOLDER_TEXT_COLOR = 'rgba(150, 142, 139, 0.6)'
const CARD_BG = 'rgba(241, 245, 249, 0.3)'
const BORDER_COLOR = 'rgba(255, 255, 255, 0.3)'
const DIVIDER_COLOR = 'rgba(147, 140, 137, 0.3)'

function AiIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="1.5" width="12" height="14" rx="2" stroke="#EB0F24" strokeWidth="1.66667" />
      <path d="M5.5 5.5H11.5" stroke="#EB0F24" strokeWidth="1.66667" strokeLinecap="round" />
      <path d="M5.5 8.5H11.5" stroke="#EB0F24" strokeWidth="1.66667" strokeLinecap="round" />
      <path d="M5.5 11.5H9" stroke="#EB0F24" strokeWidth="1.66667" strokeLinecap="round" />
    </svg>
  )
}

function ImpactCard({ title, description, sliderFillWidth, thumbLeft }) {
  return (
    <div
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: 25,
        gap: 20,
        width: '100%',
        background: CARD_BG,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: `0.666667px solid ${BORDER_COLOR}`,
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
        borderRadius: 24,
      }}
    >
      {/* Title & Description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
        <h3
          style={{
            margin: 0,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: 18,
            lineHeight: '28px',
            color: TEXT_COLOR,
          }}
        >
          {title}
        </h3>
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
          {description}
        </p>
      </div>

      {/* Body: Two columns */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          width: '100%',
          gap: 24,
        }}
      >
        {/* Left Column: AI Impact */}
        <div
          style={{
            width: 292,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AiIcon />
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                fontSize: 14.6,
                lineHeight: '20px',
                color: TEXT_COLOR,
              }}
            >
              AI Impact
            </span>
          </div>
          <p
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 400,
              fontSize: 12,
              lineHeight: '20px',
              color: TEXT_COLOR,
            }}
          >
            Generative AI can analyze trends, generate creative concepts, and outline the societal
            impact of ideas at lightning speed.
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
            gap: 20,
          }}
        >
          {/* Impact Slider */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              width: '100%',
            }}
          >
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: 12,
                lineHeight: '16px',
                color: TEXT_COLOR,
                whiteSpace: 'nowrap',
              }}
            >
              Low Impact
            </span>

            {/* Slider Track */}
            <div
              style={{
                position: 'relative',
                flex: 1,
                maxWidth: 263,
                height: 12,
                background: CARD_BG,
                borderRadius: 9999,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {/* Active Fill */}
              <div
                style={{
                  width: sliderFillWidth,
                  height: 10.7,
                  background: 'rgba(204, 0, 1, 0.2)',
                  border: '0.666667px solid #CC0001',
                  borderRadius: 9999,
                  boxSizing: 'border-box',
                }}
              />
              {/* Slider Thumb */}
              <div
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
                }}
              />
            </div>

            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 500,
                fontSize: 12,
                lineHeight: '16px',
                color: TEXT_COLOR,
                whiteSpace: 'nowrap',
              }}
            >
              High Impact
            </span>
          </div>

          {/* LLM Focus Input */}
          <div
            style={{
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              padding: '4px 12px',
              width: '100%',
              height: 36,
              background: CARD_BG,
              border: `0.67px solid ${BORDER_COLOR}`,
              borderRadius: 8,
            }}
          >
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 400,
                fontSize: 12,
                lineHeight: '15px',
                color: PLACEHOLDER_TEXT_COLOR,
              }}
            >
              E.g. Gemini, GPT-4, Perplexity...
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const AiImpactAnalysisPanel = forwardRef(function AiImpactAnalysisPanel(props, ref) {
  return (
    <div
      ref={ref}
      style={{
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '27px 27px 25px',
        gap: 24,
        width: AI_IMPACT_PANEL_DESIGN_WIDTH,
        background: CARD_BG,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `0.666667px solid ${BORDER_COLOR}`,
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px -1px rgba(0, 0, 0, 0.1)',
        borderRadius: 24,
        transformOrigin: 'center center',
        willChange: 'transform, opacity, clip-path',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          width: '100%',
        }}
      >
        {/* Badge "1" */}
        <div
          style={{
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            width: 21,
            height: 22,
            background: '#EB0F24',
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
              lineHeight: '28px',
              color: TEXT_COLOR,
            }}
          >
            AI Impact Analysis
          </h2>
          <p
            style={{
              margin: 0,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 400,
              fontSize: 12,
              lineHeight: '20px',
              color: TEXT_COLOR,
            }}
          >
            Manage reference materials that guide the AI's behavior and responses.
          </p>
        </div>
      </div>

      {/* Impact Cards */}
      <ImpactCard
        title="Development of an Entrepreneurial Concept"
        description="Manage reference materials that guide the AI's behavior and responses."
        sliderFillWidth={170}
        thumbLeft={158}
      />

      <ImpactCard
        title="Preparing for Entrepreneurship"
        description="Manage reference materials that guide the AI's behavior and responses."
        sliderFillWidth={71}
        thumbLeft={58}
      />
    </div>
  )
})
