import { forwardRef } from 'react'

// The panel's own design canvas — 883px wide (also each pill's own width),
// with the title's own line-height (30) plus its margin-bottom (22) landing
// the first pill's top edge such that seven 53px pills plus six 17px gaps
// between them (371 + 102 = 473) exactly fill the remaining 525 - 52 = 473,
// matching the 883x525 frame this was designed against. Read by
// BackgroundGlowSection to convert this panel's own on-screen scale (see
// PANEL_DESIGN_WIDTH there).
export const PANEL_DESIGN_WIDTH = 883

// Left/right breathing room off the placeholder image's own edges — asked
// for directly ("a left and right margin from the right edge of the screen
// and the grid lines"), rather than the pills running flush edge to edge
// the way PANEL_DESIGN_WIDTH's own derivation first had them. Spent as
// padding on the outer panel below (not a narrower PANEL_DESIGN_WIDTH),
// which is what lets every pill's own fixed internal margins (23, 17, 13,
// 16...) stay exactly as specified — only the flexible gap before the
// right-hand group absorbs the width lost to it.
const PANEL_HORIZONTAL_MARGIN = 40

const TEXT_COLOR = '#645A57'

// Asked for directly — the level badge is the one piece of text here in
// Inter rather than the page's own default (Plus Jakarta Sans, set
// globally in index.css). No webfont pulled in just for a 9.5px badge;
// falls back to the system sans-serif on a machine without Inter
// installed, which reads close enough at this size to not be worth a whole
// additional font load for.
const LEVEL_FONT = 'Inter, system-ui, sans-serif'

// dotColor/opacity both asked for directly, per course rather than
// derived from anything else about the row: the first two get the
// stronger, fully-opaque red; the rest get the softer off-white dot. Row
// opacity holds at 90% through the first four (Retail Specialization is
// the last of those), then steps down (80/60/40) for the last three — read
// as the list trailing off toward its own bottom rather than every row
// reading equally important. The first row's own 90% is a *resting* value,
// not a fixed one — BackgroundGlowSection's own scroll-driven "hover"
// phase brings it up to 100% on top of this (see firstPillRef below),
// simulating hovering it without an actual pointer involved.
export const COURSES = [
  { title: 'Entrepreneurial Management', area: 'Business', level: 4, version: 'v.2025-03-31', timeAgo: '4 hours ago', dotColor: '#CC0001', opacity: 0.9 },
  { title: 'International Business', area: 'Commerce', level: 4, version: 'v.2026-01-22', timeAgo: '11 hours ago', dotColor: '#CC0001', opacity: 0.9 },
  { title: 'Junior Account Management', area: 'Commerce', level: 3, version: 'v.2026-02-15', timeAgo: '12 hours ago', dotColor: 'rgba(250, 242, 239, 0.3)', opacity: 0.9 },
  { title: 'Retail Specialization', area: 'Retail', level: 3, version: 'v.2026-02-18', timeAgo: 'Yesterday', dotColor: 'rgba(250, 242, 239, 0.3)', opacity: 0.9 },
  { title: 'Entrepreneurial E-commerce', area: 'Business', level: 4, version: 'v.2026-02-27', timeAgo: 'Last month', dotColor: 'rgba(250, 242, 239, 0.3)', opacity: 0.8 },
  { title: 'Retail Management', area: 'Retail', level: 4, version: 'v.2026-02-18', timeAgo: '2 months ago', dotColor: 'rgba(250, 242, 239, 0.3)', opacity: 0.6 },
  { title: 'Retail Sales & Operations', area: 'Retail', level: 2, version: 'v.2026-01-11', timeAgo: '2 months ago', dotColor: 'rgba(250, 242, 239, 0.3)', opacity: 0.4 },
]

// The divider + download/export mark that sits flush against each pill's
// own right edge. idSuffix keeps its clipPath id unique per pill — seven
// copies of this icon share the DOM at once, and a repeated id would only
// ever clip against the first of them.
function DownloadDividerIcon({ idSuffix }) {
  const clipId = `syllabus-download-clip-${idSuffix}`
  return (
    <svg width="41" height="33" viewBox="0 0 41 33" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="1" height="23" transform="translate(0 5)" fill={TEXT_COLOR} />
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M29.8334 11.1667H19.1667C18.4303 11.1667 17.8334 11.7636 17.8334 12.5V20.5C17.8334 21.2364 18.4303 21.8333 19.1667 21.8333H29.8334C30.5698 21.8333 31.1667 21.2364 31.1667 20.5V12.5C31.1667 11.7636 30.5698 11.1667 29.8334 11.1667Z"
          stroke={TEXT_COLOR}
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M31.1667 13.1667L25.1867 16.9667C24.9809 17.0956 24.7429 17.164 24.5 17.164C24.2572 17.164 24.0192 17.0956 23.8134 16.9667L17.8334 13.1667"
          stroke={TEXT_COLOR}
          strokeWidth="1.33333"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="16" height="16" fill="white" transform="translate(16.5 8.5)" />
        </clipPath>
      </defs>
    </svg>
  )
}

function ClockIcon({ idSuffix }) {
  const clipId = `syllabus-clock-clip-${idSuffix}`
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M6 11C8.76142 11 11 8.76142 11 6C11 3.23858 8.76142 1 6 1C3.23858 1 1 3.23858 1 6C1 8.76142 3.23858 11 6 11Z"
          stroke={TEXT_COLOR}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M6 3V6L8 7" stroke={TEXT_COLOR} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="12" height="12" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

function FileIcon({ idSuffix }) {
  const clipId = `syllabus-file-clip-${idSuffix}`
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath={`url(#${clipId})`}>
        <path
          d="M7.5 1H3C2.73478 1 2.48043 1.10536 2.29289 1.29289C2.10536 1.48043 2 1.73478 2 2V10C2 10.2652 2.10536 10.5196 2.29289 10.7071C2.48043 10.8946 2.73478 11 3 11H9C9.26522 11 9.51957 10.8946 9.70711 10.7071C9.89464 10.5196 10 10.2652 10 10V3.5L7.5 1Z"
          stroke={TEXT_COLOR}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M7 1V3C7 3.26522 7.10536 3.51957 7.29289 3.70711C7.48043 3.89464 7.73478 4 8 4H10" stroke={TEXT_COLOR} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 4.5H4" stroke={TEXT_COLOR} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 6.5H4" stroke={TEXT_COLOR} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 8.5H4" stroke={TEXT_COLOR} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <defs>
        <clipPath id={clipId}>
          <rect width="12" height="12" fill="white" />
        </clipPath>
      </defs>
    </svg>
  )
}

function CoursePill({ course, index, pillRef }) {
  return (
    <div
      ref={pillRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 53,
        borderRadius: 26.5,
        background: 'rgba(241, 245, 249, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxSizing: 'border-box',
        boxShadow: '0 2px 5px rgba(100, 90, 87, 0.1)',
        opacity: course.opacity,
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
      }}
    >
      <div style={{ marginLeft: 23, width: 11, height: 11, borderRadius: '50%', background: course.dotColor, flexShrink: 0 }} />
      <span style={{ marginLeft: 17, fontWeight: 700, fontSize: 14.6, lineHeight: '20px', color: TEXT_COLOR, whiteSpace: 'nowrap' }}>
        {course.title}
      </span>
      <span style={{ marginLeft: 13, fontWeight: 400, fontSize: 11.7, lineHeight: '16.5px', color: TEXT_COLOR, whiteSpace: 'nowrap' }}>
        {course.area}
      </span>
      <div
        style={{
          marginLeft: 16,
          width: 49,
          height: 17,
          borderRadius: 8.5,
          background: 'rgba(147, 140, 137, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: LEVEL_FONT, fontWeight: 700, fontSize: 9.5, lineHeight: '13.5px', letterSpacing: '0.45px', color: TEXT_COLOR }}>
          LVL • {course.level}
        </span>
      </div>
      {/* Right-justified group — its own marginRight mirrors the circle's
          own 23px left margin, kept symmetric rather than flush against the
          pill's own edge. */}
      <div style={{ marginLeft: 'auto', marginRight: 23, display: 'flex', alignItems: 'center' }}>
        <FileIcon idSuffix={index} />
        <span style={{ marginLeft: 7, fontWeight: 500, fontSize: 12, lineHeight: '16.5px', color: TEXT_COLOR, whiteSpace: 'nowrap' }}>
          {course.version}
        </span>
        <span style={{ marginLeft: 17, display: 'flex' }}>
          <ClockIcon idSuffix={index} />
        </span>
        <span style={{ marginLeft: 7, fontWeight: 500, fontSize: 12, lineHeight: '16.5px', color: TEXT_COLOR, whiteSpace: 'nowrap' }}>
          {course.timeAgo}
        </span>
        <span style={{ marginLeft: 22, display: 'flex' }}>
          <DownloadDividerIcon idSuffix={index} />
        </span>
      </div>
    </div>
  )
}

// Minimalistic cursor simulating an interactive click on the first pill
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
      {/* Click ripple ring */}
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
      {/* Sleek vector cursor */}
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

// The ref forwards to this root div specifically so BackgroundGlowSection
// can drive its scale/opacity imperatively, per frame, the same non-React
// handoff every other DOM label in that canvas already uses (see
// syllabusPanelRef there) — transformOrigin center keeps the panel visually
// centred on the anchor drei's Html itself is placed at regardless of the
// scale currently applied, since that anchor is what's centred, not this
// element's own untransformed layout box.
export const SyllabusOverviewPanel = forwardRef(function SyllabusOverviewPanel(
  { pillRefs, titleRef, firstPillRef, cursorRef, cursorRippleRef },
  ref
) {
  return (
    <div
      ref={ref}
      style={{
        width: PANEL_DESIGN_WIDTH,
        boxSizing: 'border-box',
        paddingLeft: PANEL_HORIZONTAL_MARGIN,
        paddingRight: PANEL_HORIZONTAL_MARGIN,
        transformOrigin: 'center center',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        ref={titleRef}
        style={{
          fontSize: 25,
          lineHeight: '30px',
          fontWeight: 500,
          color: TEXT_COLOR,
          marginBottom: 22,
          textAlign: 'left',
          alignSelf: 'flex-start',
          transformOrigin: 'center left',
          willChange: 'transform, opacity',
        }}
      >
        Syllabus Overview
      </div>
      {/* align-items defaults to stretch on a column flex container, which
          is what gives each pill its own width here (the padding above,
          not a width restated on CoursePill itself) — see
          PANEL_HORIZONTAL_MARGIN's own comment. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 17, position: 'relative' }}>
        {COURSES.map((course, index) => (
          <CoursePill
            key={course.title}
            course={course}
            index={index}
            pillRef={(el) => {
              if (index === 0 && firstPillRef) {
                if (typeof firstPillRef === 'function') firstPillRef(el)
                else firstPillRef.current = el
              }
              if (pillRefs && pillRefs.current) {
                pillRefs.current[index] = el
              }
            }}
          />
        ))}
        <MinimalCursor cursorRef={cursorRef} rippleRef={cursorRippleRef} />
      </div>
    </div>
  )
})
