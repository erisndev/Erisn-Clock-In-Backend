// src/jobs/attendanceJob.js
// Handles automatic attendance actions:
// 1. Mark users as absent at 17:00 if they haven't clocked in
// 2. Auto clock-out users at 23:59 if they forgot to clock out

import cron from "node-cron";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import logger from "../utils/logger.js";
import { dateKeyInTZ } from "../utils/time.js";

const timezone = process.env.TZ || "Africa/Johannesburg";

// Helper to get today's date string
const getTodayDate = () => dateKeyInTZ(new Date(), timezone);

// Helper to get day type
const getDayType = (dateStr) => {
  if (Attendance.isWeekend(dateStr)) {
    return { type: 'weekend', status: 'weekend', holidayName: '' };
  }
  
  const holiday = Attendance.isHoliday(dateStr);
  if (holiday) {
    return { type: 'holiday', status: 'holiday', holidayName: holiday.name };
  }
  
  return { type: 'workday', status: 'absent', holidayName: '' };
};

// Helper to format duration
const formatDuration = (ms) => {
  if (!ms || ms <= 0) return '0h 0m';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

/**
 * Mark Absent Job
 * Runs at 17:00 every weekday
 * Creates attendance records for users who haven't clocked in and marks them as absent
 */
export function startMarkAbsentJob() {
  // Run at 17:00 Monday-Friday
  const schedule = process.env.MARK_ABSENT_CRON || "0 17 * * 1-5";
  
  logger.info(`[INFO] Starting mark-absent job with schedule: ${schedule} (TZ: ${timezone})`);

  const task = cron.schedule(
    schedule,
    async () => {
      logger.info("Running mark-absent job");
      
      const today = getTodayDate();
      const dayInfo = getDayType(today);
      
      // Skip if weekend or holiday
      if (dayInfo.type !== 'workday') {
        logger.info(`Skipping mark-absent job - today is ${dayInfo.type}`);
        return;
      }

      let markedCount = 0;
      let errorCount = 0;

      try {
        // Get all active users (graduates)
        const users = await User.find({ 
          role: "graduate", 
          isEmailVerified: true 
        }).lean();

        for (const user of users) {
          try {
            // Check if user has attendance record for today
            let attendance = await Attendance.findOne({
              userId: user._id,
              date: today
            });

            if (!attendance) {
              // Create absent record
              attendance = await Attendance.create({
                userId: user._id,
                date: today,
                type: 'workday',
                attendanceStatus: 'absent',
                clockStatus: 'clocked-out',
                autoMarkedAbsent: true,
                isClosed: true
              });
              markedCount++;
              logger.info(`Marked absent: ${user.name} (${user.email})`);
            } else if (!attendance.clockIn && !attendance.autoMarkedAbsent) {
              // Update existing record to mark as absent
              attendance.attendanceStatus = 'absent';
              attendance.autoMarkedAbsent = true;
              attendance.isClosed = true;
              await attendance.save();
              markedCount++;
              logger.info(`Marked absent (updated): ${user.name} (${user.email})`);
            }
          } catch (err) {
            logger.error(`Failed to mark absent for user ${user._id}`, err);
            errorCount++;
          }
        }

        logger.info("Mark-absent job completed", { markedCount, errorCount, total: users.length });
      } catch (err) {
        logger.error("Mark-absent job error", err);
      }
    },
    { scheduled: true, timezone }
  );

  return task;
}

/**
 * Auto Clock-Out Job
 * Runs at 23:59 every day
 * Automatically clocks out users who forgot to clock out
 */
export function startAutoClockOutJob() {
  // Run at 23:59 every day
  const schedule = process.env.AUTO_CLOCKOUT_CRON || "59 23 * * *";
  
  logger.info(`[INFO] Starting auto-clockout job with schedule: ${schedule} (TZ: ${timezone})`);

  const task = cron.schedule(
    schedule,
    async () => {
      logger.info("Running auto-clockout job");
      
      const today = getTodayDate();
      const now = new Date();
      
      let clockedOutCount = 0;
      let errorCount = 0;

      try {
        // Find all users who are still clocked in today
        const activeAttendances = await Attendance.find({
          date: today,
          clockIn: { $ne: null },
          clockOut: null,
          isClosed: false
        }).populate('userId', 'name email');

        for (const attendance of activeAttendances) {
          try {
            // End any active break
            if (attendance.clockStatus === 'on-break' && attendance.breakIn) {
              const breakTime = now.getTime() - attendance.breakIn.getTime();
              attendance.breakOut = now;
              attendance.breakDuration = (attendance.breakDuration || 0) + breakTime;
            }

            // Calculate work duration
            const totalTime = now.getTime() - attendance.clockIn.getTime();
            const workDuration = totalTime - (attendance.breakDuration || 0);

            // Update attendance record
            attendance.clockOut = now;
            attendance.duration = Math.max(0, workDuration);
            attendance.durationFormatted = formatDuration(attendance.duration);
            attendance.clockStatus = 'clocked-out';
            attendance.isClosed = true;
            attendance.autoClockOut = true;
            attendance.clockOutNotes = 'Auto clocked out by system at end of day';

            await attendance.save();
            clockedOutCount++;
            
            const userName = attendance.userId?.name || 'Unknown';
            logger.info(`Auto clocked out: ${userName}`, { 
              attendanceId: attendance._id,
              duration: attendance.durationFormatted 
            });
          } catch (err) {
            logger.error(`Failed to auto clock-out attendance ${attendance._id}`, err);
            errorCount++;
          }
        }

        logger.info("Auto-clockout job completed", { clockedOutCount, errorCount });
      } catch (err) {
        logger.error("Auto-clockout job error", err);
      }
    },
    { scheduled: true, timezone }
  );

  return task;
}

/**
 * Initialize Weekend/Holiday Records Job
 * Runs at 00:01 every day
 * Creates attendance records for weekends and holidays
 */
export function startDayInitJob() {
  // Run at 00:01 every day
  const schedule = process.env.DAY_INIT_CRON || "1 0 * * *";
  
  logger.info(`[INFO] Starting day-init job with schedule: ${schedule} (TZ: ${timezone})`);

  const task = cron.schedule(
    schedule,
    async () => {
      logger.info("Running day-init job");
      
      const today = getTodayDate();
      const dayInfo = getDayType(today);
      
      // Only create records for weekends and holidays
      if (dayInfo.type === 'workday') {
        logger.info("Skipping day-init - today is a workday");
        return;
      }

      let createdCount = 0;
      let errorCount = 0;

      try {
        // Get all active users
        const users = await User.find({ 
          role: "graduate", 
          isEmailVerified: true 
        }).lean();

        for (const user of users) {
          try {
            // Check if record already exists
            const existing = await Attendance.findOne({
              userId: user._id,
              date: today
            });

            if (!existing) {
              await Attendance.create({
                userId: user._id,
                date: today,
                type: dayInfo.type,
                attendanceStatus: dayInfo.status,
                holidayName: dayInfo.holidayName,
                clockStatus: 'clocked-out',
                isClosed: true
              });
              createdCount++;
            }
          } catch (err) {
            // Ignore duplicate key errors
            if (err.code !== 11000) {
              logger.error(`Failed to create ${dayInfo.type} record for user ${user._id}`, err);
              errorCount++;
            }
          }
        }

        logger.info(`Day-init job completed (${dayInfo.type})`, { createdCount, errorCount });
      } catch (err) {
        logger.error("Day-init job error", err);
      }
    },
    { scheduled: true, timezone }
  );

  return task;
}
