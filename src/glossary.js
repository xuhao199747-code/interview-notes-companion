export const defaultGlossary = [
  { term: "LLM", aliases: ["大语言模型", "大型语言模型", "Large Language Model", "L L M", "L.M.L"] },
  { term: "AIGC", aliases: ["生成式 AI", "生成式人工智能", "A I G C", "A.I.G.C"] },
  { term: "OpenAI", aliases: ["Open AI", "OpenAI 公司"] },
  { term: "ChatGPT", aliases: ["Chat G P T", "GPT Chat", "ChatGPT 模型"] },
  { term: "Coze", aliases: ["扣子", "字节扣子", "Coze 平台"] },
  { term: "RAG", aliases: ["检索增强生成", "检索增强", "知识库问答", "向量检索"] },
  { term: "Agent", aliases: ["智能体", "多智能体", "代理"] },
  { term: "Workflow", aliases: ["工作流", "固定流程", "编排流程"] },
  { term: "Loop", aliases: ["循环", "反馈循环", "迭代闭环"] },
  { term: "Skill", aliases: ["技能", "提示词技能", "回答规则"] },
  { term: "Tool", aliases: ["工具调用", "函数调用", "Function Calling"] },
  { term: "AI 产品评测", aliases: ["评测", "评估", "测试集", "效果评估", "坏案例", "Badcase"] },
  { term: "高风险场景", aliases: ["人工兜底", "人工接管", "安全护栏"] },
  { term: "Embedding", aliases: ["嵌入模型", "向量化"] },
  { term: "MCP", aliases: ["模型上下文协议"] },
  { term: "Function Calling", aliases: ["函数调用", "函数工具调用", "function call", "function calling"] },
  { term: "Vector Database", aliases: ["向量数据库", "向量库", "向量存储"] },
  { term: "BM25", aliases: ["BM 二五", "B M 25", "B M 二五"] },
  { term: "GraphRAG", aliases: ["图检索增强生成", "图谱 RAG", "图 RAG"] },
  { term: "RAGAS", aliases: ["RAG 评测框架", "RAG 评估框架"] },
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
  { term: "情感分析", aliases: ["品牌口碑舆情", "舆情分析", "情绪分析", "正负面分析"] },
  { term: "AI 表达倾向", aliases: ["AI 说品牌是正面的", "正向比例", "情感正向比例", "AI 情感倾向"] },
  { term: "Visibility Score", aliases: ["品牌总可见度", "可见度得分", "可视度总分", "品牌可视度"] },
  { term: "推荐强度", aliases: ["推荐程度", "首推占比", "AI 推荐力度"] },
  { term: "信源率", aliases: ["信源覆盖率", "引用信源率", "来源覆盖率"] },
  { term: "Prompt Set", aliases: ["问题集", "监测问题集", "提示词集合", "标准问题集"] },
  { term: "归因引擎", aliases: ["问题归因", "原因诊断", "指标归因"] },
  { term: "品牌认知资产", aliases: ["AI 品牌认知", "品牌 AI 认知", "品牌认知管理"] },
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
  { term: "动态需求摘要", aliases: ["游客需求卡", "需求卡", "旅游需求卡", "需求摘要"] },
  { term: "动态购买意图识别", aliases: ["旅游客户购买意图", "购买意图识别", "意向分级", "高低意向判断"] },
  { term: "公转私", aliases: ["把客户引到企微", "引导到企微", "转私域", "公域转私域"] },
  { term: "标准套餐检索与比较", aliases: ["旅游套餐怎么匹配", "套餐匹配", "套餐比较", "产品匹配"] },
  { term: "下一最佳动作", aliases: ["下一步怎么跟进", "下一动作", "后续动作建议"] },
  { term: "AI 与真人协同", aliases: ["旅游转人工", "销售接管", "AI 和销售协作"] },
  { term: "来源内容归因", aliases: ["帖子带来的线索", "内容到成交归因", "帖子来源绑定"] },
  // 以下术语仅用于问题归一化，绝不作为资料库检索或引用来源。
  { term: "Human-in-the-loop", aliases: ["Human in the loop", "HITL", "人在回路", "人类在环", "人工在环", "人机闭环"] },
  { term: "Human-on-the-loop", aliases: ["Human on the loop", "HOTL", "人在环监督", "人类监督"] },
  { term: "Hallucination", aliases: ["模型幻觉", "大模型幻觉", "事实幻觉", "编造内容"] },
  { term: "Grounding", aliases: ["事实锚定", "基于事实回答", "证据锚定"] },
  { term: "Prompt", aliases: ["提示词", "指令词", "提问指令"] },
  { term: "System Prompt", aliases: ["系统提示词", "系统指令", "系统级提示词"] },
  { term: "Few-shot", aliases: ["少样本", "少样本提示", "示例提示"] },
  { term: "Chain-of-Thought", aliases: ["思维链", "链式思考", "CoT"] },
  { term: "Structured Output", aliases: ["结构化输出", "JSON 输出", "格式约束输出"] },
  { term: "JSON Schema", aliases: ["JSON 约束", "JSON格式", "输出 Schema"] },
  { term: "Tool Calling", aliases: ["工具调用", "函数调用", "Function Calling", "函数工具调用"] },
  { term: "Memory", aliases: ["记忆", "会话记忆", "长期记忆", "短期记忆"] },
  { term: "Context Window", aliases: ["上下文窗口", "上下文长度", "上下文容量"] },
  { term: "Planning", aliases: ["任务规划", "计划能力", "任务拆解规划"] },
  { term: "ReAct", aliases: ["推理行动", "思考行动", "Reason Act"] },
  { term: "Model Routing", aliases: ["模型路由", "模型分流", "模型选择路由"] },
  { term: "Fallback", aliases: ["降级兜底", "模型降级", "失败兜底"] },
  { term: "Caching", aliases: ["结果缓存", "语义缓存", "响应缓存"] },
  { term: "Token", aliases: ["令牌", "词元", "Token 消耗"] },
  { term: "Latency", aliases: ["响应延迟", "响应时间", "推理延迟", "延迟"] },
  { term: "Observability", aliases: ["可观测性", "运行观测", "链路观测"] },
  { term: "Prompt Versioning", aliases: ["提示词版本管理", "Prompt 版本", "提示词版本"] },
  { term: "Red Teaming", aliases: ["红队测试", "对抗测试", "安全攻防测试"] },
  { term: "Content Moderation", aliases: ["内容审核", "内容安全审核", "违规内容识别"] },
  { term: "PII", aliases: ["个人隐私信息", "个人可识别信息", "敏感个人信息"] },
  { term: "RBAC", aliases: ["角色权限控制", "基于角色的权限", "角色权限"] },
  { term: "Tenant Isolation", aliases: ["租户隔离", "多租户隔离", "客户数据隔离"] },
  { term: "SFT", aliases: ["监督微调", "有监督微调", "指令微调"] },
  { term: "RLHF", aliases: ["人类反馈强化学习", "人工反馈强化学习"] },
  { term: "DPO", aliases: ["直接偏好优化", "偏好优化"] },
  { term: "Synthetic Data", aliases: ["合成数据", "生成数据", "模拟数据"] },
  // 检索与知识工程
  { term: "Sparse Retrieval", aliases: ["稀疏检索", "关键词检索", "词法检索"] },
  { term: "Dense Retrieval", aliases: ["密集检索", "向量召回", "语义召回"] },
  { term: "ANN", aliases: ["近似最近邻", "近似近邻搜索", "向量近邻索引"] },
  { term: "Query Rewriting", aliases: ["查询改写", "问题改写", "检索词改写"] },
  { term: "HyDE", aliases: ["假设文档嵌入", "假设性文档", "虚拟文档检索"] },
  { term: "Multi-query Retrieval", aliases: ["多查询检索", "多路召回", "多问题扩展"] },
  { term: "Parent-child Chunking", aliases: ["父子切片", "父子分块", "父子文档"] },
  { term: "Contextual Retrieval", aliases: ["上下文检索", "上下文感知检索"] },
  { term: "Knowledge Graph", aliases: ["知识图谱", "实体关系图谱", "图谱检索"] },
  { term: "ACL", aliases: ["访问控制列表", "文档权限过滤", "资料权限过滤"] },
  // Agent 与执行编排
  { term: "Planner", aliases: ["规划器", "计划智能体", "任务规划器"] },
  { term: "Executor", aliases: ["执行器", "执行智能体", "任务执行器"] },
  { term: "Orchestrator", aliases: ["编排器", "调度智能体", "主控智能体"] },
  { term: "Multi-agent", aliases: ["多智能体", "多 Agent", "多代理协作"] },
  { term: "State Machine", aliases: ["状态机", "状态流转", "状态编排"] },
  { term: "Checkpoint", aliases: ["检查点", "断点恢复", "执行存档"] },
  { term: "Human Approval", aliases: ["人工审批", "人工批准", "审批节点"] },
  { term: "A2A", aliases: ["智能体对智能体", "Agent 对 Agent", "智能体协议"] },
  { term: "Agentic Workflow", aliases: ["智能体工作流", "Agent 工作流", "受控智能体流程"] },
  { term: "MCP Server", aliases: ["MCP 服务", "MCP 服务器", "模型上下文协议服务"] },
  { term: "Computer Use", aliases: ["电脑使用 Agent", "计算机使用智能体", "操作电脑的智能体"] },
  { term: "Browser Use", aliases: ["浏览器操作", "浏览器智能体", "网页操作智能体"] },
  { term: "Deep Research", aliases: ["深度研究", "深度调研", "深度搜索", "深度检索"] },
  { term: "Idempotency", aliases: ["幂等", "幂等性", "重复调用不重复执行"] },
  { term: "Rate Limiting", aliases: ["限流", "速率限制", "调用频控"] },
  { term: "Timeout", aliases: ["超时", "调用超时", "请求超时"] },
  { term: "Retry", aliases: ["重试", "失败重试", "自动重试"] },
  // 模型、推理与性能
  { term: "Foundation Model", aliases: ["基础模型", "基座模型", "底座模型"] },
  { term: "Multimodal", aliases: ["多模态", "图文多模态", "文本图像视频"] },
  { term: "VLM", aliases: ["视觉语言模型", "视觉大模型", "图文理解模型"] },
  { term: "ASR", aliases: ["语音转文字", "语音识别", "自动语音识别"] },
  { term: "TTS", aliases: ["文本转语音", "语音合成", "文字转语音"] },
  { term: "STT", aliases: ["语音转文本", "Speech to Text"] },
  { term: "SLM", aliases: ["小语言模型", "小模型", "Small Language Model"] },
  { term: "MoE", aliases: ["混合专家", "专家混合模型", "Mixture of Experts"] },
  { term: "Inference", aliases: ["推理", "模型推理", "在线推理"] },
  { term: "Reasoning Model", aliases: ["推理模型", "思考模型", "深度推理模型"] },
  { term: "Context Caching", aliases: ["上下文缓存", "前缀缓存", "KV 缓存"] },
  { term: "Batching", aliases: ["批处理", "批量推理", "请求批处理"] },
  { term: "Throughput", aliases: ["吞吐量", "并发吞吐", "处理能力"] },
  { term: "TTFT", aliases: ["首 Token 延迟", "首字延迟", "首响应时间"] },
  { term: "Quantization", aliases: ["量化", "模型量化", "低比特量化"] },
  { term: "Distillation", aliases: ["蒸馏", "知识蒸馏", "模型蒸馏"] },
  { term: "LoRA", aliases: ["低秩适配", "轻量微调", "LoRA 微调"] },
  { term: "PEFT", aliases: ["参数高效微调", "高效微调"] },
  // 评测、实验与上线
  { term: "Offline Evaluation", aliases: ["离线评测", "离线评估", "下线评测"] },
  { term: "Online Evaluation", aliases: ["在线评测", "线上评估", "在线效果评估"] },
  { term: "A/B Test", aliases: ["AB 测试", "A B 测试", "对照实验", "分流实验"] },
  { term: "Shadow Mode", aliases: ["影子流量", "影子模式", "影子测试"] },
  { term: "Canary Release", aliases: ["灰度发布", "金丝雀发布", "小流量发布"] },
  { term: "Feature Flag", aliases: ["功能开关", "特性开关", "灰度开关"] },
  { term: "Drift", aliases: ["漂移", "模型漂移", "数据漂移", "提示词漂移"] },
  { term: "Error Analysis", aliases: ["错误分析", "误差分析", "失败归因"] },
  { term: "Evals", aliases: ["模型评测", "AI 评估", "评估体系"] },
  { term: "Inter-annotator Agreement", aliases: ["标注一致性", "标注员一致性", "多人标注一致性"] },
  { term: "Calibration", aliases: ["校准", "置信度校准", "概率校准"] },
  // 安全、治理和合规
  { term: "Jailbreak", aliases: ["越狱攻击", "提示词越狱", "绕过安全限制"] },
  { term: "Data Leakage", aliases: ["数据泄露", "隐私泄露", "敏感信息泄露"] },
  { term: "Data Residency", aliases: ["数据驻留", "数据本地化", "数据存储地域"] },
  { term: "Data Lineage", aliases: ["数据血缘", "数据来源追溯", "数据链路追溯"] },
  { term: "Audit Log", aliases: ["审计日志", "操作审计", "审计记录"] },
  { term: "Least Privilege", aliases: ["最小权限", "最小授权", "权限最小化"] },
  { term: "Content Filter", aliases: ["内容过滤", "安全过滤", "内容安全筛选"] },
  { term: "Responsible AI", aliases: ["负责任 AI", "可信 AI", "AI 治理"] },
  { term: "Bias", aliases: ["偏见", "算法偏见", "模型偏差"] },
  { term: "Explainability", aliases: ["可解释性", "结果解释", "决策解释"] },
  { term: "Tenant Isolation", aliases: ["租户隔离", "多租户隔离", "客户数据隔离"] },
  // 深层模型与算法：作为热词与检索标准名，不把它们当作可引用资料。
  { term: "Transformer", aliases: ["变换器模型", "Transformer 架构", "注意力架构"] },
  { term: "Attention", aliases: ["注意力机制", "注意力层"] },
  { term: "Self-Attention", aliases: ["自注意力", "自注意力机制"] },
  { term: "Cross-Attention", aliases: ["交叉注意力", "跨注意力"] },
  { term: "RoPE", aliases: ["旋转位置编码", "旋转位置嵌入"] },
  { term: "KV Cache", aliases: ["键值缓存", "KV 缓存", "K V Cache"] },
  { term: "Speculative Decoding", aliases: ["投机解码", "推测解码"] },
  { term: "Beam Search", aliases: ["束搜索", "波束搜索"] },
  { term: "Top-p Sampling", aliases: ["核采样", "Top P 采样"] },
  { term: "Temperature", aliases: ["温度参数", "采样温度"] },
  { term: "BERT", aliases: ["双向编码器", "伯特模型"] },
  { term: "Cross-Encoder", aliases: ["交叉编码器", "交叉 Encoder"] },
  { term: "ColBERT", aliases: ["后期交互检索", "Col BERT"] },
  { term: "BGE-M3", aliases: ["BGE M3", "贝吉 M3"] },
  { term: "E5", aliases: ["E 五", "文本嵌入 E5"] },
  { term: "HNSW", aliases: ["分层可导航小世界", "H N S W"] },
  { term: "IVF", aliases: ["倒排文件索引", "I V F"] },
  { term: "FAISS", aliases: ["费斯", "Faiss 向量索引"] },
  { term: "Qdrant", aliases: ["库德兰特", "Qdrant 向量库"] },
  { term: "pgvector", aliases: ["PG Vector", "Postgres 向量", "PostgreSQL 向量"] },
  { term: "Elasticsearch", aliases: ["Elastic Search", "ES 搜索", "弹性搜索"] },
  { term: "OpenSearch", aliases: ["Open Search", "OpenSearch 引擎"] },
  // Agent、协议和框架。
  { term: "Loop MCP", aliases: ["Loop 的 MCP", "Loop MCP Server", "路普 MCP"] },
  { term: "ACP", aliases: ["Agent Client Protocol", "智能体客户端协议", "A C P"] },
  { term: "AG-UI", aliases: ["Agent UI 协议", "AG UI", "A G UI"] },
  { term: "OpenClaw", aliases: ["Open Claw", "欧喷扣", "欧朋克劳", "OpenClaw.viki"] },
  { term: "Self-Evolving Agent", aliases: ["自我进化智能体", "自归进化智能体", "自进化 Agent", "Self Evolving Agent"] },
  { term: "Reflection", aliases: ["反思机制", "反省机制", "自我反思"] },
  { term: "Self-Refine", aliases: ["自我精炼", "自我改进", "Self Refine"] },
  { term: "Tree of Thoughts", aliases: ["思维树", "ToT", "Tree of Thought"] },
  { term: "Mixture of Agents", aliases: ["智能体混合", "MoA", "混合智能体"] },
  { term: "CrewAI", aliases: ["Crew AI", "克鲁 AI"] },
  { term: "AutoGen", aliases: ["Auto Gen", "自动智能体框架"] },
  { term: "Semantic Kernel", aliases: ["语义内核", "SemanticKernel"] },
  { term: "PydanticAI", aliases: ["Pydantic AI", "派丹提克 AI"] },
  { term: "DSPy", aliases: ["D S Py", "迪斯派"] },
  { term: "Haystack", aliases: ["Hay Stack", "海斯塔克"] },
  { term: "Flowise", aliases: ["Flowise AI", "弗洛维斯"] },
  { term: "OpenAI Agents SDK", aliases: ["OpenAI Agent SDK", "OpenAI 智能体 SDK"] },
  // 模型、推理服务与评测工具。
  { term: "vLLM", aliases: ["V LLM", "VLLM", "微 LLM", "V L L M"] },
  { term: "SGLang", aliases: ["SG Lang", "S G Lang"] },
  { term: "TensorRT-LLM", aliases: ["Tensor RT LLM", "TensorRT LLM"] },
  { term: "ONNX Runtime", aliases: ["ONNX", "ONNX 推理", "ONNX Runtime"] },
  { term: "DeepEval", aliases: ["Deep Eval", "深度评测"] },
  { term: "TruLens", aliases: ["TrueLens", "特鲁伦斯"] },
  { term: "Arize Phoenix", aliases: ["Phoenix 观测", "凤凰评测"] },
  { term: "LangSmith", aliases: ["Lang Smith", "朗史密斯"] },
  { term: "Promptfoo", aliases: ["Prompt Foo", "提示词测试工具"] },
  { term: "Giskard", aliases: ["吉斯卡德", "Giskard 评测"] },
  { term: "Langfuse", aliases: ["Lang Fuse", "朗福斯", "朗弗斯"] },
  { term: "LobeChat", aliases: ["Lobe Chat", "洛布 Chat", "萝卜 Chat"] },
  { term: "DeepSeek-R1", aliases: ["DeepSeek R1", "深度求索 R1", "Deep Sleep R1"] },
  { term: "DeepSeek-V3", aliases: ["DeepSeek V3", "深度求索 V3"] },
  { term: "Qwen3", aliases: ["千问三", "通义千问三", "Qwen 3"] },
  { term: "GLM-4", aliases: ["智谱 GLM4", "GLM 四", "G L M 4"] },
  { term: "Llama", aliases: ["拉马模型", "LLaMA", "Llama 模型"] },
  { term: "Mistral", aliases: ["米斯特拉尔", "Mistral 模型"] },
  { term: "Gemma", aliases: ["杰玛模型", "Gemma 模型"] },
];

// 这层不受用户上传术语表覆盖：用于修正 ASR 对 AI 产品高频缩写的稳定误识别。
const asrCorrections = [
  { term: "RAG", aliases: ["IG", "AIG", "RH", "R H", "R A G", "R G", "阿瑞吉", "艾瑞吉"] },
  { term: "AIGC", aliases: ["A I G C", "A.I.G.C", "生成式人工智能"] },
  // 面试语境中的 BM25 常被 ASR 听成空气指标 PM2.5；数字会保留而首字母误判。
  // 这些是面试口语里的稳定称呼，不等同于把全部术语表强加到普通文本。
  { term: "Function Calling", aliases: ["函数工具调用", "function call", "function calling"] },
  { term: "RAGAS", aliases: ["RAG 评估", "RAG 评测", "R A G A S", "瑞格斯"] },
  { term: "Vector Database", aliases: ["向量数据库", "向量库", "Vector DB", "向量 DB"] },
  { term: "GraphRAG", aliases: ["图检索增强生成", "图谱 RAG", "图 RAG", "Graph RAG", "格拉夫 RAG"] },
  { term: "Computer Use", aliases: ["电脑使用 Agent", "计算机使用智能体"] },
  { term: "ASR", aliases: ["语音转文字", "自动语音识别"] },
  { term: "TTS", aliases: ["文本转语音", "语音合成"] },
  { term: "A2A", aliases: ["智能体对智能体", "Agent 对 Agent", "A 2 A", "A 二 A"] },
  { term: "Coze", aliases: ["扣子", "扣字", "扣子平台"] },
  // “Skill”常被语音转写为重复的“Scale.scale”；单独的 Scale 保留给真实的 Scale AI。
  { term: "Skill", aliases: ["Scale.scale", "Scale Scale", "scale scale", "Scale.skill", "scale.skill", "skill skill", "斯给尔", "斯基尔"] },
  { term: "Agent", aliases: ["安吉特", "安杰特", "agent agent"] },
  { term: "Workflow", aliases: ["沃克流", "沃克弗洛", "work flow", "workflow workflow"] },
  { term: "Tool", aliases: ["图尔", "tool tool"] },
  { term: "MCP Server", aliases: ["M C P 服务", "M C P 服务器", "MCP 服务", "MCP 服务器", "艾姆西皮服务", "艾姆西皮服务器"] },
  { term: "MCP", aliases: ["M C P", "艾姆西皮", "MCP 协议"] },
  { term: "LLM", aliases: ["L L M", "L.M.L", "L．M．L", "艾尔艾尔艾姆", "大语言模型", "大型语言模型"] },
  { term: "OpenAI", aliases: ["Open AI", "欧喷 AI"] },
  { term: "ChatGPT", aliases: ["Chat G P T", "G P T Chat", "查特 GPT"] },
  { term: "Human-in-the-loop", aliases: ["human in the loop", "human-in-the-loop", "H I T L", "人在环路", "人类在环路", "人工在环路"] },
  { term: "Human-on-the-loop", aliases: ["human on the loop", "human-on-the-loop", "H O T L"] },
  { term: "Hallucination", aliases: ["哈鲁西内申", "哈露西内申", "hallucination"] },
  { term: "Few-shot", aliases: ["few shot", "菲优少特", "F S"] },
  { term: "Chain-of-Thought", aliases: ["chain of thought", "Chain of Thought", "C O T"] },
  { term: "Structured Output", aliases: ["structured output", "structure output", "结构化 out put"] },
  { term: "Model Routing", aliases: ["model routing", "模型路由器", "model route"] },
  // AI 产品面试中高频但容易被英文连读/近音写错的通用概念。
  // 这些规则只用于问题归一化，不作为资料库内容或事实来源。
  { term: "Memory", aliases: ["memory", "memories", "memory memory", "美摩瑞", "梅莫瑞", "麦莫瑞"] },
  { term: "Context Engineering", aliases: ["context engineering", "context engineer", "康泰克斯工程", "康泰斯工程", "上下文工程"] },
  { term: "Prompt Engineering", aliases: ["prompt engineering", "prompt engineer", "普罗姆特工程", "提示词工程"] },
  { term: "Fine-tuning", aliases: ["fine tuning", "fine-tuning", "fined tuning", "范调宁"] },
  { term: "Agent Orchestration", aliases: ["agent orchestration", "agent orchestrator", "安吉特编排", "智能体编排", "Agent 编排"] },
  { term: "Multi-agent", aliases: ["multi agent", "multi-agent", "multiagents", "多 Agent", "多智能体"] },
  { term: "KV Cache", aliases: ["k v cache", "k v cash", "kv cash", "K V 缓存", "键值缓存"] },
  { term: "Semantic Cache", aliases: ["semantic cache", "语义 cash", "语义缓存"] },
  { term: "Context Window", aliases: ["context window", "康泰克斯窗口", "上下文窗口"] },
  { term: "Prompt Injection", aliases: ["prompt injection", "普罗姆特注入", "提示词注入"] },
  { term: "LoRA", aliases: ["lowra", "lora", "low ra", "L O R A", "萝拉", "洛拉"] },
  { term: "Embedding", aliases: ["Embeding", "安贝丁", "恩贝丁"] },
  { term: "Rerank", aliases: ["re rank", "瑞兰克", "锐兰克"] },
  { term: "MoE", aliases: ["M O E", "摩伊", "魔伊"] },
  { term: "LoRA", aliases: ["L O R A", "萝拉", "洛拉"] },
  { term: "SFT", aliases: ["S F T", "艾斯艾弗提"] },
  { term: "RLHF", aliases: ["R L H F", "艾尔艾尺艾弗"] },
  { term: "DPO", aliases: ["D P O", "迪皮欧"] },
  { term: "NDCG", aliases: ["N D C G", "恩迪西吉"] },
  { term: "MRR", aliases: ["M R R", "艾姆阿尔阿尔"] },
  { term: "Rubric", aliases: ["鲁布里克", "露布里克"] },
  { term: "Trace", aliases: ["trace trace", "特瑞斯"] },
  // 本应用只处理 AI 面试问题：ASR 常将 ReAct 写成 React，统一按 Agent 的推理—行动模式处理。
  { term: "ReAct", aliases: ["React", "Re Act", "瑞艾克特"] },
  { term: "Harness", aliases: ["哈尼斯", "哈内斯"] },
  // AI 编程工具常以英文发音出现，ASR 往往保留了近似拼写；统一后才能命中术语表和产品分析题。
  { term: "Cursor", aliases: ["COSER", "Coser", "卡瑟", "卡色", "卡索"] },
  { term: "Qoder", aliases: ["quder", "Quder", "quoder", "Quoder", "扣德儿", "扣德尔", "库德儿", "库德尔", "扣德", "库德", "Q coder"] },
  { term: "Work Buddy", aliases: ["WorkBuddy", "work buddy", "workbuddy", "Worker Buddy", "worker buddy", "workerbuddy", "沃克巴迪", "沃克巴弟", "沃克巴蒂", "沃克巴蒂"] },
  { term: "DeepSeek Harness", aliases: ["Deepseek harness", "Deep Seek Harness", "deepseek harness", "deep seek harnes", "deep seek harness", "deep seek hennessy", "deep sick harness", "deep sick harnes", "deep sick hennessey", "deepseek hennessy", "迪普西克哈尼斯", "迪普斯克哈尼斯", "深度求索哈尼斯"] },
  { term: "Claude Code", aliases: ["Claude 扣得", "Claude code", "cloud code", "克劳德扣得", "克劳德代码", "克劳德 code", "Claude C O D E", "克劳德扣德", "Claude coder"] },
  { term: "Codex", aliases: ["code x", "code ex", "c o d e x", "kodeks", "可戴克斯", "扣得 X", "Codex CLI", "OpenAI Codex"] },
  { term: "GitHub Copilot", aliases: ["哥派勒", "Copilot", "GitHub copilot", "Git Hub Copilot"] },
  { term: "Windsurf", aliases: ["温室", "Wind surf", "温瑟夫"] },
  { term: "Cline", aliases: ["克莱恩", "C line"] },
  { term: "Roo Code", aliases: ["Roo code", "鲁代码", "Roo扣德"] },
  { term: "Trae", aliases: ["Trae IDE", "吹", "特雷"] },
  { term: "Lovable", aliases: ["拉弗布尔", "Loveable"] },
  { term: "v0", aliases: ["V 零", "V0", "V zero"] },
  { term: "Replit", aliases: ["Replit", "瑞普利特", "瑞皮特"] },
  { term: "Bolt.new", aliases: ["Bolt new", "Bolt", "博尔特 new"] },
  { term: "Kiro", aliases: ["凯洛", "开罗", "K 罗"] },
  { term: "Devin", aliases: ["戴文", "德文", "Devon"] },
  { term: "Dify", aliases: ["迪飞", "D 菲", "Dify AI"] },
  { term: "n8n", aliases: ["恩8恩", "N 八 N", "n 8 n"] },
  { term: "LangChain", aliases: ["朗链", "兰姆链", "Lang chain", "蓝链"] },
  { term: "LangGraph", aliases: ["朗图", "兰姆图", "Lang graph", "蓝图"] },
  { term: "Langfuse", aliases: ["Lang Fuse", "朗福斯", "朗弗斯"] },
  { term: "LobeChat", aliases: ["Lobe Chat", "洛布 Chat", "萝卜 Chat"] },
  { term: "Flowise", aliases: ["Flowise AI", "弗洛维斯"] },
  { term: "LangSmith", aliases: ["Lang Smith", "朗史密斯"] },
  { term: "Ollama", aliases: ["欧拉马", "奥拉马", "O lama"] },
  { term: "Milvus", aliases: ["米尔维斯", "密尔维斯", "Milvus 向量库"] },
  { term: "ModelScope", aliases: ["魔搭", "模型范围", "Model scope"] },
  { term: "百炼", aliases: ["阿里百炼", "百炼平台", "BaiLian"] },
  { term: "Hugging Face", aliases: ["哈金费斯", "抱脸", "HuggingFace"] },
  { term: "LlamaIndex", aliases: ["拉马索引", "Llama index"] },
  { term: "Pinecone", aliases: ["派恩空", "松果向量库"] },
  { term: "Chroma", aliases: ["克罗马", "ChromaDB"] },
  { term: "Weaviate", aliases: ["微维特", "维维特"] },
  { term: "Supabase", aliases: ["苏帕贝斯", "Supabase 数据库"] },
  { term: "Vercel", aliases: ["维赛尔", "弗塞尔"] },
  { term: "Docker", aliases: ["多克", "道克", "Docker 容器"] },
  { term: "Kubernetes", aliases: ["库伯内斯", "K 八 S", "K8s"] },
  { term: "GitHub", aliases: ["Git Hub", "吉特哈布"] },
  { term: "GitLab", aliases: ["Git Lab", "吉特拉布"] },
  { term: "Jira", aliases: ["吉拉", "基拉"] },
  { term: "Figma", aliases: ["菲格马", "费格马"] },
  { term: "Notion", aliases: ["诺申", "Notion AI"] },
  { term: "Perplexity", aliases: ["珀普莱克斯提", "Perplexity AI"] },
  { term: "Midjourney", aliases: ["米德贾尼", "MJ", "M J"] },
  { term: "Sora", aliases: ["索拉", "Sora 视频"] },
  { term: "Runway", aliases: ["润威", "Runway 视频"] },
  { term: "Hailuo", aliases: ["海螺", "海洛", "Hailuo AI"] },
  { term: "DeepSeek", aliases: ["Deep seek", "深度求索", "DS", "迪普西克", "迪普斯克", "帝普西克"] },
  { term: "Qwen", aliases: ["通义千问", "千问", "Qwen 模型", "Q wen", "Q问"] },
  { term: "Kimi K3", aliases: ["Kimi K 3", "Kimi K三", "K 3", "K 三", "Kimi 三代", "Kimi K3 模型"] },
  { term: "Kimi", aliases: ["Kimi AI", "月之暗面", "K 米"] },
  { term: "豆包", aliases: ["Doubao", "抖包"] },
  { term: "Gemini", aliases: ["吉米尼", "杰米尼", "杰米奈"] },
  { term: "Claude", aliases: ["克劳德", "克罗德", "卡劳德", "Claude AI"] },
  { term: "GPT", aliases: ["G P T", "吉皮提"] },
  { term: "Grok", aliases: ["格洛克", "Grock"] },
  { term: "Amazon Q Developer", aliases: ["亚马逊 Q", "Amazon Q", "Q Developer"] },
  { term: "Gemini Code Assist", aliases: ["Gemini 代码助手", "吉米尼代码助手"] },
  // 新增的术语只纠正高置信的音近读法；易与普通中文重叠的定义仍由默认别名层处理。
  { term: "Loop MCP", aliases: ["路普 MCP", "路普 M C P", "Loop 的 MCP", "Loop MCP Server"] },
  { term: "OpenClaw", aliases: ["Open Claw", "欧喷扣", "欧朋克劳", "OpenClaw.viki"] },
  { term: "Self-Evolving Agent", aliases: ["自归进化智能体", "自我进化智能体", "自进化 Agent", "Self Evolving Agent"] },
  { term: "vLLM", aliases: ["V LLM", "V L L M", "VLLM", "微 LLM"] },
  { term: "Qdrant", aliases: ["库德兰特", "库德兰", "Q drant"] },
  { term: "pgvector", aliases: ["P G Vector", "PG Vector", "Postgres Vector"] },
  { term: "OpenSearch", aliases: ["Open Search", "欧喷搜索"] },
  { term: "Cross-Encoder", aliases: ["交叉编码器", "交叉 Encoder", "cross encoder"] },
  { term: "Rerank", aliases: ["重排", "重排序", "重排模型", "rerank 模型"] },
  { term: "FAISS", aliases: ["脸色向量库", "费斯向量库", "Faiss"] },
  { term: "BGE-M3", aliases: ["BGE M3", "B G E M 3", "贝吉 M3"] },
  { term: "DeepSeek", aliases: ["Deep Sleep", "Deep-sleep", "迪普睡客"] },
  // 语音识别会稳定把 GEO 听成 CEO；面试资料检索应优先还原为项目名。
  { term: "GEO", aliases: ["CEO", "GU", "G U", "G E O", "刺幽", "基欧", "极欧", "机欧"] },
];

export function renderGlossaryUploadState(fileName = "") {
  return fileName ? `${fileName}（已自动应用）` : "尚未上传术语表";
}

// 上传词表是用户可维护的扩展层；内置词表是产品持续维护的纠错底座。
// 同名条目尊重用户自己的别名，缺失条目自动补齐，避免新术语上线后旧上传词表失效。
export function mergeGlossaryTerms(uploadedGlossary = []) {
  const uploaded = Array.isArray(uploadedGlossary) ? uploadedGlossary.filter((entry) => entry?.term && Array.isArray(entry.aliases)) : [];
  const uploadedTerms = new Set(uploaded.map((entry) => entry.term));
  return [...uploaded, ...defaultGlossary.filter((entry) => !uploadedTerms.has(entry.term))];
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

function normalizeAmbiguousGeoAsr(question = "") {
  // “最优”是正常业务词，不能全局替换；只有明显在指项目/平台/项目维度时才还原为 GEO。
  return question.replace(/最优(?=\s*(?:这个|该)?\s*(?:项目|平台|品牌增长))/gu, "GEO");
}

function normalizeCompoundCodingToolAsr(question = "") {
  // 先处理包含“Code”的复合品牌名，避免后续把其中的“扣德”单独误改成 Qoder。
  return question
    .replace(/(?:Claude\s*(?:扣得|扣德|代码|code|c\s*o\s*d\s*e|coder)|克劳德\s*(?:扣得|扣德|代码|code|c\s*o\s*d\s*e|coder))/giu, "Claude Code")
    .replace(/(?:OpenAI\s*)?(?:Codex\s*CLI|code\s*x|c\s*o\s*d\s*e\s*x|kodeks|可戴克斯|扣得\s*X)/giu, "Codex");
}

function normalizeSplitProductAsr(question = "") {
  // 豆包有时会把 DeepSeek Harness 拆成“deepfake 有了解吗 + seek Honeys/Harness”，
  // 或吞掉开头的 D，只留下“eepseek Honey”。单独的 Deepfake 仍保持原意。
  return String(question || "").replace(
    /(?:deep\s*fake|deepfake)\s*(?:(?:有了解(?:吗)?|了解(?:吗)?|吗)\s*)?seek\s*(?:honey(?:s)?|harness)/giu,
    "DeepSeek Harness",
  ).replace(
    /(?:d?eep)\s*seek\s*honey(?:s)?/giu,
    "DeepSeek Harness",
  );
}

function normalizeAmbiguousSkillAsr(question = "") {
  // 口语里的 Skill 常被 ASR 写成单独的 “scale”。仅在“术语释义/AI 能力对比”
  // 语境还原，Scale AI 与真实的规模化讨论必须保留原词。
  const isSkillQuestion = /(?:^|\s)scale\s*(?:是(?:什么(?:意思)?|干什么|做什么)|什么意思|怎么(?:做|写|设计|用)|和\s*(?:Agent|Workflow|Tool|RAG|智能体|工作流|工具).*(?:区别|不同|怎么选)|的(?:定义|作用|能力|好处))(?:[？?。！!\s]*$|\s)/iu.test(question);
  const isRealScale = /Scale\s*AI|规模化|扩大(?:到|至)?|扩展(?:到|至)?|用户|流量|并发|成本|算力|参数量|scaling\s*law/iu.test(question);
  return isSkillQuestion && !isRealScale ? question.replace(/(?<![a-z0-9])scale(?![a-z0-9])/giu, "Skill") : question;
}

function normalizeAmbiguousLoopAsr(question = "") {
  // “Lope”既可能是独立专名，也常是语音把普通词 Loop 听错的结果。
  // 只在简短的术语释义题中纠正，带明确模型/推理上下文时保留原词，交给资料或用户进一步确认。
  const isDefinitionQuestion = /(?:什么是|是什么|什么意思|怎么理解|定义|含义)/u.test(question);
  const hasSpecificTechnicalContext = /(?:\bMoE\b|模型|推理|并行|专家|架构|算法|overhead)/iu.test(question);
  return isDefinitionQuestion && !hasSpecificTechnicalContext
    ? question.replace(/(?<![a-z0-9])lope(?![a-z0-9])/giu, "Loop")
    : question;
}

function normalizeAmbiguousBm25Asr(question = "") {
  // PM2.5 是真实空气指标，保留明确的空气质量提问；其他 PM25 读法在本应用中
  // 优先按 AI 检索术语 BM25 处理，避免一句“BM25 是什么”被答成空气污染。
  const hasAirQualityContext = /(?:空气|污染|雾霾|天气|颗粒物|AQI|口罩|环保|呼吸|浓度|指数|超标|今天\s*PM|PM\s*.*很高)/iu.test(question);
  return !hasAirQualityContext
    ? question.replace(/(?<![a-z0-9])p\s*m\s*2(?:\.\s*5|5|五)(?![a-z0-9])/giu, "BM25")
    : question;
}

function normalizeAsrQuestionNoise(question = "") {
  let normalized = String(question || "").trim();
  return normalized.replace(/\s{2,}/gu, " ").trim();
}

export function normalizeQuestion(question = "", glossary = []) {
  const normalizedQuestion = normalizeAsrQuestionNoise(
    normalizeAmbiguousBm25Asr(
      normalizeAmbiguousLoopAsr(
      normalizeAmbiguousSkillAsr(
          normalizeCompoundCodingToolAsr(normalizeSplitProductAsr(normalizeAmbiguousGeoAsr(question))),
        ),
      ),
    ),
  );
  // 跨术语也按“最长别名优先”归一化：例如“库德兰特”必须先于 Qoder 的“库德”处理，
  // 否则短别名会截断更具体的技术名。相同别名时保留前面的高置信 ASR 纠错优先级。
  const replacements = [...asrCorrections, ...glossary]
    .flatMap((entry, entryIndex) => (entry?.term && Array.isArray(entry.aliases)
      ? entry.aliases.filter(Boolean).map((alias, aliasIndex) => ({
        term: entry.term,
        alias,
        entryIndex,
        aliasIndex,
      }))
      : []))
    .sort((left, right) => right.alias.length - left.alias.length
      || left.entryIndex - right.entryIndex
      || left.aliasIndex - right.aliasIndex);

  // 先把命中的原始文本替换成私有占位符，最后一次性还原标准术语。
  // 这样后续的短别名不会再次匹配刚写入的标准术语：例如 GitHub Copilot 不会被 GitHub
  // 二次改写，"重排"也不会覆盖已经归一化的 Rerank。
  const markers = [];
  const marked = replacements.reduce((normalized, { alias, term }) => {
    const marker = `\uE000${String.fromCodePoint(0xE100 + markers.length)}\uE001`;
    markers.push({ marker, term });
    return replaceAlias(normalized, alias, marker);
  }, normalizedQuestion);

  return markers.reduce(
    (normalized, { marker, term }) => normalized.replaceAll(marker, term.trim()),
    marked,
  );
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
