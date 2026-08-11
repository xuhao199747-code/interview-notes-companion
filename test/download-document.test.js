import test from "node:test";
import assert from "node:assert/strict";
import { downloadTextFile } from "../src/download-file.js";

test("资料下载使用浏览器 document 创建链接，并在点击后释放临时地址", () => {
  let clicked = false;
  let createdBlob;
  let revokedUrl;
  const link = { href: "", download: "", click: () => { clicked = true; } };
  const documentRef = { createElement: (tag) => { assert.equal(tag, "a"); return link; } };
  const urlRef = {
    createObjectURL: (blob) => { createdBlob = blob; return "blob:interview-document"; },
    revokeObjectURL: (url) => { revokedUrl = url; },
  };

  downloadTextFile({ name: "面试资料.md", text: "# 面试资料", documentRef, urlRef });

  assert.equal(createdBlob.type, "text/markdown;charset=utf-8");
  assert.equal(link.href, "blob:interview-document");
  assert.equal(link.download, "面试资料.md");
  assert.equal(clicked, true);
  assert.equal(revokedUrl, "blob:interview-document");
});
