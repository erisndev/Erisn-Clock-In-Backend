// src/middlewares/requestId.js
// Adds a unique requestId to each request for log correlation

import crypto from "crypto";

export function requestIdMiddleware(req, res, next) {
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
}

export default requestIdMiddleware;
