const { spawn } = require("child_process");
const {
  deriveActorSurfaceInsets
} = require("./avatar-surface-profile");

function createEmptyFrontWindowSurface() {
  return {
    appName: "",
    title: "",
    bounds: null,
    updatedAt: 0
  };
}

function parseFrontWindowSurface(raw, {
  ownProcessNames = [],
  minInteractiveWindowSize = { width: 220, height: 120 }
} = {}) {
  if (!raw) {
    return null;
  }

  const [appName = "", title = "", xRaw = "", yRaw = "", widthRaw = "", heightRaw = ""] = raw.split("|");
  const normalizedAppName = String(appName).trim();

  if (ownProcessNames.includes(normalizedAppName)) {
    return null;
  }

  const x = Number(xRaw);
  const y = Number(yRaw);
  const width = Number(widthRaw);
  const height = Number(heightRaw);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < minInteractiveWindowSize.width ||
    height < minInteractiveWindowSize.height
  ) {
    return null;
  }

  return {
    appName: normalizedAppName,
    title: String(title).trim(),
    bounds: {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height)
    },
    updatedAt: Date.now()
  };
}

function readFrontmostWindowSurface({
  ownProcessNames = [],
  minInteractiveWindowSize = { width: 220, height: 120 }
} = {}) {
  if (process.platform !== "darwin") {
    return Promise.resolve(null);
  }

  const script = `
tell application "System Events"
  set frontProc to first application process whose frontmost is true
  set procName to name of frontProc
  if (count of windows of frontProc) is 0 then
    return procName & "|"
  end if
  try
    set winRef to front window of frontProc
    set winPos to position of winRef
    set winSize to size of winRef
    set winTitle to name of winRef
    return procName & "|" & winTitle & "|" & (item 1 of winPos) & "|" & (item 2 of winPos) & "|" & (item 1 of winSize) & "|" & (item 2 of winSize)
  on error
    return procName & "|"
  end try
end tell
  `.trim();

  return new Promise((resolve) => {
    const child = spawn("osascript", ["-e", script], {
      stdio: ["ignore", "pipe", "ignore"]
    });
    let stdout = "";
    let settled = false;
    const finish = (value) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(null);
    }, 220);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.on("error", () => {
      finish(null);
    });

    child.on("close", () => {
      finish(parseFrontWindowSurface(stdout.trim(), {
        ownProcessNames,
        minInteractiveWindowSize
      }));
    });
  });
}

function shouldTrackFrontWindow({
  petVisible = false,
  chatVisible = false,
  spawnedCloneCount = 0
} = {}) {
  return Boolean(petVisible || chatVisible || Number(spawnedCloneCount) > 0);
}

function getFrontWindowSurfaceForBounds({
  actorBounds,
  avatarMode = "kuribou",
  frontWindowState,
  getDisplayNearestPoint
} = {}) {
  const surfaceBounds = frontWindowState?.bounds;

  if (
    !actorBounds ||
    !surfaceBounds ||
    typeof getDisplayNearestPoint !== "function"
  ) {
    return null;
  }

  const actorDisplay = getDisplayNearestPoint({
    x: Math.round(actorBounds.x + (actorBounds.width / 2)),
    y: Math.round(actorBounds.y + (actorBounds.height / 2))
  });
  const windowDisplay = getDisplayNearestPoint({
    x: Math.round(surfaceBounds.x + (surfaceBounds.width / 2)),
    y: Math.round(surfaceBounds.y + (surfaceBounds.height / 2))
  });

  if (!actorDisplay || !windowDisplay || actorDisplay.id !== windowDisplay.id) {
    return null;
  }

  const insets = deriveActorSurfaceInsets(actorBounds, avatarMode);

  return {
    appName: frontWindowState.appName,
    title: frontWindowState.title,
    bounds: surfaceBounds,
    topY: surfaceBounds.y - actorBounds.height + insets.floorBleed,
    bottomY: surfaceBounds.y + surfaceBounds.height - insets.ceilingBleed,
    leftX: surfaceBounds.x - insets.wallBleed,
    rightX: surfaceBounds.x + surfaceBounds.width - actorBounds.width + insets.wallBleed,
    topLeftX: surfaceBounds.x + 10,
    topRightX: surfaceBounds.x + surfaceBounds.width - actorBounds.width - 10,
    sideTopY: surfaceBounds.y + 10,
    sideBottomY: surfaceBounds.y + surfaceBounds.height - actorBounds.height - 10
  };
}

module.exports = {
  createEmptyFrontWindowSurface,
  getFrontWindowSurfaceForBounds,
  readFrontmostWindowSurface,
  shouldTrackFrontWindow
};
