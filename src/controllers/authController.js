import crypto from "crypto";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { sendEmail } from "../services/emailService.js";
import logger from "../utils/logger.js";

/* ============
   REGISTER
============== */
export const register = async (req, res, next) => {
  try {
    const { name, email: rawEmail, password, role, cellNumber, department, province } = req.body || {};

    // Base required fields
    if (!name || !rawEmail || !password || !cellNumber) {
      return next(
        new ErrorResponse("name, email, password and cellNumber are required", 400)
      );
    }

    // For graduates, department and province are required
    const isAdmin = role === 'admin';
    if (!isAdmin && (!department || !province)) {
      return next(
        new ErrorResponse("department and province are required for graduates", 400)
      );
    }

    // Normalize email to lowercase
    const email = rawEmail.trim().toLowerCase();

    // Restrict email domain
    const allowedDomainRegex = /^[^\s@]+@erisn.*\.com$/i;
    if (!allowedDomainRegex.test(email)) {
      return next(
        new ErrorResponse(
          "Registration is restricted to erisn email addresses",
          403
        )
      );
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new ErrorResponse("User already exists", 400));
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const user = new User({
      name,
      email,
      password,
      role,
      cellNumber,
      department,
      province,
      emailOtp: hashedOtp,
      emailOtpExpire: Date.now() + 10 * 60 * 1000, // 10 mins
      isEmailVerified: false,
    });

    await user.save();

    const { emailTemplates } = await import("../emails/templates.js");
    const tpl = emailTemplates.verifyEmailOtp({ name, otp });
    await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });

    res.status(200).json({
      success: true,
      message: "OTP sent to email. Please verify to complete registration.",
    });
  } catch (err) {
    logger.error("Register error", err);
    return next(new ErrorResponse("Server error", 500));
  }
};

/* ======================================================
   VERIFY EMAIL OTP → ACTIVATE ACCOUNT
====================================================== */
export const verifyEmailOtp = async (req, res, next) => {
  try {
    const { email: rawEmail, otp } = req.body || {};

    if (!rawEmail || !otp) {
      return next(new ErrorResponse("Email and OTP are required", 400));
    }

    const email = rawEmail.trim().toLowerCase();

    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const user = await User.findOne({
      email,
      emailOtp: hashedOtp,
      emailOtpExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse("Invalid or expired OTP", 400));
    }

    user.isEmailVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully. Registration completed.",
      user: user.toJSON(),
    });
  } catch (err) {
    logger.error("Verify OTP error", err);
    return next(err);
  }
};

/* ======================================================
   RESEND OTP
====================================================== */
export const resendOtp = async (req, res, next) => {
  try {
    const { email: rawEmail } = req.body || {};

    if (!rawEmail) {
      return next(new ErrorResponse("Email is required", 400));
    }

    const email = rawEmail.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    if (user.isEmailVerified) {
      return next(new ErrorResponse("Email already verified", 400));
    }

    
    const RESEND_COOLDOWN_MS = Number(process.env.OTP_RESEND_COOLDOWN_MS) || 60 * 1000; // 60s

    if (user.emailOtpExpire && user.emailOtpExpire > Date.now()) {
      // Derive when the current OTP was issued (we set expire = issued + 10min)
      const issuedAt = user.emailOtpExpire.getTime() - 10 * 60 * 1000;
      const nextAllowedAt = issuedAt + RESEND_COOLDOWN_MS;

      if (Date.now() < nextAllowedAt) {
        const waitSeconds = Math.ceil((nextAllowedAt - Date.now()) / 1000);
        return next(
          new ErrorResponse(
            `OTP already sent. Please wait ${waitSeconds}s before requesting a new one.`,
            429
          )
        );
      }
    }

    // Invalidate any existing OTP and generate a fresh one
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

    user.emailOtp = hashedOtp;
    user.emailOtpExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    const { emailTemplates } = await import("../emails/templates.js");
    const tpl = emailTemplates.resendEmailOtp({ name: user.name, otp });
    await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });

    res.status(200).json({
      success: true,
      message: "New OTP sent to email",
    });
  } catch (err) {
    logger.error("Resend OTP error", err);
    return next(new ErrorResponse("Server error", 500));
  }
};

/* =========
   LOGIN 
============ */
export const login = async (req, res, next) => {
  try {
    const { email: rawEmail, password } = req.body || {};

    if (!rawEmail || !password) {
      return next(
        new ErrorResponse("email and password are required", 400)
      );
    }

    const email = rawEmail.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    if (!user.isEmailVerified) {
      return next(
        new ErrorResponse("Please verify your email before logging in", 403)
      );
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new ErrorResponse("Invalid credentials", 401));
    }

    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    logger.error("Login error", err);
    return next(err);
  }
};

/* ======================================================
   LOGOUT
====================================================== */
export const logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

/* ======================================================
   FORGOT PASSWORD
====================================================== */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email: rawEmail } = req.body || {};

    if (!rawEmail) {
      return next(new ErrorResponse("Email is required", 400));
    }

    const email = rawEmail.trim().toLowerCase();
    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const { emailTemplates } = await import("../emails/templates.js");
    const tpl = emailTemplates.passwordReset({ name: user.name, link: resetUrl });
    await sendEmail({ to: user.email, subject: tpl.subject, html: tpl.html });

    res.status(200).json({
      success: true,
      message: "Password reset link sent to email",
    });
  } catch (err) {
    logger.error("Forgot password error", err);
    return next(err);
  }
};

/* ======================================================
   RESET PASSWORD
====================================================== */
export const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body || {};

    if (!password) {
      return next(new ErrorResponse("New password is required", 400));
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse("Invalid or expired token", 400));
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (err) {
    logger.error("Reset password error", err);
    return next(err);
  }
};
