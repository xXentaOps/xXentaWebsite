import { forwardRef } from 'react'
import { useLanguage } from '../../context/LanguageContext'

// Floren Showcase Design System Tokens (matching ChatShowcase text input box & app)
const INPUT_SURFACE = 'rgba(29, 41, 61, 0.6)' // #1D293D 60% — exact Floren input box surface
const STROKE = 'rgba(49, 65, 88, 0.5)' // #314158 50% — input border
const SEPARATOR = 'rgba(49, 65, 88, 0.4)' // #314158 rule
const HAIRLINE_PX = 0.67
const PILL_RADIUS_PX = 32

const TEXT = '#CAD5E2' // message text & typed input
const MUTED = '#90A1B9' // labels, brief, input resting state
const SELECTED_LABEL = '#DBEAFE' // selected tab label
const NAME = '#E2E8F0' // prominent text / character name
const TEXT_PRIMARY = '#FFFFFF'

const ACCENT_LIT = '#2B7FFF' // vibrant blue
const MARK_LIT = '#51A2FF' // bright blue mark
const BLUE_GLOW = 'rgba(81, 162, 255, 0.16)'

export const SimulationsIntroPanel = forwardRef(function SimulationsIntroPanel(
  _props,
  ref
) {
  const { t } = useLanguage()

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        maxWidth: 1360,
        margin: '0 auto',
        padding: '0 32px 0 32px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* 1. Hero Headline & Subtext */}
      <div style={{ marginBottom: 40, textAlign: 'left' }}>
        <h1
          style={{
            fontSize: 'clamp(26px, 2.8vw, 38px)',
            fontWeight: 400,
            lineHeight: 1.2,
            letterSpacing: '-0.03em',
            color: TEXT_PRIMARY,
            margin: '0 0 12px 0',
          }}
        >
          {t('simulations.headline')}{' '}
          <span
            style={{
              fontWeight: 600,
              color: MARK_LIT,
            }}
          >
            {t('simulations.highlight')}
          </span>
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.5,
            color: TEXT,
            maxWidth: 980,
            fontWeight: 400,
          }}
        >
          {t('simulations.description')}
        </p>
      </div>

      {/* Row 1: The Science of Retention (Card on Left, Title on Right) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(480px, 1.15fr) minmax(380px, 1fr)',
          gap: 48,
          width: '100%',
          alignItems: 'center',
        }}
      >
        {/* Left Column: The Science of Retention Card */}
        <div
          className="shadow-lg"
          style={{
            backgroundColor: INPUT_SURFACE,
            border: `${HAIRLINE_PX}px solid ${STROKE}`,
            borderRadius: PILL_RADIUS_PX,
            padding: '30px 32px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 10,
            overflow: 'hidden',
          }}
        >
          <div>
            {/* Top Half: Retention Metrics */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
                <span
                  style={{
                    fontSize: 48,
                    fontWeight: 700,
                    color: MARK_LIT,
                    lineHeight: 1,
                    letterSpacing: '-0.04em',
                  }}
                >
                  {t('simulations.retentionStat')}
                </span>
                <span style={{ fontSize: 15.5, color: NAME, fontWeight: 600 }}>
                  {t('simulations.retentionTitle')}
                </span>
              </div>

              {/* Minimalist Comparison Bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: MUTED, marginBottom: 6 }}>
                    <span>{t('simulations.readingLabel')}</span>
                    <span style={{ fontWeight: 600 }}>{t('simulations.readingPercent')}</span>
                  </div>
                  <div style={{ height: 6, width: '100%', background: 'rgba(49, 65, 88, 0.4)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '10%', background: 'rgba(144, 161, 185, 0.45)', borderRadius: 999 }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: SELECTED_LABEL, fontWeight: 600, marginBottom: 6 }}>
                    <span>{t('simulations.practiceLabel')}</span>
                    <span style={{ color: MARK_LIT, fontWeight: 700 }}>{t('simulations.practicePercent')}</span>
                  </div>
                  <div style={{ height: 6, width: '100%', background: 'rgba(49, 65, 88, 0.4)', borderRadius: 999, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: '90%',
                        background: `linear-gradient(90deg, ${ACCENT_LIT} 0%, ${MARK_LIT} 100%)`,
                        borderRadius: 999,
                        boxShadow: `0 0 12px ${BLUE_GLOW}`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.45 }}>
                {t('simulations.retentionDesc')}
              </div>
            </div>

            {/* Sleek Divider between Retention & Institutional Impact */}
            <div
              style={{
                height: 1,
                background: SEPARATOR,
                margin: '22px 0 18px 0',
              }}
            />

            {/* Bottom Half: Institutional Impact & Fidelity */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: MARK_LIT,
                  marginBottom: 14,
                }}
              >
                {t('simulations.institutionalTitle')}
              </div>

              {/* 3 Clean Stat Columns */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: MARK_LIT, lineHeight: 1 }}>{t('simulations.metrics.lowerCost.val')}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: NAME, margin: '6px 0 3px 0' }}>{t('simulations.metrics.lowerCost.label')}</div>
                  <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.4 }}>
                    {t('simulations.metrics.lowerCost.desc')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: MARK_LIT, lineHeight: 1 }}>{t('simulations.metrics.repetitions.val')}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: NAME, margin: '6px 0 3px 0' }}>{t('simulations.metrics.repetitions.label')}</div>
                  <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.4 }}>
                    {t('simulations.metrics.repetitions.desc')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: MARK_LIT, lineHeight: 1 }}>{t('simulations.metrics.hallucination.val')}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: NAME, margin: '6px 0 3px 0' }}>{t('simulations.metrics.hallucination.label')}</div>
                  <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.4 }}>
                    {t('simulations.metrics.hallucination.desc')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 22,
              paddingTop: 14,
              borderTop: `1px solid ${SEPARATOR}`,
              fontSize: 11.5,
              fontWeight: 500,
              color: MUTED,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: MARK_LIT }}>✦</span>
            <span>{t('simulations.telemetryNote')}</span>
          </div>
        </div>

        {/* Right Column: Outside Title for The Science of Retention (bigger, left-justified) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            textAlign: 'left',
            paddingLeft: 'clamp(12px, 2vw, 32px)',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: MARK_LIT,
              marginBottom: 12,
            }}
          >
            {t('simulations.sideTag')}
          </span>
          <h2
            style={{
              fontSize: 'clamp(32px, 3.6vw, 48px)',
              fontWeight: 500,
              color: TEXT_PRIMARY,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: '0 0 16px 0',
            }}
          >
            {t('simulations.sideTitleFirst')}<br />
            <span style={{ fontWeight: 700, color: MARK_LIT }}>{t('simulations.sideTitleSecond')}</span>
          </h2>
          <p
            style={{
              fontSize: 15.5,
              lineHeight: 1.6,
              color: TEXT,
              maxWidth: 440,
              margin: 0,
              fontWeight: 400,
            }}
          >
            {t('simulations.sideDesc')}
          </p>
        </div>
      </div>
    </div>
  )
})

export default SimulationsIntroPanel

