// Shared "3D world" scene-depth and blob constants used everywhere the
// hero's own grid/blob backdrop gets continued into a second canvas (see
// useSeamlessGrid) — kept here as the single source of truth rather than
// duplicated by hand across Backdrop.jsx and each continuation section, the
// way BackgroundGlowSection's own copy used to be before AboutUsSection
// needed a second one too.
export const PLANE_Z = -6
export const GRID_Z = PLANE_Z + 1
// Taller than a plain viewport-height plane (was 12) — keeps the blob's
// width:height ratio closer to a proper oval instead of a wide flat bar once
// the plane is stretched out to reach the screen edges.
export const PLANE_SIZE = 15
// GradientBlob's own falloff (see its "edge" constant) fades fully to
// background at ~65% of the way from center to the plane's own edge, by
// design — that gap is what makes it read as a soft blob instead of a hard-
// edged rectangle. Overscaling the plane past the viewport width pushes that
// already-part-of-the-design gap outside the visible screen instead, so the
// *visible* glow is what reaches edge to edge.
export const BLOB_WIDTH_OVERSCALE = 1.9
// Fraction of blobHeight below the hero's own local Y=0 the blob sits at —
// mostly below the hero's own visible bottom edge, which is exactly why only
// its upper portion shows there.
export const BLOB_Y_FRACTION = 0.6

// The page's own resting backdrop, and what it becomes while the chat
// showcase is inside a segment with a mood attached (see chatMoodAt) — the
// screen tinting and the glow above it shifting colour along with it. Two
// moods exist today: the unconscious patient (near-black, grey glow) and
// Carla, once pulled aside and angry (near-black red, red glow).
//
// Each _LIT/_DIM/_ANGRY pair is deliberately the same colour as its opposite
// number: GradientBlob's own shader fades its glow out *to* uColorEdge, so
// any difference between that and the scene's flat background would draw a
// visible rectangle around the blob's plane. Kept here as pairs rather than
// hex codes repeated in two files that have to agree.
export const SCENE_BACKDROP = '#0F172B'
export const SCENE_BACKDROP_DIM = '#05070D'
export const SCENE_BACKDROP_ANGRY = '#1A0F0F'
export const BLOB_CENTER = '#3B82F6'
// Grey, given exactly. Red started at the same exact-hex treatment (#B91C1C)
// but read as too intense once actually glowing on screen — brought down a
// shade, to a deeper, less saturated red, rather than reducing its blend
// weight against the lit colour, which would have just made the whole
// transition weaker rather than making the red itself calmer.
export const BLOB_CENTER_DIM = '#475569'
export const BLOB_CENTER_ANGRY = '#991B1B'
// A third mood, not tied to a character's own state this time — DRP
// Showcase's own backdrop, a soft light taupe, exact hex asked for directly
// (a distinct shade from the lit squares' own SQUARE_DRP, in
// BackgroundGlowSection). "A little less strong" (tried as a step lighter
// first, which turned out to be the wrong direction — "still too bright"
// afterward) meant less bright, not more: darker than the original hex, not
// past it — then nudged back up just slightly, asked for directly ("juuuustt
// a little bit").
export const SCENE_BACKDROP_DRP = '#AEA6A3'
// Brighter, desaturated grid backdrop once DRP_2 and AI Impact Analysis panel are revealed
export const SCENE_BACKDROP_DRP_BRIGHT = '#D8D8D8'
// The glow's own centre — set to match SCENE_BACKDROP_DRP for uniform field
export const BLOB_CENTER_DRP = SCENE_BACKDROP_DRP
export const BLOB_CENTER_DRP_BRIGHT = SCENE_BACKDROP_DRP_BRIGHT
