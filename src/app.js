import express from "express";
import mongoose from "mongoose";
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

const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(helmet());
app.use(morgan("dev"));
app.use(compression());

//Potected route
app.get("/api/protected", protect, (req, res) => {
  res.json({ message: "This is protected data", user: req.user });
});

// Admin-only route
app.get("/api/admin", protect, authorize("admin"), (req, res) => {
  res.json({ message: "Welcome Admin!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on port ${PORT}"));

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

export default app;
