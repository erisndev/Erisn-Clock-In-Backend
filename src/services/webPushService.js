// src/services/webPushService.js
const webpush = require('web-push');
const logger = require('../utils/logger');

const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const email = process.env.VAPID_ADMIN_EMAIL || 'mailto:admin@example.com';

if (!publicVapidKey || !privateVapidKey) {
  logger.warn('VAPID keys not set - web-push disabled');
} else {
  webpush.setVapidDetails(email, publicVapidKey, privateVapidKey);
}

async function sendPush(subscription, payload) {
  if (!publicVapidKey || !privateVapidKey) {
    logger.warn('Skipping webpush (no VAPID keys)');
    return { ok: false, error: 'vapid-not-configured' };
  }
  try {
    const result = await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { ok: true, result };
  } catch (err) {
    logger.error('web-push error', { err: err.message });
    return { ok: false, error: err.message };
  }
}

module.exports = { sendPush };
