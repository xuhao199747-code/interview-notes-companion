const actions = {
  configure: { id: "configure", label: "去配置腾讯云密钥" },
  enroll: { id: "enroll", label: "录入 6 秒本人声音" },
  verify: { id: "verify", label: "验证声纹（重新录 4 秒）" },
};

export function getVoiceprintGuide({ voicePrintConfigured, voicePrintId, voicePrintVerified }) {
  const step = !voicePrintConfigured ? "configure" : !voicePrintId ? "enroll" : !voicePrintVerified ? "verify" : "enabled";
  return {
    step,
    primaryAction: actions[step] || null,
    cards: [
      { title: "腾讯云密钥", label: voicePrintConfigured ? "已保存到本机" : "未配置", complete: Boolean(voicePrintConfigured) },
      { title: "声纹档案", label: voicePrintId ? "已录入" : "尚未录入", complete: Boolean(voicePrintId) },
      { title: "声纹过滤", label: voicePrintVerified ? "已启用" : "等待验证", complete: Boolean(voicePrintVerified) },
    ],
  };
}
