import fs from "node:fs/promises";
import path from "node:path";

const defaultConfig = {
  asrProvider: "browser",
  tencentRegion: "ap-guangzhou",
  tencentAppId: "",
  tencentSecretId: "",
  tencentSecretKey: "",
  voicePrintId: "",
  voicePrintVerified: false,
  doubaoAppId: "",
  doubaoAccessToken: "",
  doubaoResourceId: "",
  doubaoEndpoint: "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async",
  aiApiUrl: "https://api.openai.com/v1/chat/completions",
  aiModel: "gpt-4o-mini",
  aiApiKey: ""
};

export function createConfigStore(filePath) {
  return {
    async load() {
      try {
        const saved = JSON.parse(await fs.readFile(filePath, "utf8"));
        return { ...defaultConfig, ...saved };
      } catch {
        return { ...defaultConfig };
      }
    },
    async save(config) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify({ ...defaultConfig, ...config }, null, 2), "utf8");
    }
  };
}
