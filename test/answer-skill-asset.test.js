import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const skillUrl = new URL("../assets/AI产品经理面试完整口述回答Skill.md", import.meta.url);

test("完整口述回答 Skill 包含事实边界和连续口述规则", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const heading of ["## 目标", "## 回答原则", "## 口述回答的成文规则"]) {
    assert.match(skill, new RegExp(heading));
  }
  assert.match(skill, /资料不足时明确说“这部分需要本人确认”/);
  assert.match(skill, /业务目标、产品设计、技术取舍、评估指标、迭代闭环/);
});

test("完整口述回答 Skill 明确候选人项目资料的飞书来源", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const url of [
    "https://my.feishu.cn/docx/U3esdjfRnoEGVtxeqQqcJV7knvg",
    "https://my.feishu.cn/docx/FnRedLabHoVSQ4xBINyccElJnIf",
    "https://my.feishu.cn/docx/O2KHddXmKogZi2xjzTLcUSwHn8f",
  ]) {
    assert.match(skill, new RegExp(url.replaceAll("/", "\\/")));
  }
  assert.match(skill, /本地整理稿/);
  assert.match(skill, /无独立本地整理稿；以飞书原始资料中已确认的项目事实为准/);
});

test("完整口述回答 Skill 将项目事实限制在三份飞书资料及其本地整理稿", async () => {
  const skill = await readFile(skillUrl, "utf8");

  assert.match(skill, /三份飞书原始资料及其本地整理稿是项目事实的唯一来源/);
  assert.match(skill, /候选人背景和简历不得作为项目事实来源/);
  assert.match(skill, /不得提供项目职责、项目结果或项目数据/);
});

test("完整口述回答 Skill 只使用确认的 GEO 项目名称", async () => {
  const skill = await readFile(skillUrl, "utf8");

  assert.doesNotMatch(skill, /EGO/);
  assert.match(skill, /GEO/);
});

test("自我介绍先简要带出两个确认项目，详细内容留给后续追问", async () => {
  const skill = await readFile(skillUrl, "utf8");
  assert.match(skill, /自我介绍/);
  assert.match(skill, /GEO 品牌增长/);
  assert.match(skill, /旅游智能营销/);
  assert.match(skill, /详细.*项目追问|项目追问.*详细/s);
});

test("完整口述回答 Skill 按问题范围区分经历与通用方法论", async () => {
  const skill = await readFile(skillUrl, "utf8");
  assert.match(skill, /## 回答范围判断/);
  assert.match(skill, /候选人经历类/);
  assert.match(skill, /通用方法论类/);
  assert.match(skill, /通用问题使用“我会 \/ 建议 \/ 可以”的方法论表达/);
  assert.match(skill, /个人经历问题才使用“我当时 \/ 我负责 \/ 我做过”的经历表达/);
  assert.match(skill, /不得擅自选择某个项目作为答案/);
});

test("完整口述回答 Skill 要求 AI 产品回答说明技术机制与取舍", async () => {
  const skill = await readFile(skillUrl, "utf8");
  assert.match(skill, /## AI 技术表达层（产品经理口径）/);
  assert.match(skill, /技术机制如何支撑产品结果/);
  assert.match(skill, /RAG.*知识从哪里来、如何清洗切片、如何召回和重排/);
  assert.match(skill, /Agent.*调用什么 Tool\/Skill、输出什么结果、如何失败降级/);
  assert.match(skill, /它解决什么业务问题 → 在链路中怎么工作 → 产品上如何控制 → 用什么指标验证/);
});

test("技术架构题按任务、工具、结果判断的执行链路讲透", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const phrase of ["## 技术架构题的链路化口述规则", "任务进入后", "为什么选这些工具", "逐个说明工具", "读取工具返回", "继续检索、重试、转人工或结束", "状态机", "不能只列组件名称"]) {
    assert.match(skill, new RegExp(phrase));
  }
  assert.match(skill, /任务 → 路由与计划 → 工具调用 → 结果校验 → 下一步决策 → 输出与回写/);
});

test("不同问题先用真实或明确假设的场景拉起回答", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const phrase of ["## 场景化口述规则", "谁在什么时刻要完成什么任务", "项目题只能使用资料中的真实场景", "通用题使用假设场景", "不能把假设场景说成个人经历", "场景 → 问题 → 判断 → 做法 → 结果或边界"]) {
    assert.match(skill, new RegExp(phrase));
  }
});

test("完整口述回答 Skill 在资料未命中时按问题类型分流", async () => {
  const skill = await readFile(skillUrl, "utf8");
  assert.match(skill, /## 资料未命中与陌生实体处理/);
  assert.match(skill, /召回资料是否直接包含该实体或别名/);
  assert.match(skill, /通用概念、技术原理或假设性设计题/);
  assert.match(skill, /不引用任何个人项目/);
  assert.match(skill, /候选人经历、具体数据、公司内部信息或近期事实/);
  assert.match(skill, /当前资料未覆盖，需要本人确认/);
  assert.match(skill, /禁止因泛词匹配而引用无关项目资料/);
});

test("完整口述回答 Skill 按项目来源和资料类型生成逐字稿", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const heading of ["## 资料来源与项目边界", "## 逐字稿生成流程", "## 固定输出格式", "## 追问处理"]) {
    assert.match(skill, new RegExp(heading));
  }
  assert.match(skill, /GEO/);
  assert.match(skill, /获客/);
  assert.match(skill, /逐字稿/);
  assert.match(skill, /知识库/);
  assert.match(skill, /项目标题/);
  assert.match(skill, /只使用当前项目/);
  assert.match(skill, /可直接照读/);
  assert.match(skill, /待补证据/);
});

test("完整口述回答 Skill 吸收面试复盘中的证据链和连续追问方法", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const phrase of ["证据链", "第一次缺口", "Badcase", "线上数据", "离线评测", "评测集", "RAG、Tool、Workflow、Agent", "个人所有权", "完整首答", "30 秒"]) {
    assert.match(skill, new RegExp(phrase));
  }
  assert.match(skill, /追问识别与下钻规则/);
  assert.match(skill, /不以固定时长截断/);
  assert.match(skill, /至少约 30 秒的有效信息量/);
  assert.match(skill, /不在 30 秒处强行收尾/);
  assert.match(skill, /老师|同学|师兄/);
  assert.match(skill, /示范方法/);
  assert.match(skill, /不能作为候选人的事实/);
});

test("完整口述回答 Skill 要求总分总和产品全生命周期拆解", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const phrase of ["总—分—总", "一、", "六、", "产品全生命周期", "问题发现", "需求与范围", "开发协作", "评测上线", "运营迭代"]) {
    assert.match(skill, new RegExp(phrase));
  }
  assert.match(skill, /先给结论/);
  assert.match(skill, /最后汇总/);
  assert.match(skill, /GEO.*获客|获客.*GEO/s);
});

test("完整口述回答 Skill 对项目和 AI 问题设置回答总闸门", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const phrase of ["回答总闸门", "面试官真正想确认", "问题类型 × 必答维度", "禁止只回答单点", "项目背景与用户", "AI 架构与技术机制", "评测与护栏", "Badcase 与迭代", "个人职责与边界"]) {
    assert.match(skill, new RegExp(phrase));
  }
  assert.match(skill, /生成前检查|输出前检查/);
});

test("完整口述回答 Skill 将框架用于内部编排而不是单独输出", async () => {
  const skill = await readFile(skillUrl, "utf8");
  for (const phrase of ["只用于内部组织", "不要把框架原样输出", "一段连贯的口述回答", "面试官每问一个问题"]) {
    assert.match(skill, new RegExp(phrase));
  }
  assert.match(skill, /可直接照读/);
  assert.doesNotMatch(skill, /## 项目完整讲解最低字段/);
  assert.match(skill, /## 项目讲解回答生成规则/);
  assert.match(skill, /一段完整、连贯、可直接照读的话/);
  assert.match(skill, /直接回答版不得分段/);
  assert.match(skill, /不得使用这些词作为口述小标题/);
});
