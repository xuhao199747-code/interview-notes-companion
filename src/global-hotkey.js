const modifierCodes = [
  ["metaKey", "Command"],
  ["ctrlKey", "Control"],
  ["altKey", "Alt"],
  ["shiftKey", "Shift"],
];

function keyFromCode(code = "", fallback = "") {
  const letter = code.match(/^Key([A-Z])$/u);
  if (letter) return letter[1];
  const digit = code.match(/^Digit([0-9])$/u);
  if (digit) return digit[1];
  const special = { Space: "Space", ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right" };
  if (special[code]) return special[code];
  return /^[A-Za-z0-9]$/u.test(fallback) ? fallback.toUpperCase() : "";
}

export function formatGlobalHotkey(event = {}) {
  const modifiers = modifierCodes.filter(([name]) => event[name]).map(([, label]) => label);
  const key = keyFromCode(event.code, event.key);
  return key ? [...modifiers, key].join("+") : "";
}

export function isSafeGlobalHotkey(value = "") {
  const parts = value.trim().split("+").filter(Boolean);
  if (parts.length < 2) return false;
  const key = parts.at(-1);
  const modifiers = new Set(["Command", "Control", "Alt", "Shift", "CommandOrControl"]);
  return /^[A-Za-z0-9]+$/u.test(key) && parts.slice(0, -1).every((part) => modifiers.has(part));
}
