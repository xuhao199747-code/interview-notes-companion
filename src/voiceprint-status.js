export function formatVoiceprintError(message = "") {
  if (/User no free amount|VoiceprintVerify/i.test(message)) return "腾讯云声纹验证没有可用额度：请开通或购买声纹验证额度后，再重新验证。";
  if (/timeout|timed out|aborted/i.test(message)) return "腾讯云声纹验证超过 15 秒没有响应，请检查网络后重试。";
  return message || "声纹操作失败，请检查网络和腾讯云声纹服务。";
}
