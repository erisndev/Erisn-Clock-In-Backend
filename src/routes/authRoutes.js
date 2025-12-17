import { Router } from "express";
import {
	login,
	register,
	logout,
	forgotPassword,
	resetPassword,
	verifyEmailOtp,
	resendOtp,
}
	from "../controllers/authController.js";
import { body } from "express-validator";

const router = Router();

router.post("/register", [
	body("name").notEmpty().withMessage("Name is required"),
	body("email").isEmail().withMessage("Valid email required"),
	body("password").isLength({ min: 6 }).withMessage("Password must be 6+ chars"),
], register);
router.post("/verify-email-otp", verifyEmailOtp);
router.post("/resend-otp", resendOtp);


router.post("/login", [
	body("email").isEmail().withMessage("Valid email required"),
	body("password").notEmpty().withMessage("Password is required"),
], login);

router.get("/logout", logout);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
