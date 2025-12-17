import WeeklyReport from '../models/WeeklyReport.js';
import { exportCSV, exportPDF } from '../utils/exportReports.js';
import ErrorResponse from '../utils/errorResponse.js';

/**
 * CREATE REPORT
 */
export const submitReport = async (req, res, next) => {
  try {
    const { weekStart, weekEnd } = req.body;

    if (!weekStart || !weekEnd) {
      return next(
        new ErrorResponse('weekStart and weekEnd are required.', 400)
      );
    }

    const exists = await WeeklyReport.findOne({
      userId: req.user._id,
      weekStart: new Date(weekStart),
      weekEnd: new Date(weekEnd)
    });

    if (exists) {
      return next(
        new ErrorResponse('Report for this week already exists.', 400)
      );
    }

    const report = await WeeklyReport.create({
      ...req.body,
      userId: req.user._id
    });

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
};

/**
 * UPDATE REPORT
 */
export const updateReport = async (req, res, next) => {
  try {
    const report = await WeeklyReport.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!report) {
      return next(new ErrorResponse('Report not found', 404));
    }

    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
};

/**
 * VIEW REPORT BY ID
 */
export const getReportById = async (req, res, next) => {
  try {
    const report = await WeeklyReport.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!report) {
      return next(new ErrorResponse('Report not found', 404));
    }

    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
};

/**
 * FETCH ALL MY REPORTS
 */
export const getMyReports = async (req, res, next) => {
  try {
    const reports = await WeeklyReport.find({
      userId: req.user._id
    }).sort({ weekStart: -1 });

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (err) {
    next(err);
  }
};

/**
 * EXPORT REPORTS (CSV / PDF)
 */
export const exportMyReports = async (req, res, next) => {
  try {
    const reports = await WeeklyReport.find({
      userId: req.user._id
    });

    if (req.query.type === 'csv') {
      return exportCSV(res, reports);
    }

    if (req.query.type === 'pdf') {
      return exportPDF(res, reports);
    }

    return next(new ErrorResponse('Invalid export type', 400));
  } catch (err) {
    next(err);
  }
};
