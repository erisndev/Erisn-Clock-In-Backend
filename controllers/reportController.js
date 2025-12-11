js
const WeeklyReport = require("../models/weeklyreport");
const { exportCSV, exportPDF } = require("../exportUtils");


exports.submitReport = async (req, res) => {
  try {
    const exists = await WeeklyReport.findOne({
      userId: req.user.id,
      weekStart: req.body.weekStart,
      weekEnd: req.body.weekEnd
    });

    if (exists)
      return res.status(400).json({ message: "Report for this week already exists." });

    const report = await WeeklyReport.create({
      ...req.body,
      userId: req.user.id,
    });

    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE REPORT
exports.updateReport = async (req, res) => {
  try {
    const report = await WeeklyReport.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );

    if (!report) return res.status(404).json({ message: "Report not found" });

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// VIEW SINGLE REPORT
exports.getReportById = async (req, res) => {
  try {
    const report = await WeeklyReport.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!report) return res.status(404).json({ message: "Not found" });

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// FETCH ALL REPORTS FOR LOGGED IN USER
exports.getMyReports = async (req, res) => {
  try {
    const reports = await WeeklyReport.find({ userId: req.user.id }).sort({
      weekStart: -1,
    });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// EXPORT MY REPORTS (CSV or PDF)
exports.exportMyReports = async (req, res) => {
  try {
    const reports = await WeeklyReport.find({ userId: req.user.id });

    if (req.query.type === "csv") {
      return exportCSV(res, reports);
    }
    if (req.query.type === "pdf") {
      return exportPDF(res, reports);
    }

    res.status(400).json({ message: "Invalid export type" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};




