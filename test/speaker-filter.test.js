import test from "node:test";
import assert from "node:assert/strict";
import { shouldDisplayAsrSentence, shouldRouteAsrSentence, shouldSearchSentence } from "../src/speaker-filter.js";

test("own speaker and unresolved speaker never trigger search", () => {
  assert.equal(shouldSearchSentence({ speaker_id: 2, sentence_type: 1, sentence: "我的回答" }, 2), false);
  assert.equal(shouldSearchSentence({ speaker_id: -1, sentence_type: 1, sentence: "问题" }, 2), false);
  assert.equal(shouldSearchSentence({ speaker_id: 1, sentence_type: 1, sentence: "请介绍项目" }, 2), true);
});

test("豆包没有 speaker 编号时，最终问题仍进入检索", () => {
  assert.equal(shouldRouteAsrSentence({ speaker_id: -1, sentence_type: 1, sentence: "项目有几个 Agent？" }, "doubao", null), true);
  assert.equal(shouldRouteAsrSentence({ speaker_id: -1, sentence_type: 0, sentence: "项目有几个" }, "doubao", null), false);
});

test("豆包的临时识别结果应实时显示，但不应提前触发检索", () => {
  const partial = { speaker_id: -1, sentence_type: 0, sentence: "项目有几个" };
  assert.equal(shouldDisplayAsrSentence(partial, "doubao"), true);
  assert.equal(shouldRouteAsrSentence(partial, "doubao", null), false);
});

test("声纹结果未出时，豆包临时文本不能触发检索", async () => {
  const { readFile } = await import("node:fs/promises");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /gate === "hold" && sentence\.sentence_type !== 1/);
});
