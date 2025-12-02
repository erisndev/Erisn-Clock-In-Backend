// server.js
import "dotenv/config.js";
import connectDB from "./config/db.js";
import app from "./app.js";

// 🟢 Import cron jobs
import { startReportReminderJob } from "./jobs/reportReminderJob.js";
import { startClockOutReminderJob } from "./jobs/clockOutReminderJob.js";

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);

  // 🟢 Start cron jobs ONLY if enabled
  if (process.env.ENABLE_JOBS === "true") {
    console.log("⏳ Cron Jobs Enabled — Starting...");

    startReportReminderJob();
    startClockOutReminderJob();

    console.log("✅ Cron Jobs Started");
  } else {
    console.log("⚠️ Cron Jobs are disabled. Set ENABLE_JOBS=true in .env to activate.");
  }
});
