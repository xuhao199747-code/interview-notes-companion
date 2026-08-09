import { classifyTranscript } from "./turn-detector.js";

export function resolveProjectContext({ question = "", projects = [], activeProjectId = "", lockedProjectId = "" }) {
  if (lockedProjectId && projects.some((project) => project.id === lockedProjectId)) return { projectId: lockedProjectId, source: "locked", confidence: 1 };
  const normalized = question.toLowerCase();
  const explicit = projects.find((project) => [project.name, ...(project.aliases || [])].some((name) => normalized.includes(name.toLowerCase())));
  if (explicit) return { projectId: explicit.id, source: "explicit", confidence: 1 };
  if (activeProjectId && projects.some((project) => project.id === activeProjectId)) return { projectId: activeProjectId, source: "context", confidence: 0.7 };
  return { projectId: "", source: "unknown", confidence: 0 };
}

export function shouldScopeToProject(resolved, question = "") {
  if (!resolved.projectId) return false;
  if (resolved.source === "explicit" || resolved.source === "locked") return true;
  const contextualProjectQuestion = /(?:你们|这个项目|该项目|你这个项目).*(?:指标|得分|评分|计算|口径|权重|架构|RAG|Agent|挑战|结果|优势)|^(?:指标|得分|评分|计算口径|权重).*(?:怎么|如何|是什么|多少|有)/u.test(question);
  return resolved.source === "context" && (classifyTranscript(question).followUp || contextualProjectQuestion);
}
