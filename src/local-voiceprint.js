const SELF_THRESHOLD = 0.88;

export function normalizeEmbedding(vector) {
  if (!Array.isArray(vector) || !vector.length) return [];
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + Number(value || 0) ** 2, 0));
  if (!Number.isFinite(magnitude) || magnitude === 0) return [];
  return vector.map((value) => Number(value || 0) / magnitude);
}

export function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || !left.length || left.length !== right.length) return Number.NaN;
  const leftNormalized = normalizeEmbedding(left);
  const rightNormalized = normalizeEmbedding(right);
  if (!leftNormalized.length || !rightNormalized.length) return Number.NaN;
  return leftNormalized.reduce((sum, value, index) => sum + value * rightNormalized[index], 0);
}

export function averageEmbeddings(embeddings) {
  const valid = (Array.isArray(embeddings) ? embeddings : []).filter((embedding) => Array.isArray(embedding) && embedding.length);
  if (!valid.length || valid.some((embedding) => embedding.length !== valid[0].length)) return [];
  const sums = Array(valid[0].length).fill(0);
  for (const embedding of valid) embedding.forEach((value, index) => { sums[index] += Number(value || 0); });
  return normalizeEmbedding(sums);
}

export function decideLocalVoiceprint({ score } = {}) {
  if (!Number.isFinite(score)) return { decision: "unknown", score: null };
  const roundedScore = Math.round(score * 1000) / 1000;
  return { decision: score >= SELF_THRESHOLD ? "self" : "other", score: roundedScore };
}

export { SELF_THRESHOLD };
