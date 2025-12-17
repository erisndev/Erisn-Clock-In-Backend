// src/utils/logger.js
// Centralized logger with requestId and userId support

const formatMeta = (meta) => {
  if (!meta) return "";
  if (typeof meta === "string") return meta;
  if (meta instanceof Error) return `${meta.message}\n${meta.stack}`;
  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
};

const logger = {
  info: (msg, meta) => {
    const ts = new Date().toISOString();
    console.log(`[${ts}] [INFO] ${msg}`, formatMeta(meta));
  },
  warn: (msg, meta) => {
    const ts = new Date().toISOString();
    console.warn(`[${ts}] [WARN] ${msg}`, formatMeta(meta));
  },
  error: (msg, meta) => {
    const ts = new Date().toISOString();
    console.error(`[${ts}] [ERROR] ${msg}`, formatMeta(meta));
  },
  debug: (msg, meta) => {
    if (process.env.NODE_ENV === "development") {
      const ts = new Date().toISOString();
      console.log(`[${ts}] [DEBUG] ${msg}`, formatMeta(meta));
    }
  },
  // Create a child logger with context (requestId, userId)
  child: (context = {}) => ({
    info: (msg, meta) => logger.info(msg, { ...context, ...meta }),
    warn: (msg, meta) => logger.warn(msg, { ...context, ...meta }),
    error: (msg, meta) => logger.error(msg, { ...context, ...meta }),
    debug: (msg, meta) => logger.debug(msg, { ...context, ...meta }),
  }),
};

export default logger;
