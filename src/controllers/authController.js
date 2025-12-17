import crypto from "crypto";
import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import sendEmail from "../utils/sendEmail.js";

/* ============
   REGISTER
============== */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password) {
      return next(
        new ErrorResponse("name, email and password are required", 400)
      );
    }

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
      emailOtp: hashedOtp,
      emailOtpExpire: Date.now() + 10 * 60 * 1000, // 10 mins
      isEmailVerified: false,
    });

    await user.save();

    await sendEmail({
      to: email,
      subject: "Verify Your Email (OTP)",
      html: `
        <p>Your OTP for registration is:</p>
        <h2>${otp}</h2>
        <p>This OTP expires in 10 minutes.</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "OTP sent to email. Please verify to complete registration.",
    });
  } catch (err) {
    console.error("Register error:", err);
    return next(new ErrorResponse("Server error", 500));
  }
};

/* ======================================================
   VERIFY EMAIL OTP → ACTIVATE ACCOUNT
====================================================== */
export const verifyEmailOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body || {};

    if (!email || !otp) {
      return next(new ErrorResponse("Email and OTP are required", 400));
    }

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
    console.error("Verify OTP error:", err);
    return next(err);
  }
};

/* ======================================================
   RESEND OTP
====================================================== */
export const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return next(new ErrorResponse("Email is required", 400));
    }

    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    if (user.isEmailVerified) {
      return next(new ErrorResponse("Email already verified", 400));
    }

    // Prevent spam: wait until current OTP expires
    if (user.emailOtpExpire && user.emailOtpExpire > Date.now()) {
      return next(
        new ErrorResponse(
          "OTP already sent. Please wait before requesting a new one.",
          429
        )
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    user.emailOtp = hashedOtp;
    user.emailOtpExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    await sendEmail({
      to: user.email,
      subject: "Resend Email Verification OTP",
      html: `
        <p>Your new OTP is:</p>
        <h2>${otp}</h2>
        <p>This OTP expires in 10 minutes.</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "New OTP sent to email",
    });
  } catch (err) {
    console.error("Resend OTP error:", err);
    return next(new ErrorResponse("Server error", 500));
  }
};

/* =========
   LOGIN 
============ */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return next(
        new ErrorResponse("email and password are required", 400)
      );
    }

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
    console.error("Login error:", err);
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
    const { email } = req.body || {};

    if (!email) {
      return next(new ErrorResponse("Email is required", 400));
    }

    const user = await User.findOne({ email });
    if (!user) {
      return next(new ErrorResponse("User not found", 404));
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Password Reset",
      html: `
        <p>You requested a password reset</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>This link expires in 15 minutes.</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: "Password reset link sent to email",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
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
    console.error("Reset password error:", err);
    return next(err);
  }
};
