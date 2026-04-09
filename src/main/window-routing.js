function clampToRange(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getVisualSurfaceInsets(size = {}) {
  const width = Number(size.width) || 0;
  const height = Number(size.height) || 0;

  return {
    floorBleed: Math.round(Math.min(18, Math.max(10, height * 0.068))),
    wallBleed: Math.round(Math.min(16, Math.max(8, width * 0.07))),
    ceilingBleed: Math.round(Math.min(10, Math.max(4, height * 0.036)))
  };
}

function computeChatBounds({
  petBounds,
  workArea,
  size,
  expanded = false
} = {}) {
  if (!petBounds || !workArea || !size) {
    return null;
  }

  const x = Math.min(
    Math.max(workArea.x + 12, petBounds.x - Math.round((size.width - petBounds.width) / 2)),
    workArea.x + workArea.width - size.width - 12
  );
  const y = Math.max(workArea.y + 24, petBounds.y - size.height - (expanded ? 12 : 18));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: size.width,
    height: size.height
  };
}

function computeCloneAnchorBounds({
  petBounds,
  workArea,
  cloneSize,
  index = 0,
  scale = 1
} = {}) {
  if (!petBounds || !workArea || !cloneSize) {
    return null;
  }

  const baseX = petBounds.x + Math.round((petBounds.width - cloneSize.width) / 2);
  const cloneInsets = getVisualSurfaceInsets(cloneSize);
  const baseY = petBounds.y + petBounds.height - cloneSize.height + cloneInsets.floorBleed;
  const offsets = [
    { x: Math.round(-118 * scale), y: Math.round(-6 * scale) },
    { x: Math.round(118 * scale), y: Math.round(-4 * scale) },
    { x: Math.round(228 * scale), y: Math.round(-2 * scale) }
  ];
  const offset = offsets[index] || {
    x: Math.round((118 + (index * 92)) * scale),
    y: Math.round(-4 * scale)
  };
  const x = clampToRange(
    baseX + offset.x,
    workArea.x + 8,
    workArea.x + workArea.width - cloneSize.width - 8
  );
  const y = clampToRange(
    baseY + offset.y,
    workArea.y + 8,
    workArea.y + workArea.height - cloneSize.height
  );

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: cloneSize.width,
    height: cloneSize.height,
    facing: x >= petBounds.x ? "left" : "right"
  };
}

function computePetWindowBounds({
  currentBounds,
  workArea,
  size,
  resetAnchor = false,
  manuallyPlaced = false
} = {}) {
  if (!workArea || !size) {
    return null;
  }

  let x = currentBounds?.x ?? 0;
  let y = currentBounds?.y ?? 0;

  if (resetAnchor || !manuallyPlaced || !currentBounds) {
    x = Math.round(workArea.x + workArea.width - size.width - 32);
    y = Math.round(workArea.y + workArea.height - size.height);
  }

  return {
    x: clampToRange(x, workArea.x + 8, workArea.x + workArea.width - size.width - 8),
    y: clampToRange(y, workArea.y + 8, workArea.y + workArea.height - size.height),
    width: size.width,
    height: size.height
  };
}

module.exports = {
  clampToRange,
  computeChatBounds,
  computeCloneAnchorBounds,
  computePetWindowBounds
};
