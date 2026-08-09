export function formatAsrConnectionError({ code, message }) {
  if (code === 4002) return "腾讯云鉴权失败（4002）：请检查 AppID、SecretID 和 SecretKey";
  if (code === 4003) return "腾讯云语音识别服务未开通（4003）";
  if (code === 4004) return "腾讯云额度已耗尽（4004）：请购买资源包或开启后付费后再测试";
  return `腾讯云连接失败${code ? `（${code}）` : ""}${message ? `：${message}` : ""}`;
}
