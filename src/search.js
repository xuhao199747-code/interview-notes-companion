export function parseMarkdown(markdown, fileName = "未命名文档") {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let activeProject = "";
  let inArchive = false;
  let current = { title: fileName.replace(/\.(md|markdown|go)$/i, ""), level: 1, body: [], project: activeProject, source: fileName, archive: inArchive };

  for (const rawLine of lines) {
    const heading = rawLine.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      if (current.body.join(" ").trim()) sections.push(...finalizeSection(current));
      if (heading[1].length === 1) activeProject = heading[2].trim();
      // 完整原文档案用于项目题和追问取证，但不能污染“如何设计 Agent”这类通用题。
      if (/(完整原文资料|完整面试问题原文说明)/u.test(heading[2])) inArchive = true;
      current = { title: heading[2].trim(), level: heading[1].length, body: [], project: activeProject, source: fileName, archive: inArchive };
    } else if (!rawLine.match(/^\s*```/)) {
      current.body.push(rawLine.replace(/^\s*[-*+]\s+/, "").trim());
    }
  }
  if (current.body.join(" ").trim()) sections.push(...finalizeSection(current));
  return sections;
}

const MAX_SECTION_CHARS = 1600;

function splitParagraph(paragraph = "", limit = MAX_SECTION_CHARS) {
  if (paragraph.length <= limit) return [paragraph];
  const sentences = paragraph.match(/[^。！？；!?;]+[。！？；!?;]?/gu) || [paragraph];
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    if (sentence.length > limit) {
      if (current) chunks.push(current);
      for (let offset = 0; offset < sentence.length; offset += limit) chunks.push(sentence.slice(offset, offset + limit));
      current = "";
    } else if ((current + sentence).length > limit) {
      if (current) chunks.push(current);
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function splitContent(content = "") {
  const paragraphs = content
    .split(/\n\s*\n/gu)
    .map((paragraph) => paragraph.replace(/\s+/gu, " ").trim())
    .filter(Boolean)
    .flatMap((paragraph) => splitParagraph(paragraph));
  const chunks = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (!current) current = paragraph;
    else if ((current.length + paragraph.length + 1) <= MAX_SECTION_CHARS) current += ` ${paragraph}`;
    else {
      chunks.push(current);
      current = paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function finalizeSection(section) {
  const content = section.body.join("\n").trim();
  const chunks = splitContent(content);
  return chunks.map((chunk, index) => ({
    title: section.title,
    level: section.level,
    project: section.project,
    source: section.source,
    archive: Boolean(section.archive),
    chunkIndex: index,
    chunkCount: chunks.length,
    content: chunk,
    text: `${section.title} ${chunk}`,
  }));
}

function tokenize(input) {
  const stopTokens = new Set(["你", "我", "他", "她", "的", "是", "了", "在", "有", "过", "吗", "呢", "啊", "这", "那", "个", "一下", "什么", "如何", "怎么", "介绍", "一下", "是否", "能够", "可以"]);
  return input
    .toLowerCase()
    .replace(/([\p{Script=Han}])/gu, " $1 ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((token) => !stopTokens.has(token) && (token.length > 1 || /\p{Script=Han}/u.test(token)));
}

const conceptGroups = [
  ["自我介绍", ["自我介绍", "说说你的情况", "介绍你的情况", "简单介绍你的经历", "个人情况", "个人背景", "职业经历"]],
  ["指标", ["指标", "得分", "评分", "计算", "口径", "权重", "可见度"]],
  ["挑战", ["挑战", "困难", "问题", "挫折", "难点", "阻碍"]],
  ["解决", ["解决", "处理", "应对", "克服", "推进", "怎么做", "如何做"]],
  ["项目", ["项目", "经历", "案例", "工作", "事情"]],
  ["适合", ["适合", "匹配", "胜任", "优势", "为什么是你", "为什么录用"]],
  ["离职", ["离职", "离开", "换工作", "跳槽", "为什么不留在"]],
  ["架构", ["架构", "技术方案", "系统设计", "怎么搭", "整体方案"]],
  ["效果", ["效果", "结果", "成果", "指标", "提升", "收益"]],
  ["原因", ["原因", "为什么", "动机", "背景"]],
  ["团队", ["团队", "协作", "合作", "同事", "跨部门"]],
];

function expandConcepts(query) {
  const lowerQuery = query.toLowerCase();
  return conceptGroups
    .filter(([, variants]) => variants.some((variant) => lowerQuery.includes(variant.toLowerCase())))
    .map(([concept]) => concept);
}

function detectIntent(query) {
  if (/(自我介绍|说说你的情况|介绍你的情况|介绍你的经历|个人情况|个人背景|职业经历)/u.test(query)) return "profile";
  if (/(指标|得分|评分|怎么算|如何计算|计算方式|计算口径|权重)/u.test(query)) return "metric";
  if (/(几个|多少个|数量|几名|几类|几个有)/u.test(query)) return "count";
  if (/(什么是|是什么|区别|定义|怎么理解)/u.test(query)) return "definition";
  if (/(?:Agent|智能体|多智能体)/iu.test(query)) return "agent";
  if (/(知识库|检索).{0,10}(设计|构建|搭建|方案)|(?:设计|构建|搭建).{0,10}(知识库|检索)/u.test(query)) return "knowledge";
  if (/(转人工|人工接管|人工兜底|什么时候人工)/u.test(query)) return "handoff";
  if (/(架构|怎么设计|如何设计|怎么搭)/u.test(query)) return "architecture";
  if (/(挑战|困难|难点|问题|怎么解决|如何处理)/u.test(query)) return "challenge";
  if (/(结果|成果|指标|提升了多少|效果)/u.test(query)) return "result";
  return "general";
}

function isTooGenericQuery(query = "") {
  const compactQuery = query.replace(/[\s，,。！？?!]/gu, "");
  return /^(区别是什么|有什么区别|差别是什么|是什么|怎么做|如何做|为什么|然后呢|可以吗|有没有)$/u.test(compactQuery);
}

function intentScore(intent, section) {
  const text = `${section.title} ${section.content}`;
  if (intent === "profile") return /自我介绍|个人经历|职业经历/u.test(section.title) ? 24 : 0;
  // “挑战”正文里常会提到得分，但不能因此压过真正说明指标口径的章节。
  if (intent === "metric") return /(评分|指标|得分|计算|权重|口径)/u.test(section.title) ? 60 : /(评分|指标|得分|计算|权重|口径)/u.test(text) ? 10 : 0;
  if (intent === "count") return /(\d+\s*个|[一二三四五六七八九十]+个|几个|多个|数量)/u.test(text) ? 18 : 0;
  if (intent === "definition") return /(什么是|是什么|区别|定义)/u.test(section.title) ? 12 : 0;
  if (intent === "agent") {
    if (!/(?:Agent|智能体)/iu.test(section.title)) return 0;
    return /什么是\s*Agent|Agent（什么时候/u.test(section.title) ? 90 : 58;
  }
  if (intent === "architecture") return /(架构|设计|方案)/u.test(text) ? 9 : 0;
  // “知识库怎么设计”与“什么时候转人工”经常只有口语化泛词；优先落到对应的方法论标题，
  // 不让长项目原文中碰巧出现的“知识库/人工”抢走答案。
  const isTerminology = /AI产品经理术语表/u.test(String(section.source || ""));
  if (intent === "knowledge") return /RAG|知识库|检索/u.test(section.title) ? (isTerminology ? 82 : 56) : 0;
  if (intent === "handoff") return /高风险场景|人工接管|转人工/u.test(section.title) ? (isTerminology ? 90 : 72) : 0;
  if (intent === "challenge") return /(挑战|困难|难点|问题)/u.test(text) ? 9 : 0;
  if (intent === "result") return /(结果|成果|指标|提升|效果)/u.test(text) ? 9 : 0;
  return 0;
}

export function searchSections(query, sections, limit = 5) {
  // 转写只剩“区别是什么”时无法判断主题，不能把泛词伪装成高相关资料。
  if (isTooGenericQuery(query)) return [];
  const queryTokens = tokenize(query);
  if (!queryTokens.length) return [];
  const conceptTokens = expandConcepts(query);
  const intent = detectIntent(query);
  const technicalTerms = [...new Set(query.toLowerCase().match(/[a-z][a-z0-9_-]{1,}/gu) || [])];

  return sections
    .map((section) => {
      const titleTokens = tokenize(section.title);
      const projectTokens = tokenize(section.project || "");
      const bodyTokens = tokenize(section.content);
      const haystack = [...titleTokens, ...projectTokens, ...bodyTokens];
      const directScore = queryTokens.reduce((total, token) => {
        const titleMatches = titleTokens.filter((candidate) => candidate.includes(token)).length;
        const projectMatches = projectTokens.filter((candidate) => candidate.includes(token)).length;
        const bodyMatches = bodyTokens.filter((candidate) => candidate.includes(token)).length;
        return total + Math.min(titleMatches * 3 + projectMatches * 2 + bodyMatches, 4);
      }, 0);
      const titlePhraseBoost = section.title.length > 1 && query.includes(section.title) ? 10 : 0;
      // 长逐字稿里项目概览会重复许多技术词；当问题已经命中具体题目标题的多个词时，
      // 标题应优先于正文中的泛项目介绍，避免把正确逐字稿挤出候选。
      const titleTerms = [...new Set(query.toLowerCase().match(/[a-z][a-z0-9_-]{1,}|[\p{Script=Han}]{2,}/gu) || [])]
        .filter((term) => !["什么", "怎么", "如何", "这个", "项目", "你们"].includes(term));
      const titleCoverage = titleTerms.filter((term) => section.title.toLowerCase().includes(term)).length;
      const titleCoverageBoost = titleCoverage >= 2 ? titleCoverage * 24 : 0;
      const technicalTermBoost = technicalTerms.reduce((total, term) => {
        const title = section.title.toLowerCase();
        const content = section.content.toLowerCase();
        const project = String(section.project || "").toLowerCase();
        return total + (title.includes(term) ? 16 : project.includes(term) ? 12 : content.includes(term) ? 6 : 0);
      }, 0);
      const semanticScore = conceptTokens.reduce((total, concept) => {
        const titleMatch = section.title.includes(concept);
        const bodyMatch = section.content.includes(concept);
        return total + (titleMatch ? 4 : bodyMatch ? 2 : 0);
      }, 0);
      const score = directScore + semanticScore + titlePhraseBoost + titleCoverageBoost + technicalTermBoost + intentScore(intent, section);
      const directHits = queryTokens.filter((token) => haystack.some((candidate) => candidate.includes(token))).length;
      return { ...section, score, matchType: directHits ? (semanticScore ? "hybrid" : "keyword") : "semantic" };
    })
    .filter((section) => section.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
