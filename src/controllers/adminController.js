import WeeklyReport from "../models/WeeklyReport.js";
import { exportCSV, exportPDF } from "../utils/exportReports.js";
import ErrorResponse from "../utils/errorResponse.js";

// ADMIN — GET REPORTS with filters
export const adminGetReports = async (req, res) => {
  try {
    const { userId, startDate, endDate, status } = req.query;
    let query = {};

    if (userId) query.user = userId;

    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start)) return res.status(400).json(new ErrorResponse("Invalid startDate", 400));
      query.weekStart = { $gte: start };
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end)) return res.status(400).json(new ErrorResponse("Invalid endDate", 400));
      
      query.weekEnd = { ...(query.weekEnd || {}), $lte: end };
    }

    if (status) query.status = status;

    const reports = await WeeklyReport.find(query)
      .populate("user", "name email")
      .sort({ weekStart: -1 });

    res.json(reports);
  } catch (err) {
    res.status(500).json(new ErrorResponse(err.message, 500));
  }
};

// ADMIN — EXPORT REPORTS
export const adminExportReports = async (req, res) => {
  try {
    const reports = await WeeklyReport.find()
      .populate("user", "name email");

    if (req.query.type === "csv") return exportCSV(res, reports);
    if (req.query.type === "pdf") return exportPDF(res, reports);

    res.status(400).json(new ErrorResponse("Invalid export type", 400));
  } catch (err) {
    res.status(500).json(new ErrorResponse(err.message, 500));
  }
};
