const incompleteEndings = ["然后", "比如", "因为", "我想问一下", "就是说", "怎么", "如何", "是否"];
const questionPattern = /(吗|呢|么|多少|几个|哪些|什么|为什么|怎么|如何|能否|是否|介绍|负责|结果|挑战|实现|设计|区别|优势|缺点)/;
const followUpPattern = /^(?:为什么|然后呢|结果呢|展开讲讲|详细讲一下|具体怎么做|这个怎么做|这个详细讲一下)[？?。！!]?$/u;
const contextualFollowUpPattern = /^(?:哎[，,、\s]*)?(?:你)?(?:刚刚|刚才|前面|之前)(?:说|提到).+/u;
const projectReferenceFollowUpPattern = /^(?:(?:他|她|它)?这个|(?:他|她|它)?那个|该|这|那)项目/u;

export function classifyTranscript(text = "") {
  const normalized = text.trim().replace(/[。！!]+$/, "");
  const followUp = followUpPattern.test(normalized) || contextualFollowUpPattern.test(normalized) || projectReferenceFollowUpPattern.test(normalized);
  const incomplete = incompleteEndings.some((ending) => normalized.endsWith(ending));
  const complete = !incomplete && (followUp || questionPattern.test(normalized));
  return { complete, followUp, delayMs: complete ? 1200 : 2200 };
}

export function shouldCommitAfterSilence({ text = "", silenceMs = 0 }) {
  const normalized = text.trim();
  if (normalized.length < 4) return false;
  const { complete, delayMs } = classifyTranscript(normalized);
  return silenceMs >= 3500 || (complete && silenceMs >= delayMs);
}
