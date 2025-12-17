// src/jobs/clockOutReminderJob.js
import cron from "node-cron";
import Attendance from "../models/Attendance.js";
import { sendNotification } from "../services/notificationService.js";
import logger from "../utils/logger.js";

// Every day at 17:30
const schedule = process.env.CLOCKOUT_REMINDER_CRON || "30 17 * * *";
const timezone = process.env.TZ || "Africa/Lagos";

export function startClockOutReminderJob() {
  logger.info(`[INFO] Starting clock-out reminder job with schedule: ${schedule} (TZ: ${timezone})`);

  const task = cron.schedule(
    schedule,
    async () => {
      logger.info("Running clock-out reminder job");

      let successCount = 0;
      let failCount = 0;

      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Find attendance records with clock-in but no clock-out today
        const missing = await Attendance.find({
          clockIn: { $gte: startOfDay, $lte: endOfDay },
          clockOut: null,
        }).populate("userId", "preferences");

        for (const att of missing) {
          try {
            if (!att.userId) continue;

            // Respect user notification preferences
            const channels = att.userId.preferences?.notificationChannels || ["email"];

            await sendNotification({
              userId: att.userId._id,
              type: "missed_clockout",
              title: "Clock-Out Reminder",
              message: "You forgot to clock out today. Please clock out to record your hours.",
              channels,
            });
            successCount++;
          } catch (err) {
            logger.error("Failed to send clock-out reminder", { attendanceId: att._id, error: err.message });
            failCount++;
          }
        }

        logger.info("Clock-out reminder job completed", { successCount, failCount, total: missing.length });
      } catch (err) {
        logger.error("Clock-out reminder job error", err);
      }
    },
    { scheduled: true, timezone }
  );

  return task;
}
