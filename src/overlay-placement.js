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

export function resolveOverlayDragFinish({ mode = "collapsed", bounds, workArea, sizes }) {
  const isExpanded = mode === "expanded";
  const collapsedHeight = sizes.collapsed.height;
  // 底部吸附要以收起后的工具条判断；自由、左右和顶部位置始终以用户眼前的窗口坐标保存。
  const snapBounds = isExpanded
    ? { ...bounds, y: bounds.y + bounds.height - collapsedHeight, height: collapsedHeight }
    : bounds;
  const anchor = resolveOverlaySnap({ bounds: snapBounds, workArea });

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
