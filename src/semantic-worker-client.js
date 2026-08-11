import { spawn as defaultSpawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workerFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "semantic-worker.js");

// Electron 主进程不能直接加载 ONNX；让 Electron 自己以纯 Node 模式启动子进程，
// 模型、向量和崩溃都与主进程隔离。
export function createSemanticWorkerClient({ filePath, spawn = defaultSpawn, executable = process.execPath } = {}) {
  let child;
  let sequence = 0;
  let buffer = "";
  let lastError = "";
  const pending = new Map();

  function status() {
    return { available: Boolean(child?.connected || child?.stdin?.writable), error: lastError || null };
  }

  function rejectPending(error) {
    for (const { reject } of pending.values()) reject(error);
    pending.clear();
  }

  function start() {
    if (child?.stdin?.writable) return;
    child = spawn(executable, [workerFile], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", SEMANTIC_INDEX_PATH: filePath || "" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        try {
          const message = JSON.parse(line);
          const task = pending.get(message.id);
          if (!task) continue;
          pending.delete(message.id);
          if (message.error) task.reject(new Error(message.error));
          else task.resolve(message.result);
        } catch { /* worker 日志不影响下一条有效消息 */ }
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { lastError = String(chunk).trim() || lastError; });
    child.on("error", (error) => { lastError = error.message; rejectPending(error); });
    child.on("exit", (code) => {
      if (code !== 0) lastError ||= `本地语义检索进程已退出（${code}）`;
      rejectPending(new Error(lastError || "本地语义检索进程已退出"));
      child = undefined;
    });
  }

  function request(op, payload = {}) {
    start();
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      child.stdin.write(`${JSON.stringify({ id, op, ...payload })}\n`, (error) => {
        if (!error) return;
        pending.delete(id);
        lastError = error.message;
        reject(error);
      });
    });
  }

  return {
    index: (sections) => request("index", { sections }),
    search: (query, sections, limit) => request("search", { query, sections, limit }),
    status,
    stop() { child?.kill(); child = undefined; },
  };
}
