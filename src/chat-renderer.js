const STATUS_COPY = {
  idle: "桌宠相关进程。",
  thinking: "正在盯当前委托。",
  done: "当前回包已经落地。",
  alert: "这步有风险，我先拦住了。"
};

const QUICK_ACTIONS = [
  {
    id: "summarize-room",
    cloneId: "main-cat",
    label: "总结现场",
    detail: "主猫收口当前上下文和下一步。",
    prompt: "把当前桌宠上下文、最近回包、环境提示和最值得做的三步总结给我。要求短、直给、可执行。"
  },
  {
    id: "inspect-code",
    cloneId: "builder-cat",
    label: "检查代码",
    detail: "补丁猫盯最近改动、风险和修法。",
    prompt: "检查当前工作区最近的改动、报错和潜在问题。优先给修改面、风险面、验证面；如果结论已经明确，可以直接动代码。"
  },
  {
    id: "research-context",
    cloneId: "scout-cat",
    label: "做调研",
    detail: "侦查猫抓资料、证据和不确定点。",
    prompt: "基于当前上下文做一轮快速调研。把关键结论、证据来源和仍不确定的地方收成短结论。"
  },
  {
    id: "check-runtime",
    cloneId: "ops-cat",
    label: "查本机",
    detail: "巡航猫看进程、链路和异常点。",
    prompt: "检查本机相关进程、端口和桌宠链路的运行态。把异常点、风险和建议动作列给我。"
  }
];
const ACTIVITY_LEVEL_OPTIONS = [
  {
    value: "low",
    label: "低活跃"
  },
  {
    value: "medium",
    label: "标准"
  },
  {
    value: "high",
    label: "高活跃"
  }
];
const STRING_PREFERENCE_KEYS = new Set([
  "activityLevel",
  "assistantMode",
  "workbuddyProviderLabel",
  "workbuddyApiStyle",
  "workbuddyApiUrl",
  "workbuddyModel",
  "openClawCommand",
  "openClawWorkingDir",
  "openClawReplyChannel",
  "openClawReplyToPrefix",
  "openClawSessionPrefix",
  "openClawDefaultAgentId"
]);

const chatTitle = document.querySelector("#chatTitle");
const chatMeta = document.querySelector("#chatMeta");
const chatPanel = document.querySelector(".chat-panel");
const progressCopy = document.querySelector("#progressCopy");
const progressPhase = document.querySelector("#progressPhase");
const progressPercent = document.querySelector("#progressPercent");
const progressFill = document.querySelector("#progressFill");
const progressSteps = document.querySelector("#progressSteps");
const avatarToggleButton = document.querySelector("#avatarToggleButton");
const workbenchToggleButton = document.querySelector("#workbenchToggleButton");
const diffToggleButton = document.querySelector("#diffToggleButton");
const chatCloseButton = document.querySelector("#chatCloseButton");
const cloneRack = document.querySelector("#cloneRack");
const quickActionShell = document.querySelector("#quickActionShell");
const ambientShell = document.querySelector("#ambientShell");
const diffShell = document.querySelector("#diffShell");
const diffTitle = document.querySelector("#diffTitle");
const diffMeta = document.querySelector("#diffMeta");
const diffIndex = document.querySelector("#diffIndex");
const diffStream = document.querySelector("#diffStream");
const diffCloseButton = document.querySelector("#diffCloseButton");
const workbenchShell = document.querySelector("#workbenchShell");
const workbenchTitle = document.querySelector("#workbenchTitle");
const workbenchMeta = document.querySelector("#workbenchMeta");
const workbenchStream = document.querySelector("#workbenchStream");
const workbenchCloseButton = document.querySelector("#workbenchCloseButton");
const chatBody = document.querySelector("#chatBody");
const chatStream = document.querySelector("#chatStream");
const chatForm = document.querySelector("#chatForm");
const chatInput = document.querySelector("#chatInput");
const chatSendButton = document.querySelector("#chatSendButton");
const chatResizeGrip = document.querySelector("#chatResizeGrip");

let currentState = {
  status: "idle",
  message: STATUS_COPY.idle,
  ttlMs: 3600
};
let contextState = {
  presence: "桌宠相关进程。"
};
let preferenceState = {
  quietMode: false,
  voiceEnabled: false,
  bubbleTtlMs: 3600,
  longReplyThreshold: 140,
  idleCompanionAfterMs: 45 * 60 * 1000,
  uiScale: 0.88,
  activityLevel: "low",
  openClawEnabled: false,
  openClawCommand: "",
  openClawWorkingDir: "",
  openClawReplyChannel: "",
  openClawReplyToPrefix: "desktop-pet",
  openClawSessionPrefix: "desktop-pet",
  openClawDefaultAgentId: "main",
  onboardingCompleted: false,
  assistantMode: "cute",
  workbuddyProviderLabel: "龙虾 WorkBuddy",
  workbuddyApiStyle: "auto",
  workbuddyApiUrl: "",
  workbuddyModel: "",
  shareLocalContext: false,
  allowFrontWindowTracking: false,
  allowDiffMonitor: false,
  workbuddySecretConfigured: false,
  workbuddySecretPersistence: "none",
  workbuddySecretSummary: "还没有保存 API key。",
  workbuddyStatus: "cute",
  workbuddyStatusLabel: "卖萌中",
  workbuddyStatusSummary: "当前是 Cute Mode。桌宠只在本机卖萌，不会发任何云端请求。",
  workbuddySecurityStatus: "empty",
  workbuddySecuritySummary: "当前没有任何 WorkBuddy 外发请求。",
  workbuddyEndpointOrigin: "",
  workbuddyApiUrlNormalized: "",
  customPetImagePath: "",
  customPetImageUrl: ""
};
let memoryState = {
  totalTurns: 0,
  assistantReplies: 0,
  completedTasks: 0,
  preferredCloneName: "小七",
  lastTaskCategory: "general",
  categoryPreferences: [],
  quietModeToggles: 0,
  voiceModeToggles: 0,
  reminderCount: 0,
  lastUserMessage: "",
  lastCompletedAt: 0,
  recentWins: []
};
let chatMessages = [];
let cloneState = {
  activeCloneId: "main-cat",
  selectedDiffCloneId: "builder-cat",
  clones: []
};
let uiState = {
  drawerOpen: false,
  workbenchOpen: false,
  diffOpen: false,
  avatarMode: "kuribou"
};
let selectedDiffEntryId = "";
let quickActionPendingId = "";

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function formatShortTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDateTime(timestamp) {
  if (!timestamp) {
    return "暂未记录";
  }

  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderSelectOptions(currentValue, options) {
  return options
    .map((option) => `
      <option value="${escapeHtml(option.value)}" ${String(currentValue ?? "") === String(option.value) ? "selected" : ""}>
        ${escapeHtml(option.label)}
      </option>
    `)
    .join("");
}

function getTransportStatusLabel(state) {
  if (state === "cute") {
    return "卖萌中";
  }

  if (state === "ready") {
    return "已就绪";
  }

  if (state === "misconfigured") {
    return "缺配置";
  }

  if (state === "blocked") {
    return "已拦截";
  }

  return "未连接";
}

function buildTransportStatusCopy(session) {
  if (typeof preferenceState.workbuddyStatusSummary === "string" && preferenceState.workbuddyStatusSummary.trim()) {
    return preferenceState.workbuddyStatusSummary.trim();
  }

  if (typeof session.transportSummary === "string" && session.transportSummary.trim()) {
    return session.transportSummary.trim();
  }

  return preferenceState.assistantMode === "workbuddy"
    ? "WorkBuddy 还没接好。"
    : "当前是 Cute Mode。桌宠本地功能仍可正常工作。";
}

function getAssistantModeLabel(mode) {
  return mode === "workbuddy" ? "WorkBuddy" : "Cute Mode";
}

function getAvatarModeLabel(mode) {
  if (mode === "cat") {
    return "黑猫";
  }

  if (mode === "custom") {
    return "我的宠物";
  }

  return "默认 chibi";
}

function focusWorkbenchApiKeyInput({ selectAll = false } = {}) {
  const input = workbenchStream.querySelector("#workbuddyApiKeyInput");

  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  input.focus({ preventScroll: true });

  if (selectAll) {
    input.setSelectionRange(0, input.value.length);
  }
}

function resizeChatInput() {
  const maxHeight = Math.max(180, Math.round(window.innerHeight * 0.32));
  chatInput.style.height = "0px";
  chatInput.style.height = `${Math.min(Math.max(chatInput.scrollHeight, 88), maxHeight)}px`;
}

function focusChatInput() {
  resizeChatInput();
  chatInput.focus({ preventScroll: true });

  if (document.activeElement === chatInput) {
    chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
    return;
  }

  [80, 180].forEach((delay) => {
    window.setTimeout(() => {
      chatInput.focus({ preventScroll: true });

      if (document.activeElement === chatInput) {
        chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
      }
    }, delay);
  });
}

function getClone(cloneId = cloneState.activeCloneId) {
  return cloneState.clones.find((clone) => clone.id === cloneId) || cloneState.clones[0] || null;
}

function normalizeProgressStepStatus(status) {
  return ["done", "active", "blocked", "pending"].includes(status)
    ? status
    : "pending";
}

function buildProgressModel() {
  const mode = typeof contextState.mode === "string" ? contextState.mode : "ambient";
  const intent = contextState.intent && typeof contextState.intent === "object"
    ? contextState.intent
    : null;
  const steps = Array.isArray(intent?.steps)
    ? intent.steps
        .map((step) => {
          const label = typeof step?.label === "string" ? step.label.trim() : "";

          if (!label) {
            return null;
          }

          return {
            label,
            status: normalizeProgressStepStatus(step.status)
          };
        })
        .filter(Boolean)
        .slice(0, 4)
    : [];
  const stepWeights = {
    pending: 0.08,
    active: 0.56,
    blocked: 0.5,
    done: 1
  };
  const basePercentMap = {
    ambient: 16,
    planning: 28,
    acting: 64,
    approval: 52,
    artifact: 100,
    cooldown: 92
  };
  const phaseLabels = {
    ambient: "待命",
    planning: "规划中",
    acting: "执行中",
    approval: "待确认",
    artifact: "已产出",
    cooldown: "收尾中"
  };

  const stepProgress = steps.length > 0
    ? (steps.reduce((sum, step) => sum + (stepWeights[step.status] || stepWeights.pending), 0) / steps.length) * 100
    : null;
  let progress = stepProgress ?? (basePercentMap[mode] || 16);

  if (contextState.tool?.status === "active") {
    progress = Math.max(progress, 62);
  } else if (contextState.tool?.status === "done") {
    progress = Math.max(progress, 86);
  }

  if (contextState.approval) {
    progress = Math.min(Math.max(progress, 52), 78);
  }

  if (contextState.artifact) {
    progress = 100;
  } else if (currentState.status === "done" && mode !== "approval") {
    progress = 100;
  } else if (currentState.status === "thinking") {
    progress = Math.max(progress, 58);
  } else if (currentState.status === "idle" && mode === "ambient") {
    progress = Math.min(progress, 24);
  }

  progress = Math.max(8, Math.min(100, Math.round(progress)));

  let text = "";

  if (contextState.approval?.title) {
    text = contextState.approval.title;
  } else if (contextState.tool?.detail) {
    text = contextState.tool.detail;
  } else if (intent?.summary) {
    text = intent.summary;
  } else {
    text = contextState.presence || currentState.message || STATUS_COPY[currentState.status] || STATUS_COPY.idle;
  }

  return {
    progress,
    phase: phaseLabels[mode] || "处理中",
    text,
    live: mode === "planning" || mode === "acting" || contextState.tool?.status === "active",
    steps
  };
}

function renderProgressSteps(steps) {
  if (!steps.length) {
    progressSteps.innerHTML = `
      <span class="progress-step ${currentState.status === "thinking" ? "is-active" : currentState.status === "done" ? "is-done" : ""}">
        ${escapeHtml(currentState.status === "done" ? "当前回包已落地" : currentState.status === "thinking" ? "正在跑桌宠通道" : "桌宠待命")}
      </span>
    `;
    return;
  }

  progressSteps.innerHTML = steps
    .map((step) => `<span class="progress-step ${step.status === "done" ? "is-done" : step.status === "active" ? "is-active" : step.status === "blocked" ? "is-blocked" : ""}">${escapeHtml(step.label)}</span>`)
    .join("");
}

function applyProgress() {
  const model = buildProgressModel();

  progressFill.style.width = `${model.progress}%`;
  progressFill.classList.toggle("is-live", model.live);
  progressCopy.textContent = model.text;
  progressPhase.textContent = model.phase;
  progressPercent.textContent = `${model.progress}%`;
  chatMeta.textContent = model.text;
  renderProgressSteps(model.steps);
}

function renderMessages() {
  if (chatMessages.length === 0) {
    chatStream.innerHTML = `
      <article class="message message-system">
        <div class="message-meta">
          <span class="message-badge">
            <span class="message-clone">桌宠</span>
          </span>
          <span>ready</span>
        </div>
        <p class="message-text">现在可以直接把任务丢过来。</p>
      </article>
    `;
    return;
  }

  chatStream.innerHTML = chatMessages
    .slice(-16)
    .map((message) => {
      const clone = getClone(message.cloneId);
      const author = message.role === "user"
        ? "你"
        : message.role === "assistant"
          ? clone?.name || "小七"
          : "系统";
      const badge = message.role === "assistant"
        ? escapeHtml(clone?.badge || "总控")
        : message.role === "user"
          ? "委托"
          : "提醒";

      return `
        <article class="message message-${message.role}">
          <div class="message-meta">
            <span class="message-badge">
              <span>${escapeHtml(author)}</span>
              <span class="message-clone">${badge}</span>
            </span>
            <span>${formatShortTime(message.createdAt)}</span>
          </div>
          <p class="message-text">${escapeHtml(message.text)}</p>
        </article>
      `;
    })
    .join("");

  if (chatBody) {
    chatBody.scrollTop = chatBody.scrollHeight;
  }
}

function renderDiff() {
  const clone = getClone(cloneState.selectedDiffCloneId);

  if (!clone) {
    diffShell.classList.add("is-hidden");
    return;
  }

  diffTitle.textContent = `${clone.name} 代码监视器`;
  diffMeta.textContent = clone.diff?.summary || "这只分身最近没落新 patch。";
  diffShell.classList.toggle("is-hidden", !uiState.diffOpen);

  if (!uiState.diffOpen) {
    return;
  }

  const entries = [];
  const textFiles = clone.diff?.textFiles || [];
  const repos = clone.diff?.repos || [];

  for (const file of textFiles) {
    entries.push({
      id: `text:${file.relPath}`,
      title: file.relPath,
      subtitle: `桌宠项目 · ${file.changeType}`,
      body: `
        <article class="diff-card">
          <span class="diff-card-title">${escapeHtml(file.relPath)}</span>
          <span class="diff-card-subtitle">桌宠项目 · ${escapeHtml(file.changeType)}</span>
          <pre class="diff-patch">${escapeHtml(file.patch || "没有 patch 文本。")}</pre>
        </article>
      `
    });
  }

  for (const repo of repos) {
    const title = repo.repoName || repo.repoPath || "仓库";
    entries.push({
      id: `repo:${title}:${repo.repoPath || ""}`,
      title,
      subtitle: repo.repoPath || "git repo",
      body: `
        <article class="diff-card">
          <span class="diff-card-title">${escapeHtml(repo.repoName || "仓库改动")}</span>
          <span class="diff-card-subtitle">${escapeHtml(repo.repoPath || "git repo")}</span>
          <div class="diff-status-list">
            ${(repo.statusLines || []).map((line) => `<span class="diff-status-line">${escapeHtml(line)}</span>`).join("")}
          </div>
          ${repo.stat ? `<pre class="diff-patch">${escapeHtml(repo.stat)}</pre>` : ""}
          ${repo.patch ? `<pre class="diff-patch">${escapeHtml(repo.patch)}</pre>` : ""}
        </article>
      `
    });
  }

  if (entries.length === 0) {
    selectedDiffEntryId = "";
    diffIndex.innerHTML = "";
    diffStream.innerHTML = `
      <article class="diff-card">
        <span class="diff-card-title">还没抓到代码改动</span>
        <span class="diff-card-subtitle">这只分身最近更像是在读、查、回，没有落 patch。</span>
      </article>
    `;
    return;
  }

  if (!entries.some((entry) => entry.id === selectedDiffEntryId)) {
    selectedDiffEntryId = entries[0].id;
  }

  diffIndex.innerHTML = entries
    .map((entry) => `
      <button
        class="diff-index-item ${entry.id === selectedDiffEntryId ? "is-active" : ""}"
        type="button"
        data-diff-entry-id="${escapeHtml(entry.id)}"
      >
        <span class="diff-index-title">${escapeHtml(entry.title)}</span>
        <span class="diff-index-subtitle">${escapeHtml(entry.subtitle)}</span>
      </button>
    `)
    .join("");

  const activeEntry = entries.find((entry) => entry.id === selectedDiffEntryId) || entries[0];
  diffStream.innerHTML = activeEntry.body;
}

function renderAmbientFeed() {
  const items = Array.isArray(contextState.ambient)
    ? contextState.ambient.slice(-4).reverse()
    : [];
  const hidden = items.length === 0 || uiState.diffOpen || uiState.workbenchOpen;

  ambientShell.classList.toggle("is-hidden", hidden);

  if (hidden) {
    return;
  }

  ambientShell.innerHTML = items
    .map((item) => `
      <article class="ambient-card ambient-card-${escapeHtml(item.level || "suggest")}">
        <div class="ambient-card-head">
          <span class="ambient-card-title">${escapeHtml(item.title || "环境提示")}</span>
          <span class="ambient-card-meta">${escapeHtml(formatShortTime(item.createdAt))}</span>
        </div>
        <p class="ambient-card-body">${escapeHtml(item.message || "")}</p>
      </article>
    `)
    .join("");
}

function renderQuickActionCards({ inline = false } = {}) {
  return QUICK_ACTIONS
    .map((action) => {
      const clone = getClone(action.cloneId);
      const isPending = quickActionPendingId === action.id;
      const isActiveClone = clone?.id === cloneState.activeCloneId;

      return `
        <button
          class="quick-action-card ${isPending ? "is-pending" : ""} ${isActiveClone ? "is-active-clone" : ""} ${inline ? "is-inline" : ""}"
          type="button"
          data-quick-action-id="${escapeHtml(action.id)}"
          ${isPending ? "disabled" : ""}
        >
          <span class="quick-action-kicker">${escapeHtml(clone?.badge || "分身")}</span>
          <span class="quick-action-label">${escapeHtml(isPending ? `${action.label}中` : action.label)}</span>
          <span class="quick-action-detail">${escapeHtml(action.detail)}</span>
        </button>
      `;
    })
    .join("");
}

function renderQuickActionsShell() {
  const hidden = uiState.diffOpen || uiState.workbenchOpen;

  quickActionShell.classList.toggle("is-hidden", hidden);

  if (hidden) {
    return;
  }

  quickActionShell.innerHTML = `
    <div class="quick-action-head">
      <span class="quick-action-title">一键派活</span>
      <span class="quick-action-meta">少打字，直接把活丢给分身。</span>
    </div>
    <div class="quick-action-grid">
      ${renderQuickActionCards()}
    </div>
  `;
}

function hasWorkbenchContent() {
  return Boolean(contextState.artifact?.content || contextState.approval?.title);
}

function renderWorkbench() {
  const hasArtifact = Boolean(contextState.artifact?.content);
  const hasApproval = Boolean(contextState.approval?.title);
  const activeClone = getClone();
  const session = contextState.session || {};
  const metrics = contextState.metrics || {};
  const sessionModelLabel = preferenceState.assistantMode === "cute"
    ? "local-only"
    : session.model || preferenceState.workbuddyModel || "pending";

  workbenchToggleButton.hidden = false;
  workbenchToggleButton.classList.toggle("is-active", Boolean(uiState.workbenchOpen));

  if (hasApproval) {
    workbenchTitle.textContent = "审批工作台";
    workbenchMeta.textContent = "高风险动作先过你一眼，再决定是否继续跑。";
  } else if (hasArtifact) {
    workbenchTitle.textContent = "长回复工作台";
    workbenchMeta.textContent = "长内容放这里，气泡只保留一句。";
  } else {
    workbenchTitle.textContent = "工作台";
    workbenchMeta.textContent = "长回复、审批和运行摘要会停在这里。";
  }

  const cards = [];

  if (hasApproval) {
    cards.push(`
      <article class="workbench-card workbench-card-approval">
        <div class="workbench-card-frame">
          <div class="workbench-card-scroll">
            <div class="workbench-card-head">
              <div class="workbench-card-copy">
                <span class="workbench-card-title">${escapeHtml(contextState.approval.title)}</span>
                <span class="workbench-card-subtitle">风险级别：${escapeHtml(contextState.approval.risk || "high")}</span>
              </div>
            </div>
            ${contextState.approval.summary ? `<p class="workbench-card-body">${escapeHtml(contextState.approval.summary)}</p>` : ""}
            ${contextState.approval.detail ? `<p class="workbench-card-body">${escapeHtml(contextState.approval.detail)}</p>` : ""}
            ${Array.isArray(contextState.approval.actions) && contextState.approval.actions.length
              ? `
                <div class="workbench-quick-actions">
                  <span class="workbench-card-subtitle">拟执行动作</span>
                  ${contextState.approval.actions
                    .map((action) => `<p class="workbench-card-body">${escapeHtml(`${action.label} · ${action.risk || "medium"}${action.detail ? ` · ${action.detail}` : ""}`)}</p>`)
                    .join("")}
                </div>
              `
              : ""}
            ${contextState.approval.command ? `<pre class="workbench-code">${escapeHtml(contextState.approval.command)}</pre>` : ""}
          </div>
          <div class="workbench-actions workbench-actions-sticky">
            <button class="workbench-action is-primary" type="button" data-workbench-action="approve" data-approval-id="${escapeHtml(contextState.approval.id)}">批准执行</button>
            <button class="workbench-action" type="button" data-workbench-action="reject" data-approval-id="${escapeHtml(contextState.approval.id)}">先别跑</button>
          </div>
        </div>
      </article>
    `);
  }

  if (hasArtifact) {
    cards.push(`
      <article class="workbench-card">
        <div class="workbench-card-head">
          <div class="workbench-card-copy">
            <span class="workbench-card-title">${escapeHtml(contextState.artifact.title || "Artifact")}</span>
            <span class="workbench-card-subtitle">${escapeHtml(contextState.artifact.kind || "markdown")} · ${escapeHtml(formatDateTime(contextState.artifact.updatedAt))}</span>
          </div>
          <button class="workbench-inline-action" type="button" data-workbench-action="clear-artifact">清空</button>
        </div>
        <pre class="workbench-code">${escapeHtml(contextState.artifact.content)}</pre>
      </article>
    `);
  }

  if (!preferenceState.onboardingCompleted) {
    cards.push(`
      <article class="workbench-card workbench-card-setup">
        <div class="workbench-card-head">
          <div class="workbench-card-copy">
            <span class="workbench-card-title">首次设置</span>
            <span class="workbench-card-subtitle">装好就能直接用。Cute Mode 完全本地；WorkBuddy 只有在你填了自己的 API 后才会联网。</span>
          </div>
        </div>
        <div class="workbench-actions">
          <button class="workbench-action is-primary" type="button" data-workbench-action="assistant-mode-cute">先用 Cute Mode</button>
          <button class="workbench-action" type="button" data-workbench-action="assistant-mode-workbuddy">我要接 WorkBuddy</button>
        </div>
      </article>
    `);
  }

  cards.push(`
    <article class="workbench-card">
      <div class="workbench-card-head">
        <div class="workbench-card-copy">
          <span class="workbench-card-title">陪伴记忆</span>
          <span class="workbench-card-subtitle">慢慢记住你更常怎么使唤我，不只是当次回包。</span>
        </div>
      </div>
      <div class="workbench-metrics">
        <span class="workbench-metric">总委托：${Number(memoryState.totalTurns) || 0}</span>
        <span class="workbench-metric">已完成：${Number(memoryState.completedTasks) || 0}</span>
        <span class="workbench-metric">最常叫：${escapeHtml(memoryState.preferredCloneName || "小七")}</span>
        <span class="workbench-metric">提醒接管：${Number(memoryState.reminderCount) || 0}</span>
      </div>
      <p class="workbench-card-body">${escapeHtml(memoryState.lastUserMessage ? `最近一句：${memoryState.lastUserMessage}` : "你最近还没留下一句新的委托。")}</p>
      <p class="workbench-card-body">${escapeHtml(`最近任务面：${memoryState.lastTaskCategory || "general"}`)}</p>
      ${Array.isArray(memoryState.recentWins) && memoryState.recentWins.length
        ? `
          <div class="workbench-quick-actions">
            <span class="workbench-card-subtitle">最近记住的结果</span>
            ${memoryState.recentWins
              .slice(-3)
              .reverse()
              .map((entry) => `<p class="workbench-card-body">${escapeHtml(`${entry.cloneName || "小七"} · ${formatDateTime(entry.createdAt)} · ${entry.text || ""}`)}</p>`)
              .join("")}
          </div>
        `
        : ""}
      ${Array.isArray(memoryState.categoryPreferences) && memoryState.categoryPreferences.length
        ? `
          <div class="workbench-quick-actions">
            <span class="workbench-card-subtitle">类别偏好</span>
            ${memoryState.categoryPreferences
              .map((entry) => `<p class="workbench-card-body">${escapeHtml(`${entry.category} → ${entry.preferredCloneName} (${entry.count})`)}</p>`)
              .join("")}
          </div>
        `
        : ""}
    </article>
  `);

  cards.push(`
    <article class="workbench-card workbench-card-summary">
      <div class="workbench-card-head">
        <div class="workbench-card-copy">
          <span class="workbench-card-title">运行摘要</span>
          <span class="workbench-card-subtitle">${escapeHtml(activeClone?.name || "小七")} · ${escapeHtml(getAssistantModeLabel(preferenceState.assistantMode))}</span>
        </div>
      </div>
      <div class="workbench-metrics">
        <span class="workbench-metric">模式：${escapeHtml(getAssistantModeLabel(preferenceState.assistantMode))}</span>
        <span class="workbench-metric">连接：${escapeHtml(preferenceState.workbuddyStatusLabel || getTransportStatusLabel(session.transportState))}</span>
        <span class="workbench-metric">模型：${escapeHtml(sessionModelLabel)}</span>
        <span class="workbench-metric">最近活动：${escapeHtml(formatDateTime(session.lastActiveAt))}</span>
        <span class="workbench-metric">API key：${escapeHtml(preferenceState.workbuddySecretConfigured ? "已配置" : "未配置")}</span>
        <span class="workbench-metric">环境提示：${Array.isArray(contextState.ambient) ? contextState.ambient.length : 0}</span>
        <span class="workbench-metric">内存压力：${escapeHtml(metrics.memoryPressure || "normal")}</span>
      </div>
      <p class="workbench-card-body">${escapeHtml(contextState.presence || currentState.message || STATUS_COPY[currentState.status] || STATUS_COPY.idle)}</p>
      <p class="workbench-card-body">${escapeHtml(buildTransportStatusCopy(session))}</p>
      <div class="workbench-quick-actions">
        <span class="workbench-card-subtitle">快捷动作</span>
        <div class="quick-action-grid is-inline">
          ${renderQuickActionCards({ inline: true })}
        </div>
      </div>
    </article>
  `);

  cards.push(`
    <article class="workbench-card workbench-card-preferences">
      <div class="workbench-card-head">
        <div class="workbench-card-copy">
          <span class="workbench-card-title">WorkBuddy 设置</span>
          <span class="workbench-card-subtitle">默认严格隐私：不共享本机上下文，不写明文 API key。文本项在失焦后保存。</span>
        </div>
      </div>
      <div class="preference-grid">
        <label class="preference-field preference-switch">
          <span class="preference-label">安静模式</span>
          <input class="preference-checkbox" type="checkbox" data-pref-key="quietMode" ${preferenceState.quietMode ? "checked" : ""}>
        </label>
        <label class="preference-field preference-switch">
          <span class="preference-label">语音播报</span>
          <input class="preference-checkbox" type="checkbox" data-pref-key="voiceEnabled" ${preferenceState.voiceEnabled ? "checked" : ""}>
        </label>
        <label class="preference-field">
          <span class="preference-label">气泡时长</span>
          <select class="preference-select" data-pref-key="bubbleTtlMs">
            ${renderSelectOptions(preferenceState.bubbleTtlMs, [
              { value: 2400, label: "2.4 秒" },
              { value: 3600, label: "3.6 秒" },
              { value: 5400, label: "5.4 秒" },
              { value: 7200, label: "7.2 秒" }
            ])}
          </select>
        </label>
        <label class="preference-field">
          <span class="preference-label">长回复阈值</span>
          <select class="preference-select" data-pref-key="longReplyThreshold">
            ${renderSelectOptions(preferenceState.longReplyThreshold, [
              { value: 100, label: "100 字" },
              { value: 140, label: "140 字" },
              { value: 180, label: "180 字" },
              { value: 240, label: "240 字" }
            ])}
          </select>
        </label>
        <label class="preference-field">
          <span class="preference-label">陪伴间隔</span>
          <select class="preference-select" data-pref-key="idleCompanionAfterMs">
            ${renderSelectOptions(preferenceState.idleCompanionAfterMs, [
              { value: 30 * 60 * 1000, label: "30 分钟" },
              { value: 45 * 60 * 1000, label: "45 分钟" },
              { value: 60 * 60 * 1000, label: "60 分钟" },
              { value: 90 * 60 * 1000, label: "90 分钟" }
            ])}
          </select>
        </label>
        <label class="preference-field">
          <span class="preference-label">界面尺寸</span>
          <select class="preference-select" data-pref-key="uiScale">
            ${renderSelectOptions(preferenceState.uiScale, [
              { value: 0.78, label: "极小" },
              { value: 0.82, label: "更小" },
              { value: 0.88, label: "偏小" },
              { value: 0.94, label: "紧凑" },
              { value: 1, label: "标准" }
            ])}
          </select>
        </label>
        <label class="preference-field">
          <span class="preference-label">活跃度</span>
          <select class="preference-select" data-pref-key="activityLevel">
            ${renderSelectOptions(preferenceState.activityLevel, ACTIVITY_LEVEL_OPTIONS)}
          </select>
        </label>
      </div>
      <div class="preference-status-row">
        <span class="preference-status-badge is-${escapeHtml(preferenceState.workbuddyStatus || "cute")}">${escapeHtml(getAssistantModeLabel(preferenceState.assistantMode))} · ${escapeHtml(preferenceState.workbuddyStatusLabel || "卖萌中")}</span>
        <span class="preference-status-copy">${escapeHtml(buildTransportStatusCopy(session))}</span>
      </div>
      <div class="preference-grid">
        <label class="preference-field preference-switch">
          <span class="preference-label">WorkBuddy 模式</span>
          <input class="preference-checkbox" type="checkbox" data-pref-key="assistantMode" ${preferenceState.assistantMode === "workbuddy" ? "checked" : ""} data-pref-value-checked="workbuddy" data-pref-value-unchecked="cute">
        </label>
        <label class="preference-field">
          <span class="preference-label">服务名称</span>
          <input
            class="preference-input"
            type="text"
            data-pref-key="workbuddyProviderLabel"
            placeholder="龙虾 WorkBuddy"
            value="${escapeHtml(preferenceState.workbuddyProviderLabel || "")}"
          >
        </label>
        <label class="preference-field">
          <span class="preference-label">协议</span>
          <select class="preference-select" data-pref-key="workbuddyApiStyle">
            ${renderSelectOptions(preferenceState.workbuddyApiStyle, [
              { value: "auto", label: "自动识别" },
              { value: "openai-chat", label: "Chat Completions" },
              { value: "openai-responses", label: "Responses API" }
            ])}
          </select>
        </label>
        <label class="preference-field preference-field-span-2">
          <span class="preference-label">API URL</span>
          <input
            class="preference-input"
            type="text"
            data-pref-key="workbuddyApiUrl"
            placeholder="https://your-provider.example/v1/chat/completions 或 /v1/responses"
            value="${escapeHtml(preferenceState.workbuddyApiUrl || "")}"
          >
        </label>
        <label class="preference-field">
          <span class="preference-label">模型名</span>
          <input
            class="preference-input"
            type="text"
            data-pref-key="workbuddyModel"
            placeholder="gpt-4.1-mini / lobster-1 / ..."
            value="${escapeHtml(preferenceState.workbuddyModel || "")}"
          >
        </label>
        <label class="preference-field preference-switch">
          <span class="preference-label">允许显式共享上下文</span>
          <input class="preference-checkbox" type="checkbox" data-pref-key="shareLocalContext" ${preferenceState.shareLocalContext ? "checked" : ""}>
        </label>
        <label class="preference-field preference-switch">
          <span class="preference-label">启用前台窗口跟踪</span>
          <input class="preference-checkbox" type="checkbox" data-pref-key="allowFrontWindowTracking" ${preferenceState.allowFrontWindowTracking ? "checked" : ""}>
        </label>
        <label class="preference-field preference-switch">
          <span class="preference-label">启用代码改动监视</span>
          <input class="preference-checkbox" type="checkbox" data-pref-key="allowDiffMonitor" ${preferenceState.allowDiffMonitor ? "checked" : ""}>
        </label>
        <label class="preference-field preference-field-span-2">
          <span class="preference-label">API key</span>
          <input
            class="preference-input"
            type="password"
            id="workbuddyApiKeyInput"
            placeholder="${escapeHtml(preferenceState.workbuddySecretConfigured ? "已保存；重新输入会覆盖" : "输入你自己的 API key")}"
            value=""
          >
        </label>
        <div class="preference-field preference-field-span-2">
          <span class="preference-label">API key 状态</span>
          <p class="preference-note">${escapeHtml(preferenceState.workbuddySecretSummary || "还没有保存 API key。")}</p>
        </div>
        <div class="preference-field preference-field-span-2">
          <span class="preference-label">出站防护</span>
          <p class="preference-note">${escapeHtml(preferenceState.workbuddySecuritySummary || "当前没有任何 WorkBuddy 外发请求。")}</p>
        </div>
        <div class="preference-field preference-field-span-2">
          <span class="preference-label">自定义桌宠</span>
          ${preferenceState.customPetImageUrl
            ? `<img class="preference-pet-preview" src="${escapeHtml(preferenceState.customPetImageUrl)}" alt="自定义桌宠预览">`
            : `<p class="preference-note">还没导入图片。导入后会用现有桌宠动作骨架承接你的宠物形象。</p>`}
        </div>
      </div>
      <div class="workbench-actions">
        <button class="workbench-action is-primary" type="button" data-workbench-action="save-workbuddy-secret">保存 API key</button>
        <button class="workbench-action" type="button" data-workbench-action="clear-workbuddy-secret">清掉 API key</button>
        <button class="workbench-action" type="button" data-workbench-action="import-custom-pet">导入宠物图片</button>
        <button class="workbench-action" type="button" data-workbench-action="clear-custom-pet" ${preferenceState.customPetImageUrl ? "" : "disabled"}>移除宠物图片</button>
      </div>
      <div class="workbench-actions">
        <button class="workbench-inline-action ${uiState.avatarMode === "kuribou" ? "is-active" : ""}" type="button" data-workbench-action="set-avatar-kuribou">用默认 chibi</button>
        <button class="workbench-inline-action ${uiState.avatarMode === "cat" ? "is-active" : ""}" type="button" data-workbench-action="set-avatar-cat">用黑猫</button>
        <button class="workbench-inline-action ${uiState.avatarMode === "custom" ? "is-active" : ""}" type="button" data-workbench-action="set-avatar-custom" ${preferenceState.customPetImageUrl ? "" : "disabled"}>用我的宠物</button>
      </div>
      <p class="preference-note">当前桌宠形象：${escapeHtml(getAvatarModeLabel(uiState.avatarMode))}</p>
      <p class="preference-note">严格模式下，桌宠发给 WorkBuddy 的只有你当前输入。前台窗口、代码改动和本地身份信息不会默认上云；显式共享的上下文也会先做脱敏。</p>
    </article>
  `);

  workbenchStream.innerHTML = cards.join("");
}

function renderCloneRack() {
  const activeClone = getClone();

  if (!activeClone) {
    return;
  }

  cloneRack.innerHTML = cloneState.clones
    .map((clone) => {
      const rolePreview = String(clone.taskHint || "")
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 2)
        .join(" / ");
      const queueCopy = Number(clone.activeTurns) > 0
        ? `执行中${Number(clone.queuedTurns) > 0 ? ` · 后排 ${clone.queuedTurns}` : ""}`
        : Number(clone.queuedTurns) > 0
          ? `排队 ${clone.queuedTurns}`
          : clone.lastTask
            ? clone.lastTask.slice(0, 14)
            : "还没接活";

      return `
      <article class="clone-card ${clone.id === cloneState.activeCloneId ? "is-active" : "is-compact"}" data-clone-id="${escapeHtml(clone.id)}" style="--clone-accent:${clone.accent};">
        <div class="clone-copy">
          <span class="clone-name">${escapeHtml(clone.name)}</span>
          <span class="clone-role">${escapeHtml(rolePreview || clone.taskHint || "")}</span>
          <span class="clone-presence ${clone.spawned ? "is-live" : "is-dormant"}">${clone.spawned ? "桌面中" : "待召唤"}</span>
          <span class="clone-last">${escapeHtml(queueCopy)}</span>
        </div>

        <div class="clone-actions">
          <button class="clone-select" type="button" data-action="select">${clone.id === cloneState.activeCloneId ? "当前" : "切换"}</button>
          <button class="clone-monitor" type="button" data-action="monitor" aria-label="查看代码改动">▣</button>
        </div>
      </article>
    `;
    })
    .join("");

  chatTitle.textContent = activeClone.name;
}

function applyCloneState(nextCloneState) {
  cloneState = {
    ...cloneState,
    ...nextCloneState,
    clones: nextCloneState?.clones || cloneState.clones
  };

  renderCloneRack();
  renderQuickActionsShell();
  renderAmbientFeed();
  renderDiff();
  renderWorkbench();
}

function applyUiState(nextUi) {
  const wasDrawerOpen = Boolean(uiState.drawerOpen);
  const wasWorkbenchOpen = Boolean(uiState.workbenchOpen);
  const wasDiffOpen = Boolean(uiState.diffOpen);

  uiState = {
    ...uiState,
    ...nextUi
  };

  if (chatPanel) {
    chatPanel.classList.toggle("is-diff-mode", Boolean(uiState.diffOpen));
    chatPanel.classList.toggle("is-workbench-mode", Boolean(uiState.workbenchOpen));
  }

  const hidesChatRail = Boolean(uiState.diffOpen || uiState.workbenchOpen);
  cloneRack.classList.toggle("is-hidden", hidesChatRail);
  chatStream.classList.toggle("is-hidden", hidesChatRail);
  chatForm.classList.toggle("is-hidden", hidesChatRail);
  quickActionShell.classList.toggle("is-hidden", hidesChatRail);
  ambientShell.classList.toggle("is-hidden", hidesChatRail || !Array.isArray(contextState.ambient) || contextState.ambient.length === 0);
  workbenchShell.classList.toggle("is-hidden", !uiState.workbenchOpen);

  diffToggleButton.textContent = uiState.diffOpen ? "－" : "▣";
  avatarToggleButton.textContent = uiState.avatarMode === "cat" ? "切到小栗帽" : "切到黑猫";
  renderQuickActionsShell();
  renderAmbientFeed();
  renderDiff();
  renderWorkbench();

  if (
    uiState.drawerOpen &&
    !uiState.diffOpen &&
    !uiState.workbenchOpen &&
    (!wasDrawerOpen || wasDiffOpen !== uiState.diffOpen || wasWorkbenchOpen !== uiState.workbenchOpen)
  ) {
    window.setTimeout(() => {
      focusChatInput();
    }, 32);
  }
}

function applyPetState(nextState) {
  currentState = {
    ...currentState,
    ...nextState,
    status: STATUS_COPY[nextState.status] ? nextState.status : "idle",
    message: nextState.message || STATUS_COPY[nextState.status] || STATUS_COPY.idle
  };

  applyProgress();
  renderWorkbench();
}

function applyContextState(nextContext) {
  contextState = {
    ...contextState,
    ...nextContext
  };

  applyProgress();
  renderAmbientFeed();
  renderWorkbench();
}

function applyPreferenceState(nextPreferences) {
  preferenceState = {
    ...preferenceState,
    ...nextPreferences
  };

  renderWorkbench();
}

function applyMemoryState(nextMemory) {
  memoryState = {
    ...memoryState,
    ...nextMemory
  };

  renderWorkbench();
}

function pushMessage(message) {
  if (chatMessages.some((entry) => entry.id === message.id)) {
    return;
  }

  chatMessages.push(message);
  chatMessages = chatMessages
    .sort((left, right) => left.createdAt - right.createdAt)
    .slice(-120);
  renderMessages();
}

async function handleChatSubmit() {
  const text = chatInput.value.trim();

  if (!text) {
    return;
  }

  chatSendButton.disabled = true;

  try {
    const activeClone = getClone();
    const message = await window.petShell.sendChat({
      text,
      cloneId: activeClone?.id || cloneState.activeCloneId
    });

    if (message) {
      pushMessage(message);
      chatInput.value = "";
      focusChatInput();
    }
  } finally {
    chatSendButton.disabled = false;
  }
}

async function handleCloneRackClick(event) {
  const button = event.target.closest("button[data-action]");
  const card = event.target.closest(".clone-card");

  if (!button || !card) {
    return;
  }

  const cloneId = card.dataset.cloneId;

  if (button.dataset.action === "select") {
    const nextCloneState = await window.petShell.setClone({ cloneId });
    applyCloneState(nextCloneState);
    return;
  }

  const payload = await window.petShell.setDiffOpen({ open: true, cloneId });
  applyUiState(payload.ui);
  applyCloneState(payload.clones);
}

async function handleWorkbenchAction(event) {
  const button = event.target.closest("button[data-workbench-action]");

  if (!button) {
    return;
  }

  const action = button.dataset.workbenchAction;

  if (action === "approve") {
    await window.petShell.approveRequest({
      approvalId: button.dataset.approvalId || ""
    });
    return;
  }

  if (action === "reject") {
    await window.petShell.rejectRequest({
      approvalId: button.dataset.approvalId || ""
    });
    return;
  }

  if (action === "clear-artifact") {
    window.petShell.clearArtifact();
    return;
  }

  if (action === "assistant-mode-cute" || action === "assistant-mode-workbuddy") {
    const nextPreferences = await window.petShell.updatePreferences({
      assistantMode: action === "assistant-mode-workbuddy" ? "workbuddy" : "cute",
      onboardingCompleted: true
    });
    applyPreferenceState(nextPreferences || {});

    if (action === "assistant-mode-workbuddy") {
      window.setTimeout(() => {
        focusWorkbenchApiKeyInput();
      }, 32);
    }

    return;
  }

  if (action === "save-workbuddy-secret") {
    const input = workbenchStream.querySelector("#workbuddyApiKeyInput");
    const apiKey = input instanceof HTMLInputElement ? input.value.trim() : "";

    if (!apiKey) {
      focusWorkbenchApiKeyInput({ selectAll: true });
      return;
    }

    const nextPreferences = await window.petShell.saveWorkbuddySecret({ apiKey });
    applyPreferenceState(nextPreferences || {});

    if (input instanceof HTMLInputElement) {
      input.value = "";
    }

    return;
  }

  if (action === "clear-workbuddy-secret") {
    const nextPreferences = await window.petShell.clearWorkbuddySecret();
    applyPreferenceState(nextPreferences || {});

    const input = workbenchStream.querySelector("#workbuddyApiKeyInput");

    if (input instanceof HTMLInputElement) {
      input.value = "";
    }

    return;
  }

  if (action === "import-custom-pet") {
    const nextPreferences = await window.petShell.importCustomPetImage();
    applyPreferenceState(nextPreferences || {});
    return;
  }

  if (action === "clear-custom-pet") {
    const nextPreferences = await window.petShell.clearCustomPetImage();
    applyPreferenceState(nextPreferences || {});
    return;
  }

  if (action === "set-avatar-kuribou" || action === "set-avatar-cat" || action === "set-avatar-custom") {
    const mode = action === "set-avatar-kuribou"
      ? "kuribou"
      : action === "set-avatar-cat"
        ? "cat"
        : "custom";
    const nextUi = await window.petShell.setAvatarMode({ mode });
    applyUiState(nextUi || {});
  }
}

async function handleWorkbenchPreferenceChange(event) {
  const target = event.target.closest("[data-pref-key]");

  if (!target) {
    return;
  }

  const key = target.dataset.prefKey || "";
  let value;

  if (target instanceof HTMLInputElement && target.type === "checkbox") {
    const checkedValue = target.dataset.prefValueChecked;
    const uncheckedValue = target.dataset.prefValueUnchecked;
    value = checkedValue || uncheckedValue
      ? target.checked
        ? checkedValue
        : uncheckedValue
      : target.checked;
  } else if (STRING_PREFERENCE_KEYS.has(key)) {
    value = target.value;
  } else {
    value = Number(target.value);
  }

  const patch = {
    [key]: value
  };

  if (key === "assistantMode") {
    patch.onboardingCompleted = true;
  }

  const nextPreferences = await window.petShell.updatePreferences(patch);
  applyPreferenceState(nextPreferences || {});

  if (key === "assistantMode" && value === "workbuddy") {
    window.setTimeout(() => {
      focusWorkbenchApiKeyInput();
    }, 32);
  }
}

async function runQuickAction(actionId) {
  const action = QUICK_ACTIONS.find((entry) => entry.id === actionId);

  if (!action || quickActionPendingId) {
    return;
  }

  quickActionPendingId = action.id;
  renderQuickActionsShell();
  renderWorkbench();

  try {
    const message = await window.petShell.sendChat({
      text: action.prompt,
      cloneId: action.cloneId
    });

    if (message) {
      pushMessage(message);
    }
  } finally {
    quickActionPendingId = "";
    renderQuickActionsShell();
    renderWorkbench();
  }
}

async function handleQuickActionClick(event) {
  const button = event.target.closest("button[data-quick-action-id]");

  if (!button) {
    return;
  }

  await runQuickAction(button.dataset.quickActionId || "");
}

function bindEvents() {
  chatCloseButton.addEventListener("click", () => {
    window.petShell.setPanels({ drawerOpen: false });
  });

  workbenchToggleButton.addEventListener("click", () => {
    window.petShell.setPanels({ workbenchOpen: !uiState.workbenchOpen });
  });

  workbenchCloseButton.addEventListener("click", () => {
    window.petShell.setPanels({ workbenchOpen: false });
  });

  diffToggleButton.addEventListener("click", async () => {
    const payload = await window.petShell.setDiffOpen({
      open: !uiState.diffOpen,
      cloneId: cloneState.selectedDiffCloneId
    });
    applyUiState(payload.ui);
    applyCloneState(payload.clones);
  });

  diffCloseButton.addEventListener("click", async () => {
    const payload = await window.petShell.setDiffOpen({
      open: false,
      cloneId: cloneState.selectedDiffCloneId
    });
    applyUiState(payload.ui);
    applyCloneState(payload.clones);
  });

  diffIndex.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-diff-entry-id]");

    if (!button) {
      return;
    }

    selectedDiffEntryId = button.dataset.diffEntryId || "";
    renderDiff();
  });

  cloneRack.addEventListener("click", handleCloneRackClick);
  quickActionShell.addEventListener("click", handleQuickActionClick);
  workbenchStream.addEventListener("click", handleWorkbenchAction);
  workbenchStream.addEventListener("click", handleQuickActionClick);
  workbenchStream.addEventListener("change", handleWorkbenchPreferenceChange);

  avatarToggleButton.addEventListener("click", async () => {
    const nextUiState = await window.petShell.setAvatarMode({
      mode: uiState.avatarMode === "cat" ? "kuribou" : "cat"
    });
    applyUiState(nextUiState || {});
  });

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleChatSubmit();
  });

  chatForm.addEventListener("click", () => {
    if (uiState.diffOpen) {
      return;
    }

    focusChatInput();
  });

  chatStream.addEventListener("click", () => {
    if (uiState.diffOpen) {
      return;
    }

    focusChatInput();
  });

  chatInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await handleChatSubmit();
    }
  });

  chatInput.addEventListener("input", () => {
    resizeChatInput();
  });

  if (chatResizeGrip) {
    let resizing = false;

    const finishResize = (event) => {
      if (!resizing) {
        return;
      }

      resizing = false;
      chatResizeGrip.releasePointerCapture?.(event.pointerId);
      window.petShell.endChatResize({
        screenX: event.screenX,
        screenY: event.screenY
      });
    };

    chatResizeGrip.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      resizing = true;
      chatResizeGrip.setPointerCapture?.(event.pointerId);
      window.petShell.beginChatResize({
        screenX: event.screenX,
        screenY: event.screenY
      });
    });

    chatResizeGrip.addEventListener("pointermove", (event) => {
      if (!resizing) {
        return;
      }

      window.petShell.updateChatResize({
        screenX: event.screenX,
        screenY: event.screenY
      });
    });

    chatResizeGrip.addEventListener("pointerup", finishResize);
    chatResizeGrip.addEventListener("pointercancel", finishResize);
  }

  window.addEventListener("resize", () => {
    resizeChatInput();
  });
}

async function bootstrap() {
  const initialState = await window.petShell.getBootstrapState();
  chatMessages = initialState.chat.messages || [];
  applyPreferenceState(initialState.preferences || {});
  applyMemoryState(initialState.memory || {});
  applyCloneState(initialState.clones);
  applyUiState(initialState.ui || {});
  applyPetState(initialState.petState);
  applyContextState(initialState.context || {});
  renderMessages();
  renderWorkbench();
  renderQuickActionsShell();
  resizeChatInput();
  bindEvents();
  focusChatInput();

  window.petShell.onStateChange((nextState) => {
    applyPetState(nextState);
  });

  window.petShell.onContextChange((nextContext) => {
    applyContextState(nextContext || {});
  });

  window.petShell.onPreferenceChange((nextPreferences) => {
    applyPreferenceState(nextPreferences || {});
  });

  window.petShell.onMemoryChange((nextMemory) => {
    applyMemoryState(nextMemory || {});
  });

  window.petShell.onChatMessage((message) => {
    pushMessage(message);
  });

  window.petShell.onCloneStateChange((nextCloneState) => {
    applyCloneState(nextCloneState);
  });

  window.petShell.onUiChange((nextUi) => {
    applyUiState(nextUi || {});
  });
}

bootstrap().catch((error) => {
  chatMeta.textContent = "对话框起身失败。";
  console.error(error);
});
