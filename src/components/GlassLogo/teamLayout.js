// Layout for the About Us team section, in CSS pixels.
//
// Everything here is in pixels rather than world units on purpose. The glass
// info panel exists twice — once as real geometry inside the Canvas (so it
// genuinely refracts the photo behind it) and once as a plain DOM block
// holding its text (so the type stays crisp browser-rendered text rather
// than something sampled through a transmission shader). Those two have to
// land on exactly the same rectangle, and the only unit both can be derived
// from without one of them guessing is screen pixels — the DOM uses PANEL's
// numbers directly, the mesh converts them with the viewport's own
// world-units-per-pixel at its own depth (see GlassInfoPanel/TeamScene).
export const PANEL = {
  width: 420,
  height: 340,
  // Distance from the bottom-right corner of the *screen*, not the photo —
  // this sits mostly over the grid backdrop by design, only partially
  // covering the picture, and reads as a fixed glass object resting on the
  // page rather than a frame built around the photo.
  margin: 40,
  cornerRadius: 14,
  // World units, not pixels — this one is a thickness, and what it controls
  // is how far light bends crossing the slab. Tying it to screen size would
  // change the strength of the refraction every time the window resized.
  // Small on purpose: the brief was "barely any visible depth, a hint of a
  // border" — this is close to the thinnest value that still holds a real
  // bevel (see buildPanelGeometry's own bevel clamp), rather than degenerating
  // into a flat, unlit card. GlassInfoPanel's material uses a separate,
  // larger "optical" thickness for the refraction math itself (see
  // PANEL_OPTICAL_THICKNESS there) — that's what makes the glass visibly
  // blur what it's refracting without the slab itself looking any thicker.
  depth: 0.045,
  // In front of the photo plane (z 0) and well clear of it even at full
  // tilt: the photo is a wide plane, so a few degrees of lean swings its far
  // edge a meaningful distance in z, and the two must never intersect.
  z: 1.6,
}

// Space the photo is fitted into — the section minus the title above it and
// a margin on the other three sides. The photo is then the largest box of
// its own aspect ratio that fits, centered in what's left.
export const PHOTO = {
  topInset: 150,
  bottomInset: 56,
  sideInset: 56,
  // Past roughly this width the photo stops reading as a print on the page
  // and starts reading as a background image.
  maxWidth: 1240,
}

// A 2600px-wide, 0.72MB re-encode of the 4940x3772 original (kept at
// public/team-photo.jpg as the source of truth, referenced by nothing). The
// original is 11.9MB and measured 17.6s to decode *from localhost*, which
// would leave this section empty well past the point a visitor gives up on
// it, and none of that detail is reachable anyway — the photo is capped at
// PHOTO.maxWidth on screen, so 2600px still leaves headroom for a 2x display.
export const TEAM_PHOTO_SRC = '/team-photo-web.jpg'
export const TEAM_PHOTO_ASPECT = 4940 / 3772

// Largest box of the photo's own aspect ratio that fits inside a
// viewportWidth x viewportHeight stage (minus PHOTO's own insets), centered
// in what's left over. TeamScene's own usePhotoBox feeds this real canvas
// pixel dimensions (via useThree) to size the photo plane.
export function computePhotoBox(viewportWidth, viewportHeight) {
  const availableWidth = viewportWidth - PHOTO.sideInset * 2
  const availableHeight = viewportHeight - PHOTO.topInset - PHOTO.bottomInset
  const width = Math.min(availableWidth, availableHeight * TEAM_PHOTO_ASPECT, PHOTO.maxWidth)
  const height = width / TEAM_PHOTO_ASPECT
  const left = (viewportWidth - width) / 2
  const top = PHOTO.topInset + (availableHeight - height) / 2
  return { left, top, width, height, right: left + width, bottom: top + height }
}

// The hover target over each member, as percentages of the photo. People get
// a tall column running from just above the head to the bottom of the frame,
// so hovering anywhere on a person works rather than their face alone; the
// dogs get a box, since they lie in front of everyone and don't reach the
// bottom edge.
export function hitRect(member) {
  if (member.isDog) return { cx: member.x, cy: member.y, w: 15, h: 26 }
  const top = Math.max(0, member.y - 8)
  return { cx: member.x, cy: (top + 100) / 2, w: 12, h: 100 - top }
}
