export function getEditionStorageName(edition) {
  return `interview-notes-companion-${edition === "local" ? "local" : "release"}`;
}
