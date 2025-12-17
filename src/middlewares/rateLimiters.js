// src/middlewares/rateLimiters.js
// Targeted rate limiters for sensitive endpoints

import rateLimit from "express-rate-limit";

// General API limiter (fallback)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

// Register: 5 requests per minute per IP
export const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many registration attempts. Please wait a minute." },
});

// Login: 10 requests per minute per IP
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts. Please wait a minute." },
});

// Resend OTP: 3 requests per 10 minutes per email
// Using validate: false to skip IPv6 validation since we're keying by email
export const resendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.body?.email?.toLowerCase() || "unknown",
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  validate: { xForwardedForHeader: false, default: true },
  message: { success: false, message: "Too many OTP requests. Please wait 10 minutes." },
});

// Forgot password: 3 requests per 10 minutes per email
export const forgotPasswordLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.body?.email?.toLowerCase() || "unknown",
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  validate: { xForwardedForHeader: false, default: true },
  message: { success: false, message: "Too many password reset requests. Please wait 10 minutes." },
});

// Verify OTP: 5 requests per 10 minutes per email
export const verifyOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body?.email?.toLowerCase() || "unknown",
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  validate: { xForwardedForHeader: false, default: true },
  message: { success: false, message: "Too many verification attempts. Please wait." },
});

export default {
  generalLimiter,
  registerLimiter,
  loginLimiter,
  resendOtpLimiter,
  forgotPasswordLimiter,
  verifyOtpLimiter,
};
