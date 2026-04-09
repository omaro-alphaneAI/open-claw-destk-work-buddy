const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { readPreferenceStateFromFile } = require("../src/main/pet-preferences");
const {
  buildReplyTarget,
  buildSessionId,
  getOpenClawTransport,
  resolveOpenClawLaunch
} = require("../src/main/openclaw-runtime");

const runtimeDir = path.join(__dirname, "..", "runtime");
const outboxFilePath = path.join(runtimeDir, "chat-outbox.jsonl");
const transcriptFilePath = path.join(runtimeDir, "chat-transcript.jsonl");
const preferencesFilePath = path.join(runtimeDir, "pet-preferences.json");
const cloneCatalog = {
  "main-cat": { agentId: "main", name: "小七" },
  "builder-cat": { agentId: "builder-cat", name: "补丁猫" },
  "scout-cat": { agentId: "scout-cat", name: "侦查猫" },
  "ops-cat": { agentId: "ops-cat", name: "巡航猫" }
};

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const value = argv[index + 1];
    parsed[key] = value;
    index += 1;
  }

  return parsed;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const text = typeof args.text === "string" ? args.text.trim() : "";
  const cloneId = typeof args.clone === "string" && args.clone.trim()
    ? args.clone.trim()
    : "main-cat";
  const clone = cloneCatalog[cloneId] || cloneCatalog["main-cat"];
  const preferences = readPreferenceStateFromFile(preferencesFilePath);
  const transport = getOpenClawTransport(preferences);
  const agentId = cloneId === "main-cat"
    ? transport.defaultAgentId || clone.agentId
    : clone.agentId || transport.defaultAgentId || "main";
  const replyTo = buildReplyTarget(transport.replyToPrefix, cloneId);
  const sessionId = buildSessionId(transport.sessionPrefix, cloneId);

  if (!text) {
    process.stderr.write("Usage: npm run chat:send -- --text \"你好\"\n");
    process.exit(1);
  }

  if (!transport.ready) {
    process.stderr.write(`${transport.statusSummary}\n`);
    process.stderr.write(`请先更新 ${preferencesFilePath}\n`);
    process.exit(1);
  }

  const createdAt = Date.now();
  const payload = {
    id: `user-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    role: "user",
    text,
    status: "thinking",
    createdAt,
    source: "cli",
    channel: transport.replyChannel,
    senderId: "owner",
    cloneId,
    cloneName: clone.name,
    chatId: replyTo
  };

  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.appendFileSync(outboxFilePath, `${JSON.stringify(payload)}\n`, "utf8");
  fs.appendFileSync(transcriptFilePath, `${JSON.stringify(payload)}\n`, "utf8");

  process.stdout.write(`Queued chat message to ${outboxFilePath}\n`);
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);

  const launch = resolveOpenClawLaunch(preferences, {
    agentId,
    sessionId,
    messageText: text,
    replyTo
  });
  const child = spawn(launch.command, launch.args, {
    cwd: launch.cwd,
    env: process.env,
    stdio: "inherit"
  });

  child.on("error", (error) => {
    process.stderr.write(`${error.message || String(error)}\n`);
    process.exit(1);
  });

  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

main();
