const fs = require("fs");
const path = require("path");

const runtimeDir = path.join(__dirname, "..", "runtime");
const reminderFilePath = path.join(runtimeDir, "reminder-events.jsonl");
const VALID_LEVELS = new Set(["quiet", "suggest", "critical"]);

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

function parseDueAt(args) {
  if (Number.isFinite(Number(args.dueAt))) {
    return Number(args.dueAt);
  }

  if (Number.isFinite(Number(args.afterMinutes))) {
    return Date.now() + (Number(args.afterMinutes) * 60 * 1000);
  }

  return Date.now();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const message = typeof args.message === "string" ? args.message.trim() : "";

  if (!message) {
    process.stderr.write("Usage: npm run reminder:send -- --message \"10 分钟后开会\" [--title \"会议提醒\"] [--after-minutes 10]\n");
    process.exit(1);
  }

  const createdAt = Date.now();
  const requestedLevel = typeof args.level === "string" ? args.level.trim() : "";
  const payload = {
    id: `reminder-${createdAt}`,
    title: typeof args.title === "string" && args.title.trim() ? args.title.trim() : "提醒",
    message,
    level: VALID_LEVELS.has(requestedLevel) ? requestedLevel : "suggest",
    source: typeof args.source === "string" && args.source.trim() ? args.source.trim() : "cli",
    createdAt,
    dueAt: parseDueAt(args),
    notify: args.notify === "false" ? false : true
  };

  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.appendFileSync(reminderFilePath, `${JSON.stringify(payload)}\n`, "utf8");

  process.stdout.write(`Queued reminder event to ${reminderFilePath}\n`);
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main();
