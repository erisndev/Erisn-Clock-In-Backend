import { Router } from "express";
import {
  submitReport,
  updateReport,
  getMyReports,
  getReportById,
  exportMyReports,
} from "../controllers/reportController.js";
import { protect } from "../middlewares/auth.js"; 

const router = Router();

router.post("/", protect, submitReport);
router.put("/:id", protect, updateReport);
router.get("/", protect, getMyReports);
router.get("/export/data", protect, exportMyReports);
router.get("/:id", protect, getReportById);

export default router;
