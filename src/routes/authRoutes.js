import { Router } from "express";
import { login, register } from "../controllers/authController.js";

const router = Router();

// REGISTER
router.post("/register", register);

// LOGIN
router.post("/login", login);

export default router;
