// Keep the DOM presentation and the native Electron window mode derived from
// one source of truth. A request to expand without an answer must not grow an
// invisible native window that can intercept desktop clicks.
export function resolveAnswerOverlayPresentation({ expandedRequested, compactRequested, hasCurrentAnswer }) {
  const compact = Boolean(compactRequested);
  const expanded = !compact && Boolean(expandedRequested) && Boolean(hasCurrentAnswer);
  return {
    expanded,
    compact,
    nativeMode: compact ? "compact" : (expanded ? "expanded" : "collapsed"),
  };
}
