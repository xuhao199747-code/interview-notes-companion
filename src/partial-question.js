export function shouldRefreshPartialQuestion(previousText = "", nextText = "") {
  return previousText.trim() !== nextText.trim();
}
