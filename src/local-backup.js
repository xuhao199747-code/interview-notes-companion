const SCHEMA_VERSION = 1;

function normalizeDocuments(documents) {
  if (!Array.isArray(documents)) throw new Error("备份资料格式无效");
  const normalized = documents.map((document) => {
    if (!document || typeof document.name !== "string" || !document.name.trim() || typeof document.markdown !== "string") {
      throw new Error("备份资料格式无效");
    }
    return {
      name: document.name.trim(),
      markdown: document.markdown,
      type: typeof document.type === "string" && document.type.trim() ? document.type.trim() : "knowledge"
    };
  });
  if (new Set(normalized.map((document) => document.name)).size !== normalized.length) throw new Error("备份资料存在重名文件");
  return normalized;
}

function normalizeFile(value, label) {
  if (value == null) return null;
  if (!value || typeof value.name !== "string" || !value.name.trim() || typeof value.markdown !== "string" || !value.markdown.trim()) {
    throw new Error(`备份${label}格式无效`);
  }
  return { name: value.name.trim(), markdown: value.markdown };
}

function normalizePreferences(value) {
  const preferences = value && typeof value === "object" ? value : {};
  return {
    questionCaptureHotkey: typeof preferences.questionCaptureHotkey === "string" ? preferences.questionCaptureHotkey.trim() : "",
    activeProjectId: typeof preferences.activeProjectId === "string" ? preferences.activeProjectId.trim() : ""
  };
}

export function createLocalBackup({ documents = [], glossary = null, rules = null, preferences = {} } = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    documents: normalizeDocuments(documents),
    glossary: normalizeFile(glossary, "术语表"),
    rules: normalizeFile(rules, "回答规则"),
    preferences: normalizePreferences(preferences)
  };
}

export function parseLocalBackup(value) {
  if (!value || typeof value !== "object") throw new Error("备份文件无效");
  if (value.schemaVersion !== SCHEMA_VERSION) throw new Error("备份版本不兼容");
  return {
    documents: normalizeDocuments(value.documents),
    glossary: normalizeFile(value.glossary, "术语表"),
    rules: normalizeFile(value.rules, "回答规则"),
    preferences: normalizePreferences(value.preferences)
  };
}
