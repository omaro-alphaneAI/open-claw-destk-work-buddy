const OPENCLAW_FIELD_LABELS = Object.freeze({
  openClawCommand: "OpenClaw 命令",
  openClawReplyChannel: "回包通道"
});

const DEFAULT_OPENCLAW_CONFIG = Object.freeze({
  openClawEnabled: false,
  openClawCommand: "",
  openClawWorkingDir: "",
  openClawReplyChannel: "",
  openClawReplyToPrefix: "desktop-pet",
  openClawSessionPrefix: "desktop-pet",
  openClawDefaultAgentId: "main"
});
const OPENCLAW_CLI_FLAGS = Object.freeze({
  sessionId: ["--session", "id"].join("-"),
  replyChannel: ["--reply", "channel"].join("-"),
  replyTo: ["--reply", "to"].join("-")
});

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createDefaultOpenClawConfig() {
  return {
    ...DEFAULT_OPENCLAW_CONFIG
  };
}

function normalizeOpenClawPreferences(input = {}, defaults = createDefaultOpenClawConfig()) {
  return {
    openClawEnabled: typeof input.openClawEnabled === "boolean"
      ? input.openClawEnabled
      : defaults.openClawEnabled,
    openClawCommand: cleanString(input.openClawCommand),
    openClawWorkingDir: cleanString(input.openClawWorkingDir),
    openClawReplyChannel: cleanString(input.openClawReplyChannel),
    openClawReplyToPrefix: cleanString(input.openClawReplyToPrefix) || defaults.openClawReplyToPrefix,
    openClawSessionPrefix: cleanString(input.openClawSessionPrefix) || defaults.openClawSessionPrefix,
    openClawDefaultAgentId: cleanString(input.openClawDefaultAgentId) || defaults.openClawDefaultAgentId
  };
}

function getOpenClawTransport(preferences = {}) {
  const config = normalizeOpenClawPreferences(preferences);
  const missingFields = [];

  if (config.openClawEnabled) {
    if (!config.openClawCommand) {
      missingFields.push("openClawCommand");
    }

    if (!config.openClawReplyChannel) {
      missingFields.push("openClawReplyChannel");
    }
  }

  const state = !config.openClawEnabled
    ? "disabled"
    : missingFields.length > 0
      ? "misconfigured"
      : "ready";
  const missingFieldLabels = missingFields.map((field) => OPENCLAW_FIELD_LABELS[field] || field);
  const statusLabel = state === "ready"
    ? "已就绪"
    : state === "misconfigured"
      ? "缺配置"
      : "未连接";
  const statusSummary = state === "ready"
    ? `OpenClaw 已就绪，将通过 ${config.openClawCommand} 把回包送到 ${config.openClawReplyChannel}。`
    : state === "misconfigured"
      ? `OpenClaw 配置还没补齐：缺少 ${missingFieldLabels.join("、")}。`
      : "OpenClaw 当前未启用；桌宠本地提醒、工作台和运行时文件仍可正常工作。";

  return {
    enabled: config.openClawEnabled,
    ready: state === "ready",
    state,
    statusLabel,
    statusSummary,
    missingFields,
    missingFieldLabels,
    command: config.openClawCommand,
    workingDir: config.openClawWorkingDir,
    replyChannel: config.openClawReplyChannel,
    replyToPrefix: config.openClawReplyToPrefix,
    sessionPrefix: config.openClawSessionPrefix,
    defaultAgentId: config.openClawDefaultAgentId
  };
}

function buildReplyTarget(prefix, cloneId) {
  const cleanPrefix = cleanString(prefix) || DEFAULT_OPENCLAW_CONFIG.openClawReplyToPrefix;
  const cleanCloneId = cleanString(cloneId) || "main-cat";

  return `${cleanPrefix}-${cleanCloneId}`;
}

function buildSessionId(prefix, cloneId) {
  const cleanPrefix = cleanString(prefix) || DEFAULT_OPENCLAW_CONFIG.openClawSessionPrefix;
  const cleanCloneId = cleanString(cloneId) || "main-cat";

  return `${cleanPrefix}-${cleanCloneId}`;
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function inferCloneIdFromReplyTarget(chatId, prefix) {
  const cleanChatId = cleanString(chatId);

  if (!cleanChatId) {
    return "";
  }

  const cleanPrefix = cleanString(prefix) || DEFAULT_OPENCLAW_CONFIG.openClawReplyToPrefix;
  const match = cleanChatId.match(new RegExp(`^${escapeRegex(cleanPrefix)}-([a-z0-9-]+)$`, "i"));

  return match?.[1] || "";
}

function resolveOpenClawLaunch(preferences, turnOptions = {}) {
  const transport = getOpenClawTransport(preferences);

  return {
    transport,
    command: transport.command,
    cwd: transport.workingDir || undefined,
    args: [
      "agent",
      "--agent",
      cleanString(turnOptions.agentId) || transport.defaultAgentId || "main",
      OPENCLAW_CLI_FLAGS.sessionId,
      cleanString(turnOptions.sessionId),
      "--message",
      cleanString(turnOptions.messageText),
      "--deliver",
      OPENCLAW_CLI_FLAGS.replyChannel,
      transport.replyChannel,
      OPENCLAW_CLI_FLAGS.replyTo,
      cleanString(turnOptions.replyTo),
      "--json"
    ]
  };
}

module.exports = {
  OPENCLAW_CLI_FLAGS,
  createDefaultOpenClawConfig,
  normalizeOpenClawPreferences,
  getOpenClawTransport,
  buildReplyTarget,
  buildSessionId,
  inferCloneIdFromReplyTarget,
  resolveOpenClawLaunch
};
