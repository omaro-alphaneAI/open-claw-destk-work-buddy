const STATUS_COPY = {
  idle: "我在，啥事。",
  thinking: "先别催，我在盯。",
  done: "收到了。",
  alert: "这步我先拦一下。"
};

const CLONE_FILTERS = {
  "main-cat": "none",
  "builder-cat": "none",
  "scout-cat": "none",
  "ops-cat": "none"
};

const CAT_ASSET_LIBRARY = {
  idle: "./assets/cat-raster/cat-idle.png",
  sit: "./assets/cat-raster/cat-sit.png",
  look: "./assets/cat-raster/cat-look.png",
  blink: "./assets/cat-raster/cat-blink.png",
  groom: "./assets/cat-raster/cat-groom.png",
  walk: [
    "./assets/cat-raster/cat-walk-1.png",
    "./assets/cat-raster/cat-walk-2.png",
    "./assets/cat-raster/cat-walk-3.png"
  ],
  run: [
    "./assets/cat-raster/cat-run-1.png",
    "./assets/cat-raster/cat-run-2.png"
  ],
  crawl: [
    "./assets/cat-raster/cat-crawl-1.png",
    "./assets/cat-raster/cat-crawl-2.png"
  ],
  climb: [
    "./assets/cat-raster/cat-climb-1.png",
    "./assets/cat-raster/cat-climb-2.png"
  ],
  hang: "./assets/cat-raster/cat-hang.png",
  dangle: [
    "./assets/cat-raster/cat-dangle-1.png",
    "./assets/cat-raster/cat-dangle-2.png"
  ],
  dragLeft: "./assets/cat-raster/cat-drag-left.png",
  dragCenter: "./assets/cat-raster/cat-drag-center.png",
  dragRight: "./assets/cat-raster/cat-drag-right.png",
  fall: "./assets/cat-raster/cat-fall.png",
  land: "./assets/cat-raster/cat-land.png",
  loaf: "./assets/cat-raster/cat-loaf.png",
  poop: "./assets/cat-raster/cat-poop.png",
  paw: "./assets/cat-raster/cat-paw.png"
};
const KURIBOU_ASSET_LIBRARY = {
  idle: "./assets/shimeji/shime11.png",
  stand: "./assets/shimeji/shime1.png",
  sit: "./assets/shimeji/shime11.png",
  sitRelax: "./assets/shimeji/shime30.png",
  walk: [
    "./assets/shimeji/shime1.png",
    "./assets/shimeji/shime2.png",
    "./assets/shimeji/shime1.png",
    "./assets/shimeji/shime3.png"
  ],
  run: [
    "./assets/shimeji/shime1.png",
    "./assets/shimeji/shime2.png",
    "./assets/shimeji/shime3.png"
  ],
  climb: [
    "./assets/shimeji/shime14.png",
    "./assets/shimeji/shime12.png",
    "./assets/shimeji/shime13.png"
  ],
  hang: [
    "./assets/shimeji/shime23.png",
    "./assets/shimeji/shime25.png",
    "./assets/shimeji/shime23.png",
    "./assets/shimeji/shime24.png",
    "./assets/shimeji/shime24.png",
    "./assets/shimeji/shime23.png"
  ],
  dragLeftFar: "./assets/shimeji/shime9.png",
  dragLeft: "./assets/shimeji/shime7.png",
  dragCenter: "./assets/shimeji/shime1.png",
  dragRight: "./assets/shimeji/shime8.png",
  dragRightFar: "./assets/shimeji/shime10.png",
  resist: [
    "./assets/shimeji/shime5.png",
    "./assets/shimeji/shime6.png",
    "./assets/shimeji/shime5.png",
    "./assets/shimeji/shime6.png",
    "./assets/shimeji/shime1.png",
    "./assets/shimeji/shime5.png",
    "./assets/shimeji/shime6.png"
  ],
  jump: "./assets/shimeji/shime22.png",
  fall: "./assets/shimeji/shime4.png",
  land: [
    "./assets/shimeji/shime19.png",
    "./assets/shimeji/shime18.png",
    "./assets/shimeji/shime19.png",
    "./assets/shimeji/shime20.png"
  ],
  loaf: [
    "./assets/shimeji/shime21.png",
    "./assets/shimeji/shime20.png",
    "./assets/shimeji/shime21.png"
  ],
  crawl: [
    "./assets/shimeji/shime20.png",
    "./assets/shimeji/shime20.png",
    "./assets/shimeji/shime21.png",
    "./assets/shimeji/shime21.png"
  ],
  dangle: [
    "./assets/shimeji/shime31.png",
    "./assets/shimeji/shime32.png",
    "./assets/shimeji/shime31.png",
    "./assets/shimeji/shime33.png"
  ],
  sitLook: [
    "./assets/shimeji/shime11.png",
    "./assets/shimeji/shime26.png",
    "./assets/shimeji/shime15.png",
    "./assets/shimeji/shime27.png",
    "./assets/shimeji/shime16.png",
    "./assets/shimeji/shime28.png",
    "./assets/shimeji/shime17.png",
    "./assets/shimeji/shime29.png",
    "./assets/shimeji/shime11.png"
  ],
  groom: [
    "./assets/shimeji/shime11.png",
    "./assets/shimeji/shime26.png",
    "./assets/shimeji/shime11.png",
    "./assets/shimeji/shime30.png"
  ],
  steal: [
    "./assets/shimeji/shime34.png",
    "./assets/shimeji/shime35.png",
    "./assets/shimeji/shime34.png",
    "./assets/shimeji/shime36.png"
  ],
  alert: [
    "./assets/shimeji/shime26.png",
    "./assets/shimeji/shime15.png",
    "./assets/shimeji/shime27.png",
    "./assets/shimeji/shime16.png",
    "./assets/shimeji/shime28.png",
    "./assets/shimeji/shime17.png",
    "./assets/shimeji/shime29.png",
    "./assets/shimeji/shime11.png"
  ]
};
const KURIBOU_IDLE_STANCE_FRAMES = Object.freeze([
  KURIBOU_ASSET_LIBRARY.stand,
  KURIBOU_ASSET_LIBRARY.stand,
  KURIBOU_ASSET_LIBRARY.stand,
  KURIBOU_ASSET_LIBRARY.walk[1],
  KURIBOU_ASSET_LIBRARY.stand,
  KURIBOU_ASSET_LIBRARY.stand,
  KURIBOU_ASSET_LIBRARY.walk[3],
  KURIBOU_ASSET_LIBRARY.stand
]);
const KURIBOU_ECO_STANCE_FRAMES = Object.freeze([
  KURIBOU_ASSET_LIBRARY.stand,
  KURIBOU_ASSET_LIBRARY.stand,
  KURIBOU_ASSET_LIBRARY.stand,
  KURIBOU_ASSET_LIBRARY.walk[1],
  KURIBOU_ASSET_LIBRARY.stand,
  KURIBOU_ASSET_LIBRARY.stand
]);

const stage = document.querySelector("#petStage");
const petButton = document.querySelector("#petButton");
const petRig = document.querySelector("#petRig");
const petShadow = document.querySelector(".pet-shadow");
const petBubble = document.querySelector("#petBubble");
const petBubbleName = document.querySelector("#petBubbleName");
const petBubbleText = document.querySelector("#petBubbleText");
const poopTrail = document.querySelector("#poopTrail");
const replyDot = document.querySelector("#replyDot");
const initialQuery = new URLSearchParams(window.location.search);
let viewState = {
  cloneId: initialQuery.get("cloneId") || null,
  mini: initialQuery.get("mini") === "1"
};

let currentState = {
  status: "idle",
  message: STATUS_COPY.idle,
  ttlMs: 3600
};
let cloneState = {
  activeCloneId: "main-cat",
  clones: []
};
let uiState = {
  drawerOpen: false,
  ecoMode: false,
  avatarMode: "kuribou",
  avatarSurfaceProfile: null
};
let preferenceState = {
  customPetImageUrl: ""
};
let motionState = {
  behavior: "floor-idle",
  mode: "idle",
  facing: "left",
  angle: 0,
  leanX: 0,
  velocityX: 0,
  velocityY: 0,
  surfaceCling: null,
  updatedAt: 0
};
let rigRefs = {};
let renderedAvatarMode = "";
let renderedCatAsset = "";
let renderedKuribouAsset = "";
let renderedCustomAsset = "";
let bubbleTimer = null;
let lastInteractive = null;
let pointerTarget = { x: 0, y: 0 };
let pointerCurrent = { x: 0, y: 0 };
let animationHandle = 0;
let dragState = null;
let suppressNextClick = false;
let lastMotionTimestamp = 0;
let dragUpdateFrame = 0;
let dragUpdatePayload = null;
let animationDelayTimer = 0;
let queuedDragPayloadKey = "";
let lastSentDragPayloadKey = "";
const POINTER_DRAG_THRESHOLD_PX = 6.4;
const DIRECT_DRAG_SEND_MIN_INTERVAL_MS = 5;
let appliedTransforms = {
  root: "",
  catArt: "",
  kuribouArt: "",
  shadow: ""
};
let appliedState = {
  collision: "",
  shadowOpacity: ""
};
let lastDragDispatchAt = 0;

function requestRigFrameNow() {
  if (animationDelayTimer) {
    window.clearTimeout(animationDelayTimer);
    animationDelayTimer = 0;
  }

  if (animationHandle) {
    return;
  }

  animationHandle = window.requestAnimationFrame(animateRig);
}

function getVisualCloneId() {
  return viewState.cloneId || cloneState.activeCloneId;
}

function isSideClimbMode(mode = "") {
  return mode === "climb-left" || mode === "climb-right";
}

function isLocomotionMode(mode = "") {
  return [
    "walk",
    "run",
    "crawl",
    "climb-left",
    "climb-right",
    "hang",
    "mouse-steal"
  ].includes(mode);
}

function isDragVisualMode(mode = motionState.mode || "idle", behavior = motionState.behavior || mode) {
  return mode === "drag" || behavior === "drag-picked" || behavior === "drag-resist";
}

function getAvatarRendererProfile() {
  return uiState.avatarSurfaceProfile?.renderer || null;
}

function getWallSurfaceCling() {
  return motionState.surfaceCling?.kind === "wall" ? motionState.surfaceCling : null;
}

function syncDynamicSurfaceOrigins(surfaceCling = null) {
  const rootOrigin = surfaceCling?.rootOrigin || "";
  const artOrigin = surfaceCling?.artOrigin || "";
  const artNode = rigRefs.catArt || rigRefs.kuribouArt || null;

  if (rigRefs.root && rigRefs.root.style.transformOrigin !== rootOrigin) {
    rigRefs.root.style.transformOrigin = rootOrigin;
  }

  if (artNode && artNode.style.transformOrigin !== artOrigin) {
    artNode.style.transformOrigin = artOrigin;
  }
}

function resolveRenderTier() {
  const mode = motionState.mode || "idle";
  const behavior = motionState.behavior || mode;

  if (dragState?.dragging || mode === "drag" || mode === "fall" || mode === "land") {
    return "drag";
  }

  if (
    currentState.status === "thinking" ||
    isLocomotionMode(mode) ||
    behavior === "break-alert"
  ) {
    return "light";
  }

  return "full";
}

function applyTransform(target, key, transform) {
  if (!target) {
    return;
  }

  if (appliedTransforms[key] === transform) {
    return;
  }

  appliedTransforms[key] = transform;
  target.style.transform = transform;
}

function applyShadowOpacity(nextOpacity) {
  const value = String(nextOpacity);

  if (!petShadow || appliedState.shadowOpacity === value) {
    return;
  }

  appliedState.shadowOpacity = value;
  petShadow.style.opacity = value;
}

function applyCollisionState(nextValue) {
  const value = String(Boolean(nextValue));

  if (appliedState.collision === value) {
    return;
  }

  appliedState.collision = value;
  stage.dataset.collision = value;
}

function clampToRange(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resolveAnimationCadenceMs() {
  const renderTier = resolveRenderTier();

  if (document.hidden) {
    return 140;
  }

  if (renderTier === "drag") {
    return 24;
  }

  if (renderTier === "light") {
    return viewState.mini ? 26 : 18;
  }

  if (uiState.ecoMode) {
    return viewState.mini ? 72 : 48;
  }

  return viewState.mini ? 42 : 24;
}

function scheduleNextAnimationFrame(delayMs = 0) {
  if (animationDelayTimer) {
    window.clearTimeout(animationDelayTimer);
    animationDelayTimer = 0;
  }

  if (delayMs > 0) {
    animationDelayTimer = window.setTimeout(() => {
      animationDelayTimer = 0;
      animationHandle = window.requestAnimationFrame(animateRig);
    }, delayMs);
    return;
  }

  animationHandle = window.requestAnimationFrame(animateRig);
}

function getClone(cloneId = getVisualCloneId()) {
  return cloneState.clones.find((clone) => clone.id === cloneId) || cloneState.clones[0] || null;
}

function resolveCloneFilter(cloneId = getVisualCloneId()) {
  if (uiState.avatarMode === "kuribou") {
    return "none";
  }

  return CLONE_FILTERS[cloneId] || "none";
}

function requestInteractive(nextValue) {
  const interactive = Boolean(nextValue);

  if (lastInteractive === interactive) {
    return;
  }

  lastInteractive = interactive;
  window.petShell.setInteractive({
    interactive,
    cloneId: viewState.mini ? getVisualCloneId() : null
  });
}

function showBubble(message, ttlMs = 3200, cloneName = getClone()?.name || "小七") {
  if (viewState.mini) {
    return;
  }

  petBubbleName.textContent = cloneName;
  petBubbleText.textContent = message;
  petBubble.classList.remove("is-hidden");

  if (bubbleTimer) {
    window.clearTimeout(bubbleTimer);
  }

  bubbleTimer = window.setTimeout(() => {
    petBubble.classList.add("is-hidden");
  }, ttlMs);
}

function dropPoop() {
  const poop = document.createElement("span");
  poop.className = "poop";
  poopTrail.appendChild(poop);

  window.setTimeout(() => {
    poop.remove();
  }, 6200);
}

function getBlinkActive(time) {
  const cycle = (time + 1.25) % 5.6;
  return cycle < 0.16;
}

function resolveLoopedFrame(frames, time, rate) {
  const index = Math.floor(time * rate) % frames.length;
  return frames[index];
}

function getMotionElapsed(time = 0) {
  const updatedAt = Number(motionState.updatedAt) || 0;

  if (!updatedAt) {
    return Math.max(0, time);
  }

  return Math.max(0, time - (updatedAt / 1000));
}

function resolveTimedSequence(phases, elapsed) {
  const totalDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);

  if (!totalDuration) {
    return null;
  }

  let cursor = elapsed % totalDuration;

  for (const phase of phases) {
    if (cursor < phase.duration) {
      if (phase.frame) {
        return phase.frame;
      }

      return resolveLoopedFrame(phase.frames, cursor, phase.rate);
    }

    cursor -= phase.duration;
  }

  return phases.at(-1)?.frame || phases.at(-1)?.frames?.[0] || null;
}

function resolveDragAsset() {
  const leanX = Number(motionState.leanX) || 0;
  const currentAsset = renderedCatAsset;

  if (currentAsset === CAT_ASSET_LIBRARY.dragLeft) {
    if (leanX <= -0.08) {
      return currentAsset;
    }
  } else if (currentAsset === CAT_ASSET_LIBRARY.dragRight) {
    if (leanX >= 0.08) {
      return currentAsset;
    }
  } else if (currentAsset === CAT_ASSET_LIBRARY.dragCenter) {
    if (Math.abs(leanX) < 0.42) {
      return currentAsset;
    }
  }

  if (leanX <= -0.42) {
    return CAT_ASSET_LIBRARY.dragLeft;
  }

  if (leanX >= 0.42) {
    return CAT_ASSET_LIBRARY.dragRight;
  }

  return CAT_ASSET_LIBRARY.dragCenter;
}

function resolveCatAsset(time = 0) {
  const mode = motionState.mode || "idle";
  const behavior = motionState.behavior || mode;
  const elapsed = getMotionElapsed(time);

  if (behavior === "wall-idle" && isSideClimbMode(mode)) {
    return CAT_ASSET_LIBRARY.climb[0];
  }

  if (behavior === "break-alert") {
    return elapsed % 0.82 < 0.32 ? CAT_ASSET_LIBRARY.paw : CAT_ASSET_LIBRARY.look;
  }

  if (behavior === "drag-picked" || behavior === "drag-resist" || mode === "drag") {
    return resolveDragAsset();
  }

  if (mode === "fall" || mode === "throw") {
    return CAT_ASSET_LIBRARY.fall;
  }

  if (mode === "land") {
    return CAT_ASSET_LIBRARY.land;
  }

  if (mode === "poop") {
    return CAT_ASSET_LIBRARY.poop;
  }

  if (mode === "sit") {
    return elapsed % 5.8 < 1.9 ? CAT_ASSET_LIBRARY.look : CAT_ASSET_LIBRARY.sit;
  }

  if (mode === "dangle") {
    return resolveLoopedFrame(CAT_ASSET_LIBRARY.dangle, elapsed, 2.2);
  }

  if (mode === "crawl") {
    return resolveLoopedFrame(CAT_ASSET_LIBRARY.crawl, elapsed, 2.6);
  }

  if (mode === "lick") {
    return CAT_ASSET_LIBRARY.groom;
  }

  if (mode === "mouse-steal") {
    return elapsed % 1.12 < 0.36 ? CAT_ASSET_LIBRARY.paw : CAT_ASSET_LIBRARY.look;
  }

  if (mode === "rest") {
    return CAT_ASSET_LIBRARY.loaf;
  }

  if (mode === "hang") {
    return CAT_ASSET_LIBRARY.hang;
  }

  if (mode === "walk") {
    return resolveLoopedFrame(CAT_ASSET_LIBRARY.walk, elapsed, 5.2);
  }

  if (mode === "run") {
    return resolveLoopedFrame(CAT_ASSET_LIBRARY.run, elapsed, 8.4);
  }

  if (mode === "climb-left" || mode === "climb-right") {
    return resolveLoopedFrame(CAT_ASSET_LIBRARY.climb, elapsed, 4.4);
  }

  if (getBlinkActive(time)) {
    return CAT_ASSET_LIBRARY.blink;
  }

  if (uiState.ecoMode) {
    return elapsed % 7.4 < 2.2 ? CAT_ASSET_LIBRARY.look : CAT_ASSET_LIBRARY.sit;
  }

  return elapsed % 8.4 < 2.3 ? CAT_ASSET_LIBRARY.look : CAT_ASSET_LIBRARY.idle;
}

function resolveKuribouDragAsset() {
  const leanX = Number(motionState.leanX) || 0;
  const currentAsset = renderedKuribouAsset;

  if (currentAsset === KURIBOU_ASSET_LIBRARY.dragLeftFar) {
    if (leanX <= -0.54) {
      return currentAsset;
    }
  } else if (currentAsset === KURIBOU_ASSET_LIBRARY.dragLeft) {
    if (leanX <= -0.12) {
      return currentAsset;
    }
  } else if (currentAsset === KURIBOU_ASSET_LIBRARY.dragRightFar) {
    if (leanX >= 0.54) {
      return currentAsset;
    }
  } else if (currentAsset === KURIBOU_ASSET_LIBRARY.dragRight) {
    if (leanX >= 0.12) {
      return currentAsset;
    }
  } else if (currentAsset === KURIBOU_ASSET_LIBRARY.dragCenter) {
    if (Math.abs(leanX) < 0.48) {
      return currentAsset;
    }
  }

  if (leanX <= -0.88) {
    return KURIBOU_ASSET_LIBRARY.dragLeftFar;
  }

  if (leanX <= -0.48) {
    return KURIBOU_ASSET_LIBRARY.dragLeft;
  }

  if (leanX >= 0.88) {
    return KURIBOU_ASSET_LIBRARY.dragRightFar;
  }

  if (leanX >= 0.48) {
    return KURIBOU_ASSET_LIBRARY.dragRight;
  }

  return KURIBOU_ASSET_LIBRARY.dragCenter;
}

function resolveKuribouIdleAsset(elapsed) {
  return resolveLoopedFrame(KURIBOU_IDLE_STANCE_FRAMES, elapsed, 1.16);
}

function resolveKuribouAsset(time = 0) {
  const mode = motionState.mode || "idle";
  const behavior = motionState.behavior || mode;
  const elapsed = getMotionElapsed(time);

  if (behavior === "wall-idle" && isSideClimbMode(mode)) {
    return KURIBOU_ASSET_LIBRARY.climb[1];
  }

  if (behavior === "drag-resist") {
    return resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.resist, elapsed, 9.2);
  }

  if (behavior === "break-alert") {
    return resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.alert, elapsed, 5.4);
  }

  if (mode === "drag") {
    return resolveKuribouDragAsset();
  }

  if (mode === "fall" || mode === "throw") {
    return Math.abs(Number(motionState.velocityY) || 0) < 3.6
      ? KURIBOU_ASSET_LIBRARY.jump
      : KURIBOU_ASSET_LIBRARY.fall;
  }

  if (mode === "land") {
    return resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.land, elapsed, 9.6);
  }

  if (mode === "walk") {
    return resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.walk, elapsed, 6.6);
  }

  if (mode === "run") {
    return resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.run, elapsed, 11.8);
  }

  if (mode === "climb-left" || mode === "climb-right") {
    return resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.climb, elapsed, 7.6);
  }

  if (mode === "hang") {
    return resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.hang, elapsed, 5.2);
  }

  if (mode === "lick") {
    return resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.groom, elapsed, 3.8);
  }

  if (mode === "poop") {
    return resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.crawl, elapsed, 2.6);
  }

  if (mode === "sit") {
    return elapsed % 5.4 < 2.2 ? KURIBOU_ASSET_LIBRARY.sit : resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.sitLook, elapsed, 2);
  }

  if (mode === "dangle") {
    return resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.dangle, elapsed, 2.4);
  }

  if (mode === "crawl") {
    return resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.crawl, elapsed, 2.6);
  }

  if (mode === "rest") {
    return resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.loaf, elapsed, 2.1);
  }

  if (mode === "mouse-steal") {
    return resolveLoopedFrame(KURIBOU_ASSET_LIBRARY.steal, elapsed, 8.2);
  }

  if (uiState.ecoMode) {
    return resolveLoopedFrame(KURIBOU_ECO_STANCE_FRAMES, elapsed, 0.68) || KURIBOU_ASSET_LIBRARY.stand;
  }

  return resolveKuribouIdleAsset(elapsed);
}

function syncAvatarAsset(time = 0) {
  if (uiState.avatarMode === "kuribou") {
    renderedCatAsset = "";
    renderedCustomAsset = "";

    if (!rigRefs.kuribouArt) {
      renderedKuribouAsset = "";
      return;
    }

    const nextAsset = resolveKuribouAsset(time);

    if (nextAsset === renderedKuribouAsset) {
      return;
    }

    renderedKuribouAsset = nextAsset;
    rigRefs.kuribouArt.src = nextAsset;
    return;
  }

  renderedKuribouAsset = "";

  if (uiState.avatarMode === "custom") {
    renderedCatAsset = "";

    if (!rigRefs.catArt) {
      renderedCustomAsset = "";
      return;
    }

    const nextAsset = preferenceState.customPetImageUrl || "";

    if (!nextAsset || nextAsset === renderedCustomAsset) {
      return;
    }

    renderedCustomAsset = nextAsset;
    rigRefs.catArt.src = nextAsset;
    return;
  }

  renderedCustomAsset = "";

  if (!rigRefs.catArt) {
    renderedCatAsset = "";
    return;
  }

  const nextAsset = resolveCatAsset(time);

  if (nextAsset === renderedCatAsset) {
    return;
  }

  renderedCatAsset = nextAsset;
  rigRefs.catArt.src = nextAsset;
}

function applyMotionState(nextMotion = {}) {
  motionState = {
    ...motionState,
    ...nextMotion
  };

  const renderTier = resolveRenderTier();

  stage.dataset.behavior = motionState.behavior || motionState.mode || "floor-idle";
  stage.dataset.pose = motionState.mode || "idle";
  stage.dataset.facing = motionState.facing === "right" ? "right" : "left";
  applyCollisionState(
    Number(motionState.impactAt) && (Date.now() - Number(motionState.impactAt) < 340)
  );
  stage.dataset.renderTier = renderTier;

  if (
    motionState.mode === "poop" &&
    Number.isFinite(motionState.updatedAt) &&
    motionState.updatedAt !== lastMotionTimestamp
  ) {
    dropPoop();
  }

  lastMotionTimestamp = motionState.updatedAt || lastMotionTimestamp;
  syncAvatarAsset(performance.now() / 1000);

  if (renderTier === "drag") {
    requestRigFrameNow();
  } else if (!animationHandle && !animationDelayTimer) {
    scheduleNextAnimationFrame(resolveAnimationCadenceMs());
  }
}

function renderAvatar() {
  if (renderedAvatarMode === uiState.avatarMode) {
    return;
  }

  renderedAvatarMode = uiState.avatarMode;
  rigRefs = {};
  appliedTransforms = {
    root: "",
    catArt: "",
    kuribouArt: "",
    shadow: ""
  };

  if (uiState.avatarMode === "kuribou") {
    petRig.innerHTML = `
      <div class="kuribou-shell">
        <img class="kuribou-art" id="kuribouArt" src="${KURIBOU_ASSET_LIBRARY.idle}" alt="小栗帽" draggable="false" />
      </div>
    `;
    rigRefs.root = petRig.querySelector(".kuribou-shell");
    rigRefs.kuribouArt = petRig.querySelector("#kuribouArt");
    const clone = getClone();
    petRig.style.filter = resolveCloneFilter(clone?.id);
    renderedKuribouAsset = "";
    syncAvatarAsset(performance.now() / 1000);
    return;
  }

  if (uiState.avatarMode === "custom" && preferenceState.customPetImageUrl) {
    petRig.innerHTML = `
      <div class="custom-pet-shell">
        <img class="custom-pet-art pet-rig-layer" id="customPetArt" src="${preferenceState.customPetImageUrl}" alt="自定义桌宠" draggable="false" />
      </div>
    `;
    rigRefs.root = petRig.querySelector(".custom-pet-shell");
    rigRefs.catArt = petRig.querySelector("#customPetArt");
    const clone = getClone();
    petRig.style.filter = resolveCloneFilter(clone?.id);
    renderedCustomAsset = "";
    syncAvatarAsset(performance.now() / 1000);
    return;
  }

  petRig.innerHTML = `
    <div class="cat-raster-shell">
      <img class="cat-raster-art pet-rig-layer" id="catRasterArt" src="${CAT_ASSET_LIBRARY.idle}" alt="小黑猫" draggable="false" />
    </div>
  `;
  rigRefs.root = petRig.querySelector(".cat-raster-shell");
  rigRefs.catArt = petRig.querySelector("#catRasterArt");
  const clone = getClone();
  petRig.style.filter = resolveCloneFilter(clone?.id);
  renderedCatAsset = "";
  syncAvatarAsset(performance.now() / 1000);
}

function applyCloneState(nextCloneState) {
  cloneState = {
    ...cloneState,
    ...nextCloneState,
    clones: nextCloneState?.clones || cloneState.clones
  };

  const activeClone = getClone();

  if (!activeClone) {
    return;
  }

  petBubbleName.textContent = activeClone.name;
  stage.style.setProperty("--accent", activeClone.accent || "#f4c87a");
  stage.style.setProperty("--accent-soft", activeClone.glow || "rgba(244, 200, 122, 0.34)");

  if (petRig) {
    petRig.style.filter = resolveCloneFilter(activeClone.id);
  }

  if (viewState.mini) {
    currentState = {
      ...currentState,
      status: STATUS_COPY[activeClone.status] ? activeClone.status : currentState.status
    };
    stage.dataset.status = currentState.status;
    replyDot.hidden = true;
    petBubble.classList.add("is-hidden");
  }
}

function applyPetState(nextState, autoBubble = true) {
  const statusClone = viewState.mini ? getClone() : null;
  const resolvedStatus = viewState.mini && STATUS_COPY[statusClone?.status]
    ? statusClone.status
    : STATUS_COPY[nextState.status]
      ? nextState.status
      : "idle";
  const resolvedMessage = viewState.mini
    ? currentState.message
    : nextState.message || STATUS_COPY[nextState.status] || STATUS_COPY.idle;

  currentState = {
    ...currentState,
    ...nextState,
    status: resolvedStatus,
    message: resolvedMessage
  };

  stage.dataset.status = currentState.status;

  if (autoBubble && !currentState.suppressBubble) {
    showBubble(currentState.message, currentState.ttlMs || 3600);
  }
}

function applyUiState(nextUi) {
  uiState = {
    ...uiState,
    ...nextUi
  };

  const renderTier = resolveRenderTier();

  stage.dataset.eco = String(Boolean(uiState.ecoMode));
  stage.dataset.chatOpen = String(Boolean(uiState.drawerOpen));
  stage.dataset.avatar = uiState.avatarMode === "kuribou"
    ? "kuribou"
    : uiState.avatarMode === "custom"
      ? "custom"
      : "cat";
  stage.dataset.mini = String(Boolean(viewState.mini));
  stage.dataset.renderTier = renderTier;
  replyDot.hidden = Boolean(uiState.drawerOpen || viewState.mini);
  renderAvatar();
  applyCloneState(cloneState);
  syncAvatarAsset(performance.now() / 1000);

  if (renderTier === "drag") {
    requestRigFrameNow();
  } else if (!animationHandle && !animationDelayTimer) {
    scheduleNextAnimationFrame(resolveAnimationCadenceMs());
  }
}

function applyPreferenceState(nextPreferences) {
  preferenceState = {
    ...preferenceState,
    ...nextPreferences
  };

  if (uiState.avatarMode === "custom") {
    renderedAvatarMode = "";
    renderAvatar();
  }
}

function getEventScreenPoint(event) {
  const screenX = Number.isFinite(event?.screenX)
    ? event.screenX
    : window.screenX + (Number.isFinite(event?.clientX) ? event.clientX : 0);
  const screenY = Number.isFinite(event?.screenY)
    ? event.screenY
    : window.screenY + (Number.isFinite(event?.clientY) ? event.clientY : 0);

  return { screenX, screenY };
}

function getDragPayload(event) {
  const payload = getEventScreenPoint(event);

  if (viewState.mini) {
    payload.cloneId = getVisualCloneId();
  }

  return payload;
}

function getDragPayloadKey(payload = {}) {
  const cloneId = typeof payload.cloneId === "string" ? payload.cloneId : "";
  return `${cloneId}:${Math.round(Number(payload.screenX) || 0)}:${Math.round(Number(payload.screenY) || 0)}`;
}

function flushPendingDragUpdate() {
  if (dragUpdateFrame) {
    window.cancelAnimationFrame(dragUpdateFrame);
    dragUpdateFrame = 0;
  }

  if (!dragUpdatePayload) {
    return;
  }

  lastSentDragPayloadKey = queuedDragPayloadKey || getDragPayloadKey(dragUpdatePayload);
  queuedDragPayloadKey = "";
  lastDragDispatchAt = performance.now();
  window.petShell.updateWindowDrag(dragUpdatePayload);
  dragUpdatePayload = null;
}

function dispatchDragUpdate(payload, payloadKey = getDragPayloadKey(payload)) {
  if (!payload) {
    return;
  }

  lastSentDragPayloadKey = payloadKey;
  queuedDragPayloadKey = "";
  dragUpdatePayload = null;
  lastDragDispatchAt = performance.now();
  window.petShell.updateWindowDrag(payload);
}

function scheduleDragUpdate(payload, { immediate = false } = {}) {
  const payloadKey = getDragPayloadKey(payload);

  if (payloadKey === lastSentDragPayloadKey || payloadKey === queuedDragPayloadKey) {
    return;
  }

  const now = performance.now();

  if (immediate || (now - lastDragDispatchAt) >= DIRECT_DRAG_SEND_MIN_INTERVAL_MS) {
    if (dragUpdateFrame) {
      window.cancelAnimationFrame(dragUpdateFrame);
      dragUpdateFrame = 0;
    }

    dispatchDragUpdate(payload, payloadKey);
    return;
  }

  dragUpdatePayload = payload;
  queuedDragPayloadKey = payloadKey;

  if (dragUpdateFrame) {
    return;
  }

  dragUpdateFrame = window.requestAnimationFrame(() => {
    dragUpdateFrame = 0;

    if (!dragUpdatePayload) {
      return;
    }

    dispatchDragUpdate(
      dragUpdatePayload,
      queuedDragPayloadKey || getDragPayloadKey(dragUpdatePayload)
    );
  });
}

function beginPointerDrag(event, immediate = false) {
  if (event.button !== 0) {
    return;
  }

  dragState = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    dragging: Boolean(immediate)
  };
  queuedDragPayloadKey = "";
  lastSentDragPayloadKey = "";
  lastDragDispatchAt = 0;
  event.currentTarget?.setPointerCapture?.(event.pointerId);
  requestInteractive(true);

  if (immediate) {
    stage.classList.add("is-dragging");
    window.petShell.beginWindowDrag(getDragPayload(event));
  }
}

function updatePointerDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - dragState.startClientX;
  const deltaY = event.clientY - dragState.startClientY;
  const payload = getDragPayload(event);

  if (!dragState.dragging && Math.hypot(deltaX, deltaY) >= POINTER_DRAG_THRESHOLD_PX) {
    dragState.dragging = true;
    suppressNextClick = true;
    stage.classList.add("is-dragging");
    window.petShell.beginWindowDrag(payload);
    scheduleDragUpdate(payload, { immediate: true });
    return;
  }

  if (!dragState.dragging) {
    return;
  }

  scheduleDragUpdate(payload);
}

function finishPointerDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) {
    return;
  }

  const shouldToggleDrawer = !dragState.dragging && event.type === "pointerup";

  if (dragState.dragging) {
    const endPayload = getDragPayload(event);
    scheduleDragUpdate(endPayload);
    flushPendingDragUpdate();
    window.petShell.endWindowDrag(endPayload);
  }

  stage.classList.remove("is-dragging");
  dragState = null;

  if (viewState.mini) {
    requestInteractive(false);
  }

  dragUpdatePayload = null;
  queuedDragPayloadKey = "";
  lastSentDragPayloadKey = "";
  lastDragDispatchAt = 0;

  if (shouldToggleDrawer) {
    // Transparent non-focusable pet windows can swallow native click events.
    // Treat a clean pointer-up as the tap source of truth and absorb the follow-up click.
    suppressNextClick = true;
    void toggleDrawerFromPet();
  }
}

function syncInteractivity(event) {
  if (dragState?.dragging) {
    requestInteractive(true);
    return;
  }

  const target = event?.target
    ? event.target
    : Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)
      ? document.elementFromPoint(event.clientX, event.clientY)
      : null;
  const interactiveTarget = target?.closest?.(".hit-region, .drag-region");

  requestInteractive(Boolean(interactiveTarget));

  if (!Number.isFinite(event?.clientX) || !Number.isFinite(event?.clientY)) {
    return;
  }

  if (!target?.closest?.("#petButton")) {
    pointerTarget.x *= 0.7;
    pointerTarget.y *= 0.7;
    return;
  }

  const rect = petButton.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  pointerTarget.x = Math.max(-1, Math.min(1, x));
  pointerTarget.y = Math.max(-1, Math.min(1, y));
}

async function toggleDrawerFromPet() {
  const cloneId = getVisualCloneId();

  if (uiState.drawerOpen) {
    window.petShell.setPanels({
      drawerOpen: false
    });
    return;
  }

  try {
    if (cloneId) {
      await window.petShell.setClone({ cloneId });
      await window.petShell.setDiffOpen({
        open: false,
        cloneId
      });
    } else {
      await window.petShell.setDiffOpen({
        open: false
      });
    }
  } catch (error) {
    console.error("failed to reset drawer mode", error);
  }

  window.petShell.setPanels({
    drawerOpen: true
  });
}

function animateRig(timeMs) {
  animationHandle = 0;
  const time = timeMs / 1000;
  const mode = motionState.mode || "idle";
  const behavior = motionState.behavior || mode;
  const renderTier = resolveRenderTier();
  const reducedEffects = renderTier !== "full";
  const dragVisualMode = isDragVisualMode(mode, behavior);
  const sideClimb = isSideClimbMode(mode);
  const wallSurfaceCling = getWallSurfaceCling();
  const avatarRendererProfile = getAvatarRendererProfile();
  const surfaceGripMode = sideClimb || mode === "hang";
  const groundedFloorMode = !dragVisualMode && !surfaceGripMode && mode !== "fall" && mode !== "land";
  const facingScale = motionState.facing === "right" ? -1 : 1;
  const bobBase = Number.isFinite(Number(avatarRendererProfile?.bobBase))
    ? Number(avatarRendererProfile.bobBase)
    : uiState.avatarMode === "kuribou"
      ? 2.7
      : 2.6;
  const gaitBoost = isLocomotionMode(mode) ? 1.12 : 1;
  const hangSwing = mode === "hang" ? Math.sin(time * 2.8) * 3.1 : mode === "dangle" ? Math.sin(time * 2.7) * 3.3 : 0;
  const rootRotation = mode === "climb-left"
    ? (wallSurfaceCling?.rootRotation ?? -88)
    : mode === "climb-right"
      ? (wallSurfaceCling?.rootRotation ?? 88)
      : mode === "hang"
        ? 180 + (hangSwing * 0.82)
        : mode === "drag" || mode === "dangle" || mode === "fall" || mode === "land" || mode === "mouse-steal" || behavior === "break-alert"
          ? motionState.angle || 0
          : 0;
  const intensity = currentState.status === "thinking"
    ? 1.16
    : currentState.status === "alert"
      ? 1.24
      : uiState.ecoMode
        ? 0.72
        : 0.92;
  const groundedBobAmplitude = mode === "run"
    ? bobBase * 0.32
    : mode === "walk"
      ? bobBase * 0.24
      : mode === "crawl"
        ? bobBase * 0.12
        : bobBase * 0.08;

  if (dragVisualMode) {
    pointerCurrent.x *= 0.72;
    pointerCurrent.y *= 0.72;
  } else {
    pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * (reducedEffects ? 0.08 : 0.12);
    pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * (reducedEffects ? 0.08 : 0.12);
  }

  const bob = dragVisualMode
    ? 0
    : surfaceGripMode
      ? Math.sin(time * (0.94 * intensity * gaitBoost)) * (bobBase * 0.12)
      : groundedFloorMode
        ? Math.sin(time * (1.72 * intensity * gaitBoost)) * (reducedEffects ? groundedBobAmplitude * 0.6 : groundedBobAmplitude)
        : Math.sin(time * (1.72 * intensity * gaitBoost)) * bobBase;
  const sway = dragVisualMode ? 0 : Math.sin(time * (1.08 * intensity * gaitBoost)) * (
    mode === "mouse-steal"
      ? 6
      : behavior === "break-alert"
        ? 7.5
        : mode === "hang"
          ? 1.8
        : currentState.status === "alert"
          ? 4.4
          : groundedFloorMode
            ? (reducedEffects ? 0.8 : 1.4)
            : 2.4
  );
  const stride = Math.sin(time * (5.1 * gaitBoost)) * (mode === "run" ? (reducedEffects ? 3.2 : 4.8) : mode === "walk" ? (reducedEffects ? 2.2 : 3.2) : mode === "crawl" ? 1.9 : surfaceGripMode ? 1.1 : 0);
  const resistJitter = dragVisualMode || reducedEffects ? 0 : behavior === "drag-resist" ? Math.sin(time * 28) * 7.2 : 0;
  const hangLift = mode === "hang" ? Math.abs(Math.sin(time * 3.6)) * (reducedEffects ? 0.8 : 1.6) : 0;
  const dragStretch = mode === "drag" ? (behavior === "drag-resist" ? 0.14 : 0.05) : mode === "land" ? 0.12 : 0;
  const faceShiftX = dragVisualMode || surfaceGripMode || reducedEffects ? 0 : pointerCurrent.x * 2.4;
  const faceShiftY = dragVisualMode || surfaceGripMode || reducedEffects ? 0 : pointerCurrent.y * 1.6;
  const alertBounce = behavior === "break-alert" ? Math.abs(Math.sin(time * 8.2)) * 4.2 : 0;
  const surfaceGripX = sideClimb ? (mode === "climb-left" ? -3 : 3) : 0;
  const surfaceGripLift = mode === "hang" ? 4 : sideClimb ? -1 : 0;
  const surfaceGripBob = sideClimb ? Math.sin(time * 5.8) * (reducedEffects ? 0.24 : 0.5) : mode === "hang" ? Math.sin(time * 3) * (reducedEffects ? 0.18 : 0.34) : 0;
  const surfaceGripScaleX = mode === "hang" ? 0.99 : sideClimb ? 0.985 : 1;
  const surfaceGripScaleY = mode === "hang" ? 1.015 : sideClimb ? 1.01 : 1;
  const groundedDrop = groundedFloorMode
    ? mode === "run"
      ? 1.4
      : mode === "walk"
        ? 1.9
        : mode === "crawl"
          ? 2.4
          : 3.2
    : 0;
  const impactAt = Number(motionState.impactAt) || 0;
  const impactAge = impactAt ? Date.now() - impactAt : Number.POSITIVE_INFINITY;
  const impactStrength = Math.max(0, Math.min(1.2, Number(motionState.impactStrength) || 0));
  const impactActive = impactAge >= 0 && impactAge < 340;
  const impactDecay = impactActive ? 1 - (impactAge / 340) : 0;
  const impactDirectionX = Number(motionState.impactDirectionX) || 0;
  const impactDirectionY = Number(motionState.impactDirectionY) || 0;
  const impactKickX = impactDirectionX * 11 * impactStrength * impactDecay;
  const impactKickY = impactDirectionY * 8 * impactStrength * impactDecay;
  const impactTilt = impactDirectionX * 15 * impactStrength * impactDecay;
  const impactSquashX = 1 + (0.16 * impactStrength * impactDecay);
  const impactSquashY = 1 - (0.14 * impactStrength * impactDecay);
  const simplifiedDragTier = renderTier === "drag";
  const shadowLift = simplifiedDragTier
    ? 0
    : mode === "hang"
      ? 30
      : sideClimb
        ? 22
        : dragVisualMode
          ? 12 + Math.min(8, Math.abs(motionState.velocityY || 0) * 0.24)
          : mode === "fall"
            ? 14 + Math.min(12, Math.abs(motionState.velocityY || 0) * 0.26)
            : mode === "land"
              ? 4
              : 0;
  const sideClimbShadowShift = sideClimb
    ? (wallSurfaceCling?.shadowShiftX ?? (
      uiState.avatarMode === "kuribou"
        ? (mode === "climb-left" ? -10 : 10)
        : (mode === "climb-left" ? 12 : -12)
    ))
    : 0;
  const shadowShiftX = simplifiedDragTier
    ? 0
    : sideClimb
      ? sideClimbShadowShift
      : clampToRange((Number(motionState.velocityX) || 0) * 0.32, -12, 12);
  const shadowScaleX = simplifiedDragTier
    ? 0.88
    : mode === "hang"
      ? 0.52
      : sideClimb
        ? 0.64
        : mode === "fall"
          ? 0.84
          : mode === "run"
            ? 1.04
            : mode === "crawl"
              ? 0.9
              : 1;
  const shadowScaleY = simplifiedDragTier
    ? 0.68
    : mode === "hang"
      ? 0.34
      : sideClimb
        ? 0.42
        : mode === "fall"
          ? 0.56
          : mode === "crawl"
            ? 0.72
            : 1;
  const shadowOpacity = simplifiedDragTier
    ? 0.18
    : mode === "hang"
      ? 0.22
      : sideClimb
      ? (wallSurfaceCling?.shadowOpacity ?? (uiState.avatarMode === "kuribou" ? 0.28 : 0.18))
      : dragVisualMode
          ? 0.42
          : mode === "fall"
            ? 0.34
            : groundedFloorMode
              ? 0.82
              : 0.68;

  applyCollisionState(impactActive);

  if (!rigRefs.root) {
    if (renderTier !== "drag") {
      scheduleNextAnimationFrame(resolveAnimationCadenceMs());
    }
    return;
  }

  syncDynamicSurfaceOrigins(wallSurfaceCling);

  if (petShadow) {
    applyTransform(
      petShadow,
      "shadow",
      `translate(${shadowShiftX}px, ${shadowLift}px) scale(${shadowScaleX}, ${shadowScaleY})`
    );
    applyShadowOpacity(shadowOpacity);
  }

  if (uiState.avatarMode === "kuribou") {
    const hoverLift = mode === "fall" ? Math.min(10, Math.abs(motionState.velocityY || 0) * 0.16) : 0;
    const kuribouBaselineLift = 0;
    const kuribouScale = mode === "drag"
      ? 1.03
      : mode === "hang"
        ? 1
        : uiState.ecoMode
          ? 0.96
          : 1;
    const kuribouRootRotation = sideClimb
      ? 0
      : mode === "hang"
        ? hangSwing * 0.24
        : rootRotation;
    const kuribouRootSway = sideClimb || mode === "hang" ? 0 : sway;
    const kuribouGripX = sideClimb
      ? (wallSurfaceCling?.rootShiftX ?? (mode === "climb-left" ? -18 : 18))
      : surfaceGripX;
    const kuribouGripLift = mode === "hang"
      ? 14
      : sideClimb
        ? (wallSurfaceCling?.rootLift ?? 10)
        : surfaceGripLift;
    const kuribouGripBob = sideClimb
      ? Math.sin(time * 6.2) * 0.86
      : mode === "hang"
        ? Math.sin(time * 3.1) * 1.12
        : surfaceGripBob;
    const kuribouGripScaleX = sideClimb
      ? (wallSurfaceCling?.rootScaleX ?? 1)
      : mode === "hang"
        ? 1
        : surfaceGripScaleX;
    const kuribouGripScaleY = sideClimb
      ? (wallSurfaceCling?.rootScaleY ?? 1.02)
      : mode === "hang"
        ? 1.01
        : surfaceGripScaleY;
    const kuribouArtShiftX = sideClimb
      ? (wallSurfaceCling?.artShiftX ?? (mode === "climb-left" ? -4 : 4))
      : 0;
    const kuribouArtShiftY = mode === "hang"
      ? -10
      : sideClimb
        ? (wallSurfaceCling?.artShiftY ?? -6)
        : 0;

    applyTransform(
      rigRefs.root,
      "root",
      `translate(${kuribouGripX + (impactKickX * 0.55)}px, ${bob + kuribouGripBob - hoverLift - kuribouGripLift + groundedDrop + impactKickY - kuribouBaselineLift}px) rotate(${kuribouRootRotation + kuribouRootSway + impactTilt}deg) scale(${facingScale * kuribouScale * kuribouGripScaleX * impactSquashX}, ${kuribouScale * kuribouGripScaleY * impactSquashY})`
    );

    if (rigRefs.kuribouArt) {
      const groundedOffset = mode === "hang"
          ? -10
          : sideClimb
            ? -3
            : 0;

      applyTransform(
        rigRefs.kuribouArt,
        "kuribouArt",
        simplifiedDragTier
          ? `translate(${kuribouArtShiftX}px, ${kuribouArtShiftY + groundedOffset}px) scale(1, 1)`
          : `translate(${kuribouArtShiftX + faceShiftX + resistJitter - (impactKickX * 0.24)}px, ${kuribouArtShiftY + faceShiftY - alertBounce - hangLift - (kuribouGripLift * 0.26) + groundedOffset - (impactKickY * 0.22)}px) scale(${(1 - dragStretch) * (1 - (impactStrength * impactDecay * 0.08))}, ${(1 + dragStretch) * (1 + (impactStrength * impactDecay * 0.12))})`
      );
    }

    if (!simplifiedDragTier) {
      syncAvatarAsset(time);
    }
  } else {
    const catGripX = sideClimb
      ? (wallSurfaceCling?.rootShiftX ?? (mode === "climb-left" ? 10 : -10))
      : surfaceGripX;
    const catGripLift = sideClimb ? (wallSurfaceCling?.rootLift ?? 1) : surfaceGripLift;
    const catGripScaleX = sideClimb ? (wallSurfaceCling?.rootScaleX ?? 0.992) : surfaceGripScaleX;
    const catGripScaleY = sideClimb ? (wallSurfaceCling?.rootScaleY ?? 1.018) : surfaceGripScaleY;
    const catArtShiftX = sideClimb
      ? (wallSurfaceCling?.artShiftX ?? (mode === "climb-left" ? 8 : -8))
      : 0;
    const catArtShiftY = sideClimb ? (wallSurfaceCling?.artShiftY ?? -6) : 0;

    applyTransform(
      rigRefs.root,
      "root",
      `translate(${catGripX + (impactKickX * 0.6)}px, ${mode === "fall" ? Math.min(10, Math.abs(motionState.velocityY || 0) * 0.22) + impactKickY : (-alertBounce - hangLift - catGripLift + surfaceGripBob + groundedDrop + impactKickY)}px) rotate(${rootRotation + impactTilt + (resistJitter * 0.18)}deg) scale(${facingScale * catGripScaleX * impactSquashX}, ${catGripScaleY * impactSquashY})`
    );

    if (rigRefs.catArt) {
      applyTransform(
        rigRefs.catArt,
        "catArt",
        simplifiedDragTier
          ? "translate(0px, 0px) rotate(0deg) scale(1, 1)"
          : `translate(${catArtShiftX + (stride * 0.3) + faceShiftX + resistJitter - (impactKickX * 0.24)}px, ${catArtShiftY + bob + faceShiftY - alertBounce - hangLift - (catGripLift * 0.28) + groundedDrop - (impactKickY * 0.18)}px) rotate(${sway + (mode === "drag" ? motionState.angle * 0.3 : 0) + (mode === "hang" ? hangSwing * 0.16 : 0) + (impactTilt * 0.22)}deg) scale(${(1 - dragStretch) * (1 - (impactStrength * impactDecay * 0.08))}, ${(1 + dragStretch) * (1 + (impactStrength * impactDecay * 0.12))})`
      );
    }

    if (!simplifiedDragTier) {
      syncAvatarAsset(time);
    }
  }

  if (renderTier !== "drag") {
    scheduleNextAnimationFrame(resolveAnimationCadenceMs());
  }
}

function bindEvents() {
  const preventNativeDrag = (event) => {
    event.preventDefault();
  };

  if (viewState.mini) {
    replyDot.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await toggleDrawerFromPet();
    });

    petButton.addEventListener("click", async () => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }

      await toggleDrawerFromPet();
    });

    petButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      beginPointerDrag(event, false);
    });
    petButton.addEventListener("dragstart", preventNativeDrag);
    petRig.addEventListener("dragstart", preventNativeDrag);
    document.addEventListener("dragstart", preventNativeDrag);
    window.addEventListener("pointermove", updatePointerDrag);
    window.addEventListener("pointerrawupdate", updatePointerDrag);
    window.addEventListener("pointerup", finishPointerDrag);
    window.addEventListener("pointercancel", finishPointerDrag);
    window.addEventListener("mousemove", syncInteractivity);
    window.addEventListener("mouseleave", () => {
      if (dragState) {
        return;
      }

      pointerTarget = { x: 0, y: 0 };
      requestInteractive(false);
    });
    return;
  }

  replyDot.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await toggleDrawerFromPet();
  });

  petBubble.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await toggleDrawerFromPet();
  });

  petButton.addEventListener("click", async () => {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }

    await toggleDrawerFromPet();
  });

  petButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    beginPointerDrag(event, false);
  });
  petButton.addEventListener("dragstart", preventNativeDrag);
  petRig.addEventListener("dragstart", preventNativeDrag);
  document.addEventListener("dragstart", preventNativeDrag);
  window.addEventListener("pointermove", updatePointerDrag);
  window.addEventListener("pointerrawupdate", updatePointerDrag);
  window.addEventListener("pointerup", finishPointerDrag);
  window.addEventListener("pointercancel", finishPointerDrag);
  window.addEventListener("mousemove", syncInteractivity);
  window.addEventListener("mouseleave", () => {
    if (dragState) {
      return;
    }

    pointerTarget = { x: 0, y: 0 };
    requestInteractive(false);
  });
}

async function bootstrap() {
  const initialState = await window.petShell.getBootstrapState();
  viewState = {
    ...viewState,
    ...(initialState.view || {})
  };
  applyPreferenceState(initialState.preferences || {});
  applyCloneState(initialState.clones);
  applyUiState(initialState.ui || {});
  applyMotionState(initialState.motion || {});
  applyPetState(initialState.petState, false);
  bindEvents();
  scheduleNextAnimationFrame(resolveAnimationCadenceMs());

  window.petShell.onStateChange((nextState) => {
    applyPetState(nextState, true);
  });

  window.petShell.onCloneStateChange((nextCloneState) => {
    applyCloneState(nextCloneState);
  });

  window.petShell.onUiChange((nextUi) => {
    applyUiState(nextUi || {});
  });

  window.petShell.onPreferenceChange((nextPreferences) => {
    applyPreferenceState(nextPreferences || {});
  });

  if (viewState.mini) {
    window.petShell.onCloneMotionChange((payload) => {
      if (payload?.cloneId !== viewState.cloneId) {
        return;
      }

      applyMotionState(payload.motion || {});
    });
  } else {
    window.petShell.onMotionChange((nextMotion) => {
      applyMotionState(nextMotion || {});
    });
  }

  window.petShell.onChatMessage((message) => {
    if (message.role !== "assistant") {
      return;
    }

    replyDot.hidden = Boolean(uiState.drawerOpen);
  });
}

window.addEventListener("beforeunload", () => {
  if (animationHandle) {
    window.cancelAnimationFrame(animationHandle);
  }

  if (animationDelayTimer) {
    window.clearTimeout(animationDelayTimer);
  }
});

bootstrap().catch((error) => {
  petBubbleText.textContent = "桌宠起身失败。";
  petBubble.classList.remove("is-hidden");
  console.error(error);
});
