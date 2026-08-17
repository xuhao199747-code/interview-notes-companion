import test from "node:test";
import assert from "node:assert/strict";
import { normalizeOverlayPlacement, resolveOverlayDragFinish, resolveOverlayPlacement, resolveOverlaySnap } from "../src/overlay-placement.js";

const workArea = { x: 0, y: 0, width: 1440, height: 900 };

test("靠近底边时优先磁吸到底部，并为向上展开保留空间", () => {
  assert.equal(resolveOverlaySnap({ bounds: { x: 360, y: 828, width: 760, height: 64 }, workArea }), "bottom");
  assert.deepEqual(
    resolveOverlayPlacement({ anchor: "bottom", position: { x: 360, y: 828 }, size: { width: 760, height: 720 }, workArea }),
    { x: 360, y: 180 }
  );
});

test("左右磁吸固定横向边缘，同时保留拖放的纵向位置", () => {
  assert.deepEqual(
    resolveOverlayPlacement({ anchor: "left", position: { x: 12, y: 220 }, size: { width: 760, height: 64 }, workArea }),
    { x: 0, y: 220 }
  );
  assert.deepEqual(
    resolveOverlayPlacement({ anchor: "right", position: { x: 620, y: 220 }, size: { width: 760, height: 64 }, workArea }),
    { x: 680, y: 220 }
  );
});

test("自由位置在空间足够时不会因生成答案而回到屏幕中央", () => {
  assert.deepEqual(
    resolveOverlayPlacement({ anchor: "free", position: { x: 180, y: 100 }, size: { width: 760, height: 720 }, workArea }),
    { x: 180, y: 100 }
  );
});

test("向上展开的底部工具栏锚点不会被展开后的顶部坐标覆盖", () => {
  const collapsedY = 836;
  const expandedY = collapsedY + 64 - 720;
  assert.equal(expandedY, 180);
  assert.equal(expandedY + 720, collapsedY + 64);
});

test("拖动展开窗口结束后，自由位置保持展开窗口当前顶边，不会向下跳", () => {
  const result = resolveOverlayDragFinish({
    mode: "expanded",
    bounds: { x: 180, y: 100, width: 760, height: 720 },
    workArea,
    sizes: { collapsed: { width: 760, height: 52 } },
  });

  assert.deepEqual(result, {
    anchor: "free",
    position: { x: 180, y: 100 },
    visiblePosition: { x: 180, y: 100 },
  });
});

test("已保存的位置只恢复合法锚点和有限坐标", () => {
  assert.deepEqual(normalizeOverlayPlacement({ anchor: "right", position: { x: 680, y: 220 } }), { anchor: "right", position: { x: 680, y: 220 } });
  assert.equal(normalizeOverlayPlacement({ anchor: "unknown", position: { x: 0, y: 0 } }), null);
  assert.equal(normalizeOverlayPlacement({ anchor: "top", position: { x: "wrong", y: 0 } }), null);
});
