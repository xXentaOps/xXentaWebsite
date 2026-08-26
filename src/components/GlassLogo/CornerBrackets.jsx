// A pair of L-shaped corner marks (top-left + bottom-right), the same blue
// (#3B82F6) and "targeting frame" language as the grid's own button corners
// (see BUTTON_STYLE in BackgroundGrid.jsx) — a plain DOM/CSS version of that
// idea rather than a reuse of the shader itself: that machinery is built
// specifically around the background grid's own cell phase/UV coordinates,
// which these carousel tiles (ordinary photos, not grid-aligned squares)
// have no relationship to.
export function CornerBrackets({ size = 22, thickness = 2, overhang = 0 }) {
  // borderWidth/borderColor are CSS shorthand — they set all four sides at
  // once, and an inline style always wins over a class regardless of that
  // class's own specificity. So the border-l/border-t classes below were
  // never actually deciding which two sides got a border at all: the
  // shorthand from this object was already putting one on all four, turning
  // each mark into a small filled-looking square instead of an L. Only the
  // *width* needs to be per-side (borderTopWidth/borderLeftWidth, and the
  // mirror pair below) to keep the other two sides at their default 0;
  // colour can stay a shorthand, since a colour on a zero-width side is
  // invisible regardless.
  const boxStyle = { width: size, height: size, borderColor: '#3B82F6' }
  // 0 by default — TeamCarousel's own marks sit exactly flush against its
  // (overflow-hidden) photo tiles, unchanged. A positive value pushes each
  // mark out past its corner instead, "crop mark" style, for a caller that
  // asked for it directly. Whatever renders this has to not be clipping —
  // an ancestor's own overflow-hidden (About Us's photo window included)
  // will cut the overhanging part off exactly like it would any other
  // element poking out past its edge.
  return (
    <>
      <span
        className="pointer-events-none absolute border-t border-l"
        style={{ ...boxStyle, borderTopWidth: thickness, borderLeftWidth: thickness, left: -overhang, top: -overhang }}
      />
      <span
        className="pointer-events-none absolute border-b border-r"
        style={{
          ...boxStyle,
          borderBottomWidth: thickness,
          borderRightWidth: thickness,
          right: -overhang,
          bottom: -overhang,
        }}
      />
    </>
  )
}

export default CornerBrackets
