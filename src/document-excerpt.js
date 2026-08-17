export function extractOriginalAnswer(content = "") {
  const original = String(content).trim();
  const answerMarker = /(?:^|\n)\s*(?:\*\*)?(?:回答方式|回答)\s*[：:](?:\*\*)?\s*/u;
  const marker = answerMarker.exec(original);
  return (marker ? original.slice(marker.index + marker[0].length) : original).trim();
}
