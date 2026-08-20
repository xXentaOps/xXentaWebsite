// A pair of L-shaped corner marks (top-left + bottom-right), the same blue
// (#3B82F6) and "targeting frame" language as the grid's own button corners
// (see BUTTON_STYLE in BackgroundGrid.jsx) — a plain DOM/CSS version of that
// idea rather than a reuse of the shader itself: that machinery is built
// specifically around the background grid's own cell phase/UV coordinates,
// which these carousel tiles (ordinary photos, not grid-aligned squares)
// have no relationship to.
export function CornerBrackets({ size = 22, thickness = 2 }) {
  const armStyle = { width: size, height: size, borderColor: '#3B82F6', borderWidth: thickness }
  return (
    <>
      <span className="pointer-events-none absolute left-0 top-0 border-l border-t" style={armStyle} />
      <span className="pointer-events-none absolute bottom-0 right-0 border-b border-r" style={armStyle} />
    </>
  )
}

export default CornerBrackets
