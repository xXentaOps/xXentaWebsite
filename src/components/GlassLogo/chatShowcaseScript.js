// The scripted exchange the pinned chat showcase plays out, plus the scroll
// timeline derived from it.
//
// Its own module, not part of ChatShowcase.jsx, for the reason this codebase
// keeps splitting data out of component files: mixing non-component exports
// into one breaks React Fast Refresh for that file, and edits then silently
// fail to reach a running tab (see aboutUsSlides.js, split out after exactly
// that). It also means the copy below can be rewritten without touching a
// line of the animation code that plays it.

// Who talks. `avatar` is a path into /public (the same convention the team
// photos use — see teamData/MeetTheTeamGrid's `/team/${id}.jpg`), so
// dropping a file in and naming it here is the whole job; null renders the
// empty avatar plate instead, which is what these do today.
export const SPEAKERS = {
  nurse: {
    name: '[ Name ]',
    // Uppercase in the copy itself rather than via text-transform — the role
    // is genuinely written in caps in the design, and keeping it that way in
    // the data means a role that shouldn't be shouted (a proper noun, say)
    // can simply be written in mixed case here.
    role: 'TRIAGE NURSE',
    avatar: null, // e.g. '/chat/triage-nurse.webp'
  },
  attending: {
    name: '[ Name ]',
    role: 'ATTENDING PHYSICIAN',
    avatar: null, // e.g. '/chat/attending.webp'
  },
}

// The header's own subject — "to come", so this is a placeholder in the same
// bracket convention every other still-unwritten string on this site uses.
export const CHAT_HEADER = {
  title: '[ Simulation title ]',
  subtitle: '[ SCENARIO ]',
  avatar: null, // e.g. '/chat/scenario.webp'
}

// Placeholder dialogue — illustrative, not final copy, the same standing as
// the lorem ipsum currently sitting in About Us's own body paragraph. Written
// as a plausible exchange rather than bracketed placeholders on purpose:
// the whole point of this section is showing how a *conversation* paces and
// wraps, and `[ text ]` in every bubble would show neither.
//
// User lines are deliberately short. They're typed out character by character
// inside the input pill, which is a single non-wrapping line — a line long
// enough to overflow it would type its way straight off the end.
export const CHAT_SCRIPT = [
  { from: 'user', text: '54-year-old, chest pain radiating down the left arm.' },
  {
    from: 'nurse',
    text: "BP 148 over 92, pulse 104 and irregular. He's diaphoretic and rating the pain a 7. I've started oxygen and I'm holding bay three.",
  },
  { from: 'user', text: 'Run a 12-lead ECG and draw troponin.' },
  { from: 'nurse', text: 'ECG is running now. Bloods are away — troponin, CBC, metabolic panel.' },
  {
    from: 'attending',
    text: "Good call. Walk me through what you'd expect on that ECG if this is a STEMI — and what changes if it isn't.",
  },
]

// Everything below turns that script into scroll windows.
//
// Weights, not hand-written start/end pairs. Writing the windows out
// literally would mean re-tuning every number in the list each time a message
// is added, removed, or reworded — the kind of hand-maintained parallel array
// that drifts the moment someone edits the copy and not the timings. These
// weights are relative: the section's own scroll length is derived from their
// total (see chatScrollVh), so adding a message makes the section longer
// rather than squeezing every other message into less scroll.

// Scroll spent before the first message, while the chat frame itself fades
// in and the placeholder callout it replaces fades out.
const ENTRY_UNITS = 0.55
// ...and after the last one, so the finished conversation gets a moment to
// be read before the section unpins and scrolls away.
const EXIT_UNITS = 0.9
// What every turn costs regardless of length — the beat around it, not the
// message itself.
const TURN_BASE_UNITS = 0.85
// How much longer a turn gets per character. A user line has to be *typed*,
// so its length costs full price; a reply just appears, and its length only
// buys reading time, so it costs a fraction of that.
const USER_CHARS_PER_UNIT = 90
const REPLY_CHARS_PER_UNIT = 210

// Where inside a user's own turn the typing finishes and the message is sent
// — as fractions of that turn's window. The gap between them is the beat
// where the finished line sits in the input before it goes.
const TYPE_FRACTION = 0.62
const SEND_FRACTION = 0.72
// Where inside a reply's turn the typing indicator gives way to the bubble.
const THINK_FRACTION = 0.4
// How much of a turn's window the bubble takes to grow in, once it starts.
const REVEAL_FRACTION = 0.22

// How much page scroll one unit is worth. The one knob for the whole
// section's length: everything else above is relative, so this alone decides
// whether the sequence feels brisk or drawn out.
const VH_PER_UNIT = 40

function turnUnits(entry) {
  const perChar = entry.from === 'user' ? USER_CHARS_PER_UNIT : REPLY_CHARS_PER_UNIT
  return TURN_BASE_UNITS + entry.text.length / perChar
}

function buildTimeline(script) {
  const weights = script.map(turnUnits)
  const totalUnits = ENTRY_UNITS + weights.reduce((sum, w) => sum + w, 0) + EXIT_UNITS

  let cursor = ENTRY_UNITS
  const turns = script.map((entry, index) => {
    const start = cursor / totalUnits
    cursor += weights[index]
    const end = cursor / totalUnits
    const span = end - start
    const isUser = entry.from === 'user'
    // A reply's name/role header only shows above the *first* bubble in a run
    // from that speaker, so a back-and-forth doesn't repeat it on every line.
    const startsRun = !isUser && script[index - 1]?.from !== entry.from
    const revealStart = start + span * (isUser ? SEND_FRACTION : THINK_FRACTION)
    return {
      ...entry,
      index,
      isUser,
      startsRun,
      start,
      end,
      // Only meaningful for user turns; harmless on replies, which never read
      // them.
      typeStart: start,
      typeEnd: start + span * TYPE_FRACTION,
      revealStart,
      revealEnd: revealStart + span * REVEAL_FRACTION,
    }
  })

  return {
    turns,
    // The chat frame's own fade-in window, and the point every message is
    // measured after.
    entryEnd: ENTRY_UNITS / totalUnits,
    totalUnits,
  }
}

export const CHAT_TIMELINE = buildTimeline(CHAT_SCRIPT)

// How much scroll the pinned phase is worth, in vh — derived from the script
// rather than picked, so a longer conversation buys itself more room instead
// of playing faster inside a fixed one.
export const CHAT_SCROLL_VH = Math.round(CHAT_TIMELINE.totalUnits * VH_PER_UNIT)
