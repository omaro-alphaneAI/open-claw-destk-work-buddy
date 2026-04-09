const {
  evaluateWorkbuddyApiUrl,
  normalizeApiUrl
} = require("./workbuddy-provider");

const VALID_ASSISTANT_MODES = new Set(["cute", "workbuddy"]);
const VALID_WORKBUDDY_API_STYLES = new Set(["auto", "openai-chat", "openai-responses"]);

const DEFAULT_WORKBUDDY_CONFIG = Object.freeze({
  onboardingCompleted: false,
  assistantMode: "cute",
  workbuddyProviderLabel: "龙虾 WorkBuddy",
  workbuddyApiStyle: "auto",
  workbuddyApiUrl: "",
  workbuddyModel: "",
  shareLocalContext: false,
  allowFrontWindowTracking: false,
  allowDiffMonitor: false,
  customPetImagePath: "",
  customPetImageVersion: 0
});

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function createDefaultWorkbuddyConfig() {
  return {
    ...DEFAULT_WORKBUDDY_CONFIG
  };
}

function normalizeWorkbuddyPreferences(input = {}, defaults = createDefaultWorkbuddyConfig()) {
  const assistantMode = cleanString(input.assistantMode);
  const apiStyle = cleanString(input.workbuddyApiStyle);

  return {
    onboardingCompleted: typeof input.onboardingCompleted === "boolean"
      ? input.onboardingCompleted
      : defaults.onboardingCompleted,
    assistantMode: VALID_ASSISTANT_MODES.has(assistantMode)
      ? assistantMode
      : defaults.assistantMode,
    workbuddyProviderLabel: cleanString(input.workbuddyProviderLabel) || defaults.workbuddyProviderLabel,
    workbuddyApiStyle: VALID_WORKBUDDY_API_STYLES.has(apiStyle)
      ? apiStyle
      : defaults.workbuddyApiStyle,
    workbuddyApiUrl: normalizeApiUrl(cleanString(input.workbuddyApiUrl)),
    workbuddyModel: cleanString(input.workbuddyModel),
    shareLocalContext: typeof input.shareLocalContext === "boolean"
      ? input.shareLocalContext
      : defaults.shareLocalContext,
    allowFrontWindowTracking: typeof input.allowFrontWindowTracking === "boolean"
      ? input.allowFrontWindowTracking
      : defaults.allowFrontWindowTracking,
    allowDiffMonitor: typeof input.allowDiffMonitor === "boolean"
      ? input.allowDiffMonitor
      : defaults.allowDiffMonitor,
    customPetImagePath: cleanString(input.customPetImagePath),
    customPetImageVersion: Number.isFinite(Number(input.customPetImageVersion))
      ? Math.max(0, Number(input.customPetImageVersion))
      : defaults.customPetImageVersion
  };
}

function getWorkbuddyTransport(preferences = {}, secretMeta = {}) {
  const config = normalizeWorkbuddyPreferences(preferences);
  const hasSecret = secretMeta?.configured === true;
  const missingFields = [];
  const blockedReasons = [];
  const endpointSecurity = evaluateWorkbuddyApiUrl(config.workbuddyApiUrl);

  if (config.assistantMode === "workbuddy") {
    if (!endpointSecurity.configured) {
      missingFields.push("API URL");
    } else if (!endpointSecurity.safe) {
      blockedReasons.push(endpointSecurity.summary);
    }

    if (!config.workbuddyModel) {
      missingFields.push("模型名");
    }

    if (!hasSecret) {
      missingFields.push("API key");
    }
  }

  const state = config.assistantMode === "cute"
    ? "cute"
    : blockedReasons.length > 0
      ? "blocked"
    : missingFields.length > 0
      ? "misconfigured"
      : "ready";
  const statusLabel = state === "ready"
    ? "已连接"
    : state === "blocked"
      ? "已拦截"
    : state === "misconfigured"
      ? "缺配置"
      : "卖萌中";
  const statusSummary = state === "ready"
    ? `${config.workbuddyProviderLabel} 已连接。${endpointSecurity.summary} 默认只发送你明确输入的内容；显式共享的上下文会先做本地脱敏。`
    : state === "blocked"
      ? `${config.workbuddyProviderLabel} 已拦截当前配置：${blockedReasons.join("；")}`
    : state === "misconfigured"
      ? `${config.workbuddyProviderLabel} 还没接好：缺少 ${missingFields.join("、")}。`
      : "当前是 Cute Mode。桌宠只在本机卖萌，不会发任何云端请求。";

  return {
    mode: config.assistantMode,
    ready: state === "ready",
    state,
    statusLabel,
    statusSummary,
    providerLabel: config.workbuddyProviderLabel,
    apiStyle: config.workbuddyApiStyle,
    apiUrl: config.workbuddyApiUrl,
    normalizedApiUrl: endpointSecurity.normalizedUrl,
    model: config.workbuddyModel,
    shareLocalContext: config.shareLocalContext,
    allowFrontWindowTracking: config.allowFrontWindowTracking,
    allowDiffMonitor: config.allowDiffMonitor,
    missingFields,
    securityStatus: endpointSecurity.status,
    securitySummary: state === "cute"
      ? "当前没有任何 WorkBuddy 外发请求。"
      : endpointSecurity.summary,
    endpointOriginLabel: endpointSecurity.originLabel,
    blockedReasons
  };
}

module.exports = {
  createDefaultWorkbuddyConfig,
  getWorkbuddyTransport,
  normalizeWorkbuddyPreferences
};
