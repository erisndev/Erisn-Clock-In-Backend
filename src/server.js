// server.js
import "dotenv/config.js";
import connectDB from "./config/db.js";
import app from "./app.js";

// Import cron jobs
import { startReportReminderJob } from "./jobs/reportReminderJob.js";
import { startClockOutReminderJob } from "./jobs/clockOutReminderJob.js";
import {
  startMarkAbsentJob,
  startAutoClockOutJob,
  startDayInitJob,
} from "./jobs/attendanceJob.js";

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

// Start cron jobs as part of process startup (not tied to the HTTP server binding).
// This prevents missing scheduled runs if the server is already bound/restarted differently.
if (process.env.ENABLE_JOBS === "true") {
  console.log("⏳ Cron Jobs Enabled — Starting...");

  // Report and notification jobs
  startReportReminderJob();
  startClockOutReminderJob();

  // Attendance automation jobs
  startMarkAbsentJob(); // Marks absent at 17:00 on workdays
  startAutoClockOutJob(); // Auto clock-out at 23:59
  startDayInitJob(); // Initialize weekend/holiday records at 00:01

  console.log("✅ Cron Jobs Started");
} else {
  console.log(
    "⚠️ Cron Jobs are disabled. Set ENABLE_JOBS=true in .env to activate.",
  );
}

console.log("Server started at", new Date().toISOString());

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
