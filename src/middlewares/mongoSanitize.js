// src/middlewares/mongoSanitize.js
// Custom MongoDB query sanitization middleware compatible with Express 5
// Removes $ and . from keys to prevent NoSQL injection

/**
 * Recursively sanitize an object by removing keys that start with $ or contain .
 * @param {any} obj - Object to sanitize
 * @returns {any} - Sanitized object
 */
function sanitize(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  if (typeof obj === "object") {
    const sanitized = {};
    for (const key of Object.keys(obj)) {
      // Skip keys that start with $ or contain .
      if (key.startsWith("$") || key.includes(".")) {
        continue;
      }
      sanitized[key] = sanitize(obj[key]);
    }
    return sanitized;
  }

  // For strings, remove any MongoDB operators
  if (typeof obj === "string") {
    // Remove $where and other dangerous patterns
    if (obj.includes("$where") || obj.includes("$gt") || obj.includes("$lt") || 
        obj.includes("$ne") || obj.includes("$in") || obj.includes("$or") ||
        obj.includes("$and") || obj.includes("$regex")) {
      return "";
    }
  }

  return obj;
}

/**
 * Express middleware to sanitize req.body and req.params
 * Note: req.query is read-only in Express 5, so we sanitize it differently
 */
export function mongoSanitizeMiddleware(req, res, next) {
  // Sanitize body
  if (req.body && typeof req.body === "object") {
    req.body = sanitize(req.body);
  }

  // Sanitize params
  if (req.params && typeof req.params === "object") {
    for (const key of Object.keys(req.params)) {
      if (typeof req.params[key] === "string") {
        // Remove dangerous characters from params
        req.params[key] = req.params[key].replace(/[$.]/, "");
      }
    }
  }

  // For query params in Express 5, we can't modify req.query directly
  // Instead, we'll add a sanitized version to req.sanitizedQuery
  if (req.query && typeof req.query === "object") {
    req.sanitizedQuery = sanitize({ ...req.query });
  }

  next();
}

export default mongoSanitizeMiddleware;
