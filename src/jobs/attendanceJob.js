// src/jobs/attendanceJob.js

import cron from "node-cron";
import cronParser from "cron-parser";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { debugLog } from "../utils/debugLog.js";
import { dateKeyInTZ } from "../utils/time.js";
import { sendNotification } from "../services/notificationService.js";

const timezone = process.env.TZ || "Africa/Johannesburg";
const SA_TZ = "Africa/Johannesburg";

// Break policy
const MAX_BREAK_MINUTES = Number(process.env.MAX_BREAK_MINUTES || 60);
const BREAK_WARNING_MINUTES_LEFT = Number(
  process.env.BREAK_WARNING_MINUTES_LEFT || 10,
);
const MAX_BREAK_MS = MAX_BREAK_MINUTES * 60 * 1000;
const BREAK_WARNING_MS_LEFT = BREAK_WARNING_MINUTES_LEFT * 60 * 1000;

const BREAK_ADMIN_OVERDUE_MINUTES = Number(
  process.env.BREAK_ADMIN_OVERDUE_MINUTES || 10,
);
const BREAK_ADMIN_OVERDUE_MS = BREAK_ADMIN_OVERDUE_MINUTES * 60 * 1000;

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

function msUntilNextCron(cronExpr, tz) {
  try {
    const it = cronParser.parseExpression(cronExpr, {
      tz,
      currentDate: new Date(),
    });
    const next = it.next().toDate();
    return Math.max(0, next.getTime() - Date.now());
  } catch (e) {
    // If parsing fails, do not break startup; just omit ETA by returning 0.
    logger.warn("[Jobs] Failed to compute next run ETA", {
      cronExpr,
      tz,
      error: e?.message || String(e),
    });
    return 0;
  }
}

function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

// Helper to get today's date string
const getTodayDate = () => dateKeyInTZ(new Date(), timezone);

// Helper to get day type
const getDayType = (dateStr) => {
  if (Attendance.isWeekend(dateStr)) {
    return { type: "weekend", status: "weekend", holidayName: "" };
  }

  const holiday = Attendance.isHoliday(dateStr);
  if (holiday) {
    return { type: "holiday", status: "holiday", holidayName: holiday.name };
  }

  return { type: "workday", status: "absent", holidayName: "" };
};

// Helper to format duration
const formatDuration = (ms) => {
  if (!ms || ms <= 0) return "0h 0m";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

export function startMarkAbsentJob() {
  // Run at 17:00 Monday-Friday
  const schedule = "00 17 * * 1-5";

  // Countdown logger management
  let countdownTimers = [];
  const armCountdownLogs = () => {
    // Clear any existing timers
    countdownTimers.forEach((t) => clearTimeout(t));
    countdownTimers = [];

    const ms = msUntilNextCron(schedule, timezone);
    if (!ms || ms <= 0) return;

    const thresholds = [3600e3, 1800e3, 900e3, 600e3, 300e3, 120e3, 60e3]; // 60m,30m,15m,10m,5m,2m,1m
    thresholds
      .filter((t) => ms > t)
      .forEach((t) => {
        const timer = setTimeout(() => {
          debugLog(
            `[MarkAbsentJob] Auto-mark-absent ETA: ${formatMs(t)} remaining (TZ: ${timezone})`,
          );
        }, ms - t);
        countdownTimers.push(timer);
      });

    // Final log when firing
    const finalTimer = setTimeout(() => {
      debugLog("[MarkAbsentJob] Running now (auto-mark-absent)");
    }, ms);
    countdownTimers.push(finalTimer);
  };

  const bootNow = new Date();
  const jobNow = getTZParts(bootNow, timezone);
  const saNow = getTZParts(bootNow, SA_TZ);
  const etaMs = msUntilNextCron(schedule, timezone);

  debugLog(
    `[INFO] Starting mark-absent job with schedule: ${schedule} (TZ: ${timezone})`,
  );
  debugLog("[MarkAbsentJob] Time snapshot", {
    nowISO: bootNow.toISOString(),
    nowInJobTZ: jobNow.formatted,
    nowInSA: saNow.formatted,
    nextRunIn: formatMs(etaMs),
    tz: timezone,
    schedule,
  });

  // Arm countdown logs on startup
  armCountdownLogs();

  const task = cron.schedule(
    schedule,
    async () => {
      logger.info("Running mark-absent job");

      const today = getTodayDate();
      const dayInfo = getDayType(today);

      // Skip if weekend or holiday
      if (dayInfo.type !== "workday") {
        logger.info(`Skipping mark-absent job - today is ${dayInfo.type}`);
        // Rearm countdown logs for next run
        armCountdownLogs();
        return;
      }

      let markedCount = 0;
      let errorCount = 0;

      try {
        // Get all active users (graduates)
        const users = await User.find({
          role: "graduate",
          isEmailVerified: true,
        }).lean();

        for (const user of users) {
          try {
            // Check if user has attendance record for today
            let attendance = await Attendance.findOne({
              userId: user._id,
              date: today,
            });

            if (!attendance) {
              // Create absent record
              attendance = await Attendance.create({
                userId: user._id,
                date: today,
                type: "workday",
                attendanceStatus: "absent",
                clockStatus: "clocked-out",
                autoMarkedAbsent: true,
                isClosed: true,
              });
              markedCount++;
              logger.info(`Marked absent: ${user.name} (${user.email})`);
            } else if (!attendance.clockIn && !attendance.autoMarkedAbsent) {
              // Update existing record to mark as absent
              attendance.attendanceStatus = "absent";
              attendance.autoMarkedAbsent = true;
              attendance.isClosed = true;
              await attendance.save();
              markedCount++;
              logger.info(
                `Marked absent (updated): ${user.name} (${user.email})`,
              );
            }
          } catch (err) {
            logger.error(`Failed to mark absent for user ${user._id}`, err);
            errorCount++;
          }
        }

        logger.info("Mark-absent job completed", {
          markedCount,
          errorCount,
          total: users.length,
        });
      } catch (err) {
        logger.error("Mark-absent job error", err);
      } finally {
        // Rearm countdown logs for next run after completion
        armCountdownLogs();
      }
    },
    { scheduled: true, timezone },
  );

  return task;
}

/**
 * Auto Clock-Out Job
 * Runs at 23:59 every day
 * Automatically clocks out users who forgot to clock out
 */
export function startAutoClockOutJob() {
  // Default: 23:59 every day
  // For testing you can override via env AUTO_CLOCK_OUT_CRON (e.g. "55 7 * * *" for 07:55)
  const schedule = process.env.AUTO_CLOCK_OUT_CRON || "59 23 * * *";

  const bootNow = new Date();
  const jobNow = getTZParts(bootNow, timezone);
  const saNow = getTZParts(bootNow, SA_TZ);
  const etaMs = msUntilNextCron(schedule, timezone);

  debugLog(
    `[INFO] Starting auto-clockout job with schedule: ${schedule} (TZ: ${timezone})`,
  );
  debugLog("[AutoClockOutJob] Time snapshot", {
    nowISO: bootNow.toISOString(),
    nowInJobTZ: jobNow.formatted,
    nowInSA: saNow.formatted,
    nextRunIn: formatMs(etaMs),
    tz: timezone,
    schedule,
  });

  const task = cron.schedule(
    schedule,
    async () => {
      logger.info("Running auto-clockout job");

      const today = getTodayDate();
      const now = new Date();
      const etaMsInside = msUntilNextCron(schedule, timezone);
      debugLog("[AutoClockOutJob] Next run ETA snapshot", {
        nowISO: now.toISOString(),
        tz: timezone,
        schedule,
        nextRunIn: formatMs(etaMsInside),
      });

      let clockedOutCount = 0;
      let errorCount = 0;

      try {
        // Find all users who are still clocked in today
        const activeAttendances = await Attendance.find({
          date: today,
          clockIn: { $ne: null },
          clockOut: null,
          isClosed: false,
        }).populate("userId", "name email");

        for (const attendance of activeAttendances) {
          try {
            const userName = attendance.userId?.name || "Unknown";
            const userEmail = attendance.userId?.email || "Unknown";

            debugLog("[AutoClockOutJob] About to auto clock-out user", {
              attendanceId: attendance._id,
              userId: attendance.userId?._id,
              userName,
              userEmail,
              date: attendance.date,
              clockStatus: attendance.clockStatus,
              clockIn: attendance.clockIn,
              clockOut: attendance.clockOut,
              isClosed: attendance.isClosed,
              breakIn: attendance.breakIn,
              breakOut: attendance.breakOut,
              breakDurationMs: attendance.breakDuration || 0,
              nowISO: now.toISOString(),
              tz: timezone,
            });

            // End any active break
            if (attendance.clockStatus === "on-break" && attendance.breakIn) {
              const breakTime = now.getTime() - attendance.breakIn.getTime();
              attendance.breakOut = now;
              attendance.breakDuration =
                (attendance.breakDuration || 0) + breakTime;
            }

            // Calculate work duration
            const totalTime = now.getTime() - attendance.clockIn.getTime();
            const workDuration = totalTime - (attendance.breakDuration || 0);

            // Update attendance record
            attendance.clockOut = now;
            attendance.duration = Math.max(0, workDuration);
            attendance.durationFormatted = formatDuration(attendance.duration);
            attendance.clockStatus = "clocked-out";
            // Ensure status is updated + record is closed
            attendance.attendanceStatus = "present";
            attendance.isClosed = true;
            attendance.autoClockOut = true;
            attendance.clockOutNotes =
              "Auto clocked out by system at end of day";

            await attendance.save();
            clockedOutCount++;

            logger.info(`Auto clocked out: ${userName}`, {
              attendanceId: attendance._id,
              userId: attendance.userId?._id,
              userEmail,
              duration: attendance.durationFormatted,
              clockOut: attendance.clockOut,
              clockStatus: attendance.clockStatus,
              attendanceStatus: attendance.attendanceStatus,
              isClosed: attendance.isClosed,
            });
          } catch (err) {
            logger.error(
              `Failed to auto clock-out attendance ${attendance._id}`,
              err,
            );
            errorCount++;
          }
        }

        logger.info("Auto-clockout job completed", {
          clockedOutCount,
          errorCount,
        });
      } catch (err) {
        logger.error("Auto-clockout job error", err);
      }
    },
    { scheduled: true, timezone },
  );

  return task;
}

/**
 * Initialize Weekend/Holiday Records Job
 * Runs at 00:01 every day
 * Creates attendance records for weekends and holidays
 */
export function startBreakReminderJob() {
  // Check every minute for users currently on break and:
  // - warn when N minutes left
  // - notify at 0 minutes (break ended)
  // - auto-end the break at MAX_BREAK_MINUTES for clean state
  // - notify admin if user is overdue by BREAK_ADMIN_OVERDUE_MINUTES
  const schedule = process.env.BREAK_REMINDER_CRON || "* * * * *";

  const bootNow = new Date();
  const jobNow = getTZParts(bootNow, timezone);
  const saNow = getTZParts(bootNow, SA_TZ);
  const etaMs = msUntilNextCron(schedule, timezone);

  debugLog(
    `[INFO] Starting break-reminder job with schedule: ${schedule} (TZ: ${timezone})`,
  );
  debugLog("[BreakReminderJob] Time snapshot", {
    nowISO: bootNow.toISOString(),
    nowInJobTZ: jobNow.formatted,
    nowInSA: saNow.formatted,
    nextRunIn: formatMs(etaMs),
    tz: timezone,
    schedule,
    maxBreakMinutes: MAX_BREAK_MINUTES,
    warningMinutesLeft: BREAK_WARNING_MINUTES_LEFT,
  });

  const task = cron.schedule(
    schedule,
    async () => {
      const now = new Date();
      const today = getTodayDate();

      try {
        // Active breaks only
        const onBreak = await Attendance.find({
          date: today,
          isClosed: false,
          clockStatus: "on-break",
          breakIn: { $ne: null },
          breakTaken: false,
        }).populate("userId", "role name email preferences email pushSubscriptions");

        if (!onBreak.length) return;

        for (const attendance of onBreak) {
          try {
            const userId = attendance.userId?._id;
            if (!userId) continue;

            const breakElapsed = now.getTime() - attendance.breakIn.getTime();
            const msLeft = MAX_BREAK_MS - breakElapsed;

            // 1) Warning when within N minutes left (once)
            if (
              !attendance.breakAlmostOverNotified &&
              msLeft <= BREAK_WARNING_MS_LEFT &&
              msLeft > 0
            ) {
              await sendNotification({
                userId,
                type: "break_warning",
                title: "Break almost over",
                message: `You have ${BREAK_WARNING_MINUTES_LEFT} minutes left of your ${MAX_BREAK_MINUTES}-minute break.`,
                channels: ["webpush"],
                data: {
                  kind: "break_warning",
                  attendanceId: String(attendance._id),
                  breakIn: attendance.breakIn,
                  maxBreakMinutes: MAX_BREAK_MINUTES,
                  minutesLeft: BREAK_WARNING_MINUTES_LEFT,
                },
              });

              attendance.breakAlmostOverNotified = true;
              await attendance.save();

              logger.info("Sent break warning", {
                attendanceId: attendance._id,
                userId: String(userId),
                msLeft,
                breakElapsed,
              });
            }

            // 2) At/after 0 minutes left: auto-end break at exactly MAX_BREAK_MINUTES (once)
            if (!attendance.breakEndedBySystem && breakElapsed >= MAX_BREAK_MS) {
              const effectiveBreakOut = new Date(
                attendance.breakIn.getTime() + MAX_BREAK_MS,
              );

              // Only count up to the policy limit
              attendance.breakOut = effectiveBreakOut;
              attendance.breakDuration = (attendance.breakDuration || 0) + MAX_BREAK_MS;
              attendance.breakTaken = true;
              attendance.clockStatus = "clocked-in";
              attendance.breakEndedBySystem = true;

              // Overdue is the extra time beyond MAX_BREAK_MS
              const overdueMs = Math.max(0, breakElapsed - MAX_BREAK_MS);
              attendance.breakOverdueMs = overdueMs;

              // We deduct overdue from payable work duration by adding it to breakDuration
              // (since work duration is calculated as total - breakDuration)
              if (overdueMs > 0) {
                attendance.breakDuration += overdueMs;
              }

              const overdueMinutes = Math.ceil(overdueMs / 60000);
              attendance.breakOverdueNote =
                overdueMs > 0
                  ? `Break overdue by ~${overdueMinutes} min. Overage deducted from work duration.`
                  : "";

              // Push: break ended (once)
              if (!attendance.breakEndedNotified) {
                await sendNotification({
                  userId,
                  type: "break_ended",
                  title: "Break ended",
                  message: `Your ${MAX_BREAK_MINUTES}-minute break has ended. Please return to work.`,
                  channels: ["webpush"],
                  data: {
                    kind: "break_ended",
                    attendanceId: String(attendance._id),
                    breakIn: attendance.breakIn,
                    breakOut: attendance.breakOut,
                    maxBreakMinutes: MAX_BREAK_MINUTES,
                  },
                });
                attendance.breakEndedNotified = true;
              }

              await attendance.save();

              logger.info("Auto-ended break by system", {
                attendanceId: attendance._id,
                userId: String(userId),
                breakElapsed,
                overdueMs,
              });

              // Continue to next attendance (now not on-break)
              continue;
            }

            // 3) Admin notification if user is overdue by N minutes
            // This only makes sense while still on-break. If you auto-end, this branch won't run.
            // However, if schedules drift, or policy changes, keep it defensive.
            if (
              !attendance.breakAdminNotified &&
              breakElapsed >= MAX_BREAK_MS + BREAK_ADMIN_OVERDUE_MS
            ) {
              const admins = await User.find({
                role: { $in: ["admin", "superadmin"] },
                isEmailVerified: true,
              }).select("_id");

              const overdueMs = Math.max(0, breakElapsed - MAX_BREAK_MS);
              const overdueMinutes = Math.ceil(overdueMs / 60000);

              for (const admin of admins) {
                await sendNotification({
                  userId: admin._id,
                  type: "break_overdue_admin",
                  title: "Graduate break overdue",
                  message: `${attendance.userId?.name || "A graduate"} is overdue from break by ~${overdueMinutes} min.`,
                  channels: ["webpush"],
                  data: {
                    kind: "break_overdue_admin",
                    attendanceId: String(attendance._id),
                    graduateUserId: String(userId),
                    graduateName: attendance.userId?.name,
                    breakIn: attendance.breakIn,
                    maxBreakMinutes: MAX_BREAK_MINUTES,
                    overdueMinutes,
                  },
                });
              }

              attendance.breakAdminNotified = true;
              await attendance.save();

              logger.info("Admin notified for overdue break", {
                attendanceId: attendance._id,
                graduateUserId: String(userId),
                adminsNotified: admins.length,
                overdueMinutes,
              });
            }
          } catch (err) {
            logger.error(
              `Break reminder check failed for attendance ${attendance?._id}`,
              err,
            );
          }
        }
      } catch (err) {
        logger.error("Break reminder job error", err);
      }
    },
    { scheduled: true, timezone },
  );

  return task;
}

export function startDayInitJob() {
  // Run at 00:01 every day
  const schedule = process.env.DAY_INIT_CRON || "1 0 * * *";

  const bootNow = new Date();
  const jobNow = getTZParts(bootNow, timezone);
  const saNow = getTZParts(bootNow, SA_TZ);
  const etaMs = msUntilNextCron(schedule, timezone);

  debugLog(
    `[INFO] Starting day-init job with schedule: ${schedule} (TZ: ${timezone})`,
  );
  debugLog("[DayInitJob] Time snapshot", {
    nowISO: bootNow.toISOString(),
    nowInJobTZ: jobNow.formatted,
    nowInSA: saNow.formatted,
    nextRunIn: formatMs(etaMs),
    tz: timezone,
    schedule,
  });

  const task = cron.schedule(
    schedule,
    async () => {
      logger.info("Running day-init job");

      const today = getTodayDate();
      const dayInfo = getDayType(today);

      // Only create records for weekends and holidays
      if (dayInfo.type === "workday") {
        logger.info("Skipping day-init - today is a workday");
        return;
      }

      let createdCount = 0;
      let errorCount = 0;

      try {
        // Get all active users
        const users = await User.find({
          role: "graduate",
          isEmailVerified: true,
        }).lean();

        for (const user of users) {
          try {
            // Check if record already exists
            const existing = await Attendance.findOne({
              userId: user._id,
              date: today,
            });

            if (!existing) {
              await Attendance.create({
                userId: user._id,
                date: today,
                type: dayInfo.type,
                attendanceStatus: dayInfo.status,
                holidayName: dayInfo.holidayName,
                clockStatus: "clocked-out",
                isClosed: true,
              });
              createdCount++;
            }
          } catch (err) {
            // Ignore duplicate key errors
            if (err.code !== 11000) {
              logger.error(
                `Failed to create ${dayInfo.type} record for user ${user._id}`,
                err,
              );
              errorCount++;
            }
          }
        }

        logger.info(`Day-init job completed (${dayInfo.type})`, {
          createdCount,
          errorCount,
        });
      } catch (err) {
        logger.error("Day-init job error", err);
      }
    },
    { scheduled: true, timezone },
  );

  return task;
}
