# 面试资料伴侣

一个本地优先的 Markdown 面试资料检索工具，支持浏览器模式和 macOS 桌面应用模式。

## 使用

建议用本地开发服务器运行，程序会自动加载项目里的 `interview-knowledge-base.md`；也可以继续导入自己的 `.md` 文件。语音识别需要浏览器授权麦克风，资料不会上传到服务器。

如果希望通过本地开发服务器运行：

```bash
npm start
```

## macOS 桌面应用

安装依赖后运行：

```bash
npm install
npm run desktop
```

在「设置 → 语音识别」中选择服务并保存配置，然后进入「声纹识别」开始桌面监听：

1. 腾讯云：选择“腾讯云实时语音识别 V2”，保存 AppID、SecretID、SecretKey。
2. 豆包：选择“豆包流式语音识别（火山引擎）”，保存 App ID、Access Token、资源 ID；默认 WebSocket 地址保持不改即可。点击“测试当前语音服务”成功后再开始监听。
3. 点击「刷新音频设备」，允许 macOS 的麦克风权限。
4. 选择会议客户端声音所在的输入设备。桌面客户端通常需要先配置虚拟声卡，使会议输出成为一个音频输入设备。
5. 点击「开始桌面监听」。

腾讯云会显示 Speaker 编号：在「我的说话人编号」中选择自己的编号后，该编号的最终转写不会触发检索。豆包接入会直接把最终识别文本用于检索；当前不具备根据声音样本自动忽略本人的能力。

未选择音频设备、腾讯云鉴权失败、或未确认自己的 Speaker 编号时，应用会明确显示不可用状态且不会自动检索。

如果要启用“资料未命中时 AI 补充回答”，先在当前终端配置兼容 OpenAI Chat Completions 的 API：

```bash
export AI_API_KEY="你的 API Key"
export AI_API_URL="https://api.openai.com/v1/chat/completions"
export AI_MODEL="gpt-4o-mini"
npm start
```

## 当前能力

- 多个 Markdown 文件导入
- 按标题和正文自动切分章节
- 中文问题的本地关键词匹配
- 浏览器 Web Speech 临时听写
- 腾讯云 V2 / 豆包流式语音识别的桌面端实时转写
- Markdown 知识库检索与按 Skill 生成补充回答

## 测试

```bash
npm test
```
