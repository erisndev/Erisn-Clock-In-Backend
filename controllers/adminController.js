js
const WeeklyReport = require("../models/weeklyreport");
const { exportCSV, exportPDF } = require("../exportUtils");

// ADMIN: FILTER ALL REPORTS
exports.adminGetReports = async (req, res) => {
  try {
    const { userId, startDate, endDate, status } = req.query;

    let query = {};

    if (userId) query.userId = userId;
    if (startDate) query.weekStart = { $gte: new Date(startDate) };
    if (endDate) query.weekEnd = { ...query.weekEnd, $lte: new Date(endDate) };
    if (status) query.status = status;

    const reports = await WeeklyReport.find(query)
      .populate("userId", "name email")
      .sort({ weekStart: -1 });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ADMIN EXPORT CSV/PDF
exports.adminExportReports = async (req, res) => {
  try {
    const reports = await WeeklyReport.find().populate("userId", "name email");

    if (req.query.type === "csv") return exportCSV(res, reports);
    if (req.query.type === "pdf") return exportPDF(res, reports);

    res.status(400).json({ message: "Invalid export type" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




