export function shouldCommitVoiceprintResult({ gate = "hold", final = false } = {}) {
  return gate === "allow" && Boolean(final);
}
