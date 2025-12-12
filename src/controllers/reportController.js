import WeeklyReport from '../models/WeeklyReport.js';
import { exportCSV, exportPDF } from '../utils/exportReports.js';
import ErrorResponse from '../utils/errorResponse.js';

// CREATE REPORT
export const submitReport = async (req, res) => {
  try {
    const { weekStart, weekEnd } = req.body;

    if (!weekStart || !weekEnd) {
      return res
        .status(400)
        .json(new ErrorResponse('weekStart and weekEnd are required.', 400));
    }

    // Check if report exists for same week and user
    const exists = await WeeklyReport.findOne({
      userId: req.user._id,
      weekStart: new Date(weekStart),
      weekEnd: new Date(weekEnd),
    });

    if (exists) {
      return res
        .status(400)
        .json(new ErrorResponse('Report for this week already exists.', 400));
    }

    const report = await WeeklyReport.create({
      ...req.body,
      userId: req.user._id,
    });

    res.status(201).json(report);
  } catch (err) {
    res.status(500).json(new ErrorResponse(err.message || 'Server error', 500));
  }
};

// UPDATE REPORT
export const updateReport = async (req, res) => {
  try {
    const report = await WeeklyReport.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );

    if (!report) {
      return res.status(404).json(new ErrorResponse('Report not found', 404));
    }

    res.json(report);
  } catch (err) {
    res.status(500).json(new ErrorResponse(err.message || 'Server error', 500));
  }
};

// VIEW REPORT BY ID
export const getReportById = async (req, res) => {
  try {
    const report = await WeeklyReport.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!report) {
      return res.status(404).json(new ErrorResponse('Report not found', 404));
    }

    res.json(report);
  } catch (err) {
    res.status(500).json(new ErrorResponse(err.message || 'Server error', 500));
  }
};

// FETCH ALL MY REPORTS
export const getMyReports = async (req, res) => {
  try {
    const reports = await WeeklyReport.find({ userId: req.user._id }).sort({
      weekStart: -1,
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json(new ErrorResponse(err.message || 'Server error', 500));
  }
};

// EXPORT (CSV / PDF)
export const exportMyReports = async (req, res) => {
  try {
    const reports = await WeeklyReport.find({ userId: req.user._id });

    if (req.query.type === 'csv') return exportCSV(res, reports);
    if (req.query.type === 'pdf') return exportPDF(res, reports);

    res.status(400).json(new ErrorResponse('Invalid export type', 400));
  } catch (err) {
    res.status(500).json(new ErrorResponse(err.message || 'Server error', 500));
  }
};
