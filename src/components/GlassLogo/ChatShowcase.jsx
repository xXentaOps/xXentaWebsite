import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useTransform } from 'framer-motion'
import { AlertDot, ChatAvatar, LockIcon, MicrophoneIcon, RoomPulseIcon } from './ChatIcons'
import {
  CHANNEL_ORDER,
  INSTRUCTIONS,
  ROOM,
  SPEAKERS,
  TURNS_BY_CHANNEL,
  UNCONSCIOUS_STATUS,
  USER_TURNS,
  chatAlertAt,
  chatAngryAt,
  chatChannelOpacityAt,
  chatDimAt,
  chatInstructionsFadeAt,
  chatPrivateAt,
  chatSelectionAt,
  easeOut,
  windowProgress,
} from './chatShowcaseScript'
import { PAGE_MARGIN_VH } from './pageMargin'

// The chat layout the placeholder section pins itself to play. Everything
// here is driven by one `progress` MotionValue (0 the instant the section
// pins, 1 the instant it unpins — see BackgroundGlowSection) rather than by
// time: nothing animates on its own, nothing runs while the visitor is still,
// and scrolling back up plays the whole sequence in reverse for free, because
// every value below is a pure function of that single number.
//
// Nothing here is clickable, deliberately. It reads as an interface you're
// operating — switching rooms, pulling someone aside — but every one of those
// moves is made by scrolling, which is also what keeps it from competing with
// the page's own wheel-gesture machinery (see GlassLogoPreview).

// The design system, transcribed from the supplied SVGs. Written as literal
// rgba() rather than Tailwind's own /opacity syntax because these are the
// exact fills named in the design, and having them once, here, is what keeps
// the header, the input pill and the bubbles provably the same material
// rather than several hex codes that happen to match.
const INPUT_SURFACE = 'rgba(29, 41, 61, 0.6)' // #1D293D 60% — the input pill
const HEADER_SURFACE = 'rgba(29, 41, 61, 0.4)' // #1D293D 40% — the header
const BUBBLE = 'rgba(29, 41, 61, 0.4)' // #1D293D 40% — a character's bubble
const PRIVATE_SURFACE = 'rgba(15, 23, 43, 0.4)' // #0F172B 40% — the locked badge
const STROKE = 'rgba(49, 65, 88, 0.5)' // #314158 50% — input and badge borders
const HEADER_STROKE = 'rgba(49, 65, 88, 0.4)' // #314158 40% — the header's own
const SEPARATOR = '#314158' // the 1x20 rule between the room and its people
const TEXT = '#CAD5E2' // message text, and typed input
const MUTED = '#90A1B9' // header labels, the brief, the input's own resting state
const SELECTED_LABEL = '#DBEAFE' // ...and a header label once it's selected
const NAME = '#E2E8F0' // a character's name

// The header's own two mood-driven accents — the sliding selection pill and
// the room's own static icon plate — cycle blue -> grey -> red in step with
// the same two windows the rest of the scene dims/reddens for (see
// chatDimAt/chatAngryAt, and GradientBlob's own dimRef/angryRef in
// BackgroundGlowSection). Everything else in the header stays put; only
// these two are named as "the UI becoming the colour of the character's
// state."
//
// Kept as RGB triples rather than CSS strings so a frame's blend is a
// couple of per-channel lerps with no string parsing on the hot path — see
// moodRgb below, called once per accent per frame from useTransform.
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function lerpRgb(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}
function rgbaString(rgb, alpha) {
  return `rgba(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])}, ${alpha})`
}

// One base hue per state, applied one after the other rather than as a
// three-way weighted blend: dim and angry never overlap in the script (only
// one segment is ever open at a time), so lerping the already-dimmed result
// toward angry is equivalent to a true three-way mix here, and simpler —
// whichever mood's own weight is 0 leaves its lerp a no-op.
//
// The fill/stroke pair keeps blue's original 10%/20% ratio at every hue —
// only the dim state was given a single flat hex ("update the blue... for
// #314158"), so that same hex stands in for both roles there, the same way
// angry's own two values (also #FB2C36, at 20% for both "the pill" and "the
// pill background") were given explicitly.
//
// #314158 itself was reported back as still too low-contrast — the pill's
// own plate/border at 10%/20% opacity of a dark slate barely lifts off the
// already-darkened dim backdrop, unlike blue/red's own vivid hues at the
// same opacities. Moved to MUTED, the same lighter grey MARK_DIM below was
// already given for the identical reason, so pill and glyph read at a
// consistent, actually-visible weight together rather than the glyph alone
// standing out against a plate still too dim to see.
const ACCENT_LIT = hexToRgb('#2B7FFF')
const ACCENT_DIM = hexToRgb(MUTED)
const ACCENT_ANGRY = hexToRgb('#FB2C36')
const MARK_LIT = hexToRgb('#51A2FF')
// A solid glyph in the same #314158 as its own 20%-opacity plate (ACCENT_DIM
// — the icon's own fill, see moodIconFill) read as barely-there against it —
// reported directly as poor contrast. MUTED is the lighter grey already
// established elsewhere in this exact palette (header labels, the brief,
// the input's own resting state), so the mark now reads clearly against its
// plate without introducing a shade nothing else here uses.
const MARK_DIM = hexToRgb(MUTED)
const MARK_ANGRY = hexToRgb('#FF6467')

function moodRgb(dimT, angryT, lit, dim, angry) {
  let rgb = lit
  if (dimT > 0) rgb = lerpRgb(rgb, dim, dimT)
  if (angryT > 0) rgb = lerpRgb(rgb, angry, angryT)
  return rgb
}

// The same blue/grey/red cycle as the header's own room icon (see accentMark
// in ChatHeader), reused wherever else a character's own state needs to show
// as colour rather than as words — currently just a speaker's role line
// (Carla's "PATIENT'S DAUGHTER" turning the same red her thread does once
// she's pulled aside — asked for directly), but written generically off
// whatever mood is currently active rather than special-cased to her, so
// Peter's own "PATIENT" role picks up the same grey his thread already gets
// without a second rule to keep in step with it.
function useMoodMarkColor(progress) {
  return useTransform(progress, (p) => rgbaString(moodRgb(chatDimAt(p), chatAngryAt(p), MARK_LIT, MARK_DIM, MARK_ANGRY), 1))
}

// The input pill as drawn: 649.33 x 65.33 inside its shadow's own bleed, a 32
// corner radius, and a 0.67 inside stroke. Rounded to whole pixels except the
// stroke, where the fraction is the whole point — 1px reads as a visible
// outline at this scale, and the design deliberately sits below that.
const COLUMN_WIDTH_PX = 648
const PILL_HEIGHT_PX = 65
const PILL_RADIUS_PX = 32
const HAIRLINE_PX = 0.67

const HEADER_AVATAR_PX = 30

// An entry's own left padding — between its box edge (which the sliding
// selection pill sits flush against, since the pill matches whichever entry
// it's on exactly) and its avatar/icon — is fixed at 8px, stated directly:
// every entry's own circle stays that same distance from its pill's left
// edge regardless of which one is selected. Also, now, its own top and
// bottom clearance: the same 8px, on the reasoning that a margin stated for
// one side of the same circle-to-pill relationship ought to hold for the
// other two unless something says otherwise. ENTRY_HEIGHT_PX is *derived*
// from this and the avatar's own size, rather than the avatar being centred
// in an independently-chosen row height (an earlier version did that, and
// centring only guaranteed the top and bottom margins matched *each other*,
// not that either one actually came out to 8px).
const ENTRY_PADDING_LEFT_PX = 8
const ENTRY_HEIGHT_PX = HEADER_AVATAR_PX + 2 * ENTRY_PADDING_LEFT_PX

// The header's own internals: 6px of padding all round the entries row (and
// the pill that slides behind it), which is what turns ENTRY_HEIGHT_PX back
// into the header's own overall height; 4px between entries.
const HEADER_PADDING_PX = 6
const HEADER_HEIGHT_PX = ENTRY_HEIGHT_PX + HEADER_PADDING_PX * 2
const ENTRY_GAP_PX = 4

// The outer pill only, a touch taller on top — asked for directly, and
// nothing else about the header's own geometry (ENTRY_HEIGHT_PX, the sliding
// pill, HEADER_PADDING_PX itself) changes: this is added at the one point
// that actually reads it (the outer pill's own height/top-padding below),
// not folded into HEADER_HEIGHT_PX/HEADER_PADDING_PX themselves, which stay
// the numbers everything else in this file was already built from. Brought
// down from 1px to 0.5px — the first value read as too much once actually on
// screen.
const HEADER_TOP_EXTRA_PX = 0.5

// The right padding is *derived* from ENTRY_PADDING_LEFT_PX plus the two
// numbers this already had to hit — 4px between entries and 29px from one
// name to the next picture — rather than also being stated directly, since a
// second independent number here could easily stop agreeing with those two:
// RIGHT + ENTRY_GAP_PX + (the next entry's own LEFT) has to equal 29 by
// construction, not by re-tuning two constants in step by hand.
const ENTRY_TO_ENTRY_PX = 29
const ENTRY_PADDING_RIGHT_PX = ENTRY_TO_ENTRY_PX - ENTRY_GAP_PX - ENTRY_PADDING_LEFT_PX
// Extra room after "Trauma Bay" before the pill's own right edge — the room
// entry's trailing padding only, on top of ENTRY_PADDING_RIGHT_PX, since the
// gap asked for was after the room's own label specifically, not after every
// entry.
const ROOM_TRAILING_EXTRA_PX = 6
const ENTRY_INNER_GAP_PX = 8

// The character bubble's own radius, from the same spec.
const BUBBLE_RADIUS_PX = 24
// Message text: 14px / 22.8px line height, both given exactly.
const LINE_HEIGHT_PX = 22.8
// The brief and the unconscious-status line share their own type: 13px /
// 19.5px, 0.32px tracking.
const CAPTION_LINE_HEIGHT_PX = 19.5
const CAPTION_TRACKING_PX = 0.32

// How far the whole frame rises into place across its own arrival (see
// `arrival` in ChatShowcase).
const ENTRY_RISE_PX = 28
// ...and how far the brief itself rises as it's crowded out — smaller, since
// this is a subtle "give way" rather than an arrival.
const INSTRUCTIONS_EXIT_RISE_PX = 16

// Where the chat column sits inside the pinned screen. Generous top and
// bottom room rather than a full-bleed panel — the ask was for a chat "spaced
// out like an actual chat screen in the middle of the page", and the top
// figure also has to clear the fixed navbar overhead.
const COLUMN_TOP_VH = 13
const COLUMN_BOTTOM_VH = 10

// Older messages leave through the top of the message area rather than
// stopping dead at its edge. A plain two-stop gradient mask, not a scrim
// drawn over them — the grid behind has to stay visible through the fade.
const TOP_FADE = 'linear-gradient(to bottom, transparent 0px, black 64px)'

// One message's own vertical reveal.
//
// The height animates via `grid-template-rows: <n>fr` on a single-row grid
// with an overflow-hidden child, not via a measured pixel height. That's what
// lets a message grow from nothing to *its own* natural height — which
// depends on how the text wraps at this viewport — without measuring anything
// at all: an `fr` row in an auto-height grid resolves against the item's
// max-content contribution, so 0.4fr is 40% of however tall that message
// happens to be. Measuring instead would mean a ResizeObserver per message
// and a re-render every time one reported, on a page whose whole scroll
// machinery is sensitive to stalled frames (see SiteFooter's own note on
// exactly that).
//
// Growing the row is also what pushes everything above it up — the list is
// bottom-anchored, so a new message arriving carries the conversation upward
// at exactly its own pace, which is the scroll-up a real chat does.
function RevealRow({ reveal, pad = 'pt-5', children }) {
  // Rounded before it becomes a string: progress changes every scroll frame,
  // but a row that has finished (or not started) should keep handing the DOM
  // the identical value rather than a new one differing in the twelfth
  // decimal place.
  const rows = useTransform(reveal, (r) => `${r.toFixed(3)}fr`)
  // Held near-invisible through the first third of the growth so the row
  // opens as space first and resolves into content a moment later, rather
  // than a half-clipped message being legible while it's still growing.
  const opacity = useTransform(reveal, [0, 0.35, 1], [0, 0.12, 1])
  return (
    <motion.div className="grid" style={{ gridTemplateRows: rows }}>
      <div className="min-h-0 overflow-hidden">
        {/* The gap around a row lives inside the clipped child, not as a
            margin on the grid outside it — a margin would still take up room
            at 0fr, so a row that hasn't arrived yet would already be spacing
            its neighbours apart. */}
        <motion.div className={pad} style={{ opacity }}>
          {children}
        </motion.div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Header

// One room or person in the header bar. Its own component rather than markup
// inlined into a .map(), because each needs its own useTransform for the
// selected/unselected label colour, and hooks can't be called in a loop.
function HeaderEntry({ index, label, avatar, isRoom, alert, selection, entryRef, moodIconFill, moodIconMark }) {
  // Lights up as the pill reaches it and dims as it leaves — driven by
  // distance from the fractional selection index rather than by a boolean, so
  // an entry the pill merely passes over on its way somewhere further along
  // brightens and fades again, the way a real sliding indicator behaves.
  // framer interpolates hex colours natively, so these are handed over as
  // written rather than converted to channels first.
  const color = useTransform(selection, [index - 1, index, index + 1], [MUTED, SELECTED_LABEL, MUTED])
  return (
    <div
      ref={entryRef}
      className="relative flex shrink-0 items-center rounded-full"
      style={{
        height: ENTRY_HEIGHT_PX,
        paddingLeft: ENTRY_PADDING_LEFT_PX,
        paddingRight: isRoom ? ENTRY_PADDING_RIGHT_PX + ROOM_TRAILING_EXTRA_PX : ENTRY_PADDING_RIGHT_PX,
        gap: ENTRY_INNER_GAP_PX,
      }}
    >
      {isRoom ? (
        // The room's own mark, in its own tinted plate — always there, not
        // something the selection brings with it. Its colour tracks the
        // active mood regardless of whether the room itself is selected (see
        // moodIconFill/moodIconMark in ChatHeader) — it's naming *the
        // character's* state, not signalling which entry the pill is on.
        <motion.span
          className="flex shrink-0 items-center justify-center rounded-full"
          style={{ width: HEADER_AVATAR_PX, height: HEADER_AVATAR_PX, backgroundColor: moodIconFill }}
        >
          <motion.span className="flex" style={{ color: moodIconMark }}>
            <RoomPulseIcon className="h-4 w-4" />
          </motion.span>
        </motion.span>
      ) : (
        <ChatAvatar src={avatar} size={HEADER_AVATAR_PX} />
      )}
      <motion.span className="text-[13px] font-medium whitespace-nowrap" style={{ color }}>
        {label}
      </motion.span>
      {alert}
    </div>
  )
}

function HeaderAlert({ channel, progress }) {
  const opacity = useTransform(progress, (p) => chatAlertAt(p, channel))
  // Scales in with the fade rather than only fading — an alert that simply
  // materialises at full size is easy to miss in peripheral vision, which is
  // exactly where this one has to be noticed from.
  const scale = useTransform(opacity, [0, 1], [0.4, 1])
  return (
    <motion.span className="pointer-events-none absolute" style={{ top: -1, right: -1, width: 17, height: 17, opacity, scale }}>
      <AlertDot className="absolute inset-0" />
    </motion.span>
  )
}

// Picks a value out of the measured entry boxes at a fractional index,
// interpolating between the two it falls between. Returns 0 before the
// measurement has happened, which is one frame at most and never visible: the
// pill's own opacity is gated on the same measurement.
function sampleRects(rects, at, key) {
  if (!rects.length) return 0
  const low = Math.max(0, Math.min(rects.length - 1, Math.floor(at)))
  const high = Math.max(0, Math.min(rects.length - 1, low + 1))
  const t = Math.max(0, Math.min(1, at - low))
  return rects[low][key] + (rects[high][key] - rects[low][key]) * t
}

function ChatHeader({ selection, progress }) {
  // Measured, not computed. The pill has to be exactly as wide as whichever
  // entry it's on, and those widths come from how the labels actually render
  // — the font, its metrics, the loaded weight — none of which this file can
  // work out in advance. offsetLeft/offsetWidth against the positioned row
  // below give the numbers directly; the alternative is duplicating text
  // metrics in JS and being subtly wrong forever.
  const entryRefs = useRef([])
  const [rects, setRects] = useState([])
  useLayoutEffect(() => {
    function measure() {
      const elements = entryRefs.current
      if (elements.length !== CHANNEL_ORDER.length || elements.some((el) => !el)) return
      setRects(elements.map((el) => ({ left: el.offsetLeft, width: el.offsetWidth })))
    }
    measure()
    window.addEventListener('resize', measure)
    // The labels are set in a webfont, and a webfont that lands after this
    // first ran changes every width here. Re-measuring on fonts.ready is what
    // stops the pill sitting a few pixels off its entry for the life of the
    // page on a cold load.
    let cancelled = false
    document.fonts?.ready.then(() => {
      if (!cancelled) measure()
    })
    return () => {
      cancelled = true
      window.removeEventListener('resize', measure)
    }
  }, [])

  const pillX = useTransform(selection, (at) => sampleRects(rects, at, 'left'))
  const pillWidth = useTransform(selection, (at) => sampleRects(rects, at, 'width'))

  // The two mood-driven accents (see moodRgb above) — one pair of motion
  // values, read here once and handed to both the sliding pill and the
  // room's own icon, rather than each computing its own copy.
  const accentFill = useTransform(progress, (p) => rgbaString(moodRgb(chatDimAt(p), chatAngryAt(p), ACCENT_LIT, ACCENT_DIM, ACCENT_ANGRY), 0.1))
  const accentStroke = useTransform(progress, (p) => rgbaString(moodRgb(chatDimAt(p), chatAngryAt(p), ACCENT_LIT, ACCENT_DIM, ACCENT_ANGRY), 0.2))
  const accentMark = useMoodMarkColor(progress)

  return (
    // self-center, not mx-auto: this sits in a column flex, where the default
    // stretch would make it full width and margin auto would then have nothing
    // left to centre.
    <div
      className="relative flex shrink-0 self-center items-center shadow-lg"
      style={{
        // 1px taller on top only — the outer pill's own asymmetry, nothing
        // inside it (the entries row keeps ENTRY_HEIGHT_PX, still centred
        // the same distance from the bottom edge as before; only the extra
        // headroom above it changes).
        height: HEADER_HEIGHT_PX + HEADER_TOP_EXTRA_PX,
        borderRadius: PILL_RADIUS_PX,
        paddingTop: HEADER_PADDING_PX + HEADER_TOP_EXTRA_PX,
        paddingBottom: HEADER_PADDING_PX,
        paddingLeft: HEADER_PADDING_PX,
        paddingRight: HEADER_PADDING_PX,
        backgroundColor: HEADER_SURFACE,
        border: `${HAIRLINE_PX}px solid ${HEADER_STROKE}`,
      }}
    >
      <div className="relative flex items-center" style={{ height: ENTRY_HEIGHT_PX, gap: ENTRY_GAP_PX }}>
        {/* The sliding selection. One element that moves and resizes, rather
            than a background toggled on each entry in turn — that's what makes
            switching channels read as a single indicator travelling to its new
            home, which is the whole idea of the control. Behind the entries in
            paint order (they come later in the tree) so their labels sit on
            top of it. Its own fill/stroke are the same mood accent the room's
            icon carries, not a fixed blue — see accentFill/accentStroke. */}
        <motion.div
          aria-hidden
          className="absolute top-0 left-0 rounded-full shadow-sm"
          style={{
            x: pillX,
            width: pillWidth,
            height: ENTRY_HEIGHT_PX,
            opacity: rects.length ? 1 : 0,
            backgroundColor: accentFill,
            borderWidth: HAIRLINE_PX,
            borderStyle: 'solid',
            borderColor: accentStroke,
          }}
        />
        <HeaderEntry
          index={0}
          isRoom
          label={ROOM.name}
          selection={selection}
          moodIconFill={accentStroke}
          moodIconMark={accentMark}
          entryRef={(el) => {
            entryRefs.current[0] = el
          }}
        />
        {/* The rule between the room and the people in it. ml-1 on top of the
            row's own 4px gap is what makes it 8px clear of the pill on its
            left while staying 4px + the next entry's own 12px padding — 16px
            — from Dr. Sam's picture on its right, both as specified. Still
            his picture even though his own private channel is never opened
            in-script anymore — his header entry stays regardless, see
            CHANNEL_ORDER's own comment. */}
        <div aria-hidden className="ml-1 h-5 w-px shrink-0" style={{ backgroundColor: SEPARATOR }} />
        {CHANNEL_ORDER.slice(1).map((id, i) => (
          <HeaderEntry
            key={id}
            index={i + 1}
            label={SPEAKERS[id].short}
            avatar={SPEAKERS[id].avatar}
            selection={selection}
            alert={<HeaderAlert channel={id} progress={progress} />}
            entryRef={(el) => {
              entryRefs.current[i + 1] = el
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Messages

// The three dots, in the same bubble material as the reply they precede.
// Grows in, holds, then collapses again as the real bubble takes over — the
// two overlap by design, so the dots give way to the message rather than
// vanishing and leaving a gap behind.
function TypingIndicator({ turn, progress, pad }) {
  const span = turn.end - turn.bodyStart
  const reveal = useTransform(progress, (p) => {
    const rise = easeOut(windowProgress(p, turn.bodyStart, turn.bodyStart + span * 0.1))
    const fall = windowProgress(p, turn.revealStart - span * 0.07, turn.revealStart)
    return rise * (1 - fall)
  })
  return (
    <RevealRow reveal={reveal} pad={pad}>
      <div
        className="flex w-fit items-center gap-1.5 px-5 py-4"
        style={{ backgroundColor: BUBBLE, borderRadius: BUBBLE_RADIUS_PX }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            // Time-based, not scroll-based, and deliberately so: this is the
            // one thing on screen that should read as the other side being
            // busy *right now*, which a dot that only moves when the visitor
            // scrolls cannot do.
            className="block h-1.5 w-1.5 animate-[typingDot_1.2s_ease-in-out_infinite] rounded-full bg-[#CAD5E2]"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </RevealRow>
  )
}

// A character's message: their name and role above the first bubble of a run
// *within this channel*, then the bubble itself. The role's own colour tracks
// whichever mood is currently active (see useMoodMarkColor) rather than
// staying a fixed blue — "the character's role should also change colours
// depending on their emotional state," asked for directly.
function ReplyMessage({ turn, progress }) {
  const speaker = SPEAKERS[turn.from]
  const roleColor = useMoodMarkColor(progress)
  return (
    <div className="flex flex-col items-start">
      {turn.startsRun && (
        // Baseline-aligned, so the 15px name and the 13px role sit on one line
        // rather than being centred against each other. gap-2 is the 8px the
        // spec asks for between them.
        <div className="mb-2.5 flex items-baseline gap-2">
          <span className="text-[15px] font-bold tracking-[-0.38px]" style={{ color: NAME }}>
            {speaker.name}
          </span>
          <motion.span className="text-[13px] font-extralight tracking-[0.32px]" style={{ color: roleColor }}>
            {speaker.role}
          </motion.span>
        </div>
      )}
      <div
        className="max-w-[82%] px-5 py-3.5 text-[14px] font-normal"
        style={{ backgroundColor: BUBBLE, borderRadius: BUBBLE_RADIUS_PX, color: TEXT, lineHeight: `${LINE_HEIGHT_PX}px` }}
      >
        {turn.text}
      </div>
    </div>
  )
}

// The visitor's own message: no bubble, no border, nothing but the words —
// exactly as specified. Right-aligned as the block, left-aligned as text: the
// side of the column is what marks it as theirs (there's no bubble left to do
// that job), while the text inside still starts from a common left edge so
// more than one line stays easy to read.
function UserMessage({ turn }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[74%] text-[14px] font-normal" style={{ color: TEXT, lineHeight: `${LINE_HEIGHT_PX}px` }}>
        {turn.text}
      </p>
    </div>
  )
}

// A reply that continues the *same* speaker's own previous bubble — no name
// or role repeated above it (see turn.startsRun) — sits closer to it than a
// fresh turn does. Reported directly: the gap before "ECG's up..." (Sam's
// second bubble in a row) read as too generous once there was no name/role
// line to justify it. User turns are unaffected — startsRun is never true
// for them in the first place (see buildTimeline), so REPLY_PAD is what they
// always get.
const CONTINUATION_PAD = 'pt-2'

function MessageRow({ turn, progress }) {
  const reveal = useTransform(progress, (p) => easeOut(windowProgress(p, turn.revealStart, turn.revealEnd)))
  const pad = !turn.isUser && !turn.startsRun ? CONTINUATION_PAD : undefined
  return (
    <>
      {!turn.isUser && <TypingIndicator turn={turn} progress={progress} pad={pad} />}
      <RevealRow reveal={reveal} pad={pad}>
        {turn.isUser ? <UserMessage turn={turn} /> : <ReplyMessage turn={turn} progress={progress} />}
      </RevealRow>
    </>
  )
}

// One channel's whole thread, bottom-anchored inside the clipped box below.
// Every channel is mounted at once and cross-faded rather than swapped: a
// thread you've already been in keeps its messages revealed (their windows
// are simply in the past), so switching back to it shows the conversation
// exactly where you left it, with nothing to restore.
function ChannelMessages({ channel, progress }) {
  const turns = TURNS_BY_CHANNEL[channel]
  const opacity = useTransform(progress, (p) => chatChannelOpacityAt(p, channel))
  if (!turns.length) return null
  return (
    <motion.div className="absolute inset-x-0 bottom-0 flex flex-col" style={{ opacity }}>
      {turns.map((turn) => (
        <MessageRow key={turn.index} turn={turn} progress={progress} />
      ))}
    </motion.div>
  )
}

// Bottom-anchored inside a clipped box, which is the entire scroll model: new
// messages are appended at the bottom and the stack grows upward out of the
// top, so nothing has to be scrolled, measured, or translated to keep the
// newest message in view — it is always already at the bottom.
function MessageStack({ progress }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ maskImage: TOP_FADE, WebkitMaskImage: TOP_FADE }}>
      {CHANNEL_ORDER.map((channel) => (
        <ChannelMessages key={channel} channel={channel} progress={progress} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// The brief, the channel state, and the input

// Sits directly under the header for as long as the room is open and its own
// conversation hasn't yet grown to crowd it out (see chatInstructionsFadeAt)
// — which the room reaches more than once (the code, later, happens back in
// the room after Peter's own private thread), so this re-evaluates on every
// return trip rather than fading once, permanently, the first time the room
// closes. Absolutely positioned at the top of the message area rather than
// taking a row in the column: it has to be able to leave without the input
// bar and the conversation shifting to fill the space it gave back. Outside
// the message stack's own mask, too — that mask exists to fade *messages*
// out through the top of the box, and would otherwise fade the brief the
// moment it appeared.
function Instructions({ progress }) {
  const fadeT = useTransform(progress, chatInstructionsFadeAt)
  const opacity = useTransform(fadeT, (t) => 1 - t)
  const y = useTransform(fadeT, (t) => -t * INSTRUCTIONS_EXIT_RISE_PX)
  return (
    <motion.div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-7" style={{ opacity, y }}>
      <p
        className="max-w-[520px] text-center text-[13px] font-medium"
        style={{ color: MUTED, lineHeight: `${CAPTION_LINE_HEIGHT_PX}px`, letterSpacing: `${CAPTION_TRACKING_PX}px` }}
      >
        {INSTRUCTIONS}
      </p>
    </motion.div>
  )
}

// What sits between the conversation and the input: the locked badge whenever
// the open channel is a one-to-one thread, and — for the patient's own thread
// — the line of vitals that stands in for the reply he cannot give. Both grow
// and collapse rather than appearing in place, so the conversation above
// slides for them instead of jumping.
function ChannelStatus({ progress }) {
  const privateReveal = useTransform(progress, (p) => easeOut(chatPrivateAt(p)))
  const dimReveal = useTransform(progress, (p) => easeOut(chatDimAt(p)))
  return (
    <div className="flex shrink-0 flex-col items-center">
      {/* 30px of clearance below it, as specified — as padding inside the
          collapsing row, so it disappears along with the line itself. */}
      <RevealRow reveal={dimReveal} pad="pb-[30px]">
        <p
          className="text-center text-[13px] font-medium uppercase"
          style={{ color: MUTED, lineHeight: `${CAPTION_LINE_HEIGHT_PX}px`, letterSpacing: `${CAPTION_TRACKING_PX}px` }}
        >
          {UNCONSCIOUS_STATUS}
        </p>
      </RevealRow>
      <RevealRow reveal={privateReveal} pad="pb-5">
        <span
          className="flex items-center gap-2 rounded-full py-2 pr-4 pl-3.5"
          style={{ backgroundColor: PRIVATE_SURFACE, border: `${HAIRLINE_PX}px solid ${STROKE}` }}
        >
          <LockIcon className="h-3.5 w-3.5" style={{ color: MUTED }} />
          <span className="text-[11px] font-bold tracking-[0.55px]" style={{ color: MUTED }}>
            PRIVATE CHANNEL
          </span>
        </span>
      </RevealRow>
    </div>
  )
}

function InputBar({ progress }) {
  // Which user turn, if any, is being composed right now — from the moment
  // its typing starts until the moment it's sent (revealStart), which is the
  // beat where the finished line sits in the box before it goes.
  const typed = useTransform(progress, (p) => {
    const turn = USER_TURNS.find((t) => p >= t.typeStart && p < t.revealStart)
    if (!turn) return ''
    const t = windowProgress(p, turn.typeStart, turn.typeEnd)
    // Linear, not eased: typing that accelerates or decelerates reads as a
    // machine playing back a recording, not as someone typing.
    return turn.text.slice(0, Math.round(t * turn.text.length))
  })
  // The caret exists exactly while a message is being composed — which is
  // also exactly when the box is not empty, so the placeholder is its
  // complement rather than a second window that could drift out of step.
  const caretOpacity = useTransform(progress, (p) =>
    USER_TURNS.some((t) => p >= t.typeStart && p < t.revealStart) ? 1 : 0,
  )
  const placeholderOpacity = useTransform(caretOpacity, (v) => 1 - v)

  return (
    <div
      className="flex shrink-0 items-center gap-3 pr-6 pl-7 shadow-lg"
      style={{
        height: PILL_HEIGHT_PX,
        backgroundColor: INPUT_SURFACE,
        border: `${HAIRLINE_PX}px solid ${STROKE}`,
        borderRadius: PILL_RADIUS_PX,
      }}
    >
      {/* min-w-0 so this can actually shrink inside the flex row, and
          overflow-hidden so a line longer than the pill clips at its edge
          rather than pushing the microphone out of the box. */}
      <div className="relative flex min-w-0 flex-1 items-center overflow-hidden">
        <motion.span
          className="pointer-events-none absolute left-0 text-[15px] font-medium whitespace-nowrap"
          style={{ opacity: placeholderOpacity, color: MUTED }}
        >
          Start typing...
        </motion.span>
        {/* A MotionValue rendered as a child: framer writes the new string
            straight into the text node each frame, with no React render and
            no state behind it. */}
        <motion.span className="text-[15px] font-medium whitespace-nowrap" style={{ color: TEXT }}>
          {typed}
        </motion.span>
        {/* The blink is a CSS animation on an inner element, while the outer
            one carries framer's scroll-driven opacity — one element can't hold
            both, since a running CSS animation on `opacity` overrides the
            inline value framer is writing to that same property. */}
        <motion.span className="ml-[3px] block shrink-0" style={{ opacity: caretOpacity }}>
          <span
            className="block w-[1.5px] animate-[caretBlink_1.1s_step-end_infinite]"
            style={{ height: 18, backgroundColor: TEXT }}
          />
        </motion.span>
      </div>
      <MicrophoneIcon className="h-5 w-5 shrink-0" style={{ color: TEXT }} />
    </div>
  )
}

export function ChatShowcase({ progress, arrival }) {
  const selection = useTransform(progress, chatSelectionAt)

  // The frame's own arrival — two things were tried before this and both
  // read wrong. Tying it to `progress` (the *pinned* progress) left it
  // invisible for the entire scroll while this section is still rising into
  // view from below the fold, since that's what `progress` staying at 0
  // means (see usePinnedProgress) — the chat then snapped in all at once
  // only once the section had already fully arrived, correct on paper but
  // static and sudden on screen. Dropping the scroll-tie entirely, in favour
  // of a plain mount-time CSS entrance (matching the callout beside it,
  // which never had this problem, its own opacity never having been gated on
  // `progress` at all), fixed "shows up too late" but overcorrected into
  // "doesn't animate on scroll at all" — already fully resolved by the time
  // scrolling brought it into view, which read as static for a different
  // reason.
  //
  // `arrival` is what both of those were reaching for: it starts counting
  // the moment this section's own top edge touches the *bottom* of the
  // screen — while it's still entirely below the fold — and reaches 1
  // exactly where `progress` itself starts, so the two hand off with no gap
  // and no overlap. The frame now genuinely rises and fades in step with the
  // scroll that's bringing it into view, the same "already moving by the
  // time any of it is visible" idea SeamlessBackdrop's own carousel-driven
  // zoom already uses one section up.
  const entry = useTransform(arrival, easeOut)
  const y = useTransform(entry, [0, 1], [ENTRY_RISE_PX, 0])

  return (
    // pointer-events-none throughout: this is a scroll-driven illustration,
    // not a working chat, and the page it sits on has wheel-gesture machinery
    // (see GlassLogoPreview) that nothing here should ever be able to
    // intercept.
    <motion.div className="pointer-events-none absolute inset-0 flex justify-center" style={{ opacity: entry, y }}>
      <div
        className="flex h-full flex-col"
        style={{
          width: COLUMN_WIDTH_PX,
          // Never wider than the page's own margins allow — the same margin
          // the hero's title and About Us's copy sit on (see pageMargin.js).
          maxWidth: `calc(100vw - ${2 * PAGE_MARGIN_VH}vh)`,
          paddingTop: `${COLUMN_TOP_VH}vh`,
          paddingBottom: `${COLUMN_BOTTOM_VH}vh`,
        }}
      >
        <ChatHeader selection={selection} progress={progress} />
        {/* mb-5 here rather than a spacer element between the status block and
            the input: the status block collapses to nothing in the room, and a
            spacer below it would then be the only thing keeping the newest
            message off the input pill — this way the gap belongs to the
            conversation and is there in every channel. */}
        <div className="relative mb-5 min-h-0 flex-1">
          <MessageStack progress={progress} />
          <Instructions progress={progress} />
        </div>
        <ChannelStatus progress={progress} />
        <InputBar progress={progress} />
      </div>
    </motion.div>
  )
}

export default ChatShowcase
