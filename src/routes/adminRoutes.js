import { Router } from "express";
import {
  adminGetReports,
  adminExportReports,
  approveReport,
  rejectReport,
  markReportReviewed,
  adminGetUsers,
} from "../controllers/adminController.js";
import { protect, authorize } from "../middlewares/auth.js";
import { reviewReportValidation } from "../middlewares/validators.js";

const router = Router();

// All admin routes require authentication and admin role
router.use(protect, authorize("admin"));

// Reports
router.get("/reports", adminGetReports);
router.get("/reports/export", adminExportReports);

// Report review workflow
router.post("/reports/:id/approve", reviewReportValidation, approveReport);
router.post("/reports/:id/reject", reviewReportValidation, rejectReport);
router.post("/reports/:id/review", reviewReportValidation, markReportReviewed);

// Users
router.get("/users", adminGetUsers);

export default router;
