// src/jobs/clockOutReminderJob.js
import cron from "node-cron";
import Attendance from "../models/Attendance.js";
import { sendNotification } from "../services/notificationService.js";
import {
  dateKeyInTZ,
  startOfDayUTCForTZ,
  endOfDayUTCForTZ,
} from "../utils/time.js";
import logger from "../utils/logger.js";

const schedule = "* * * * *";
const timezone = process.env.TZ || "Africa/Johannesburg";

// Expected format: "m h * * *" (e.g. "35 18 * * *")
const configuredCron = process.env.CLOCKOUT_REMINDER_CRON || "30 17 * * *";
const debugTickLogs = process.env.CLOCKOUT_REMINDER_DEBUG === "true";

function parseMinuteHour(cronExpr) {
  const parts = String(cronExpr).trim().split(/\s+/);
  const minute = Number(parts[0]);
  const hour = Number(parts[1]);
  if (!Number.isFinite(minute) || !Number.isFinite(hour)) return null;
  if (minute < 0 || minute > 59 || hour < 0 || hour > 23) return null;
  return { minute, hour };
}

const targetTime = parseMinuteHour(configuredCron) || { minute: 30, hour: 17 };

function getTZParts(date, tz) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(date)
    .reduce((acc, p) => ((acc[p.type] = p.value), acc), {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    formatted: `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

let lastRunKey = null; // e.g. "2026-01-12 18:35" in TZ
let lastTargetHourKey = null; // e.g. "2026-01-12 18" in TZ

export function startClockOutReminderJob() {
  logger.info(
    `[INFO] Starting clock-out reminder job with tick schedule: ${schedule} (TZ: ${timezone}) target: ${String(
      targetTime.hour
    ).padStart(
      2,
      "0"
    )}:${String(targetTime.minute).padStart(2, "0")} (from CLOCKOUT_REMINDER_CRON=${configuredCron})`
  );

  logger.info("[ClockOutReminderJob] Env snapshot", {
    ENABLE_JOBS: process.env.ENABLE_JOBS,
    TZ: process.env.TZ,
    CLOCKOUT_REMINDER_CRON: process.env.CLOCKOUT_REMINDER_CRON,
    nodeEnv: process.env.NODE_ENV,
    nowISO: new Date().toISOString(),
    targetTime,
  });

  const task = cron.schedule(
    schedule,
    async () => {
      const firedAt = new Date();
      const tz = getTZParts(firedAt, timezone);
      const runKey = `${tz.dateKey} ${String(tz.hour).padStart(2, "0")}:${String(tz.minute).padStart(2, "0")}`;

      const isTargetHour = tz.hour === targetTime.hour;
      const isTargetMinute = isTargetHour && tz.minute === targetTime.minute;
      const willSendNow = isTargetMinute && lastRunKey !== runKey;

      // Log once when we enter the target hour (helps confirm schedule alignment without noisy per-minute logs)
      if (isTargetHour) {
        const targetHourKey = `${tz.dateKey} ${String(tz.hour).padStart(2, "0")}`;
        if (lastTargetHourKey !== targetHourKey) {
          lastTargetHourKey = targetHourKey;
          logger.info("[ClockOutReminderJob] Target hour reached", {
            tzNow: tz.formatted,
            timezone,
            targetTime,
          });
        }
      }

      // Per-minute tick logs are useful for debugging but can be noisy in production.
      if (debugTickLogs) {
        logger.info("[ClockOutReminderJob] Tick", {
          nowISO: firedAt.toISOString(),
          tzNow: tz.formatted,
          timezone,
          targetTime,
          isTargetHour,
          isTargetMinute,
          lastRunKey,
          runKey,
          willSendNow,
          reason: !isTargetMinute
            ? "not_target_minute"
            : lastRunKey === runKey
              ? "already_sent_this_minute"
              : "will_send",
        });
      }

      // Only fire at the configured wall-clock time in TZ, once per day/minute.
      if (!isTargetMinute) return;
      if (lastRunKey === runKey) return;
      lastRunKey = runKey;

      logger.info("[ClockOutReminderJob] Triggered (sending reminders now)", {
        firedAtISO: firedAt.toISOString(),
        tzNow: tz.formatted,
        timezone,
        targetTime,
        runKey,
      });

      let successCount = 0;
      let failCount = 0;

      try {
        const todayKey = dateKeyInTZ(firedAt, timezone);
        const startOfDay = startOfDayUTCForTZ(todayKey, timezone);
        const endOfDay = endOfDayUTCForTZ(todayKey, timezone);

        logger.info("[ClockOutReminderJob] Window", {
          todayKey,
          startOfDay: startOfDay.toISOString(),
          endOfDay: endOfDay.toISOString(),
        });

        const missing = await Attendance.find({
          clockIn: { $gte: startOfDay, $lte: endOfDay },
          $or: [{ clockOut: null }, { clockOut: { $exists: false } }],
          clockStatus: { $in: ["clocked-in", "on-break"] },
        }).populate("userId", "preferences");

        logger.info("[ClockOutReminderJob] Matches", { total: missing.length });

        for (const att of missing) {
          try {
            if (!att.userId) continue;

            const channels = att.userId.preferences?.notificationChannels || [
              "email",
            ];

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
            logger.error("Failed to send clock-out reminder", {
              attendanceId: att._id,
              error: err?.message || String(err),
            });
            failCount++;
          }
        }

        logger.info("Clock-out reminder job completed", {
          successCount,
          failCount,
          total: missing.length,
        });
      } catch (err) {
        logger.error("Clock-out reminder job error", err);
      }
    },
    {
      scheduled: true,
      // timezone no longer required for correctness, but harmless to keep
      timezone,
    }
  );

  task.start();
  return task;
}
