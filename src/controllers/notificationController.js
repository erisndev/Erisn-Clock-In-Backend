// src/controllers/notificationController.js
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendNotification } from "../services/notificationService.js";
import logger from "../utils/logger.js";

// --------------------------------------------------
// 1. TEST NOTIFICATION
// --------------------------------------------------
export async function testSendNotification(req, res) {
  try {
    const { userId, type = "custom", title, message, channels } = req.body;

    const result = await sendNotification({
      userId,
      type,
      title,
      message,
      channels,
    });

    return res.json(result);
  } catch (err) {
    logger.error("Test notification error", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// --------------------------------------------------
// 2. REGISTER PUSH SUBSCRIPTION (WEB PUSH)
// --------------------------------------------------
export async function registerPushSubscription(req, res) {
  try {
    const userId = req.user?._id;
    const { subscription } = req.body;

    if (!userId) {
      return res.status(401).json({ ok: false, error: "Unauthenticated" });
    }

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ ok: false, error: "Invalid subscription" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    user.pushSubscriptions = user.pushSubscriptions || [];

    const exists = user.pushSubscriptions.some(
      (s) => s.endpoint === subscription.endpoint
    );

    if (!exists) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }

    logger.info("Push subscription registered", { userId });

    return res.json({ ok: true, message: "Subscription saved" });
  } catch (err) {
    logger.error("Register push subscription error", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// --------------------------------------------------
// 3. LIST MY NOTIFICATIONS (with pagination)
// --------------------------------------------------
export async function getMyNotifications(req, res) {
  try {
    const userId = req.user._id;
    const { limit = 50, cursor } = req.query;

    const query = { user: userId };

    // Cursor-based pagination
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit) + 1); // Fetch one extra to check if there's more

    const hasMore = notifications.length > Number(limit);
    if (hasMore) notifications.pop();

    const nextCursor = hasMore ? notifications[notifications.length - 1]._id : null;

    // Count unread
    const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

    return res.json({
      ok: true,
      notifications,
      unreadCount,
      hasMore,
      nextCursor,
    });
  } catch (err) {
    logger.error("Get notifications error", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// --------------------------------------------------
// 4. MARK SINGLE NOTIFICATION AS READ
// --------------------------------------------------
export async function markNotificationRead(req, res) {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ ok: false, error: "Notification not found" });
    }

    return res.json({ ok: true, notification });
  } catch (err) {
    logger.error("Mark notification read error", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// --------------------------------------------------
// 5. MARK ALL NOTIFICATIONS AS READ
// --------------------------------------------------
export async function markAllNotificationsRead(req, res) {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );

    logger.info("Marked all notifications read", { userId, count: result.modifiedCount });

    return res.json({
      ok: true,
      message: `${result.modifiedCount} notifications marked as read`,
    });
  } catch (err) {
    logger.error("Mark all notifications read error", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// --------------------------------------------------
// 6. GET UNREAD COUNT
// --------------------------------------------------
export async function getUnreadCount(req, res) {
  try {
    const userId = req.user._id;
    const count = await Notification.countDocuments({ user: userId, isRead: false });

    return res.json({ ok: true, unreadCount: count });
  } catch (err) {
    logger.error("Get unread count error", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
