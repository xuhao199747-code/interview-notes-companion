// 流式初稿直接展示，方便确认当前是否正在收到语音；提交后由调用方展示重构后的问题。
export function nextVisibleTranscript({ current, incomingText = "", mergedText }) {
  const incoming = String(incomingText || "").trim();
  // 录音过程中只把服务端最新原始片段展示给用户；完整拼接只用于结束后的检索与生成。
  // 这样云端对前文的回写不会在工具栏上和原始文本混成重复句。
  if (incoming) return incoming;
  const transcript = String(mergedText || "").trim();
  if (transcript) return transcript;
  return current === "待识别" ? "正在识别…" : current;
}
