function hasCloudConfig(config = {}) {
  if (config.asrProvider === "doubao" && config.doubaoAccessToken) return true;
  if (config.asrProvider === "tencent" && config.tencentSecretId && config.tencentSecretKey) return true;
  return Boolean(config.aiApiKey);
}

export function shouldMigrateLegacyConfig(current, legacy) {
  return !hasCloudConfig(current) && hasCloudConfig(legacy);
}
