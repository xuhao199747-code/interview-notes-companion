export const defaultDoubaoEndpoint = "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async";

export function validateDoubaoConfig(config = {}) {
  if (!config.doubaoAppId?.trim() || !config.doubaoAccessToken?.trim() || !config.doubaoResourceId?.trim()) {
    return { valid: false, message: "请填写豆包 App ID、Access Token 和资源 ID" };
  }
  return { valid: true, message: "配置格式正确" };
}

export function toPublicDoubaoConfig(config = {}) {
  return {
    doubaoAppId: config.doubaoAppId || "",
    doubaoAccessToken: config.doubaoAccessToken ? "已保存" : "未配置",
    doubaoResourceId: config.doubaoResourceId || "",
    doubaoEndpoint: config.doubaoEndpoint || defaultDoubaoEndpoint
  };
}
