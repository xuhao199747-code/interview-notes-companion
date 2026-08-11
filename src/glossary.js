export const defaultGlossary = [
  { term: "Coze", aliases: ["扣子", "字节扣子", "Coze 平台"] },
  { term: "RAG", aliases: ["检索增强生成", "检索增强", "知识库问答", "向量检索"] },
  { term: "Agent", aliases: ["智能体", "多智能体", "代理"] },
  { term: "Workflow", aliases: ["工作流", "固定流程", "编排流程"] },
  { term: "Skill", aliases: ["技能", "提示词技能", "回答规则"] },
  { term: "Tool", aliases: ["工具调用", "函数调用", "Function Calling"] },
  { term: "AI 产品评测", aliases: ["评测", "评估", "测试集", "效果评估", "坏案例", "Badcase"] },
  { term: "高风险场景", aliases: ["人工兜底", "人工接管", "安全护栏"] },
  { term: "Embedding", aliases: ["嵌入模型", "向量化"] },
  { term: "MCP", aliases: ["模型上下文协议"] },
  { term: "评测集", aliases: ["评估集", "评测数据集", "样本集"] },
  { term: "Rubric", aliases: ["评分量表", "评分细则", "评分规则"] },
  { term: "Bad Case", aliases: ["坏例", "失败案例", "错误案例"] },
  { term: "Trace", aliases: ["调用链路", "执行轨迹", "推理链路"] },
  { term: "回归集", aliases: ["回归测试集", "回归案例"] },
  { term: "Chunk", aliases: ["切片", "分块", "文档分段"] },
  { term: "Metadata", aliases: ["元数据", "文档标签", "字段过滤"] },
  { term: "混合召回", aliases: ["混合检索", "关键词加向量检索"] },
  { term: "Rerank", aliases: ["重排", "二次排序"] },
  { term: "置信度", aliases: ["可信度分数", "低置信度"] },
  { term: "拒答", aliases: ["拒绝回答", "安全拒答"] },
  { term: "人工接管", aliases: ["转人工", "人工介入", "人工审核"] },
  { term: "Golden Set", aliases: ["金标集", "金标准集", "标准答案集"] },
  { term: "LLM-as-a-Judge", aliases: ["LLM 裁判", "大模型裁判", "模型评审"] },
  { term: "断言", aliases: ["规则断言", "确定性校验"] },
  { term: "Precision", aliases: ["精确率", "查准率"] },
  { term: "Recall", aliases: ["召回率", "查全率"] },
  { term: "NDCG", aliases: ["归一化折损累计增益"] },
  { term: "MRR", aliases: ["平均倒数排名"] },
  { term: "Guardrail", aliases: ["护栏", "安全规则", "安全边界"] },
  { term: "Prompt Injection", aliases: ["提示词注入", "指令注入"] },
  { term: "AI Overviews", aliases: ["AI 概览", "谷歌 AI 概览", "AIO"] },
  { term: "AI Mode", aliases: ["AI 模式", "谷歌 AI 模式"] },
  { term: "Answer Engine", aliases: ["答案引擎", "问答引擎", "生成式搜索"] },
  { term: "引用率", aliases: ["品牌被引用率", "被引用率", "引用占比"] },
  { term: "品牌提及率", aliases: ["品牌提及", "提及率", "品牌出现率"] },
  { term: "Share of Voice", aliases: ["声量份额", "可见度份额", "SOV"] },
  { term: "Entity", aliases: ["实体", "品牌实体", "实体识别"] },
  { term: "Query Fan-out", aliases: ["查询扩展", "问题扩展", "查询扇出"] },
  { term: "JSON-LD", aliases: ["结构化数据", "结构化标记", "结构化 Schema"] },
  { term: "SERP", aliases: ["搜索结果页", "搜索结果页面"] },
  { term: "CDP", aliases: ["客户数据平台", "客户数据中台"] },
  { term: "CRM", aliases: ["客户关系管理", "客户管理系统"] },
  { term: "OTA", aliases: ["在线旅游平台", "在线旅行社"] },
  { term: "用户分群", aliases: ["用户分层", "客群分层", "人群分群"] },
  { term: "意图识别", aliases: ["用户意图识别", "意图判断", "需求识别"] },
  { term: "线索评分", aliases: ["Lead Scoring", "商机评分", "线索打分"] },
  { term: "营销自动化", aliases: ["自动化营销", "营销编排", "自动化触达"] },
  { term: "多触点归因", aliases: ["营销归因", "转化归因", "归因模型"] },
  { term: "转化漏斗", aliases: ["营销漏斗", "转化链路", "转化路径"] },
  { term: "推荐系统", aliases: ["智能推荐", "个性化推荐"] },
  { term: "动态定价", aliases: ["智能定价", "实时定价"] },
];

// 这层不受用户上传术语表覆盖：用于修正 ASR 对 AI 产品高频缩写的稳定误识别。
const asrCorrections = [
  { term: "RAG", aliases: ["IG", "AIG", "R A G"] },
  { term: "Coze", aliases: ["扣字", "扣子平台"] },
  // 语音识别会稳定把 GEO 听成 CEO；面试资料检索应优先还原为项目名。
  { term: "GEO", aliases: ["CEO", "GU", "G U", "G E O"] },
];

export function renderGlossaryUploadState(fileName = "") {
  return fileName ? `${fileName}（已自动应用）` : "尚未上传术语表";
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAlias(text, alias, term) {
  const escaped = escapeRegex(alias);
  // 英文缩写必须按完整 token 匹配，AIGC 不能因为前缀 AIG 被误改成 RAGC。
  const pattern = /^[a-z0-9 ]+$/iu.test(alias)
    ? new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`, "giu")
    : new RegExp(escaped, "giu");
  return text.replace(pattern, term.trim());
}

function replaceAliases(text, aliases, term) {
  const placeholder = "\uE000";
  const marked = aliases.reduce((next, alias) => replaceAlias(next, alias, placeholder), text);
  return marked.replaceAll(placeholder, term.trim());
}

export function normalizeQuestion(question = "", glossary = []) {
  return [...asrCorrections, ...glossary].reduce((normalized, entry) => {
    if (!entry?.term || !Array.isArray(entry.aliases)) return normalized;
    const aliases = entry.aliases.filter(Boolean).sort((a, b) => b.length - a.length);
    if (!aliases.length) return normalized;
    return replaceAliases(normalized, aliases, entry.term);
  }, question);
}

export function parseGlossaryMarkdown(markdown = "") {
  const entries = [];
  let current = null;
  for (const line of markdown.split(/\r?\n/u)) {
    const heading = line.match(/^##\s+(.+?)\s*#*$/u);
    if (heading) {
      if (current) entries.push(current);
      current = { term: heading[1].trim(), aliases: [] };
      continue;
    }
    const aliases = line.match(/^\s*(?:[-*]\s*)?(?:别名|关键词|aliases?)\s*[:：]\s*(.+)$/iu);
    if (current && aliases) current.aliases = aliases[1].split(/[,，、]/u).map((value) => value.trim()).filter(Boolean);
  }
  if (current) entries.push(current);
  return entries.filter((entry) => entry.term && entry.aliases.length);
}
