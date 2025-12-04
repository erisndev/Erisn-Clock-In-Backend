// src/app.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { errorHandler } from "./middlewares/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { protect, authorize } from "./middlewares/auth.js";

const app = express();

// Core middlewares
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(helmet());
app.use(compression());

// 🟢 Custom Request Logger (replaces Morgan)
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// Protected route
app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "This is protected data", user: req.user });
});

// Admin-only route
app.get("/api/admin", protect, authorize("admin"), (req, res) => {
  res.json({ message: "Welcome Admin!" });
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

// Global error handler
app.use(errorHandler);

// ❗ IMPORTANT: No app.listen() here — server.js handles that.

export default app;
