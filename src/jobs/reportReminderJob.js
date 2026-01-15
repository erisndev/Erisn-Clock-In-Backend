// src/jobs/reportReminderJob.js
import cron from "node-cron";
import User from "../models/User.js";
import { sendNotification } from "../services/notificationService.js";
import logger from "../utils/logger.js";
import { debugLog } from "../utils/debugLog.js";

// Cron pattern: every Friday at 08:00
const schedule = "0 8 * * FRI";
const timezone = process.env.TZ || "Africa/Johannesburg";

export function startReportReminderJob() {
  debugLog(
    `[INFO] Starting report reminder job with schedule: ${schedule} (TZ: ${timezone})`
  );

  const task = cron.schedule(
    schedule,
    async () => {
      debugLog("Running report reminder job");

      let successCount = 0;
      let failCount = 0;

      try {
        // Fetch all active graduates
        const grads = await User.find({
          role: "graduate",
          isEmailVerified: true,
        }).lean();

        for (const g of grads) {
          try {
            // Respect user notification preferences
            const channels = g.preferences?.notificationChannels || ["email"];

            await sendNotification({
              userId: g._id,
              type: "report_reminder",
              title: "Weekly Report Reminder",
              message: "Please submit your weekly report for this week.",
              channels,
            });
            successCount++;
          } catch (err) {
            logger.error("Failed to send report reminder", {
              userId: g._id,
              error: err.message,
            });
            failCount++;
          }
        }

        debugLog("Report reminder job completed", {
          successCount,
          failCount,
          total: grads.length,
        });
      } catch (err) {
        logger.error("Report reminder job error", err);
      }
    },
    { scheduled: true, timezone }
  );

  return task;
}
