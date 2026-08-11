import fs from "node:fs/promises";
import path from "node:path";
import { normalizeQuestionCaptureConfig } from "./question-capture/config.js";

const defaultConfig = {
  asrProvider: "browser",
  tencentRegion: "ap-guangzhou",
  tencentAppId: "",
  tencentSecretId: "",
  tencentSecretKey: "",
  questionCaptureHotkey: "Alt+Space",
  doubaoAppId: "",
  doubaoAccessToken: "",
  doubaoResourceId: "",
  doubaoEndpoint: "wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_async",
  aiApiUrl: "https://api.openai.com/v1/chat/completions",
  aiModel: "gpt-4o-mini",
  aiApiKey: ""
};

function normalizeConfig(config = {}) {
  const known = Object.fromEntries(
    Object.keys(defaultConfig)
      .filter((key) => key !== "questionCaptureHotkey")
      .map((key) => [key, config[key] ?? defaultConfig[key]])
  );
  return { ...known, ...normalizeQuestionCaptureConfig(config) };
}

export function createConfigStore(filePath) {
  return {
    async load() {
      try {
        const saved = JSON.parse(await fs.readFile(filePath, "utf8"));
        return normalizeConfig(saved);
      } catch {
        return normalizeConfig();
      }
    },
    async save(config) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(normalizeConfig(config), null, 2), "utf8");
    }
  };
}
