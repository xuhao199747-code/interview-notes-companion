export function toRendererConfig(config) {
  const { tencentSecretId, tencentSecretKey, doubaoAccessToken, aiApiKey, localVoiceprintEmbedding, ...safeConfig } = config;
  return {
    ...safeConfig,
    ...(Array.isArray(localVoiceprintEmbedding) ? { localVoiceprintReady: localVoiceprintEmbedding.length > 0 } : {}),
    tencentSecretId: tencentSecretId ? "已保存" : "未配置",
    tencentSecretKey: tencentSecretKey ? "已保存" : "未配置",
    doubaoAccessToken: doubaoAccessToken ? "已保存" : "未配置",
    aiApiKey: aiApiKey ? "已保存" : "未配置"
  };
}
