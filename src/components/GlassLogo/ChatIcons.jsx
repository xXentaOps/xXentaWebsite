// Icons and image plates for the chat showcase, kept together so the places
// that still need real artwork are all in one file rather than scattered
// through the layout.

// Transcribed from the supplied SVGs rather than referenced as files, with
// two deliberate changes each: currentColor instead of the baked hex, so the
// layout decides colour the same way it does for text, and no width/height
// attributes, so the caller decides size. Everything else — viewBoxes,
// stroke weights, round caps and joins — is exactly as drawn.

export function MicrophoneIcon({ className, style }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className={className} style={style}>
      <path
        d="M10 1.66663C9.33696 1.66663 8.70107 1.93002 8.23223 2.39886C7.76339 2.8677 7.5 3.50358 7.5 4.16663V9.99996C7.5 10.663 7.76339 11.2989 8.23223 11.7677C8.70107 12.2366 9.33696 12.5 10 12.5C10.663 12.5 11.2989 12.2366 11.7678 11.7677C12.2366 11.2989 12.5 10.663 12.5 9.99996V4.16663C12.5 3.50358 12.2366 2.8677 11.7678 2.39886C11.2989 1.93002 10.663 1.66663 10 1.66663Z"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.8334 8.33337V10C15.8334 11.5471 15.2188 13.0309 14.1249 14.1248C13.0309 15.2188 11.5472 15.8334 10.0001 15.8334C8.45299 15.8334 6.96925 15.2188 5.87529 14.1248C4.78133 13.0309 4.16675 11.5471 4.16675 10V8.33337"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 15.8334V18.3334" stroke="currentColor" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// The room's own mark — the pulse trace from inside the Trauma Bay pill.
//
// The viewBox is the odd part and it's on purpose: the path was drawn at its
// real position inside a 140x49 artboard, and its clip rect there is a 16x16
// box at (17.6666, 15.5176). Re-origining the path would mean rewriting
// thirty-odd coordinates by hand, which is thirty-odd chances to introduce a
// wrong digit that nothing would catch; a viewBox with a non-zero min-x/min-y
// crops to exactly that same box with the path left untouched.
export function RoomPulseIcon({ className, style }) {
  return (
    <svg viewBox="17.6666 15.5176 16 16" fill="none" aria-hidden className={className} style={style}>
      <path
        d="M32.3333 23.5176H30.68C30.3886 23.517 30.1051 23.6118 29.8727 23.7876C29.6404 23.9634 29.472 24.2104 29.3933 24.491L27.8267 30.0643C27.8166 30.0989 27.7955 30.1293 27.7667 30.151C27.7378 30.1726 27.7027 30.1843 27.6667 30.1843C27.6306 30.1843 27.5955 30.1726 27.5667 30.151C27.5378 30.1293 27.5168 30.0989 27.5067 30.0643L23.8267 16.971C23.8166 16.9363 23.7955 16.9059 23.7667 16.8843C23.7378 16.8626 23.7027 16.851 23.6667 16.851C23.6306 16.851 23.5955 16.8626 23.5667 16.8843C23.5378 16.9059 23.5168 16.9363 23.5067 16.971L21.94 22.5443C21.8616 22.8237 21.6943 23.07 21.4632 23.2456C21.2322 23.4213 20.9502 23.5168 20.66 23.5176H19"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// The private channel's lock. Not from a supplied file — drawn here to the
// same construction as the microphone above (20-unit box, 1.66667 stroke,
// round caps and joins) so it reads as one family rather than an icon
// borrowed from somewhere else.
export function LockIcon({ className, style }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className={className} style={style}>
      <rect
        x="3.75"
        y="8.75"
        width="12.5"
        height="8.33333"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.66675 8.75V5.83333C6.66675 4.94928 7.01794 4.10143 7.64306 3.47631C8.26818 2.85119 9.11603 2.5 10.0001 2.5C10.8841 2.5 11.732 2.85119 12.3571 3.47631C12.9822 4.10143 13.3334 4.94928 13.3334 5.83333V8.75"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// The red dot from the top-right of the supplied selection pill: a 10px core
// in #FB2C36 inside a 17px halo of #FF6467 at 22%, both exactly as drawn.
//
// Nothing in the brief said what raises it, so it's wired to the one thing on
// screen that genuinely needs to interrupt the visitor: a channel calling for
// attention while they're reading a different one (see `alerts`/`clears` in
// chatShowcaseScript.js). Delete the <AlertDot> from the header entry to drop
// the idea entirely — nothing else depends on it.
export function AlertDot({ className, style }) {
  return (
    <span aria-hidden className={className} style={style}>
      <span className="absolute inset-0 rounded-full bg-[#FF6467] opacity-[0.222354]" />
      <span className="absolute inset-[3.5px] rounded-full bg-[#FB2C36]" />
    </span>
  )
}

// A 20x20 slot for an icon that hasn't been drawn yet. Paste an <svg> in as
// this component's child and the placeholder plate disappears on its own —
// nothing else needs changing:
//
//   <IconSlot>
//     <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">…</svg>
//   </IconSlot>
//
// Sized and coloured to sit at the same visual weight the real icon will, so
// the layout it's holding a spot in doesn't shift when one arrives.
export function IconSlot({ children, className }) {
  if (children) return <span className={className}>{children}</span>
  return (
    <span
      aria-hidden
      className={`block h-5 w-5 rounded-[6px] border border-dashed border-[#314158] opacity-60 ${className ?? ''}`}
    />
  )
}

// A round avatar plate. `src` is a path into /public — the same convention
// the team photos use (see MeetTheTeamGrid's `/team/${id}.jpg`) — so dropping
// a .webp in there and naming it in chatShowcaseScript.js is the whole job.
// With no src it renders the empty plate instead, which is what every speaker
// does today.
export function ChatAvatar({ src, alt, size = 34, className }) {
  const shared = 'shrink-0 rounded-full border border-[#314158]/50 bg-[#1D293D]/60'
  if (!src) {
    return <span aria-hidden style={{ width: size, height: size }} className={`${shared} ${className ?? ''}`} />
  }
  return (
    <img
      src={src}
      alt={alt ?? ''}
      width={size}
      height={size}
      // Brought back up from 30% opacity — that read as too faint against
      // the header's own muted material once actually seen live.
      style={{ width: size, height: size, opacity: 0.55 }}
      className={`${shared} object-cover ${className ?? ''}`}
    />
  )
}
