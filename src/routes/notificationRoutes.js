import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  testSendNotification,
  registerPushSubscription,
  getMyNotifications
} from "../controllers/notificationController.js";

const router = express.Router();

// Test route - check notification system works
router.post("/test", protect, testSendNotification);

// Save user push subscription
router.post("/subscribe", protect, registerPushSubscription);

// Get notifications for logged-in user
router.get("/me", protect, getMyNotifications);

export default router;   // REQUIRED ✔
