export const overlaySnapDistance = 28;

const validAnchors = new Set(["free", "left", "right", "top", "bottom"]);

export function normalizeOverlayPlacement(value) {
  if (!value || !validAnchors.has(value.anchor) || !Number.isFinite(value.position?.x) || !Number.isFinite(value.position?.y)) return null;
  return { anchor: value.anchor, position: { x: Math.round(value.position.x), y: Math.round(value.position.y) } };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function resolveOverlaySnap({ bounds, workArea, distance = overlaySnapDistance }) {
  const left = Math.abs(bounds.x - workArea.x);
  const right = Math.abs(workArea.x + workArea.width - (bounds.x + bounds.width));
  const top = Math.abs(bounds.y - workArea.y);
  const bottom = Math.abs(workArea.y + workArea.height - (bounds.y + bounds.height));
  const nearest = [["left", left], ["right", right], ["top", top], ["bottom", bottom]].sort((a, b) => a[1] - b[1])[0];
  return nearest[1] <= distance ? nearest[0] : "free";
}

export function resolveOverlayPlacement({ anchor = "free", position, size, workArea }) {
  const maxX = workArea.x + workArea.width - size.width;
  const maxY = workArea.y + workArea.height - size.height;
  const x = clamp(position.x, workArea.x, maxX);
  const y = clamp(position.y, workArea.y, maxY);
  if (anchor === "left") return { x: workArea.x, y };
  if (anchor === "right") return { x: maxX, y };
  if (anchor === "top") return { x, y: workArea.y };
  if (anchor === "bottom") return { x, y: maxY };
  return { x, y };
}

// 紧凑态只显示完整工具栏最右侧的恢复按钮。恢复完整工具栏时要保留
// 这个按钮的屏幕位置（即紧凑窗的右边界），不能复用紧凑窗的左边界，
// 否则 760px 工具栏会整体跑到屏幕右侧。
export function resolveCompactRestorePlacement({ compactBounds, anchor = "free", size, workArea }) {
  const position = {
    x: compactBounds.x + compactBounds.width - size.width,
    y: compactBounds.y,
  };
  return resolveOverlayPlacement({ anchor, position, size, workArea });
}

export function resolveOverlayDragFinish({ mode = "collapsed", bounds, workArea, sizes }) {
  const isExpanded = mode === "expanded";
  const isCompact = mode === "compact";
  const collapsedHeight = sizes.collapsed.height;
  // 底部吸附要以收起后的工具条判断；自由、左右和顶部位置始终以用户眼前的窗口坐标保存。
  const snapBounds = isExpanded
    ? { ...bounds, y: bounds.y + bounds.height - collapsedHeight, height: collapsedHeight }
    : bounds;
  const anchor = resolveOverlaySnap({ bounds: snapBounds, workArea });

  // 紧凑态显示的只是未折叠工具栏右端的一小块。吸附判定使用用户实际看到
  // 的小窗口，但保存的位置必须换算回完整工具栏，否则恢复时会跳到屏幕外。
  if (isCompact) {
    const visiblePosition = resolveOverlayPlacement({ anchor, position: bounds, size: bounds, workArea });
    const position = resolveCompactRestorePlacement({
      compactBounds: { ...bounds, ...visiblePosition },
      anchor,
      size: sizes.collapsed,
      workArea,
    });
    return { anchor, position, visiblePosition };
  }

  if (isExpanded && anchor === "bottom") {
    const position = resolveOverlayPlacement({ anchor, position: snapBounds, size: snapBounds, workArea });
    return {
      anchor,
      position,
      visiblePosition: { x: position.x, y: position.y + collapsedHeight - bounds.height },
    };
  }

  const position = resolveOverlayPlacement({ anchor, position: bounds, size: bounds, workArea });
  return { anchor, position, visiblePosition: position };
}
