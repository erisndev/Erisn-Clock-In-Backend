import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { mongoSanitizeMiddleware } from "./middlewares/mongoSanitize.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { requestIdMiddleware } from "./middlewares/requestId.js";
import { generalLimiter } from "./middlewares/rateLimiters.js";
import logger from "./utils/logger.js";

import authRoutes from "./routes/authRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { protect, authorize } from "./middlewares/auth.js";
import userRoutes from "./routes/userRoute.js";
import healthRoutes from "./routes/healthRoutes.js";
import { notFound } from "./middlewares/notFound.js";

const app = express();

// Request ID for log correlation
app.use(requestIdMiddleware);

// Core middlewares
app.use(express.json({ limit: "200kb" }));

// CORS hardening: allow specific origin only
const allowedOrigins = [process.env.FRONTEND_URL, process.env.FRONTEND_URL_DEV].filter(Boolean);
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(helmet());
app.use(compression());
app.use(mongoSanitizeMiddleware);

// General rate limiter (fallback)
app.use(generalLimiter);

// Request logger with requestId
app.use((req, res, next) => {
  const userId = req.user?._id || "anonymous";
  logger.info(`${req.method} ${req.url}`, { requestId: req.id, userId });
  next();
});

// Health endpoints (no auth required)
app.use("/api", healthRoutes);

// Protected route example
app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "This is protected data", user: req.user });
});

// Admin-only route example
app.get("/api/admin-test", protect, authorize("admin"), (req, res) => {
  res.json({ message: "Welcome Admin!" });
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

export default app;
