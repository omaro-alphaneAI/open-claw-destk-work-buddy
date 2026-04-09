const fs = require("fs");
const path = require("path");

const runtimeDir = path.join(__dirname, "..", "runtime");
const ambientFilePath = path.join(runtimeDir, "ambient-events.jsonl");
const VALID_LEVELS = new Set(["quiet", "suggest", "critical"]);

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
  const message = typeof args.message === "string" ? args.message.trim() : "";

  if (!message) {
    process.stderr.write("Usage: npm run nudge:send -- --message \"机器有点热\" [--title \"系统负载\"] [--level suggest]\n");
    process.exit(1);
  }

  const createdAt = Date.now();
  const requestedLevel = typeof args.level === "string" ? args.level.trim() : "";
  const payload = {
    id: `ambient-${createdAt}`,
    title: typeof args.title === "string" && args.title.trim() ? args.title.trim() : "环境提示",
    message,
    level: VALID_LEVELS.has(requestedLevel) ? requestedLevel : "suggest",
    source: typeof args.source === "string" && args.source.trim() ? args.source.trim() : "cli",
    createdAt
  };

  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.appendFileSync(ambientFilePath, `${JSON.stringify(payload)}\n`, "utf8");

  process.stdout.write(`Queued ambient event to ${ambientFilePath}\n`);
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main();
