import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useTransform } from 'framer-motion'
import { ABOUT_US_GRID_ZOOM_SCALE } from './gridConstants'
import { gridScreenMetrics } from './gridScreenMetrics'
import { TEAM_MEMBERS } from './teamData'
import { GRID_SPEED, mainSlidePx, teamContentSlidePx } from './teamTransition'

// The seven member photos, each filling exactly one square of the existing
// background grid, in a staggered block five columns wide by three rows
// tall:
//
//   col:   0     1     2     3     4
//   row 0 [1st]      [4th] [5th]
//   row 1       [3rd]            [7th]
//   row 2 [2nd]            [6th]
//
// Listed in the order the squares were specified, and paired with
// TEAM_MEMBERS in that same order — so the first member lands top-left, the
// second bottom-left, the third in the middle, and so on. That pairing is
// the one arbitrary part of this (nothing about the layout itself implies
// who goes where), so it's a plain index-to-index mapping that can be
// reshuffled by reordering either list alone. The order is also the order
// the arrows walk through in detail mode.
const MEMBER_CELLS = [
  { col: 0, row: 0 },
  { col: 0, row: 2 },
  { col: 1, row: 1 },
  { col: 2, row: 0 },
  { col: 3, row: 0 },
  { col: 3, row: 2 },
  { col: 4, row: 1 },
]
const LAYOUT_COLS = 5
const LAYOUT_ROWS = 3

// Where the enlarged photo sits in detail mode: nine squares, starting one
// column left of the first photo's own square and running to the square
// immediately right of the second photo's. Anchored to the layout rather
// than centred on the screen or on whichever photo was clicked — asked for
// as "always" starting there, so every member's detail view occupies the
// exact same nine squares and switching between them is a pure crossfade
// with nothing shifting underneath.
const DETAIL_ORIGIN = { col: -1, row: 0 }
const DETAIL_SPAN = 3

// Where the detail panel's text starts: "the 5th column, skipping one
// column to the right of the profile picture" — counting the photo's own
// leftmost column as the 1st, the photo (3 columns wide, DETAIL_SPAN) fills
// columns 1-3, column 4 is the one skipped immediately to its right, and
// column 5 is this one. In the same col-index space as DETAIL_ORIGIN (where
// 0 is the first photo's own column), that's DETAIL_ORIGIN.col + DETAIL_SPAN
// + 1 = -1 + 3 + 1 = 3.
const TEXT_COL = DETAIL_ORIGIN.col + DETAIL_SPAN + 1
// How many grid squares wide the name may run — three, the same width as
// the text column below it (TEXT_COLS), up from two and a half. Widened
// from the original one square specifically to allow a bigger size: one
// square was the tightest binding constraint on font size (the
// min-w-0/break-words handling below exists because of that old squeeze).
// At three, "Wouters-Snell" — the longest surname on the team — fits on a
// single line rather than needing to wrap at its own hyphen.
const NAME_BOX_COLS = 3
// How many columns wide the name/line/bio column runs — three, asked for
// explicitly (up from two, "the same as what's left of the five-column
// layout"). No longer tied to LAYOUT_COLS - TEXT_COL now that it's wider
// than what's actually left there: columns 3-5 from TEXT_COL, one column
// past the nominal five-column photo layout's own right edge (column 4).
// Still grid-aligned rather than an arbitrary px width, same as everything
// else on this stage — it just isn't bounded by the photo grid's own
// width any more.
const TEXT_COLS = 3

// Matches BackgroundGrid's own EDGE_STYLE (the highlighted-edge accent line
// drawn beside the placeholder copy below the hero) as closely as a plain
// DOM element can: same #3B82F6, same ~90% opacity. Thickness is NOT
// EDGE_STYLE.halfWidthPx*2 (0.75px halfWidth -> 1.5px) — that math assumes
// the grid renders at exactly TARGET_CELL_PX (160px) per cell, but this
// section's grid is visibly zoomed well past that, so the real on-screen
// line is much thicker than the raw constant implies. Measured directly
// instead: an 8x-zoomed screenshot crop of the actual reference line,
// sampled pixel-by-pixel, gives a full-width-half-maximum (the standard way
// to size a soft/anti-aliased edge — the span where color has crossed
// halfway from background to peak) of ~5 CSS px.
const RULE_COLOR = '#3B82F6'
const RULE_OPACITY = 0.9
const RULE_THICKNESS_PX = 5
// Much shorter than the paragraph column it sits above — a short
// title-underline accent, not a rule spanning the full text width.
const RULE_LENGTH_PX = 64
// Extra clearance between the bio text and the scrollbar, kept for
// paragraphs long enough to actually need that scrollbar — a bio short
// enough to fit without scrolling keeps using the column's full width, so
// its right edge doesn't shift for no reason. Added to the text side only,
// not the scroll container itself, which stays exactly TEXT_COLS wide —
// the scrollbar's own position never moves.
const BIO_SCROLL_GUTTER_PX = 24
// How tall the top/bottom fade-out zone is, for whichever edge currently
// has more text cut off by the scroll block's own boundary. Applied as a
// mask (see maskGradient below) rather than an opaque gradient overlay —
// a mask fades the actual text to transparent, so it reads correctly
// against whatever's behind this panel (the photo, the grid) without
// having to match a background color to paint over it with.
const BIO_FADE_PX = 32

// The bio block's fade mask: solid through the middle, fading to
// transparent over BIO_FADE_PX at whichever edge currently has more text
// past it — top once scrolled down (atTop false), bottom until scrolled
// all the way (atBottom false). An edge with nothing cut off there stays
// fully solid instead of fading toward content that doesn't exist, which
// is why this takes the live scroll position rather than being one fixed
// gradient applied whenever the bio merely happens to be scrollable.
function bioFadeMask(atTop, atBottom) {
  const top = atTop ? 'black 0' : `transparent 0, black ${BIO_FADE_PX}px`
  const bottom = atBottom ? 'black 100%' : `black calc(100% - ${BIO_FADE_PX}px), transparent 100%`
  return `linear-gradient(to bottom, ${top}, ${bottom})`
}

// Splits "Renate van Dijken" into { first: "Renate", last: "van Dijken" } —
// on the *first* space only, not the last, so a middle name-prefix like
// "van" stays attached to the surname it belongs to rather than being cut
// loose as its own line. Checked against all seven names on the team: none
// have a multi-word first name, so this is exact for this data, not a
// heuristic that happens to usually work.
function splitName(fullName) {
  const space = fullName.indexOf(' ')
  if (space === -1) return { first: fullName, last: '' }
  return { first: fullName.slice(0, space), last: fullName.slice(space + 1) }
}

// The seven people — teamData also carries the two dogs, which the group
// photo includes and this block doesn't.
const MEMBERS = TEAM_MEMBERS.filter((member) => !member.isDog)
export const TEAM_MEMBER_COUNT = MEMBERS.length

// Same family as the rest of the page's motion (see aboutUsTransition's own
// note on why everything here is a critically-damped spring rather than a
// bezier), just scaled to a tile growing rather than a whole page sliding.
const TILE_TRANSITION = { type: 'spring', bounce: 0, duration: 0.7 }
// Deliberately quicker than the move: a photo being dismissed should be
// gone before it has visibly travelled anywhere, so the eye reads "the
// others disappeared" rather than "the others shrank back into place".
const TILE_FADE_TRANSITION = { duration: 0.25, ease: 'easeOut' }

// Where each photo lands, in CSS px, against the grid as it rests on the
// Meet the Team stage — plus the nine-square rect the detail view occupies.
//
// Two things make this more than "divide the screen into cells". First, the
// squares have to be the *grid's* squares, so every position is a whole
// number of cells off the grid's own phase rather than an arbitrary offset —
// the same "choose cell indices, never measure the element" approach
// photoCellIndices uses for the About Us photo window, and for the same
// reason: anything derived from measured layout can feed back into the
// layout and oscillate.
//
// Second, the phase this snaps to is not the one About Us uses. The grid
// slides horizontally during the hand-off (see GRID_SPEED/uXPhaseShiftCells),
// and a full slide's travel is very unlikely to be a whole number of cells —
// at a 1600px viewport it's 1680px against a 200px cell, so 8.4 of them.
// Snapping to About Us's phase would leave every photo four fifths of a cell
// off its square once the slide landed. Folding the same travel in here is
// what makes them land *on* the squares instead.
function computeLayout(width, height) {
  const settled = gridScreenMetrics({
    width,
    height,
    scale: ABOUT_US_GRID_ZOOM_SCALE,
    screenOffset: -1,
  })
  const { cell } = settled
  const wrap = (value) => ((value % cell) + cell) % cell
  const phaseX = wrap(settled.phaseX + mainSlidePx(1, width) * GRID_SPEED)
  const phaseY = settled.phaseY

  // Centred as exactly as the grid allows: solve for the boundary nearest
  // the perfectly-centred position and take it. The block can't sit at an
  // arbitrary offset without leaving its squares, so the residual is up to
  // half a cell — unavoidable, and invisible next to a pattern whose own
  // period is that same cell.
  const column = Math.round(((width - LAYOUT_COLS * cell) / 2 - phaseX) / cell)
  const row = Math.round(((height - LAYOUT_ROWS * cell) / 2 - phaseY) / cell)
  const originX = phaseX + column * cell
  const originY = phaseY + row * cell

  return {
    cell,
    tiles: MEMBER_CELLS.map((position) => ({
      left: originX + position.col * cell,
      top: originY + position.row * cell,
    })),
    detail: {
      left: originX + DETAIL_ORIGIN.col * cell,
      top: originY + DETAIL_ORIGIN.row * cell,
      size: DETAIL_SPAN * cell,
    },
    // The name starts level with the photo's own top, up to NAME_BOX_COLS
    // squares wide — widening this was specifically about giving the font
    // room. No fixed height: the name block sizes to its own content, and
    // the rule/role/bio block follows it in normal document flow (see the
    // component below), so however tall the name renders, nothing collides
    // with it. textBox only carries a width now for the same reason — its
    // position is wherever flow puts it, not a computed offset.
    nameBox: { left: originX + TEXT_COL * cell, top: originY, width: NAME_BOX_COLS * cell },
    textBox: { width: TEXT_COLS * cell },
    // Total vertical room for the whole name+rule+bio panel: exactly
    // DETAIL_SPAN cells, matching the enlarged photo's own height — the
    // panel's bottom edge lands on the photo's bottom edge (the end of row
    // 2), never past it, rather than reaching toward the bottom of the
    // viewport regardless of screen size. The panel itself is a flex column
    // bounded to this height — not the bio block directly: how tall the
    // name renders varies (member name, font size/weight all change it),
    // so a height computed for the bio block alone here, assuming it
    // starts right at originY, would be wrong by however tall the name
    // actually turns out to be — exactly the bug that shipped once
    // already. Bounding the *panel* and letting the bio block be the
    // flexible, min-height:0 child (see the component below) means it
    // always gets however much room the name (and the rule/role above it)
    // didn't use, with no separate calculation to keep in sync.
    panelHeight: DETAIL_SPAN * cell,
  }
}

// The Meet the Team stage's own content. Lives one slide-distance to the
// right of About Us and travels in on the same shared progress value (see
// teamContentSlidePx), so the two read as one continuous pan rather than
// one thing leaving and another arriving.
//
// selectedIndex is owned by AboutUsSection rather than here, because the
// arrows that walk through it live in AboutUsIntro — three components need
// to agree on it, so it sits in the one place that already renders both.
export function MeetTheTeamGrid({ teamProgress, isTeamOpen, selectedIndex, onSelect }) {
  const [layout, setLayout] = useState(() => computeLayout(window.innerWidth, window.innerHeight))

  useLayoutEffect(() => {
    const relayout = () => setLayout(computeLayout(window.innerWidth, window.innerHeight))
    relayout()
    window.addEventListener('resize', relayout)
    return () => window.removeEventListener('resize', relayout)
  }, [])

  const x = useTransform(teamProgress, (p) => teamContentSlidePx(p, window.innerWidth))
  const isDetail = selectedIndex != null

  // The currently-open profile's own bio scroll box — set by
  // MemberDetailPanel via the same ref it renders onto that element, so
  // the wheel handler below always has the live element to redirect to
  // without reaching into the DOM by class name.
  const bioScrollRef = useRef(null)

  // Redirects wheel/trackpad-swipe input to the open profile's bio box,
  // no matter where on screen it lands — over the enlarged photo, the
  // name, or the empty background beside them, not just the bio box
  // itself — instead of letting it reach GlassLogoPreview's own
  // window-level wheel listener, the one that drives scrolling down past
  // About Us back to the Hero. A handler on the bio box alone only
  // covers wheel input that already happens to land on it; this is what
  // makes every other case actually scroll the bio too, rather than
  // silently doing nothing (which is what stopping propagation alone,
  // with no redirect, used to leave behind). Capture phase on window
  // means this runs before the event reaches whatever's actually under
  // the cursor, so redirecting it here is a single, complete fix instead
  // of one handler per element that might receive wheel input.
  // preventDefault stops the browser from ALSO trying to apply this
  // wheel's default scroll wherever the cursor happens to be (redundant
  // when that's already the bio box, actively wrong anywhere else) —
  // el.scrollTop below is what actually moves the bio's content; setting
  // it past either end just clamps, so no separate bounds-checking here.
  // Gated on isDetail specifically, not the whole Meet the Team stage:
  // back at the seven-photo grid, scrolling down to the Hero is exactly
  // the existing, wanted behavior — this only needs to hold while a
  // profile's own bio is the thing actually meant to receive that scroll.
  useLayoutEffect(() => {
    if (!isDetail) return
    const redirectWheel = (event) => {
      event.stopPropagation()
      const el = bioScrollRef.current
      if (el) {
        event.preventDefault()
        el.scrollTop += event.deltaY
      }
    }
    // passive:false is required, not optional, for the preventDefault above
    // to have any effect — Chrome treats window/document-level wheel
    // listeners as passive by default (a scroll-performance optimization)
    // unless told otherwise, silently dropping preventDefault calls and
    // logging a console error instead of applying them.
    window.addEventListener('wheel', redirectWheel, { capture: true, passive: false })
    return () => window.removeEventListener('wheel', redirectWheel, { capture: true, passive: false })
  }, [isDetail])

  return (
    // pointer-events-none on the container, re-enabled per tile: this covers
    // the whole viewport even while parked off-screen to the right, and must
    // never swallow clicks meant for anything underneath it. aria-hidden
    // while About Us is up so seven member names aren't announced from a
    // stage nobody has opened yet.
    <motion.div
      style={{ x }}
      aria-hidden={!isTeamOpen}
      className="pointer-events-none absolute inset-0 z-50"
    >
      {layout.tiles.map((tile, index) => {
        const member = MEMBERS[index]
        if (!member) return null
        const selected = index === selectedIndex
        // Grow in place: the tile keeps its own grid square as its layout
        // box and reaches the detail rect by transform alone (scale about
        // its own top-left corner, then translate that corner onto the
        // rect's). Transform rather than animating left/top/width/height
        // because only the former is composited — and because a square
        // scaling to a square can't distort the photo inside it, so
        // object-cover keeps framing it exactly as it does at rest.
        const scale = selected ? layout.detail.size / layout.cell : 1
        const target = selected
          ? { x: layout.detail.left - tile.left, y: layout.detail.top - tile.top, scale, opacity: 1 }
          : { x: 0, y: 0, scale: 1, opacity: isDetail ? 0 : 1 }

        return (
          <motion.button
            key={member.id}
            type="button"
            // Only a control while the grid is showing — in detail mode the
            // arrows do the navigating, and the enlarged photo isn't a
            // button any more.
            disabled={isDetail}
            aria-label={`Open ${member.name}'s profile`}
            onClick={() => onSelect(index)}
            animate={target}
            transition={{ ...TILE_TRANSITION, opacity: TILE_FADE_TRANSITION }}
            style={{
              left: tile.left,
              top: tile.top,
              width: layout.cell,
              height: layout.cell,
              transformOrigin: 'top left',
              // Stacked above its siblings while enlarged so the nine
              // squares it covers are never crossed by a still-fading
              // neighbour on its way out.
              zIndex: selected ? 1 : 0,
            }}
            // `group` only in grid mode, which is what gates the hover zoom
            // below: with no group ancestor, group-hover simply never
            // matches, so the enlarged photo can't pick up a hover state
            // it shouldn't have.
            className={`absolute overflow-hidden bg-white/5 ${
              isDetail ? '' : 'group pointer-events-auto cursor-pointer'
            }`}
          >
            {/* The hover zoom is CSS, not framer-motion, deliberately: the
                button itself is already animating a transform (the grow),
                and two owners of one element's transform would fight. This
                sits on the image *inside* it instead, so the two compose
                instead of overwriting each other. */}
            <img
              src={`/team/${member.id}.jpg`}
              alt={member.name}
              draggable={false}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
            />
          </motion.button>
        )
      })}
      {isDetail && MEMBERS[selectedIndex] && (
        // Keyed on member.id: switching between members via the arrows
        // should read as one profile replacing another, not the same text
        // block silently updating, so this remounts (and re-fades in)
        // rather than diffing its own children in place. That remount also
        // resets MemberDetailPanel's own bio-overflow state for free — no
        // stale "was scrolling for the last member" flag to carry over.
        <MemberDetailPanel
          key={MEMBERS[selectedIndex].id}
          member={MEMBERS[selectedIndex]}
          layout={layout}
          bioScrollRef={bioScrollRef}
        />
      )}
    </motion.div>
  )
}

// Split out from MeetTheTeamGrid's own render specifically so it can hold
// its own state: whether *this* member's bio actually overflows its
// scrollable block, which decides whether the text gets extra right-margin
// clear of the scrollbar (see BIO_SCROLL_GUTTER_PX) or keeps the column's
// full width. That can only be known by measuring the rendered DOM, so it
// needs its own effect — a plain inline function (an IIFE inside a map, as
// this used to be) can't hold hooks.
//
// bioScrollRef is MeetTheTeamGrid's own ref, passed down rather than
// created here — its window-level wheel handler needs the live scroll
// element too (to redirect wheel input onto it from anywhere on screen,
// not just from directly over it), and a ref created inside this
// component would remount to a fresh, empty one every time the key
// changes to a new member, which is exactly when that handler still
// needs a live element to redirect to.
function MemberDetailPanel({ member, layout, bioScrollRef }) {
  const { first, last } = splitName(member.name)
  const bioRef = bioScrollRef
  const [bioOverflows, setBioOverflows] = useState(false)
  // Starts as "nothing cut off either way" rather than both-fading — matches
  // where a freshly-opened bio actually starts (scrollTop 0), so there's no
  // one-frame flash of a top fade that a scroll position of 0 could never
  // have earned.
  const [scrollState, setScrollState] = useState({ atTop: true, atBottom: true })

  const nameRef = useRef(null)
  // Nudges the name block down within its own row so it reads as vertically
  // centred against the row's cell height, not flush to the row's top edge
  // (its default document-flow position). Measured rather than a fixed
  // guessed offset because the name's own rendered height isn't fully fixed
  // — break-words can still wrap a future name onto a second line (see the
  // name block's own comment on that safety net) — so "half the leftover
  // space" has to be computed from whatever the name actually rendered at,
  // not assumed constant.
  const [nameTopOffset, setNameTopOffset] = useState(0)
  // Pulls the rule/role block up to land its top edge exactly on row 1's
  // own top — the same boundary as the top of the grid square one row
  // below the name — rather than a fixed gap under the name. Computed from
  // the same measurement as nameTopOffset (row height minus wherever the
  // name block's bottom actually lands), so it's negative exactly when the
  // centred name reaches lower than that boundary on its own, and stays
  // correct if the name's rendered height ever changes rather than
  // silently drifting out of place the way a flat margin picked to fit
  // today's names would.
  const [ruleTopOffset, setRuleTopOffset] = useState(0)

  // Measures the *unpadded* bio block to decide whether it needs to scroll
  // at all, then (only if so) the render below adds BIO_SCROLL_GUTTER_PX of
  // right-padding to the text. That order matters: padding only ever makes
  // wrapped text taller (narrower lines wrap more), never shorter, so
  // deciding from the unpadded state can't oscillate — an unpadded
  // measurement that already overflows still overflows once padded, so the
  // gutter, once added, never becomes its own reason to remove itself.
  useLayoutEffect(() => {
    const el = bioRef.current
    if (!el) return
    setBioOverflows(el.scrollHeight > el.clientHeight + 1)
    const nameHeight = nameRef.current ? nameRef.current.getBoundingClientRect().height : 0
    const nameTop = Math.max(0, (layout.cell - nameHeight) / 2)
    setNameTopOffset(nameTop)
    setRuleTopOffset(layout.cell - nameTop - nameHeight)

    const updateScrollState = () => {
      setScrollState({
        atTop: el.scrollTop <= 1,
        atBottom: el.scrollTop >= el.scrollHeight - el.clientHeight - 1,
      })
    }
    updateScrollState()
    el.addEventListener('scroll', updateScrollState)
    return () => el.removeEventListener('scroll', updateScrollState)
  }, [layout.cell, layout.panelHeight, layout.textBox.width, bioRef])

  return (
    // flex column, bounded to panelHeight: makes the bio block below
    // (flex-1, min-h-0) the one that gives up space first, and the only
    // one that ever needs to scroll — see panelHeight's own comment in
    // computeLayout for why this has to be the panel's height, not a
    // height computed for the bio block alone.
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={TILE_FADE_TRANSITION}
      className="pointer-events-none absolute flex flex-col"
      style={{ left: layout.nameBox.left, top: layout.nameBox.top, height: layout.panelHeight }}
    >
      {/* No fixed height/justify-center — this used to be pinned to
          exactly one cell tall with the two lines centred inside it, which
          worked until the name outgrew that cell: a bigger/bolder pass
          sized to fit "Wouters-Snell" wrapped still overflowed the box
          (justify-center centers oversized content symmetrically past the
          box's own edges rather than clipping it), pushing the second line
          down into the rule below. Sizing this to its own content instead
          means there's no fixed height left to outgrow — this stays
          correct at any font size. shrink-0: this is a flex child of the
          bounded panel above, and it's the bio block that should give up
          space first, never this. marginTop centres this block within its
          own row — see nameTopOffset's own comment above for why it's
          measured rather than a fixed guess. */}
      <div
        ref={nameRef}
        className="flex shrink-0 flex-col gap-1"
        style={{ width: layout.nameBox.width, marginTop: nameTopOffset }}
      >
        {/* min-w-0 overrides the flex item's default min-width:auto —
            without it, a flex child's *content* (a long unbroken
            word/hyphenated name) can dictate a wider intrinsic minimum
            than the box itself, pushing the box wider instead of wrapping
            inside it. break-words (overflow-wrap) is a safety net for
            whatever survives even that fix — a name segment between break
            opportunities (whitespace/an existing hyphen) too wide for the
            box on its own, with nowhere else to wrap. Both kept even now
            that the wider box fits every current name, including
            "Wouters-Snell", on one line with room to spare: they're cheap
            insurance against a future name this box hasn't seen yet, not
            something today's roster still needs. */}
        {/* #F8FAFC matches HeroTitle's own color exactly — the same value
            it uses for "New Way of" and the switching Learning/Managing/
            Growing word alike, so the name picks up the Hero's own voice
            rather than the page's usual white/90. */}
        <p className="min-w-0 break-words text-[64px] leading-[1.1] font-bold text-[#F8FAFC]">{first}</p>
        {/* "A little bigger" than the first name — one step up, same
            weight/color, not a different voice. */}
        <p className="min-w-0 break-words text-[78px] leading-[1.1] font-bold text-[#F8FAFC]">{last}</p>
      </div>
      {/* The rule and role — a normal-flow sibling of the name block above,
          but its own shrink-0 block separate from the bio, so it stays put
          as a fixed header instead of scrolling away with the bio text
          underneath it. marginTop: ruleTopOffset (often negative) pulls
          this up to sit exactly on row 1's own top edge — see that state's
          own comment above for why it's computed rather than a flat gap
          under the name. */}
      <div className="shrink-0" style={{ width: layout.textBox.width, marginTop: ruleTopOffset }}>
        {/* Matches BackgroundGrid's own EDGE_STYLE accent line — see
            RULE_COLOR/RULE_OPACITY/RULE_THICKNESS_PX above. Short — a
            title-underline accent, not sized to the paragraph column it
            sits above (that's what RULE_LENGTH_PX is, independent of
            layout.textBox.width). */}
        <div style={{ width: RULE_LENGTH_PX, height: RULE_THICKNESS_PX, background: RULE_COLOR, opacity: RULE_OPACITY }} />
        {!member.isDog && (
          <p className="mt-5 text-[10px] tracking-[0.3em] text-[#6BB9FF] uppercase">{member.role}</p>
        )}
      </div>
      {/* flex-1 min-h-0 + overflow-y-auto: a real multi-paragraph bio
          easily runs taller than the room left below the name/rule/role on
          this fixed-height stage — without a bound here, it would render
          off the bottom of the screen with no way to reach it. flex-1
          (rather than a computed maxHeight) is what makes that bound
          automatically correct for any name height: this is the flexible
          child of the bounded panel above, so it gets exactly whatever the
          (shrink-0) name and rule/role blocks didn't use — min-h-0
          overrides a flex item's own default min-height:auto, which
          otherwise refuses to shrink below the content's natural height
          and defeats the bound entirely, the same way min-w-0 does for the
          name's width above. pointer-events-auto (this block only, not the
          whole pointer-events-none stage) so wheel/touch scroll actually
          reaches it. bio-scrollbar (see index.css) turns the browser's
          default scrollbar into just a plain grey line — no track, no
          up/down step buttons — sized to --scrollbar-thickness, set here
          from RULE_THICKNESS_PX so it stays the same thickness as the rule
          above without a second number to keep in sync. (Keeping wheel
          input here from bubbling to window's own scroll-to-close-About-Us
          listener used to be this element's job specifically, via its own
          onWheel — that's now handled once, in MeetTheTeamGrid, for every
          case a scroll could land in while a profile is open, not just
          this one box; see that effect's own comment for why.)
          maskImage/WebkitMaskImage: see bioFadeMask's own comment — fades
          whichever edge currently has text cut off there, none when the
          bio fits without scrolling (bioFadeMask(true, true) is solid
          throughout, but skipping the mask entirely when !bioOverflows
          avoids paying for a mask the browser would otherwise have to
          composite for no visible effect). */}
      <div
        ref={bioRef}
        className="bio-scrollbar mt-2 min-h-0 flex-1 overflow-y-auto pointer-events-auto"
        style={{
          width: layout.textBox.width,
          '--scrollbar-thickness': `${RULE_THICKNESS_PX}px`,
          ...(bioOverflows
            ? {
                WebkitMaskImage: bioFadeMask(scrollState.atTop, scrollState.atBottom),
                maskImage: bioFadeMask(scrollState.atTop, scrollState.atBottom),
              }
            : null),
        }}
      >
        {/* bio is an array of paragraphs (see teamData.js) — each gets its
            own <p> so the breaks the copy was written with actually
            render, rather than collapsing into one run-on block. mt-3
            between them reads as paragraph spacing rather than one more
            line of the same paragraph; the gap above the first one is the
            scroll block's own mt-2, off the role/rule above it.
            paddingRight, only once bioOverflows is known (see the effect
            above): extra clearance from the scrollbar for a bio long
            enough to actually show one, without shifting a short bio's
            text — which never grows a scrollbar — off the column's full
            width for no reason. The scroll block itself always stays
            layout.textBox.width; only the text inside narrows. */}
        {member.bio.map((paragraph, i) => (
          <p
            key={i}
            className={`text-[13px] leading-[1.8] font-extralight text-white/55 ${i === 0 ? '' : 'mt-3'}`}
            style={bioOverflows ? { paddingRight: BIO_SCROLL_GUTTER_PX } : undefined}
          >
            {paragraph}
          </p>
        ))}
      </div>
    </motion.div>
  )
}

export default MeetTheTeamGrid
