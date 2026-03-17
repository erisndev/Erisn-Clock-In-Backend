import WeeklyReport from '../models/WeeklyReport.js';
import { exportCSV, exportPDF } from '../utils/exportReports.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { sanitizeFields } from '../utils/sanitize.js';
import logger from '../utils/logger.js';

// Fields to sanitize for XSS
const SANITIZE_FIELDS = ['summary', 'challenges', 'learnings', 'nextWeek', 'goals'];

/**
 * CREATE REPORT
 */
export const submitReport = async (req, res, next) => {
  try {
    const { weekStart, weekEnd } = req.body;

    if (!weekStart || !weekEnd) {
      return next(new ErrorResponse('weekStart and weekEnd are required.', 400));
    }

    // Check for existing report
    const exists = await WeeklyReport.findOne({
      userId: req.user._id,
      weekStart: new Date(weekStart),
      weekEnd: new Date(weekEnd),
    });

    if (exists) {
      return next(new ErrorResponse('Report for this week already exists.', 400));
    }

    // Sanitize user input
    const sanitizedBody = sanitizeFields(req.body, SANITIZE_FIELDS);

    const report = await WeeklyReport.create({
      ...sanitizedBody,
      userId: req.user._id,
      status: sanitizedBody.status === 'Draft' ? 'Draft' : 'Submitted',
    });

    logger.info('Report created', { reportId: report._id, userId: req.user._id });

    res.status(201).json({
      success: true,
      data: report,
    });
  } catch (err) {
    logger.error('Submit report error', err);
    next(err);
  }
};

/**
 * UPDATE REPORT
 */
export const updateReport = async (req, res, next) => {
  try {
    const report = await WeeklyReport.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!report) {
      return next(new ErrorResponse('Report not found', 404));
    }

    // Only draft reports can be edited
    if (report.status !== 'Draft') {
      return next(new ErrorResponse('Only draft reports can be edited', 400));
    }

    // Sanitize user input
    const sanitizedBody = sanitizeFields(req.body, SANITIZE_FIELDS);

    // Only allow status to be Draft or Submitted (treat Submitted as submission)
    if (sanitizedBody.status && !['Draft', 'Submitted'].includes(sanitizedBody.status)) {
      delete sanitizedBody.status;
    }

    // Update fields on the document
    report.weekStart = sanitizedBody.weekStart || report.weekStart;
    report.weekEnd = sanitizedBody.weekEnd || report.weekEnd;
    report.summary = sanitizedBody.summary || report.summary;
    report.challenges = sanitizedBody.challenges ?? report.challenges;
    report.learnings = sanitizedBody.learnings ?? report.learnings;
    report.nextWeek = sanitizedBody.nextWeek ?? report.nextWeek;
    report.goals = sanitizedBody.goals ?? report.goals;
    report.status = sanitizedBody.status || report.status;

    const updated = await report.save();

    logger.info('Report updated', { reportId: updated._id, userId: req.user._id });

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    logger.error('Update report error', err);
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
      userId: req.user._id,
    }).populate('reviewerId', 'name email');

    if (!report) {
      return next(new ErrorResponse('Report not found', 404));
    }

    res.json({
      success: true,
      data: report,
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
      userId: req.user._id,
    })
      .populate('reviewerId', 'name email')
      .sort({ weekStart: -1 });

    res.json({
      success: true,
      count: reports.length,
      data: reports,
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
      userId: req.user._id,
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
