export function cosineSimilarity(left = [], right = []) {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / Math.sqrt(leftMagnitude * rightMagnitude);
}

export function rankSemanticCandidates(queryVector, candidates, threshold = 0.7) {
  return candidates
    .map((candidate) => ({ ...candidate, semanticScore: cosineSimilarity(queryVector, candidate.vector) }))
    .filter((candidate) => candidate.semanticScore >= threshold)
    .sort((left, right) => right.semanticScore - left.semanticScore);
}
