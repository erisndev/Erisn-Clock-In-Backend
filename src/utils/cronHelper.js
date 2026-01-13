// utils/cronHelper.js
import cron from "node-cron";

/**
 * A simple registry to prevent multiple cron jobs
 * from being started more than once.
 */
const jobRegistry = new Map();

/**
 * Create and start a cron job safely.
 *
 * @param {string} name - Unique job name (e.g., "weeklyReportReminder")
 * @param {string} schedule - Cron expression (e.g., "0 8 * * MON")
 * @param {Function} task - The async function to run on schedule
 * @param {string} timezone - (optional) default "Africa/Johannesburg"
 *
 * @returns {Object} The created cron task
 */
export function createCronJob(
  name,
  schedule,
  task,
  timezone = "Africa/Johannesburg"
) {
  if (!schedule) {
    console.error(`❌ CRON ERROR: Job "${name}" missing schedule.`);
    return null;
  }

  // Prevent duplicate jobs
  if (jobRegistry.has(name)) {
    console.warn(
      `⚠️ CRON WARNING: Job "${name}" is already registered. Skipping duplicate.`
    );
    return jobRegistry.get(name);
  }

  try {
    const cronTask = cron.schedule(
      schedule,
      async () => {
        console.log(
          `⏰ Running cron job: ${name} (${new Date().toISOString()})`
        );

        try {
          await task();
          console.log(`✅ Cron job "${name}" completed.`);
        } catch (err) {
          console.error(`❌ Cron job "${name}" failed:`, err.message);
        }
      },
      {
        scheduled: true,
        timezone,
      }
    );

    jobRegistry.set(name, cronTask);
    console.log(`🟢 Cron job "${name}" registered with schedule: ${schedule}`);
    return cronTask;
  } catch (error) {
    console.error(`❌ Failed to create cron job "${name}":`, error.message);
    return null;
  }
}

/**
 * Stop a cron job by name
 */
export function stopCronJob(name) {
  const job = jobRegistry.get(name);
  if (job) {
    job.stop();
    console.log(`⛔ Cron job "${name}" stopped.`);
  } else {
    console.warn(`⚠️ No cron job found with name "${name}".`);
  }
}

/**
 * Get a registered cron job
 */
export function getCronJob(name) {
  return jobRegistry.get(name) || null;
}

/**
 * Stop ALL cron jobs — useful for testing or graceful shutdown
 */
export function stopAllCronJobs() {
  for (const [name, job] of jobRegistry.entries()) {
    job.stop();
    console.log(`⛔ Stopped cron job: ${name}`);
  }
  jobRegistry.clear();
  console.log("🛑 All cron jobs stopped.");
}
