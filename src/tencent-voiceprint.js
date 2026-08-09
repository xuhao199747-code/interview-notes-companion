import { createHash, createHmac } from "node:crypto";

const SERVICE = "asr";
const HOST = "asr.tencentcloudapi.com";
const VERSION = "2019-06-14";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value).digest();
}

function utcDate(timestamp) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

function authorization({ secretId, secretKey, action, payload, timestamp }) {
  const date = utcDate(timestamp);
  const payloadHash = sha256(payload);
  const canonicalRequest = `POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:${HOST}\n\ncontent-type;host\n${payloadHash}`;
  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${sha256(canonicalRequest)}`;
  const signingKey = hmac(hmac(hmac(`TC3${secretKey}`, date), SERVICE), "tc3_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  return `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=content-type;host, Signature=${signature}`;
}

export function validateVoiceprintConfig(config = {}) {
  return config.tencentSecretId?.trim() && config.tencentSecretKey?.trim()
    ? { valid: true, message: "声纹服务配置完整" }
    : { valid: false, message: "请先在语音识别设置中保存腾讯云 SecretId 和 SecretKey" };
}

export function voiceprintDecision(result = {}) {
  if (result.Data?.Decision === 1) return "self";
  if (result.Data?.Decision === 0) return "other";
  return "unknown";
}

function audioPayload({ pcm16 }) {
  if (!pcm16?.byteLength) throw new Error("没有可用于声纹验证的 PCM 音频");
  return {
    VoiceFormat: 0,
    SampleRate: 16000,
    Data: Buffer.from(pcm16).toString("base64"),
  };
}

export function createVoiceprintClient(config, fetchImpl = fetch) {
  const validation = validateVoiceprintConfig(config);
  async function request(action, input) {
    if (!validation.valid) throw new Error(validation.message);
    const payload = JSON.stringify(input.payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const response = await fetchImpl(`https://${HOST}`, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        host: HOST,
        "x-tc-action": action,
        "x-tc-version": VERSION,
        "x-tc-region": config.tencentRegion || "ap-guangzhou",
        "x-tc-timestamp": String(timestamp),
        authorization: authorization({ secretId: config.tencentSecretId, secretKey: config.tencentSecretKey, action, payload, timestamp }),
      },
      body: payload,
    });
    const data = await response.json();
    const error = data?.Response?.Error;
    if (!response.ok || error) throw new Error(error?.Message || `腾讯云声纹服务请求失败（${response.status}）`);
    return data.Response || {};
  }
  return {
    enroll: ({ pcm16, speakerNick = "面试资料伴侣本人" }) => request("VoicePrintEnroll", { payload: { ...audioPayload({ pcm16 }), SpeakerNick: speakerNick.slice(0, 32) } }),
    verify: ({ voicePrintId, pcm16 }) => {
      if (!voicePrintId?.trim()) throw new Error("请先录入本人声纹样本");
      return request("VoicePrintVerify", { payload: { ...audioPayload({ pcm16 }), VoicePrintId: voicePrintId.trim() } });
    },
    delete: (voicePrintId) => request("VoicePrintDelete", { payload: { VoicePrintId: voicePrintId } }),
  };
}
