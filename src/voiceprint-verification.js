export function verificationSucceeded(result = {}) {
  return result.Data?.Decision === 1;
}
