import { Router } from "express";
import {
  login,
  register,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmailOtp,
  resendOtp,
} from "../controllers/authController.js";
import {
  registerLimiter,
  loginLimiter,
  resendOtpLimiter,
  forgotPasswordLimiter,
  verifyOtpLimiter,
} from "../middlewares/rateLimiters.js";
import {
  registerValidation,
  loginValidation,
  verifyOtpValidation,
  resendOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from "../middlewares/validators.js";

const router = Router();

// Registration with rate limit and validation
router.post("/register", registerLimiter, registerValidation, register);

// Verify email OTP
router.post("/verify-email-otp", verifyOtpLimiter, verifyOtpValidation, verifyEmailOtp);

// Resend OTP
router.post("/resend-otp", resendOtpLimiter, resendOtpValidation, resendOtp);

// Login
router.post("/login", loginLimiter, loginValidation, login);

// Logout
router.get("/logout", logout);

// Forgot password
router.post("/forgot-password", forgotPasswordLimiter, forgotPasswordValidation, forgotPassword);

// Reset password
router.post("/reset-password/:token", resetPasswordValidation, resetPassword);

export default router;
