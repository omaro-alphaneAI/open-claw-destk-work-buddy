const fs = require("fs");
const path = require("path");
const { safeStorage } = require("electron");

const sessionSecrets = new Map();

function ensureDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readSecretEnvelope(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeSecretEnvelope(filePath, envelope) {
  ensureDirectory(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(envelope, null, 2)}\n`, "utf8");
}

function getSecretBackend() {
  const encryptionAvailable = typeof safeStorage?.isEncryptionAvailable === "function"
    ? safeStorage.isEncryptionAvailable()
    : false;
  const selectedBackend = typeof safeStorage?.getSelectedStorageBackend === "function"
    ? safeStorage.getSelectedStorageBackend()
    : "";
  const insecureBasicText = selectedBackend === "basic_text";

  return {
    encryptionAvailable,
    selectedBackend,
    canPersistSecurely: encryptionAvailable && !insecureBasicText,
    canPersistAtAll: encryptionAvailable,
    sessionOnly: !encryptionAvailable || insecureBasicText
  };
}

function getSecretMeta(filePath, secretKey) {
  const backend = getSecretBackend();
  const envelope = readSecretEnvelope(filePath);
  const encryptedEntry = envelope?.[secretKey];
  const hasSessionSecret = sessionSecrets.has(secretKey);
  const hasPersistedSecret = Boolean(encryptedEntry?.ciphertext);
  const configured = hasSessionSecret || hasPersistedSecret;
  const persistence = hasPersistedSecret
    ? "device"
    : hasSessionSecret
      ? "session"
      : "none";
  const summary = configured
    ? persistence === "device"
      ? "API key 已安全保存在本机系统加密存储里。"
      : "API key 只保留在当前会话里；关闭应用后需要重新输入。"
    : "还没有保存 API key。";

  return {
    configured,
    persistence,
    summary,
    backend: backend.selectedBackend || (backend.encryptionAvailable ? "default" : "unavailable"),
    canPersistSecurely: backend.canPersistSecurely
  };
}

function readSecret(filePath, secretKey) {
  if (sessionSecrets.has(secretKey)) {
    return sessionSecrets.get(secretKey);
  }

  const backend = getSecretBackend();

  if (!backend.canPersistSecurely) {
    return "";
  }

  try {
    const envelope = readSecretEnvelope(filePath);
    const encryptedEntry = envelope?.[secretKey];

    if (!encryptedEntry?.ciphertext) {
      return "";
    }

    const decrypted = safeStorage.decryptString(Buffer.from(encryptedEntry.ciphertext, "base64"));
    return typeof decrypted === "string" ? decrypted : "";
  } catch {
    return "";
  }
}

function writeSecret(filePath, secretKey, value) {
  const cleanValue = typeof value === "string" ? value.trim() : "";

  if (!cleanValue) {
    clearSecret(filePath, secretKey);
    return getSecretMeta(filePath, secretKey);
  }

  const backend = getSecretBackend();
  const envelope = readSecretEnvelope(filePath);

  if (backend.canPersistSecurely) {
    const encrypted = safeStorage.encryptString(cleanValue);
    envelope[secretKey] = {
      ciphertext: encrypted.toString("base64"),
      updatedAt: Date.now()
    };
    writeSecretEnvelope(filePath, envelope);
    sessionSecrets.delete(secretKey);
    return getSecretMeta(filePath, secretKey);
  }

  sessionSecrets.set(secretKey, cleanValue);
  return getSecretMeta(filePath, secretKey);
}

function clearSecret(filePath, secretKey) {
  sessionSecrets.delete(secretKey);
  const envelope = readSecretEnvelope(filePath);

  if (Object.prototype.hasOwnProperty.call(envelope, secretKey)) {
    delete envelope[secretKey];
    writeSecretEnvelope(filePath, envelope);
  }

  return getSecretMeta(filePath, secretKey);
}

module.exports = {
  clearSecret,
  getSecretBackend,
  getSecretMeta,
  readSecret,
  writeSecret
};
