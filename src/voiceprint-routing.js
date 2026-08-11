export function shouldCommitVoiceprintResult({ gate = "hold", final = false } = {}) {
  return gate === "allow" && Boolean(final);
}

export function shouldScheduleVoiceprintPartial({ gate = "hold", final = false } = {}) {
  return gate === "allow" && !final;
}
