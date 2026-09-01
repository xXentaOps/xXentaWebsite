import { forwardRef } from 'react'

export const AI_IMPACT_PANEL_DESIGN_WIDTH = 883
export const AI_IMPACT_PANEL_MARGIN = 40

const TEXT_COLOR = '#645A57'
const SUBTITLE_COLOR = 'rgba(100, 90, 87, 0.6)'
const PLACEHOLDER_TEXT_COLOR = 'rgba(150, 142, 139, 0.6)'
const CARD_BG = 'rgba(241, 245, 249, 0.3)'
const INNER_CARD_BG = 'rgba(241, 245, 249, 0.35)'
const BORDER_COLOR = 'rgba(255, 255, 255, 0.3)'
const DIVIDER_COLOR = 'rgba(147, 140, 137, 0.3)'
const LEVEL_FONT = 'Inter, system-ui, sans-serif'

function ShieldAlertIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8.5 1.75L3.25 3.75V8C3.25 11.6 5.5 14.3 8.5 15.25C11.5 14.3 13.75 11.6 13.75 8V3.75L8.5 1.75Z"
        stroke="#CC0001"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8.5 5.25V9.25" stroke="#CC0001" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8.5" cy="11.75" r="0.85" fill="#CC0001" />
    </svg>
  )
}

function EditPenIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity: 0.45 }}
    >
      <path
        d="M11.333 2.00004C11.5081 1.82494 11.716 1.68605 11.9448 1.59129C12.1736 1.49653 12.4188 1.44775 12.6663 1.44775C12.9139 1.44775 13.1591 1.49653 13.3879 1.59129C13.6167 1.68605 13.8246 1.82494 13.9997 2.00004C14.1748 2.17514 14.3137 2.38304 14.4084 2.61184C14.5032 2.84064 14.552 3.08584 14.552 3.33337C14.552 3.58091 14.5032 3.82611 14.4084 4.05491C14.3137 4.28371 14.1748 4.49161 13.9997 4.66671L5.33301 13.3334L1.99967 14.3334L2.99967 11.0001L11.333 2.00004Z"
        stroke="#645A57"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
        padding: '20px 22px',
        gap: 16,
        width: '100%',
        background: INNER_CARD_BG,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: `0.666667px solid ${BORDER_COLOR}`,
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08), 0px 1px 2px -1px rgba(0, 0, 0, 0.08)',
        borderRadius: 20,
      }}
    >
      {/* Title & Description */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
        <h3
          style={{
            margin: 0,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: 17,
            lineHeight: '24px',
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
            lineHeight: '18px',
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
          gap: 20,
        }}
      >
        {/* Left Column: AI Impact */}
        <div
          style={{
            width: 270,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <ShieldAlertIcon />
              <span
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  lineHeight: '18px',
                  color: TEXT_COLOR,
                }}
              >
                AI Impact
              </span>
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
              Low Impact
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
                fontSize: 11.5,
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
              height: 34,
              background: CARD_BG,
              border: `0.67px solid ${BORDER_COLOR}`,
              borderRadius: 8,
            }}
          >
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 400,
                fontSize: 11.5,
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
        width: AI_IMPACT_PANEL_DESIGN_WIDTH,
        boxSizing: 'border-box',
        paddingLeft: AI_IMPACT_PANEL_MARGIN,
        paddingRight: AI_IMPACT_PANEL_MARGIN,
        transformOrigin: 'center center',
        willChange: 'transform, opacity, clip-path',
        display: 'flex',
        flexDirection: 'column',
        gap: 27,
      }}
    >
      {/* Course Title Header — 27px above the AI Impact Analysis card */}
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
          Entrepreneurial Management
        </h1>

        {/* Badges container */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
              lvl • 4
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
              Draft
            </span>
          </div>
        </div>
      </div>

      {/* Main AI Impact Analysis Card */}
      <div
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
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            width: '100%',
          }}
        >
          {/* Badge "1" — aligned with the 26px title */}
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
              marginTop: 2,
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
                lineHeight: '26px',
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
                lineHeight: '18px',
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
          sliderFillWidth={140}
          thumbLeft={130}
        />

        <ImpactCard
          title="Preparing for Entrepreneurship"
          description="Manage reference materials that guide the AI's behavior and responses."
          sliderFillWidth={65}
          thumbLeft={55}
        />
      </div>
    </div>
  )
})
