const fs = require("fs");
const path = require("path");

const runtimeDir = path.join(__dirname, "..", "runtime");
const eventFilePath = path.join(runtimeDir, "pet-events.json");
const validStatuses = new Set(["idle", "thinking", "done", "alert"]);

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

function buildPayload(args) {
  const status = validStatuses.has(args.status) ? args.status : "done";
  const message = typeof args.message === "string" && args.message.trim()
    ? args.message.trim()
    : defaultMessage(status);
  const ttlMs = Number.isFinite(Number(args.ttlMs))
    ? Math.max(1200, Math.min(12000, Number(args.ttlMs)))
    : 4200;

  return {
    id: `evt-${Date.now()}`,
    status,
    message,
    ttlMs,
    source: "cli"
  };
}

function defaultMessage(status) {
  switch (status) {
    case "idle":
      return "我在，先让 beat 走着。";
    case "thinking":
      return "先别 cut 我，我在对 bars。";
    case "alert":
      return "前头有杂音，我先给你压住。";
    case "done":
    default:
      return "这段 verse，我给你落稳了。";
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const payload = buildPayload(args);

  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(`${eventFilePath}`, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  process.stdout.write(`Sent event to ${eventFilePath}\n`);
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main();
