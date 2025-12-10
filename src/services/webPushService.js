// src/services/webPushService.js
import webPush from "web-push";
import logger from "../utils/logger.js";

// Setup VAPID keys from environment variables
webPush.setVapidDetails(
  "mailto:" + process.env.EMAIL_USER,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Send Web Push Notification
 * @param {Object} subscription - Push subscription object from client
 * @param {String} title - Notification title
 * @param {String} message - Notification body message
 * @param {Object} data - Additional payload data
 */
export default async function sendWebPush(subscription, title, message, data = {}) {
  try {
    await webPush.sendNotification(
      subscription,
      JSON.stringify({
        title,
        message,
        data,
      })
    );

    logger.info("Web push sent", { endpoint: subscription?.endpoint });
    return true;
  } catch (err) {
    logger.error("Web push failed", err);
    return false;
  }
}
