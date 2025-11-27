// src/jobs/clockOutReminderJob.js
const cron = require('node-cron');
const Attendance = require('../models/Attendance'); // adjust path
const User = require('../models/User');
const { sendNotification } = require('../services/notificationService');
const logger = require('../utils/logger');

// Every day at 17:30
const schedule = process.env.CLOCKOUT_REMINDER_CRON || '30 17 * * *';

function startClockOutReminderJob() {
  logger.info('Starting clock-out reminder job with schedule: ' + schedule);
  const task = cron.schedule(schedule, async () => {
    logger.info('Running clock-out reminder job');
    // Find attendance records for today with no clockOut
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date();
    endOfDay.setHours(23,59,59,999);

    const missing = await Attendance.find({
      clockIn: { $gte: startOfDay, $lte: endOfDay },
      clockOut: null
    }).populate('user');

    for (const att of missing) {
      // send reminder to att.user
      await sendNotification({
        userId: att.user._id,
        type: 'missed_clockout',
        title: 'Clock-out reminder',
        message: 'You forgot to clock out today. Please clock out to record your hours.',
        channels: ['email','webpush']
      });
    }
  }, { scheduled: true, timezone: process.env.TZ || 'Africa/Johannesburg' });
  return task;
}

module.exports = { startClockOutReminderJob };
