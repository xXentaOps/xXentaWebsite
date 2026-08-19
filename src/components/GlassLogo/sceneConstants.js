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
