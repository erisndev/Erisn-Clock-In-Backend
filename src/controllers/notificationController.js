// src/controllers/notificationController.js
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendNotification } from "../services/notificationService.js";

// --------------------------------------------------
// 1. TEST NOTIFICATION - same logic you already wrote
// --------------------------------------------------
export async function testSendNotification(req, res) {
  try {
    const { userId, type = "custom", title, message, channels } = req.body;

    const result = await sendNotification({
      userId,
      type,
      title,
      message,
      channels
    });

    return res.json(result);
  } catch (err) {
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

    if (!userId)
      return res.status(401).json({ ok: false, error: "unauthenticated" });

    const user = await User.findById(userId);

    user.pushSubscriptions = user.pushSubscriptions || [];

    const exists = user.pushSubscriptions.some(
      (s) => s.endpoint === subscription.endpoint
    );

    if (!exists) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }

    return res.json({ ok: true, message: "Subscription saved" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

// --------------------------------------------------
// 3. LIST MY NOTIFICATIONS
// --------------------------------------------------
export async function getMyNotifications(req, res) {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      ok: true,
      notifications
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
