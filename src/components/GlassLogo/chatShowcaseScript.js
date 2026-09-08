// The scripted simulation the pinned chat showcase plays out, plus the scroll
// timeline derived from it.
//
// Its own module, not part of ChatShowcase.jsx, for the reason this codebase
// keeps splitting data out of component files: mixing non-component exports
// into one breaks React Fast Refresh for that file, and edits then silently
// fail to reach a running tab (see aboutUsSlides.js, split out after exactly
// that). It also means the copy below can be rewritten without touching a
// line of the animation code that plays it.

// The room, and everyone in it. `short` is what the header pill shows (it has
// to stay narrow); `name` is what goes above a bubble. `avatar` is a path into
// /public — the same convention the team photos use (see MeetTheTeamGrid's
// `/team/${id}.jpg`) — so dropping a .webp in there and naming it here is the
// whole job. null renders the empty plate instead, which is what all three do
// today.
import { assetUrl } from '../../lib/assetUrl'

export const ROOM = {
  id: 'room',
  name: 'Trauma Bay',
}

export const SPEAKERS = {
  sam: {
    name: 'Dr. Sam',
    short: 'Dr. Sam',
    // Uppercase in the copy itself rather than via text-transform — the role
    // is genuinely written in caps in the design, so a role that shouldn't be
    // shouted can simply be written in mixed case here.
    role: 'RESIDENT',
    avatar: assetUrl('/DrSam.png'),
  },
  // Not medical staff — Peter's daughter, in the waiting room asking what's
  // happening. Worried in the room everyone can see; once pulled aside
  // privately, that worry turns to anger (see her own turn's `mood` below,
  // and MOOD_ANGRY throughout).
  carla: {
    name: 'Carla',
    short: 'Carla',
    role: "PATIENT'S DAUGHTER",
    avatar: assetUrl('/Carla.png'),
  },
  peter: {
    name: 'Peter',
    short: 'Peter',
    role: 'PATIENT',
    avatar: assetUrl('/Peter.png'),
  },
}

// Left to right in the header, and the order the selection pill slides
// along. The room always sits first, with the separator drawn after it.
// Sam's own entry stays even though nothing in CHAT_SCRIPT ever switches
// into it anymore (his private aside was cut for length, see CHAT_SCRIPT's
// own history) — asked for directly, kept in the header regardless, simply
// never selected: chatSelectionAt only ever eases the pill toward a
// channel some segment actually opens, so an entry with no segment of its
// own just sits there at rest the whole time, same as it would before the
// visitor ever reaches the first channel that *is* used.
export const CHANNEL_ORDER = [ROOM.id, 'sam', 'carla', 'peter']

// The brief, sitting under the header from the moment the section pins and
// clearing as the first message is typed. It has to carry the patient's own
// presentation, because the first thing the visitor "types" is that same
// information relayed to the room — without it, the opening line would be
// reporting a fact nothing on screen had established.
export const INSTRUCTIONS =
  'You are the attending physician in the Emergency Department. A 54-year-old man has just been brought in with crushing chest pain spreading into his left arm. Coordinate with Dr. Sam to stabilise him, reach a diagnosis, and commit to a course of treatment. Your decisions will determine the outcome of this critical situation.'

// The status line that replaces a reply when the channel's own character
// cannot give one.
export const UNCONSCIOUS_STATUS = 'PATIENT IS UNCONSCIOUS, SKIN COLD. NO RESPONSE TO STIMULI'

// Placeholder dialogue — illustrative, not final copy, the same standing as
// the lorem ipsum currently sitting in About Us's own body paragraph. Written
// as a plausible exchange rather than bracketed placeholders on purpose: the
// point of this section is showing how a *conversation* paces, wraps and
// moves between channels, and `[ text ]` in every bubble would show none of
// it.
//
// Four things have to come across, and the script is cut to the shortest run
// that carries all of them: that you can move between chats, that you can
// pull one person aside privately, that what you decide in those chats keeps
// a patient alive, and that a character's own state — not just who's talking
// — is something the simulation visibly tracks.
//
// `channel` is where the message is said — the room, or one person's private
// thread. A message whose channel differs from the one before it *is* the
// switch; nothing else has to declare one.
//
// `mood`, on the turn where it starts, opens a state that colours the whole
// scene until something explicitly closes it again: `'dim'` is the
// unconscious-patient treatment (near-black screen, grey glow, blue header
// accents turned to slate); `'angry'` is Carla's own, once pulled aside (a
// red scene and red header accents in place of the blue ones). `moodEnds` on
// a later turn is that close — its own flag, deliberately, rather than a
// mood simply running until its own channel is left: dim does end that way
// (the turn that leaves Peter's thread for the code also carries
// `moodEnds`), but Carla's doesn't — hers clears the moment she's actually
// been calmed down, which happens two turns *inside* her own thread, not on
// the way out of it.
//
// `alerts` raises the red dot on another channel's header pill, so a thread
// can call for attention while the visitor is elsewhere; absent an explicit
// `clears`, it clears itself the next time that channel is actually opened —
// the same way a real notification dismisses once you've looked at it.
//
// User lines are deliberately short-ish: they're typed out character by
// character inside the input pill, which is a single non-wrapping line, so a
// line long enough to overflow it would type its way straight off the end.
export const CHAT_SCRIPT = [
  { channel: 'room', from: 'user', text: '54-year-old, chest pain radiating down the left arm. Where are we?' },
  {
    channel: 'room',
    from: 'sam',
    text: 'BP 148 over 92, pulse 104 and irregular. Diaphoretic, pain 7 of 10. Oxygen is running.',
  },
  { channel: 'room', from: 'sam', text: "ECG's up — ST elevation in II, III and aVF. Inferior STEMI." },
  { channel: 'room', from: 'carla', text: "That's my dad. Is he going to be okay?" },

  { channel: 'peter', from: 'user', text: 'Peter, can you hear me? Squeeze my hand.', mood: 'dim' },

  {
    channel: 'room',
    from: 'user',
    text: "He's unresponsive and pulseless. Starting compressions — charge to 200.",
    moodEnds: true,
  },
  { channel: 'room', from: 'sam', text: 'Compressions running, pads are on.' },
  {
    channel: 'room',
    from: 'sam',
    text: "Charged — clear. Shock delivered. Sinus rhythm at 92, he's breathing on his own.",
    alerts: ['peter'],
  },

  { channel: 'peter', from: 'peter', text: '...what happened?' },

  {
    channel: 'carla',
    from: 'user',
    text: "Carla — he's stable. I need you to breathe with me for a second.",
    mood: 'angry',
  },
  // Not blaming anyone in the room — she's not angry *at* the user, she's
  // frightened and it's coming out sideways, at herself. A patient's own
  // relative losing composure over something nobody actually did wrong is
  // its own kind of realistic, and a script where she's simply correct to be
  // furious at the room would make the scene about whether the room
  // deserved it rather than about the skill of meeting her where she is.
  {
    channel: 'carla',
    from: 'carla',
    text: "I can't stop thinking about this morning. We argued over something so small. What if I never got to take it back?",
  },
  // The close: de-escalating a frightened relative, demonstrated as its own
  // skill rather than asserted in a caption — and landing the scene there
  // rather than on her outburst, since the case isn't over until the person
  // in front of you is too.
  {
    channel: 'carla',
    from: 'user',
    text: "You will get to. He's stable, and he wasn't alone tonight because you were here.",
  },
  {
    channel: 'carla',
    from: 'carla',
    text: '...Thank you. I needed to hear that.',
    moodEnds: true,
  },
]

// Everything below turns that script into scroll windows.
//
// Weights, not hand-written start/end pairs. Writing the windows out
// literally would mean re-tuning every number in the list each time a message
// is added, removed, reworded or moved to a different channel — the kind of
// hand-maintained parallel array that drifts the moment someone edits the
// copy and not the timings. These weights are relative: the section's own
// scroll length is derived from their total (see CHAT_SCROLL_VH), so adding a
// message makes the section longer rather than squeezing every other message
// into less scroll.

// Scroll spent before the first message begins typing once the chat has docked.
const ENTRY_UNITS = 0.08
// ...and after the last one, so the finished case gets a moment to be read
// before the section unpins and scrolls away.
const EXIT_UNITS = 0.9
// What every turn costs regardless of length — the beat around it, not the
// message itself.
const TURN_BASE_UNITS = 0.85
// ...and what a turn that opens a new channel costs on top: the pill sliding,
// the two message lists handing over, and (for the patient's own thread) the
// whole screen changing colour. Spent before the message itself starts, so
// the visitor arrives in the new channel and *then* watches it play, rather
// than the two happening over each other.
const SWITCH_UNITS = 0.5
// How much longer a turn gets per character. A user line has to be *typed*,
// so its length costs full price; a reply just appears, and its length only
// buys reading time, so it costs a fraction of that.
const USER_CHARS_PER_UNIT = 90
const REPLY_CHARS_PER_UNIT = 210

// Where inside a user's own turn the typing finishes and the message is sent
// — as fractions of that turn's window, after any switch at the front of it.
// The gap between them is the beat where the finished line sits in the box
// before it goes.
const TYPE_FRACTION = 0.62
const SEND_FRACTION = 0.72
// Where inside a reply's turn the typing indicator gives way to the bubble.
const THINK_FRACTION = 0.4
// How much of a turn's window the bubble takes to grow in, once it starts.
const REVEAL_FRACTION = 0.22

// How much page scroll one unit is worth. The one knob for the whole
// section's length: everything else above is relative, so this alone decides
// whether the sequence feels brisk or drawn out. Raised to 80 for a relaxed,
// readable pace throughout the entire sequence.
const VH_PER_UNIT = 80

function turnUnits(entry, opensChannel) {
  const perChar = entry.from === 'user' ? USER_CHARS_PER_UNIT : REPLY_CHARS_PER_UNIT
  return TURN_BASE_UNITS + entry.text.length / perChar + (opensChannel ? SWITCH_UNITS : 0)
}

function buildTimeline(script) {
  const opensChannel = script.map((entry, i) => i > 0 && script[i - 1].channel !== entry.channel)
  const weights = script.map((entry, i) => turnUnits(entry, opensChannel[i]))
  const totalUnits = ENTRY_UNITS + weights.reduce((sum, w) => sum + w, 0) + EXIT_UNITS

  // Who spoke last *in each channel*, so a name/role header shows above the
  // first bubble of a run within its own thread. Tracking it globally (what
  // an earlier version did) puts the header in the wrong place the moment a
  // channel switch sits between two messages from the same person.
  const lastSpeakerByChannel = {}

  let cursor = ENTRY_UNITS
  const turns = script.map((entry, index) => {
    const start = cursor / totalUnits
    cursor += weights[index]
    const end = cursor / totalUnits
    const opens = opensChannel[index]
    // The switch, if any, is the front SWITCH_UNITS of this turn's own
    // window; everything else about the turn is measured from what's left.
    const switchEnd = opens ? start + (SWITCH_UNITS / totalUnits) : start
    const bodyStart = switchEnd
    const span = end - bodyStart

    const isUser = entry.from === 'user'
    const startsRun = !isUser && lastSpeakerByChannel[entry.channel] !== entry.from
    if (!isUser) lastSpeakerByChannel[entry.channel] = entry.from

    const revealStart = bodyStart + span * (isUser ? SEND_FRACTION : THINK_FRACTION)
    return {
      ...entry,
      index,
      isUser,
      startsRun,
      opensChannel: opens,
      start,
      switchStart: start,
      switchEnd,
      bodyStart,
      end,
      // Only meaningful for user turns; harmless on replies, which never read
      // them.
      typeStart: bodyStart,
      typeEnd: bodyStart + span * TYPE_FRACTION,
      revealStart,
      revealEnd: revealStart + span * REVEAL_FRACTION,
    }
  })

  // Contiguous runs of one channel. A segment owns the screen from the middle
  // of the switch that opens it until the middle of the switch that closes
  // it, which is what the two message lists cross-fade across. Each also
  // keeps its own list of turns, in order — chatInstructionsFadeAt is the one
  // reader, working out how much of a room segment's own content has piled
  // up without needing to measure anything in the DOM.
  const segments = []
  turns.forEach((turn) => {
    const current = segments[segments.length - 1]
    if (current && current.channel === turn.channel && !turn.opensChannel) {
      current.end = turn.end
      current.turns.push(turn)
      return
    }
    if (current) current.end = turn.switchStart
    segments.push({
      channel: turn.channel,
      // The first segment is simply on screen from the start — there's
      // nothing to switch away from.
      switchStart: segments.length === 0 ? 0 : turn.switchStart,
      switchEnd: segments.length === 0 ? 0 : turn.switchEnd,
      end: turn.end,
      turns: [turn],
    })
  })
  // The last segment holds until the very end, through the exit tail.
  if (segments.length) segments[segments.length - 1].end = 1

  // ...and each segment's own hand-off boundaries: it starts closing exactly
  // when the next one starts opening.
  //
  // Infinity, not 1, for the last one — it never closes at all. Writing 1
  // there instead (tried first) put its own close window at [1, 1], which the
  // degenerate branch of windowProgress reads as "already past it" the instant
  // progress reaches 1: the final channel, its locked badge and its whole
  // thread all blinked out on the last pixel of the pinned phase. A boundary
  // no finite progress can reach says what's actually meant.
  segments.forEach((segment, i) => {
    const next = segments[i + 1]
    segment.closeStart = next ? next.switchStart : Number.POSITIVE_INFINITY
    segment.closeEnd = next ? next.switchEnd : Number.POSITIVE_INFINITY
  })

  // Red dots raised on other channels' header pills. Each runs from the
  // moment the message that raises it lands until it's cleared — explicitly
  // (a `clears` elsewhere in the script), or, absent that, automatically the
  // next time the visitor actually opens that channel: opening the tab is
  // what dismisses a real notification, so a script that raises an alert
  // doesn't also have to remember to write down where it gets read.
  const alerts = []
  turns.forEach((turn) => {
    turn.alerts?.forEach((channel) => {
      const nextVisit = turns.find((t) => t.index > turn.index && t.channel === channel && t.opensChannel)
      alerts.push({ channel, start: turn.revealStart, end: nextVisit ? nextVisit.switchStart : 1 })
    })
  })
  turns.forEach((turn) => {
    turn.clears?.forEach((channel) => {
      const open = alerts.find((a) => a.channel === channel && a.start <= turn.revealStart && a.end > turn.revealStart)
      if (open) open.end = turn.revealStart
    })
  })

  // Mood windows — see `mood`/`moodEnds` in CHAT_SCRIPT's own comment. Each
  // gets an arrival ramp (from the turn that opens it) and a departure ramp
  // (from the turn, if any, that explicitly closes it — Infinity if none
  // ever does, the same "no finite progress can reach it" reasoning
  // segment.closeStart/closeEnd already use above). turnMoodRamp picks
  // between a turn's own switch window and its own reveal window: whichever
  // one actually applies depends on whether that particular turn *is* a
  // channel switch or not, true for both the turn that opens a mood (always
  // a switch, so far) and the one that closes it (not always — Carla's own
  // closes two turns into a thread she's already in, not on her way out of
  // it).
  function turnMoodRamp(turn) {
    return turn.opensChannel ? [turn.switchStart, turn.switchEnd] : [turn.revealStart, turn.revealEnd]
  }
  const moods = []
  let openMood = null
  turns.forEach((turn) => {
    if (turn.mood) {
      const [start, end] = turnMoodRamp(turn)
      openMood = { name: turn.mood, start, end, hideStart: Number.POSITIVE_INFINITY, hideEnd: Number.POSITIVE_INFINITY }
      moods.push(openMood)
    }
    if (turn.moodEnds && openMood) {
      const [hideStart, hideEnd] = turnMoodRamp(turn)
      openMood.hideStart = hideStart
      openMood.hideEnd = hideEnd
      openMood = null
    }
  })

  return {
    turns,
    segments,
    alerts,
    moods,
    // The chat frame's own fade-in window.
    entryEnd: ENTRY_UNITS / totalUnits,
    totalUnits,
  }
}

export const CHAT_TIMELINE = buildTimeline(CHAT_SCRIPT)

// How much scroll the pinned phase is worth, in vh — derived from the script
// rather than picked, so a longer case buys itself more room instead of
// playing faster inside a fixed one.
export const CHAT_SCROLL_VH = Math.round(CHAT_TIMELINE.totalUnits * VH_PER_UNIT)

// Each channel's own messages, split once here rather than filtered per
// render — the lists are static for the life of the page.
export const TURNS_BY_CHANNEL = Object.fromEntries(
  CHANNEL_ORDER.map((id) => [id, CHAT_TIMELINE.turns.filter((turn) => turn.channel === id)]),
)

// Only user turns ever type, so the input bar only ever searches these.
export const USER_TURNS = CHAT_TIMELINE.turns.filter((turn) => turn.isUser)

// ---------------------------------------------------------------------------
// Reading the timeline at a given scroll position.
//
// Pure functions of progress, exported from this data module rather than
// living in ChatShowcase.jsx, for two reasons. One is that the WebGL side
// needs them too — the patient's own thread darkens the whole scene, which
// means the backdrop's frame loop has to be able to ask the same question the
// DOM does and get the same answer (see chatDimAt's caller in
// BackgroundGlowSection). The other is that a component file with helper
// exports in it stops Fast Refreshing, which is the failure this module was
// split out to avoid in the first place.

export function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

// A sub-window of the overall progress, as its own 0..1. Guards the
// degenerate case (start >= end) rather than dividing by zero and handing
// back NaN, which would silently propagate into a style string.
export function windowProgress(value, start, end) {
  if (end <= start) return value >= end ? 1 : 0
  return clamp01((value - start) / (end - start))
}

// Same shape as every other eased arrival in this codebase — decelerating, so
// things settle into place rather than arriving at full speed.
export function easeOut(t) {
  return 1 - (1 - t) ** 3
}

// Zero velocity at both ends, for motion that has to start as gently as it
// stops — the header pill sliding between channels, most visibly.
function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

const SEGMENT_POSITIONS = CHAT_TIMELINE.segments.map((segment) => CHANNEL_ORDER.indexOf(segment.channel))

// Which header entry is selected, as a *fractional* index that eases from one
// to the next across a switch — so the pill has a continuous position to
// follow rather than jumping between discrete slots, and the entries it
// passes over light up on the way, the way a real sliding indicator does.
export function chatSelectionAt(progress) {
  const segments = CHAT_TIMELINE.segments
  let value = SEGMENT_POSITIONS[0] ?? 0
  for (let i = 1; i < segments.length; i++) {
    const segment = segments[i]
    if (progress >= segment.switchEnd) {
      value = SEGMENT_POSITIONS[i]
      continue
    }
    if (progress > segment.switchStart) {
      const t = smoothstep(windowProgress(progress, segment.switchStart, segment.switchEnd))
      value = SEGMENT_POSITIONS[i - 1] + (SEGMENT_POSITIONS[i] - SEGMENT_POSITIONS[i - 1]) * t
    }
    break
  }
  return value
}

// How visible one channel's message list is. The two halves of a switch are
// split deliberately: the outgoing list is gone by the midpoint and the
// incoming one starts there, so the two never overlap as a double exposure of
// two different conversations.
export function chatChannelOpacityAt(progress, channel) {
  let value = 0
  for (const segment of CHAT_TIMELINE.segments) {
    if (segment.channel !== channel) continue
    const openMid = (segment.switchStart + segment.switchEnd) / 2
    const closeMid = (segment.closeStart + segment.closeEnd) / 2
    const shown = windowProgress(progress, openMid, segment.switchEnd)
    const hidden = windowProgress(progress, segment.closeStart, closeMid)
    value = Math.max(value, shown * (1 - hidden))
  }
  return value
}

// Whichever segments carry a state, as a 0..1 across the *whole* switch
// rather than half of it — the screen going dark and the private-channel
// badge appearing are both part of arriving somewhere, so they run for the
// full length of the move rather than snapping at its midpoint.
function segmentStateAt(progress, matches) {
  let value = 0
  for (const segment of CHAT_TIMELINE.segments) {
    if (!matches(segment)) continue
    const shown = windowProgress(progress, segment.switchStart, segment.switchEnd)
    const hidden = windowProgress(progress, segment.closeStart, segment.closeEnd)
    value = Math.max(value, shown * (1 - hidden))
  }
  return value
}

// How far into a given mood the visitor currently is — 0 outside it, 1 once
// fully arrived, easing back down across whichever turn closes it (see
// CHAT_TIMELINE.moods). Both this file's own callers (chatDimAt/chatAngryAt
// below) and ChatShowcase's header-accent colours read this same function
// with different mood names, rather than each keeping their own copy of
// which windows qualify.
export function chatMoodAt(progress, mood) {
  let value = 0
  for (const window of CHAT_TIMELINE.moods) {
    if (window.name !== mood) continue
    const shown = windowProgress(progress, window.start, window.end)
    const hidden = windowProgress(progress, window.hideStart, window.hideEnd)
    value = Math.max(value, shown * (1 - hidden))
  }
  return value
}

// The unconscious-patient treatment: near-black screen, grey glow, and the
// status line above the input that stands in for the reply he can't give.
export function chatDimAt(progress) {
  return chatMoodAt(progress, 'dim')
}

// Carla's own, once pulled aside from the worried-in-the-room version of
// her into a private word: the scene reddens instead of darkening.
export function chatAngryAt(progress) {
  return chatMoodAt(progress, 'angry')
}

// Anywhere that isn't the room is a one-to-one thread, and gets the locked
// badge above the input.
export function chatPrivateAt(progress) {
  return segmentStateAt(progress, (segment) => segment.channel !== ROOM.id)
}

// Every room segment, in the order the visitor actually reaches them —
// chatInstructionsFadeAt's own way of telling the very first visit to the
// room apart from every return trip, since only the returns are ever asked
// to fade the brief at all.
const ROOM_SEGMENTS = CHAT_TIMELINE.segments.filter((segment) => segment.channel === ROOM.id)

// The brief's own fade window for a *return* visit to the room — the first
// visit never gets one at all (see chatInstructionsFadeAt) — built so the
// target turn's own arrival lands exactly at the window's midpoint, rather
// than wherever a window merely running "from the previous turn to the
// target" would happen to put it. That distinction is the point: half the
// brief should still be showing *as* the crowding message lands, with the
// rest fading out after it rather than by it — asked for directly, since a
// window that finishes fading by the target's own arrival reads as already
// gone the moment that message is actually there to read alongside it.
function instructionsWindowFor(segment) {
  const targetIndex = Math.max(0, segment.turns.length - 2)
  const targetTurn = segment.turns[targetIndex]
  const previousTurn = segment.turns[targetIndex - 1]
  const start = previousTurn ? previousTurn.revealEnd : segment.switchEnd
  const midpoint = targetTurn.revealStart
  return { start, end: start + 2 * (midpoint - start) }
}

// How faded/pushed-up the brief under the header should be — 0 fully shown,
// 1 fully gone.
//
// Three things have been true about this in turn, and only the last one is
// actually what was wanted: tying the fade to a single fixed window early in
// the timeline was correct the first time the room closed but permanently 0
// after, including on a later return where nothing had crowded it out yet;
// tying it to each room segment's own close fired too late, well past
// "Compressions running, pads are on"; and tying it — symmetrically, on
// every visit including the first — to that same message's own arrival
// fired too *early*, fading the brief out on the very first visit to the
// room, before there had been any earlier trip away from it to justify
// losing it at all.
//
// The brief is meant to orient a visitor who has nothing on screen yet —
// there is nothing to crowd it out of the way *the first time*, no matter
// how many messages the opening exchange runs to, so the first room segment
// (ROOM_SEGMENTS[0]) simply never fades. Only a *return* to the room, after
// the visitor has already been away from it once, ever asks the brief to
// give up its space — and even then, gradually: see instructionsWindowFor's
// own note on why its target message's arrival is the window's midpoint,
// not its end.
export function chatInstructionsFadeAt(progress) {
  let visible = 0
  for (const segment of CHAT_TIMELINE.segments) {
    if (segment.channel !== ROOM.id) continue
    const arrived = windowProgress(progress, segment.switchStart, segment.switchEnd)
    if (segment === ROOM_SEGMENTS[0]) {
      // Fade out the brief as the first messages scroll up toward the top,
      // preventing incoming chat bubbles from colliding with the instructions.
      const turn0End = segment.turns[0]?.revealEnd ?? segment.switchEnd
      const turn1End = segment.turns[1]?.revealEnd ?? (turn0End + 0.04)
      const crowded = windowProgress(progress, turn0End, turn1End)
      const left = windowProgress(progress, segment.closeStart, segment.closeEnd)
      visible = Math.max(visible, arrived * (1 - Math.max(crowded, left)))
      continue
    }
    const window = instructionsWindowFor(segment)
    const crowded = windowProgress(progress, window.start, window.end)
    visible = Math.max(visible, arrived * (1 - crowded))
  }
  return 1 - visible
}

// How long a raised alert takes to appear or clear, in progress units. Short
// — it's an interruption, and one that eases in slowly reads as decorative.
const ALERT_FADE = 0.006

export function chatAlertAt(progress, channel) {
  let value = 0
  for (const alert of CHAT_TIMELINE.alerts) {
    if (alert.channel !== channel) continue
    const shown = windowProgress(progress, alert.start, alert.start + ALERT_FADE)
    const hidden = windowProgress(progress, alert.end, alert.end + ALERT_FADE)
    value = Math.max(value, shown * (1 - hidden))
  }
  return value
}
