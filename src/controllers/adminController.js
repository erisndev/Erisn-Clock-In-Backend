import WeeklyReport from "../models/WeeklyReport.js";
import { exportCSV, exportPDF } from "../utils/exportReports.js";
import ErrorResponse from "../utils/errorResponse.js";

// ADMIN — GET REPORTS with filters
export const adminGetReports = async (req, res) => {
  try {
    const { userId, startDate, endDate, status } = req.query;
    let query = {};

    if (userId) query.userId = userId; // FIXED

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
      .populate("userId", "name email") // FIXED
      .sort({ weekStart: -1 });

    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json(new ErrorResponse(err.message || "Server error", 500));
  }
};

// ADMIN — EXPORT REPORTS
export const adminExportReports = async (req, res) => {
  try {
    const { weekStart, weekEnd, type } = req.query;

    // Validate dates
    if (!weekStart || !weekEnd) {
      return res.status(400).json(new ErrorResponse("weekStart and weekEnd are required", 400));
    }

    const start = new Date(weekStart);
    const end = new Date(weekEnd);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json(new ErrorResponse("Invalid weekStart or weekEnd date", 400));
    }

    // Fetch weekly reports for all users in the date range
    const reports = await WeeklyReport.find({
      weekStart: { $gte: start },
      weekEnd: { $lte: end },
    })
      .populate("userId", "name email role") // Include role in populated data
      .sort({ weekStart: 1 });

    if (!reports.length) {
      return res.status(404).json(new ErrorResponse("No reports found for the selected week range", 404));
    }

    // Export based on requested type
    if (type === "csv") return exportCSV(res, reports);
    if (type === "pdf") return exportPDF(res, reports);

    return res.status(400).json(new ErrorResponse("Invalid export type, use 'csv' or 'pdf'", 400));

  } catch (err) {
    console.error(err);
    return res.status(500).json(new ErrorResponse(err.message || "Server error", 500));
  }
};

