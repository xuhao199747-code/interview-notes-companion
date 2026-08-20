export function secretKeyPlaceholder(status) {
  return status === "已保存" ? "********（已保存，不显示原文）" : "只在本地填写，不会回显";
}

export function llmConfigChangedMessage() {
  return "配置已修改，点击“保存 LLM 配置”后再测试连接";
}
