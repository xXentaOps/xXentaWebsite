import { useCallback, useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { SLIDES } from './aboutUsSlides'

// Placeholder figures — invented for layout, to be replaced with the real
// numbers later. Kept in the shape the counter actually animates (a plain
// target number, plus how to render it) rather than as pre-formatted
// strings, since the whole point is that the number itself grows.
//
// `decimals` is carried per stat rather than inferred from the value: 99.8
// must keep its tenth all the way up from 0, and 40 must never show one, and
// a counter mid-flight has no way to tell those apart from the target alone.
const STATS = [
  { value: 350, decimals: 0, suffix: '+', label: 'Daily active users' },
  { value: 99.8, decimals: 1, suffix: '%', label: 'Platform uptime' },
  { value: 40, decimals: 0, suffix: '+', label: 'Languages covered' },
]

// The three stats' own figure/suffix sizes, in px — pulled out to a default
// rather than baked into the JSX, now that BIG_STAT below needs a different
// pair. Tailwind's arbitrary-value classes (text-[64px]) only work for sizes
// literally written in the source for its JIT scanner to find, which a
// per-stat value computed at runtime isn't — inline style is what actually
// lets this vary per stat.
const FIGURE_SIZE_PX = 64
const SUFFIX_SIZE_PX = 34

// Slide 2 (De Rooi Pannen) gets one wide figure spanning all three squares
// instead of three separate ones — asked for directly: €74,000+ Avg. Contractor
// Savings.
const BIG_STAT = {
  value: 74000,
  decimals: 0,
  prefix: '€',
  suffix: '+',
  label: 'Avg. Contractor Savings',
  figureSize: 104,
  suffixSize: 54,
}

// Which slides get the single wide figure instead of the usual three — a
// Set of slide indices rather than a per-slide boolean baked into
// aboutUsSlides.js, since this is purely about how the stats *block*
// renders, nothing the slide data itself needs to know about.
const SINGLE_STAT_SLIDES = new Set([1])

// Long enough to read as a deliberate count rather than a flicker, and
// deliberately longer than the reveal's own slide so the numbers are still
// climbing once About Us has settled — the growth is the thing being shown,
// so it shouldn't already be over by the time the page arrives.
const COUNT_DURATION = 2.2
// Staggered so the three don't move as one block — a small offset each,
// enough to read as three separate figures landing in sequence.
const COUNT_STAGGER = 0.12
// Decelerating, not eased both ends: a count that starts at full speed and
// slows into its final value reads as a total settling, where a slow start
// reads as hesitation before the number does anything.
const COUNT_EASE = [0.16, 1, 0.3, 1]

// How far into the About Us reveal the counters start, as that reveal's own
// 0->1 progress. Not 1 (waiting for it to fully land, which is what this did
// first): a critically-damped spring spends its last stretch barely moving,
// so by the time it reaches exactly 1 the panel has *looked* settled for a
// good while, and starting there read as a pause before anything happened.
// Not 0 either — firing as the slide begins meant the count was ~73% done,
// and past all of its blur and rise, before a visitor scrolling up from the
// hero could see it at all. Partway through, so the figures are already
// climbing as the panel comes to rest and there's no dead beat either side.
const PLAY_AT_PROGRESS = 0.4

// The Google Cloud Partner plaque's own blue (its specularColor, and the
// same #3B82F6 the corner brackets and slide arrows use) — this block
// replaced that plaque in the copy column and was asked to carry its look
// over: the same blue, at the same kind of transparency its glass had.
const STAT_BLUE = '#3B82F6'

// A real filter: blur() on the figures themselves — not a glow behind
// already-sharp digits — sharpening to 0 exactly as the count lands. Strong
// enough that the number is genuinely unreadable at the start of its climb,
// which is what makes the digits' own churn read as motion rather than as a
// flicker of legible values.
const START_BLUR_PX = 12
// How far below its resting position each stat begins, in px. Rises to 0
// over the same timeline, so the figure settles into place at the same
// instant it stops counting and finishes sharpening. Up from 34 — asked for
// a more noticeable climb, and travel is the only lever that reads as one
// (the duration is already shared with the count, which is settled).
const START_Y_PX = 80

// The revisit fade — asked for directly, "when all the slides have been
// seen [i.e. once a stat has already played its one arrival this session],
// a simpler, elegant fade in" for every view after the first. Short and
// plain on purpose: the blur/rise/count above is the one real arrival each
// stat gets, and this is only ever standing in for an instant, jarring
// pop-into-place on a slide you're just looking back at, not competing with
// it as a second arrival.
const REVISIT_FADE_DURATION = 0.5

function Stat({
  value,
  decimals,
  prefix,
  suffix,
  label,
  figureSize = FIGURE_SIZE_PX,
  suffixSize = SUFFIX_SIZE_PX,
  delay,
  isPlaying,
  hasPlayed,
  onPlayed,
}) {
  const isNumeric = typeof value === 'number'
  const count = useMotionValue(0)
  // Formatted here rather than in the JSX so the growing number never passes
  // through React state — the motion value is handed straight to the span as
  // a child and framer writes it to the DOM itself, so a two-second count
  // costs no re-renders at all.
  const text = useTransform(count, (v) => {
    if (!isNumeric) return value
    if (decimals > 0) {
      const fixed = v.toFixed(decimals)
      const [intPart, decPart] = fixed.split('.')
      return `${Number(intPart).toLocaleString('en-US')}.${decPart}`
    }
    return Math.round(v).toLocaleString('en-US')
  })
  // The arrival's own 0->1 progress, driven on exactly the same duration,
  // delay and easing as the count above. A separate value rather than
  // deriving blur/rise from `count` itself, because count's range is the
  // stat's own target (12.4, 99.8, 40) — normalising that back to 0..1 per
  // stat would give three different curves for what has to be one shared
  // motion, and would break outright on a stat whose target is 0.
  const arrival = useMotionValue(0)
  const filter = useTransform(arrival, (p) => `blur(${(1 - p) * START_BLUR_PX}px)`)
  const y = useTransform(arrival, (p) => (1 - p) * START_Y_PX)
  // The revisit fade — see REVISIT_FADE_DURATION's own comment. Starts at 1
  // (not 0): the very first render of a stat that's already played should
  // never flash invisible for a frame before this effect's animate() call
  // gets a chance to run; fading from 0 is something the effect below does
  // deliberately, not something the initial value needs to pre-empt.
  const opacity = useMotionValue(1)

  useEffect(() => {
    // hasPlayed is session-level (see AboutUsStats' own playedLabelsRef),
    // not this component instance's own state — this Stat itself gets torn
    // down and rebuilt every time its slide isn't the one showing (each
    // slide's stats are a different, differently-keyed set of children), so
    // a plain per-instance ref reset to false on every remount, which is
    // what this used first. That replayed the count on *every* visit to a
    // slide, not just the first one all session — asked to stop doing that
    // directly. Checking a value that lives above the remounts is what
    // actually remembers across them.
    if (hasPlayed) {
      // The count/blur/rise arrival only ever plays once — jump straight to
      // its resting state, never replay it. What *does* play again on every
      // repeat view is a plain opacity fade (see REVISIT_FADE_DURATION): a
      // soft appearance in place of an instant, jarring pop-into-place,
      // without restaging the whole arrival a second time.
      if (isNumeric) count.set(value)
      arrival.set(1)
      opacity.set(0)
      const fadeControls = animate(opacity, 1, { duration: REVISIT_FADE_DURATION, ease: 'easeOut' })
      return () => fadeControls.stop()
    }
    if (!isPlaying) {
      if (isNumeric) count.set(0)
      arrival.set(0)
      opacity.set(1)
      return
    }
    // Marked on actual *completion*, not the instant the animation starts —
    // that was tried first, on the reasoning that a visitor who navigates
    // away mid-count still "triggered" it once. It wasn't: navigating away
    // and back remounts this Stat (see hasPlayed's own comment on why), and
    // the premature mark meant that remount saw hasPlayed already true —
    // snapping straight to the resting value and playing the revisit fade
    // instead of ever letting the real arrival finish. Reported directly,
    // as the revisit fade cutting the original arrival off partway through.
    // onComplete only fires on a natural finish, never on the stop() calls
    // below (an interrupted animation calls its cleanup, not onComplete),
    // so a genuinely cut-off arrival is never marked and correctly plays in
    // full again next time instead of being replaced by the fade.
    opacity.set(1)
    const options = { duration: COUNT_DURATION, delay, ease: COUNT_EASE }
    const controls = isNumeric ? animate(count, value, options) : null
    // Same options object, so the blur/rise cannot drift out of step with
    // the digits they belong to — they are one arrival, not three
    // animations that happen to be configured alike. onComplete on just
    // this one (not also on controls) — they finish together, and marking
    // twice would be redundant, not wrong, but there's no reason to.
    const arrivalControls = animate(arrival, 1, { ...options, onComplete: () => onPlayed(label) })
    return () => {
      controls?.stop()
      arrivalControls.stop()
    }
    // onPlayed is a useCallback with an empty dep array in AboutUsStats
    // (stable for that component's whole lifetime) specifically so it can
    // sit in this array safely — an inline arrow recreated every render
    // would re-fire this effect (and restart the animation mid-flight) on
    // any unrelated parent re-render, not just a real state change.
  }, [hasPlayed, isPlaying, value, delay, count, arrival, opacity, label, onPlayed, isNumeric])

  return (
    // Each stat occupies exactly one grid square — the parent sizes the row
    // and this fills its share of it. justify-center rather than the
    // bottom-anchored justify-end/pb-4 this used first — asked for
    // directly, the figures were sitting too close to the square's own
    // bottom edge rather than reading as centred in it. The three still
    // share one baseline: every stat is the same fixed content in the same
    // fixed-height square, so centring lands all three on the same line
    // exactly as the old bottom-anchoring did, just at the square's middle
    // instead of its floor.
    //
    // The rise and the blur ride on this whole block, figure and label
    // together, rather than on the digits alone: a number flying up out of a
    // caption that stayed put would read as two unrelated things happening
    // in the same square. y is a transform (composited, no layout cost per
    // frame) and never touches the flex sizing above, so nothing about where
    // the square sits or how tall it is moves while this plays.
    <motion.div
      style={{ y, filter, opacity }}
      className="flex flex-1 flex-col items-center justify-center"
    >
      <div className="flex items-baseline" style={{ color: STAT_BLUE, opacity: 0.75 }}>
        {/* Same size/weight as the digits — a currency mark isn't a unit
            competing for attention the way suffix is, it's part of reading
            the number itself, so it gets no separate, quieter treatment.
            figureSize/suffixSize are inline style, not Tailwind classes —
            see FIGURE_SIZE_PX's own comment for why a per-stat runtime
            value can't be a text-[Npx] class. */}
        {prefix && (
          <span style={{ fontSize: figureSize }} className="leading-none font-medium tracking-tight">
            {prefix}
          </span>
        )}
        {/* font-medium (500) — up from a font-light 42px originally, asked
            for directly. 500 is the heaviest weight actually loaded (see
            the @fontsource imports in index.css, which stop at 500);
            anything bolder in a class here would silently render as this
            same cut rather than as the weight it names. */}
        <motion.span style={{ fontSize: figureSize }} className="leading-none font-medium tracking-tight">
          {text}
        </motion.span>
        {/* Smaller and set apart from the digits — the unit belongs to the
            number but shouldn't compete with it for the same size. Scaled
            up in step with the figure so the pairing stays as it was. */}
        {suffix && (
          <span style={{ fontSize: suffixSize }} className="ml-1 leading-none font-medium">
            {suffix}
          </span>
        )}
      </div>
      {/* Same uppercase/tracked treatment every other small label on this
          page uses (see SiteNavbar's links, the footer's column headings),
          at a lower opacity than the figure so the two read as caption and
          headline rather than two competing lines.
          text-center as well as the parent's items-center: centring the
          block only puts the paragraph's *box* in the middle of the square,
          and a label long enough to wrap (these are capped at 85% of the
          square) would still set its own two lines flush left inside it. */}
      <p
        className="mt-3 max-w-[85%] text-center text-[10px] leading-[1.5] font-extralight tracking-[0.15em] uppercase"
        style={{ color: STAT_BLUE, opacity: 0.45 }}
      >
        {label}
      </p>
    </motion.div>
  )
}

// Animated figures sitting on three whole grid squares in the copy column,
// level with the row the photo starts on — positioned imperatively by
// AboutUsIntro's own layout pass (see statsRef there), the same "placed
// against the grid, never measured" treatment the photo block gets. Usually
// three separate ones, one per square; SINGLE_STAT_SLIDES swaps that for one
// wide figure spanning all three (see BIG_STAT's own comment).
export function AboutUsStats({ aboutUsProgress, slideIndex }) {
  // Driven by how far the reveal has actually travelled, not by isOpen
  // (which is what this used first — it flips true the instant the slide
  // starts, a full 1.6s before the panel is in place). See
  // PLAY_AT_PROGRESS for why the trigger sits partway along rather than at
  // either end.
  //
  // Keyed off the shared progress value rather than a hand-set delay: a
  // fixed number of milliseconds would have to be re-derived by hand if
  // ABOUT_US_OPEN_TRANSITION is ever retuned, and corresponds to nothing at
  // all when the reveal is driven by the visitor's own scroll instead (see
  // driveCloseWithScroll in GlassLogoPreview). Progress is the same
  // authority every other part of this reveal already answers to.
  //
  // Reset at exactly 0, not on dropping back below the play threshold: the
  // close sweeps back through that threshold on its way out, and resetting
  // there would blank the figures to 0 while they're still on screen
  // leaving. 0 is the one point where nothing is visible to spoil.
  const [playing, setPlaying] = useState(false)
  useEffect(
    () =>
      aboutUsProgress.on('change', (p) => {
        if (p >= PLAY_AT_PROGRESS) setPlaying(true)
        else if (p === 0) setPlaying(false)
      }),
    [aboutUsProgress],
  )

  // Which stats (by label) have already run their count once this session —
  // asked for directly: switching slides back and forth should only trigger
  // each one's animation the first time, then just show the resting value
  // for the rest of the session. Lives here, not inside Stat itself, because
  // Stat instances don't survive a slide change: each slide's stats are a
  // differently-keyed set of children (see the stats.map below), so a given
  // label's Stat is genuinely unmounted and rebuilt every time its slide
  // isn't the one showing. This component, in contrast, is mounted once for
  // AboutUsIntro's whole lifetime (About Us fades rather than unmounting —
  // see its own opacity-only isOpen handling), so a ref here survives every
  // slide change and every close/reopen, only ever resetting on an actual
  // page reload — exactly "until refreshed".
  const playedLabelsRef = useRef(new Set())
  // Empty deps deliberately — see Stat's own comment on why this has to
  // stay the same function across renders rather than being an inline
  // arrow written fresh in the JSX below.
  const onStatPlayed = useCallback((label) => {
    playedLabelsRef.current.add(label)
  }, [])

  const slide = SLIDES[slideIndex]
  if (slide?.hasStats === false || slideIndex === 2) {
    return null
  }

  // The single wide figure is still just a Stat with flex-1 (see its own
  // JSX) rendered as the *only* child of this flex row — flex-1 on one
  // child alone already fills the whole row, so the single-stat case needs
  // no width override of its own, only a different array to map over.
  const stats = SINGLE_STAT_SLIDES.has(slideIndex) ? [BIG_STAT] : STATS

  return (
    <div className="pointer-events-none flex h-full w-full">
      {stats.map((stat, index) => (
        <Stat
          key={stat.label}
          {...stat}
          delay={index * COUNT_STAGGER}
          isPlaying={playing}
          hasPlayed={playedLabelsRef.current.has(stat.label)}
          onPlayed={onStatPlayed}
        />
      ))}
    </div>
  )
}

export default AboutUsStats
