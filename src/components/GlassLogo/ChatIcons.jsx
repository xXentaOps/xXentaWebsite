// Icons and image plates for the chat showcase, kept together so the places
// that still need real artwork are all in one file rather than scattered
// through the layout.

// The one icon that exists today, transcribed from the supplied SVG rather
// than referenced as a file: currentColor instead of the baked #CAD5E2, so
// the layout decides its colour the same way it does for text, and no
// width/height attributes so the caller sizes it. Everything else — the
// 20-unit viewBox, the 1.66667 stroke, the round caps/joins — is exactly as
// drawn.
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
      style={{ width: size, height: size }}
      className={`${shared} object-cover ${className ?? ''}`}
    />
  )
}
