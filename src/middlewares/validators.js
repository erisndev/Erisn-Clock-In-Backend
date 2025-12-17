// src/middlewares/validators.js
// Centralized validation schemas using express-validator

import { body, param, query, validationResult } from "express-validator";

// Middleware to check validation results
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ==================== AUTH ====================

export const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/\d/)
    .withMessage("Password must contain a number"),
  body("cellNumber")
    .trim()
    .notEmpty()
    .withMessage("Cell number is required")
    .matches(/^[+]?[\d\s-]{10,15}$/)
    .withMessage("Invalid cell number format"),
  // Department is required only for graduates (not admins)
  body("department")
    .if(body("role").not().equals("admin"))
    .trim()
    .notEmpty()
    .withMessage("Department is required for graduates")
    .isLength({ max: 100 })
    .withMessage("Department name too long"),
  // Province is required only for graduates (not admins)
  body("province")
    .if(body("role").not().equals("admin"))
    .trim()
    .notEmpty()
    .withMessage("Province is required for graduates")
    .isLength({ max: 100 })
    .withMessage("Province name too long"),
  // Optional role field
  body("role")
    .optional()
    .isIn(["graduate", "admin"])
    .withMessage("Role must be graduate or admin"),
  validate,
];

export const loginValidation = [
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email required"),
  body("password").notEmpty().withMessage("Password is required"),
  validate,
];

export const verifyOtpValidation = [
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email required"),
  body("otp").trim().isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  validate,
];

export const resendOtpValidation = [
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email required"),
  validate,
];

export const forgotPasswordValidation = [
  body("email").trim().isEmail().normalizeEmail().withMessage("Valid email required"),
  validate,
];

export const resetPasswordValidation = [
  param("token").notEmpty().withMessage("Token is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
    .matches(/\d/)
    .withMessage("Password must contain a number"),
  validate,
];

// ==================== ATTENDANCE ====================

export const clockInValidation = [
  // Optional: validate location or notes if your model uses them
  validate,
];

export const clockOutValidation = [
  // Optional: validate notes
  validate,
];

// ==================== WEEKLY REPORTS ====================

export const submitReportValidation = [
  body("weekStart")
    .notEmpty()
    .withMessage("weekStart is required")
    .isISO8601()
    .withMessage("weekStart must be a valid date"),
  body("weekEnd")
    .notEmpty()
    .withMessage("weekEnd is required")
    .isISO8601()
    .withMessage("weekEnd must be a valid date")
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.weekStart)) {
        throw new Error("weekEnd must be after weekStart");
      }
      return true;
    }),
  body("summary")
    .trim()
    .notEmpty()
    .withMessage("Summary is required")
    .isLength({ max: 5000 })
    .withMessage("Summary too long"),
  body("challenges").optional().trim().isLength({ max: 5000 }).withMessage("Challenges too long"),
  body("learnings").optional().trim().isLength({ max: 5000 }).withMessage("Learnings too long"),
  body("nextWeek").optional().trim().isLength({ max: 5000 }).withMessage("Next week goals too long"),
  body("goals").optional().trim().isLength({ max: 5000 }).withMessage("Goals too long"),
  validate,
];

export const updateReportValidation = [
  param("id").isMongoId().withMessage("Invalid report ID"),
  body("weekStart").optional().isISO8601().withMessage("weekStart must be a valid date"),
  body("weekEnd")
    .optional()
    .isISO8601()
    .withMessage("weekEnd must be a valid date")
    .custom((value, { req }) => {
      const start = req.body.weekStart;
      if (start && new Date(value) < new Date(start)) {
        throw new Error("weekEnd must be after weekStart");
      }
      return true;
    }),
  body("summary").optional().trim().isLength({ max: 5000 }).withMessage("Summary too long"),
  body("challenges").optional().trim().isLength({ max: 5000 }).withMessage("Challenges too long"),
  body("learnings").optional().trim().isLength({ max: 5000 }).withMessage("Learnings too long"),
  body("nextWeek").optional().trim().isLength({ max: 5000 }).withMessage("Next week goals too long"),
  body("goals").optional().trim().isLength({ max: 5000 }).withMessage("Goals too long"),
  validate,
];

// ==================== ADMIN REVIEW ====================

export const reviewReportValidation = [
  param("id").isMongoId().withMessage("Invalid report ID"),
  body("reviewComment").optional().trim().isLength({ max: 2000 }).withMessage("Comment too long"),
  validate,
];

// ==================== USER PREFERENCES ====================

export const updatePreferencesValidation = [
  body("timezone").optional().trim().isLength({ max: 100 }).withMessage("Invalid timezone"),
  body("notificationChannels")
    .optional()
    .isArray()
    .withMessage("notificationChannels must be an array")
    .custom((arr) => {
      const allowed = ["email", "webpush"];
      for (const ch of arr) {
        if (!allowed.includes(ch)) throw new Error(`Invalid channel: ${ch}`);
      }
      return true;
    }),
  body("emailFrequency")
    .optional()
    .isIn(["immediate", "daily", "weekly"])
    .withMessage("Invalid emailFrequency"),
  validate,
];

// ==================== NOTIFICATIONS ====================

export const markNotificationReadValidation = [
  param("id").isMongoId().withMessage("Invalid notification ID"),
  validate,
];

export const listNotificationsValidation = [
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("Limit must be 1-100"),
  query("cursor").optional().isMongoId().withMessage("Invalid cursor"),
  validate,
];

export default {
  validate,
  registerValidation,
  loginValidation,
  verifyOtpValidation,
  resendOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  clockInValidation,
  clockOutValidation,
  submitReportValidation,
  updateReportValidation,
  reviewReportValidation,
  updatePreferencesValidation,
  markNotificationReadValidation,
  listNotificationsValidation,
};
