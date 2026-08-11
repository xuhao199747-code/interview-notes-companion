import { classifyTranscript } from "./turn-detector.js";
import { classifyAnswerScope } from "./answer-context-policy.js";

export function resolveProjectContext({ question = "", projects = [], activeProjectId = "", lockedProjectId = "" }) {
  if (lockedProjectId && projects.some((project) => project.id === lockedProjectId)) return { projectId: lockedProjectId, source: "locked", confidence: 1 };
  const normalized = question.toLowerCase();
  const explicit = projects
    .flatMap((project) => [project.name, ...(project.aliases || [])]
      .filter(Boolean)
      .filter((name) => normalized.includes(name.toLowerCase()))
      .map((name) => ({ project, name })))
    .sort((left, right) => right.name.length - left.name.length)[0]?.project;
  if (explicit) return { projectId: explicit.id, source: "explicit", confidence: 1 };
  // 面试中“CEO 项目/CEO 的问题”是明确换题信号；资料库尚未收录该项目时，
  // 宁可提示资料不足，也不能沿用上一题的 GEO 等项目资料作答。
  if (/\bC\.?E\.?O\.?\b\s*(?:项目|平台|系统|的(?:问题|内容|挑战|方案|架构))/iu.test(question)) return { projectId: "", source: "unknown", confidence: 0 };
  if (activeProjectId && projects.some((project) => project.id === activeProjectId)) return { projectId: activeProjectId, source: "context", confidence: 0.7 };
  return { projectId: "", source: "unknown", confidence: 0 };
}

export function shouldScopeToProject(resolved, question = "") {
  if (!resolved.projectId) return false;
  // “自我介绍”属于个人经历题，不能因为前面提到过某项目就裁掉个人资料。
  if (classifyAnswerScope(question) === "experience") return false;
  if (resolved.source === "explicit" || resolved.source === "locked") return true;
  const contextualProjectQuestion = /(?:(?:你们).*(?:指标|得分|评分|计算|口径|权重|架构|RAG|Agent|挑战|结果|优势|能力|功能|模型|工具|流程)|(?:(?:你们|(?:他|她|它)?这个|(?:他|她|它)?那个|该|这|那)项目).*(?:指标|得分|评分|计算|口径|权重|架构|RAG|Agent|挑战|结果|优势|能力|功能|模型|工具|流程)|^(?:指标|得分|评分|计算口径|权重).*(?:怎么|如何|是什么|多少|有))/u.test(question);
  return resolved.source === "context" && (classifyTranscript(question).followUp || contextualProjectQuestion);
}
