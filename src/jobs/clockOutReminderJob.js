// src/jobs/clockOutReminderJob.js

// ✅ CHANGE #1 — Convert require() → import
import cron from "node-cron";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { sendNotification } from "../services/notificationService.js";
import logger from "../utils/logger.js";

// Every day at 17:30
const schedule =
  process.env.CLOCKOUT_REMINDER_CRON || "30 17 * * *";

// ---------------------------------------------
// MAIN JOB FUNCTION
// ---------------------------------------------
export function startClockOutReminderJob() {
  logger.info("Starting clock-out reminder job with schedule: " + schedule);

  const task = cron.schedule(
    schedule,
    async () => {
      logger.info("Running clock-out reminder job");

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const missing = await Attendance.find({
        clockIn: { $gte: startOfDay, $lte: endOfDay },
        clockOut: null,
      }).populate("user");

      for (const att of missing) {
        await sendNotification({
          userId: att.user._id,
          type: "missed_clockout",
          title: "Clock-out reminder",
          message:
            "You forgot to clock out today. Please clock out to record your hours.",
          channels: ["email", "webpush"],
        });
      }
    },
    { scheduled: true, timezone: process.env.TZ || "Africa/Johannesburg" }
  );

  return task;
}

// ❌ REMOVED THIS (wrong)
// export default { startClockOutReminderJob };
//
// Because your server imports:
//    import { startClockOutReminderJob } from "./jobs/clockOutReminderJob.js";
