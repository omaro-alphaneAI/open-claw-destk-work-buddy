const fs = require("fs");
const {
  ACTIVITY_LEVEL_OPTIONS,
  DEFAULT_ACTIVITY_LEVEL,
  isValidActivityLevel
} = require("./pet-activity");
const {
  createDefaultOpenClawConfig,
  normalizeOpenClawPreferences
} = require("./openclaw-runtime");
const {
  createDefaultWorkbuddyConfig,
  normalizeWorkbuddyPreferences
} = require("./workbuddy-runtime");

function createDefaultPreferenceState() {
  return {
    quietMode: false,
    voiceEnabled: false,
    bubbleTtlMs: 3600,
    longReplyThreshold: 140,
    idleCompanionAfterMs: 45 * 60 * 1000,
    uiScale: 0.88,
    drawerWidth: 0,
    drawerHeight: 0,
    activityLevel: DEFAULT_ACTIVITY_LEVEL,
    ...createDefaultOpenClawConfig(),
    ...createDefaultWorkbuddyConfig(),
    lastUpdatedAt: 0
  };
}

function normalizePreferencePatch(input = {}) {
  const defaults = createDefaultPreferenceState();
  const openClawPreferences = normalizeOpenClawPreferences(input, defaults);
  const workbuddyPreferences = normalizeWorkbuddyPreferences(input, defaults);
  const activityLevel = typeof input.activityLevel === "string" && isValidActivityLevel(input.activityLevel.trim())
    ? input.activityLevel.trim()
    : defaults.activityLevel;

  return {
    quietMode: typeof input.quietMode === "boolean" ? input.quietMode : defaults.quietMode,
    voiceEnabled: typeof input.voiceEnabled === "boolean" ? input.voiceEnabled : defaults.voiceEnabled,
    bubbleTtlMs: Number.isFinite(Number(input.bubbleTtlMs))
      ? Math.max(1200, Math.min(12000, Number(input.bubbleTtlMs)))
      : defaults.bubbleTtlMs,
    longReplyThreshold: Number.isFinite(Number(input.longReplyThreshold))
      ? Math.max(80, Math.min(320, Number(input.longReplyThreshold)))
      : defaults.longReplyThreshold,
    idleCompanionAfterMs: Number.isFinite(Number(input.idleCompanionAfterMs))
      ? Math.max(10 * 60 * 1000, Math.min(6 * 60 * 60 * 1000, Number(input.idleCompanionAfterMs)))
      : defaults.idleCompanionAfterMs,
    uiScale: Number.isFinite(Number(input.uiScale))
      ? Math.max(0.72, Math.min(1.08, Number(input.uiScale)))
      : defaults.uiScale,
    drawerWidth: Number.isFinite(Number(input.drawerWidth))
      ? Math.max(0, Math.min(960, Math.round(Number(input.drawerWidth))))
      : defaults.drawerWidth,
    drawerHeight: Number.isFinite(Number(input.drawerHeight))
      ? Math.max(0, Math.min(1080, Math.round(Number(input.drawerHeight))))
      : defaults.drawerHeight,
    activityLevel,
    ...openClawPreferences,
    ...workbuddyPreferences,
    lastUpdatedAt: Number.isFinite(Number(input.lastUpdatedAt))
      ? Number(input.lastUpdatedAt)
      : Date.now()
  };
}

function readPreferenceStateFromFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return normalizePreferencePatch(JSON.parse(raw));
  } catch {
    return createDefaultPreferenceState();
  }
}

function writePreferenceStateToFile(filePath, preferenceState) {
  fs.writeFileSync(
    filePath,
    `${JSON.stringify(preferenceState, null, 2)}\n`,
    "utf8"
  );
}

module.exports = {
  ACTIVITY_LEVEL_OPTIONS,
  createDefaultPreferenceState,
  normalizePreferencePatch,
  readPreferenceStateFromFile,
  writePreferenceStateToFile
};
