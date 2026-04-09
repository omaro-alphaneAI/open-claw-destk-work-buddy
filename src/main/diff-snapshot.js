const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");

const DEFAULT_TIMEOUT_MS = 15_000;

function readTextFile(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function truncateText(text, limit) {
  const cleanText = typeof text === "string" ? text.trim() : "";

  if (!cleanText || cleanText.length <= limit) {
    return cleanText;
  }

  return `${cleanText.slice(0, limit - 1)}...`;
}

function safeRelativePath(rootDir, targetPath) {
  const relativePath = path.relative(rootDir, targetPath);
  return relativePath || path.basename(targetPath);
}

function runGitOutput(repoPath, args) {
  try {
    return execFileSync("git", ["-C", repoPath, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch (error) {
    const stdout = typeof error.stdout === "string"
      ? error.stdout
      : error.stdout?.toString?.() || "";

    return stdout.trim();
  }
}

function isTextSnapshotFile(filePath, textDiffExtensions) {
  return textDiffExtensions.has(path.extname(filePath).toLowerCase());
}

function listTextSnapshotFiles(rootDir, config, depth = 0, results = []) {
  if (depth > config.textScanDepth) {
    return results;
  }

  let entries = [];

  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      if (config.scanIgnoredDirs.has(entry.name)) {
        continue;
      }

      listTextSnapshotFiles(entryPath, config, depth + 1, results);
      continue;
    }

    if (!entry.isFile() || !isTextSnapshotFile(entryPath, config.textDiffExtensions)) {
      continue;
    }

    const stats = fs.statSync(entryPath);

    if (stats.size > config.maxTextSnapshotBytes) {
      continue;
    }

    results.push(entryPath);
  }

  return results;
}

function captureTextTreeSnapshot(rootDir, config) {
  return listTextSnapshotFiles(rootDir, config).map((filePath) => ({
    relPath: safeRelativePath(rootDir, filePath),
    content: readTextFile(filePath)
  }));
}

function writeTempSnapshotFile(prefix, content) {
  const tempPath = path.join(
    os.tmpdir(),
    `pet-shell-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`
  );

  fs.writeFileSync(tempPath, content, "utf8");
  return tempPath;
}

function buildNoIndexDiff(beforeContent, afterContent, relPath) {
  const beforeFile = writeTempSnapshotFile("before", beforeContent);
  const afterFile = writeTempSnapshotFile("after", afterContent);

  try {
    return execFileSync(
      "git",
      [
        "diff",
        "--no-index",
        "--no-ext-diff",
        "--unified=2",
        "--label",
        `a/${relPath}`,
        "--label",
        `b/${relPath}`,
        beforeFile,
        afterFile
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }
    ).trim();
  } catch (error) {
    const stdout = typeof error.stdout === "string"
      ? error.stdout
      : error.stdout?.toString?.() || "";

    return stdout.trim();
  } finally {
    try {
      fs.unlinkSync(beforeFile);
    } catch {}

    try {
      fs.unlinkSync(afterFile);
    } catch {}
  }
}

function buildTextDiffSnapshot(baseFiles, rootDir, config) {
  const beforeMap = new Map(baseFiles.map((entry) => [entry.relPath, entry.content]));
  const afterFiles = captureTextTreeSnapshot(rootDir, config);
  const afterMap = new Map(afterFiles.map((entry) => [entry.relPath, entry.content]));
  const relPaths = new Set([...beforeMap.keys(), ...afterMap.keys()]);
  const changedFiles = [];

  for (const relPath of relPaths) {
    const beforeContent = beforeMap.get(relPath) || "";
    const afterContent = afterMap.get(relPath) || "";

    if (beforeContent === afterContent) {
      continue;
    }

    let changeType = "modified";

    if (!beforeMap.has(relPath)) {
      changeType = "added";
    } else if (!afterMap.has(relPath)) {
      changeType = "deleted";
    }

    changedFiles.push({
      relPath,
      changeType,
      patch: truncateText(
        buildNoIndexDiff(beforeContent, afterContent, relPath),
        config.maxTextPatchChars
      )
    });
  }

  return changedFiles;
}

function listGitRepos(rootDir, config, depth = 0, results = []) {
  if (depth > config.gitScanDepth) {
    return results;
  }

  let entries = [];

  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return results;
  }

  const hasGitDir = entries.some((entry) => entry.isDirectory() && entry.name === ".git");

  if (hasGitDir) {
    results.push(rootDir);
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (config.scanIgnoredDirs.has(entry.name)) {
      continue;
    }

    listGitRepos(path.join(rootDir, entry.name), config, depth + 1, results);
  }

  return results;
}

function captureGitSignature(workspaceDir, config) {
  const repos = Array.from(new Set(listGitRepos(workspaceDir, config)));

  return repos.map((repoPath) => ({
    repoPath,
    status: runGitOutput(repoPath, ["status", "--short"])
  }));
}

function buildGitDiffRepos(baseSignature, workspaceDir, config) {
  const beforeMap = new Map(baseSignature.map((entry) => [entry.repoPath, entry.status]));
  const afterSignature = captureGitSignature(workspaceDir, config);
  const repos = [];

  for (const entry of afterSignature) {
    if (entry.status === (beforeMap.get(entry.repoPath) || "")) {
      continue;
    }

    const patch = [
      runGitOutput(entry.repoPath, ["diff", "--no-ext-diff", "--unified=2"]),
      runGitOutput(entry.repoPath, ["diff", "--cached", "--no-ext-diff", "--unified=2"])
    ]
      .filter(Boolean)
      .join("\n\n");

    repos.push({
      repoName: path.basename(entry.repoPath),
      repoPath: entry.repoPath,
      statusLines: entry.status.split("\n").filter(Boolean).slice(0, 48),
      stat: [
        runGitOutput(entry.repoPath, ["diff", "--stat", "--no-ext-diff"]),
        runGitOutput(entry.repoPath, ["diff", "--cached", "--stat", "--no-ext-diff"])
      ]
        .filter(Boolean)
        .join("\n"),
      patch: truncateText(patch, config.maxGitPatchChars)
    });
  }

  return repos;
}

function normalizeConfig(payload = {}) {
  return {
    workspaceDir: payload.workspaceDir,
    rootDir: payload.rootDir,
    textDiffExtensions: new Set(Array.isArray(payload.textDiffExtensions) ? payload.textDiffExtensions : []),
    scanIgnoredDirs: new Set(Array.isArray(payload.scanIgnoredDirs) ? payload.scanIgnoredDirs : []),
    textScanDepth: Number.isFinite(Number(payload.textScanDepth)) ? Number(payload.textScanDepth) : 4,
    gitScanDepth: Number.isFinite(Number(payload.gitScanDepth)) ? Number(payload.gitScanDepth) : 4,
    maxTextSnapshotBytes: Number.isFinite(Number(payload.maxTextSnapshotBytes)) ? Number(payload.maxTextSnapshotBytes) : 80_000,
    maxTextPatchChars: Number.isFinite(Number(payload.maxTextPatchChars)) ? Number(payload.maxTextPatchChars) : 14_000,
    maxGitPatchChars: Number.isFinite(Number(payload.maxGitPatchChars)) ? Number(payload.maxGitPatchChars) : 14_000
  };
}

function captureCloneBaseSnapshotSync(payload = {}) {
  const config = normalizeConfig(payload);

  return {
    textFiles: captureTextTreeSnapshot(config.rootDir, config),
    gitRepos: captureGitSignature(config.workspaceDir, config)
  };
}

function buildCloneDiffSnapshotSync(payload = {}) {
  const config = normalizeConfig(payload);
  const baseSnapshot = payload.baseSnapshot || { textFiles: [], gitRepos: [] };
  const textFiles = buildTextDiffSnapshot(baseSnapshot.textFiles || [], config.rootDir, config);
  const repos = buildGitDiffRepos(baseSnapshot.gitRepos || [], config.workspaceDir, config);
  const summary = textFiles.length || repos.length
    ? `抓到 ${textFiles.length} 个桌宠文件改动，${repos.length} 个 git 仓库状态变化。`
    : "这轮没抓到新的代码改动。";

  return {
    generatedAt: Date.now(),
    summary,
    textFiles,
    repos
  };
}

function runWorkerTask(task, payload = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, {
      workerData: {
        task,
        payload
      }
    });
    let settled = false;
    const finish = (callback) => (value) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    const timer = setTimeout(() => {
      worker.terminate().catch(() => {});
      finish(reject)(new Error(`diff snapshot worker timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    worker.once("message", finish((message) => {
      if (message?.ok) {
        resolve(message.result);
        return;
      }

      reject(new Error(message?.error?.message || "diff snapshot worker failed"));
    }));
    worker.once("error", finish(reject));
    worker.once("exit", finish((code) => {
      if (code === 0) {
        return;
      }

      reject(new Error(`diff snapshot worker exited with code ${code}`));
    }));
  });
}

function captureCloneBaseSnapshotAsync(payload = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return runWorkerTask("capture-base", payload, timeoutMs);
}

function buildCloneDiffSnapshotAsync(payload = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return runWorkerTask("build-diff", payload, timeoutMs);
}

if (!isMainThread) {
  try {
    const task = workerData?.task;
    const payload = workerData?.payload || {};
    const result = task === "capture-base"
      ? captureCloneBaseSnapshotSync(payload)
      : buildCloneDiffSnapshotSync(payload);

    parentPort.postMessage({
      ok: true,
      result
    });
  } catch (error) {
    parentPort.postMessage({
      ok: false,
      error: {
        message: error?.message || String(error),
        stack: error?.stack || ""
      }
    });
  }
} else {
  module.exports = {
    buildCloneDiffSnapshotAsync,
    captureCloneBaseSnapshotAsync
  };
}
