// src/utils/logger.js

// ✅ CHANGE #1 — Convert from module.exports to ESM export default
const logger = {
  info: (msg, meta) => console.log("[INFO]", msg, meta || ""),
  warn: (msg, meta) => console.warn("[WARN]", msg, meta || ""),
  error: (msg, meta) => console.error("[ERROR]", msg, meta || "")
};

// ✅ CHANGE #2 — Add default export
export default logger;
