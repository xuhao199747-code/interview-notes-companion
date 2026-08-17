function isFiniteRect(rect) {
  return rect && [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) && rect.width > 0 && rect.height > 0;
}

export function shouldIgnoreOverlayMouse({ mode, windowBounds, interactiveRegions = [], cursor }) {
  if (mode !== "collapsed" || !isFiniteRect(windowBounds) || !cursor || !Number.isFinite(cursor.x) || !Number.isFinite(cursor.y)) return false;
  const regions = interactiveRegions.filter(isFiniteRect);
  if (!regions.length) return false;
  const localX = cursor.x - windowBounds.x;
  const localY = cursor.y - windowBounds.y;
  return !regions.some((region) => (
    localX >= region.x
    && localX <= region.x + region.width
    && localY >= region.y
    && localY <= region.y + region.height
  ));
}
