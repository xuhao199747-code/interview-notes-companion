import { createLocalSemanticIndex } from "./local-semantic-index.js";

const semanticIndex = createLocalSemanticIndex({ filePath: process.env.SEMANTIC_INDEX_PATH || "" });
let buffer = "";

async function handle(message) {
  if (message.op === "index") return semanticIndex.index(Array.isArray(message.sections) ? message.sections : []);
  if (message.op === "search") return semanticIndex.search(message.query, Array.isArray(message.sections) ? message.sections : [], message.limit || 20);
  throw new Error("未知的语义检索操作");
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  for (const line of lines) {
    if (!line.trim()) continue;
    let message;
    try { message = JSON.parse(line); } catch { continue; }
    void handle(message)
      .then((result) => process.stdout.write(`${JSON.stringify({ id: message.id, result })}\n`))
      .catch((error) => process.stdout.write(`${JSON.stringify({ id: message.id, error: error.message })}\n`));
  }
});
