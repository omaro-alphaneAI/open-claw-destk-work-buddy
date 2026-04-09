const fs = require("fs");
const path = require("path");

const runtimeDir = path.join(__dirname, "..", "runtime");
const contextFilePath = path.join(runtimeDir, "shell-context.json");
const VALID_ARTIFACT_KINDS = new Set(["markdown", "code", "text"]);
const VALID_APPROVAL_RISKS = new Set(["low", "medium", "high"]);

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token
      .slice(2)
      .replace(/-([a-z])/g, (_match, char) => char.toUpperCase());
    const value = argv[index + 1];
    parsed[key] = value;
    index += 1;
  }

  return parsed;
}

function buildIntent(args) {
  const title = typeof args.title === "string" ? args.title.trim() : "";
  const summary = typeof args.summary === "string" ? args.summary.trim() : "";

  if (!title && !summary) {
    return undefined;
  }

  const labels = typeof args.steps === "string" && args.steps.trim()
    ? args.steps.split("|").map((entry) => entry.trim()).filter(Boolean)
    : [];

  return {
    title: title || "外部上下文",
    summary: summary || "通过 shell-context.json 注入的上下文。",
    steps: labels.map((label, index) => ({
      label,
      status: index === 0 ? "active" : "pending"
    }))
  };
}

function buildTool(args) {
  const name = typeof args.tool === "string" ? args.tool.trim() : "";

  if (!name) {
    return undefined;
  }

  return {
    name,
    target: typeof args.target === "string" ? args.target.trim() : "",
    detail: typeof args.detail === "string" ? args.detail.trim() : "",
    status: typeof args.toolStatus === "string" && args.toolStatus.trim() ? args.toolStatus.trim() : "active"
  };
}

function buildArtifact(args) {
  const content = typeof args.artifactContent === "string" ? args.artifactContent.trim() : "";

  if (!content) {
    return undefined;
  }

  return {
    title: typeof args.artifactTitle === "string" && args.artifactTitle.trim()
      ? args.artifactTitle.trim()
      : "Manual artifact",
    kind: typeof args.artifactKind === "string" && VALID_ARTIFACT_KINDS.has(args.artifactKind.trim())
      ? args.artifactKind.trim()
      : "markdown",
    content,
    updatedAt: Date.now()
  };
}

function buildApproval(args) {
  const title = typeof args.approvalTitle === "string" ? args.approvalTitle.trim() : "";
  const command = typeof args.command === "string" ? args.command.trim() : "";

  if (!title && !command) {
    return undefined;
  }

  return {
    id: `approval-${Date.now()}`,
    title: title || "外部审批请求",
    risk: typeof args.risk === "string" && VALID_APPROVAL_RISKS.has(args.risk.trim())
      ? args.risk.trim()
      : "high",
    detail: typeof args.approvalDetail === "string" ? args.approvalDetail.trim() : "",
    command
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const clear = typeof args.clear === "string" ? args.clear.trim() : "";
  const payload = {
    id: `ctx-${Date.now()}`
  };

  if (typeof args.mode === "string" && args.mode.trim()) {
    payload.mode = args.mode.trim();
  }

  if (typeof args.presence === "string" && args.presence.trim()) {
    payload.presence = args.presence.trim();
  }

  const intent = buildIntent(args);
  const tool = buildTool(args);
  const artifact = buildArtifact(args);
  const approval = buildApproval(args);

  if (intent) {
    payload.intent = intent;
  }

  if (tool) {
    payload.tool = tool;
  }

  if (artifact) {
    payload.artifact = artifact;
  }

  if (approval) {
    payload.approval = approval;
  }

  if (clear === "artifact" || clear === "all") {
    payload.artifact = null;
  }

  if (clear === "approval" || clear === "all") {
    payload.approval = null;
  }

  if (clear === "all") {
    payload.intent = null;
    payload.tool = null;
  }

  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(contextFilePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  process.stdout.write(`Wrote shell context to ${contextFilePath}\n`);
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main();
