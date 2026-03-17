import WeeklyReport from "../models/WeeklyReport.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import { exportCSV, exportPDF } from "../utils/exportReports.js";
import ErrorResponse from "../utils/ErrorResponse.js";
import { stripHtml } from "../utils/sanitize.js";
import logger from "../utils/logger.js";
import { dateKeyInTZ, formatDateInTZ } from "../utils/time.js";

// ==================== ADMIN — GET REPORTS ====================
export const adminGetReports = async (req, res) => {
  try {
    const {
      userId,
      startDate,
      endDate,
      status,
      page = 1,
      limit = 50,
    } = req.query;
    const query = { status: { $ne: "Draft" } };

    if (userId) query.userId = userId;

    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start))
        return res
          .status(400)
          .json(new ErrorResponse("Invalid startDate", 400));
      query.weekStart = { $gte: start };
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end))
        return res.status(400).json(new ErrorResponse("Invalid endDate", 400));
      query.weekEnd = { ...(query.weekEnd || {}), $lte: end };
    }

    if (status) {
      // Override the default $ne filter with the explicit status requested
      // Admin should never filter by Draft, but even if they do, the UI won't send it
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await WeeklyReport.countDocuments(query);

    const reports = await WeeklyReport.find(query)
      .populate("userId", "name email")
      .populate("reviewerId", "name email")
      .sort({ weekStart: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      data: reports,
    });
  } catch (err) {
    logger.error("Admin get reports error", err);
    res.status(500).json(new ErrorResponse(err.message || "Server error", 500));
  }
};

// ==================== ADMIN — EXPORT REPORTS ====================
export const adminExportReports = async (req, res) => {
  try {
    const { weekStart, weekEnd, type } = req.query;

    if (!weekStart || !weekEnd) {
      return res
        .status(400)
        .json(new ErrorResponse("weekStart and weekEnd are required", 400));
    }

    const start = new Date(weekStart);
    const end = new Date(weekEnd);

    if (isNaN(start) || isNaN(end)) {
      return res
        .status(400)
        .json(new ErrorResponse("Invalid weekStart or weekEnd date", 400));
    }

    // Paginated fetch for scalability
    const PAGE_SIZE = 500;
    let page = 0;
    let allReports = [];

    while (true) {
      const batch = await WeeklyReport.find({
        weekStart: { $gte: start },
        weekEnd: { $lte: end },
      })
        .populate("userId", "name email role")
        .sort({ weekStart: 1 })
        .skip(page * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean();

      if (batch.length === 0) break;
      allReports = allReports.concat(batch);
      page++;

      // Safety limit to prevent memory issues
      if (allReports.length > 10000) {
        return res
          .status(413)
          .json(
            new ErrorResponse(
              "Too many records. Please narrow the date range or use CSV.",
              413,
            ),
          );
      }
    }

    if (!allReports.length) {
      return res
        .status(404)
        .json(
          new ErrorResponse(
            "No reports found for the selected week range",
            404,
          ),
        );
    }

    if (type === "csv") return exportCSV(res, allReports);
    if (type === "pdf") return exportPDF(res, allReports);

    return res
      .status(400)
      .json(new ErrorResponse("Invalid export type, use 'csv' or 'pdf'", 400));
  } catch (err) {
    logger.error("Admin export reports error", err);
    return res
      .status(500)
      .json(new ErrorResponse(err.message || "Server error", 500));
  }
};

// ==================== ADMIN — APPROVE REPORT ====================
export const approveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewComment } = req.body;

    const report = await WeeklyReport.findById(id);
    if (!report) {
      return res.status(404).json(new ErrorResponse("Report not found", 404));
    }

    if (!["Submitted", "Reviewed"].includes(report.status)) {
      return res
        .status(400)
        .json(
          new ErrorResponse(
            `Cannot approve a report with status: ${report.status}`,
            400,
          ),
        );
    }

    report.status = "Approved";
    report.reviewerId = req.user._id;
    report.reviewedAt = new Date();
    report.reviewComment = stripHtml(reviewComment || "");

    await report.save();

    logger.info("Report approved", { reportId: id, reviewerId: req.user._id });

    res.json({
      success: true,
      message: "Report approved",
      data: report,
    });
  } catch (err) {
    logger.error("Approve report error", err);
    res.status(500).json(new ErrorResponse(err.message || "Server error", 500));
  }
};

// ==================== ADMIN — REJECT REPORT ====================
export const rejectReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewComment } = req.body;

    if (!reviewComment || !reviewComment.trim()) {
      return res
        .status(400)
        .json(
          new ErrorResponse("reviewComment is required when rejecting", 400),
        );
    }

    const report = await WeeklyReport.findById(id);
    if (!report) {
      return res.status(404).json(new ErrorResponse("Report not found", 404));
    }

    if (!["Submitted", "Reviewed"].includes(report.status)) {
      return res
        .status(400)
        .json(
          new ErrorResponse(
            `Cannot reject a report with status: ${report.status}`,
            400,
          ),
        );
    }

    report.status = "Rejected";
    report.reviewerId = req.user._id;
    report.reviewedAt = new Date();
    report.reviewComment = stripHtml(reviewComment);

    await report.save();

    logger.info("Report rejected", { reportId: id, reviewerId: req.user._id });

    res.json({
      success: true,
      message: "Report rejected",
      data: report,
    });
  } catch (err) {
    logger.error("Reject report error", err);
    res.status(500).json(new ErrorResponse(err.message || "Server error", 500));
  }
};

// ==================== ADMIN — MARK REPORT AS REVIEWED ====================
export const markReportReviewed = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewComment } = req.body;

    const report = await WeeklyReport.findById(id);
    if (!report) {
      return res.status(404).json(new ErrorResponse("Report not found", 404));
    }

    if (report.status !== "Submitted") {
      return res
        .status(400)
        .json(
          new ErrorResponse(
            `Cannot mark as reviewed. Current status: ${report.status}`,
            400,
          ),
        );
    }

    report.status = "Reviewed";
    report.reviewerId = req.user._id;
    report.reviewedAt = new Date();
    report.reviewComment = stripHtml(reviewComment || "");

    await report.save();

    logger.info("Report marked as reviewed", {
      reportId: id,
      reviewerId: req.user._id,
    });

    res.json({
      success: true,
      message: "Report marked as reviewed",
      data: report,
    });
  } catch (err) {
    logger.error("Mark report reviewed error", err);
    res.status(500).json(new ErrorResponse(err.message || "Server error", 500));
  }
};

// ==================== ADMIN — GET ALL USERS ====================
export const adminGetUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 50 } = req.query;
    const query = {};

    if (role) query.role = role;

    const skip = (Number(page) - 1) * Number(limit);
    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .select(
        "-password -resetPasswordToken -resetPasswordExpire -emailOtp -emailOtpExpire",
      )
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
      data: users,
    });
  } catch (err) {
    logger.error("Admin get users error", err);
    res.status(500).json(new ErrorResponse(err.message || "Server error", 500));
  }
};

// ==================== ADMIN — GET GRADUATES ATTENDANCE ====================
export const getGraduatesAttendance = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      year,
      month,
      day,
    } = req.query;
    const TZ = process.env.TZ || "Africa/Johannesburg";
    const skip = (Number(page) - 1) * Number(limit);

    // Determine date filter. priority: explicit year/month/day -> start/end range -> default to today
    const dateFilter = {};
    const today = dateKeyInTZ(new Date(), TZ);

    if (year && month && day) {
      // build YYYY-MM-DD string; ensure zero-padding
      const m = String(month).padStart(2, "0");
      const d = String(day).padStart(2, "0");
      dateFilter.$eq = `${year}-${m}-${d}`;
    } else {
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;
      if (!startDate && !endDate) {
        // date range absent -> default to today
        dateFilter.$eq = today;
      }
    }

    // Count graduates
    const totalGraduates = await User.countDocuments({ role: "graduate" });

    const graduates = await User.find({ role: "graduate" })
      .select("_id name email department cellNumber province")
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit));

    if (graduates.length === 0) {
      return res.json({
        success: true,
        page: Number(page),
        limit: Number(limit),
        total: totalGraduates,
        totalPages: Math.ceil(totalGraduates / Number(limit)),
        data: [],
      });
    }

    // Fetch attendance records for selected graduates, optionally filtered by date
    const graduateIds = graduates.map((g) => g._id);
    const attendanceQuery = { userId: { $in: graduateIds } };
    if (Object.keys(dateFilter).length) {
      attendanceQuery.date = dateFilter;
    }
    const attendanceRecords = await Attendance.find(attendanceQuery).sort({
      date: -1,
    });

    // Map records by user
    const attendanceMap = {};
    attendanceRecords.forEach((record) => {
      const key = record.userId.toString();
      if (!attendanceMap[key]) attendanceMap[key] = [];
      attendanceMap[key].push(record);
    });

    const formatDuration = (ms) => {
      if (!ms || ms <= 0) return "0h 0m";
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    };

    const data = graduates.map((graduate) => {
      const records = attendanceMap[graduate._id.toString()] || [];
      const formatted = records.map((rec) => {
        const workDuration = rec.isClosed
          ? rec.duration
          : rec.calculateWorkDuration();
        return {
          date: rec.date,
          status: rec.attendanceStatus,
          type: rec.type,
          holidayName: rec.holidayName,
          clockIn: rec.clockIn || null,
          clockInFormatted: rec.clockIn
            ? formatDateInTZ(rec.clockIn, TZ)
            : null,
          clockOut: rec.clockOut || null,
          clockOutFormatted: rec.clockOut
            ? formatDateInTZ(rec.clockOut, TZ)
            : null,
          breakDuration: rec.breakDuration || 0,
          breakTaken: rec.breakTaken || false,
          workDuration,
          workDurationFormatted: formatDuration(workDuration),
          clockStatus: rec.clockStatus || "clocked-out",
        };
      });

      // summary status uses most recent record if any
      const latestStatus = formatted.length ? formatted[0].status : "absent";

      return {
        _id: graduate._id,
        name: graduate.name,
        email: graduate.email,
        department: graduate.department,
        cellNumber: graduate.cellNumber,
        province: graduate.province,
        status: latestStatus,
        attendance: formatted,
      };
    });

    res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total: totalGraduates,
      totalPages: Math.ceil(totalGraduates / Number(limit)),
      data,
    });
  } catch (err) {
    logger.error("Get graduates attendance error", err);
    res.status(500).json(new ErrorResponse(err.message || "Server error", 500));
  }
};
