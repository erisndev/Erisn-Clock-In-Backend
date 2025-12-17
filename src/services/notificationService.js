// src/services/notificationService.js
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { sendEmail } from "./emailService.js";
import sendWebPush from "./webPushService.js";
import logger from "../utils/logger.js";

/**
 * Send a notification to a user over multiple channels.
 *
 * @param {Object} params
 * @param {String} params.userId
 * @param {String} params.type
 * @param {String} params.title
 * @param {String} params.message
 * @param {Array} params.channels - ['email', 'webpush']
 * @param {Object} params.data
 */
export async function sendNotification({
  userId,
  type = "custom",
  title,
  message,
  channels = ["email"],
  data = {},
}) {
  logger.info("Sending notification", { userId, type, channels });

  const user = await User.findById(userId);
  if (!user) {
    logger.error("User not found for notification", { userId });
    return { ok: false, error: "User not found" };
  }

  const channelsUsed = [];

  // EMAIL
  if (channels.includes("email")) {
    try {
      await sendEmail({ to: user.email, subject: title, html: `<p>${message}</p>` });
      channelsUsed.push("email");
    } catch (err) {
      logger.error("Email sending failed", err);
    }
  }

  // WEB PUSH
  if (channels.includes("webpush") && user.pushSubscriptions?.length) {
    for (const sub of user.pushSubscriptions) {
      try {
        await sendWebPush(sub, title, message, data);
        channelsUsed.push("webpush");
      } catch (err) {
        logger.error("Web push sending failed", err);
      }
    }
  }

  // Save DB record
  const notif = await Notification.create({
    user: userId,
    title,
    message,
    type,
    channelsUsed,
  });

  return { ok: true, notification: notif };
}
