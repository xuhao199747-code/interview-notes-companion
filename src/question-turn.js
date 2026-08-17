const questionStarters = ["如果", "你的", "你这个", "你们", "你做过", "介绍一下", "说说", "请问"];

export function normalizeAsrQuestion(text = "") {
  let normalized = String(text || "").trim().replace(/\s{2,}/gu, " ");
  // 相邻重复的词或短语来自累计结果与新增分段的重复拼接；只压缩紧邻重复，
  // 不改动“你觉得 A 和 A 有何不同”这类具有语义的非相邻重复。
  normalized = normalized
    .replace(/(请?介绍)(?:\s*\1)+/gu, "$1")
    .replace(/(介绍一下)(?:\s*\1)+/gu, "$1")
    .replace(/(请问)(?:\s*\1)+/gu, "$1")
    .replace(/(你觉得)(?:\s*\1)+/gu, "$1");
  // 英文产品名、模型名与缩写会包含连续字母或数字；只移除两侧都是中文/标点的单字母孤岛。
  normalized = normalized.replace(/(?<=[\u4e00-\u9fff，。！？?、\s])[a-z](?=[\u4e00-\u9fff，。！？?、\s])/giu, "");
  normalized = normalized.replace(/请介绍一下(?:\s*介绍一下)+/gu, "请介绍一下");
  return normalized.replace(/\s{2,}/gu, " ").trim();
}

function hasQuestionCue(text) {
  return /(吗|呢|么|多少|几个|哪些|什么|为什么|怎么|如何|优势|挑战|经历|项目|介绍|负责|结果)/u.test(text);
}

export function extractLatestQuestionTurn(text = "") {
  const normalized = text.trim().replace(/^[\s，,。！？?!]+|[\s，,。！？?!]+$/gu, "");
  if (!normalized) return "";
  const candidates = normalized.split(/[。！？?]+/u).map((item) => item.trim()).filter(Boolean);
  const lastSentence = candidates.at(-1) || normalized;
  const previousSentence = candidates.at(-2) || "";
  const isGenericTailQuestion = /^(?:区别是什么|有什么区别|怎么做|如何做|你会怎么做)$/u.test(lastSentence);
  // ASR 偶尔会在条件和主问题之间错加句号，例如“如果从零到一做项目。你会怎么做”。
  // 这时只合并紧邻的前提句，避免把整段历史重新带回当前题。
  if (
    previousSentence
    && (
      (/(?:如果|假如|假设|让你|从零到一|在.+情况下|给你)/u.test(previousSentence)
        && /^(?:那|你|会|该|然后|接下来).*(?:怎么|如何|为什么|是否|能否|可以)/u.test(lastSentence))
      || isGenericTailQuestion
    )
  ) return `${previousSentence}。${lastSentence}`;
  // “自我介绍”是一个不可拆的意图；口语前缀如“我说”不能让后半句“介绍一下”变成新题。
  // 仅完整短句走这个分支，不能把无标点的整段历史锁死。
  if (/^(?:(?:请|我说|你说|能否|可以)?你?)?自我介绍(?:一下)?$/u.test(lastSentence)) return lastSentence;
  const starts = questionStarters
    .flatMap((starter) => [...lastSentence.matchAll(new RegExp(starter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gu"))].map((match) => match.index))
    .filter((index) => index > 0)
    .sort((left, right) => left - right);
  for (const index of starts.toReversed()) {
    const candidate = lastSentence.slice(index).trim();
    if (hasQuestionCue(candidate)) return candidate;
  }
  return lastSentence;
}
