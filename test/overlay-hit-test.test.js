import test from "node:test";
import assert from "node:assert/strict";
import { shouldIgnoreOverlayMouse } from "../src/overlay-hit-test.js";

const windowBounds = { x: 300, y: 20, width: 760, height: 52 };
const toolbarRegion = { x: 0, y: 0, width: 760, height: 52 };

test("收起时窗口可见工具栏外的透明区域允许点击穿透", () => {
  assert.equal(shouldIgnoreOverlayMouse({
    mode: "collapsed",
    windowBounds,
    interactiveRegions: [{ x: 330, y: 0, width: 430, height: 52 }],
    cursor: { x: 320, y: 40 }
  }), true);
});

test("收起时鼠标位于识别工具栏上必须保持可点击", () => {
  assert.equal(shouldIgnoreOverlayMouse({
    mode: "collapsed",
    windowBounds,
    interactiveRegions: [toolbarRegion],
    cursor: { x: 700, y: 40 }
  }), false);
});

test("展开回答或尚未收到页面区域时不能穿透，避免控件失效", () => {
  assert.equal(shouldIgnoreOverlayMouse({ mode: "expanded", windowBounds, interactiveRegions: [toolbarRegion], cursor: { x: 320, y: 40 } }), false);
  assert.equal(shouldIgnoreOverlayMouse({ mode: "collapsed", windowBounds, interactiveRegions: [], cursor: { x: 320, y: 40 } }), false);
});
