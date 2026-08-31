import { motion, useTransform } from 'framer-motion'
import { ChatAvatar, IconSlot, MicrophoneIcon } from './ChatIcons'
import { CHAT_HEADER, CHAT_TIMELINE, SPEAKERS } from './chatShowcaseScript'
import { PAGE_MARGIN_VH } from './pageMargin'

// The chat layout the placeholder section pins itself to play. Everything
// here is driven by one `progress` MotionValue (0 the instant the section
// pins, 1 the instant it unpins — see BackgroundGlowSection) rather than by
// time: nothing animates on its own, nothing runs while the visitor is still,
// and scrolling back up plays the whole sequence in reverse for free, because
// every value below is a pure function of that single number.

// The design system, transcribed from the supplied SVGs. Written as literal
// rgba() rather than Tailwind's own /opacity syntax because these are the
// exact fills named in the design (#1D293D at 60%, #314158 at 50%), and
// having them once, here, is what keeps the input pill and the bubbles
// provably the same material rather than two hex codes that happen to match.
const SURFACE = 'rgba(29, 41, 61, 0.6)' // #1D293D 60% — the input pill
const BUBBLE = 'rgba(29, 41, 61, 0.4)' // #1D293D 40% — a character's bubble
const STROKE = 'rgba(49, 65, 88, 0.5)' // #314158 50% — hairlines and borders
const TEXT = '#CAD5E2' // message text, and typed input
const PLACEHOLDER = '#90A1B9' // the input's own resting "Start typing..."
const NAME = '#E2E8F0' // a character's name
const ROLE = '#51A2FF' // ...and their role in the simulation

// The input pill as drawn: 649.33 x 65.33 inside its shadow's own bleed, a
// 32 corner radius, and a 0.67 inside stroke. Rounded to whole pixels except
// the stroke, where the fraction is the whole point — 1px reads as a visible
// outline at this scale, and the design deliberately sits below that.
const COLUMN_WIDTH_PX = 648
const INPUT_HEIGHT_PX = 65
const INPUT_RADIUS_PX = 32
const INPUT_STROKE_PX = 0.67
// The character bubble's own radius, from the same spec.
const BUBBLE_RADIUS_PX = 24
// Message text: 14px / 22.8px line height, both given exactly.
const LINE_HEIGHT_PX = 22.8

// How far the whole frame rises into place over its entry window.
const ENTRY_RISE_PX = 28

// Where the chat column sits inside the pinned screen. Generous top and
// bottom room rather than a full-bleed panel — the ask was for a chat "spaced
// out like an actual chat screen in the middle of the page", and the top
// figure also has to clear the fixed navbar overhead.
const COLUMN_TOP_VH = 15
const COLUMN_BOTTOM_VH = 11

// Older messages leave through the top of the message area rather than
// stopping dead at its edge. A plain two-stop gradient mask, not a scrim
// drawn over them — the grid behind has to stay visible through the fade.
const TOP_FADE = 'linear-gradient(to bottom, transparent 0px, black 64px)'

// Only user turns ever type, so the input bar only ever searches these.
const USER_TURNS = CHAT_TIMELINE.turns.filter((turn) => turn.isUser)

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

// A sub-window of the overall progress, as its own 0..1. Guards the
// degenerate case (start === end) rather than dividing by zero and handing
// back NaN, which would silently propagate into a style string.
function windowProgress(value, start, end) {
  if (end <= start) return value >= end ? 1 : 0
  return clamp01((value - start) / (end - start))
}

// Same shape as every other eased arrival in this codebase — decelerating,
// so things settle into place rather than arriving at full speed.
function easeOut(t) {
  return 1 - (1 - t) ** 3
}

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
// bottom-anchored, so a new message arriving carries the conversation
// upward at exactly its own pace, which is the scroll-up a real chat does.
function RevealRow({ reveal, children }) {
  // Rounded before it becomes a string: progress changes every scroll frame,
  // but a row that has finished (or not started) should keep handing the DOM
  // the identical value rather than a new one differing in the twelfth
  // decimal place.
  const rows = useTransform(reveal, (r) => `${r.toFixed(3)}fr`)
  // Held near-invisible through the first third of the growth so the row
  // opens as space first and resolves into text a moment later, rather than
  // a half-clipped message being legible while it's still growing.
  const opacity = useTransform(reveal, [0, 0.35, 1], [0, 0.12, 1])
  return (
    <motion.div className="grid" style={{ gridTemplateRows: rows }}>
      <div className="min-h-0 overflow-hidden">
        {/* The gap between messages lives inside the clipped child, not as a
            margin on the grid outside it — a margin would still take up room
            at 0fr, so a message that hasn't arrived yet would already be
            spacing the conversation apart. */}
        <motion.div className="pt-5" style={{ opacity }}>
          {children}
        </motion.div>
      </div>
    </motion.div>
  )
}

// The three dots, in the same bubble material as the reply they precede.
// Grows in, holds, then collapses again as the real bubble takes over — the
// two overlap by design, so the dots give way to the message rather than
// vanishing and leaving a gap behind.
function TypingIndicator({ turn, progress }) {
  const span = turn.end - turn.start
  const reveal = useTransform(progress, (p) => {
    const rise = easeOut(windowProgress(p, turn.start, turn.start + span * 0.1))
    const fall = windowProgress(p, turn.revealStart - span * 0.07, turn.revealStart)
    return rise * (1 - fall)
  })
  return (
    <RevealRow reveal={reveal}>
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
            className="block h-1.5 w-1.5 rounded-full bg-[#CAD5E2] animate-[typingDot_1.2s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </div>
    </RevealRow>
  )
}

// A character's message: their name and role above the first bubble of a run,
// then the bubble itself.
function ReplyMessage({ turn }) {
  const speaker = SPEAKERS[turn.from]
  return (
    <div className="flex flex-col items-start">
      {turn.startsRun && (
        // Baseline-aligned, so the 15px name and the 13px role sit on one
        // line rather than being centred against each other. gap-2 is the 8px
        // the spec asks for between them.
        <div className="mb-2.5 flex items-baseline gap-2">
          <span className="text-[15px] font-bold tracking-[-0.38px]" style={{ color: NAME }}>
            {speaker.name}
          </span>
          <span className="text-[13px] font-extralight tracking-[0.32px]" style={{ color: ROLE }}>
            {speaker.role}
          </span>
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
// exactly as specified. Right-aligned as the block, left-aligned as text:
// the side of the column is what marks it as theirs (there's no bubble left
// to do that job), while the text inside still starts from a common left edge
// so more than one line stays easy to read.
function UserMessage({ turn }) {
  return (
    <div className="flex justify-end">
      <p
        className="max-w-[74%] text-[14px] font-normal"
        style={{ color: TEXT, lineHeight: `${LINE_HEIGHT_PX}px` }}
      >
        {turn.text}
      </p>
    </div>
  )
}

function MessageRow({ turn, progress }) {
  const reveal = useTransform(progress, (p) => easeOut(windowProgress(p, turn.revealStart, turn.revealEnd)))
  return (
    <>
      {!turn.isUser && <TypingIndicator turn={turn} progress={progress} />}
      <RevealRow reveal={reveal}>{turn.isUser ? <UserMessage turn={turn} /> : <ReplyMessage turn={turn} />}</RevealRow>
    </>
  )
}

// Bottom-anchored inside a clipped box, which is the entire scroll model: new
// messages are appended at the bottom and the stack grows upward out of the
// top, so nothing has to be scrolled, measured, or translated to keep the
// newest message in view — it is always already at the bottom.
function MessageList({ progress }) {
  return (
    <div
      className="relative min-h-0 flex-1 overflow-hidden"
      style={{ maskImage: TOP_FADE, WebkitMaskImage: TOP_FADE }}
    >
      <div className="absolute inset-x-0 bottom-0 flex flex-col">
        {CHAT_TIMELINE.turns.map((turn) => (
          <MessageRow key={turn.index} turn={turn} progress={progress} />
        ))}
      </div>
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
        height: INPUT_HEIGHT_PX,
        backgroundColor: SURFACE,
        border: `${INPUT_STROKE_PX}px solid ${STROKE}`,
        borderRadius: INPUT_RADIUS_PX,
      }}
    >
      {/* min-w-0 so this can actually shrink inside the flex row, and
          overflow-hidden so a line longer than the pill clips at its edge
          rather than pushing the microphone out of the box. */}
      <div className="relative flex min-w-0 flex-1 items-center overflow-hidden">
        <motion.span
          className="pointer-events-none absolute left-0 text-[15px] font-medium whitespace-nowrap"
          style={{ opacity: placeholderOpacity, color: PLACEHOLDER }}
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
            one carries framer's scroll-driven opacity — one element can't
            hold both, since a running CSS animation on `opacity` overrides
            the inline value framer is writing to that same property. */}
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

// Placeholder header — the real one is still to be designed, so this holds
// its spot with the same bracket convention every other unwritten string on
// this site uses, at the weight and rhythm the real thing will have: an image
// plate, a name/role pair in the exact type the bubbles use for theirs, and
// two icon slots on the right (see IconSlot — paste an <svg> in as a child
// and the placeholder plate gets out of the way).
function ChatHeader() {
  return (
    <div className="flex shrink-0 items-center gap-3 pb-5" style={{ borderBottom: `1px solid ${STROKE}` }}>
      <ChatAvatar src={CHAT_HEADER.avatar} size={34} />
      <div className="flex min-w-0 flex-col">
        <span className="text-[15px] font-bold tracking-[-0.38px]" style={{ color: NAME }}>
          {CHAT_HEADER.title}
        </span>
        <span className="text-[13px] font-extralight tracking-[0.32px]" style={{ color: ROLE }}>
          {CHAT_HEADER.subtitle}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-4" style={{ color: TEXT }}>
        <IconSlot />
        <IconSlot />
      </div>
    </div>
  )
}

export function ChatShowcase({ progress }) {
  // The frame's own arrival, over the timeline's entry window — the same
  // scroll the placeholder callout it replaces is fading out across, so the
  // two cross rather than one waiting for the other to finish.
  const entry = useTransform(progress, (p) => easeOut(windowProgress(p, 0, CHAT_TIMELINE.entryEnd)))
  const y = useTransform(entry, [0, 1], [ENTRY_RISE_PX, 0])

  return (
    // pointer-events-none throughout: this is a scroll-driven illustration,
    // not a working chat, and the page it sits on has wheel-gesture machinery
    // (see GlassLogoPreview) that nothing here should ever be able to
    // intercept.
    <motion.div
      className="pointer-events-none absolute inset-0 flex justify-center"
      style={{ opacity: entry, y }}
    >
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
        <ChatHeader />
        <MessageList progress={progress} />
        <div className="h-6 shrink-0" />
        <InputBar progress={progress} />
      </div>
    </motion.div>
  )
}

export default ChatShowcase
