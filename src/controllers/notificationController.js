// src/controllers/notificationController.js
const { sendNotification } = require('../services/notificationService');
const Notification = require('../models/Notification');
const User = require('../models/User');

async function testSend(req, res) {
  const { userId, type = 'custom', title, message, channels } = req.body;
  const r = await sendNotification({ userId, type, title, message, channels });
  return res.json(r);
}

async function registerPush(req, res) {
  const userId = req.user && req.user._id; // ensure auth middleware attaches user
  const { subscription } = req.body;
  if (!userId) return res.status(401).json({ ok: false, error: 'unauthenticated' });

  const user = await User.findById(userId);
  user.pushSubscriptions = user.pushSubscriptions || [];
  // Avoid duplicates (simple check)
  const exists = user.pushSubscriptions.some(s => s.endpoint === subscription.endpoint);
  if (!exists) user.pushSubscriptions.push(subscription);
  await user.save();
  return res.json({ ok: true });
}

async function listNotifications(req, res) {
  const userId = req.user._id;
  const notifs = await Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(50);
  return res.json({ ok: true, notifications: notifs });
}

module.exports = { testSend, registerPush, listNotifications };
