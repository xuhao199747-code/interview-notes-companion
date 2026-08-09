export function toRendererConfig(config) {
  const { tencentSecretId, tencentSecretKey, doubaoAccessToken, aiApiKey, ...safeConfig } = config;
  return {
    ...safeConfig,
    tencentSecretId: tencentSecretId ? "已保存" : "未配置",
    tencentSecretKey: tencentSecretKey ? "已保存" : "未配置",
    doubaoAccessToken: doubaoAccessToken ? "已保存" : "未配置",
    aiApiKey: aiApiKey ? "已保存" : "未配置"
  };
}
