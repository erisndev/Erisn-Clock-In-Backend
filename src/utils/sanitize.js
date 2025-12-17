// src/utils/sanitize.js
// XSS sanitization utility using sanitize-html

import sanitizeHtml from "sanitize-html";

// Strip all HTML tags for plain text output
export function stripHtml(value) {
  if (!value) return "";
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

// Allow basic formatting tags (for rich text if needed)
export function sanitizeRichText(value) {
  if (!value) return "";
  return sanitizeHtml(value, {
    allowedTags: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li"],
    allowedAttributes: {},
  }).trim();
}

// Sanitize an object's string fields
export function sanitizeFields(obj, fields) {
  const result = { ...obj };
  for (const field of fields) {
    if (typeof result[field] === "string") {
      result[field] = stripHtml(result[field]);
    }
  }
  return result;
}

export default { stripHtml, sanitizeRichText, sanitizeFields };
