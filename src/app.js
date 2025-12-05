 import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import { errorHandler } from "./middlewares/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { protect, authorize } from "./middlewares/auth.js";
import userRoutes from './routes/userRoute.js';

const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(helmet());
app.use(morgan("dev"));
app.use(compression());

// Protected route
app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "This is protected data", user: req.user });
});

// Admin-only route
app.get("/api/admin", protect, authorize("admin"), (req, res) => {
  res.json({ message: "Welcome Admin!" });
});

// 🟢 EXISTING ROUTES
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

// ❗ REMOVE app.listen() from here
// Server will be started by server.js instead.

export default app;
