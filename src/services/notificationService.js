// src/services/notificationService.js
const Notification = require('../models/Notification');
const { sendMail } = require('./emailService');
const { sendPush } = require('./webPushService');
const logger = require('../utils/logger');

// A simple user fetch helper (adapt to your User model location)
const User = require('../models/User'); // adjust path as needed

async function sendNotification({ userId, type, title, message, channels = ['email'], data = {} }) {
  const notifDoc = new Notification({
    user: userId,
    type,
    title,
    message,
    data,
    channels,
    status: 'pending'
  });

  await notifDoc.save();

  const user = await User.findById(userId).lean();
  if (!user) {
    notifDoc.status = 'failed';
    notifDoc.error = 'user-not-found';
    await notifDoc.save();
    return { ok: false, error: 'user-not-found' };
  }

  const results = {};
  // Email
  if (channels.includes('email') && user.email) {
    const r = await sendMail({ to: user.email, subject: title, html: `<p>${message}</p>` });
    results.email = r;
  }

  // Web Push (assumes user.subscriptions is array of push subscriptions)
  if (channels.includes('webpush') && user.pushSubscriptions && user.pushSubscriptions.length) {
    results.webpush = [];
    for (const sub of user.pushSubscriptions) {
      const r = await sendPush(sub, { title, message, data });
      results.webpush.push(r);
    }
  }

  // In-app: here we just leave an entry (the Notification model itself)
  notifDoc.status = 'sent';
  await notifDoc.save();

  logger.info('sendNotification results', { userId, type, results });
  return { ok: true, results };
}

module.exports = { sendNotification };
