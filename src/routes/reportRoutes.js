import { Router } from "express";
import {
  submitReport,
  updateReport,
  getMyReports,
  getReportById,
  exportMyReports,
} from "../controllers/reportController.js";
import { protect } from "../middlewares/auth.js";
import {
  submitReportValidation,
  updateReportValidation,
} from "../middlewares/validators.js";

const router = Router();

// Create report with validation
router.post("/", protect, submitReportValidation, submitReport);

// Update report with validation
router.put("/:id", protect, updateReportValidation, updateReport);

// Get all my reports
router.get("/", protect, getMyReports);

// Export my reports
router.get("/export/data", protect, exportMyReports);

// Get single report by ID
router.get("/:id", protect, getReportById);

export default router;
