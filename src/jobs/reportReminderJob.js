// src/jobs/reportReminderJob.js

// ✅ CHANGE #1 — Convert require() → import
import cron from "node-cron";
import User from "../models/User.js";
import { sendNotification } from "../services/notificationService.js";
import logger from "../utils/logger.js";

// Cron pattern: every Monday at 08:00
const schedule =
  process.env.REPORT_REMINDER_CRON || "0 8 * * MON";

// --------------------------------------
// MAIN JOB FUNCTION
// --------------------------------------
export function startReportReminderJob() {
  logger.info("Starting report reminder job with schedule: " + schedule);

  const task = cron.schedule(
    schedule,
    async () => {
      logger.info("Running report reminder job");

      // fetch all grads
      const grads = await User.find({ role: "graduate", active: true }).lean();

      for (const g of grads) {
        await sendNotification({
          userId: g._id,
          type: "report_reminder",
          title: "Weekly report reminder",
          message:
            "Please submit your weekly report for this week.",
          channels: ["email", "webpush"],
        });
      }
    },
    { scheduled: true, timezone: process.env.TZ || "Africa/Johannesburg" }
  );

  return task;
}

// ❌ REMOVED:
// module.exports = { startReportReminderJob };
