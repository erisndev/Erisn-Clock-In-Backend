js
const express = require("express");
const router = express.Router();
const {
  submitReport,
  updateReport,
  getMyReports,
  getReportById,
  exportMyReports,
} = require("../controllers/reportController");

const auth = require("../middleware/auth"); // protect routes

router.post("/", auth, submitReport);
router.put("/:id", auth, updateReport);
router.get("/", auth, getMyReports);
router.get("/:id", auth, getReportById);
router.get("/export/data", auth, exportMyReports);

module.exports = router;
