# 完整 AI 术语识别词库设计

## 目标

把 AI 产品经理面试场景中的术语、产品名、模型名、工程概念、项目专属概念和常见语音误识别，维护为完整但受边界约束的本地词库；它只用于问题归一化和语音纠错，不作为面试资料库的检索答案。

## 范围与分层

### 1. AI 产品方法论

覆盖 RAG、Agent、Workflow、Tool、Skill、Prompt、Memory、MCP、Function Calling、模型路由、人工介入、评测、上线治理和安全护栏。

### 2. 模型与 AI 工程

覆盖 Embedding、向量数据库、Chunk、Metadata、混合召回、Rerank、Query Rewriting、HyDE、Context Window、Token、缓存、延迟、微调、SFT、RLHF、DPO、MoE、多模态、结构化输出、Trace、Observability、Fallback 和 Guardrail。

### 3. 评测与安全

覆盖评测集、Golden Set、Rubric、Good Case、Bad Case、回归集、LLM-as-a-Judge、断言、Precision、Recall、NDCG、MRR、灰度发布、影子流量、Prompt Injection、PII、RBAC、租户隔离、人工审批和审计。

### 4. AI 模型、产品与开发工具

覆盖 DeepSeek、Qwen、Kimi、Claude、GPT、Gemini、Grok、豆包、Hailuo、Sora、Runway、Midjourney、Cursor、Codex、Claude Code、GitHub Copilot、Windsurf、Cline、Roo Code、Trae、Lovable、v0、Replit、Bolt.new、Kiro、Devin、Dify、Coze、n8n、LangChain、LangGraph、Ollama、Hugging Face、ModelScope、百炼、LlamaIndex、Milvus、Pinecone、Chroma、Weaviate、Supabase、Vercel、Docker、Kubernetes、GitHub、GitLab、Jira 和 Perplexity。

### 5. 项目专属术语

覆盖 GEO 的 AI 搜索、AI Overviews、AI Mode、Answer Engine、提及率、引用率、Share of Voice、实体、情感分析、AI 表达倾向、Visibility Score、推荐强度、信源率、Prompt Set、归因引擎、品牌认知资产、JSON-LD、SERP；以及旅游智能营销的 CDP、CRM、OTA、用户分群、意图识别、线索评分、营销自动化、多触点归因、转化漏斗、推荐系统、动态定价、动态需求摘要、购买意图识别、公转私、套餐检索、下一最佳动作、AI 与真人协同和来源内容归因。

## 词条结构

每个应解释的概念保留：别名、一句话定义、解决的问题、实现链路、适用边界、局限、可口述回答、与 RAG / Workflow / Agent / Skill 等概念的关系。

纯品牌名、产品名和工具名至少保留标准名与常见中文名、拆读、大小写错误、同音或 ASR 易错写法；不把未经证实的“官方全称”写入别名。

## 语音归一规则

1. 低风险别名可以全局归一：例如“扣子”到 Coze、“RH”到 RAG、“COSER”到 Cursor。
2. 歧义词必须受语境限制：例如“Lope”仅在“什么是 / 是什么意思 / 定义”等短释义问法且不存在模型、MoE、推理、并行、算法等专名上下文时，纠正为 Loop。
3. 普通中文词不能因同音被强行改成品牌或技术名：例如“最优”只在项目、平台、品牌增长等上下文中归一为 GEO；真实的规模化讨论不改为 Skill。
4. 归一化后的标准词同时用于检索、回答范围判断和界面显示，减少用户看到 ASR 错词、系统却按另一词检索的断裂。

## 检索与生成边界

术语表只参与 `normalizeQuestion`，不会进入 `bundledKnowledgeFiles` 或文档库候选资料，因此左侧资料库不会把术语解释冒充项目原文。

当术语题没有命中通用资料时，LLM 可以做通用解释，但必须禁止：虚构产品、模型、架构、缩写或英文全称；不得把单个英文词强行解释为某项专有技术。普通词按常用含义回答，例如 Loop 为循环/闭环。

## 同步与验证

1. 更新 `AI产品经理术语表.md` 与 `src/glossary.js`。
2. 通过本地 `/api/glossary` 上传更新后的 Markdown 到当前 Electron 服务。
3. 为新增词条与语音误识别写测试，先观察失败，再实现最小规则。
4. 验证术语表不会出现在资料库检索候选中。
5. 用实际 `/api/generate` 对代表性定义题做回归，检查回答不虚构专名。

## 成功标准

- 覆盖上述五层常用 AI 词汇并维持可维护的分组。
- 典型 ASR 错词能恢复为标准术语，歧义普通词不会被过度纠正。
- 术语表不污染项目原文检索。
- 术语表更新后立即同步到桌面 APP。
