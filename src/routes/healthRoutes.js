import express from "express";
import mongoose from "mongoose";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

router.get("/ready", async (req, res) => {
  const state = mongoose.connection.readyState; // 1 connected
  res.json({ status: state === 1 ? "ready" : "not-ready", dbState: state });
});

export default router;
