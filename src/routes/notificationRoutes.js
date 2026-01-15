import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  getVapidPublicKey,
  testSendNotification,
  demoPushNotification,
  registerPushSubscription,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteAllMyNotifications,
  getUnreadCount,
} from "../controllers/notificationController.js";
import {
  markNotificationReadValidation,
  listNotificationsValidation,
} from "../middlewares/validators.js";

const router = express.Router();

// Public: allow frontend to fetch VAPID key before/without auth
router.get("/vapid-public-key", getVapidPublicKey);

// All other notification routes require authentication
router.use(protect);

// Test route - check notification system works
router.post("/test", testSendNotification);

// Demo route - sends a webpush to the logged-in user (requires an active subscription)
router.post("/demo-push", demoPushNotification);

// Save user push subscription
router.post("/subscribe", registerPushSubscription);

// Get notifications for logged-in user (with pagination)
router.get("/", listNotificationsValidation, getMyNotifications);
router.get("/me", listNotificationsValidation, getMyNotifications); // Alias

// Get unread count
router.get("/unread-count", getUnreadCount);

// Mark single notification as read
router.patch("/:id/read", markNotificationReadValidation, markNotificationRead);

// Mark all notifications as read
router.patch("/mark-all-read", markAllNotificationsRead);

// Delete all notifications for logged-in user
router.delete("/delete-all", deleteAllMyNotifications);

export default router;
