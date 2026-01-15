// src/utils/debugLog.js

import logger from "./logger.js";

function parseEnvBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const v = String(value).trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "y" || v === "on";
}

/**
 * Central switch for verbose/debug logs.
 *
 * Enable by setting in .env:
 *   DEBUG_LOGS=true
 */
export function isDebugLogsEnabled() {
  return parseEnvBool(process.env.DEBUG_LOGS, false);
}

/**
 * Debug log wrapper that can be enabled/disabled via DEBUG_LOGS env var.
 * Uses the normal logger underneath.
 */
export function debugLog(message, meta) {
  if (!isDebugLogsEnabled()) return;
  if (meta !== undefined) logger.info(message, meta);
  else logger.info(message);
}
