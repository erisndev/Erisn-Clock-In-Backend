import { Router } from 'express';
const router = Router();

import { adminGetReports, adminExportReports } from "../controllers/adminController.js";
import { protect, authorize } from "../middlewares/auth.js";

// Admin-only routes
router.get(
  "/reports",
  protect,
  authorize("admin"),
  adminGetReports
);

router.get(
  "/reports/export",
  protect,
  authorize("admin"),
  adminExportReports
);

export default router;
