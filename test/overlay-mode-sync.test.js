import test from "node:test";
import assert from "node:assert/strict";
import { nextOverlayWindowMode } from "../src/overlay-mode-sync.js";

test("同一窗口模式的流式内容更新不重复触发窗口动画", () => {
  assert.equal(nextOverlayWindowMode(null, "collapsed"), "collapsed");
  assert.equal(nextOverlayWindowMode("collapsed", "expanded"), "expanded");
  assert.equal(nextOverlayWindowMode("expanded", "expanded"), null);
});

test("模式真正变化时仍会请求重新定位窗口", () => {
  assert.equal(nextOverlayWindowMode("expanded", "collapsed"), "collapsed");
  assert.equal(nextOverlayWindowMode("collapsed", "settings"), "settings");
});
