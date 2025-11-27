// src/jobs/reportReminderJob.js
const cron = require('node-cron');
const User = require('../models/User');
const { sendNotification } = require('../services/notificationService');
const logger = require('../utils/logger');

// Cron pattern: every Monday at 08:00
const schedule = process.env.REPORT_REMINDER_CRON || '0 8 * * MON';

function startReportReminderJob() {
  logger.info('Starting report reminder job with schedule: ' + schedule);
  // schedule returns a CronTask — store it if you need to stop later
  const task = cron.schedule(schedule, async () => {
    logger.info('Running report reminder job');
    // Fetch all grads (role = 'graduate' assumed)
    const grads = await User.find({ role: 'graduate', active: true }).lean();
    for (const g of grads) {
      // Optionally check if they already submitted this week's report before sending
      // (You can query WeeklyReport model here — omitted for brevity)
      await sendNotification({
        userId: g._id,
        type: 'report_reminder',
        title: 'Weekly report reminder',
        message: 'Please submit your weekly report for this week.',
        channels: ['email','webpush']
      });
    }
  }, { scheduled: true, timezone: process.env.TZ || 'Africa/Johannesburg' });
  return task;
}

module.exports = { startReportReminderJob };


