const LOOPBACK_HOSTNAMES = new Set(["localhost", "::1", "127.0.0.1"]);
const SENSITIVE_QUERY_PARAM_PATTERN = /^(?:api[_-]?key|access[_-]?token|auth(?:orization)?|auth[_-]?token|bearer|password|passwd|secret|signature|sig|token)$/i;
const REDACTION_PATTERNS = Object.freeze([
  {
    pattern: /\bBearer\s+[A-Za-z0-9._~+\/=-]{8,}/gi,
    replace: "Bearer <redacted-token>"
  },
  {
    pattern: /\bsk-[A-Za-z0-9_-]{8,}\b/g,
    replace: "<redacted-api-key>"
  },
  {
    pattern: /\b([A-Za-z0-9_]*(?:api[_-]?key|access[_-]?token|auth(?:orization)?|auth[_-]?token|bearer|password|passwd|secret|token|cookie|session)[A-Za-z0-9_]*)\b(\s*[:=]\s*)([^\s,;]+)/gi,
    replace: (_match, label, separator) => `${label}${separator}<redacted>`
  },
  {
    pattern: /(?:\/Users\/[^\s"'`]+|\/home\/[^\s"'`]+|~\/[^\s"'`]+|[A-Za-z]:\\Users\\[^\s"'`]+)/g,
    replace: "<local-path>"
  }
]);

function isLoopbackHostname(hostname) {
  const normalized = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/^\[(.*)\]$/, "$1");

  if (!normalized) {
    return false;
  }

  if (LOOPBACK_HOSTNAMES.has(normalized)) {
    return true;
  }

  if (normalized.endsWith(".localhost")) {
    return true;
  }

  return /^127(?:\.\d{1,3}){3}$/.test(normalized);
}

function dropSensitiveQueryParams(url) {
  const nextUrl = new URL(url.toString());

  for (const key of Array.from(nextUrl.searchParams.keys())) {
    if (SENSITIVE_QUERY_PARAM_PATTERN.test(key)) {
      nextUrl.searchParams.delete(key);
    }
  }

  return nextUrl;
}

function buildOriginLabel(url) {
  return `${url.protocol}//${url.host}`;
}

function normalizeApiUrl(input) {
  if (typeof input !== "string" || !input.trim()) {
    return "";
  }

  const trimmed = input.trim();

  try {
    const parsed = new URL(trimmed);
    parsed.username = "";
    parsed.password = "";
    return dropSensitiveQueryParams(parsed).toString();
  } catch {
    return trimmed;
  }
}

function evaluateWorkbuddyApiUrl(input) {
  const raw = typeof input === "string" ? input.trim() : "";

  if (!raw) {
    return {
      configured: false,
      valid: false,
      safe: false,
      blocked: false,
      status: "empty",
      protocol: "",
      hostname: "",
      isLocal: false,
      normalizedUrl: "",
      originLabel: "",
      summary: "还没有填写 API URL。"
    };
  }

  let parsed;

  try {
    parsed = new URL(raw);
  } catch {
    return {
      configured: true,
      valid: false,
      safe: false,
      blocked: true,
      status: "invalid",
      protocol: "",
      hostname: "",
      isLocal: false,
      normalizedUrl: raw,
      originLabel: "",
      summary: "API URL 格式不合法。"
    };
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const isLocal = isLoopbackHostname(hostname);

  if (!["https:", "http:"].includes(protocol)) {
    return {
      configured: true,
      valid: true,
      safe: false,
      blocked: true,
      status: "blocked-protocol",
      protocol,
      hostname,
      isLocal,
      normalizedUrl: normalizeApiUrl(raw),
      originLabel: buildOriginLabel(parsed),
      summary: "API URL 只允许使用 HTTPS；如果是本机调试地址，才允许使用 HTTP。"
    };
  }

  if (parsed.username || parsed.password) {
    return {
      configured: true,
      valid: true,
      safe: false,
      blocked: true,
      status: "blocked-credentials",
      protocol,
      hostname,
      isLocal,
      normalizedUrl: normalizeApiUrl(raw),
      originLabel: buildOriginLabel(parsed),
      summary: "API URL 里不允许内嵌账号或密码。API key 只能单独保存在安全存储里。"
    };
  }

  const sensitiveQueryKeys = Array.from(parsed.searchParams.keys()).filter((key) => SENSITIVE_QUERY_PARAM_PATTERN.test(key));

  if (sensitiveQueryKeys.length > 0) {
    return {
      configured: true,
      valid: true,
      safe: false,
      blocked: true,
      status: "blocked-query-secret",
      protocol,
      hostname,
      isLocal,
      normalizedUrl: normalizeApiUrl(raw),
      originLabel: buildOriginLabel(parsed),
      summary: `API URL 里不允许携带敏感查询参数：${sensitiveQueryKeys.join("、")}。API key 需要单独填写。`
    };
  }

  if (protocol === "http:" && !isLocal) {
    return {
      configured: true,
      valid: true,
      safe: false,
      blocked: true,
      status: "blocked-insecure-http",
      protocol,
      hostname,
      isLocal,
      normalizedUrl: normalizeApiUrl(raw),
      originLabel: buildOriginLabel(parsed),
      summary: "只允许 HTTPS；HTTP 只允许 localhost、127.0.0.1 或 ::1 这类本机地址。"
    };
  }

  const normalizedUrl = normalizeApiUrl(raw);
  const originLabel = buildOriginLabel(parsed);
  const summary = protocol === "http:"
    ? `当前只允许直连 ${originLabel}；这是本机 HTTP 地址，仅建议本机调试使用，并且禁止重定向。`
    : `当前只允许直连 ${originLabel}；仅允许 HTTPS 或本机 HTTP，并且禁止重定向。`;

  return {
    configured: true,
    valid: true,
    safe: true,
    blocked: false,
    status: protocol === "http:" ? "local-http" : isLocal ? "local-https" : "strict",
    protocol,
    hostname,
    isLocal,
    normalizedUrl,
    originLabel,
    summary
  };
}

function sanitizeExplicitSharedText(input) {
  let nextText = typeof input === "string" ? input.trim() : "";

  if (!nextText) {
    return "";
  }

  for (const entry of REDACTION_PATTERNS) {
    nextText = nextText.replace(entry.pattern, entry.replace);
  }

  return nextText.trim();
}

function normalizeApiStyle(input) {
  return input === "openai-chat" || input === "openai-responses"
    ? input
    : "auto";
}

function inferApiStyleFromUrl(apiUrl) {
  const normalized = normalizeApiUrl(apiUrl).toLowerCase();

  if (normalized.includes("/responses")) {
    return "openai-responses";
  }

  if (normalized.includes("/chat/completions")) {
    return "openai-chat";
  }

  return "openai-chat";
}

function resolveApiStyle(apiStyle, apiUrl) {
  const normalizedStyle = normalizeApiStyle(apiStyle);

  if (normalizedStyle !== "auto") {
    return normalizedStyle;
  }

  return inferApiStyleFromUrl(apiUrl);
}

function extractTextParts(content) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }

      if (typeof entry?.text === "string") {
        return entry.text.trim();
      }

      if (typeof entry?.text?.value === "string") {
        return entry.text.value.trim();
      }

      if (typeof entry?.content === "string") {
        return entry.content.trim();
      }

      if (typeof entry?.output_text === "string") {
        return entry.output_text.trim();
      }

      return "";
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function extractAssistantText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const choiceText = extractTextParts(payload?.choices?.[0]?.message?.content);

  if (choiceText) {
    return choiceText;
  }

  const outputs = Array.isArray(payload?.output) ? payload.output : [];

  for (const entry of outputs) {
    const text = extractTextParts(entry?.content);

    if (text) {
      return text;
    }
  }

  return "";
}

function buildWorkbuddyRequestBody({
  apiStyle,
  model,
  systemPrompt,
  userMessage
} = {}) {
  if (apiStyle === "openai-responses") {
    return {
      model,
      instructions: systemPrompt,
      input: userMessage
    };
  }

  return {
    model,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userMessage
      }
    ]
  };
}

async function sendWorkbuddyChat({
  apiStyle,
  apiUrl,
  apiKey,
  model,
  systemPrompt,
  userMessage,
  signal
} = {}) {
  const targetSecurity = evaluateWorkbuddyApiUrl(apiUrl);

  if (!targetSecurity.configured) {
    throw new Error("缺少 WorkBuddy API URL。");
  }

  if (!targetSecurity.safe) {
    throw new Error(targetSecurity.summary);
  }

  const targetUrl = targetSecurity.normalizedUrl;
  const resolvedApiStyle = resolveApiStyle(apiStyle, targetUrl);
  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(
      buildWorkbuddyRequestBody({
        apiStyle: resolvedApiStyle,
        model,
        systemPrompt,
        userMessage
      })
    ),
    redirect: "error",
    signal
  });

  const rawText = await response.text();
  let payload = null;

  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {}

  if (!response.ok) {
    const message = typeof payload?.error?.message === "string" && payload.error.message.trim()
      ? payload.error.message.trim()
      : rawText.trim() || `WorkBuddy API returned ${response.status}`;
    throw new Error(message);
  }

  const assistantText = extractAssistantText(payload || {});

  if (!assistantText) {
    throw new Error("WorkBuddy API 返回成功了，但没有可显示的文本内容。");
  }

  return {
    payload,
    assistantText,
    apiStyle: resolvedApiStyle,
    endpointSecurity: targetSecurity
  };
}

module.exports = {
  buildWorkbuddyRequestBody,
  evaluateWorkbuddyApiUrl,
  extractAssistantText,
  normalizeApiUrl,
  resolveApiStyle,
  sanitizeExplicitSharedText,
  sendWorkbuddyChat
};
