import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pipeline, env } from "@huggingface/transformers";
import { cosineSimilarity } from "./semantic-search.js";

const MODEL_NAME = "semantic-model";
// 知识卡把别名也写入了向量文本；旧缓存没有这些别名，必须自动重建一次。
const INDEX_VERSION = 3;
const EMBEDDING_BATCH_SIZE = 12;

function keyFor(section = {}) {
  return crypto.createHash("sha256").update(JSON.stringify([
    section.source || "",
    section.project || "",
    section.title || "",
    section.content || "",
    section.retrievalText || "",
  ])).digest("hex");
}

function sectionText(section = {}) {
  return String(section.retrievalText || `${section.project || ""}\n${section.title || ""}\n${section.content || ""}`).slice(0, 4000);
}

function toVector(tensor) {
  return Array.from(tensor.data || tensor);
}

let defaultExtractor;

async function defaultEmbedder(texts) {
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = path.join(process.cwd(), ".local");
  if (!defaultExtractor) defaultExtractor = await pipeline("feature-extraction", MODEL_NAME, { dtype: "q8" });
  const output = await defaultExtractor(texts, { pooling: "mean", normalize: true });
  const dimensions = output.dims || [1, output.data.length];
  const count = dimensions[0] || 1;
  const width = output.data.length / count;
  return Array.from({ length: count }, (_, index) => Array.from(output.data.slice(index * width, (index + 1) * width)));
}

export function createLocalSemanticIndex({ filePath = "", embed } = {}) {
  const entries = new Map();
  let loaded = false;
  let embedder;
  let pendingIndex = Promise.resolve();

  async function load() {
    if (loaded) return;
    loaded = true;
    if (!filePath) return;
    try {
      const saved = JSON.parse(await fs.readFile(filePath, "utf8"));
      if (saved.version !== INDEX_VERSION || !saved.entries) return;
      for (const [key, vector] of Object.entries(saved.entries)) if (Array.isArray(vector) && vector.length) entries.set(key, vector);
    } catch {
      // 首次使用没有索引文件是正常情况。
    }
  }

  async function save() {
    if (!filePath) return;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify({ version: INDEX_VERSION, entries: Object.fromEntries(entries) }), "utf8");
  }

  async function vectorsFor(texts) {
    if (embed) {
      const result = await Promise.all(texts.map((text) => embed(text)));
      return result.map(toVector);
    }
    if (!embedder) embedder = defaultEmbedder;
    return embedder(texts);
  }

  async function indexNow(sections = []) {
    await load();
    const missing = sections.map((section) => ({ section, key: keyFor(section) })).filter(({ key }) => !entries.has(key));
    if (missing.length) {
      // 全量资料的逐字稿很长，不能把数百个切片一次送进 ONNX；这会在桌面端被系统杀掉，
      // 表现为“语义检索没有结果”。小批量写入既控制内存，也能在已有索引上增量继续。
      for (let offset = 0; offset < missing.length; offset += EMBEDDING_BATCH_SIZE) {
        const batch = missing.slice(offset, offset + EMBEDDING_BATCH_SIZE);
        const vectors = await vectorsFor(batch.map(({ section }) => sectionText(section)));
        batch.forEach(({ key }, index) => entries.set(key, vectors[index]));
        await save();
      }
    }
    return sections.map((section) => ({ section, key: keyFor(section), vector: entries.get(keyFor(section)) }));
  }

  function index(sections = []) {
    const task = pendingIndex.then(() => indexNow(sections));
    pendingIndex = task.catch(() => {});
    return task;
  }

  async function search(query, sections = [], limit = 5) {
    const cleanQuery = String(query || "").trim();
    if (!cleanQuery || !sections.length) return [];
    const indexed = await index(sections);
    const [queryVector] = await vectorsFor([cleanQuery]);
    return indexed
      .map(({ section, vector }) => {
        const semanticScore = cosineSimilarity(queryVector, vector);
        return { ...section, semanticScore, score: Math.round(semanticScore * 10), matchType: "semantic" };
      })
      .filter((section) => section.semanticScore > 0)
      .sort((left, right) => right.semanticScore - left.semanticScore)
      .slice(0, limit);
  }

  return { index, search };
}
