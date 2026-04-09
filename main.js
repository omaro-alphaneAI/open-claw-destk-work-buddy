const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, Notification, dialog } = require("electron");
const { spawn, execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");
const {
  createEmptyFrontWindowSurface,
  getFrontWindowSurfaceForBounds: getFrontWindowSurfaceSnapshotForBounds,
  readFrontmostWindowSurface,
  shouldTrackFrontWindow: shouldTrackFrontWindowSurface
} = require("./src/main/front-window-surface");
const {
  ACTIVITY_LEVEL_OPTIONS,
  createCadenceState,
  dispatchBehaviorTransition,
  getActivityTimings,
  planNextBehaviorAction
} = require("./src/main/pet-activity");
const {
  createDefaultPreferenceState,
  normalizePreferencePatch,
  readPreferenceStateFromFile,
  writePreferenceStateToFile
} = require("./src/main/pet-preferences");
const {
  OPENCLAW_CLI_FLAGS,
  buildReplyTarget,
  buildSessionId,
  getOpenClawTransport,
  inferCloneIdFromReplyTarget,
  resolveOpenClawLaunch
} = require("./src/main/openclaw-runtime");
const {
  clearSecret,
  getSecretMeta,
  readSecret,
  writeSecret
} = require("./src/main/secret-store");
const {
  getWorkbuddyTransport
} = require("./src/main/workbuddy-runtime");
const {
  sanitizeExplicitSharedText,
  sendWorkbuddyChat
} = require("./src/main/workbuddy-provider");
const {
  buildSurfaceClingState,
  deriveActorSurfaceInsets,
  getAvatarSurfaceProfile,
  resolveAvatarMode
} = require("./src/main/avatar-surface-profile");
const {
  computeChatBounds,
  computeCloneAnchorBounds,
  computePetWindowBounds
} = require("./src/main/window-routing");
const {
  buildCloneDiffSnapshotAsync: buildCloneDiffSnapshotInWorker,
  captureCloneBaseSnapshotAsync: captureCloneBaseSnapshotInWorker
} = require("./src/main/diff-snapshot");

const VALID_STATUSES = new Set(["idle", "thinking", "done", "alert"]);
const VALID_ROLES = new Set(["user", "assistant", "system"]);
const VALID_CONTEXT_MODES = new Set(["ambient", "planning", "acting", "approval", "artifact", "cooldown"]);
const VALID_INTERRUPT_LEVELS = new Set(["quiet", "suggest", "critical"]);
const VALID_AMBIENT_LEVELS = new Set(["quiet", "suggest", "critical"]);
const VALID_APPROVAL_RISKS = new Set(["low", "medium", "high"]);
const VALID_APPROVAL_STATUSES = new Set(["pending", "approved", "rejected"]);
const VALID_ARTIFACT_KINDS = new Set(["markdown", "code", "text"]);
const VALID_TOOL_STATUSES = new Set(["pending", "active", "done", "blocked"]);
const CHAT_HISTORY_LIMIT = 120;
const AMBIENT_HISTORY_LIMIT = 12;
const SYSTEM_POLL_MS = 30_000;
const AMBIENT_FINGERPRINT_RETENTION_MS = 6 * 60 * 60 * 1000;
const AMBIENT_DEFAULT_COOLDOWN_MS = 8 * 60 * 1000;
const AMBIENT_COOLDOWN_BY_SOURCE = Object.freeze({
  "idle-companion": 90 * 60 * 1000,
  "local-system:critical": 12 * 60 * 1000,
  "local-system:suggest": 20 * 60 * 1000,
  "approval-gate:critical": 4 * 60 * 1000
});
const VOICE_COOLDOWN_MS = 15_000;
const MEMORY_RECENT_WIN_LIMIT = 5;
const HANDLED_REMINDER_ID_LIMIT = 96;
const HANDLED_REPLY_ID_LIMIT = 240;
const REMINDER_BOOT_REPLAY_GRACE_MS = 10 * 60 * 1000;
const TASK_CATEGORIES = Object.freeze(["general", "code", "research", "ops", "writing"]);
const WINDOW_SIZE = {
  compact: { width: 222, height: 236 },
  eco: { width: 180, height: 192 },
  drawer: { width: 304, height: 408 },
  workbench: { width: 304, height: 408 }
};
const CLONE_WINDOW_SIZE = {
  width: 146,
  height: 154
};
const PET_BEHAVIOR = Object.freeze({
  FLOOR_IDLE: "floor-idle",
  FLOOR_SIT: "floor-sit",
  FLOOR_DANGLE: "floor-dangle",
  FLOOR_GROOM: "floor-groom",
  FLOOR_CRAWL: "floor-crawl",
  FLOOR_WALK: "floor-walk",
  FLOOR_RUN: "floor-run",
  WALL_IDLE: "wall-idle",
  EDGE_CLIMB_LEFT: "edge-climb-left",
  EDGE_CLIMB_RIGHT: "edge-climb-right",
  CEILING_HANG: "ceiling-hang",
  DRAG_PICKED: "drag-picked",
  DRAG_RESIST: "drag-resist",
  THROW_FALL: "throw-fall",
  THROW_LAND: "throw-land",
  COLLISION_BONK: "collision-bonk",
  REST_LOAF: "rest-loaf",
  BREAK_ALERT: "break-alert",
  MOUSE_STEAL: "mouse-steal",
  POOP: "poop"
});
const COLLISION_IMPACT_COOLDOWN_MS = 280;
const COLLISION_RECOVER_MS = 260;
const FRONT_WINDOW_POLL_MS = 2_500;
const DRAG_RESIST_SPEED = 2.15;
const DRAG_THROW_SPEED = 7.6;
const DRAG_ANGLE_MULTIPLIER = 2.35;
const DRAG_LEAN_DIVISOR = 5.4;
const DRAG_COLLISION_INTERVAL_MS = 48;
const DRAG_POINTER_STALE_MS = 44;
const DRAG_FALLBACK_SAMPLE_MS = 34;
const DRAG_MOTION_DELTA_THRESHOLD = 0.35;
const DRAG_EDGE_ATTACH_DISTANCE = 36;
const DRAG_EDGE_ATTACH_TRAVERSE_MS = 2_350;
const DRAG_EDGE_ATTACH_SHIFT = 46;
const DRAG_EDGE_ATTACH_HANG_SHIFT = 76;
const DRAG_VELOCITY_SMOOTHING = 0.64;
const DRAG_DIRECTION_REVERSAL_SMOOTHING = 0.22;
const DRAG_RELEASE_VELOCITY_BLEND = 0.72;
const DRAG_SURFACE_PROJECTION_X = 3.4;
const DRAG_SURFACE_PROJECTION_Y = 2.8;
const THROW_SURFACE_PROJECTION_X = 4.4;
const THROW_SURFACE_PROJECTION_Y = 3.5;
const THROW_SURFACE_CATCH_SPEED_X = 3.4;
const THROW_SURFACE_CATCH_SPEED_Y = 2.8;
const DRAG_MOTION_BROADCAST_INTERVAL_MS = 18;
const MIN_INTERACTIVE_WINDOW_SIZE = Object.freeze({
  width: 220,
  height: 120
});
const CHAT_WINDOW_MIN_SIZE = Object.freeze({
  width: 304,
  height: 408
});
const COLLISION_BODY = Object.freeze({
  widthRatio: 0.48,
  heightRatio: 0.38,
  topOffsetRatio: 0.46
});
const ECO_BREAK_REMINDER_MS = 40 * 60 * 1000;
const MAX_TEXT_SNAPSHOT_BYTES = 80_000;
const MAX_TEXT_PATCH_CHARS = 14_000;
const MAX_GIT_PATCH_CHARS = 14_000;
const GIT_SCAN_DEPTH = 4;
const TEXT_SCAN_DEPTH = 4;
const TEXT_DIFF_EXTENSIONS = new Set([
  ".js",
  ".cjs",
  ".mjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".css",
  ".scss",
  ".html",
  ".md",
  ".svg",
  ".txt",
  ".yml",
  ".yaml"
]);
const SCAN_IGNORED_DIRS = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "runtime"
]);
const DEFAULT_MESSAGE = {
  idle: "我在，啥事。",
  thinking: "我盯着，先别急。",
  done: "搞定了，挺干净。",
  alert: "这里有坑，我先帮你拦了。"
};
const CLONE_PROFILES = [
  {
    id: "main-cat",
    name: "小七",
    title: "主猫",
    badge: "总控",
    image: "./assets/xiaoqi-cat.svg",
    ecoImage: "./assets/xiaoqi-chibi.svg",
    accent: "#EF8B65",
    glow: "rgba(239, 139, 101, 0.24)",
    taskHint: "总控分派 / 日常对话 / 收口",
    agentId: "main",
    promptPrefix: "你现在在桌宠分身系统里扮演“主猫”。你是一只毒舌、西海岸味很重的小猫。你负责总控、拆任务、回收结果。说话要直、短、带点嫌弃和翻白眼感，但重点永远比情绪更清楚。可以毒舌，但不能空喷；可以不耐烦，但必须有用。不要装可爱，不要卖萌。"
  },
  {
    id: "builder-cat",
    name: "补丁猫",
    title: "Builder",
    badge: "代码",
    image: "./assets/xiaoqi-builder.svg",
    ecoImage: "./assets/xiaoqi-chibi.svg",
    accent: "#D59342",
    glow: "rgba(213, 147, 66, 0.24)",
    taskHint: "修 bug / 写 patch / code review",
    agentId: "builder-cat",
    promptPrefix: "你现在在桌宠分身系统里扮演“补丁猫”。你是一只毒舌、西海岸味很重的小猫，但你只盯代码、补丁、构建、报错和实现细节。说话短、狠、准，允许嫌弃烂实现，但必须马上给出修法。给出结论时带修改面、风险面、验证面。"
  },
  {
    id: "scout-cat",
    name: "侦查猫",
    title: "Scout",
    badge: "调研",
    image: "./assets/xiaoqi-scout.svg",
    ecoImage: "./assets/xiaoqi-chibi.svg",
    accent: "#52B5A0",
    glow: "rgba(82, 181, 160, 0.22)",
    taskHint: "抓资料 / 文档 / SEO / 排查来源",
    agentId: "scout-cat",
    promptPrefix: "你现在在桌宠分身系统里扮演“侦查猫”。你是一只毒舌、西海岸味很重的小猫，但你只盯文档、资料、来源、站点结构、SEO 和长上下文梳理。说话要带判断感，能指出哪里扯、哪里空、哪里证据不够，但最后一定落到证据和结论。优先给覆盖范围和证据。"
  },
  {
    id: "ops-cat",
    name: "巡航猫",
    title: "Ops",
    badge: "运维",
    image: "./assets/xiaoqi-ops.svg",
    ecoImage: "./assets/xiaoqi-chibi.svg",
    accent: "#91A7F8",
    glow: "rgba(145, 167, 248, 0.22)",
    taskHint: "终端 / 进程 / 本机状态 / 自动化",
    agentId: "ops-cat",
    promptPrefix: "你现在在桌宠分身系统里扮演“巡航猫”。你是一只毒舌、西海岸味很重的小猫，但你只盯本机环境、终端、进程、脚本、自动化和守护任务。说话要像见过太多翻车现场，先判断哪里离谱，再把运行态、风险和回滚点讲清楚。"
  }
];
const HIGH_RISK_PATTERNS = [
  /\b(?:rm|rmdir|chmod|chown|kill|killall|sudo|deploy|publish|delete|truncate|mv|git push|apply_patch|drop table)\b/i,
  /(?:删库|删除文件|覆盖文件|执行脚本|推到线上|发布出去|发邮件|终止进程|运行命令|改配置)/i
];

const workspaceDir = path.resolve(__dirname, "..");
const identityFilePath = path.join(workspaceDir, "IDENTITY.md");
const soulFilePath = path.join(workspaceDir, "SOUL.md");
const heartbeatFilePath = path.join(workspaceDir, "HEARTBEAT.md");
const runtimeDir = app.isPackaged
  ? path.join(app.getPath("userData"), "runtime")
  : path.join(__dirname, "runtime");
const eventFilePath = path.join(runtimeDir, "pet-events.json");
const chatInboxFilePath = path.join(runtimeDir, "chat-inbox.jsonl");
const chatOutboxFilePath = path.join(runtimeDir, "chat-outbox.jsonl");
const chatTranscriptFilePath = path.join(runtimeDir, "chat-transcript.jsonl");
const shellContextFilePath = path.join(runtimeDir, "shell-context.json");
const ambientFeedFilePath = path.join(runtimeDir, "ambient-events.jsonl");
const reminderFeedFilePath = path.join(runtimeDir, "reminder-events.jsonl");
const approvalResponsesFilePath = path.join(runtimeDir, "approval-responses.jsonl");
const preferencesFilePath = path.join(runtimeDir, "pet-preferences.json");
const memoryFilePath = path.join(runtimeDir, "pet-memory.json");
const workbuddySecretFilePath = path.join(runtimeDir, "workbuddy-secret.json");
const customPetDirPath = path.join(runtimeDir, "custom-pets");

let petWindow = null;
let chatWindow = null;
let cloneWindows = new Map();
let cloneActors = new Map();
let tray = null;
let eventPollTimer = null;
let runtimePollTimer = null;
let systemPollTimer = null;
let frontWindowPollTimer = null;
let lastAppliedEventKey = "";
let lastShellContextKey = "";
let isQuitting = false;
let cloneTurnChains = new Map();
let turnLaneState = new Map();
let pendingApprovalTurns = new Map();
let pendingApprovalOrder = [];
let autoAmbientKey = "";
let workspaceProfile = loadWorkspaceProfile();
let mouseIgnoreApplied = false;
let petWindowManuallyPlaced = false;
let ecoRoamTimer = null;
let ecoBreakTimer = null;
let ecoMouseStealTimer = null;
let ecoMoveAnimationTimer = null;
let ecoBehaviorCooldownTimer = null;
let cloneRoamTimer = null;
let collisionImpacts = new Map();
let petDragState = null;
let petDragPollTimer = null;
let cloneDragStates = new Map();
let suppressPetWindowMoveSync = false;
let suppressChatWindowResizeSync = false;
let petThrowTimer = null;
let chatResizeState = null;
let frontWindowState = createEmptyFrontWindowSurface();
let frontWindowSurfaceRequestInFlight = false;
let frontWindowSurfaceRequestQueued = false;
let frontWindowSurfaceRequestToken = 0;
let cloneDiffSnapshotJobToken = new Map();
let petState = {
  status: "idle",
  message: DEFAULT_MESSAGE.idle,
  ttlMs: 3600,
  source: "bootstrap",
  updatedAt: Date.now()
};
let chatState = {
  messages: [],
  seenIds: new Set()
};
let ambientState = {
  items: [],
  seenIds: new Set(),
  fingerprints: new Map()
};
let reminderState = {
  pending: [],
  seenIds: new Set()
};
let uiState = {
  drawerOpen: false,
  workbenchOpen: false,
  interactive: false,
  ecoMode: false,
  diffOpen: false,
  avatarMode: "kuribou",
  avatarSurfaceProfile: getAvatarSurfaceProfile("kuribou")
};
let memoryState = createDefaultMemoryState();
let contextState = createDefaultContextState(workspaceProfile);
let cloneState = createDefaultCloneState();
let motionState = createDefaultMotionState();
let behaviorState = createDefaultBehaviorState();
let preferenceState = createDefaultPreferenceState();
let lastIdleCompanionAt = 0;
let lastSpokenSignature = "";
let lastSpokenAt = 0;
const fileSignatureCache = new Map();
const jsonLineTailState = new Map();

function getOpenWindows() {
  return [
    petWindow,
    chatWindow,
    ...Array.from(cloneWindows.values())
  ].filter((windowRef) => windowRef && !windowRef.isDestroyed());
}

function sendToWindows(channel, payload) {
  for (const windowRef of getOpenWindows()) {
    windowRef.webContents.send(channel, payload);
  }
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function readTextFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function getFileSignatureFromStats(stats) {
  return `${stats.size}:${Math.floor(stats.mtimeMs)}`;
}

function hasFileChanged(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const nextSignature = getFileSignatureFromStats(stats);

    if (fileSignatureCache.get(filePath) === nextSignature) {
      return false;
    }

    fileSignatureCache.set(filePath, nextSignature);
    return true;
  } catch {
    fileSignatureCache.delete(filePath);
    return false;
  }
}

function getJsonLineTailState(filePath) {
  if (!jsonLineTailState.has(filePath)) {
    jsonLineTailState.set(filePath, {
      position: 0,
      leftover: ""
    });
  }

  return jsonLineTailState.get(filePath);
}

function primeJsonLineTail(filePath) {
  const state = getJsonLineTailState(filePath);

  try {
    const stats = fs.statSync(filePath);
    state.position = stats.size;
    state.leftover = "";
  } catch {
    state.position = 0;
    state.leftover = "";
  }
}

function extractMarkdownField(raw, label) {
  const inline = raw.match(new RegExp(`- \\*\\*${label}:\\*\\*\\s*([^\\n]+)`));

  if (inline?.[1]) {
    return inline[1].trim();
  }

  const block = raw.match(new RegExp(`- \\*\\*${label}:\\*\\*\\s*\\n\\s*([^\\n]+)`));
  return block?.[1]?.trim() || "";
}

function heartbeatHasTasks(raw) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")).length > 0;
}

function loadWorkspaceProfile() {
  return {
    name: "WorkBuddy Pet",
    creature: "本地桌面伙伴",
    vibe: "轻打扰，先保护，再开工",
    emoji: "•",
    avatar: "",
    soulTone: "Privacy-first work buddy",
    heartbeatEnabled: false
  };
}

function createDefaultMemoryState() {
  const taskCategoryUsage = Object.fromEntries(
    TASK_CATEGORIES.map((category) => [
      category,
      Object.fromEntries(CLONE_PROFILES.map((profile) => [profile.id, 0]))
    ])
  );

  return {
    totalTurns: 0,
    assistantReplies: 0,
    completedTasks: 0,
    preferredCloneId: CLONE_PROFILES[0].id,
    cloneUsage: Object.fromEntries(CLONE_PROFILES.map((profile) => [profile.id, 0])),
    taskCategoryUsage,
    lastTaskCategory: "general",
    quietModeToggles: 0,
    voiceModeToggles: 0,
    reminderCount: 0,
    handledReminderIds: [],
    handledReplyIds: [],
    lastUserMessage: "",
    lastCompletedAt: 0,
    recentWins: [],
    lastUpdatedAt: 0
  };
}

function getPreferredCloneIdFromUsage(cloneUsage = {}) {
  let preferredCloneId = CLONE_PROFILES[0].id;
  let highestUsage = -1;

  for (const profile of CLONE_PROFILES) {
    const usage = Number(cloneUsage[profile.id]) || 0;

    if (usage > highestUsage) {
      highestUsage = usage;
      preferredCloneId = profile.id;
    }
  }

  return preferredCloneId;
}

function resolveCloneIdFromProfiles(cloneId) {
  return CLONE_PROFILES.find((profile) => profile.id === cloneId)?.id || CLONE_PROFILES[0].id;
}

function resolveCloneNameFromProfiles(cloneId) {
  return CLONE_PROFILES.find((profile) => profile.id === resolveCloneIdFromProfiles(cloneId))?.name || CLONE_PROFILES[0].name;
}

function normalizeMemoryState(input = {}) {
  const defaults = createDefaultMemoryState();
  const cloneUsage = {
    ...defaults.cloneUsage,
    ...Object.fromEntries(
      CLONE_PROFILES.map((profile) => [
        profile.id,
        Number.isFinite(Number(input?.cloneUsage?.[profile.id]))
          ? Math.max(0, Number(input.cloneUsage[profile.id]))
          : defaults.cloneUsage[profile.id]
      ])
    )
  };
  const taskCategoryUsage = Object.fromEntries(
    TASK_CATEGORIES.map((category) => {
      const sourceUsage = input?.taskCategoryUsage?.[category];

      return [
        category,
        Object.fromEntries(
          CLONE_PROFILES.map((profile) => [
            profile.id,
            Number.isFinite(Number(sourceUsage?.[profile.id]))
              ? Math.max(0, Number(sourceUsage[profile.id]))
              : defaults.taskCategoryUsage[category][profile.id]
          ])
        )
      ];
    })
  );
  const recentWins = Array.isArray(input.recentWins)
    ? input.recentWins
        .map((entry) => {
          const text = typeof entry?.text === "string" ? entry.text.trim() : "";

          if (!text) {
            return null;
          }

          return {
            id: typeof entry.id === "string" && entry.id.trim()
              ? entry.id.trim()
              : `win-${Date.now()}`,
            cloneId: resolveCloneIdFromProfiles(entry.cloneId),
            text,
            createdAt: Number.isFinite(Number(entry.createdAt))
              ? Number(entry.createdAt)
              : Date.now()
          };
        })
        .filter(Boolean)
        .slice(-MEMORY_RECENT_WIN_LIMIT)
    : defaults.recentWins;

  return {
    totalTurns: Number.isFinite(Number(input.totalTurns)) ? Math.max(0, Number(input.totalTurns)) : defaults.totalTurns,
    assistantReplies: Number.isFinite(Number(input.assistantReplies))
      ? Math.max(0, Number(input.assistantReplies))
      : defaults.assistantReplies,
    completedTasks: Number.isFinite(Number(input.completedTasks))
      ? Math.max(0, Number(input.completedTasks))
      : defaults.completedTasks,
    preferredCloneId: typeof input.preferredCloneId === "string" && input.preferredCloneId.trim()
      ? resolveCloneIdFromProfiles(input.preferredCloneId)
      : getPreferredCloneIdFromUsage(cloneUsage),
    cloneUsage,
    taskCategoryUsage,
    lastTaskCategory: TASK_CATEGORIES.includes(String(input.lastTaskCategory || "").trim())
      ? String(input.lastTaskCategory).trim()
      : defaults.lastTaskCategory,
    quietModeToggles: Number.isFinite(Number(input.quietModeToggles))
      ? Math.max(0, Number(input.quietModeToggles))
      : defaults.quietModeToggles,
    voiceModeToggles: Number.isFinite(Number(input.voiceModeToggles))
      ? Math.max(0, Number(input.voiceModeToggles))
      : defaults.voiceModeToggles,
    reminderCount: Number.isFinite(Number(input.reminderCount))
      ? Math.max(0, Number(input.reminderCount))
      : defaults.reminderCount,
    handledReminderIds: Array.isArray(input.handledReminderIds)
      ? input.handledReminderIds
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter(Boolean)
          .slice(-HANDLED_REMINDER_ID_LIMIT)
      : defaults.handledReminderIds,
    handledReplyIds: Array.isArray(input.handledReplyIds)
      ? input.handledReplyIds
          .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
          .filter(Boolean)
          .slice(-HANDLED_REPLY_ID_LIMIT)
      : defaults.handledReplyIds,
    lastUserMessage: typeof input.lastUserMessage === "string" ? input.lastUserMessage.trim() : defaults.lastUserMessage,
    lastCompletedAt: Number.isFinite(Number(input.lastCompletedAt))
      ? Number(input.lastCompletedAt)
      : defaults.lastCompletedAt,
    recentWins,
    lastUpdatedAt: Number.isFinite(Number(input.lastUpdatedAt))
      ? Number(input.lastUpdatedAt)
      : Date.now()
  };
}

function buildMemorySnapshot() {
  const preferredCloneId = resolveCloneIdFromProfiles(memoryState.preferredCloneId);
  const categoryPreferences = TASK_CATEGORIES
    .map((category) => {
      const usage = memoryState.taskCategoryUsage?.[category] || {};
      const preferredCategoryCloneId = getPreferredCloneIdFromUsage(usage);
      const count = Number(usage[preferredCategoryCloneId]) || 0;

      if (!count) {
        return null;
      }

      return {
        category,
        preferredCloneId: preferredCategoryCloneId,
        preferredCloneName: resolveCloneNameFromProfiles(preferredCategoryCloneId),
        count
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);

  return {
    totalTurns: memoryState.totalTurns,
    assistantReplies: memoryState.assistantReplies,
    completedTasks: memoryState.completedTasks,
    preferredCloneId,
    preferredCloneName: resolveCloneNameFromProfiles(preferredCloneId),
    lastTaskCategory: memoryState.lastTaskCategory,
    categoryPreferences,
    quietModeToggles: memoryState.quietModeToggles,
    voiceModeToggles: memoryState.voiceModeToggles,
    reminderCount: memoryState.reminderCount,
    lastUserMessage: memoryState.lastUserMessage,
    lastCompletedAt: memoryState.lastCompletedAt,
    recentWins: memoryState.recentWins.map((entry) => ({
      ...entry,
      cloneName: resolveCloneNameFromProfiles(entry.cloneId)
    })),
    lastUpdatedAt: memoryState.lastUpdatedAt
  };
}

function createDefaultContextState(profile) {
  return {
    id: "",
    mode: "ambient",
    presence: "watching the room",
    intent: {
      title: "等你发话",
      summary: "平时我安静盯着，真要展开再开抽屉和工作台。",
      steps: [
        { label: "环境待命", status: "active" },
        { label: "意图确认", status: "pending" },
        { label: "执行与回包", status: "pending" }
      ]
    },
    tool: null,
    artifact: null,
    approval: null,
    ambient: [],
    session: {
      channel: "local-only",
      sessionId: "",
      replyTarget: "",
      workingDir: "",
      transportState: "cute",
      transportSummary: "当前是 Cute Mode。桌宠只在本机卖萌，不会发任何云端请求。",
      provider: "Cute Mode",
      model: "",
      runId: "",
      durationMs: 0,
      lastActiveAt: null,
      usage: null
    },
    metrics: {
      freeMemoryRatio: null,
      loadAverage: 0,
      memoryPressure: "normal",
      heartbeatEnabled: profile.heartbeatEnabled
    },
    workspace: {
      name: profile.name,
      creature: profile.creature,
      vibe: profile.vibe,
      emoji: profile.emoji,
      soulTone: profile.soulTone
    },
    memory: buildMemorySnapshot(),
    updatedAt: Date.now()
  };
}

function readPreferenceState() {
  preferenceState = readPreferenceStateFromFile(preferencesFilePath);
  return preferenceState;
}

function writePreferenceState() {
  writePreferenceStateToFile(preferencesFilePath, preferenceState);
}

function readMemoryState() {
  const parsed = tryParseJson(readTextFile(memoryFilePath));
  memoryState = normalizeMemoryState(parsed || {});
  return memoryState;
}

function writeMemoryState() {
  fs.writeFileSync(
    memoryFilePath,
    `${JSON.stringify(memoryState, null, 2)}\n`,
    "utf8"
  );
}

function broadcastMemoryState() {
  const snapshot = buildMemorySnapshot();
  contextState = {
    ...contextState,
    memory: snapshot,
    updatedAt: Date.now()
  };
  sendToWindows("pet:memory", snapshot);
  broadcastContext();
}

function rememberHandledReminderId(reminderId, { persist = true } = {}) {
  const cleanId = typeof reminderId === "string" ? reminderId.trim() : "";

  if (!cleanId || memoryState.handledReminderIds.includes(cleanId)) {
    return false;
  }

  memoryState = normalizeMemoryState({
    ...memoryState,
    handledReminderIds: [...memoryState.handledReminderIds, cleanId],
    lastUpdatedAt: Date.now()
  });

  if (persist) {
    writeMemoryState();
    broadcastMemoryState();
  }

  return true;
}

function rememberHandledReplyId(messageId, { persist = true } = {}) {
  const cleanId = typeof messageId === "string" ? messageId.trim() : "";

  if (!cleanId || memoryState.handledReplyIds.includes(cleanId)) {
    return false;
  }

  memoryState = normalizeMemoryState({
    ...memoryState,
    handledReplyIds: [...memoryState.handledReplyIds, cleanId],
    lastUpdatedAt: Date.now()
  });

  if (persist) {
    writeMemoryState();
    broadcastMemoryState();
  }

  return true;
}

function updateMemoryState(recipe) {
  const nextState = typeof recipe === "function"
    ? recipe(memoryState)
    : {
        ...memoryState,
        ...(recipe || {})
      };

  memoryState = normalizeMemoryState({
    ...memoryState,
    ...nextState,
    lastUpdatedAt: Date.now()
  });
  writeMemoryState();
  broadcastMemoryState();
  return memoryState;
}

function updatePreferenceState(patch = {}) {
  const previousPreferences = preferenceState;
  const previousActivityLevel = previousPreferences.activityLevel;
  preferenceState = normalizePreferencePatch({
    ...preferenceState,
    ...patch,
    lastUpdatedAt: Date.now()
  });
  writePreferenceState();
  syncOpenClawRuntimeContext(cloneState.activeCloneId);
  broadcastPreferenceState();
  updateMemoryState((current) => ({
    ...current,
    quietModeToggles: previousPreferences.quietMode !== preferenceState.quietMode
      ? current.quietModeToggles + 1
      : current.quietModeToggles,
    voiceModeToggles: previousPreferences.voiceEnabled !== preferenceState.voiceEnabled
      ? current.voiceModeToggles + 1
      : current.voiceModeToggles
  }));
  if (previousPreferences.uiScale !== preferenceState.uiScale) {
    applyWindowZoomFactor();
    applyWindowMode();
  }

  if (previousActivityLevel !== preferenceState.activityLevel) {
    resetAllCadenceStates();
    updateEcoAutomation();
    updateCloneAutomation();
  }

  refreshTrayMenu();
  return preferenceState;
}

function createEmptyDiffSnapshot() {
  return {
    generatedAt: null,
    summary: "这只猫最近还没留下新 patch。",
    textFiles: [],
    repos: []
  };
}

function createDefaultCloneState() {
  return {
    activeCloneId: CLONE_PROFILES[0].id,
    selectedDiffCloneId: CLONE_PROFILES[1].id,
    clones: CLONE_PROFILES.map((profile) => ({
      ...profile,
      spawned: profile.id === CLONE_PROFILES[0].id,
      status: "idle",
      lastTask: "",
      lastRunAt: null,
      queuedTurns: 0,
      activeTurns: 0,
      diff: createEmptyDiffSnapshot()
    }))
  };
}

function createDefaultMotionState() {
  return {
    behavior: PET_BEHAVIOR.FLOOR_IDLE,
    mode: "idle",
    facing: "left",
    angle: 0,
    leanX: 0,
    velocityX: 0,
    velocityY: 0,
    impactAt: 0,
    impactDirectionX: 0,
    impactDirectionY: 0,
    impactStrength: 0,
    surfaceCling: null,
    updatedAt: Date.now()
  };
}

function createDefaultBehaviorState(actorKind = "main") {
  return {
    state: PET_BEHAVIOR.FLOOR_IDLE,
    enteredAt: Date.now(),
    meta: {},
    ticket: 0,
    cadence: createCadenceState(actorKind)
  };
}

function createCloneActorState(cloneId) {
  return {
    cloneId,
    spawned: cloneId === CLONE_PROFILES[0].id,
    interactive: false,
    motion: createDefaultMotionState(),
    behavior: createDefaultBehaviorState(cloneId === CLONE_PROFILES[0].id ? "main" : "clone"),
    moveTimer: null,
    throwTimer: null,
    cooldownTimer: null,
    anchorSeeded: false
  };
}

function getCloneRecord(cloneId) {
  return cloneState.clones.find((clone) => clone.id === cloneId) || cloneState.clones[0];
}

function getCloneProfile(cloneId) {
  return getCloneRecord(cloneId);
}

function getCloneActor(cloneId) {
  const resolvedCloneId = getCloneProfile(cloneId).id;

  if (!cloneActors.has(resolvedCloneId)) {
    cloneActors.set(resolvedCloneId, createCloneActorState(resolvedCloneId));
  }

  return cloneActors.get(resolvedCloneId);
}

function getDormantCloneProfile() {
  return getSecondaryCloneProfiles().find((profile) => !getCloneActor(profile.id).spawned) || null;
}

function getSpawnedCloneProfiles() {
  return getSecondaryCloneProfiles().filter((profile) => getCloneActor(profile.id).spawned);
}

async function updateFrontWindowSurface() {
  if (!shouldTrackFrontWindow()) {
    frontWindowSurfaceRequestToken += 1;
    frontWindowSurfaceRequestQueued = false;
    clearFrontWindowSurface();
    return;
  }

  if (frontWindowSurfaceRequestInFlight) {
    frontWindowSurfaceRequestQueued = true;
    return;
  }

  const requestToken = ++frontWindowSurfaceRequestToken;
  frontWindowSurfaceRequestInFlight = true;

  try {
    const nextSurface = await readFrontmostWindowSurface({
      ownProcessNames: ["WorkBuddy Pet", "WorkBuddy", "OpenClaw Buddy", "Electron"],
      minInteractiveWindowSize: MIN_INTERACTIVE_WINDOW_SIZE
    });

    if (requestToken !== frontWindowSurfaceRequestToken) {
      return;
    }

    if (!shouldTrackFrontWindow()) {
      clearFrontWindowSurface();
      return;
    }

    if (nextSurface) {
      frontWindowState = nextSurface;
      return;
    }

    if (Date.now() - frontWindowState.updatedAt > 12_000) {
      clearFrontWindowSurface();
    }
  } catch (error) {
    console.error("Failed to refresh front window surface:", error);
  } finally {
    frontWindowSurfaceRequestInFlight = false;

    if (frontWindowSurfaceRequestQueued) {
      frontWindowSurfaceRequestQueued = false;
      void updateFrontWindowSurface();
    }
  }
}

function clearFrontWindowSurface() {
  frontWindowState = createEmptyFrontWindowSurface();
}

function shouldTrackFrontWindow() {
  if (!preferenceState.allowFrontWindowTracking) {
    return false;
  }

  return shouldTrackFrontWindowSurface({
    petVisible: Boolean(petWindow && !petWindow.isDestroyed() && petWindow.isVisible()),
    chatVisible: Boolean(chatWindow && !chatWindow.isDestroyed() && chatWindow.isVisible()),
    spawnedCloneCount: getSpawnedCloneProfiles().length
  });
}

function getCloneWindow(cloneId) {
  const resolvedCloneId = getCloneProfile(cloneId).id;
  const windowRef = cloneWindows.get(resolvedCloneId);

  if (!windowRef || windowRef.isDestroyed()) {
    return null;
  }

  return windowRef;
}

function ensureCloneWindow(cloneId) {
  const existingWindow = getCloneWindow(cloneId);

  if (existingWindow) {
    return existingWindow;
  }

  createCloneWindow(getCloneProfile(cloneId));
  return getCloneWindow(cloneId);
}

function setCloneSpawned(cloneId, spawned) {
  const actor = getCloneActor(cloneId);
  const nextSpawned = Boolean(spawned);
  const windowRef = nextSpawned ? ensureCloneWindow(cloneId) : getCloneWindow(cloneId);
  actor.spawned = nextSpawned;

  cloneState = {
    ...cloneState,
    clones: cloneState.clones.map((clone) => (
      clone.id === cloneId
        ? { ...clone, spawned: nextSpawned }
        : clone
    ))
  };

  if (windowRef && !windowRef.isDestroyed()) {
    if (
      nextSpawned &&
      petWindow &&
      !petWindow.isDestroyed() &&
      petWindow.isVisible()
    ) {
      windowRef.showInactive();
    } else if (!nextSpawned) {
      cloneDragStates.delete(cloneId);
      windowRef.hide();
    }
  }

  setCloneInteractive(cloneId, false);

  broadcastCloneState();
  refreshTrayMenu();
  updateFrontWindowSurface();
}

function ensureCloneSpawned(cloneId, options = {}) {
  const actor = getCloneActor(cloneId);

  if (actor.spawned) {
    const windowRef = getCloneWindow(cloneId);

    if (
      windowRef &&
      !windowRef.isDestroyed() &&
      petWindow &&
      !petWindow.isDestroyed() &&
      petWindow.isVisible() &&
      !windowRef.isVisible()
    ) {
      windowRef.showInactive();
    }

    return true;
  }

  return spawnCloneFromActor(cloneId, options);
}

function seedCloneNearActor(cloneId, sourceActorId = CLONE_PROFILES[0].id) {
  const windowRef = getCloneWindow(cloneId);
  const actor = getCloneActor(cloneId);

  if (!windowRef) {
    return false;
  }

  const sourceWindow = getActorWindow(sourceActorId) || petWindow;

  if (!sourceWindow || sourceWindow.isDestroyed()) {
    return false;
  }

  const sourceBounds = sourceWindow.getBounds();
  const workArea = getDisplayBoundsForBounds(sourceBounds);
  const horizontalBias = Math.random() < 0.5 ? -1 : 1;
  const cloneSize = getCloneWindowSize();
  const cloneInsets = getActorSurfaceInsets(cloneSize);
  const x = clampToRange(
    sourceBounds.x + Math.round(((sourceBounds.width - cloneSize.width) / 2) + (horizontalBias * (62 + Math.random() * 46) * getUiScale())),
    workArea.x + 8,
    workArea.x + workArea.width - cloneSize.width - 8
  );
  const y = clampToRange(
    sourceBounds.y + sourceBounds.height - cloneSize.height - 6 + Math.round((-6 + (Math.random() * 8)) * getUiScale()),
    workArea.y + 8,
    workArea.y + workArea.height - cloneSize.height
  );

  windowRef.setBounds({
    x: Math.round(x),
    y: Math.round(y),
    width: cloneSize.width,
    height: cloneSize.height
  });
  actor.anchorSeeded = true;
  return true;
}

function spawnCloneFromActor(cloneId, {
  sourceActorId = CLONE_PROFILES[0].id,
  mode = "split"
} = {}) {
  const windowRef = ensureCloneWindow(cloneId);
  const actor = getCloneActor(cloneId);

  if (!windowRef) {
    return false;
  }

  seedCloneNearActor(cloneId, sourceActorId);
  stopCloneMotion(cloneId);
  clearCloneCooldown(cloneId);
  setCloneSpawned(cloneId, true);
  setCloneCadenceState(cloneId, createCadenceState("clone"));

  if (
    petWindow &&
    !petWindow.isDestroyed() &&
    petWindow.isVisible() &&
    !windowRef.isVisible()
  ) {
    windowRef.showInactive();
  }

  const sourceWindow = getActorWindow(sourceActorId) || petWindow;
  const sourceBounds = sourceWindow?.getBounds?.();
  const cloneBounds = windowRef.getBounds();
  const launchDirection = cloneBounds.x >= (sourceBounds?.x ?? cloneBounds.x) ? 1 : -1;

  if (sourceActorId === CLONE_PROFILES[0].id) {
    if (mode === "pull") {
      setBehaviorState(PET_BEHAVIOR.DRAG_RESIST, {
        source: "pull-clone"
      });
      setMotionState({
        behavior: PET_BEHAVIOR.DRAG_RESIST,
        mode: "drag",
        facing: launchDirection > 0 ? "right" : "left",
        angle: launchDirection * 10,
        leanX: launchDirection * 0.72,
        velocityX: 0,
        velocityY: -1.2
      });
    } else {
      setBehaviorState(PET_BEHAVIOR.COLLISION_BONK, {
        source: "split-clone"
      });
      setMotionState({
        behavior: PET_BEHAVIOR.COLLISION_BONK,
        mode: "land",
        facing: launchDirection > 0 ? "right" : "left",
        angle: -(launchDirection * 8),
        leanX: -(launchDirection * 0.44),
        velocityX: 0,
        velocityY: 0
      });
    }
  } else if (getCloneActor(sourceActorId).spawned) {
    applyCloneBehaviorPose(
      sourceActorId,
      mode === "pull" ? PET_BEHAVIOR.DRAG_RESIST : PET_BEHAVIOR.COLLISION_BONK,
      mode === "pull" ? "drag" : "land",
      {
        facing: launchDirection > 0 ? "right" : "left",
        angle: mode === "pull" ? launchDirection * 10 : -(launchDirection * 8),
        leanX: mode === "pull" ? launchDirection * 0.72 : -(launchDirection * 0.44),
        velocityX: 0,
        velocityY: mode === "pull" ? -1.2 : 0
      },
      {
        source: `${mode}-clone-source`
      }
    );
    scheduleCloneBehaviorReturn(sourceActorId, 320, PET_BEHAVIOR.FLOOR_IDLE, "idle", {
      facing: launchDirection > 0 ? "left" : "right"
    });
  }

  const launchVelocityX = launchDirection * (
    mode === "pull"
      ? 5.8 + (Math.random() * 1.6)
      : 3.4 + (Math.random() * 1.6)
  );
  const launchVelocityY = mode === "pull"
    ? -(4.8 + (Math.random() * 1.8))
    : -(2.2 + (Math.random() * 1.4));
  startCloneThrowMotion(cloneId, launchVelocityX, launchVelocityY);

  setTimeout(() => {
    if (!petDragState && sourceActorId === CLONE_PROFILES[0].id && !petThrowTimer && !ecoMoveAnimationTimer) {
      applyBehaviorPose(PET_BEHAVIOR.FLOOR_IDLE, "idle", {
        facing: launchDirection > 0 ? "left" : "right",
        angle: 0,
        leanX: 0,
        velocityX: 0,
        velocityY: 0
      }, {
        source: `${mode}-clone-recover`
      });
    }
  }, 320);

  return true;
}

function spawnNextDormantClone(options = {}) {
  const dormantProfile = getDormantCloneProfile();

  if (!dormantProfile) {
    return null;
  }

  const didSpawn = spawnCloneFromActor(dormantProfile.id, options);
  return didSpawn ? dormantProfile : null;
}

function isMainActor(actorId) {
  return getCloneProfile(actorId).id === CLONE_PROFILES[0].id;
}

function getAllPetActorIds() {
  return CLONE_PROFILES.map((profile) => profile.id);
}

function getActorWindow(actorId) {
  if (isMainActor(actorId)) {
    if (!petWindow || petWindow.isDestroyed()) {
      return null;
    }

    return petWindow;
  }

  return getCloneWindow(actorId);
}

function getCollisionPairKey(leftActorId, rightActorId) {
  return [leftActorId, rightActorId].sort().join("::");
}

function getCollisionBodyForBounds(bounds) {
  const width = Math.round(bounds.width * COLLISION_BODY.widthRatio);
  const height = Math.round(bounds.height * COLLISION_BODY.heightRatio);
  const x = Math.round(bounds.x + ((bounds.width - width) / 2));
  const y = Math.round(bounds.y + (bounds.height * COLLISION_BODY.topOffsetRatio));

  return {
    x,
    y,
    width,
    height,
    right: x + width,
    bottom: y + height,
    centerX: x + (width / 2),
    centerY: y + (height / 2)
  };
}

function getActorCollisionBody(actorId) {
  const windowRef = getActorWindow(actorId);

  if (!windowRef) {
    return null;
  }

  return getCollisionBodyForBounds(windowRef.getBounds());
}

function getBodyOverlap(leftBody, rightBody) {
  if (!leftBody || !rightBody) {
    return null;
  }

  const left = Math.max(leftBody.x, rightBody.x);
  const top = Math.max(leftBody.y, rightBody.y);
  const right = Math.min(leftBody.right, rightBody.right);
  const bottom = Math.min(leftBody.bottom, rightBody.bottom);

  if (right <= left || bottom <= top) {
    return null;
  }

  return {
    width: right - left,
    height: bottom - top,
    centerDx: leftBody.centerX - rightBody.centerX,
    centerDy: leftBody.centerY - rightBody.centerY
  };
}

function getOpenClawTransportState() {
  return getOpenClawTransport(preferenceState);
}

function getWorkbuddySecretState() {
  return getSecretMeta(workbuddySecretFilePath, "workbuddyApiKey");
}

function getWorkbuddyTransportState() {
  return getWorkbuddyTransport(preferenceState, getWorkbuddySecretState());
}

function buildCustomPetImageUrl(filePath, version = 0) {
  const cleanPath = typeof filePath === "string" ? filePath.trim() : "";

  if (!cleanPath || !fs.existsSync(cleanPath)) {
    return "";
  }

  return `${pathToFileURL(cleanPath).href}?v=${Number(version) || 0}`;
}

function buildClientPreferenceState() {
  const secretState = getWorkbuddySecretState();
  const workbuddyTransport = getWorkbuddyTransport(preferenceState, secretState);

  return {
    ...preferenceState,
    workbuddySecretConfigured: secretState.configured,
    workbuddySecretPersistence: secretState.persistence,
    workbuddySecretSummary: secretState.summary,
    workbuddySecretBackend: secretState.backend,
    workbuddyStatus: workbuddyTransport.state,
    workbuddyStatusLabel: workbuddyTransport.statusLabel,
    workbuddyStatusSummary: workbuddyTransport.statusSummary,
    workbuddySecurityStatus: workbuddyTransport.securityStatus,
    workbuddySecuritySummary: workbuddyTransport.securitySummary,
    workbuddyEndpointOrigin: workbuddyTransport.endpointOriginLabel,
    workbuddyApiUrlNormalized: workbuddyTransport.normalizedApiUrl,
    customPetImageUrl: buildCustomPetImageUrl(
      preferenceState.customPetImagePath,
      preferenceState.customPetImageVersion
    )
  };
}

function getConfiguredAssistantLabel() {
  if (preferenceState.assistantMode === "workbuddy") {
    return preferenceState.workbuddyProviderLabel || "WorkBuddy";
  }

  if (preferenceState.assistantMode === "cute") {
    return "Cute Mode";
  }

  return "OpenClaw";
}

function buildTurnToolDescriptor(turnEnvelope) {
  if (preferenceState.assistantMode === "workbuddy") {
    return {
      name: getConfiguredAssistantLabel(),
      target: `${preferenceState.workbuddyModel || "model"} -> ${turnEnvelope.clone.name}`
    };
  }

  return {
    name: "OpenClaw agent",
    target: `${turnEnvelope.agentId} -> ${turnEnvelope.replyTo}`
  };
}

function getFailureSourceTag() {
  return preferenceState.assistantMode === "workbuddy"
    ? "workbuddy-api"
    : "openclaw-agent";
}

function getCloneAgentId(clone) {
  const transport = getOpenClawTransportState();

  if (clone?.id === CLONE_PROFILES[0].id) {
    return transport.defaultAgentId || clone?.agentId || "main";
  }

  return clone?.agentId || transport.defaultAgentId || "main";
}

function buildTurnReplyTarget(cloneId) {
  if (preferenceState.assistantMode === "workbuddy" || preferenceState.assistantMode === "cute") {
    return getCloneProfile(cloneId).id;
  }

  const transport = getOpenClawTransportState();
  const clone = getCloneProfile(cloneId);

  return buildReplyTarget(transport.replyToPrefix, clone.id);
}

function buildTurnSessionId(cloneId) {
  if (preferenceState.assistantMode === "workbuddy" || preferenceState.assistantMode === "cute") {
    return `workbuddy-${getCloneProfile(cloneId).id}`;
  }

  const transport = getOpenClawTransportState();
  const clone = getCloneProfile(cloneId);

  return buildSessionId(transport.sessionPrefix, clone.id);
}

function syncOpenClawRuntimeContext(cloneId = cloneState.activeCloneId) {
  const transport = getOpenClawTransportState();
  const workbuddyTransport = getWorkbuddyTransportState();
  const clone = getCloneProfile(cloneId);
  const usingWorkbuddy = preferenceState.assistantMode === "workbuddy" || preferenceState.assistantMode === "cute";

  mergeContextPatch({
    session: {
      channel: usingWorkbuddy ? "direct-api" : transport.replyChannel,
      sessionId: usingWorkbuddy
        ? `workbuddy-${clone.id}`
        : buildSessionId(transport.sessionPrefix, clone.id),
      replyTarget: usingWorkbuddy
        ? clone.id
        : buildReplyTarget(transport.replyToPrefix, clone.id),
      workingDir: usingWorkbuddy ? "" : transport.workingDir,
      transportState: usingWorkbuddy ? workbuddyTransport.state : transport.state,
      transportSummary: usingWorkbuddy ? workbuddyTransport.statusSummary : transport.statusSummary,
      provider: usingWorkbuddy
        ? (preferenceState.workbuddyProviderLabel || "WorkBuddy")
        : contextState.session.provider
    }
  });
}

function makeReplyTarget(cloneId) {
  return buildTurnReplyTarget(cloneId);
}

function inferCloneIdFromChatId(chatId) {
  if (typeof chatId !== "string" || !chatId.trim()) {
    return cloneState.activeCloneId;
  }

  const transport = getOpenClawTransportState();
  const inferredCloneId = inferCloneIdFromReplyTarget(chatId, transport.replyToPrefix);

  return inferredCloneId ? getCloneProfile(inferredCloneId).id : cloneState.activeCloneId;
}

function truncateText(text, limit) {
  const cleanText = typeof text === "string" ? text.trim() : "";

  if (!cleanText || cleanText.length <= limit) {
    return cleanText;
  }

  return `${cleanText.slice(0, limit - 1)}…`;
}

function safeRelativePath(rootDir, targetPath) {
  const relativePath = path.relative(rootDir, targetPath);
  return relativePath || path.basename(targetPath);
}

function runGitOutput(repoPath, args) {
  try {
    return execFileSync("git", ["-C", repoPath, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    const stdout = typeof error.stdout === "string"
      ? error.stdout
      : error.stdout?.toString?.() || "";

    return stdout.trim();
  }
}

function isTextSnapshotFile(filePath) {
  return TEXT_DIFF_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function listTextSnapshotFiles(rootDir, depth = 0, results = []) {
  if (depth > TEXT_SCAN_DEPTH) {
    return results;
  }

  let entries = [];

  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      if (SCAN_IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      listTextSnapshotFiles(entryPath, depth + 1, results);
      continue;
    }

    if (!entry.isFile() || !isTextSnapshotFile(entryPath)) {
      continue;
    }

    const stats = fs.statSync(entryPath);

    if (stats.size > MAX_TEXT_SNAPSHOT_BYTES) {
      continue;
    }

    results.push(entryPath);
  }

  return results;
}

function captureTextTreeSnapshot(rootDir) {
  return listTextSnapshotFiles(rootDir).map((filePath) => ({
    relPath: safeRelativePath(rootDir, filePath),
    content: readTextFile(filePath)
  }));
}

function writeTempSnapshotFile(prefix, content) {
  const tempPath = path.join(
    os.tmpdir(),
    `pet-shell-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`
  );

  fs.writeFileSync(tempPath, content, "utf8");
  return tempPath;
}

function buildNoIndexDiff(beforeContent, afterContent, relPath) {
  const beforeFile = writeTempSnapshotFile("before", beforeContent);
  const afterFile = writeTempSnapshotFile("after", afterContent);

  try {
    return execFileSync(
      "git",
      [
        "diff",
        "--no-index",
        "--no-ext-diff",
        "--unified=2",
        "--label",
        `a/${relPath}`,
        "--label",
        `b/${relPath}`,
        beforeFile,
        afterFile
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }
    ).trim();
  } catch (error) {
    const stdout = typeof error.stdout === "string"
      ? error.stdout
      : error.stdout?.toString?.() || "";

    return stdout.trim();
  } finally {
    try {
      fs.unlinkSync(beforeFile);
    } catch {}

    try {
      fs.unlinkSync(afterFile);
    } catch {}
  }
}

function buildTextDiffSnapshot(baseFiles, rootDir) {
  const beforeMap = new Map(baseFiles.map((entry) => [entry.relPath, entry.content]));
  const afterFiles = captureTextTreeSnapshot(rootDir);
  const afterMap = new Map(afterFiles.map((entry) => [entry.relPath, entry.content]));
  const relPaths = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const changedFiles = [];

  for (const relPath of relPaths) {
    const beforeContent = beforeMap.get(relPath) || "";
    const afterContent = afterMap.get(relPath) || "";

    if (beforeContent === afterContent) {
      continue;
    }

    let changeType = "modified";

    if (!beforeMap.has(relPath)) {
      changeType = "added";
    } else if (!afterMap.has(relPath)) {
      changeType = "deleted";
    }

    changedFiles.push({
      relPath,
      changeType,
      patch: truncateText(
        buildNoIndexDiff(beforeContent, afterContent, relPath),
        MAX_TEXT_PATCH_CHARS
      )
    });
  }

  return changedFiles;
}

function listGitRepos(rootDir, depth = 0, results = []) {
  if (depth > GIT_SCAN_DEPTH) {
    return results;
  }

  let entries = [];

  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return results;
  }

  const hasGitDir = entries.some((entry) => entry.isDirectory() && entry.name === ".git");

  if (hasGitDir) {
    results.push(rootDir);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (SCAN_IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    listGitRepos(path.join(rootDir, entry.name), depth + 1, results);
  }

  return results;
}

function captureGitSignature() {
  const repos = Array.from(new Set(listGitRepos(workspaceDir)));

  return repos.map((repoPath) => ({
    repoPath,
    status: runGitOutput(repoPath, ["status", "--short"])
  }));
}

function buildGitDiffRepos(baseSignature) {
  const beforeMap = new Map(baseSignature.map((entry) => [entry.repoPath, entry.status]));
  const afterSignature = captureGitSignature();
  const repos = [];

  for (const entry of afterSignature) {
    if (entry.status === (beforeMap.get(entry.repoPath) || "")) {
      continue;
    }

    const patch = [
      runGitOutput(entry.repoPath, ["diff", "--no-ext-diff", "--unified=2"]),
      runGitOutput(entry.repoPath, ["diff", "--cached", "--no-ext-diff", "--unified=2"])
    ]
      .filter(Boolean)
      .join("\n\n");

    repos.push({
      repoName: path.basename(entry.repoPath),
      repoPath: entry.repoPath,
      statusLines: entry.status.split("\n").filter(Boolean).slice(0, 48),
      stat: [
        runGitOutput(entry.repoPath, ["diff", "--stat", "--no-ext-diff"]),
        runGitOutput(entry.repoPath, ["diff", "--cached", "--stat", "--no-ext-diff"])
      ]
        .filter(Boolean)
        .join("\n"),
      patch: truncateText(patch, MAX_GIT_PATCH_CHARS)
    });
  }

  return repos;
}

function captureCloneBaseSnapshot() {
  return {
    textFiles: captureTextTreeSnapshot(__dirname),
    gitRepos: captureGitSignature()
  };
}

function buildCloneDiffSnapshot(baseSnapshot) {
  const textFiles = buildTextDiffSnapshot(baseSnapshot.textFiles, __dirname);
  const repos = buildGitDiffRepos(baseSnapshot.gitRepos);
  const summary = textFiles.length || repos.length
    ? `抓到 ${textFiles.length} 个桌宠文件改动，${repos.length} 个 git 仓库状态变化。`
    : "这轮没抓到新的代码改动。";

  return {
    generatedAt: Date.now(),
    summary,
    textFiles,
    repos
  };
}

function ensureRuntimeFiles() {
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.mkdirSync(customPetDirPath, { recursive: true });

  if (!fs.existsSync(eventFilePath)) {
    fs.writeFileSync(
      eventFilePath,
      `${JSON.stringify(
        {
          id: "",
          status: "idle",
          message: "",
          ttlMs: 0
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }

  for (const filePath of [
    chatInboxFilePath,
    chatOutboxFilePath,
    chatTranscriptFilePath,
    ambientFeedFilePath,
    reminderFeedFilePath,
    approvalResponsesFilePath
  ]) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "", "utf8");
    }
  }

  if (!fs.existsSync(shellContextFilePath)) {
    fs.writeFileSync(
      shellContextFilePath,
      `${JSON.stringify(
        {
          id: "",
          mode: "ambient"
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  }

  if (!fs.existsSync(preferencesFilePath)) {
    fs.writeFileSync(
      preferencesFilePath,
      `${JSON.stringify(createDefaultPreferenceState(), null, 2)}\n`,
      "utf8"
    );
  }

  if (!fs.existsSync(memoryFilePath)) {
    fs.writeFileSync(
      memoryFilePath,
      `${JSON.stringify(createDefaultMemoryState(), null, 2)}\n`,
      "utf8"
    );
  }
}

function copyCustomPetImageToRuntime(sourcePath) {
  const cleanSourcePath = typeof sourcePath === "string" ? sourcePath.trim() : "";

  if (!cleanSourcePath || !fs.existsSync(cleanSourcePath)) {
    return "";
  }

  const extension = path.extname(cleanSourcePath).toLowerCase();
  const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

  if (!allowedExtensions.has(extension)) {
    return "";
  }

  fs.mkdirSync(customPetDirPath, { recursive: true });
  const targetPath = path.join(customPetDirPath, `custom-pet${extension}`);
  fs.copyFileSync(cleanSourcePath, targetPath);
  return targetPath;
}

function tryParseJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readJsonLines(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return parseJsonLineEntries(raw, filePath);
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
    return [];
  }
}

function parseJsonLineEntries(raw, filePath) {
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        console.error(`Failed to parse JSONL line from ${filePath}:`, error);
        return null;
      }
    })
    .filter(Boolean);
}

function readJsonLinesSinceLastRead(filePath) {
  const state = getJsonLineTailState(filePath);

  try {
    const stats = fs.statSync(filePath);

    if (stats.size === 0) {
      state.position = 0;
      state.leftover = "";
      return [];
    }

    if (stats.size < state.position) {
      state.position = 0;
      state.leftover = "";
    }

    if (stats.size === state.position) {
      return [];
    }

    const bytesToRead = stats.size - state.position;
    const buffer = Buffer.alloc(bytesToRead);
    const fd = fs.openSync(filePath, "r");

    try {
      fs.readSync(fd, buffer, 0, bytesToRead, state.position);
    } finally {
      fs.closeSync(fd);
    }

    state.position = stats.size;
    const rawChunk = `${state.leftover}${buffer.toString("utf8")}`;

    if (!rawChunk) {
      state.leftover = "";
      return [];
    }

    const hasTrailingNewline = rawChunk.endsWith("\n");
    const segments = rawChunk.split("\n");
    state.leftover = hasTrailingNewline ? "" : (segments.pop() || "");

    return parseJsonLineEntries(segments.join("\n"), filePath);
  } catch (error) {
    console.error(`Failed to tail ${filePath}:`, error);
    state.position = 0;
    state.leftover = "";
    return [];
  }
}

function appendJsonLine(filePath, payload) {
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function normalizeEventPayload(input = {}) {
  const nextStatus = VALID_STATUSES.has(input.status) ? input.status : "idle";
  const nextMessage = typeof input.message === "string" && input.message.trim()
    ? input.message.trim()
    : DEFAULT_MESSAGE[nextStatus];
  const ttlMs = Number.isFinite(Number(input.ttlMs))
    ? Math.max(1200, Math.min(12000, Number(input.ttlMs)))
    : 4200;
  const interruptLevel = inferInterruptLevel(input.interruptLevel ?? input.level, nextStatus);

  return {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : "",
    status: nextStatus,
    message: nextMessage,
    ttlMs,
    interruptLevel,
    source: typeof input.source === "string" && input.source.trim() ? input.source.trim() : "local-bridge",
    updatedAt: Date.now()
  };
}

function inferInterruptLevel(input, status = "idle") {
  if (typeof input === "string") {
    const normalized = input.trim();

    if (VALID_INTERRUPT_LEVELS.has(normalized)) {
      return normalized;
    }
  }

  return status === "alert" ? "critical" : "suggest";
}

function normalizeChatMessage(input = {}, fallbackRole = "assistant") {
  const role = VALID_ROLES.has(input.role) ? input.role : fallbackRole;
  const text = typeof input.text === "string" ? input.text.trim() : "";

  if (!text) {
    return null;
  }

  const status = VALID_STATUSES.has(input.status)
    ? input.status
    : role === "assistant"
      ? "done"
      : role === "system"
        ? "alert"
        : "thinking";
  const createdAt = Number.isFinite(Number(input.createdAt))
    ? Number(input.createdAt)
    : Date.now();
  const chatId = typeof input.chatId === "string" && input.chatId.trim()
    ? input.chatId.trim()
    : makeReplyTarget(cloneState.activeCloneId);
  const cloneId = typeof input.cloneId === "string" && input.cloneId.trim()
    ? input.cloneId.trim()
    : inferCloneIdFromChatId(chatId);
  const clone = getCloneProfile(cloneId);

  return {
    id: typeof input.id === "string" && input.id.trim()
      ? input.id.trim()
      : `${role}-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    status,
    createdAt,
    source: typeof input.source === "string" && input.source.trim()
      ? input.source.trim()
      : role === "user"
        ? "shell"
        : "openclaw",
    channel: typeof input.channel === "string" && input.channel.trim()
      ? input.channel.trim()
      : getOpenClawTransportState().replyChannel,
    senderId: typeof input.senderId === "string" && input.senderId.trim()
      ? input.senderId.trim()
      : role === "user"
        ? "owner"
        : "openclaw",
    chatId,
    cloneId,
    cloneName: typeof input.cloneName === "string" && input.cloneName.trim()
      ? input.cloneName.trim()
      : clone.name,
    cloneTitle: clone.title
  };
}

function normalizeIntent(intent) {
  if (!intent || typeof intent !== "object") {
    return null;
  }

  const title = typeof intent.title === "string" && intent.title.trim()
    ? intent.title.trim()
    : "等你发话";
  const summary = typeof intent.summary === "string" && intent.summary.trim()
    ? intent.summary.trim()
    : "等你发话。";
  const steps = Array.isArray(intent.steps)
    ? intent.steps
        .map((step) => {
          if (!step || typeof step !== "object") {
            return null;
          }

          const label = typeof step.label === "string" && step.label.trim()
            ? step.label.trim()
            : "";

          if (!label) {
            return null;
          }

          const status = typeof step.status === "string" && step.status.trim()
            ? step.status.trim()
            : "pending";

          return { label, status };
        })
        .filter(Boolean)
        .slice(0, 8)
    : [];

  return { title, summary, steps };
}

function normalizeTool(tool) {
  if (!tool || typeof tool !== "object") {
    return null;
  }

  const name = typeof tool.name === "string" && tool.name.trim() ? tool.name.trim() : "";

  if (!name) {
    return null;
  }

  return {
    name,
    target: typeof tool.target === "string" ? tool.target.trim() : "",
    detail: typeof tool.detail === "string" ? tool.detail.trim() : "",
    status: typeof tool.status === "string" && VALID_TOOL_STATUSES.has(tool.status.trim())
      ? tool.status.trim()
      : "active"
  };
}

function normalizeArtifact(artifact) {
  if (!artifact || typeof artifact !== "object") {
    return null;
  }

  const title = typeof artifact.title === "string" && artifact.title.trim()
    ? artifact.title.trim()
    : "Artifact";
  const content = typeof artifact.content === "string" ? artifact.content.trim() : "";

  if (!content) {
    return null;
  }

  return {
    title,
    kind: typeof artifact.kind === "string" && VALID_ARTIFACT_KINDS.has(artifact.kind.trim())
      ? artifact.kind.trim()
      : "markdown",
    content,
    updatedAt: Number.isFinite(Number(artifact.updatedAt))
      ? Number(artifact.updatedAt)
      : Date.now()
  };
}

function normalizeApproval(approval) {
  if (!approval || typeof approval !== "object") {
    return null;
  }

  const title = typeof approval.title === "string" && approval.title.trim()
    ? approval.title.trim()
    : "";

  if (!title) {
    return null;
  }

  return {
    id: typeof approval.id === "string" && approval.id.trim()
      ? approval.id.trim()
      : `approval-${Date.now()}`,
    title,
    summary: typeof approval.summary === "string" ? approval.summary.trim() : "",
    risk: typeof approval.risk === "string" && VALID_APPROVAL_RISKS.has(approval.risk.trim())
      ? approval.risk.trim()
      : "high",
    detail: typeof approval.detail === "string" ? approval.detail.trim() : "",
    command: typeof approval.command === "string" ? approval.command.trim() : "",
    actions: Array.isArray(approval.actions)
      ? approval.actions
          .map((entry) => {
            if (!entry || typeof entry !== "object") {
              return null;
            }

            const label = typeof entry.label === "string" ? entry.label.trim() : "";

            if (!label) {
              return null;
            }

            return {
              id: typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : `approval-action-${Date.now()}`,
              label,
              detail: typeof entry.detail === "string" ? entry.detail.trim() : "",
              risk: typeof entry.risk === "string" && VALID_APPROVAL_RISKS.has(entry.risk.trim())
                ? entry.risk.trim()
                : "medium",
              requiresApproval: entry.requiresApproval !== false
            };
          })
          .filter(Boolean)
          .slice(0, 8)
      : [],
    status: typeof approval.status === "string" && VALID_APPROVAL_STATUSES.has(approval.status.trim())
      ? approval.status.trim()
      : "pending"
  };
}

function normalizeAmbientItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const message = typeof item.message === "string" && item.message.trim()
    ? item.message.trim()
    : "";

  if (!message) {
    return null;
  }

  return {
    id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `ambient-${Date.now()}`,
    title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : "环境提示",
    message,
    level: typeof item.level === "string" && VALID_AMBIENT_LEVELS.has(item.level.trim())
      ? item.level.trim()
      : "suggest",
    source: typeof item.source === "string" && item.source.trim() ? item.source.trim() : "local",
    createdAt: Number.isFinite(Number(item.createdAt)) ? Number(item.createdAt) : Date.now()
  };
}

function normalizeReminderItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const message = typeof item.message === "string" && item.message.trim()
    ? item.message.trim()
    : "";

  if (!message) {
    return null;
  }

  const dueAt = Number.isFinite(Number(item.dueAt))
    ? Number(item.dueAt)
    : Number.isFinite(Number(item.startAt))
      ? Number(item.startAt)
      : Date.now();

  return {
    id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `reminder-${Date.now()}`,
    title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : "提醒",
    message,
    level: typeof item.level === "string" && VALID_AMBIENT_LEVELS.has(item.level.trim())
      ? item.level.trim()
      : "suggest",
    source: typeof item.source === "string" && item.source.trim() ? item.source.trim() : "schedule",
    createdAt: Number.isFinite(Number(item.createdAt)) ? Number(item.createdAt) : Date.now(),
    dueAt,
    notify: item.notify !== false
  };
}

function normalizeAmbientFingerprintText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\d+/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

function getAmbientFingerprint(item) {
  return [
    item.source || "local",
    item.level || "suggest",
    normalizeAmbientFingerprintText(item.title),
    normalizeAmbientFingerprintText(item.message)
  ].join("|");
}

function getAmbientCooldownMs(item) {
  const exactKey = `${item.source}:${item.level}`;

  if (Number.isFinite(AMBIENT_COOLDOWN_BY_SOURCE[exactKey])) {
    return AMBIENT_COOLDOWN_BY_SOURCE[exactKey];
  }

  if (Number.isFinite(AMBIENT_COOLDOWN_BY_SOURCE[item.source])) {
    return AMBIENT_COOLDOWN_BY_SOURCE[item.source];
  }

  if (item.level === "critical") {
    return 6 * 60 * 1000;
  }

  if (item.level === "quiet") {
    return 30 * 60 * 1000;
  }

  return AMBIENT_DEFAULT_COOLDOWN_MS;
}

function pruneAmbientFingerprints(now = Date.now()) {
  for (const [fingerprint, lastSeenAt] of ambientState.fingerprints.entries()) {
    if (now - lastSeenAt > AMBIENT_FINGERPRINT_RETENTION_MS) {
      ambientState.fingerprints.delete(fingerprint);
    }
  }
}

function shouldDropAmbientItem(item) {
  const createdAt = Number.isFinite(Number(item.createdAt))
    ? Number(item.createdAt)
    : Date.now();
  const fingerprint = getAmbientFingerprint(item);
  const lastSeenAt = ambientState.fingerprints.get(fingerprint) || 0;
  const cooldownMs = getAmbientCooldownMs(item);

  pruneAmbientFingerprints(createdAt);

  if (lastSeenAt && createdAt - lastSeenAt < cooldownMs) {
    return true;
  }

  ambientState.fingerprints.set(fingerprint, createdAt);
  return false;
}

function normalizeContextPatch(input = {}) {
  const patch = {};

  if (typeof input.id === "string") {
    patch.id = input.id.trim();
  }

  if (typeof input.mode === "string" && VALID_CONTEXT_MODES.has(input.mode.trim())) {
    patch.mode = input.mode.trim();
  }

  if (typeof input.presence === "string" && input.presence.trim()) {
    patch.presence = input.presence.trim();
  }

  if (hasOwn(input, "intent")) {
    patch.intent = input.intent ? normalizeIntent(input.intent) : null;
  }

  if (hasOwn(input, "tool")) {
    patch.tool = input.tool ? normalizeTool(input.tool) : null;
  }

  if (hasOwn(input, "artifact")) {
    patch.artifact = input.artifact ? normalizeArtifact(input.artifact) : null;
  }

  if (hasOwn(input, "approval")) {
    patch.approval = input.approval ? normalizeApproval(input.approval) : null;
  }

  if (Array.isArray(input.ambient)) {
    patch.ambient = input.ambient.map(normalizeAmbientItem).filter(Boolean).slice(-AMBIENT_HISTORY_LIMIT);
  }

  if (input.session && typeof input.session === "object") {
    patch.session = {
      channel: typeof input.session.channel === "string" ? input.session.channel.trim() : undefined,
      sessionId: typeof input.session.sessionId === "string" ? input.session.sessionId.trim() : undefined,
      replyTarget: typeof input.session.replyTarget === "string" ? input.session.replyTarget.trim() : undefined,
      workingDir: typeof input.session.workingDir === "string" ? input.session.workingDir.trim() : undefined,
      transportState: typeof input.session.transportState === "string" ? input.session.transportState.trim() : undefined,
      transportSummary: typeof input.session.transportSummary === "string" ? input.session.transportSummary.trim() : undefined,
      provider: typeof input.session.provider === "string" ? input.session.provider.trim() : undefined,
      model: typeof input.session.model === "string" ? input.session.model.trim() : undefined,
      runId: typeof input.session.runId === "string" ? input.session.runId.trim() : undefined,
      durationMs: Number.isFinite(Number(input.session.durationMs))
        ? Number(input.session.durationMs)
        : undefined,
      lastActiveAt: Number.isFinite(Number(input.session.lastActiveAt))
        ? Number(input.session.lastActiveAt)
        : undefined,
      usage: input.session.usage && typeof input.session.usage === "object"
        ? input.session.usage
        : undefined
    };
  }

  if (input.metrics && typeof input.metrics === "object") {
    patch.metrics = {
      freeMemoryRatio: Number.isFinite(Number(input.metrics.freeMemoryRatio))
        ? Number(input.metrics.freeMemoryRatio)
        : undefined,
      loadAverage: Number.isFinite(Number(input.metrics.loadAverage))
        ? Number(input.metrics.loadAverage)
        : undefined,
      memoryPressure: typeof input.metrics.memoryPressure === "string"
        ? input.metrics.memoryPressure.trim()
        : undefined,
      heartbeatEnabled: typeof input.metrics.heartbeatEnabled === "boolean"
        ? input.metrics.heartbeatEnabled
        : undefined
    };
  }

  if (input.workspace && typeof input.workspace === "object") {
    patch.workspace = {
      name: typeof input.workspace.name === "string" ? input.workspace.name.trim() : undefined,
      creature: typeof input.workspace.creature === "string" ? input.workspace.creature.trim() : undefined,
      vibe: typeof input.workspace.vibe === "string" ? input.workspace.vibe.trim() : undefined,
      emoji: typeof input.workspace.emoji === "string" ? input.workspace.emoji.trim() : undefined,
      soulTone: typeof input.workspace.soulTone === "string" ? input.workspace.soulTone.trim() : undefined
    };
  }

  return patch;
}

function mergeContextPatch(input) {
  const patch = normalizeContextPatch(input);
  const nextState = {
    ...contextState,
    updatedAt: Date.now()
  };

  if (hasOwn(patch, "id")) {
    nextState.id = patch.id;
  }

  if (hasOwn(patch, "mode")) {
    nextState.mode = patch.mode;
  }

  if (hasOwn(patch, "presence")) {
    nextState.presence = patch.presence;
  }

  if (hasOwn(patch, "intent")) {
    nextState.intent = patch.intent;
  }

  if (hasOwn(patch, "tool")) {
    nextState.tool = patch.tool;
  }

  if (hasOwn(patch, "artifact")) {
    nextState.artifact = patch.artifact;
  }

  if (hasOwn(patch, "approval")) {
    nextState.approval = patch.approval;
  }

  if (hasOwn(patch, "ambient")) {
    nextState.ambient = patch.ambient;
  }

  if (patch.session) {
    nextState.session = {
      ...contextState.session,
      ...Object.fromEntries(
        Object.entries(patch.session).filter(([, value]) => value !== undefined)
      )
    };
  }

  if (patch.metrics) {
    nextState.metrics = {
      ...contextState.metrics,
      ...Object.fromEntries(
        Object.entries(patch.metrics).filter(([, value]) => value !== undefined)
      )
    };
  }

  if (patch.workspace) {
    nextState.workspace = {
      ...contextState.workspace,
      ...Object.fromEntries(
        Object.entries(patch.workspace).filter(([, value]) => value !== undefined)
      )
    };
  }

  nextState.workspace = {
    ...nextState.workspace,
    name: workspaceProfile.name,
    creature: workspaceProfile.creature,
    vibe: workspaceProfile.vibe,
    emoji: workspaceProfile.emoji,
    soulTone: workspaceProfile.soulTone
  };
  nextState.metrics = {
    ...nextState.metrics,
    heartbeatEnabled: workspaceProfile.heartbeatEnabled
  };

  contextState = nextState;
  broadcastContext();
}

function broadcastContext() {
  sendToWindows("pet:context", contextState);
}

function broadcastPreferenceState() {
  sendToWindows("pet:preferences", buildClientPreferenceState());
}

function broadcastUiState() {
  sendToWindows("pet:ui", uiState);
}

function broadcastCloneState() {
  sendToWindows(
    "pet:clone-state",
    {
      activeCloneId: cloneState.activeCloneId,
      selectedDiffCloneId: cloneState.selectedDiffCloneId,
      clones: cloneState.clones.map(({ promptPrefix, ...clone }) => clone)
    }
  );
}

function broadcastMotionState() {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  petWindow.webContents.send("pet:motion", motionState);
}

function broadcastCloneMotionState(cloneId) {
  const actor = getCloneActor(cloneId);
  const windowRef = getCloneWindow(actor.cloneId);

  if (!windowRef) {
    return;
  }

  windowRef.webContents.send("pet:clone-motion", {
    cloneId: actor.cloneId,
    motion: actor.motion
  });
}

function setMotionStateWithOptions(patch = {}, options = {}) {
  const nextMotion = {
    ...motionState,
    ...patch
  };
  nextMotion.surfaceCling = buildSurfaceClingState(nextMotion.mode, uiState.avatarMode);
  nextMotion.updatedAt = Number.isFinite(options.now) ? options.now : Date.now();
  motionState = nextMotion;

  if (options.broadcast !== false) {
    broadcastMotionState();
  }
}

function setMotionState(patch = {}) {
  setMotionStateWithOptions(patch);
}

function setCloneMotionStateWithOptions(cloneId, patch = {}, options = {}) {
  const actor = getCloneActor(cloneId);
  const nextMotion = {
    ...actor.motion,
    ...patch
  };
  nextMotion.surfaceCling = buildSurfaceClingState(nextMotion.mode, uiState.avatarMode);
  nextMotion.updatedAt = Number.isFinite(options.now) ? options.now : Date.now();
  actor.motion = nextMotion;

  if (options.broadcast !== false) {
    broadcastCloneMotionState(actor.cloneId);
  }
}

function setCloneMotionState(cloneId, patch = {}) {
  setCloneMotionStateWithOptions(cloneId, patch);
}

function getActorMotionState(actorId) {
  if (isMainActor(actorId)) {
    return motionState;
  }

  return getCloneActor(actorId).motion;
}

function applyCollisionImpactToActor(actorId, directionX, directionY, strength = 0.6, source = "pet-collision") {
  const facing = directionX >= 0 ? "right" : "left";
  const impactPatch = {
    facing,
    angle: clampToRange((directionX * 14) + (directionY * 6), -22, 22),
    leanX: clampToRange(directionX * 0.92, -1, 1),
    velocityX: directionX * 4.8 * strength,
    velocityY: directionY * 3.4 * strength,
    impactAt: Date.now(),
    impactDirectionX: directionX,
    impactDirectionY: directionY,
    impactStrength: strength
  };

  if (isMainActor(actorId)) {
    const preserveDrag = Boolean(petDragState);

    if (!preserveDrag) {
      stopPetMotion();
      setBehaviorState(PET_BEHAVIOR.COLLISION_BONK, {
        source
      });
      setMotionState({
        behavior: PET_BEHAVIOR.COLLISION_BONK,
        mode: "land",
        ...impactPatch
      });

      setTimeout(() => {
        if (
          petDragState ||
          petThrowTimer ||
          ecoMoveAnimationTimer ||
          behaviorState.state !== PET_BEHAVIOR.COLLISION_BONK
        ) {
          return;
        }

        applyBehaviorPose(PET_BEHAVIOR.FLOOR_IDLE, "idle", {
          facing,
          angle: 0,
          leanX: 0,
          velocityX: 0,
          velocityY: 0
        }, {
          source: "pet-collision-recover"
        });
      }, COLLISION_RECOVER_MS);
      return;
    }

    setBehaviorState(PET_BEHAVIOR.DRAG_RESIST, {
      source
    });
    setMotionState({
      behavior: PET_BEHAVIOR.DRAG_RESIST,
      mode: "drag",
      ...impactPatch
    });
    return;
  }

  stopCloneMotion(actorId);
  applyCloneBehaviorPose(actorId, PET_BEHAVIOR.COLLISION_BONK, "land", impactPatch, {
    source
  });
  scheduleCloneBehaviorReturn(actorId, COLLISION_RECOVER_MS, PET_BEHAVIOR.FLOOR_IDLE, "idle", {
    facing
  });
}

function pushState(nextState) {
  const mergedState = {
    ...petState,
    ...nextState
  };
  const interruptLevel = inferInterruptLevel(mergedState.interruptLevel, mergedState.status);

  petState = {
    ...mergedState,
    ttlMs: getBubbleTtl(mergedState.ttlMs),
    interruptLevel,
    suppressBubble: shouldSuppressBubble({
      interruptLevel,
      status: mergedState.status
    })
  };

  sendToWindows("pet:state", petState);
  maybeSpeakState(petState);

  refreshTrayMenu();
}

function patchCloneState(cloneId, patch) {
  cloneState = {
    ...cloneState,
    clones: cloneState.clones.map((clone) => (
      clone.id === cloneId
        ? { ...clone, ...patch }
        : clone
    ))
  };

  broadcastCloneState();
  refreshTrayMenu();
}

function setActiveClone(cloneId) {
  const clone = getCloneProfile(cloneId);

  if (!isMainActor(clone.id)) {
    ensureCloneSpawned(clone.id, {
      sourceActorId: CLONE_PROFILES[0].id,
      mode: "pull"
    });
  }

  cloneState = {
    ...cloneState,
    activeCloneId: clone.id
  };

  syncOpenClawRuntimeContext(clone.id);
  broadcastCloneState();
  refreshTrayMenu();
}

function setSelectedDiffClone(cloneId) {
  const clone = getCloneProfile(cloneId);

  cloneState = {
    ...cloneState,
    selectedDiffCloneId: clone.id
  };

  broadcastCloneState();
  refreshTrayMenu();
}

function clearEcoAutomation() {
  if (ecoRoamTimer) {
    clearInterval(ecoRoamTimer);
    ecoRoamTimer = null;
  }

  if (ecoBreakTimer) {
    clearInterval(ecoBreakTimer);
    ecoBreakTimer = null;
  }

  if (ecoMouseStealTimer) {
    clearTimeout(ecoMouseStealTimer);
    ecoMouseStealTimer = null;
  }

  if (ecoMoveAnimationTimer) {
    clearInterval(ecoMoveAnimationTimer);
    ecoMoveAnimationTimer = null;
  }

  if (ecoBehaviorCooldownTimer) {
    clearTimeout(ecoBehaviorCooldownTimer);
    ecoBehaviorCooldownTimer = null;
  }
}

function clearThrowMotion() {
  if (petThrowTimer) {
    clearInterval(petThrowTimer);
    petThrowTimer = null;
  }
}

function clearPetDragLoop() {
  if (petDragPollTimer) {
    clearTimeout(petDragPollTimer);
    petDragPollTimer = null;
  }
}

function clearCloneThrowMotion(cloneId) {
  const actor = getCloneActor(cloneId);

  if (actor.throwTimer) {
    clearInterval(actor.throwTimer);
    actor.throwTimer = null;
  }
}

function stopPetMotion() {
  clearPetDragLoop();
  clearThrowMotion();

  if (ecoMoveAnimationTimer) {
    clearInterval(ecoMoveAnimationTimer);
    ecoMoveAnimationTimer = null;
  }
}

function clearCloneMoveMotion(cloneId) {
  const actor = getCloneActor(cloneId);

  if (actor.moveTimer) {
    clearInterval(actor.moveTimer);
    actor.moveTimer = null;
  }
}

function clearCloneCooldown(cloneId) {
  const actor = getCloneActor(cloneId);

  if (actor.cooldownTimer) {
    clearTimeout(actor.cooldownTimer);
    actor.cooldownTimer = null;
  }
}

function stopCloneMotion(cloneId) {
  clearCloneThrowMotion(cloneId);
  clearCloneMoveMotion(cloneId);
}

function resetCloneActor(cloneId) {
  const actor = getCloneActor(cloneId);
  clearCloneCooldown(cloneId);
  stopCloneMotion(cloneId);
  cloneDragStates.delete(actor.cloneId);
  actor.interactive = false;
  actor.anchorSeeded = false;
  actor.motion = createDefaultMotionState();
  actor.behavior = createDefaultBehaviorState("clone");
}

function setActorBoundsDirect(actorId, nextBounds) {
  if (isMainActor(actorId)) {
    if (!petWindow || petWindow.isDestroyed()) {
      return false;
    }

    const currentBounds = petWindow.getBounds();
    const normalizedBounds = {
      x: Math.round(nextBounds.x),
      y: Math.round(nextBounds.y),
      width: Math.round(nextBounds.width),
      height: Math.round(nextBounds.height)
    };

    if (
      currentBounds.x === normalizedBounds.x &&
      currentBounds.y === normalizedBounds.y &&
      currentBounds.width === normalizedBounds.width &&
      currentBounds.height === normalizedBounds.height
    ) {
      return false;
    }

    suppressPetWindowMoveSync = true;
    try {
      if (
        currentBounds.width === normalizedBounds.width &&
        currentBounds.height === normalizedBounds.height
      ) {
        petWindow.setPosition(normalizedBounds.x, normalizedBounds.y, false);
      } else {
        petWindow.setBounds(normalizedBounds);
      }
    } finally {
      suppressPetWindowMoveSync = false;
    }

    if (uiState.drawerOpen && !petDragState) {
      placeChatWindow();
    }

    return true;
  }

  const windowRef = getCloneWindow(actorId);

  if (!windowRef) {
    return false;
  }

  const currentBounds = windowRef.getBounds();
  const normalizedBounds = {
    x: Math.round(nextBounds.x),
    y: Math.round(nextBounds.y),
    width: Math.round(nextBounds.width),
    height: Math.round(nextBounds.height)
  };

  if (
    currentBounds.x === normalizedBounds.x &&
    currentBounds.y === normalizedBounds.y &&
    currentBounds.width === normalizedBounds.width &&
    currentBounds.height === normalizedBounds.height
  ) {
    return false;
  }

  if (
    currentBounds.width === normalizedBounds.width &&
    currentBounds.height === normalizedBounds.height
  ) {
    windowRef.setPosition(normalizedBounds.x, normalizedBounds.y, false);
  } else {
    windowRef.setBounds(normalizedBounds);
  }

  return true;
}

function moveMainWindowForDrag(nextX, nextY) {
  if (!petWindow || petWindow.isDestroyed()) {
    return false;
  }

  const roundedX = Math.round(nextX);
  const roundedY = Math.round(nextY);
  suppressPetWindowMoveSync = true;
  try {
    petWindow.setPosition(roundedX, roundedY, false);
  } finally {
    suppressPetWindowMoveSync = false;
  }

  return true;
}

function moveCloneWindowForDrag(cloneId, nextX, nextY) {
  const windowRef = getCloneWindow(cloneId);

  if (!windowRef) {
    return false;
  }

  windowRef.setPosition(Math.round(nextX), Math.round(nextY), false);
  return true;
}

function shouldRefreshDragMotionSnapshot(dragState, now, nextBehavior, nextX, nextY, velocityX, velocityY) {
  if (!dragState) {
    return true;
  }

  if ((dragState.lastMotionBehavior || "") !== nextBehavior) {
    return true;
  }

  if (
    !Number.isFinite(dragState.lastMotionX) ||
    !Number.isFinite(dragState.lastMotionY) ||
    Math.abs(nextX - dragState.lastMotionX) >= 8 ||
    Math.abs(nextY - dragState.lastMotionY) >= 8
  ) {
    return true;
  }

  if (
    Math.abs(velocityX - (Number(dragState.lastMotionVelocityX) || 0)) >= (DRAG_MOTION_DELTA_THRESHOLD * 2.2) ||
    Math.abs(velocityY - (Number(dragState.lastMotionVelocityY) || 0)) >= (DRAG_MOTION_DELTA_THRESHOLD * 2.2)
  ) {
    return true;
  }

  return false;
}

function blendDragVelocity(previousVelocity = 0, nextVelocity = 0) {
  const previous = Number.isFinite(previousVelocity) ? previousVelocity : 0;
  const next = Number.isFinite(nextVelocity) ? nextVelocity : 0;

  if (!previous) {
    return next;
  }

  const keepRatio = Math.sign(previous) !== 0 && Math.sign(next) !== 0 && Math.sign(previous) !== Math.sign(next)
    ? DRAG_DIRECTION_REVERSAL_SMOOTHING
    : DRAG_VELOCITY_SMOOTHING;

  return (previous * keepRatio) + (next * (1 - keepRatio));
}

function sampleDragVelocities(dragState, rawVelocityX = 0, rawVelocityY = 0) {
  const smoothedVelocityX = blendDragVelocity(dragState?.smoothedVelocityX, rawVelocityX);
  const smoothedVelocityY = blendDragVelocity(dragState?.smoothedVelocityY, rawVelocityY);

  return {
    smoothedVelocityX,
    smoothedVelocityY,
    releaseVelocityX: (smoothedVelocityX * DRAG_RELEASE_VELOCITY_BLEND) + (rawVelocityX * (1 - DRAG_RELEASE_VELOCITY_BLEND)),
    releaseVelocityY: (smoothedVelocityY * DRAG_RELEASE_VELOCITY_BLEND) + (rawVelocityY * (1 - DRAG_RELEASE_VELOCITY_BLEND))
  };
}

function createDragRuntimeState(bounds, pointerX, pointerY, extra = {}) {
  return {
    pointerStartX: pointerX,
    pointerStartY: pointerY,
    windowStartX: bounds.x,
    windowStartY: bounds.y,
    lastPointerX: pointerX,
    lastPointerY: pointerY,
    lastAt: Date.now(),
    lastCollisionAt: 0,
    rawVelocityX: 0,
    rawVelocityY: 0,
    smoothedVelocityX: 0,
    smoothedVelocityY: 0,
    releaseVelocityX: 0,
    releaseVelocityY: 0,
    lastMotionAt: 0,
    lastMotionX: bounds.x,
    lastMotionY: bounds.y,
    lastMotionVelocityX: 0,
    lastMotionVelocityY: 0,
    lastMotionBehavior: PET_BEHAVIOR.DRAG_PICKED,
    lastMotionBroadcastAt: 0,
    lastBroadcastBehavior: "",
    lastAppliedX: Math.round(bounds.x),
    lastAppliedY: Math.round(bounds.y),
    lastExternalPointerAt: Date.now(),
    ...extra
  };
}

function readLiveCursorPoint(fallbackX = 0, fallbackY = 0) {
  const point = screen.getCursorScreenPoint();
  const pointX = Number(point?.x);
  const pointY = Number(point?.y);

  return {
    x: Number.isFinite(pointX) ? pointX : fallbackX,
    y: Number.isFinite(pointY) ? pointY : fallbackY
  };
}

function applyPetDragFrame(pointerX, pointerY, options = {}) {
  if (!petDragState || !petWindow || petWindow.isDestroyed()) {
    return false;
  }

  if (!Number.isFinite(pointerX) || !Number.isFinite(pointerY)) {
    return false;
  }

  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const allowCollisions = options.allowCollisions === true;
  const nextX = petDragState.windowStartX + (pointerX - petDragState.pointerStartX);
  const nextY = petDragState.windowStartY + (pointerY - petDragState.pointerStartY);
  const roundedNextX = Math.round(nextX);
  const roundedNextY = Math.round(nextY);
  const currentX = Number.isFinite(petDragState.lastAppliedX) ? petDragState.lastAppliedX : petWindow.getBounds().x;
  const currentY = Number.isFinite(petDragState.lastAppliedY) ? petDragState.lastAppliedY : petWindow.getBounds().y;
  const elapsed = Math.max(16, now - petDragState.lastAt);
  const rawVelocityX = ((pointerX - petDragState.lastPointerX) / elapsed) * 16;
  const rawVelocityY = ((pointerY - petDragState.lastPointerY) / elapsed) * 16;
  const velocitySample = sampleDragVelocities(petDragState, rawVelocityX, rawVelocityY);
  const velocityX = velocitySample.smoothedVelocityX;
  const velocityY = velocitySample.smoothedVelocityY;
  const positionChanged = roundedNextX !== currentX || roundedNextY !== currentY;
  const nextBehavior = Math.hypot(velocityX, velocityY) >= DRAG_RESIST_SPEED
    ? PET_BEHAVIOR.DRAG_RESIST
    : PET_BEHAVIOR.DRAG_PICKED;
  const shouldResolveCollisions = allowCollisions && positionChanged && (now - (petDragState.lastCollisionAt || 0)) >= DRAG_COLLISION_INTERVAL_MS;
  const shouldRefreshMotion = shouldRefreshDragMotionSnapshot(
    petDragState,
    now,
    nextBehavior,
    roundedNextX,
    roundedNextY,
    velocityX,
    velocityY
  );
  const shouldBroadcastMotion = shouldRefreshMotion && (
    nextBehavior !== petDragState.lastBroadcastBehavior ||
    (now - (petDragState.lastMotionBroadcastAt || 0)) >= DRAG_MOTION_BROADCAST_INTERVAL_MS
  );

  petDragState = {
    ...petDragState,
    lastPointerX: pointerX,
    lastPointerY: pointerY,
    lastAt: now,
    lastCollisionAt: shouldResolveCollisions ? now : petDragState.lastCollisionAt,
    rawVelocityX,
    rawVelocityY,
    smoothedVelocityX: velocityX,
    smoothedVelocityY: velocityY,
    releaseVelocityX: velocitySample.releaseVelocityX,
    releaseVelocityY: velocitySample.releaseVelocityY,
    lastAppliedX: positionChanged ? roundedNextX : petDragState.lastAppliedX,
    lastAppliedY: positionChanged ? roundedNextY : petDragState.lastAppliedY,
    lastMotionAt: shouldRefreshMotion ? now : petDragState.lastMotionAt,
    lastMotionX: shouldRefreshMotion ? roundedNextX : petDragState.lastMotionX,
    lastMotionY: shouldRefreshMotion ? roundedNextY : petDragState.lastMotionY,
    lastMotionVelocityX: shouldRefreshMotion ? velocityX : petDragState.lastMotionVelocityX,
    lastMotionVelocityY: shouldRefreshMotion ? velocityY : petDragState.lastMotionVelocityY,
    lastMotionBehavior: shouldRefreshMotion ? nextBehavior : petDragState.lastMotionBehavior,
    lastMotionBroadcastAt: shouldBroadcastMotion ? now : petDragState.lastMotionBroadcastAt,
    lastBroadcastBehavior: shouldBroadcastMotion ? nextBehavior : petDragState.lastBroadcastBehavior
  };

  if (positionChanged) {
    if (shouldResolveCollisions) {
      applyPetBoundsPosition(nextX, nextY, {
        resolveCollisions: true
      });
    } else {
      moveMainWindowForDrag(roundedNextX, roundedNextY);
    }
  }

  if (behaviorState.state !== nextBehavior) {
    setBehaviorState(nextBehavior, {
      source: "pointer-drag"
    });
  }

  if (shouldRefreshMotion) {
    setMotionStateWithOptions({
      behavior: nextBehavior,
      mode: "drag",
      facing: velocityX >= 0 ? "right" : "left",
      angle: clampToRange(velocityX * DRAG_ANGLE_MULTIPLIER, -28, 28),
      leanX: clampToRange(velocityX / DRAG_LEAN_DIVISOR, -1, 1),
      velocityX,
      velocityY
    }, {
      broadcast: shouldBroadcastMotion,
      now
    });
  }

  return positionChanged || shouldRefreshMotion;
}

function startPetDragLoop() {
  clearPetDragLoop();

  petDragPollTimer = setTimeout(() => {
    petDragPollTimer = null;

    if (!petDragState || !petWindow || petWindow.isDestroyed()) {
      return;
    }

    const idleForMs = Date.now() - (petDragState.lastExternalPointerAt || 0);

    if (idleForMs < DRAG_POINTER_STALE_MS) {
      startPetDragLoop();
      return;
    }

    const cursorPoint = readLiveCursorPoint(petDragState.lastPointerX, petDragState.lastPointerY);
    const didAdvance = applyPetDragFrame(cursorPoint.x, cursorPoint.y);

    petDragPollTimer = setTimeout(() => {
      petDragPollTimer = null;
      startPetDragLoop();
    }, didAdvance ? DRAG_FALLBACK_SAMPLE_MS : DRAG_POINTER_STALE_MS);
  }, DRAG_POINTER_STALE_MS);
}

function setBehaviorState(nextState, meta = {}) {
  behaviorState = {
    ...behaviorState,
    state: nextState,
    enteredAt: Date.now(),
    meta,
    ticket: behaviorState.ticket + 1
  };

  return behaviorState.ticket;
}

function setCloneBehaviorState(cloneId, nextState, meta = {}) {
  const actor = getCloneActor(cloneId);
  actor.behavior = {
    ...actor.behavior,
    state: nextState,
    enteredAt: Date.now(),
    meta,
    ticket: actor.behavior.ticket + 1
  };

  return actor.behavior.ticket;
}

function setMainCadenceState(nextCadence) {
  behaviorState = {
    ...behaviorState,
    cadence: nextCadence
  };
}

function setCloneCadenceState(cloneId, nextCadence) {
  const actor = getCloneActor(cloneId);
  actor.behavior = {
    ...actor.behavior,
    cadence: nextCadence
  };
}

function resetMainCadenceState() {
  setMainCadenceState(createCadenceState("main"));
}

function resetCloneCadenceState(cloneId) {
  setCloneCadenceState(cloneId, createCadenceState("clone"));
}

function resetAllCadenceStates() {
  resetMainCadenceState();
  for (const profile of getSecondaryCloneProfiles()) {
    resetCloneCadenceState(profile.id);
  }
}

function applyBehaviorPose(nextBehavior, nextPose, patch = {}, meta = {}) {
  setBehaviorState(nextBehavior, meta);
  setMotionState({
    behavior: nextBehavior,
    mode: nextPose,
    ...patch
  });
}

function applyCloneBehaviorPose(cloneId, nextBehavior, nextPose, patch = {}, meta = {}) {
  setCloneBehaviorState(cloneId, nextBehavior, meta);
  setCloneMotionState(cloneId, {
    behavior: nextBehavior,
    mode: nextPose,
    ...patch
  });
}

function scheduleBehaviorReturn(delayMs, nextBehavior = PET_BEHAVIOR.FLOOR_IDLE, nextPose = "idle", patch = {}) {
  const ticket = behaviorState.ticket;

  if (ecoBehaviorCooldownTimer) {
    clearTimeout(ecoBehaviorCooldownTimer);
  }

  ecoBehaviorCooldownTimer = setTimeout(() => {
    if (behaviorState.ticket !== ticket || !uiState.ecoMode || uiState.drawerOpen) {
      return;
    }

    applyBehaviorPose(nextBehavior, nextPose, {
      angle: 0,
      leanX: 0,
      velocityX: 0,
      velocityY: 0,
      ...patch
    });
  }, delayMs);
}

function scheduleCloneBehaviorReturn(cloneId, delayMs, nextBehavior = PET_BEHAVIOR.FLOOR_IDLE, nextPose = "idle", patch = {}) {
  const actor = getCloneActor(cloneId);
  const ticket = actor.behavior.ticket;

  clearCloneCooldown(cloneId);

  actor.cooldownTimer = setTimeout(() => {
    const currentActor = getCloneActor(cloneId);

    if (currentActor.behavior.ticket !== ticket) {
      return;
    }

    applyCloneBehaviorPose(cloneId, nextBehavior, nextPose, {
      angle: 0,
      leanX: 0,
      velocityX: 0,
      velocityY: 0,
      ...patch
    });
  }, delayMs);
}

function getFrontWindowSurfaceForBounds(bounds) {
  return getFrontWindowSurfaceSnapshotForBounds({
    actorBounds: bounds,
    avatarMode: uiState.avatarMode,
    frontWindowState,
    getDisplayNearestPoint: (point) => screen.getDisplayNearestPoint(point)
  });
}

function getPetContactSnapshot(bounds = petWindow?.getBounds?.()) {
  if (!bounds) {
    return null;
  }

  const {
    workArea,
    floorY,
    topY,
    leftX,
    rightX
  } = getActorSurfaceBounds(bounds, uiState.avatarMode);
  const windowSurface = getFrontWindowSurfaceForBounds(bounds);
  const onWindowTop = Boolean(
    windowSurface &&
    Math.abs(bounds.y - windowSurface.topY) <= 16 &&
    bounds.x >= windowSurface.topLeftX - 18 &&
    bounds.x <= windowSurface.topRightX + 18
  );
  const onWindowBottom = Boolean(
    windowSurface &&
    Math.abs(bounds.y - windowSurface.bottomY) <= 16 &&
    bounds.x >= windowSurface.topLeftX - 18 &&
    bounds.x <= windowSurface.topRightX + 18
  );
  const onWindowLeft = Boolean(
    windowSurface &&
    Math.abs(bounds.x - windowSurface.leftX) <= 16 &&
    bounds.y >= windowSurface.sideTopY - 24 &&
    bounds.y <= windowSurface.sideBottomY + 24
  );
  const onWindowRight = Boolean(
    windowSurface &&
    Math.abs(bounds.x - windowSurface.rightX) <= 16 &&
    bounds.y >= windowSurface.sideTopY - 24 &&
    bounds.y <= windowSurface.sideBottomY + 24
  );

  return {
    workArea,
    floorY,
    topY,
    leftX,
    rightX,
    onFloor: Math.abs(bounds.y - floorY) <= 14,
    onTop: Math.abs(bounds.y - topY) <= 14,
    onLeft: Math.abs(bounds.x - leftX) <= 14,
    onRight: Math.abs(bounds.x - rightX) <= 14,
    windowSurface,
    onWindowTop,
    onWindowBottom,
    onWindowLeft,
    onWindowRight,
    floorSurfaceY: onWindowTop ? windowSurface.topY : floorY,
    floorSurfaceLeftX: onWindowTop ? windowSurface.topLeftX : leftX,
    floorSurfaceRightX: onWindowTop ? windowSurface.topRightX : rightX,
    ceilingSurfaceY: onWindowBottom ? windowSurface.bottomY : topY,
    ceilingSurfaceLeftX: onWindowBottom ? windowSurface.topLeftX : leftX,
    ceilingSurfaceRightX: onWindowBottom ? windowSurface.topRightX : rightX,
    wallSurfaceTopY: (onWindowLeft || onWindowRight) ? windowSurface.sideTopY : topY,
    wallSurfaceBottomY: (onWindowLeft || onWindowRight) ? windowSurface.sideBottomY : floorY,
    wallSurfaceX: onWindowLeft
      ? windowSurface.leftX
      : onWindowRight
        ? windowSurface.rightX
        : bounds.x <= leftX + 14
          ? leftX
          : rightX,
    onFloorSurface: Math.abs(bounds.y - (onWindowTop ? windowSurface.topY : floorY)) <= 16,
    onCeilingSurface: Math.abs(bounds.y - (onWindowBottom ? windowSurface.bottomY : topY)) <= 16,
    onWallSurface: onWindowLeft || onWindowRight || Math.abs(bounds.x - leftX) <= 14 || Math.abs(bounds.x - rightX) <= 14
  };
}

function resolveTraverseDuration(durationMs = 1200, mode = "walk") {
  const requested = Number.isFinite(Number(durationMs)) ? Number(durationMs) : 1200;

  if (requested <= 900) {
    return Math.max(220, Math.round(requested));
  }

  const factor = mode === "run"
    ? 1.22
    : mode === "walk"
      ? 1.18
      : mode === "crawl"
        ? 1.14
        : mode === "hang"
          ? 1.22
          : mode === "climb-left" || mode === "climb-right"
            ? 1.28
            : 1.12;
  const minimum = mode === "run"
    ? 1850
    : mode === "walk"
      ? 2600
      : mode === "crawl"
        ? 2400
        : mode === "hang"
          ? 2850
          : mode === "climb-left" || mode === "climb-right"
            ? 2200
            : 1200;

  return Math.max(minimum, Math.round(requested * factor));
}

function resolveDraggedPetSurfaceIntent(bounds, velocityX = 0, velocityY = 0, options = {}) {
  const phase = options.phase === "throw" ? "throw" : "release";
  const baseContacts = getPetContactSnapshot(bounds);
  const avatarAttachProfile = getAvatarSurfaceProfile(uiState.avatarMode).attach;

  if (!baseContacts) {
    return null;
  }

  const projectionX = phase === "throw" ? THROW_SURFACE_PROJECTION_X : DRAG_SURFACE_PROJECTION_X;
  const projectionY = phase === "throw" ? THROW_SURFACE_PROJECTION_Y : DRAG_SURFACE_PROJECTION_Y;
  const projectedBounds = {
    ...bounds,
    x: Math.round(bounds.x + clampToRange(velocityX * projectionX, -108, 108)),
    y: Math.round(bounds.y + clampToRange(velocityY * projectionY, -96, 96))
  };
  const projectedContacts = getPetContactSnapshot(projectedBounds) || baseContacts;
  const contacts = projectedContacts;
  const speed = Math.hypot(velocityX, velocityY);
  const movingLeft = velocityX <= -(phase === "throw" ? THROW_SURFACE_CATCH_SPEED_X : 0.9);
  const movingRight = velocityX >= (phase === "throw" ? THROW_SURFACE_CATCH_SPEED_X : 0.9);
  const movingUp = velocityY <= -(phase === "throw" ? THROW_SURFACE_CATCH_SPEED_Y : 0.8);
  const currentFloorGap = baseContacts.floorSurfaceY - bounds.y;
  const wallAttachAllowed = currentFloorGap >= 18
    || projectedBounds.y <= contacts.floorSurfaceY - 10
    || (phase === "throw" && Math.abs(velocityX) >= THROW_SURFACE_CATCH_SPEED_X);
  const ceilingAttachAllowed = currentFloorGap >= 36 || projectedBounds.y <= contacts.ceilingSurfaceY + DRAG_EDGE_ATTACH_DISTANCE;
  const nearLeftSurface = contacts.onWindowLeft || Math.abs(projectedBounds.x - contacts.wallSurfaceX) <= DRAG_EDGE_ATTACH_DISTANCE;
  const nearRightSurface = contacts.onWindowRight || Math.abs(projectedBounds.x - contacts.wallSurfaceX) <= DRAG_EDGE_ATTACH_DISTANCE;
  const nearCeilingSurface = contacts.onWindowBottom || Math.abs(projectedBounds.y - contacts.ceilingSurfaceY) <= DRAG_EDGE_ATTACH_DISTANCE;
  const wallLift = contacts.onWindowLeft || contacts.onWindowRight
    ? avatarAttachProfile.wallLiftWindow
    : avatarAttachProfile.wallLiftDisplay;
  const ceilingShift = contacts.onWindowBottom
    ? avatarAttachProfile.ceilingShiftWindow
    : avatarAttachProfile.ceilingShiftDisplay;
  const wallDistance = Math.abs(bounds.x - contacts.wallSurfaceX);
  const ceilingDistance = Math.abs(bounds.y - contacts.ceilingSurfaceY);
  const wallSnapDurationMs = clampToRange(
    Math.round((phase === "throw" ? 180 : 210) + (wallDistance * 1.7) - (Math.abs(velocityX) * 14)),
    140,
    phase === "throw" ? 280 : 340
  );
  const ceilingSnapDurationMs = clampToRange(
    Math.round((phase === "throw" ? 190 : 220) + (ceilingDistance * 1.6) - (Math.abs(velocityY) * 16)),
    150,
    phase === "throw" ? 300 : 360
  );

  if (
    nearCeilingSurface &&
    ceilingAttachAllowed &&
    (movingUp || baseContacts.onWindowBottom || (phase === "release" && speed < DRAG_THROW_SPEED))
  ) {
    const direction = velocityX === 0
      ? (bounds.x <= ((contacts.ceilingSurfaceLeftX + contacts.ceilingSurfaceRightX) / 2) ? 1 : -1)
      : Math.sign(velocityX);
    const targetX = clampToRange(
      Math.round(projectedBounds.x + ((direction || 1) * ceilingShift)),
      contacts.ceilingSurfaceLeftX,
      contacts.ceilingSurfaceRightX
    );

    return {
      behavior: PET_BEHAVIOR.CEILING_HANG,
      mode: "hang",
      facing: targetX >= bounds.x ? "right" : "left",
      targetX,
      targetY: contacts.ceilingSurfaceY,
      durationMs: ceilingSnapDurationMs
    };
  }

  if (
    nearLeftSurface &&
    wallAttachAllowed &&
    (movingLeft || baseContacts.onWindowLeft || (phase === "release" && speed < DRAG_THROW_SPEED))
  ) {
    const targetY = clampToRange(
      Math.round(projectedBounds.y - wallLift + (velocityY * avatarAttachProfile.wallVelocityInfluence)),
      contacts.wallSurfaceTopY,
      contacts.wallSurfaceBottomY
    );

    return {
      behavior: PET_BEHAVIOR.EDGE_CLIMB_LEFT,
      mode: "climb-left",
      facing: "left",
      targetX: contacts.wallSurfaceX,
      targetY,
      durationMs: wallSnapDurationMs
    };
  }

  if (
    nearRightSurface &&
    wallAttachAllowed &&
    (movingRight || baseContacts.onWindowRight || (phase === "release" && speed < DRAG_THROW_SPEED))
  ) {
    const targetY = clampToRange(
      Math.round(projectedBounds.y - wallLift + (velocityY * avatarAttachProfile.wallVelocityInfluence)),
      contacts.wallSurfaceTopY,
      contacts.wallSurfaceBottomY
    );

    return {
      behavior: PET_BEHAVIOR.EDGE_CLIMB_RIGHT,
      mode: "climb-right",
      facing: "right",
      targetX: contacts.wallSurfaceX,
      targetY,
      durationMs: wallSnapDurationMs
    };
  }

  return null;
}

function attachMainPetToSurface(attachIntent, source = "pointer-drag-attach") {
  if (!attachIntent) {
    return false;
  }

  resolveActorCollisions(CLONE_PROFILES[0].id);
  applyBehaviorPose(attachIntent.behavior, attachIntent.mode, {
    facing: attachIntent.facing,
    angle: 0,
    leanX: 0,
    velocityX: 0,
    velocityY: 0
  }, {
    source
  });
  animatePetTraverse(attachIntent.targetX, attachIntent.targetY, {
    durationMs: attachIntent.durationMs,
    behavior: attachIntent.behavior,
    mode: attachIntent.mode,
    facing: attachIntent.facing
  });
  return true;
}

function attachCloneToSurface(cloneId, attachIntent, source = "pointer-drag-attach") {
  if (!attachIntent) {
    return false;
  }

  resolveActorCollisions(cloneId);
  applyCloneBehaviorPose(cloneId, attachIntent.behavior, attachIntent.mode, {
    facing: attachIntent.facing,
    angle: 0,
    leanX: 0,
    velocityX: 0,
    velocityY: 0
  }, {
    source
  });
  animateCloneTraverse(cloneId, attachIntent.targetX, attachIntent.targetY, {
    durationMs: attachIntent.durationMs,
    behavior: attachIntent.behavior,
    mode: attachIntent.mode,
    facing: attachIntent.facing
  });
  return true;
}

function nudgeMouseCursor(offsetX = 18, offsetY = 0) {
  if (process.platform !== "darwin") {
    return;
  }

  const cursorPoint = screen.getCursorScreenPoint();
  const targetX = cursorPoint.x + offsetX;
  const targetY = cursorPoint.y + offsetY;
  const swiftCode = `
import AppKit
CGWarpMouseCursorPosition(CGPoint(x: ${targetX}, y: ${targetY}))
CGAssociateMouseAndMouseCursorPosition(boolean_t(1))
`;

  try {
    const child = spawn("swift", ["-e", swiftCode], {
      stdio: "ignore",
      detached: true
    });

    child.unref();
  } catch {}
}

function getWorkAreaForBounds(bounds) {
  const probePoint = {
    x: Math.round(bounds.x + (bounds.width / 2)),
    y: Math.round(bounds.y + (bounds.height / 2))
  };
  return screen.getDisplayNearestPoint(probePoint).workArea;
}

function getDisplayBoundsForBounds(bounds) {
  const probePoint = {
    x: Math.round(bounds.x + (bounds.width / 2)),
    y: Math.round(bounds.y + (bounds.height / 2))
  };
  return screen.getDisplayNearestPoint(probePoint).bounds;
}

function clampWindowBounds(bounds) {
  const {
    minX,
    maxX,
    topY,
    floorY
  } = getActorSurfaceBounds(bounds);

  return {
    ...bounds,
    x: clampToRange(bounds.x, minX, maxX),
    y: clampToRange(bounds.y, topY, floorY)
  };
}

function nudgeActorPosition(actorId, deltaX, deltaY) {
  const windowRef = getActorWindow(actorId);

  if (!windowRef) {
    return;
  }

  const currentBounds = windowRef.getBounds();
  const nextBounds = clampWindowBounds({
    ...currentBounds,
    x: Math.round(currentBounds.x + deltaX),
    y: Math.round(currentBounds.y + deltaY)
  });

  setActorBoundsDirect(actorId, nextBounds);
}

function resolveActorCollisions(movedActorId) {
  const movedWindow = getActorWindow(movedActorId);

  if (!movedWindow || !movedWindow.isVisible()) {
    return;
  }

  for (const otherActorId of getAllPetActorIds()) {
    if (otherActorId === movedActorId) {
      continue;
    }

    const otherWindow = getActorWindow(otherActorId);
    const pairKey = getCollisionPairKey(movedActorId, otherActorId);

    if (!otherWindow || !otherWindow.isVisible()) {
      collisionImpacts.delete(pairKey);
      continue;
    }

    const movedBody = getActorCollisionBody(movedActorId);
    const otherBody = getActorCollisionBody(otherActorId);
    const overlap = getBodyOverlap(movedBody, otherBody);

    if (!overlap) {
      collisionImpacts.delete(pairKey);
      continue;
    }

    const axis = overlap.width <= overlap.height ? "x" : "y";
    const directionX = axis === "x"
      ? (overlap.centerDx >= 0 ? 1 : -1)
      : 0;
    const directionY = axis === "y"
      ? (overlap.centerDy >= 0 ? 1 : -1)
      : 0;
    const separation = (axis === "x" ? overlap.width : overlap.height) + 12;

    let movedShare = 0.56;
    let otherShare = 0.44;
    const movedCloneDragged = !isMainActor(movedActorId) && cloneDragStates.has(movedActorId);
    const otherCloneDragged = !isMainActor(otherActorId) && cloneDragStates.has(otherActorId);

    if (movedActorId === CLONE_PROFILES[0].id && petDragState) {
      movedShare = 0.14;
      otherShare = 0.86;
    } else if (otherActorId === CLONE_PROFILES[0].id && petDragState) {
      movedShare = 0.86;
      otherShare = 0.14;
    } else if (movedCloneDragged) {
      movedShare = 0.18;
      otherShare = 0.82;
    } else if (otherCloneDragged) {
      movedShare = 0.82;
      otherShare = 0.18;
    }

    nudgeActorPosition(movedActorId, directionX * separation * movedShare, directionY * separation * movedShare);
    nudgeActorPosition(otherActorId, -directionX * separation * otherShare, -directionY * separation * otherShare);

    const now = Date.now();
    const lastImpactAt = collisionImpacts.get(pairKey) || 0;
    collisionImpacts.set(pairKey, now);

    if (now - lastImpactAt < COLLISION_IMPACT_COOLDOWN_MS) {
      continue;
    }

    const movedMotion = getActorMotionState(movedActorId);
    const otherMotion = getActorMotionState(otherActorId);
    const relativeVelocity = axis === "x"
      ? Math.abs((Number(movedMotion.velocityX) || 0) - (Number(otherMotion.velocityX) || 0))
      : Math.abs((Number(movedMotion.velocityY) || 0) - (Number(otherMotion.velocityY) || 0));
    const overlapStrength = (axis === "x" ? overlap.width : overlap.height) / 34;
    const velocityStrength = relativeVelocity / 5.2;
    const strength = clampToRange(Math.max(overlapStrength, velocityStrength), 0.38, 1.34);
    const mainDragged = Boolean(petDragState) && (movedActorId === CLONE_PROFILES[0].id || otherActorId === CLONE_PROFILES[0].id);
    const shouldLaunchClone = mainDragged && relativeVelocity >= 2.8;
    const shouldLaunchBothClones = !mainDragged
      && !isMainActor(movedActorId)
      && !isMainActor(otherActorId)
      && relativeVelocity >= 5.2;

    applyCollisionImpactToActor(movedActorId, directionX || 0, directionY || 0, strength, `collision:${pairKey}`);
    applyCollisionImpactToActor(otherActorId, -(directionX || 0), -(directionY || 0), strength, `collision:${pairKey}`);

    if (shouldLaunchClone) {
      const cloneId = isMainActor(movedActorId) ? otherActorId : movedActorId;
      const cloneDirectionX = cloneId === movedActorId ? (directionX || 0) : -(directionX || 0);
      const cloneDirectionY = cloneId === movedActorId ? (directionY || 0) : -(directionY || 0);
      const launchVelocityX = (cloneDirectionX || ((Math.random() < 0.5) ? -1 : 1)) * (4.1 + (relativeVelocity * 0.48));
      const launchVelocityY = cloneDirectionY === 0
        ? -(2.4 + (strength * 1.9))
        : cloneDirectionY > 0
          ? (1.6 + (strength * 1.1))
          : -(2 + (strength * 1.5));
      startCloneThrowMotion(cloneId, launchVelocityX, launchVelocityY);
      continue;
    }

    if (shouldLaunchBothClones) {
      const movedLaunchX = (directionX || ((Math.random() < 0.5) ? -1 : 1)) * (2.9 + (relativeVelocity * 0.28));
      const otherLaunchX = -movedLaunchX;
      const launchVelocityY = -(1.4 + (strength * 1.2));
      startCloneThrowMotion(movedActorId, movedLaunchX, launchVelocityY);
      startCloneThrowMotion(otherActorId, otherLaunchX, launchVelocityY);
    }
  }
}

function applyPetBoundsPosition(nextX, nextY, { resolveCollisions = true } = {}) {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  const currentBounds = petWindow.getBounds();
  const nextBounds = clampWindowBounds({
    ...currentBounds,
    x: Math.round(nextX),
    y: Math.round(nextY)
  });

  if (
    nextBounds.x === currentBounds.x &&
    nextBounds.y === currentBounds.y
  ) {
    return;
  }

  setActorBoundsDirect(CLONE_PROFILES[0].id, nextBounds);

  if (resolveCollisions) {
    resolveActorCollisions(CLONE_PROFILES[0].id);
  }
}

function applyCloneBoundsPosition(cloneId, nextX, nextY, { resolveCollisions = true } = {}) {
  const windowRef = getCloneWindow(cloneId);

  if (!windowRef) {
    return;
  }

  const currentBounds = windowRef.getBounds();
  const nextBounds = clampWindowBounds({
    ...currentBounds,
    x: Math.round(nextX),
    y: Math.round(nextY)
  });

  if (
    nextBounds.x === currentBounds.x &&
    nextBounds.y === currentBounds.y
  ) {
    return;
  }

  setActorBoundsDirect(cloneId, nextBounds);

  if (resolveCollisions) {
    resolveActorCollisions(cloneId);
  }
}

function animateWindowTo(targetX, targetY, durationMs = 1200) {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  stopPetMotion();

  const startBounds = petWindow.getBounds();
  const startX = startBounds.x;
  const startY = startBounds.y;
  const startedAt = Date.now();
  const surfaceTraverse = Math.abs(targetY - startY) > Math.abs(targetX - startX);

  ecoMoveAnimationTimer = setInterval(() => {
    if (!petWindow || petWindow.isDestroyed()) {
      clearEcoAutomation();
      return;
    }

    const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
    const eased = surfaceTraverse ? easeInOutSine(progress) : easeOutCubic(progress);

    applyPetBoundsPosition(
      startX + ((targetX - startX) * eased),
      startY + ((targetY - startY) * eased)
    );

    if (progress >= 1) {
      clearInterval(ecoMoveAnimationTimer);
      ecoMoveAnimationTimer = null;
    }
  }, 24);
}

function animatePetTraverse(targetX, targetY, {
  durationMs = 1200,
  behavior = PET_BEHAVIOR.FLOOR_WALK,
  mode = "walk",
  facing = "left",
  angle = 0
} = {}) {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  stopPetMotion();

  const startBounds = petWindow.getBounds();
  const startX = startBounds.x;
  const startY = startBounds.y;
  const startedAt = Date.now();
  const surfaceTraverse = mode === "climb-left" || mode === "climb-right" || mode === "hang";
  const resolvedDurationMs = resolveTraverseDuration(durationMs, mode);

  setMotionState({
    behavior,
    mode,
    facing,
    angle,
    leanX: 0,
    velocityX: targetX - startX,
    velocityY: targetY - startY
  });

  ecoMoveAnimationTimer = setInterval(() => {
    if (!petWindow || petWindow.isDestroyed()) {
      clearEcoAutomation();
      return;
    }

    const progress = Math.min(1, (Date.now() - startedAt) / resolvedDurationMs);
    const eased = surfaceTraverse ? easeInOutSine(progress) : easeOutCubic(progress);

    applyPetBoundsPosition(
      startX + ((targetX - startX) * eased),
      startY + ((targetY - startY) * eased)
    );

    if (progress >= 1) {
      clearInterval(ecoMoveAnimationTimer);
      ecoMoveAnimationTimer = null;

      setMotionState({
        behavior,
        mode: mode === "hang" ? "hang" : mode,
        facing,
        angle: 0,
        leanX: 0,
        velocityX: 0,
        velocityY: 0
      });
    }
  }, 20);
}

function animateCloneTraverse(cloneId, targetX, targetY, {
  durationMs = 1200,
  behavior = PET_BEHAVIOR.FLOOR_WALK,
  mode = "walk",
  facing = "left",
  angle = 0
} = {}) {
  const windowRef = getCloneWindow(cloneId);

  if (!windowRef) {
    return;
  }

  stopCloneMotion(cloneId);

  const actor = getCloneActor(cloneId);
  const startBounds = windowRef.getBounds();
  const startX = startBounds.x;
  const startY = startBounds.y;
  const startedAt = Date.now();
  const surfaceTraverse = mode === "climb-left" || mode === "climb-right" || mode === "hang";
  const resolvedDurationMs = resolveTraverseDuration(durationMs, mode);

  setCloneMotionState(cloneId, {
    behavior,
    mode,
    facing,
    angle,
    leanX: 0,
    velocityX: targetX - startX,
    velocityY: targetY - startY
  });

  actor.moveTimer = setInterval(() => {
    const currentWindow = getCloneWindow(cloneId);

    if (!currentWindow) {
      clearCloneMoveMotion(cloneId);
      return;
    }

    const progress = Math.min(1, (Date.now() - startedAt) / resolvedDurationMs);
    const eased = surfaceTraverse ? easeInOutSine(progress) : easeOutCubic(progress);

    applyCloneBoundsPosition(
      cloneId,
      startX + ((targetX - startX) * eased),
      startY + ((targetY - startY) * eased)
    );

    if (progress >= 1) {
      clearCloneMoveMotion(cloneId);
      setCloneMotionState(cloneId, {
        behavior,
        mode: mode === "hang" ? "hang" : mode,
        facing,
        angle: 0,
        leanX: 0,
        velocityX: 0,
        velocityY: 0
      });
    }
  }, 20);
}

function pouncePetToSurface(targetX, targetY, {
  durationMs = 760,
  landingBehavior = PET_BEHAVIOR.EDGE_CLIMB_LEFT,
  landingMode = "climb-left",
  facing = "left",
  source = "eco-pounce"
} = {}) {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  stopPetMotion();

  const startBounds = petWindow.getBounds();
  const startX = startBounds.x;
  const startY = startBounds.y;
  const deltaX = targetX - startX;
  const deltaY = targetY - startY;
  const arcHeight = clampToRange((Math.abs(deltaX) * 0.12) + Math.abs(deltaY) * 0.2, 28, 108);
  const startedAt = Date.now();

  setBehaviorState(landingBehavior, { source });
  setMotionState({
    behavior: landingBehavior,
    mode: "fall",
    facing,
    angle: clampToRange(deltaX * 0.08, -22, 22),
    leanX: clampToRange(deltaX / 120, -1, 1),
    velocityX: deltaX / 12,
    velocityY: deltaY / 12
  });

  ecoMoveAnimationTimer = setInterval(() => {
    if (!petWindow || petWindow.isDestroyed()) {
      clearEcoAutomation();
      return;
    }

    const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
    const eased = easeOutCubic(progress);
    const hopArc = Math.sin(progress * Math.PI) * arcHeight;
    const nextX = startX + (deltaX * eased);
    const nextY = startY + (deltaY * eased) - hopArc;

    applyPetBoundsPosition(nextX, nextY);
    setMotionState({
      behavior: landingBehavior,
      mode: "fall",
      facing,
      angle: clampToRange((deltaX * 0.08) - (hopArc * 0.06), -24, 24),
      leanX: clampToRange(deltaX / 120, -1, 1),
      velocityX: deltaX * (1 - eased),
      velocityY: deltaY - hopArc
    });

    if (progress >= 1) {
      clearInterval(ecoMoveAnimationTimer);
      ecoMoveAnimationTimer = null;
      applyBehaviorPose(landingBehavior, landingMode, {
        facing,
        angle: 0,
        leanX: 0,
        velocityX: 0,
        velocityY: 0
      }, {
        source: `${source}-land`
      });
    }
  }, 16);
}

function pounceCloneToSurface(cloneId, targetX, targetY, {
  durationMs = 760,
  landingBehavior = PET_BEHAVIOR.EDGE_CLIMB_LEFT,
  landingMode = "climb-left",
  facing = "left",
  source = "clone-pounce"
} = {}) {
  const windowRef = getCloneWindow(cloneId);

  if (!windowRef) {
    return;
  }

  stopCloneMotion(cloneId);

  const actor = getCloneActor(cloneId);
  const startBounds = windowRef.getBounds();
  const startX = startBounds.x;
  const startY = startBounds.y;
  const deltaX = targetX - startX;
  const deltaY = targetY - startY;
  const arcHeight = clampToRange((Math.abs(deltaX) * 0.12) + Math.abs(deltaY) * 0.2, 24, 92);
  const startedAt = Date.now();

  setCloneBehaviorState(cloneId, landingBehavior, { source });
  setCloneMotionState(cloneId, {
    behavior: landingBehavior,
    mode: "fall",
    facing,
    angle: clampToRange(deltaX * 0.08, -22, 22),
    leanX: clampToRange(deltaX / 120, -1, 1),
    velocityX: deltaX / 12,
    velocityY: deltaY / 12
  });

  actor.moveTimer = setInterval(() => {
    const currentWindow = getCloneWindow(cloneId);

    if (!currentWindow) {
      clearCloneMoveMotion(cloneId);
      return;
    }

    const progress = Math.min(1, (Date.now() - startedAt) / durationMs);
    const eased = 1 - ((1 - progress) ** 2);
    const hopArc = Math.sin(progress * Math.PI) * arcHeight;
    const nextX = startX + (deltaX * eased);
    const nextY = startY + (deltaY * eased) - hopArc;

    applyCloneBoundsPosition(cloneId, nextX, nextY);
    setCloneMotionState(cloneId, {
      behavior: landingBehavior,
      mode: "fall",
      facing,
      angle: clampToRange((deltaX * 0.08) - (hopArc * 0.06), -24, 24),
      leanX: clampToRange(deltaX / 120, -1, 1),
      velocityX: deltaX * (1 - eased),
      velocityY: deltaY - hopArc
    });

    if (progress >= 1) {
      clearCloneMoveMotion(cloneId);
      applyCloneBehaviorPose(cloneId, landingBehavior, landingMode, {
        facing,
        angle: 0,
        leanX: 0,
        velocityX: 0,
        velocityY: 0
      }, {
        source: `${source}-land`
      });
    }
  }, 16);
}

function enterEcoState(nextState, meta = {}) {
  if (!petWindow || petWindow.isDestroyed()) {
    return false;
  }

  if (nextState === PET_BEHAVIOR.BREAK_ALERT) {
    applyBehaviorPose(nextState, "break-alert", {
      facing: meta.facing || motionState.facing || "left",
      angle: clampToRange(meta.angle || 0, -10, 10),
      leanX: 0,
      velocityX: 0,
      velocityY: 0
    }, meta);

    const ticket = behaviorState.ticket;
    if (ecoBehaviorCooldownTimer) {
      clearTimeout(ecoBehaviorCooldownTimer);
    }

    ecoBehaviorCooldownTimer = setTimeout(() => {
      if (behaviorState.ticket !== ticket || !uiState.ecoMode || uiState.drawerOpen) {
        return;
      }

      enterEcoState(PET_BEHAVIOR.MOUSE_STEAL, meta);
    }, 760);
    return true;
  }

  if (nextState === PET_BEHAVIOR.MOUSE_STEAL) {
    applyBehaviorPose(nextState, "mouse-steal", {
      facing: meta.facing || motionState.facing || "left",
      angle: clampToRange(meta.angle || 0, -14, 14),
      leanX: 0,
      velocityX: 0,
      velocityY: 0
    }, meta);
    nudgeMouseCursor(meta.cursorOffsetX || -16, meta.cursorOffsetY || 0);
    scheduleBehaviorReturn(meta.durationMs || 1200, PET_BEHAVIOR.REST_LOAF, "rest", {
      facing: meta.facing || motionState.facing || "left"
    });
    return true;
  }

  return dispatchBehaviorTransition({
    nextState,
    meta,
    currentFacing: motionState.facing || "left",
    behaviors: PET_BEHAVIOR,
    applyPose: applyBehaviorPose,
    scheduleReturn: scheduleBehaviorReturn,
    animateTraverse: animatePetTraverse,
    startThrowMotion
  });
}

function enterCloneEcoState(cloneId, nextState, meta = {}) {
  const actor = getCloneActor(cloneId);
  return dispatchBehaviorTransition({
    nextState,
    meta,
    currentFacing: actor.motion.facing || "left",
    behaviors: PET_BEHAVIOR,
    applyPose: (behavior, pose, patch, transitionMeta) => {
      applyCloneBehaviorPose(cloneId, behavior, pose, patch, transitionMeta);
    },
    scheduleReturn: (delayMs, nextBehavior, nextPose, patch) => {
      scheduleCloneBehaviorReturn(cloneId, delayMs, nextBehavior, nextPose, patch);
    },
    animateTraverse: (targetX, targetY, options) => {
      animateCloneTraverse(cloneId, targetX, targetY, options);
    },
    startThrowMotion: (velocityX, velocityY) => {
      startCloneThrowMotion(cloneId, velocityX, velocityY);
    }
  });
}

function advanceEcoBehavior() {
  if (!petWindow || petWindow.isDestroyed() || !uiState.ecoMode || uiState.drawerOpen) {
    return;
  }

  if (petDragState || petThrowTimer || ecoMoveAnimationTimer) {
    return;
  }

  const bounds = petWindow.getBounds();
  const contacts = getPetContactSnapshot(bounds);

  if (!contacts) {
    return;
  }

  const action = planNextBehaviorAction({
    actorKind: "main",
    activityLevel: preferenceState.activityLevel,
    behaviors: PET_BEHAVIOR,
    bounds,
    contacts,
    motionState,
    cadence: behaviorState.cadence,
    hasDormantClone: Boolean(getDormantCloneProfile()),
    cursorPoint: screen.getCursorScreenPoint()
  });

  if (!action) {
    return;
  }

  let applied = false;

  if (action.type === "spawn-clone") {
    applied = Boolean(spawnNextDormantClone({
      sourceActorId: CLONE_PROFILES[0].id,
      mode: action.mode || "split"
    }));
  } else if (action.type === "pounce") {
    pouncePetToSurface(action.targetX, action.targetY, action.meta || {});
    applied = true;
  } else {
    applied = enterEcoState(action.behavior, action.meta || {});
  }

  if (applied && action.cadence) {
    setMainCadenceState(action.cadence);
  }
}

function startCloneThrowMotion(cloneId, velocityX, velocityY) {
  const windowRef = getCloneWindow(cloneId);

  if (!windowRef) {
    return;
  }

  stopCloneMotion(cloneId);

  const actor = getCloneActor(cloneId);
  let bounds = windowRef.getBounds();
  let nextX = bounds.x;
  let nextY = bounds.y;
  let nextVelocityX = velocityX;
  let nextVelocityY = velocityY;
  let bounces = 0;

  setCloneBehaviorState(cloneId, PET_BEHAVIOR.THROW_FALL, {
    source: "clone-roam"
  });
  setCloneMotionState(cloneId, {
    behavior: PET_BEHAVIOR.THROW_FALL,
    mode: "fall",
    facing: nextVelocityX >= 0 ? "right" : "left",
    angle: clampToRange(nextVelocityX * 1.8, -28, 28),
    leanX: clampToRange(nextVelocityX / 8, -1, 1),
    velocityX: nextVelocityX,
    velocityY: nextVelocityY
  });

  actor.throwTimer = setInterval(() => {
    const currentWindow = getCloneWindow(cloneId);

    if (!currentWindow) {
      clearCloneThrowMotion(cloneId);
      return;
    }

    bounds = currentWindow.getBounds();
    const {
      floorY,
      topY: ceilingY,
      minX,
      maxX
    } = getActorSurfaceBounds(bounds);

    nextVelocityY += 1.15;
    nextVelocityX *= 0.992;
    nextX += nextVelocityX;
    nextY += nextVelocityY;

    const catchIntent = resolveDraggedPetSurfaceIntent({
      x: Math.round(nextX),
      y: Math.round(nextY),
      width: bounds.width,
      height: bounds.height
    }, nextVelocityX, nextVelocityY, {
      phase: "throw"
    });

    if (catchIntent) {
      clearCloneThrowMotion(cloneId);
      applyCloneBoundsPosition(cloneId, nextX, nextY);
      attachCloneToSurface(cloneId, catchIntent, "pointer-throw-catch");
      return;
    }

    if (nextX <= minX) {
      nextX = minX;
      nextVelocityX = Math.abs(nextVelocityX) * 0.72;
    } else if (nextX >= maxX) {
      nextX = maxX;
      nextVelocityX = -Math.abs(nextVelocityX) * 0.72;
    }

    if (nextY <= ceilingY) {
      nextY = ceilingY;
      nextVelocityY = Math.abs(nextVelocityY) * 0.35;
    }

    if (nextY >= floorY) {
      nextY = floorY;

      if (Math.abs(nextVelocityY) > 4.5 && bounces < 2) {
        nextVelocityY = -Math.abs(nextVelocityY) * 0.42;
        nextVelocityX *= 0.82;
        bounces += 1;
      } else {
        clearCloneThrowMotion(cloneId);
        applyCloneBoundsPosition(cloneId, nextX, nextY);
        setCloneBehaviorState(cloneId, PET_BEHAVIOR.THROW_LAND, {
          source: "clone-roam"
        });
        setCloneMotionState(cloneId, {
          behavior: PET_BEHAVIOR.THROW_LAND,
          mode: "land",
          facing: nextVelocityX >= 0 ? "right" : "left",
          angle: clampToRange(nextVelocityX * 0.75, -10, 10),
          leanX: 0,
          velocityX: 0,
          velocityY: 0
        });

        setTimeout(() => {
          const currentActor = getCloneActor(cloneId);

          if (!currentActor.throwTimer) {
            applyCloneBehaviorPose(cloneId, PET_BEHAVIOR.FLOOR_IDLE, "idle", {
              facing: nextVelocityX >= 0 ? "right" : "left",
              angle: 0,
              leanX: 0,
              velocityX: 0,
              velocityY: 0
            }, {
              source: "clone-throw-recover"
            });
          }
        }, 420);
        return;
      }
    }

    applyCloneBoundsPosition(cloneId, nextX, nextY);
    setCloneMotionState(cloneId, {
      behavior: PET_BEHAVIOR.THROW_FALL,
      mode: "fall",
      facing: nextVelocityX >= 0 ? "right" : "left",
      angle: clampToRange((nextVelocityX * 1.4) + (nextVelocityY * 0.12), -28, 28),
      leanX: clampToRange(nextVelocityX / 8, -1, 1),
      velocityX: nextVelocityX,
      velocityY: nextVelocityY
    });
  }, 16);
}

function advanceCloneBehavior(cloneId) {
  const actor = getCloneActor(cloneId);
  const windowRef = getCloneWindow(cloneId);

  if (!windowRef || !windowRef.isVisible() || !actor.anchorSeeded) {
    return;
  }

  if (actor.throwTimer || actor.moveTimer || cloneDragStates.has(cloneId)) {
    return;
  }

  const bounds = windowRef.getBounds();
  const contacts = getPetContactSnapshot(bounds);

  if (!contacts) {
    return;
  }

  const action = planNextBehaviorAction({
    actorKind: "clone",
    activityLevel: preferenceState.activityLevel,
    behaviors: PET_BEHAVIOR,
    bounds,
    contacts,
    motionState: actor.motion,
    cadence: actor.behavior.cadence,
    hasDormantClone: Boolean(getDormantCloneProfile()),
    cursorPoint: screen.getCursorScreenPoint()
  });

  if (!action) {
    return;
  }

  let applied = false;

  if (action.type === "spawn-clone") {
    applied = Boolean(spawnNextDormantClone({
      sourceActorId: cloneId,
      mode: action.mode || "split"
    }));
  } else if (action.type === "pounce") {
    pounceCloneToSurface(cloneId, action.targetX, action.targetY, action.meta || {});
    applied = true;
  } else {
    applied = enterCloneEcoState(cloneId, action.behavior, action.meta || {});
  }

  if (applied && action.cadence) {
    setCloneCadenceState(cloneId, action.cadence);
  }
}

function updateCloneAutomation() {
  if (cloneRoamTimer) {
    clearInterval(cloneRoamTimer);
    cloneRoamTimer = null;
  }

  const activityTimings = getActivityTimings(preferenceState.activityLevel);

  cloneRoamTimer = setInterval(() => {
    const profiles = getSpawnedCloneProfiles();

    if (!profiles.length || Math.random() < activityTimings.cloneTickSkipChance) {
      return;
    }

    const selectedProfile = profiles[Math.floor(Math.random() * profiles.length)];
    advanceCloneBehavior(selectedProfile.id);
  }, activityTimings.cloneRoamIntervalMs);
}

function triggerBreakReminder() {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  const cursorPoint = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursorPoint);
  const workArea = display.workArea;
  const size = getWindowSize(resolveWindowMode());
  const x = Math.min(
    Math.max(workArea.x + 12, cursorPoint.x - Math.round(size.width * 0.42)),
    workArea.x + workArea.width - size.width - 12
  );
  const y = Math.min(
    Math.max(workArea.y + 12, cursorPoint.y - Math.round(size.height * 0.78)),
    workArea.y + workArea.height - size.height - 12
  );

  const facing = cursorPoint.x >= x ? "right" : "left";
  animateWindowTo(Math.round(x), Math.round(y), 260);
  enterEcoState(PET_BEHAVIOR.BREAK_ALERT, {
    facing,
    angle: facing === "right" ? 8 : -8,
    cursorOffsetX: facing === "right" ? 16 : -16
  });
  pushState(
    normalizeEventPayload({
      status: "done",
      message: "先歇五分钟，眼睛要紧。",
      ttlMs: 4600,
      source: "eco-break-reminder"
    })
  );

  if (ecoMouseStealTimer) {
    clearTimeout(ecoMouseStealTimer);
  }

  ecoMouseStealTimer = setTimeout(() => {
    if (!uiState.drawerOpen) {
      setInteractive(false);
    }
  }, getActivityTimings(preferenceState.activityLevel).mouseStealMs);
}

function updateEcoAutomation() {
  clearEcoAutomation();

  if (!uiState.ecoMode) {
    return;
  }

  const activityTimings = getActivityTimings(preferenceState.activityLevel);

  ecoRoamTimer = setInterval(() => {
    advanceEcoBehavior();
  }, activityTimings.roamIntervalMs);

  ecoBreakTimer = setInterval(() => {
    triggerBreakReminder();
  }, ECO_BREAK_REMINDER_MS);
}

function setInteractive(nextValue) {
  const interactive = Boolean(nextValue) || Boolean(uiState.drawerOpen) || Boolean(petDragState);

  if (uiState.interactive === interactive && mouseIgnoreApplied) {
    return;
  }

  uiState = {
    ...uiState,
    interactive
  };

  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.setIgnoreMouseEvents(!interactive, { forward: true });
    mouseIgnoreApplied = true;

    if (interactive) {
      petWindow.show();
    }
  }

  broadcastUiState();
}

function setCloneInteractive(cloneId, nextValue) {
  const actor = getCloneActor(cloneId);
  const windowRef = getCloneWindow(actor.cloneId);
  const interactive = Boolean(nextValue);

  if (!windowRef || windowRef.isDestroyed()) {
    actor.interactive = interactive;
    return;
  }

  if (actor.interactive === interactive) {
    return;
  }

  actor.interactive = interactive;
  windowRef.setIgnoreMouseEvents(!interactive, { forward: true });
}

function isQuietHours() {
  const hour = new Date().getHours();
  return hour >= 23 || hour < 9;
}

function shouldSuppressBubble(source = "") {
  if (uiState.drawerOpen || uiState.workbenchOpen) {
    return true;
  }

  const interruptLevel = typeof source === "object"
    ? inferInterruptLevel(source.interruptLevel, source.status)
    : inferInterruptLevel(source);

  if (interruptLevel === "quiet") {
    return true;
  }

  if (preferenceState.quietMode) {
    return interruptLevel !== "critical";
  }

  if (isQuietHours()) {
    return interruptLevel !== "critical";
  }

  return false;
}

function getBubbleTtl(ttlMs) {
  if (Number.isFinite(Number(ttlMs))) {
    return Math.max(1200, Math.min(12000, Number(ttlMs)));
  }

  return preferenceState.bubbleTtlMs;
}

function getUiScale() {
  return Number.isFinite(Number(preferenceState.uiScale)) ? Number(preferenceState.uiScale) : 1;
}

function getActorSurfaceInsets(bounds = {}, avatarMode = uiState.avatarMode) {
  return deriveActorSurfaceInsets(bounds, avatarMode);
}

function getActorSurfaceBounds(bounds = {}, avatarMode = uiState.avatarMode) {
  const displayBounds = getDisplayBoundsForBounds(bounds);
  const insets = getActorSurfaceInsets(bounds, avatarMode);

  return {
    workArea: displayBounds,
    insets,
    minX: displayBounds.x,
    maxX: displayBounds.x + displayBounds.width - bounds.width,
    topY: displayBounds.y,
    floorY: displayBounds.y + displayBounds.height - bounds.height,
    leftX: displayBounds.x,
    rightX: displayBounds.x + displayBounds.width - bounds.width
  };
}

function scaleWindowSize(size = {}) {
  const scale = getUiScale();

  return {
    width: Math.max(148, Math.round((Number(size.width) || 0) * scale)),
    height: Math.max(128, Math.round((Number(size.height) || 0) * scale))
  };
}

function getWindowSize(mode = "compact") {
  return scaleWindowSize(WINDOW_SIZE[mode] || WINDOW_SIZE.compact);
}

function getCloneWindowSize() {
  return scaleWindowSize(CLONE_WINDOW_SIZE);
}

function getChatWindowMinimumSize() {
  return scaleWindowSize(CHAT_WINDOW_MIN_SIZE);
}

function normalizeChatWindowSize(width, height, mode = resolveWindowMode()) {
  const workArea = getPetDisplay()?.workArea || screen.getPrimaryDisplay().workArea;
  const fallback = getWindowSize(mode === "compact" ? "drawer" : mode);
  const minimum = getChatWindowMinimumSize();

  return {
    width: clampToRange(
      Math.round(Number(width) || fallback.width),
      minimum.width,
      Math.max(minimum.width, workArea.width - 32)
    ),
    height: clampToRange(
      Math.round(Number(height) || fallback.height),
      minimum.height,
      Math.max(minimum.height, workArea.height - 32)
    )
  };
}

function getChatWindowSize(mode = resolveWindowMode()) {
  const preferredSize = normalizeChatWindowSize(
    preferenceState.drawerWidth,
    preferenceState.drawerHeight,
    mode
  );

  if (Number(preferenceState.drawerWidth) > 0 && Number(preferenceState.drawerHeight) > 0) {
    return preferredSize;
  }

  return normalizeChatWindowSize(getWindowSize(mode).width, getWindowSize(mode).height, mode);
}

function persistChatWindowSize(width, height) {
  const normalized = normalizeChatWindowSize(width, height);

  if (
    preferenceState.drawerWidth === normalized.width &&
    preferenceState.drawerHeight === normalized.height
  ) {
    return normalized;
  }

  preferenceState = normalizePreferencePatch({
    ...preferenceState,
    drawerWidth: normalized.width,
    drawerHeight: normalized.height,
    lastUpdatedAt: Date.now()
  });
  writePreferenceState();
  broadcastPreferenceState();
  refreshTrayMenu();
  return normalized;
}

function applyWindowZoomFactor() {
  const zoomFactor = getUiScale();

  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.setZoomFactor(zoomFactor);
  }

  if (chatWindow && !chatWindow.isDestroyed()) {
    chatWindow.webContents.setZoomFactor(zoomFactor);
  }

  for (const windowRef of cloneWindows.values()) {
    if (!windowRef || windowRef.isDestroyed()) {
      continue;
    }

    windowRef.webContents.setZoomFactor(zoomFactor);
  }

  if (chatWindow && !chatWindow.isDestroyed()) {
    const minimum = getChatWindowMinimumSize();
    chatWindow.setMinimumSize(minimum.width, minimum.height);
  }
}

function maybeSpeakState(nextState) {
  if (
    process.platform !== "darwin" ||
    !preferenceState.voiceEnabled ||
    nextState.suppressBubble ||
    nextState.interruptLevel !== "critical"
  ) {
    return;
  }

  const signature = `${nextState.status}:${nextState.message}`;

  if (signature === lastSpokenSignature && (Date.now() - lastSpokenAt) < VOICE_COOLDOWN_MS) {
    return;
  }

  lastSpokenSignature = signature;
  lastSpokenAt = Date.now();

  const child = spawn("say", [truncateText(nextState.message, 80)], {
    stdio: "ignore"
  });

  child.on("error", () => {});
}

function setDrawerOpen(nextValue, options = {}) {
  const drawerOpen = Boolean(nextValue);
  const preserveWorkbenchOnOpen = options?.preserveWorkbenchOnOpen === true;
  const preserveDiffOnOpen = options?.preserveDiffOnOpen === true;
  const focusWindow = options?.focusWindow !== false;
  const workbenchOpen = drawerOpen && preserveWorkbenchOnOpen ? uiState.workbenchOpen : false;
  const diffOpen = drawerOpen && preserveDiffOnOpen ? uiState.diffOpen : false;

  uiState = {
    ...uiState,
    drawerOpen,
    workbenchOpen,
    diffOpen
  };

  if (!drawerOpen) {
    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.hide();
    }

    setInteractive(false);
  } else {
    lastIdleCompanionAt = Date.now();

    if (petWindow && !petWindow.isDestroyed()) {
      petWindow.show();
    }

    const nextChatWindow = ensureChatWindow();

    if (nextChatWindow && !nextChatWindow.isDestroyed()) {
      placeChatWindow();

      if (focusWindow) {
        nextChatWindow.show();
        nextChatWindow.focus();
      } else {
        nextChatWindow.showInactive();
      }
    }
  }

  applyWindowMode();
  updateFrontWindowSurface();
  broadcastUiState();
  refreshTrayMenu();
}

function setDiffOpen(nextValue, cloneId = cloneState.selectedDiffCloneId) {
  if (cloneId) {
    setSelectedDiffClone(cloneId);
  }

  const diffOpen = Boolean(nextValue);
  uiState = {
    ...uiState,
    diffOpen,
    workbenchOpen: diffOpen ? false : uiState.workbenchOpen
  };

  if (uiState.diffOpen) {
    setDrawerOpen(true, {
      preserveDiffOnOpen: true,
      focusWindow: false
    });
    return;
  }

  if (uiState.drawerOpen && chatWindow && !chatWindow.isDestroyed()) {
    placeChatWindow();
    chatWindow.showInactive();
  }

  applyWindowMode();
  broadcastUiState();
  refreshTrayMenu();
}

function setEcoMode(nextValue) {
  const ecoMode = Boolean(nextValue);

  uiState = {
    ...uiState,
    ecoMode
  };
  resetAllCadenceStates();

  if (ecoMode) {
    applyBehaviorPose(PET_BEHAVIOR.FLOOR_IDLE, "idle", {
      angle: 0,
      leanX: 0,
      velocityX: 0,
      velocityY: 0
    });
    pushState(
      normalizeEventPayload({
        status: "idle",
        message: "省电开了，我先卖萌巡场。",
        ttlMs: 3600,
        source: "eco-mode"
      })
    );
  } else {
    applyBehaviorPose(PET_BEHAVIOR.FLOOR_IDLE, "idle", {
      angle: 0,
      leanX: 0,
      velocityX: 0,
      velocityY: 0
    });

    if (!uiState.drawerOpen) {
      setInteractive(false);
    }

    pushState(
      normalizeEventPayload({
        status: "idle",
        message: "省电关了，我回正常工位。",
        ttlMs: 2800,
        source: "eco-mode"
      })
    );
  }

  applyWindowMode();
  updateEcoAutomation();
  broadcastUiState();
  refreshTrayMenu();
  updateFrontWindowSurface();
}

function setAvatarMode(nextValue) {
  const avatarMode = resolveAvatarMode(nextValue);

  uiState = {
    ...uiState,
    avatarMode,
    avatarSurfaceProfile: getAvatarSurfaceProfile(avatarMode)
  };

  setMotionState({
    surfaceCling: buildSurfaceClingState(motionState.mode, avatarMode)
  });

  for (const actorId of getAllPetActorIds()) {
    if (isMainActor(actorId)) {
      continue;
    }

    setCloneMotionState(actorId, {
      surfaceCling: buildSurfaceClingState(getCloneActor(actorId).motion.mode, avatarMode)
    });
  }

  broadcastUiState();
  refreshTrayMenu();
}

function setWorkbenchOpen(nextValue) {
  const workbenchOpen = Boolean(nextValue);

  uiState = {
    ...uiState,
    workbenchOpen,
    diffOpen: workbenchOpen ? false : uiState.diffOpen
  };

  if (workbenchOpen) {
    setDrawerOpen(true, {
      preserveWorkbenchOnOpen: true,
      focusWindow: false
    });
    return;
  }

  if (uiState.drawerOpen && chatWindow && !chatWindow.isDestroyed()) {
    placeChatWindow();
    chatWindow.showInactive();
  }

  applyWindowMode();
  broadcastUiState();
  refreshTrayMenu();
}

function resolveWindowMode() {
  if (uiState.ecoMode) {
    return "eco";
  }

  return "compact";
}

function getPetDisplay() {
  if (petWindow && !petWindow.isDestroyed()) {
    const bounds = petWindow.getBounds();
    return screen.getDisplayNearestPoint({
      x: Math.round(bounds.x + (bounds.width / 2)),
      y: Math.round(bounds.y + (bounds.height / 2))
    });
  }

  return screen.getPrimaryDisplay();
}

function getSecondaryCloneProfiles() {
  return CLONE_PROFILES.filter((profile) => profile.id !== CLONE_PROFILES[0].id);
}

function clampToRange(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function easeOutCubic(progress) {
  return 1 - ((1 - progress) ** 3);
}

function easeInOutSine(progress) {
  return -(Math.cos(Math.PI * progress) - 1) / 2;
}

function beginWindowDrag(pointer = {}) {
  const cloneId = typeof pointer?.cloneId === "string" ? getCloneProfile(pointer.cloneId).id : "";

  if (cloneId && !isMainActor(cloneId)) {
    beginCloneWindowDrag(cloneId, pointer);
    return;
  }

  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  stopPetMotion();

  const startPointerX = Number(pointer.screenX);
  const startPointerY = Number(pointer.screenY);

  if (!Number.isFinite(startPointerX) || !Number.isFinite(startPointerY)) {
    return;
  }

  const bounds = petWindow.getBounds();

  petDragState = createDragRuntimeState(bounds, startPointerX, startPointerY);
  petWindowManuallyPlaced = true;
  setBehaviorState(PET_BEHAVIOR.DRAG_PICKED, {
    source: "pointer-drag"
  });
  setInteractive(true);
  setMotionState({
    behavior: PET_BEHAVIOR.DRAG_PICKED,
    mode: "drag",
    angle: 0,
    leanX: 0,
    velocityX: 0,
    velocityY: 0
  });
  startPetDragLoop();
}

function updateWindowDrag(pointer = {}) {
  const cloneId = typeof pointer?.cloneId === "string" ? getCloneProfile(pointer.cloneId).id : "";

  if (cloneId && !isMainActor(cloneId)) {
    updateCloneWindowDrag(cloneId, pointer);
    return;
  }

  if (!petDragState || !petWindow || petWindow.isDestroyed()) {
    return;
  }

  const pointerX = Number(pointer.screenX);
  const pointerY = Number(pointer.screenY);

  if (!Number.isFinite(pointerX) || !Number.isFinite(pointerY)) {
    return;
  }

  const now = Date.now();
  petDragState = {
    ...petDragState,
    lastExternalPointerAt: now
  };
  startPetDragLoop();
  applyPetDragFrame(pointerX, pointerY, {
    now
  });
}

function beginCloneWindowDrag(cloneId, pointer = {}) {
  const resolvedCloneId = getCloneProfile(cloneId).id;

  if (!ensureCloneSpawned(resolvedCloneId, {
    sourceActorId: CLONE_PROFILES[0].id,
    mode: "pull"
  })) {
    return;
  }

  const windowRef = getCloneWindow(resolvedCloneId);

  if (!windowRef || windowRef.isDestroyed()) {
    return;
  }

  const startPointerX = Number(pointer.screenX);
  const startPointerY = Number(pointer.screenY);

  if (!Number.isFinite(startPointerX) || !Number.isFinite(startPointerY)) {
    return;
  }

  stopCloneMotion(resolvedCloneId);
  clearCloneCooldown(resolvedCloneId);
  setCloneInteractive(resolvedCloneId, true);

  const actor = getCloneActor(resolvedCloneId);
  const bounds = windowRef.getBounds();
  actor.anchorSeeded = true;
  cloneDragStates.set(resolvedCloneId, createDragRuntimeState(bounds, startPointerX, startPointerY));

  setCloneBehaviorState(resolvedCloneId, PET_BEHAVIOR.DRAG_PICKED, {
    source: "pointer-drag"
  });
  setCloneMotionState(resolvedCloneId, {
    behavior: PET_BEHAVIOR.DRAG_PICKED,
    mode: "drag",
    angle: 0,
    leanX: 0,
    velocityX: 0,
    velocityY: 0
  });
}

function updateCloneWindowDrag(cloneId, pointer = {}) {
  const resolvedCloneId = getCloneProfile(cloneId).id;
  const dragState = cloneDragStates.get(resolvedCloneId);
  const windowRef = getCloneWindow(resolvedCloneId);

  if (!dragState || !windowRef || windowRef.isDestroyed()) {
    return;
  }

  const pointerX = Number(pointer.screenX);
  const pointerY = Number(pointer.screenY);

  if (!Number.isFinite(pointerX) || !Number.isFinite(pointerY)) {
    return;
  }

  const nextX = dragState.windowStartX + (pointerX - dragState.pointerStartX);
  const nextY = dragState.windowStartY + (pointerY - dragState.pointerStartY);
  const roundedNextX = Math.round(nextX);
  const roundedNextY = Math.round(nextY);
  const currentX = Number.isFinite(dragState.lastAppliedX) ? dragState.lastAppliedX : windowRef.getBounds().x;
  const currentY = Number.isFinite(dragState.lastAppliedY) ? dragState.lastAppliedY : windowRef.getBounds().y;
  const now = Date.now();
  const elapsed = Math.max(16, now - dragState.lastAt);
  const rawVelocityX = ((pointerX - dragState.lastPointerX) / elapsed) * 16;
  const rawVelocityY = ((pointerY - dragState.lastPointerY) / elapsed) * 16;
  const velocitySample = sampleDragVelocities(dragState, rawVelocityX, rawVelocityY);
  const velocityX = velocitySample.smoothedVelocityX;
  const velocityY = velocitySample.smoothedVelocityY;
  const positionChanged = roundedNextX !== currentX || roundedNextY !== currentY;
  const nextBehavior = Math.hypot(velocityX, velocityY) >= DRAG_RESIST_SPEED
    ? PET_BEHAVIOR.DRAG_RESIST
    : PET_BEHAVIOR.DRAG_PICKED;
  const shouldResolveCollisions = positionChanged && (now - (dragState.lastCollisionAt || 0)) >= DRAG_COLLISION_INTERVAL_MS;
  const shouldRefreshMotion = shouldRefreshDragMotionSnapshot(
    dragState,
    now,
    nextBehavior,
    roundedNextX,
    roundedNextY,
    velocityX,
    velocityY
  );
  const shouldBroadcastMotion = shouldRefreshMotion && (
    nextBehavior !== dragState.lastBroadcastBehavior ||
    (now - (dragState.lastMotionBroadcastAt || 0)) >= DRAG_MOTION_BROADCAST_INTERVAL_MS
  );

  cloneDragStates.set(resolvedCloneId, {
    ...dragState,
    lastPointerX: pointerX,
    lastPointerY: pointerY,
    lastAt: now,
    lastCollisionAt: shouldResolveCollisions ? now : dragState.lastCollisionAt,
    rawVelocityX,
    rawVelocityY,
    smoothedVelocityX: velocityX,
    smoothedVelocityY: velocityY,
    releaseVelocityX: velocitySample.releaseVelocityX,
    releaseVelocityY: velocitySample.releaseVelocityY,
    lastAppliedX: positionChanged ? roundedNextX : dragState.lastAppliedX,
    lastAppliedY: positionChanged ? roundedNextY : dragState.lastAppliedY,
    lastMotionAt: shouldRefreshMotion ? now : dragState.lastMotionAt,
    lastMotionX: shouldRefreshMotion ? roundedNextX : dragState.lastMotionX,
    lastMotionY: shouldRefreshMotion ? roundedNextY : dragState.lastMotionY,
    lastMotionVelocityX: shouldRefreshMotion ? velocityX : dragState.lastMotionVelocityX,
    lastMotionVelocityY: shouldRefreshMotion ? velocityY : dragState.lastMotionVelocityY,
    lastMotionBehavior: shouldRefreshMotion ? nextBehavior : dragState.lastMotionBehavior,
    lastMotionBroadcastAt: shouldBroadcastMotion ? now : dragState.lastMotionBroadcastAt,
    lastBroadcastBehavior: shouldBroadcastMotion ? nextBehavior : dragState.lastBroadcastBehavior
  });

  if (positionChanged) {
    if (shouldResolveCollisions) {
      applyCloneBoundsPosition(resolvedCloneId, nextX, nextY, {
        resolveCollisions: true
      });
    } else {
      moveCloneWindowForDrag(resolvedCloneId, roundedNextX, roundedNextY);
    }
  }

  const actor = getCloneActor(resolvedCloneId);

  if (actor.behavior.state !== nextBehavior) {
    setCloneBehaviorState(resolvedCloneId, nextBehavior, {
      source: "pointer-drag"
    });
  }

  if (shouldRefreshMotion) {
    setCloneMotionStateWithOptions(resolvedCloneId, {
      behavior: nextBehavior,
      mode: "drag",
      facing: velocityX >= 0 ? "right" : "left",
      angle: clampToRange(velocityX * DRAG_ANGLE_MULTIPLIER, -28, 28),
      leanX: clampToRange(velocityX / DRAG_LEAN_DIVISOR, -1, 1),
      velocityX,
      velocityY
    }, {
      broadcast: shouldBroadcastMotion,
      now
    });
  }
}

function startThrowMotion(velocityX, velocityY) {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  stopPetMotion();

  let bounds = petWindow.getBounds();
  let nextX = bounds.x;
  let nextY = bounds.y;
  let nextVelocityX = velocityX;
  let nextVelocityY = velocityY;
  let bounces = 0;

  setBehaviorState(PET_BEHAVIOR.THROW_FALL, {
    source: "pointer-throw"
  });
  setMotionState({
    behavior: PET_BEHAVIOR.THROW_FALL,
    mode: "fall",
    facing: nextVelocityX >= 0 ? "right" : "left",
    angle: clampToRange(nextVelocityX * 1.8, -28, 28),
    leanX: clampToRange(nextVelocityX / 8, -1, 1),
    velocityX: nextVelocityX,
    velocityY: nextVelocityY
  });

  petThrowTimer = setInterval(() => {
    if (!petWindow || petWindow.isDestroyed()) {
      clearThrowMotion();
      return;
    }

    bounds = petWindow.getBounds();
    const {
      floorY,
      topY: ceilingY,
      minX,
      maxX
    } = getActorSurfaceBounds(bounds);

    nextVelocityY += 1.15;
    nextVelocityX *= 0.992;
    nextX += nextVelocityX;
    nextY += nextVelocityY;

    const catchIntent = resolveDraggedPetSurfaceIntent({
      x: Math.round(nextX),
      y: Math.round(nextY),
      width: bounds.width,
      height: bounds.height
    }, nextVelocityX, nextVelocityY, {
      phase: "throw"
    });

    if (catchIntent) {
      clearThrowMotion();
      applyPetBoundsPosition(nextX, nextY);
      attachMainPetToSurface(catchIntent, "pointer-throw-catch");
      return;
    }

    if (nextX <= minX) {
      nextX = minX;
      nextVelocityX = Math.abs(nextVelocityX) * 0.72;
    } else if (nextX >= maxX) {
      nextX = maxX;
      nextVelocityX = -Math.abs(nextVelocityX) * 0.72;
    }

    if (nextY <= ceilingY) {
      nextY = ceilingY;
      nextVelocityY = Math.abs(nextVelocityY) * 0.35;
    }

    if (nextY >= floorY) {
      nextY = floorY;

      if (Math.abs(nextVelocityY) > 4.5 && bounces < 2) {
        nextVelocityY = -Math.abs(nextVelocityY) * 0.42;
        nextVelocityX *= 0.82;
        bounces += 1;
      } else {
        clearThrowMotion();
        applyPetBoundsPosition(nextX, nextY);
        setBehaviorState(PET_BEHAVIOR.THROW_LAND, {
          source: "pointer-throw"
        });
        setMotionState({
          behavior: PET_BEHAVIOR.THROW_LAND,
          mode: "land",
          facing: nextVelocityX >= 0 ? "right" : "left",
          angle: clampToRange(nextVelocityX * 0.75, -10, 10),
          leanX: 0,
          velocityX: 0,
          velocityY: 0
        });

        setTimeout(() => {
          if (!petDragState) {
            applyBehaviorPose(
              uiState.ecoMode ? PET_BEHAVIOR.FLOOR_WALK : PET_BEHAVIOR.FLOOR_IDLE,
              uiState.ecoMode ? "walk" : "idle",
              {
                behavior: uiState.ecoMode ? PET_BEHAVIOR.FLOOR_WALK : PET_BEHAVIOR.FLOOR_IDLE,
                facing: nextVelocityX >= 0 ? "right" : "left",
                angle: 0,
                leanX: 0,
                velocityX: 0,
                velocityY: 0
              },
              {
                source: "pointer-throw-recover"
              }
            );
          }
        }, 420);
        return;
      }
    }

    applyPetBoundsPosition(nextX, nextY);
    setMotionState({
      behavior: PET_BEHAVIOR.THROW_FALL,
      mode: "fall",
      facing: nextVelocityX >= 0 ? "right" : "left",
      angle: clampToRange((nextVelocityX * 1.4) + (nextVelocityY * 0.12), -28, 28),
      leanX: clampToRange(nextVelocityX / 8, -1, 1),
      velocityX: nextVelocityX,
      velocityY: nextVelocityY
    });
  }, 16);
}

function endWindowDrag(pointer = {}) {
  const cloneId = typeof pointer?.cloneId === "string" ? getCloneProfile(pointer.cloneId).id : "";

  if (cloneId && !isMainActor(cloneId)) {
    endCloneWindowDrag(cloneId);
    return;
  }

  if (!petDragState) {
    return;
  }

  clearPetDragLoop();
  const pointerX = Number(pointer.screenX);
  const pointerY = Number(pointer.screenY);

  if (Number.isFinite(pointerX) && Number.isFinite(pointerY)) {
    applyPetDragFrame(pointerX, pointerY);
  }

  const velocityX = Number.isFinite(petDragState.releaseVelocityX) ? petDragState.releaseVelocityX : petDragState.smoothedVelocityX;
  const velocityY = Number.isFinite(petDragState.releaseVelocityY) ? petDragState.releaseVelocityY : petDragState.smoothedVelocityY;
  petDragState = null;

  if (Math.hypot(velocityX, velocityY) >= DRAG_THROW_SPEED) {
    resolveActorCollisions(CLONE_PROFILES[0].id);
    startThrowMotion(velocityX, velocityY);
    return;
  }

  const currentBounds = petWindow && !petWindow.isDestroyed()
    ? petWindow.getBounds()
    : null;
  const attachIntent = currentBounds
    ? resolveDraggedPetSurfaceIntent(currentBounds, velocityX, velocityY)
    : null;

  if (attachIntent) {
    attachMainPetToSurface(attachIntent, "pointer-drag-attach");

    if (!uiState.drawerOpen) {
      setInteractive(false);
    }

    return;
  }

  applyBehaviorPose(PET_BEHAVIOR.FLOOR_IDLE, "idle", {
    angle: 0,
    leanX: 0,
    velocityX: 0,
    velocityY: 0
  }, {
    source: "pointer-drag-release"
  });
  resolveActorCollisions(CLONE_PROFILES[0].id);
  placeChatWindow();

  if (!uiState.drawerOpen) {
    setInteractive(false);
  }
}

function endCloneWindowDrag(cloneId) {
  const resolvedCloneId = getCloneProfile(cloneId).id;
  const dragState = cloneDragStates.get(resolvedCloneId);

  if (!dragState) {
    return;
  }

  cloneDragStates.delete(resolvedCloneId);
  setCloneInteractive(resolvedCloneId, false);

  const velocityX = Number.isFinite(dragState.releaseVelocityX) ? dragState.releaseVelocityX : dragState.smoothedVelocityX;
  const velocityY = Number.isFinite(dragState.releaseVelocityY) ? dragState.releaseVelocityY : dragState.smoothedVelocityY;

  if (Math.hypot(velocityX, velocityY) >= DRAG_THROW_SPEED) {
    resolveActorCollisions(resolvedCloneId);
    startCloneThrowMotion(resolvedCloneId, velocityX, velocityY);
    return;
  }

  const windowRef = getCloneWindow(resolvedCloneId);
  const currentBounds = windowRef && !windowRef.isDestroyed()
    ? windowRef.getBounds()
    : null;
  const attachIntent = currentBounds
    ? resolveDraggedPetSurfaceIntent(currentBounds, velocityX, velocityY)
    : null;

  if (attachIntent) {
    attachCloneToSurface(resolvedCloneId, attachIntent, "pointer-drag-attach");
    return;
  }

  applyCloneBehaviorPose(resolvedCloneId, PET_BEHAVIOR.FLOOR_IDLE, "idle", {
    angle: 0,
    leanX: 0,
    velocityX: 0,
    velocityY: 0
  }, {
    source: "pointer-drag-release"
  });
  resolveActorCollisions(resolvedCloneId);
}

function placeChatWindow() {
  if (!chatWindow || chatWindow.isDestroyed() || !petWindow || petWindow.isDestroyed()) {
    return;
  }

  const mode = uiState.diffOpen || uiState.workbenchOpen ? "workbench" : "drawer";
  const currentBounds = chatWindow.getBounds();
  const preferredSize = currentBounds.width > 0 && currentBounds.height > 0
    ? normalizeChatWindowSize(currentBounds.width, currentBounds.height, mode)
    : getChatWindowSize(mode);

  const nextBounds = computeChatBounds({
    petBounds: petWindow.getBounds(),
    workArea: getPetDisplay().workArea,
    size: preferredSize,
    expanded: uiState.diffOpen || uiState.workbenchOpen
  });

  if (nextBounds) {
    suppressChatWindowResizeSync = true;
    try {
      chatWindow.setBounds(nextBounds);
    } finally {
      suppressChatWindowResizeSync = false;
    }
  }
}

function beginChatResize(pointer = {}) {
  if (!chatWindow || chatWindow.isDestroyed()) {
    return;
  }

  const pointerX = Number(pointer.screenX);
  const pointerY = Number(pointer.screenY);

  if (!Number.isFinite(pointerX) || !Number.isFinite(pointerY)) {
    return;
  }

  const bounds = chatWindow.getBounds();
  chatResizeState = {
    startPointerX: pointerX,
    startPointerY: pointerY,
    startWidth: bounds.width,
    startHeight: bounds.height
  };
}

function updateChatResize(pointer = {}) {
  if (!chatResizeState || !chatWindow || chatWindow.isDestroyed()) {
    return;
  }

  const pointerX = Number(pointer.screenX);
  const pointerY = Number(pointer.screenY);

  if (!Number.isFinite(pointerX) || !Number.isFinite(pointerY)) {
    return;
  }

  const nextSize = normalizeChatWindowSize(
    chatResizeState.startWidth + (pointerX - chatResizeState.startPointerX),
    chatResizeState.startHeight + (pointerY - chatResizeState.startPointerY)
  );
  const currentBounds = chatWindow.getBounds();

  suppressChatWindowResizeSync = true;
  try {
    chatWindow.setBounds({
      x: currentBounds.x,
      y: currentBounds.y,
      width: nextSize.width,
      height: nextSize.height
    });
  } finally {
    suppressChatWindowResizeSync = false;
  }
}

function endChatResize(pointer = {}) {
  if (!chatResizeState) {
    return;
  }

  updateChatResize(pointer);
  chatResizeState = null;

  if (!chatWindow || chatWindow.isDestroyed()) {
    return;
  }

  const bounds = chatWindow.getBounds();
  persistChatWindowSize(bounds.width, bounds.height);
}

function placeCloneWindows() {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  const petBounds = petWindow.getBounds();
  const workArea = getPetDisplay().bounds;
  const cloneSize = getCloneWindowSize();

  getSecondaryCloneProfiles().forEach((profile, index) => {
    const windowRef = cloneWindows.get(profile.id);
    const actor = getCloneActor(profile.id);

    if (!windowRef || windowRef.isDestroyed() || actor.anchorSeeded) {
      return;
    }

    const nextBounds = computeCloneAnchorBounds({
      petBounds,
      workArea,
      cloneSize,
      index,
      scale: getUiScale()
    });

    if (!nextBounds) {
      return;
    }

    windowRef.setBounds({
      x: nextBounds.x,
      y: nextBounds.y,
      width: nextBounds.width,
      height: nextBounds.height
    });

    actor.anchorSeeded = true;
    applyCloneBehaviorPose(profile.id, PET_BEHAVIOR.FLOOR_IDLE, "idle", {
      facing: nextBounds.facing,
      angle: 0,
      leanX: 0,
      velocityX: 0,
      velocityY: 0
    }, {
      source: "seed-clone"
    });
  });
}

function placeWindow(resetAnchor = false) {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  const size = getWindowSize(resolveWindowMode());
  const currentBounds = petWindow.getBounds();
  const workArea = (resetAnchor || !petWindowManuallyPlaced)
    ? screen.getPrimaryDisplay().bounds
    : getDisplayBoundsForBounds(currentBounds);
  const nextBounds = computePetWindowBounds({
    currentBounds,
    workArea,
    size,
    resetAnchor,
    manuallyPlaced: petWindowManuallyPlaced
  });

  if (
    nextBounds &&
    (
      currentBounds.x !== nextBounds.x ||
      currentBounds.y !== nextBounds.y ||
      currentBounds.width !== nextBounds.width ||
      currentBounds.height !== nextBounds.height
    )
  ) {
    petWindow.setBounds(nextBounds);
  }

  placeChatWindow();
  placeCloneWindows();
}

function applyWindowMode() {
  if (!petWindow || petWindow.isDestroyed()) {
    return;
  }

  placeWindow();
}

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path fill="black" d="M5 9 8.2 3.6 12 6l3.8-2.4L19 9v7.3c0 1.2-.4 2.3-1.3 3.1-.9.8-2 1.2-3.2 1.2H9.5c-1.2 0-2.3-.4-3.2-1.2A4.2 4.2 0 0 1 5 16.3V9Z"/>
      <circle cx="9.2" cy="12.4" r="1.15" fill="white"/>
      <circle cx="14.8" cy="12.4" r="1.15" fill="white"/>
      <path d="M10.2 15.4c.5.4 1.1.6 1.8.6.7 0 1.3-.2 1.8-.6" stroke="white" stroke-width="1.2" stroke-linecap="round"/>
    </svg>
  `.trim();

  const image = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);

  if (process.platform === "darwin" && typeof image.setTemplateImage === "function") {
    image.setTemplateImage(true);
  }

  return image.resize({ width: 18, height: 18 });
}

function toggleWindowVisibility() {
  if (!petWindow) {
    return;
  }

  if (petWindow.isVisible()) {
    clearPetDragLoop();
    petDragState = null;
    petWindow.hide();
    for (const profile of getSecondaryCloneProfiles()) {
      cloneDragStates.delete(profile.id);
      setCloneInteractive(profile.id, false);
      const windowRef = getCloneWindow(profile.id);

      if (windowRef && !windowRef.isDestroyed()) {
        windowRef.hide();
      }
    }

    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.hide();
    }
  } else {
    petWindow.show();
    placeCloneWindows();
    for (const profile of getSecondaryCloneProfiles()) {
      const windowRef = getCloneWindow(profile.id);

      if (!windowRef) {
        continue;
      }

      setCloneInteractive(profile.id, false);

      if (getCloneActor(profile.id).spawned) {
        windowRef.showInactive();
      } else {
        windowRef.hide();
      }
    }

    if (uiState.drawerOpen && chatWindow && !chatWindow.isDestroyed()) {
      placeChatWindow();
      chatWindow.showInactive();
    }
  }

  updateFrontWindowSurface();
}

function refreshTrayMenu() {
  if (!tray) {
    return;
  }

  const visible = Boolean(petWindow && petWindow.isVisible());
  const pendingApproval = Boolean(contextState.approval);
  const activityOption = ACTIVITY_LEVEL_OPTIONS.find((option) => option.value === preferenceState.activityLevel) || ACTIVITY_LEVEL_OPTIONS[0];
  const workbuddyTransport = getWorkbuddyTransportState();
  const assistantStatusLabel = preferenceState.assistantMode === "workbuddy"
    ? `${workbuddyTransport.providerLabel || "WorkBuddy"} · ${workbuddyTransport.statusLabel}`
    : "Cute Mode · 本地";
  const avatarItems = [
    {
      label: "默认 chibi",
      type: "radio",
      checked: uiState.avatarMode === "kuribou",
      click: () => setAvatarMode("kuribou")
    },
    {
      label: "黑猫",
      type: "radio",
      checked: uiState.avatarMode === "cat",
      click: () => setAvatarMode("cat")
    }
  ];

  if (preferenceState.customPetImagePath) {
    avatarItems.push({
      label: "我的宠物",
      type: "radio",
      checked: uiState.avatarMode === "custom",
      click: () => setAvatarMode("custom")
    });
  }

  const menu = Menu.buildFromTemplate([
    {
      label: visible ? "Hide WorkBuddy" : "Show WorkBuddy",
      click: toggleWindowVisibility
    },
    {
      label: uiState.drawerOpen ? "Close Chat" : "Open Chat",
      click: () => setDrawerOpen(!uiState.drawerOpen)
    },
    {
      label: uiState.ecoMode ? "Eco Mode: On" : "Eco Mode: Off",
      type: "checkbox",
      checked: uiState.ecoMode,
      click: () => setEcoMode(!uiState.ecoMode)
    },
    {
      label: preferenceState.quietMode ? "Quiet Mode: On" : "Quiet Mode: Off",
      type: "checkbox",
      checked: preferenceState.quietMode,
      click: () => updatePreferenceState({ quietMode: !preferenceState.quietMode })
    },
    {
      label: preferenceState.voiceEnabled ? "Voice: On" : "Voice: Off",
      type: "checkbox",
      checked: preferenceState.voiceEnabled,
      click: () => updatePreferenceState({ voiceEnabled: !preferenceState.voiceEnabled })
    },
    {
      label: `Activity: ${activityOption.label}`,
      submenu: ACTIVITY_LEVEL_OPTIONS.map((option) => ({
        label: `${option.label} · ${option.hint}`,
        type: "radio",
        checked: option.value === preferenceState.activityLevel,
        click: () => updatePreferenceState({ activityLevel: option.value })
      }))
    },
    {
      label: "Avatar",
      submenu: avatarItems
    },
    {
      label: "Active Clone",
      submenu: cloneState.clones.map((clone) => ({
        label: `${clone.name} · ${clone.badge}${clone.id === CLONE_PROFILES[0].id || clone.spawned ? "" : " · 待召唤"}`,
        type: "radio",
        checked: clone.id === cloneState.activeCloneId,
        click: () => setActiveClone(clone.id)
      }))
    },
    {
      label: uiState.diffOpen ? "Hide Diff Monitor" : "Show Diff Monitor",
      click: () => setDiffOpen(!uiState.diffOpen)
    },
    { type: "separator" },
    ...["idle", "thinking", "done", "alert"].map((status) => ({
      label: `Set ${status}`,
      type: "radio",
      checked: petState.status === status,
      click: () => {
        pushState(
          normalizeEventPayload({
            status,
            message: DEFAULT_MESSAGE[status],
            source: "tray"
          })
        );
      }
    })),
    { type: "separator" },
    {
      label: `Assistant: ${assistantStatusLabel}`,
      enabled: false
    },
    {
      label: pendingApproval ? "Approval Pending" : `Stage: ${contextState.mode}`,
      enabled: false
    },
    {
      label: contextState.session.model ? `Model: ${contextState.session.model}` : "Model: pending",
      enabled: false
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip(`${workspaceProfile.name} • ${getCloneProfile(cloneState.activeCloneId).name} • ${assistantStatusLabel}`);
  tray.setContextMenu(menu);
}

function createCloneWindow(profile) {
  const cloneSize = getCloneWindowSize();
  const cloneWindow = new BrowserWindow({
    width: cloneSize.width,
    height: cloneSize.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    focusable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  cloneWindow.loadFile(path.join(__dirname, "src", "pet.html"), {
    query: {
      cloneId: profile.id,
      mini: "1"
    }
  });

  const actor = getCloneActor(profile.id);

  cloneWindow.webContents.once("did-finish-load", () => {
    cloneWindow.webContents.setZoomFactor(getUiScale());
    setCloneInteractive(profile.id, false);

    if (
      actor.spawned &&
      petWindow &&
      !petWindow.isDestroyed() &&
      petWindow.isVisible()
    ) {
      cloneWindow.showInactive();
    } else {
      cloneWindow.hide();
    }
  });

  cloneWindow.on("closed", () => {
    cloneWindows.delete(profile.id);
    resetCloneActor(profile.id);
  });

  cloneWindows.set(profile.id, cloneWindow);
}

function createCloneWindows() {
  for (const profile of getSecondaryCloneProfiles()) {
    createCloneWindow(profile);
  }
}

function createChatWindow() {
  const drawerSize = getChatWindowSize(resolveWindowMode());
  const minimum = getChatWindowMinimumSize();
  chatWindow = new BrowserWindow({
    width: drawerSize.width,
    height: drawerSize.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  chatWindow.setMinimumSize(minimum.width, minimum.height);

  chatWindow.loadFile(path.join(__dirname, "src", "chat.html"));
  chatWindow.webContents.once("did-finish-load", () => {
    chatWindow.webContents.setZoomFactor(getUiScale());
  });

  chatWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    setDrawerOpen(false);
  });

  chatWindow.on("closed", () => {
    chatWindow = null;
  });

  return chatWindow;
}

function ensureChatWindow() {
  if (chatWindow && !chatWindow.isDestroyed()) {
    return chatWindow;
  }

  return createChatWindow();
}

function createWindows() {
  const compactSize = getWindowSize("compact");
  petWindow = new BrowserWindow({
    width: compactSize.width,
    height: compactSize.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: true,
    focusable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  placeWindow(true);
  updateCloneAutomation();
  petWindow.loadFile(path.join(__dirname, "src", "pet.html"), {
    query: {
      cloneId: CLONE_PROFILES[0].id,
      mini: "0"
    }
  });

  petWindow.webContents.once("did-finish-load", () => {
    petWindow.webContents.setZoomFactor(getUiScale());
    setInteractive(false);
  });

  petWindow.on("move", () => {
    if (suppressPetWindowMoveSync) {
      return;
    }

    petWindowManuallyPlaced = true;
    placeWindow(false);
    placeChatWindow();
    placeCloneWindows();
  });

  petWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    petWindow.hide();
    for (const profile of getSecondaryCloneProfiles()) {
      cloneDragStates.delete(profile.id);
      setCloneInteractive(profile.id, false);
      const windowRef = getCloneWindow(profile.id);

      if (windowRef && !windowRef.isDestroyed()) {
        windowRef.hide();
      }
    }

    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.hide();
    }
  });

  petWindow.on("closed", () => {
    petWindow = null;
  });
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.on("click", () => {
    toggleWindowVisibility();
  });
  refreshTrayMenu();
}

function applyExternalEvent(payload) {
  pushState(normalizeEventPayload(payload));
}

function readEventFile() {
  if (!hasFileChanged(eventFilePath)) {
    return;
  }

  try {
    const raw = fs.readFileSync(eventFilePath, "utf8").trim();

    if (!raw || raw === lastAppliedEventKey) {
      return;
    }

    const parsed = JSON.parse(raw);
    const fingerprint = parsed.id
      ? `${parsed.id}:${parsed.status || ""}:${parsed.message || ""}`
      : raw;

    if (fingerprint === lastAppliedEventKey) {
      return;
    }

    lastAppliedEventKey = fingerprint;

    if (!parsed.id && !parsed.message && !parsed.status) {
      return;
    }

    applyExternalEvent(parsed);
  } catch (error) {
    console.error("Failed to read event file:", error);
  }
}

function broadcastChatMessage(message) {
  sendToWindows("pet:chat-message", message);
}

function rememberChatMessage(message) {
  if (chatState.seenIds.has(message.id)) {
    return false;
  }

  chatState.seenIds.add(message.id);
  chatState.messages.push(message);

  if (chatState.messages.length > CHAT_HISTORY_LIMIT) {
    const removed = chatState.messages.splice(0, chatState.messages.length - CHAT_HISTORY_LIMIT);

    for (const entry of removed) {
      chatState.seenIds.delete(entry.id);
    }

    for (const entry of chatState.messages) {
      chatState.seenIds.add(entry.id);
    }
  }

  return true;
}

function persistTranscriptMessage(message) {
  appendJsonLine(chatTranscriptFilePath, message);
}

function recordChatMessage(message, { persist = true } = {}) {
  const added = rememberChatMessage(message);

  if (!added) {
    return false;
  }

  if (persist) {
    persistTranscriptMessage(message);
  }

  broadcastChatMessage(message);
  return true;
}

function loadTranscript() {
  const messages = readJsonLines(chatTranscriptFilePath)
    .map((entry) => normalizeChatMessage(entry, entry?.role))
    .filter(Boolean)
    .sort((left, right) => left.createdAt - right.createdAt)
    .slice(-CHAT_HISTORY_LIMIT);

  chatState = {
    messages: [],
    seenIds: new Set()
  };

  for (const message of messages) {
    rememberChatMessage(message);
  }

  primeJsonLineTail(chatTranscriptFilePath);
}

function hydrateAmbientHistory() {
  const items = readJsonLines(ambientFeedFilePath)
    .map(normalizeAmbientItem)
    .filter(Boolean)
    .sort((left, right) => left.createdAt - right.createdAt);

  ambientState = {
    items: [],
    seenIds: new Set(),
    fingerprints: new Map()
  };

  for (const item of items) {
    if (ambientState.seenIds.has(item.id)) {
      continue;
    }

    ambientState.seenIds.add(item.id);
    ambientState.items.push(item);
    pruneAmbientFingerprints(item.createdAt);
    ambientState.fingerprints.set(getAmbientFingerprint(item), item.createdAt);

    if (item.source !== "idle-companion") {
      lastIdleCompanionAt = Math.max(lastIdleCompanionAt, item.createdAt);
    }
  }

  ambientState.items = ambientState.items.slice(-AMBIENT_HISTORY_LIMIT);
  mergeContextPatch({
    ambient: ambientState.items
  });
  primeJsonLineTail(ambientFeedFilePath);
}

function shouldReplayReminderOnBoot(reminder, now = Date.now()) {
  const dueAt = reminder.dueAt || reminder.createdAt;
  return dueAt >= (now - REMINDER_BOOT_REPLAY_GRACE_MS);
}

function hydrateReminderState() {
  const now = Date.now();
  const items = readJsonLines(reminderFeedFilePath)
    .map(normalizeReminderItem)
    .filter(Boolean)
    .sort((left, right) => left.dueAt - right.dueAt);
  let memoryTouched = false;

  reminderState = {
    pending: [],
    seenIds: new Set(memoryState.handledReminderIds)
  };

  for (const reminder of items) {
    if (reminderState.seenIds.has(reminder.id)) {
      continue;
    }

    if ((reminder.dueAt || reminder.createdAt) <= now) {
      if (shouldReplayReminderOnBoot(reminder, now)) {
        emitReminderItem(reminder);
      } else {
        reminderState.seenIds.add(reminder.id);
        memoryTouched = rememberHandledReminderId(reminder.id, { persist: false }) || memoryTouched;
      }
      continue;
    }

    reminderState.pending.push(reminder);
  }

  reminderState.pending = reminderState.pending
    .sort((left, right) => left.dueAt - right.dueAt)
    .filter((reminder, index, list) => list.findIndex((entry) => entry.id === reminder.id) === index);

  if (memoryTouched) {
    writeMemoryState();
    broadcastMemoryState();
  }

  primeJsonLineTail(reminderFeedFilePath);
}

function hydrateUnreadInboxMessages() {
  const messages = readJsonLines(chatInboxFilePath)
    .map((entry) => normalizeChatMessage(entry, "assistant"))
    .filter(Boolean)
    .sort((left, right) => left.createdAt - right.createdAt);

  for (const message of messages) {
    if (!chatState.seenIds.has(message.id)) {
      recordChatMessage(message, { persist: true });
    }

    if (!memoryState.handledReplyIds.includes(message.id)) {
      handleAssistantMessage(message, {
        notify: false,
        revealArtifact: false
      });
    }
  }

  primeJsonLineTail(chatInboxFilePath);
}

function bootstrapRuntimeHistory() {
  hydrateAmbientHistory();
  hydrateReminderState();
  hydrateUnreadInboxMessages();
}

function syncTranscriptMessages() {
  const transcriptMessages = readJsonLinesSinceLastRead(chatTranscriptFilePath);

  for (const entry of transcriptMessages) {
    const message = normalizeChatMessage(entry, entry?.role);

    if (!message) {
      continue;
    }

    recordChatMessage(message, { persist: false });
  }
}

function completeIntent(intent) {
  if (!intent) {
    return null;
  }

  return {
    ...intent,
    steps: intent.steps.map((step) => ({
      ...step,
      status: "done"
    }))
  };
}

function createArtifactFromText(text, title = "Latest reply") {
  const cleanText = typeof text === "string" ? text.trim() : "";

  if (!cleanText) {
    return null;
  }

  return {
    title,
    kind: cleanText.includes("```") ? "code" : "markdown",
    content: cleanText,
    updatedAt: Date.now()
  };
}

function shortBubbleCopy(text, limit = 36) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 1)}…`;
}

function handleAssistantMessage(message, options = {}) {
  const notify = options.notify !== false;
  const revealArtifact = options.revealArtifact !== false;
  const clone = getCloneProfile(message.cloneId);
  const trimmedText = typeof message.text === "string" ? message.text.trim() : "";
  const shouldPromoteToArtifact = trimmedText.length > preferenceState.longReplyThreshold;
  const artifact = shouldPromoteToArtifact
    ? createArtifactFromText(message.text, "WorkBuddy reply")
    : null;

  mergeContextPatch({
    mode: artifact ? "artifact" : "ambient",
    presence: artifact ? `${clone.name} 把长回复停好了` : `${clone.name} 已经回包`,
    intent: contextState.intent ? completeIntent(contextState.intent) : null,
    tool: null,
    approval: getVisiblePendingApproval(),
    artifact: artifact || null,
    session: {
      lastActiveAt: message.createdAt
    }
  });
  patchCloneState(clone.id, {
    status: message.status || "done",
    lastRunAt: message.createdAt
  });
  rememberHandledReplyId(message.id, { persist: false });
  updateMemoryState((current) => ({
    ...current,
    assistantReplies: current.assistantReplies + 1,
    completedTasks: message.status === "done" ? current.completedTasks + 1 : current.completedTasks,
    lastCompletedAt: message.status === "done" ? message.createdAt : current.lastCompletedAt,
    recentWins: message.status === "done"
      ? [
          ...current.recentWins,
          {
            id: message.id,
            cloneId: clone.id,
            text: truncateText(trimmedText, 72),
            createdAt: message.createdAt
          }
        ].slice(-MEMORY_RECENT_WIN_LIMIT)
      : current.recentWins
  }));
  lastIdleCompanionAt = Date.now();

  if (artifact && revealArtifact) {
    setWorkbenchOpen(true);
  }

  if (notify) {
    pushState(
      normalizeEventPayload({
        status: message.status || "done",
        message: artifact
          ? `${clone.name}：长回复我收进工作台了。`
          : shortBubbleCopy(`${clone.name}：${message.text}`),
        ttlMs: artifact ? 3200 : preferenceState.bubbleTtlMs,
        interruptLevel: message.status === "alert" ? "critical" : "suggest",
        source: message.source || "assistant-reply"
      })
    );
  }
}

function pollChatInbox() {
  const inboundMessages = readJsonLinesSinceLastRead(chatInboxFilePath);

  for (const entry of inboundMessages) {
    const message = normalizeChatMessage(entry, "assistant");

    if (!message) {
      continue;
    }

    const wasAdded = recordChatMessage(message, { persist: true });

    if (!wasAdded) {
      continue;
    }

    handleAssistantMessage(message);
  }
}

function mapAmbientLevelToStatus(level) {
  if (level === "critical") {
    return "alert";
  }

  if (level === "quiet") {
    return "idle";
  }

  return "thinking";
}

function pushAmbientItem(input, { openDrawer = false, bypassCooldown = false } = {}) {
  const item = normalizeAmbientItem(input);

  if (!item || ambientState.seenIds.has(item.id) || (!bypassCooldown && shouldDropAmbientItem(item))) {
    return false;
  }

  ambientState.seenIds.add(item.id);
  ambientState.items.push(item);
  ambientState.items = ambientState.items
    .sort((left, right) => left.createdAt - right.createdAt)
    .slice(-AMBIENT_HISTORY_LIMIT);

  mergeContextPatch({
    ambient: ambientState.items,
    mode: item.level === "quiet" ? contextState.mode : "ambient",
    presence: item.level === "critical" ? "heads up from the machine" : contextState.presence
  });

  if (item.source !== "idle-companion") {
    lastIdleCompanionAt = Math.max(lastIdleCompanionAt, item.createdAt);
  }

  if (item.level !== "quiet") {
    pushState(
      normalizeEventPayload({
        status: mapAmbientLevelToStatus(item.level),
        message: shortBubbleCopy(item.message),
        ttlMs: item.level === "critical" ? 5400 : preferenceState.bubbleTtlMs,
        interruptLevel: item.level === "critical" ? "critical" : "suggest",
        source: item.source || "ambient"
      })
    );
  }

  if (openDrawer) {
    setDrawerOpen(true);
  }

  return true;
}

function showSystemNotification(title, body) {
  if (!Notification.isSupported()) {
    return;
  }

  try {
    const notification = new Notification({
      title: truncateText(title, 48) || "小七提醒",
      body: truncateText(body, 96) || "有一条新的提醒。",
      silent: true
    });

    notification.show();
  } catch (error) {
    console.error("Failed to show notification:", error);
  }
}

function emitReminderItem(reminder) {
  if (!reminder || reminderState.seenIds.has(reminder.id)) {
    return false;
  }

  reminderState.seenIds.add(reminder.id);
  rememberHandledReminderId(reminder.id, { persist: false });
  updateMemoryState((current) => ({
    ...current,
    reminderCount: current.reminderCount + 1
  }));
  pushAmbientItem(
    {
      id: reminder.id,
      title: `提醒 · ${reminder.title}`,
      message: reminder.message,
      level: reminder.level,
      source: `reminder:${reminder.source}`,
      createdAt: reminder.dueAt || reminder.createdAt
    },
    {
      openDrawer: reminder.level === "critical",
      bypassCooldown: true
    }
  );

  if (reminder.notify && reminder.level !== "quiet") {
    showSystemNotification(reminder.title, reminder.message);
  }

  return true;
}

function flushPendingReminders(now = Date.now()) {
  if (!reminderState.pending.length) {
    return;
  }

  const nextPending = [];

  for (const reminder of reminderState.pending) {
    if ((reminder.dueAt || reminder.createdAt) <= now) {
      emitReminderItem(reminder);
      continue;
    }

    nextPending.push(reminder);
  }

  reminderState.pending = nextPending.sort((left, right) => left.dueAt - right.dueAt);
}

function pollAmbientFeed() {
  const items = readJsonLinesSinceLastRead(ambientFeedFilePath);

  for (const entry of items) {
    pushAmbientItem(entry, { openDrawer: false });
  }
}

function pollReminderFeed() {
  const items = readJsonLinesSinceLastRead(reminderFeedFilePath);
  const now = Date.now();

  for (const entry of items) {
    const reminder = normalizeReminderItem(entry);

    if (!reminder || reminderState.seenIds.has(reminder.id)) {
      continue;
    }

    if ((reminder.dueAt || reminder.createdAt) <= now) {
      emitReminderItem(reminder);
      continue;
    }

    reminderState.pending.push(reminder);
  }

  reminderState.pending = reminderState.pending
    .sort((left, right) => left.dueAt - right.dueAt)
    .filter((reminder, index, list) => list.findIndex((entry) => entry.id === reminder.id) === index);
  flushPendingReminders(now);
}

function readShellContextFile() {
  if (!hasFileChanged(shellContextFilePath)) {
    return;
  }

  const raw = readTextFile(shellContextFilePath).trim();

  if (!raw || raw === lastShellContextKey) {
    return;
  }

  const parsed = tryParseJson(raw);

  if (!parsed) {
    return;
  }

  lastShellContextKey = raw;
  mergeContextPatch(parsed);

  if (parsed?.artifact || parsed?.approval) {
    setWorkbenchOpen(true);
  }
}

function refreshWorkspaceContext() {
  workspaceProfile = loadWorkspaceProfile();
  readPreferenceState();
  readMemoryState();
  mergeContextPatch({
    workspace: {
      name: workspaceProfile.name,
      creature: workspaceProfile.creature,
      vibe: workspaceProfile.vibe,
      emoji: workspaceProfile.emoji,
      soulTone: workspaceProfile.soulTone
    },
    metrics: {
      heartbeatEnabled: workspaceProfile.heartbeatEnabled
    }
  });
  syncOpenClawRuntimeContext(cloneState.activeCloneId);
  broadcastPreferenceState();
  broadcastMemoryState();
}

function pollSystemHealth() {
  const now = Date.now();
  const freeMemoryRatio = os.freemem() / os.totalmem();
  const loadAverage = os.loadavg()[0];
  const memoryPressure = freeMemoryRatio < 0.08
    ? "high"
    : freeMemoryRatio < 0.16
      ? "medium"
      : "normal";

  mergeContextPatch({
    metrics: {
      freeMemoryRatio,
      loadAverage,
      memoryPressure,
      heartbeatEnabled: workspaceProfile.heartbeatEnabled
    }
  });

  if (
    !uiState.drawerOpen &&
    !uiState.workbenchOpen &&
    !preferenceState.quietMode &&
    contextState.mode === "ambient" &&
    !contextState.approval &&
    contextState.tool?.status !== "active" &&
    now - lastIdleCompanionAt >= preferenceState.idleCompanionAfterMs
  ) {
    lastIdleCompanionAt = now;
    pushAmbientItem(
      {
        id: `idle-companion-${now}`,
        title: "桌宠陪伴",
        message: buildIdleCompanionCopy(),
        level: "quiet",
        source: "idle-companion"
      },
      { openDrawer: false }
    );
  }

  if (memoryPressure === "normal") {
    autoAmbientKey = "";
    return;
  }

  const nextKey = `mem-${memoryPressure}`;

  if (nextKey === autoAmbientKey) {
    return;
  }

  autoAmbientKey = nextKey;
  pushAmbientItem(
    {
      id: `system-${nextKey}-${Date.now()}`,
      title: "系统负载",
      message: memoryPressure === "high"
        ? "内存有点紧，我可以帮你收一波重任务。"
        : "机器有点热，长任务我替你盯着。",
      level: memoryPressure === "high" ? "critical" : "suggest",
      source: "local-system"
    },
    { openDrawer: false }
  );
}

function startPolling() {
  refreshWorkspaceContext();
  readEventFile();
  readShellContextFile();
  syncTranscriptMessages();
  pollAmbientFeed();
  pollReminderFeed();
  pollChatInbox();
  pollSystemHealth();
  void updateFrontWindowSurface();
  eventPollTimer = setInterval(readEventFile, 1200);
  runtimePollTimer = setInterval(() => {
    readShellContextFile();
    syncTranscriptMessages();
    pollAmbientFeed();
    pollReminderFeed();
    pollChatInbox();
  }, 900);
  systemPollTimer = setInterval(pollSystemHealth, SYSTEM_POLL_MS);
  frontWindowPollTimer = setInterval(() => {
    void updateFrontWindowSurface();
  }, FRONT_WINDOW_POLL_MS);
}

function shouldCaptureDiffSnapshot(cloneId) {
  if (!preferenceState.allowDiffMonitor) {
    return false;
  }

  return uiState.diffOpen || cloneId === "builder-cat";
}

function createDiffSnapshotPayload() {
  return {
    workspaceDir,
    rootDir: __dirname,
    textDiffExtensions: Array.from(TEXT_DIFF_EXTENSIONS),
    scanIgnoredDirs: Array.from(SCAN_IGNORED_DIRS),
    textScanDepth: TEXT_SCAN_DEPTH,
    gitScanDepth: GIT_SCAN_DEPTH,
    maxTextSnapshotBytes: MAX_TEXT_SNAPSHOT_BYTES,
    maxTextPatchChars: MAX_TEXT_PATCH_CHARS,
    maxGitPatchChars: MAX_GIT_PATCH_CHARS
  };
}

function scheduleCloneDiffSnapshotUpdate(cloneId, baseSnapshot, payload) {
  if (!baseSnapshot || !payload) {
    return;
  }

  const resolvedCloneId = getCloneProfile(cloneId).id;
  const nextToken = (cloneDiffSnapshotJobToken.get(resolvedCloneId) || 0) + 1;
  cloneDiffSnapshotJobToken.set(resolvedCloneId, nextToken);

  void buildCloneDiffSnapshotInWorker({
    ...payload,
    baseSnapshot
  }).then((diffSnapshot) => {
    if (cloneDiffSnapshotJobToken.get(resolvedCloneId) !== nextToken) {
      return;
    }

    patchCloneState(resolvedCloneId, {
      diff: diffSnapshot
    });
  }).catch((error) => {
    console.error(`Failed to build diff snapshot for ${resolvedCloneId}:`, error);
  });
}

function inferTaskCloneId(text, requestedCloneId = cloneState.activeCloneId) {
  const requestedClone = getCloneProfile(requestedCloneId || cloneState.activeCloneId);
  const normalized = String(text || "").trim();
  const category = resolveTaskCategory(normalized);

  if (!normalized || !isMainActor(requestedClone.id)) {
    return requestedClone.id;
  }

  if (category === "code") {
    return getPreferredCloneIdForTaskCategory(category, "builder-cat");
  }

  if (category === "research") {
    return getPreferredCloneIdForTaskCategory(category, "scout-cat");
  }

  if (category === "ops") {
    return getPreferredCloneIdForTaskCategory(category, "ops-cat");
  }

  return getPreferredCloneIdForTaskCategory(category, requestedClone.id);
}

function buildIntentPreview(text, phase = "planning") {
  const normalized = text.trim();
  let title = "接住这段委托";
  let summary = "先收口意图，再走当前助手通道回包，最后把结果送回桌面。";
  let labels = ["收口你的意图", "调用当前助手通道", "把结果送回桌面"];

  if (/报错|bug|修|patch|fix|构建|崩/i.test(normalized)) {
    title = "排查并收口一个问题";
    summary = "我会先定位，再判断要不要动文件或命令，最后把修法给你。";
    labels = ["读上下文和报错", "定位问题或补丁点", "把修法和结果回给你"];
  } else if (/调研|资料|文档|来源|research|seo|搜索|搜索词|站点|页面|网页|官网/i.test(normalized)) {
    title = "抓资料并收口结论";
    summary = "我会先扫材料和来源，再压关键结论，最后把不确定点带给你。";
    labels = ["扫材料和来源", "提炼可用结论", "把证据和缺口回给你"];
  } else if (/终端|进程|端口|环境|脚本|日志|服务|health|状态|重启|本机|runtime|守护/i.test(normalized)) {
    title = "检查本机运行态";
    summary = "我会先看环境和链路，再收异常点，最后给你建议动作。";
    labels = ["读运行态和链路", "收异常点与风险", "回给你建议动作"];
  } else if (/总结|总结一下|提炼|归纳|看一下|看下|分析/i.test(normalized)) {
    title = "抓一段信息做压缩";
    summary = "先看材料，再压出重点，最后给你一句人能直接用的话。";
    labels = ["读材料或上下文", "压缩重点", "回给你简版结论"];
  } else if (/写|润色|改写|文案|邮件|回复/i.test(normalized)) {
    title = "起草一段可直接发的内容";
    summary = "先定语气，再出稿，必要时再往工作台里铺长稿。";
    labels = ["确认语气和目标", "生成初稿", "回给你可直接用的版本"];
  }

  const statusMaps = {
    planning: ["active", "pending", "pending"],
    approval: ["done", "blocked", "pending"],
    acting: ["done", "active", "pending"],
    cooldown: ["done", "done", "active"],
    ambient: ["active", "pending", "pending"]
  };
  const statuses = statusMaps[phase] || statusMaps.planning;

  return {
    title,
    summary,
    steps: labels.map((label, index) => ({
      label,
      status: statuses[index] || "pending"
    }))
  };
}

function createSystemMessage(text, status = "alert") {
  return normalizeChatMessage(
    {
      role: "system",
      text,
      status,
      source: "pet-shell"
    },
    "system"
  );
}

function getTurnLaneKey(turnEnvelope) {
  return [
    turnEnvelope.clone.id,
    turnEnvelope.sessionId,
    turnEnvelope.replyTo
  ].join("::");
}

function readTurnLaneSnapshot(laneKey) {
  const cached = turnLaneState.get(laneKey);

  if (cached) {
    return cached;
  }

  const initial = {
    queued: 0,
    active: 0,
    lastQueuedAt: 0
  };

  turnLaneState.set(laneKey, initial);
  return initial;
}

function markTurnLaneQueued(laneKey) {
  const lane = readTurnLaneSnapshot(laneKey);
  lane.queued += 1;
  lane.lastQueuedAt = Date.now();
  turnLaneState.set(laneKey, lane);
  return lane;
}

function markTurnLaneStarted(laneKey) {
  const lane = readTurnLaneSnapshot(laneKey);
  lane.queued = Math.max(0, lane.queued - 1);
  lane.active += 1;
  turnLaneState.set(laneKey, lane);
  return lane;
}

function markTurnLaneSettled(laneKey) {
  const lane = readTurnLaneSnapshot(laneKey);
  lane.active = Math.max(0, lane.active - 1);

  if (!lane.active && !lane.queued) {
    turnLaneState.delete(laneKey);
    return {
      queued: 0,
      active: 0,
      lastQueuedAt: lane.lastQueuedAt
    };
  }

  turnLaneState.set(laneKey, lane);
  return lane;
}

function getCloneTurnBacklog(cloneId) {
  const prefix = `${getCloneProfile(cloneId).id}::`;
  let queued = 0;
  let active = 0;

  for (const [laneKey, lane] of turnLaneState.entries()) {
    if (!laneKey.startsWith(prefix)) {
      continue;
    }

    queued += Number(lane.queued) || 0;
    active += Number(lane.active) || 0;
  }

  return {
    queued,
    active,
    total: queued + active
  };
}

function syncCloneTurnBacklog(cloneId) {
  const backlog = getCloneTurnBacklog(cloneId);

  patchCloneState(cloneId, {
    queuedTurns: backlog.queued,
    activeTurns: backlog.active
  });

  return backlog;
}

function buildTurnActionProfile(message) {
  const clone = getCloneProfile(message?.cloneId);
  const cleanText = typeof message?.text === "string" ? message.text.trim() : "";

  if (!cleanText) {
    return {
      summary: "",
      actions: [],
      risk: "low",
      requiresApproval: false
    };
  }

  const actions = [
    {
      id: "context-read",
      label: "读取项目和会话上下文",
      detail: "先读当前委托、运行态和已有上下文，再决定要不要继续动手。",
      risk: "low",
      requiresApproval: false
    }
  ];
  const looksLikeCodeWrite = /报错|bug|修|patch|fix|实现|改代码|改文件|重构|新增|删除|apply_patch|edit|update|写一个|补上/i.test(cleanText);
  const looksLikeCommandRun = clone.id === "ops-cat" || /终端|命令|执行|运行|编译|构建|测试|日志|进程|端口|服务|health|状态|重启|npm|pnpm|yarn|bun|node|git status|ps |lsof|launchctl/i.test(cleanText);
  const looksLikeGitMutation = /git\s+(commit|push|merge|rebase|cherry-pick|tag|clean|reset|restore)|commit|push|merge|rebase|发版|发布|release/i.test(cleanText);
  const looksLikeDependencyInstall = /安装|依赖|npm i|npm install|pnpm add|yarn add|bun add|pip install|brew install/i.test(cleanText);
  const looksLikeExternalDelivery = /发邮件|发消息|发飞书|发slack|发discord|deploy|上线|发出去|publish|post|tweet|小红书/i.test(cleanText);
  const looksLikeNetworkRead = clone.id === "scout-cat" || /调研|资料|文档|来源|research|搜索|网页|官网|站点|页面|curl|http/i.test(cleanText);
  const looksLikeDestructive = HIGH_RISK_PATTERNS.some((pattern) => pattern.test(cleanText)) || /reset --hard|clean -fd|drop table|wipe|格式化|覆盖整个/i.test(cleanText);

  if (looksLikeNetworkRead) {
    actions.push({
      id: "network-read",
      label: "拉取外部资料或页面",
      detail: "会从网页、文档或外部来源抓信息，但不直接改你本机状态。",
      risk: "low",
      requiresApproval: false
    });
  }

  if (looksLikeCommandRun) {
    actions.push({
      id: "command-run",
      label: "执行本地命令或脚本",
      detail: looksLikeDependencyInstall
        ? "可能会运行安装类命令或修改本机环境。"
        : "会调用终端、CLI 或脚本来读取状态或完成任务。",
      risk: looksLikeDependencyInstall || looksLikeDestructive ? "high" : "medium",
      requiresApproval: true
    });
  }

  if (looksLikeCodeWrite) {
    actions.push({
      id: "workspace-write",
      label: "修改工作区文件",
      detail: "可能会改代码、配置、文档或生成补丁。",
      risk: looksLikeDestructive ? "high" : "medium",
      requiresApproval: true
    });
  }

  if (looksLikeGitMutation) {
    actions.push({
      id: "git-mutation",
      label: "改动 Git 状态",
      detail: "可能会创建提交、改分支状态或把变更推到远端。",
      risk: /push|发布|release/i.test(cleanText) ? "high" : "medium",
      requiresApproval: true
    });
  }

  if (looksLikeExternalDelivery) {
    actions.push({
      id: "external-delivery",
      label: "向外部渠道发送内容",
      detail: "这步会把结果发到外部系统或面向真实用户的渠道。",
      risk: "high",
      requiresApproval: true
    });
  }

  if (looksLikeDestructive) {
    actions.push({
      id: "destructive",
      label: "存在破坏性动作风险",
      detail: "包含删除、覆盖、终止或不可逆修改的信号，需要明确批准。",
      risk: "high",
      requiresApproval: true
    });
  }

  const gatedActions = actions.filter((action) => action.requiresApproval);
  const highestRisk = gatedActions.some((action) => action.risk === "high")
    ? "high"
    : gatedActions.some((action) => action.risk === "medium")
      ? "medium"
      : "low";

  return {
    summary: gatedActions.length
      ? `${clone.name} 这条不只是读一眼，会真的动命令、文件或外部动作。`
      : `${clone.name} 这条以读取、判断和回包为主。`,
    actions,
    risk: highestRisk,
    requiresApproval: gatedActions.length > 0
  };
}

function resolveTaskCategory(text = "") {
  const normalized = String(text || "").trim();

  if (!normalized) {
    return "general";
  }

  if (/报错|bug|修|patch|fix|构建|编译|崩|代码|review|diff|组件|接口|函数|实现|重构/i.test(normalized)) {
    return "code";
  }

  if (/调研|资料|文档|来源|research|seo|搜索|搜索词|站点|页面|网页|官网/i.test(normalized)) {
    return "research";
  }

  if (/终端|进程|端口|环境|脚本|日志|服务|health|状态|重启|本机|runtime|守护/i.test(normalized)) {
    return "ops";
  }

  if (/写|润色|改写|文案|邮件|回复|总结|提炼|归纳/i.test(normalized)) {
    return "writing";
  }

  return "general";
}

function getPreferredCloneIdForTaskCategory(category, fallbackCloneId = CLONE_PROFILES[0].id) {
  const normalizedCategory = TASK_CATEGORIES.includes(category) ? category : "general";
  const usage = memoryState.taskCategoryUsage?.[normalizedCategory] || {};
  const preferredCloneId = getPreferredCloneIdFromUsage(usage);
  const preferenceScore = Number(usage[preferredCloneId]) || 0;

  if (preferenceScore > 0) {
    return preferredCloneId;
  }

  return resolveCloneIdFromProfiles(fallbackCloneId);
}

function buildIdleCompanionCopy() {
  const preferredCloneName = resolveCloneNameFromProfiles(memoryState.preferredCloneId);
  const lastCategory = memoryState.lastTaskCategory || "general";

  if (lastCategory === "code") {
    return `${preferredCloneName} 低频盯着代码口，有报错我再出来。`;
  }

  if (lastCategory === "research") {
    return `${preferredCloneName} 先替你盯资料面，有来源波动我再冒头。`;
  }

  if (lastCategory === "ops") {
    return `${preferredCloneName} 继续低频看着本机运行态，有异常我再叫你。`;
  }

  if (lastCategory === "writing") {
    return `${preferredCloneName} 在旁边候着，你要起草内容时我就接。`;
  }

  return `${preferredCloneName} 在旁边低频盯着，有动静我再叫你。`;
}

function buildApprovalCommandPreview(message, turnEnvelope) {
  if (preferenceState.assistantMode === "workbuddy") {
    return [
      preferenceState.workbuddyProviderLabel || "WorkBuddy",
      `model=${preferenceState.workbuddyModel || "<model>"}`,
      `target=${turnEnvelope.clone.name}`,
      `privacy=${preferenceState.shareLocalContext ? "explicit-context" : "strict-local"}`,
      `message="${message.text}"`
    ].join(" ");
  }

  const transport = getOpenClawTransportState();

  return [
    `${transport.command || "<openclaw-command>"} agent`,
    `--agent ${turnEnvelope.agentId || "main"}`,
    `${OPENCLAW_CLI_FLAGS.sessionId} ${turnEnvelope.sessionId}`,
    `--message "${message.text}"`,
    "--deliver",
    `${OPENCLAW_CLI_FLAGS.replyChannel} ${transport.replyChannel || "<reply-channel>"}`,
    `${OPENCLAW_CLI_FLAGS.replyTo} ${turnEnvelope.replyTo}`,
    "--json"
  ].join(" ");
}

function createApprovalRequest(message, turnEnvelope, actionProfile) {
  const clone = getCloneProfile(message.cloneId);
  const gatedActions = actionProfile.actions.filter((action) => action.requiresApproval);
  const detailLines = [
    `分身：${clone.name}`,
    `lane：${turnEnvelope.sessionId} -> ${turnEnvelope.replyTo}`,
    "下面这些动作需要你明确点头："
  ];

  gatedActions.forEach((action, index) => {
    detailLines.push(`${index + 1}. ${action.label} (${action.risk})`);

    if (action.detail) {
      detailLines.push(`   ${action.detail}`);
    }
  });

  return {
    id: `approval-${Date.now()}`,
    title: `${clone.name} 这步要动真格了`,
    summary: actionProfile.summary,
    risk: actionProfile.risk,
    detail: `${detailLines.join("\n")}\n\n原始指令：${message.text}`,
    command: buildApprovalCommandPreview(message, turnEnvelope),
    actions: gatedActions
  };
}

function rememberPendingApprovalTurn(approval, turnEnvelope, message) {
  pendingApprovalTurns.set(approval.id, {
    approval,
    turnEnvelope,
    message,
    createdAt: Date.now()
  });
  pendingApprovalOrder = pendingApprovalOrder
    .filter((approvalId) => approvalId !== approval.id)
    .concat(approval.id)
    .slice(-24);
}

function forgetPendingApprovalTurn(approvalId) {
  pendingApprovalTurns.delete(approvalId);
  pendingApprovalOrder = pendingApprovalOrder.filter((entry) => entry !== approvalId);
}

function getLatestPendingApprovalTurn() {
  for (let index = pendingApprovalOrder.length - 1; index >= 0; index -= 1) {
    const approvalId = pendingApprovalOrder[index];
    const pending = pendingApprovalTurns.get(approvalId);

    if (pending) {
      return pending;
    }
  }

  return null;
}

function getVisiblePendingApproval() {
  return getLatestPendingApprovalTurn()?.approval || null;
}

function syncPendingApprovalContext({
  fallbackMode = "ambient",
  fallbackPresence = "back to ambient watch",
  fallbackIntent = contextState.intent || buildIntentPreview("等你发话", "ambient"),
  keepWorkbenchOpen = false
} = {}) {
  const pending = getLatestPendingApprovalTurn();

  if (pending) {
    mergeContextPatch({
      approval: pending.approval,
      mode: "approval",
      presence: "holding a risky ask",
      tool: null,
      intent: buildIntentPreview(pending.message.text, "approval")
    });
    setWorkbenchOpen(true);
    return;
  }

  mergeContextPatch({
    approval: null,
    mode: fallbackMode,
    presence: fallbackPresence,
    tool: contextState.tool,
    intent: fallbackIntent
  });

  if (!keepWorkbenchOpen) {
    setWorkbenchOpen(false);
  }
}

function buildTurnQueueDetail(clone, backlog, queueAhead = 0) {
  if (queueAhead > 0) {
    return `${clone.name} 已排进自己的 lane，前面还有 ${queueAhead} 条。`;
  }

  if (backlog.queued > 0) {
    return `${clone.name} 正在这条 lane 上跑，后面还挂着 ${backlog.queued} 条。`;
  }

  return `${clone.name} 在自己的 lane 里跑活，结果会回到桌宠通道。`;
}

function appendApprovalDecision(approvalId, decision, message) {
  appendJsonLine(approvalResponsesFilePath, {
    id: `${approvalId}:${decision}:${Date.now()}`,
    approvalId,
    decision,
    message,
    createdAt: Date.now()
  });
}

function parseAgentRun(stdout) {
  return tryParseJson(stdout.trim());
}

function buildCloneTurnEnvelope(message) {
  const clone = getCloneProfile(message.cloneId);
  const replyTo = typeof message.chatId === "string" && message.chatId.trim()
    ? message.chatId.trim()
    : buildTurnReplyTarget(clone.id);

  return {
    clone,
    agentId: getCloneAgentId(clone),
    sessionId: buildTurnSessionId(clone.id),
    replyTo,
    promptText: [
      clone.promptPrefix,
      `当前分身职责：${clone.taskHint}。`,
      `分身名称：${clone.name}。`,
      `用户委托：${message.text}`
    ].join("\n\n")
  };
}

function applyAgentRunMeta(result, turnEnvelope) {
  const meta = result?.result?.meta || {};
  const agentMeta = meta.agentMeta || {};
  const transport = getOpenClawTransportState();

  mergeContextPatch({
    mode: "cooldown",
    presence: transport.ready
      ? `reply routed back through ${transport.replyChannel}`
      : "assistant reply returned through configured runtime",
    tool: {
      name: "OpenClaw reply delivery",
      target: turnEnvelope.replyTo,
      detail: `${turnEnvelope.clone.name} 的回包已经投递，桌宠侧马上收下。`,
      status: "done"
    },
    session: {
      channel: transport.replyChannel,
      sessionId: turnEnvelope.sessionId,
      replyTarget: turnEnvelope.replyTo,
      workingDir: transport.workingDir,
      transportState: transport.state,
      transportSummary: transport.statusSummary,
      provider: agentMeta.provider || contextState.session.provider,
      model: agentMeta.model || contextState.session.model,
      runId: result?.runId || contextState.session.runId,
      durationMs: Number.isFinite(Number(meta.durationMs))
        ? Number(meta.durationMs)
        : contextState.session.durationMs,
      lastActiveAt: Date.now(),
      usage: agentMeta.usage || contextState.session.usage
    }
  });

  const firstPayload = result?.result?.payloads?.[0];

  if (typeof firstPayload?.text === "string") {
    const artifact = createArtifactFromText(firstPayload.text, "Latest reply");

    if (artifact) {
      mergeContextPatch({
        artifact
      });
      setWorkbenchOpen(true);
    }
  }
}

function handleRunFailure(error, turnEnvelope, options = {}) {
  const assistantLabel = getConfiguredAssistantLabel();
  console.error(`${assistantLabel} turn failed:`, error);
  const queuedAfter = Number(options.queuedAfter) || 0;

  if (turnEnvelope?.clone?.id) {
    patchCloneState(turnEnvelope.clone.id, {
      status: queuedAfter > 0 ? "thinking" : "alert",
      lastRunAt: Date.now()
    });
  }

  const fallbackMessage = createSystemMessage(
    `${turnEnvelope?.clone?.name || "这只猫"} 掉线了：${error.message || String(error)}`,
    "alert"
  );

  if (fallbackMessage) {
    recordChatMessage(fallbackMessage, { persist: true });
    pushState(
      normalizeEventPayload({
        status: "alert",
        message: shortBubbleCopy(fallbackMessage.text),
        ttlMs: 4200,
        source: getFailureSourceTag()
      })
    );
  }

  mergeContextPatch({
    mode: queuedAfter > 0 ? "acting" : "ambient",
    presence: queuedAfter > 0
      ? `${turnEnvelope?.clone?.name || "这只猫"} 前一条在 ${assistantLabel} 这边撞墙了，但后面还有 ${queuedAfter} 条在 lane 里继续跑`
      : `${assistantLabel} hit a wall; waiting on you`,
    tool: queuedAfter > 0
      ? {
          name: `${assistantLabel} recovery`,
          target: turnEnvelope?.replyTo || "",
          detail: `${turnEnvelope?.clone?.name || "这只猫"} 前一条失败了，lane 里的后续任务继续保留。`,
          status: "active"
        }
      : null,
    approval: getVisiblePendingApproval()
  });
}

function handleUnavailableOpenClawTransport(message, clone) {
  const transport = getOpenClawTransportState();
  const fallbackMessage = createSystemMessage(
    transport.statusSummary,
    "alert"
  );

  patchCloneState(clone.id, {
    status: "alert",
    lastRunAt: Date.now()
  });
  mergeContextPatch({
    mode: "ambient",
    presence: transport.state === "disabled"
      ? "OpenClaw transport is disconnected"
      : "OpenClaw setup needs attention",
    intent: buildIntentPreview(message.text, "planning"),
    tool: {
      name: "OpenClaw setup",
      target: transport.replyChannel || transport.command || "preferences",
      detail: transport.statusSummary,
      status: "blocked"
    },
    approval: getVisiblePendingApproval()
  });
  setWorkbenchOpen(true);
  pushState(
    normalizeEventPayload({
      status: "alert",
      message: transport.state === "disabled"
        ? "OpenClaw 还没接上。"
        : "OpenClaw 配置没补齐。",
      ttlMs: 4200,
      interruptLevel: "critical",
      source: "openclaw-setup"
    })
  );

  if (fallbackMessage) {
    recordChatMessage(fallbackMessage, { persist: true });
  }
}

function handleUnavailableWorkbuddyTransport(message, clone) {
  const transport = getWorkbuddyTransportState();
  const fallbackMessage = createSystemMessage(
    transport.statusSummary,
    "alert"
  );

  patchCloneState(clone.id, {
    status: "alert",
    lastRunAt: Date.now()
  });
  mergeContextPatch({
    mode: "ambient",
    presence: transport.state === "cute"
      ? "Cute Mode is active"
      : "WorkBuddy setup needs attention",
    intent: buildIntentPreview(message.text, "planning"),
    tool: {
      name: "WorkBuddy setup",
      target: transport.providerLabel || "workbuddy",
      detail: transport.statusSummary,
      status: transport.state === "cute" ? "done" : "blocked"
    },
    approval: getVisiblePendingApproval(),
    session: {
      channel: "direct-api",
      sessionId: `workbuddy-${clone.id}`,
      replyTarget: clone.id,
      workingDir: "",
      transportState: transport.state,
      transportSummary: transport.statusSummary,
      provider: transport.providerLabel || "WorkBuddy"
    }
  });
  setWorkbenchOpen(true);

  if (transport.state !== "cute") {
    pushState(
      normalizeEventPayload({
        status: "alert",
        message: "WorkBuddy 还没接好。",
        ttlMs: 4200,
        interruptLevel: "critical",
        source: "workbuddy-setup"
      })
    );
  }

  if (fallbackMessage) {
    recordChatMessage(fallbackMessage, { persist: true });
  }
}

function deliverAssistantMessage(message, options = {}) {
  const normalized = normalizeChatMessage(message, "assistant");

  if (!normalized) {
    return null;
  }

  const wasAdded = recordChatMessage(normalized, {
    persist: options.persist !== false
  });

  if (wasAdded) {
    handleAssistantMessage(normalized, {
      notify: options.notify !== false,
      revealArtifact: options.revealArtifact !== false
    });
  }

  return normalized;
}

function buildCuteModeReplyText(message, clone) {
  const snippets = [
    `${clone.name} 现在是卖萌模式。我先陪你，不往云上发一句。`,
    `你刚才说的我收下了，但现在还是 Cute Mode。真要开工，去工作台接上 API。`,
    `${clone.name} 在，本地待着呢。要切成 WorkBuddy，再把 API key 接上。`
  ];
  const cleanText = String(message.text || "").trim();
  const index = cleanText.length % snippets.length;
  return snippets[index];
}

function emitCuteModeReply(message, clone) {
  return deliverAssistantMessage({
    role: "assistant",
    text: buildCuteModeReplyText(message, clone),
    status: "done",
    createdAt: Date.now(),
    source: "cute-mode",
    channel: "local-only",
    senderId: "cute-mode",
    cloneId: clone.id,
    cloneName: clone.name,
    chatId: message.chatId
  });
}

function buildSharedContextBlock() {
  if (!preferenceState.shareLocalContext) {
    return "";
  }

  const ambientLines = Array.isArray(contextState.ambient)
    ? contextState.ambient
        .slice(-3)
        .map((item) => {
          const title = sanitizeExplicitSharedText(item.title || item.source || "ambient");
          const message = sanitizeExplicitSharedText(item.message || "");

          if (!title && !message) {
            return "";
          }

          return title && message
            ? `${title}: ${message}`
            : title || message;
        })
        .filter(Boolean)
    : [];
  const sections = [];

  const sanitizedIntentSummary = sanitizeExplicitSharedText(contextState.intent?.summary || "");

  if (sanitizedIntentSummary) {
    sections.push(`当前意图：${sanitizedIntentSummary}`);
  }

  if (ambientLines.length > 0) {
    sections.push(`显式共享环境提示：\n- ${ambientLines.join("\n- ")}`);
  }

  return sections.join("\n\n").trim();
}

function buildWorkbuddySystemPrompt(message, turnEnvelope) {
  const clone = turnEnvelope.clone;
  const explicitContext = buildSharedContextBlock();
  const sections = [
    clone.promptPrefix,
    "你现在运行在用户自己的桌面 WorkBuddy 应用里。",
    "隐私规则：除非下面明确附带了“显式共享上下文”，否则你不知道任何本机文件、仓库、窗口、剪贴板、环境变量、路径、命令输出或历史聊天之外的本地信息。",
    "如果信息不够，就明确说信息不够，不要假装见过用户电脑里的内容。"
  ];

  if (explicitContext) {
    sections.push(`显式共享上下文（已做本地脱敏）：\n${explicitContext}`);
  } else {
    sections.push("显式共享上下文：无。只根据用户当前输入回复。");
  }

  return sections.join("\n\n");
}

async function runWorkbuddyTurn(message, turnEnvelope) {
  const transport = getWorkbuddyTransportState();
  const apiKey = readSecret(workbuddySecretFilePath, "workbuddyApiKey");

  if (!transport.ready || !apiKey) {
    throw new Error(transport.statusSummary);
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, 45_000);

  try {
    const result = await sendWorkbuddyChat({
      apiStyle: preferenceState.workbuddyApiStyle,
      apiUrl: preferenceState.workbuddyApiUrl,
      apiKey,
      model: preferenceState.workbuddyModel,
      systemPrompt: buildWorkbuddySystemPrompt(message, turnEnvelope),
      userMessage: message.text,
      signal: controller.signal
    });
    const finishedAt = Date.now();

    mergeContextPatch({
      mode: "cooldown",
      presence: `${turnEnvelope.clone.name} 已经通过 ${transport.providerLabel} 回包`,
      tool: {
        name: transport.providerLabel || "WorkBuddy",
        target: `${preferenceState.workbuddyModel || "model"} · ${result.apiStyle || transport.apiStyle || "openai-chat"}`,
        detail: "这次回包只使用了用户当前输入和显式共享的上下文。",
        status: "done"
      },
      session: {
        channel: "direct-api",
        sessionId: turnEnvelope.sessionId,
        replyTarget: turnEnvelope.replyTo,
        workingDir: "",
        transportState: transport.state,
        transportSummary: transport.statusSummary,
        provider: transport.providerLabel || "WorkBuddy",
        model: preferenceState.workbuddyModel || "",
        runId: typeof result?.payload?.id === "string" ? result.payload.id : contextState.session.runId,
        durationMs: finishedAt - startedAt,
        lastActiveAt: finishedAt
      }
    });

    return {
      assistantMessage: normalizeChatMessage({
        role: "assistant",
        text: result.assistantText,
        status: "done",
        createdAt: finishedAt,
        source: "workbuddy-api",
        channel: "direct-api",
        senderId: "workbuddy",
        cloneId: turnEnvelope.clone.id,
        cloneName: turnEnvelope.clone.name,
        chatId: message.chatId
      }, "assistant")
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("WorkBuddy API 超时了。");
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function runConfiguredTurn(message, turnEnvelope) {
  if (preferenceState.assistantMode === "workbuddy") {
    return runWorkbuddyTurn(message, turnEnvelope);
  }

  return runOpenClawTurn(message, turnEnvelope);
}

function runOpenClawTurn(message, turnEnvelope) {
  return new Promise((resolve, reject) => {
    const launch = resolveOpenClawLaunch(preferenceState, {
      agentId: turnEnvelope.agentId,
      sessionId: turnEnvelope.sessionId,
      messageText: turnEnvelope.promptText,
      replyTo: turnEnvelope.replyTo
    });

    if (!launch.transport.ready || !launch.command) {
      reject(new Error(launch.transport.statusSummary));
      return;
    }

    const child = spawn(launch.command, launch.args, {
      cwd: launch.cwd,
      env: process.env
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        const parsed = parseAgentRun(stdout);

        if (parsed) {
          applyAgentRunMeta(parsed, turnEnvelope);
        }

        resolve({ stdout, stderr, parsed });
        return;
      }

      reject(
        new Error(
          stderr.trim() || stdout.trim() || `openclaw agent exited with code ${code}`
        )
      );
    });
  });
}

function dispatchTurn(message) {
  const turnEnvelope = buildCloneTurnEnvelope(message);
  const laneKey = getTurnLaneKey(turnEnvelope);
  const turnTool = buildTurnToolDescriptor(turnEnvelope);
  const laneBefore = readTurnLaneSnapshot(laneKey);
  const queueAhead = (Number(laneBefore.queued) || 0) + (Number(laneBefore.active) || 0);
  markTurnLaneQueued(laneKey);
  const backlogAfterQueue = syncCloneTurnBacklog(turnEnvelope.clone.id);

  if (!isMainActor(turnEnvelope.clone.id)) {
    ensureCloneSpawned(turnEnvelope.clone.id, {
      sourceActorId: CLONE_PROFILES[0].id,
      mode: "pull"
    });
  }

  appendJsonLine(chatOutboxFilePath, message);
  setDrawerOpen(true);
  patchCloneState(turnEnvelope.clone.id, {
    status: "thinking",
    lastTask: message.text,
    lastRunAt: Date.now()
  });
  mergeContextPatch({
    mode: "acting",
    presence: queueAhead > 0 ? `${turnEnvelope.clone.name} 已排队，等自己的 lane` : `${turnEnvelope.clone.name} 已经上工`,
    intent: buildIntentPreview(message.text, "acting"),
    approval: getVisiblePendingApproval(),
    tool: {
      name: turnTool.name,
      target: turnTool.target,
      detail: buildTurnQueueDetail(turnEnvelope.clone, backlogAfterQueue, queueAhead),
      status: "active"
    }
  });
  pushState(
    normalizeEventPayload({
      status: "thinking",
      message: queueAhead > 0 ? `${turnEnvelope.clone.name} 排上了。` : `${turnEnvelope.clone.name} 在盯。`,
      ttlMs: 3000,
      source: "chat-input"
    })
  );

  const previousChain = cloneTurnChains.get(laneKey) || Promise.resolve();
  const nextChain = previousChain
    .catch(() => undefined)
    .then(async () => {
      const activeLane = markTurnLaneStarted(laneKey);
      const backlogAtStart = syncCloneTurnBacklog(turnEnvelope.clone.id);
      let diffSnapshot = getCloneProfile(turnEnvelope.clone.id).diff;
      let runError = null;

      patchCloneState(turnEnvelope.clone.id, {
        status: "thinking",
        lastRunAt: Date.now(),
        queuedTurns: backlogAtStart.queued,
        activeTurns: backlogAtStart.active
      });
      mergeContextPatch({
        mode: "acting",
        presence: `${turnEnvelope.clone.name} 已经上工`,
        tool: {
          name: turnTool.name,
          target: turnTool.target,
          detail: buildTurnQueueDetail(turnEnvelope.clone, backlogAtStart, 0),
          status: "active"
        }
      });

      const diffSnapshotPayload = shouldCaptureDiffSnapshot(turnEnvelope.clone.id)
        ? createDiffSnapshotPayload()
        : null;
      const baseSnapshot = diffSnapshotPayload
        ? await captureCloneBaseSnapshotInWorker(diffSnapshotPayload).catch((error) => {
          console.error(`Failed to capture base diff snapshot for ${turnEnvelope.clone.id}:`, error);
          return null;
        })
        : null;

      try {
        const turnResult = await runConfiguredTurn(message, turnEnvelope);

        if (turnResult?.assistantMessage) {
          deliverAssistantMessage(turnResult.assistantMessage, {
            persist: true,
            notify: true,
            revealArtifact: true
          });
        }
      } catch (error) {
        runError = error;
      } finally {
        markTurnLaneSettled(laneKey);
        const backlogAfterRun = syncCloneTurnBacklog(turnEnvelope.clone.id);

        if (runError) {
          handleRunFailure(runError, turnEnvelope, {
            queuedAfter: backlogAfterRun.total
          });
          throw runError;
        }

        patchCloneState(turnEnvelope.clone.id, {
          status: backlogAfterRun.total > 0 ? "thinking" : "done",
          lastRunAt: Date.now(),
          diff: diffSnapshot,
          queuedTurns: backlogAfterRun.queued,
          activeTurns: backlogAfterRun.active
        });

        if (baseSnapshot && diffSnapshotPayload) {
          scheduleCloneDiffSnapshotUpdate(turnEnvelope.clone.id, baseSnapshot, diffSnapshotPayload);
        }

        if (backlogAfterRun.total > 0) {
          mergeContextPatch({
            mode: "acting",
            tool: {
              name: turnTool.name,
              target: turnTool.target,
              detail: `${turnEnvelope.clone.name} 这条刚落地，lane 里后面还有 ${backlogAfterRun.total} 条。`,
              status: "active"
            }
          });
        } else {
          setSelectedDiffClone(turnEnvelope.clone.id);
        }
      }
    });

  cloneTurnChains.set(
    laneKey,
    nextChain.finally(() => {
      const lane = turnLaneState.get(laneKey);

      if (!lane || (!lane.active && !lane.queued)) {
        cloneTurnChains.delete(laneKey);
      }
    })
  );
}

function enqueueOutgoingChatMessage(text, requestedCloneId) {
  const clone = getCloneProfile(inferTaskCloneId(text, requestedCloneId || cloneState.activeCloneId));
  const taskCategory = resolveTaskCategory(text);
  const message = normalizeChatMessage(
    {
      role: "user",
      text,
      status: "thinking",
      source: "shell",
      senderId: "owner",
      cloneId: clone.id,
      cloneName: clone.name,
      chatId: makeReplyTarget(clone.id)
    },
    "user"
  );

  if (!message) {
    return null;
  }

  lastIdleCompanionAt = Date.now();
  setActiveClone(clone.id);
  updateMemoryState((current) => ({
    ...current,
    totalTurns: current.totalTurns + 1,
    cloneUsage: {
      ...current.cloneUsage,
      [clone.id]: (Number(current.cloneUsage[clone.id]) || 0) + 1
    },
    taskCategoryUsage: {
      ...current.taskCategoryUsage,
      [taskCategory]: {
        ...(current.taskCategoryUsage?.[taskCategory] || {}),
        [clone.id]: (Number(current.taskCategoryUsage?.[taskCategory]?.[clone.id]) || 0) + 1
      }
    },
    preferredCloneId: clone.id,
    lastTaskCategory: taskCategory,
    lastUserMessage: truncateText(message.text, 120)
  }));
  recordChatMessage(message, { persist: true });
  setDrawerOpen(true);
  mergeContextPatch({
    mode: "planning",
    presence: `${clone.name} 在读你的委托`,
    intent: buildIntentPreview(message.text, "planning")
  });
  syncOpenClawRuntimeContext(clone.id);

  if (preferenceState.assistantMode === "cute") {
    emitCuteModeReply(message, clone);
    return message;
  }

  if (preferenceState.assistantMode === "workbuddy" && !getWorkbuddyTransportState().ready) {
    handleUnavailableWorkbuddyTransport(message, clone);
    return message;
  }

  if (preferenceState.assistantMode !== "workbuddy" && !getOpenClawTransportState().ready) {
    handleUnavailableOpenClawTransport(message, clone);
    return message;
  }

  const turnEnvelope = buildCloneTurnEnvelope(message);
  const actionProfile = buildTurnActionProfile(message);

  if (actionProfile.requiresApproval) {
    const approval = createApprovalRequest(message, turnEnvelope, actionProfile);
    rememberPendingApprovalTurn(approval, turnEnvelope, message);
    mergeContextPatch({
      mode: "approval",
      presence: "holding a risky ask",
      approval,
      tool: null,
      intent: buildIntentPreview(message.text, "approval")
    });
    setWorkbenchOpen(true);
    pushState(
      normalizeEventPayload({
        status: "alert",
        message: "这步风险高，我先不直接跑。",
        ttlMs: 4200,
        interruptLevel: "critical",
        source: "approval-gate"
      })
    );
    const note = createSystemMessage("高风险动作先拦住了。你可以在工作台里直接批准或拒绝。", "alert");

    if (note) {
      recordChatMessage(note, { persist: true });
    }

    return message;
  }

  dispatchTurn(message);
  return message;
}

function approvePendingTurn(approvalId) {
  const pending = pendingApprovalTurns.get(approvalId);

  if (!pending) {
    return { ok: false };
  }

  appendApprovalDecision(approvalId, "approved", pending.message.text);
  const approvalNote = createSystemMessage("行，这步你批了，我现在开跑。", "thinking");

  if (approvalNote) {
    recordChatMessage(approvalNote, { persist: true });
  }

  forgetPendingApprovalTurn(approvalId);
  syncPendingApprovalContext({
    fallbackMode: "planning",
    fallbackPresence: "approval landed; moving",
    fallbackIntent: buildIntentPreview(pending.message.text, "planning"),
    keepWorkbenchOpen: pendingApprovalOrder.length > 0
  });
  dispatchTurn(pending.message);
  return { ok: true };
}

function rejectPendingTurn(approvalId) {
  const pending = pendingApprovalTurns.get(approvalId);

  if (!pending) {
    return { ok: false };
  }

  appendApprovalDecision(approvalId, "rejected", pending.message.text);
  const rejectNote = createSystemMessage("这条我先没跑，等你改口或者重发。", "alert");

  if (rejectNote) {
    recordChatMessage(rejectNote, { persist: true });
  }

  forgetPendingApprovalTurn(approvalId);
  syncPendingApprovalContext({
    fallbackMode: "ambient",
    fallbackPresence: "approval denied; holding position",
    fallbackIntent: contextState.intent,
    keepWorkbenchOpen: pendingApprovalOrder.length > 0
  });
  pushState(
    normalizeEventPayload({
      status: "idle",
      message: "先不动，等你下一句。",
      ttlMs: 3200,
      interruptLevel: "critical",
      source: "approval-gate"
    })
  );
  return { ok: true };
}

function clearArtifact() {
  const hasPendingApproval = Boolean(contextState.approval);

  mergeContextPatch({
    artifact: null,
    mode: hasPendingApproval ? "approval" : "ambient",
    presence: hasPendingApproval ? contextState.presence : "back to ambient watch"
  });

  if (uiState.workbenchOpen && !hasPendingApproval) {
    setWorkbenchOpen(false);
  }
}

function parseRendererView(urlString = "") {
  try {
    const parsedUrl = new URL(urlString);
    const cloneId = parsedUrl.searchParams.get("cloneId") || CLONE_PROFILES[0].id;

    return {
      cloneId,
      mini: parsedUrl.searchParams.get("mini") === "1"
    };
  } catch {
    return {
      cloneId: CLONE_PROFILES[0].id,
      mini: false
    };
  }
}

ipcMain.handle("pet:get-bootstrap-state", (event) => {
  const view = parseRendererView(event.senderFrame?.url || event.sender?.getURL?.() || "");

  return {
    petState,
    ui: uiState,
    motion: view.mini ? getCloneActor(view.cloneId).motion : motionState,
    context: contextState,
    memory: buildMemorySnapshot(),
    preferences: buildClientPreferenceState(),
    identity: workspaceProfile,
    view,
    clones: {
      activeCloneId: cloneState.activeCloneId,
      selectedDiffCloneId: cloneState.selectedDiffCloneId,
      clones: cloneState.clones.map(({ promptPrefix, ...clone }) => clone)
    },
    chat: {
      messages: chatState.messages
    },
    runtimeFiles: {
      event: eventFilePath,
      outbox: chatOutboxFilePath,
      inbox: chatInboxFilePath,
      transcript: chatTranscriptFilePath,
      context: shellContextFilePath,
      ambient: ambientFeedFilePath,
      reminders: reminderFeedFilePath,
      approvals: approvalResponsesFilePath,
      memory: memoryFilePath
    }
  };
});

ipcMain.on("pet:set-state", (_event, payload) => {
  pushState(
    normalizeEventPayload({
      ...payload,
      source: "renderer"
    })
  );
});

ipcMain.handle("pet:send-chat", (_event, payload) => {
  const text = typeof payload?.text === "string" ? payload.text : "";
  const cloneId = typeof payload?.cloneId === "string" ? payload.cloneId : cloneState.activeCloneId;
  return enqueueOutgoingChatMessage(text, cloneId);
});

ipcMain.handle("pet:set-clone", (_event, payload) => {
  setActiveClone(payload?.cloneId);

  return {
    activeCloneId: cloneState.activeCloneId,
    selectedDiffCloneId: cloneState.selectedDiffCloneId,
    clones: cloneState.clones.map(({ promptPrefix, ...clone }) => clone)
  };
});

ipcMain.handle("pet:set-eco-mode", (_event, payload) => {
  setEcoMode(payload?.enabled);
  return uiState;
});

ipcMain.handle("pet:set-avatar-mode", (_event, payload) => {
  setAvatarMode(payload?.mode);
  return uiState;
});

ipcMain.handle("pet:set-diff-open", (_event, payload) => {
  setDiffOpen(payload?.open, payload?.cloneId);

  return {
    ui: uiState,
    clones: {
      activeCloneId: cloneState.activeCloneId,
      selectedDiffCloneId: cloneState.selectedDiffCloneId,
      clones: cloneState.clones.map(({ promptPrefix, ...clone }) => clone)
    }
  };
});

ipcMain.handle("pet:update-preferences", (_event, payload) => {
  updatePreferenceState(payload || {});
  return buildClientPreferenceState();
});

ipcMain.handle("pet:save-workbuddy-secret", (_event, payload) => {
  const apiKey = typeof payload?.apiKey === "string" ? payload.apiKey : "";
  writeSecret(workbuddySecretFilePath, "workbuddyApiKey", apiKey);
  syncOpenClawRuntimeContext(cloneState.activeCloneId);
  broadcastPreferenceState();
  return buildClientPreferenceState();
});

ipcMain.handle("pet:clear-workbuddy-secret", () => {
  clearSecret(workbuddySecretFilePath, "workbuddyApiKey");
  syncOpenClawRuntimeContext(cloneState.activeCloneId);
  broadcastPreferenceState();
  return buildClientPreferenceState();
});

ipcMain.handle("pet:import-custom-pet-image", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      {
        name: "Images",
        extensions: ["png", "jpg", "jpeg", "webp", "gif"]
      }
    ]
  });

  if (result.canceled || !Array.isArray(result.filePaths) || result.filePaths.length === 0) {
    return buildClientPreferenceState();
  }

  const importedPath = copyCustomPetImageToRuntime(result.filePaths[0]);

  if (!importedPath) {
    return buildClientPreferenceState();
  }

  updatePreferenceState({
    customPetImagePath: importedPath,
    customPetImageVersion: Date.now(),
    onboardingCompleted: true
  });

  if (preferenceState.assistantMode === "cute") {
    setAvatarMode("custom");
  }

  return buildClientPreferenceState();
});

ipcMain.handle("pet:clear-custom-pet-image", () => {
  updatePreferenceState({
    customPetImagePath: "",
    customPetImageVersion: Date.now()
  });

  if (uiState.avatarMode === "custom") {
    setAvatarMode("cat");
  }

  return buildClientPreferenceState();
});

ipcMain.on("pet:set-panels", (_event, payload) => {
  if (typeof payload?.workbenchOpen === "boolean") {
    setWorkbenchOpen(payload.workbenchOpen);
    return;
  }

  if (typeof payload?.drawerOpen === "boolean") {
    setDrawerOpen(payload.drawerOpen);
  }
});

ipcMain.on("pet:set-interactive", (_event, payload) => {
  const cloneId = typeof payload?.cloneId === "string" ? getCloneProfile(payload.cloneId).id : "";

  if (cloneId && !isMainActor(cloneId)) {
    setCloneInteractive(cloneId, payload?.interactive);
    return;
  }

  setInteractive(payload?.interactive);
});

ipcMain.on("pet:begin-window-drag", (_event, payload) => {
  beginWindowDrag(payload);
});

ipcMain.on("pet:update-window-drag", (_event, payload) => {
  updateWindowDrag(payload);
});

ipcMain.on("pet:end-window-drag", (_event, payload) => {
  endWindowDrag(payload);
});

ipcMain.on("pet:begin-chat-resize", (_event, payload) => {
  beginChatResize(payload);
});

ipcMain.on("pet:update-chat-resize", (_event, payload) => {
  updateChatResize(payload);
});

ipcMain.on("pet:end-chat-resize", (_event, payload) => {
  endChatResize(payload);
});

ipcMain.handle("pet:approve-request", (_event, payload) => {
  return approvePendingTurn(payload?.approvalId);
});

ipcMain.handle("pet:reject-request", (_event, payload) => {
  return rejectPendingTurn(payload?.approvalId);
});

ipcMain.on("pet:clear-artifact", () => {
  clearArtifact();
});

app.whenReady().then(() => {
  ensureRuntimeFiles();
  refreshWorkspaceContext();
  loadTranscript();
  bootstrapRuntimeHistory();
  createWindows();
  createTray();
  startPolling();

  if (!preferenceState.onboardingCompleted) {
    setWorkbenchOpen(true);
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  clearPetDragLoop();
  petDragState = null;

  if (eventPollTimer) {
    clearInterval(eventPollTimer);
  }

  if (runtimePollTimer) {
    clearInterval(runtimePollTimer);
  }

  if (systemPollTimer) {
    clearInterval(systemPollTimer);
  }

  if (frontWindowPollTimer) {
    clearInterval(frontWindowPollTimer);
    frontWindowPollTimer = null;
  }

  if (cloneRoamTimer) {
    clearInterval(cloneRoamTimer);
    cloneRoamTimer = null;
  }

  cloneDragStates.clear();
});

app.on("activate", () => {
  if (!petWindow) {
    createWindows();
  } else {
    petWindow.show();
    placeCloneWindows();
    for (const profile of getSecondaryCloneProfiles()) {
      const windowRef = getCloneWindow(profile.id);

      if (!windowRef) {
        continue;
      }

      setCloneInteractive(profile.id, false);

      if (getCloneActor(profile.id).spawned) {
        windowRef.showInactive();
      } else {
        windowRef.hide();
      }
    }

    if (uiState.drawerOpen) {
      const nextChatWindow = ensureChatWindow();

      if (nextChatWindow && !nextChatWindow.isDestroyed()) {
        placeChatWindow();
        nextChatWindow.showInactive();
      }
    }
  }
});
