import { validateDoubaoConfig } from "./doubao-config.js";
import { DoubaoAsrSession } from "./doubao-asr.js";
import { TencentAsrSession } from "./tencent-asr.js";

export function validateAsrProviderConfig(config = {}) {
  if (config.asrProvider === "doubao") return validateDoubaoConfig(config);
  if (config.asrProvider === "tencent") {
    return config.tencentAppId?.trim() && config.tencentSecretId?.trim() && config.tencentSecretKey?.trim()
      ? { valid: true, message: "配置格式正确" }
      : { valid: false, message: "请先选择腾讯云 V2 并保存完整配置" };
  }
  return { valid: false, message: "浏览器语音识别不支持桌面音频转写" };
}

export function createAsrSession(config, onEvent) {
  return config.asrProvider === "doubao"
    ? new DoubaoAsrSession(config, onEvent)
    : new TencentAsrSession(config, onEvent);
}
