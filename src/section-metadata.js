const profileLabel = /(?:自我介绍|个人经历|职业经历|我的情况|个人故事线|讲人设)/u;
const profileOpening = /(?:个人故事线\s*)?(?:自我介绍)?\s*(?:您好[，,]?(?:我叫|我是)|我有\s*\d+\s*年.{0,12}经验)/u;
const genericSourceName = /(?:面试口述|复盘原文|通用面试问题|通用资料|术语表|回答规则|Skill)/u;
const genericProjectLabel = /(?:^(?:项目背景|项目概览|项目介绍|业务背景|方案设计|技术方案|技术架构|核心能力|复盘|附录)|通用|能力|方法论|面试)/u;

function sourceStem(source = "") {
  return String(source)
    .replace(/\.(?:md|markdown|go)$/iu, "")
    .replace(/^(?:面试知识库|知识库|资料库)[-_—\s]*/u, "")
    .trim();
}

export function isPersonalProfileSection(section = {}) {
  // 一级“自我介绍”会成为其下小节的 project；不能因此把“项目挑战”等所有后续章节
  // 都误判为个人简介。标题和正文开场才是个人资料的可靠证据。
  const label = String(section.title || "");
  const opening = String(section.content || "").slice(0, 220);
  return profileLabel.test(label) || profileOpening.test(opening);
}

export function inferredProjectName(section = {}) {
  if (section.inferredProject) return section.inferredProject;
  if (isPersonalProfileSection(section)) return "";
  const project = String(section.project || "").trim();
  if (project && !genericProjectLabel.test(project) && /(?:项目|平台|系统|产品|业务)/u.test(project)) return project;
  const source = sourceStem(section.source);
  if (!source || genericSourceName.test(source) || genericProjectLabel.test(source)) return "";
  return source;
}

export function inferSectionRole(section = {}) {
  if (isPersonalProfileSection(section)) return "profile";
  const text = `${section.title || ""}\n${section.content || ""}`;
  if (/(?:项目背景|业务背景|为什么做|立项背景|用户痛点)/u.test(text)) return "project-background";
  if (/(?:技术架构|技术方案|技术选型|RAG|Agent|Workflow|检索|召回)/iu.test(text)) return "project-solution";
  if (/(?:指标|结果|效果|提升|转化率|准确率|口径)/u.test(text)) return "project-metric";
  if (/(?:复盘|挑战|困难|难点|Bad\s?Case)/iu.test(text)) return "project-retrospective";
  return inferredProjectName(section) ? "project" : "general";
}

export function annotateSection(section = {}) {
  const inferredProject = inferredProjectName(section);
  return { ...section, inferredProject, role: inferSectionRole(section) };
}
