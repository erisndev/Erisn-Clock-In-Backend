// src/jobs/runClockOutReminderOnce.js
// Manual runner to execute the clock-out reminder logic immediately (no cron, no server listen).
import "dotenv/config.js";
import connectDB from "../config/db.js";
import Attendance from "../models/Attendance.js";
import { sendNotification } from "../services/notificationService.js";
import {
  dateKeyInTZ,
  startOfDayUTCForTZ,
  endOfDayUTCForTZ,
} from "../utils/time.js";
import logger from "../utils/logger.js";

async function main() {
  const timezone = process.env.TZ || "Africa/Johannesburg";

  await connectDB();

  const todayKey = dateKeyInTZ(new Date(), timezone);
  const startOfDay = startOfDayUTCForTZ(todayKey, timezone);
  const endOfDay = endOfDayUTCForTZ(todayKey, timezone);

  logger.info("[RUN-ONCE] Clock-out reminder", {
    timezone,
    todayKey,
    startOfDay: startOfDay.toISOString(),
    endOfDay: endOfDay.toISOString(),
    now: new Date().toISOString(),
  });

  const missing = await Attendance.find({
    clockIn: { $gte: startOfDay, $lte: endOfDay },
    $or: [{ clockOut: null }, { clockOut: { $exists: false } }],
    clockStatus: { $in: ["clocked-in", "on-break"] },
  }).populate("userId", "preferences email pushSubscriptions");

  logger.info("[RUN-ONCE] Matches", { total: missing.length });

  let successCount = 0;
  let failCount = 0;

  for (const att of missing) {
    try {
      if (!att.userId) continue;
      const channels = att.userId.preferences?.notificationChannels || [
        "email",
      ];

      logger.info("[RUN-ONCE] Sending reminder", {
        attendanceId: String(att._id),
        userId: String(att.userId._id),
        channels,
        email: att.userId.email,
        pushSubs: att.userId.pushSubscriptions?.length || 0,
      });

      await sendNotification({
        userId: att.userId._id,
        type: "missed_clockout",
        title: "Clock-Out Reminder",
        message:
          "You forgot to clock out today. Please clock out to record your hours.",
        channels,
      });

      successCount++;
    } catch (err) {
      failCount++;
      logger.error("[RUN-ONCE] Failed", {
        attendanceId: String(att._id),
        error: err?.message || String(err),
      });
    }
  }

  logger.info("[RUN-ONCE] Done", { successCount, failCount });

  // exit so the script ends even if DB stays open
  process.exit(0);
}

main().catch((err) => {
  logger.error("[RUN-ONCE] Fatal", { error: err?.message || String(err) });
  process.exit(1);
});
