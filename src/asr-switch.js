export function shouldRestartAsrAfterSave(isListening, previousProvider, nextProvider) {
  return Boolean(isListening && previousProvider !== nextProvider);
}
