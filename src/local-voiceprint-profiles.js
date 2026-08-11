const slots = ["voice-1", "voice-2"];

function emptyProfile(id, index) {
  return { id, name: `声纹 ${index + 1}`, embedding: [], verified: false };
}

export function createVoiceprintProfiles(config = {}) {
  const saved = Array.isArray(config.localVoiceprintProfiles) ? config.localVoiceprintProfiles : [];
  return slots.map((id, index) => {
    const profile = saved.find((item) => item?.id === id);
    if (profile) return { ...emptyProfile(id, index), ...profile, embedding: Array.isArray(profile.embedding) ? profile.embedding : [] };
    if (index === 0 && Array.isArray(config.localVoiceprintEmbedding) && config.localVoiceprintEmbedding.length) {
      return { ...emptyProfile(id, index), embedding: config.localVoiceprintEmbedding, verified: Boolean(config.localVoiceprintVerified) };
    }
    return emptyProfile(id, index);
  });
}

export function selectVoiceprintProfile(profiles, id) {
  const profile = (Array.isArray(profiles) ? profiles : []).find((item) => item?.id === id);
  return profile?.verified && profile.embedding?.length ? profile : null;
}
