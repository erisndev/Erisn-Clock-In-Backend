import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import asyncHandler from "express-async-handler";
import logger from "../utils/logger.js";
import {
  exportAttendanceCSV,
  exportAttendancePDF,
  exportIndividualAttendancePDF,
} from "../utils/exportAttendance.js";
import archiver from "archiver";

import {
  dateKeyInTZ,
  formatDateInTZ,
  startOfDayUTCForTZ,
  endOfDayUTCForTZ,
} from "../utils/time.js";

const TZ = process.env.TZ || "Africa/Johannesburg";
const BUSINESS_END_HOUR = 17;

const formatDate = (date) => formatDateInTZ(date, TZ);

const formatDuration = (ms) => {
  if (!ms || ms <= 0) return "0h 0m";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
};

const getTodayDate = () => dateKeyInTZ(new Date(), TZ);

const getDayType = (dateStr) => {
  if (Attendance.isWeekend(dateStr)) {
    return { type: "weekend", status: "weekend", holidayName: "" };
  }
  const holiday = Attendance.isHoliday(dateStr);
  if (holiday) {
    return { type: "holiday", status: "holiday", holidayName: holiday.name };
  }
  return { type: "workday", status: "absent", holidayName: "" };
};

export const getStatus = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const today = getTodayDate();
  const dayInfo = getDayType(today);

  const attendance = await Attendance.findOne({ userId, date: today });

  if (!attendance) {
    if (dayInfo.type === "weekend" || dayInfo.type === "holiday") {
      return res.json({
        success: true,
        status: "clocked-out",
        attendanceStatus: dayInfo.status,
        type: dayInfo.type,
        holidayName: dayInfo.holidayName,
        data: null,
        message:
          dayInfo.type === "weekend"
            ? "It's the weekend!"
            : `Today is ${dayInfo.holidayName}`,
      });
    }

    return res.json({
      success: true,
      status: "clocked-out",
      attendanceStatus: dayInfo.status,
      type: dayInfo.type,
      data: null,
    });
  }

  if (attendance.type === "weekend" || attendance.type === "holiday") {
    return res.json({
      success: true,
      status: attendance.clockStatus,
      attendanceStatus: attendance.attendanceStatus,
      type: attendance.type,
      holidayName: attendance.holidayName,
      data: null,
      message:
        attendance.type === "weekend"
          ? "It's the weekend!"
          : `Today is ${attendance.holidayName}`,
    });
  }

  if (!attendance.clockIn) {
    return res.json({
      success: true,
      status: "clocked-out",
      attendanceStatus: attendance.attendanceStatus,
      type: "workday",
      data: null,
    });
  }

  const workDuration = attendance.calculateWorkDuration();
  res.json({
    success: true,
    status: attendance.clockStatus,
    attendanceStatus: attendance.attendanceStatus,
    type: attendance.type,
    data: {
      _id: attendance._id,
      clockIn: attendance.clockIn,
      clockInFormatted: formatDate(attendance.clockIn),
      clockOut: attendance.clockOut,
      clockOutFormatted: formatDate(attendance.clockOut),
      breakIn: attendance.breakIn,
      breakOut: attendance.breakOut,
      breakDuration: attendance.breakDuration,
      breakTaken: attendance.breakTaken,
      duration: workDuration,
      durationFormatted: formatDuration(workDuration),
      status: attendance.clockStatus,
      notes: attendance.clockInNotes,
      autoClockOut: attendance.autoClockOut,
    },
  });
});

export const clockIn = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { notes } = req.body;
  const now = new Date();
  const today = getTodayDate();
  const dayInfo = getDayType(today);

  if (dayInfo.type === "weekend") {
    return res
      .status(400)
      .json({ success: false, message: "Cannot clock in on weekends" });
  }
  if (dayInfo.type === "holiday") {
    return res.status(400).json({
      success: false,
      message: `Cannot clock in on ${dayInfo.holidayName}`,
    });
  }

  const currentHour = now.getHours();
  if (currentHour >= BUSINESS_END_HOUR) {
    return res.status(400).json({
      success: false,
      message: `Cannot clock in after ${BUSINESS_END_HOUR}:00. Business hours have ended.`,
    });
  }

  let attendance = await Attendance.findOne({ userId, date: today });

  if (attendance) {
    // If marked absent by the system, user is not allowed to clock in.
    if (
      attendance.attendanceStatus === "absent" ||
      attendance.autoMarkedAbsent
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You were marked absent for today and can no longer clock in. Please contact your administrator.",
      });
    }

    if (attendance.clockIn) {
      return res.status(400).json({
        success: false,
        message:
          "You have already clocked in today. Only one clock-in per day is allowed.",
      });
    }
    attendance.clockIn = now;
    attendance.clockStatus = "clocked-in";
    attendance.attendanceStatus = "present";
    attendance.clockInNotes = notes || "";
    attendance.autoMarkedAbsent = false;
  } else {
    attendance = new Attendance({
      userId,
      date: today,
      type: "workday",
      attendanceStatus: "present",
      clockIn: now,
      clockStatus: "clocked-in",
      clockInNotes: notes || "",
    });
  }

  await attendance.save();
  logger.info("User clocked in", { userId, attendanceId: attendance._id });

  res.status(201).json({
    success: true,
    message: "Clocked in successfully",
    data: {
      _id: attendance._id,
      clockIn: attendance.clockIn,
      clockInFormatted: formatDate(attendance.clockIn),
      clockOut: null,
      status: "clocked-in",
      attendanceStatus: "present",
      breakTaken: false,
      duration: 0,
      durationFormatted: "0h 0m 0s",
      notes: attendance.clockInNotes,
    },
  });
});

export const clockOut = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { notes } = req.body;
  const now = new Date();
  const today = getTodayDate();

  const attendance = await Attendance.findOne({
    userId,
    date: today,
    isClosed: false,
    clockIn: { $ne: null },
  });

  if (!attendance) {
    return res
      .status(400)
      .json({ success: false, message: "No active clock-in found for today" });
  }

  if (attendance.clockStatus === "on-break" && attendance.breakIn) {
    const breakTime = now.getTime() - attendance.breakIn.getTime();
    attendance.breakOut = now;
    attendance.breakDuration = (attendance.breakDuration || 0) + breakTime;
  }

  attendance.clockOut = now;
  const totalTime = now.getTime() - attendance.clockIn.getTime();
  const workDuration = totalTime - (attendance.breakDuration || 0);

  attendance.duration = Math.max(0, workDuration);
  attendance.durationFormatted = formatDuration(attendance.duration);
  attendance.clockStatus = "clocked-out";
  attendance.isClosed = true;
  attendance.clockOutNotes = notes || "";

  await attendance.save();
  logger.info("User clocked out", {
    userId,
    attendanceId: attendance._id,
    duration: attendance.durationFormatted,
  });

  res.json({
    success: true,
    message: "Clocked out successfully",
    data: {
      _id: attendance._id,
      clockIn: attendance.clockIn,
      clockInFormatted: formatDate(attendance.clockIn),
      clockOut: attendance.clockOut,
      clockOutFormatted: formatDate(attendance.clockOut),
      breakDuration: attendance.breakDuration,
      breakDurationFormatted: formatDuration(attendance.breakDuration),
      duration: attendance.duration,
      durationFormatted: attendance.durationFormatted,
      status: "clocked-out",
      attendanceStatus: attendance.attendanceStatus,
      notes: attendance.clockOutNotes,
    },
  });
});

export const breakIn = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const today = getTodayDate();

  const attendance = await Attendance.findOne({
    userId,
    date: today,
    isClosed: false,
  });

  if (!attendance || !attendance.clockIn) {
    return res.status(400).json({
      success: false,
      message: "You must be clocked in to take a break",
    });
  }
  if (attendance.clockStatus !== "clocked-in") {
    return res.status(400).json({
      success: false,
      message: "You must be actively working to start a break",
    });
  }
  if (attendance.breakTaken) {
    return res.status(400).json({
      success: false,
      message: "You have already taken your break for today",
    });
  }

  const workTimeBeforeBreak =
    now.getTime() -
    attendance.clockIn.getTime() -
    (attendance.breakDuration || 0);
  attendance.breakIn = now;
  attendance.clockStatus = "on-break";
  await attendance.save();

  logger.info("User started break", { userId, attendanceId: attendance._id });

  res.json({
    success: true,
    message: "Break started",
    data: {
      _id: attendance._id,
      breakIn: attendance.breakIn,
      breakInFormatted: formatDate(attendance.breakIn),
      status: "on-break",
      workTimeBeforeBreak,
      workTimeBeforeBreakFormatted: formatDuration(workTimeBeforeBreak),
    },
  });
});

export const breakOut = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const today = getTodayDate();

  const attendance = await Attendance.findOne({
    userId,
    date: today,
    isClosed: false,
  });

  if (!attendance) {
    return res
      .status(400)
      .json({ success: false, message: "No active attendance record found" });
  }
  if (attendance.clockStatus !== "on-break") {
    return res
      .status(400)
      .json({ success: false, message: "You are not currently on break" });
  }

  const breakTime = now.getTime() - attendance.breakIn.getTime();
  attendance.breakOut = now;
  attendance.breakDuration = (attendance.breakDuration || 0) + breakTime;
  attendance.breakTaken = true;
  attendance.clockStatus = "clocked-in";
  await attendance.save();

  logger.info("User ended break", {
    userId,
    attendanceId: attendance._id,
    breakDuration: formatDuration(breakTime),
  });

  res.json({
    success: true,
    message: "Break ended",
    data: {
      _id: attendance._id,
      breakIn: attendance.breakIn,
      breakInFormatted: formatDate(attendance.breakIn),
      breakOut: attendance.breakOut,
      breakOutFormatted: formatDate(attendance.breakOut),
      breakDuration: attendance.breakDuration,
      breakDurationFormatted: formatDuration(attendance.breakDuration),
      status: "clocked-in",
      breakTaken: true,
    },
  });
});

export const getAttendanceHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const {
    page = 1,
    limit = 10,
    startDate,
    endDate,
    type,
    attendanceStatus,
  } = req.query;

  const query = { userId };
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }
  if (type) query.type = type;
  if (attendanceStatus) query.attendanceStatus = attendanceStatus;

  const total = await Attendance.countDocuments(query);
  const records = await Attendance.find(query)
    .sort({ date: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .populate("userId", "name email");

  const data = records.map((record) => {
    const workDuration = record.isClosed
      ? record.duration
      : record.calculateWorkDuration();
    return {
      _id: record._id,
      date: record.date,
      type: record.type,
      attendanceStatus: record.attendanceStatus,
      holidayName: record.holidayName,
      clockIn: record.clockIn,
      clockInFormatted: formatDate(record.clockIn),
      clockOut: record.clockOut,
      clockOutFormatted: formatDate(record.clockOut),
      breakDuration: record.breakDuration,
      breakDurationFormatted: formatDuration(record.breakDuration),
      duration: workDuration,
      durationFormatted: formatDuration(workDuration),
      clockStatus: record.clockStatus,
      isClosed: record.isClosed,
      autoClockOut: record.autoClockOut,
      autoMarkedAbsent: record.autoMarkedAbsent,
      notes: record.clockInNotes || record.clockOutNotes,
      user: record.userId,
    };
  });

  res.json({
    success: true,
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

export const getAllAttendance = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    userId,
    startDate,
    endDate,
    type,
    attendanceStatus,
    userName,
  } = req.query;

  const query = {};
  if (userId) query.userId = userId;
  if (type) query.type = type;
  if (attendanceStatus) query.attendanceStatus = attendanceStatus;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  let attendanceQuery = Attendance.find(query).sort({
    date: -1,
    createdAt: -1,
  });
  if (userName) {
    attendanceQuery = attendanceQuery.populate({
      path: "userId",
      select: "name email department",
      match: { name: { $regex: userName, $options: "i" } },
    });
  } else {
    attendanceQuery = attendanceQuery.populate(
      "userId",
      "name email department",
    );
  }

  const records = await attendanceQuery
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit));
  const filteredRecords = userName
    ? records.filter((r) => r.userId !== null)
    : records;
  const total = await Attendance.countDocuments(query);

  const data = filteredRecords.map((record) => {
    const workDuration = record.isClosed
      ? record.duration
      : record.calculateWorkDuration();
    return {
      _id: record._id,
      date: record.date,
      type: record.type,
      attendanceStatus: record.attendanceStatus,
      holidayName: record.holidayName,
      clockIn: record.clockIn,
      clockInFormatted: formatDate(record.clockIn),
      clockOut: record.clockOut,
      clockOutFormatted: formatDate(record.clockOut),
      breakDuration: record.breakDuration,
      breakDurationFormatted: formatDuration(record.breakDuration),
      duration: workDuration,
      durationFormatted: formatDuration(workDuration),
      clockStatus: record.clockStatus,
      isClosed: record.isClosed,
      autoClockOut: record.autoClockOut,
      autoMarkedAbsent: record.autoMarkedAbsent,
      user: record.userId,
    };
  });

  res.json({
    success: true,
    data,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

export const getTodayAttendance = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const today = getTodayDate();
  const dayInfo = getDayType(today);

  const attendance = await Attendance.findOne({ userId, date: today });

  if (!attendance) {
    // If there is no attendance record yet, do NOT assume "absent" for workdays.
    // Absence is only confirmed once the mark-absent job creates/updates a record.
    const computedStatus =
      dayInfo.type === "workday" ? "pending" : dayInfo.status;

    return res.json({
      success: true,
      status: "clocked-out",
      data: {
        _id: null,
        date: today,
        type: dayInfo.type,
        attendanceStatus: computedStatus,
        holidayName: dayInfo.holidayName,
        clockIn: null,
        clockInFormatted: null,
        clockOut: null,
        clockOutFormatted: null,
        breakIn: null,
        breakOut: null,
        breakDuration: 0,
        breakDurationFormatted: "0h 0m",
        breakTaken: false,
        duration: 0,
        durationFormatted: "0h 0m",
        clockStatus: "clocked-out",
        isClosed: false,
        autoClockOut: false,
        autoMarkedAbsent: false,
        notes: "",
      },
    });
  }

  const workDuration = attendance.isClosed
    ? attendance.duration
    : attendance.calculateWorkDuration();

  res.json({
    success: true,
    status: attendance.clockStatus,
    data: {
      _id: attendance._id,
      date: attendance.date,
      type: attendance.type,
      attendanceStatus: attendance.attendanceStatus,
      holidayName: attendance.holidayName,
      clockIn: attendance.clockIn,
      clockInFormatted: formatDate(attendance.clockIn),
      clockOut: attendance.clockOut,
      clockOutFormatted: formatDate(attendance.clockOut),
      breakIn: attendance.breakIn,
      breakOut: attendance.breakOut,
      breakDuration: attendance.breakDuration,
      breakDurationFormatted: formatDuration(attendance.breakDuration),
      breakTaken: attendance.breakTaken,
      duration: workDuration,
      durationFormatted: formatDuration(workDuration),
      clockStatus: attendance.clockStatus,
      isClosed: attendance.isClosed,
      autoClockOut: attendance.autoClockOut,
      autoMarkedAbsent: attendance.autoMarkedAbsent,
      notes: attendance.clockInNotes,
    },
  });
});

export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate, userId } = req.query;
  const query = {};
  if (userId) query.userId = userId;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  const summary = await Attendance.aggregate([
    { $match: query },
    { $group: { _id: "$attendanceStatus", count: { $sum: 1 } } },
  ]);

  const result = { present: 0, absent: 0, weekend: 0, holiday: 0, total: 0 };
  summary.forEach((item) => {
    result[item._id] = item.count;
    result.total += item.count;
  });

  res.json({ success: true, data: result });
});

export const exportMonthlyAttendance = asyncHandler(async (req, res) => {
  const { year, month, userId, type = "csv" } = req.query;

  if (!year || !month) {
    return res
      .status(400)
      .json({ success: false, message: "Year and month are required" });
  }

  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid year or month" });
  }

  const startDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-01`;
  const lastDay = new Date(yearNum, monthNum, 0).getDate();
  const endDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${lastDay}`;

  const query = { date: { $gte: startDate, $lte: endDate } };
  let userInfo = null;

  if (userId) {
    query.userId = userId;
    userInfo = await User.findById(userId).select(
      "name email department province",
    );
  }

  const records = await Attendance.find(query)
    .sort({ date: 1, userId: 1 })
    .populate("userId", "name email department province");

  const data = records.map((record) => ({
    ...record.toObject(),
    user: record.userId,
  }));
  const options = {
    year: yearNum,
    month: monthNum,
    userName: userInfo?.name,
    userInfo,
  };

  if (type === "pdf") {
    return exportAttendancePDF(res, data, options);
  } else {
    return exportAttendanceCSV(res, data, options);
  }
});

export const exportMonthlyAttendanceZip = asyncHandler(async (req, res) => {
  const { year, month, type = "pdf" } = req.query;

  if (!year || !month) {
    return res.status(400).json({
      success: false,
      message: "Year and month are required",
    });
  }

  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res.status(400).json({
      success: false,
      message: "Invalid year or month",
    });
  }

  if (!['pdf', 'csv'].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid export type. Use pdf or csv",
    });
  }

  const users = await User.find({ role: "graduate" }).select(
    "name email department province",
  );

  if (!users.length) {
    return res.status(404).json({
      success: false,
      message: "No users found",
    });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=attendance_${year}_${month}.zip`,
  );

  const archive = archiver("zip", { zlib: { level: 9 } });

  // If archiver errors and we can still respond, do so.
  archive.on("error", (err) => {
    logger.error("ZIP export failed", { err: err?.message || err });
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: "Export failed" });
    }
    // If headers are already sent, destroy the stream.
    res.destroy(err);
  });

  archive.pipe(res);

  const startDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-01`;
  const lastDay = new Date(yearNum, monthNum, 0).getDate();
  const endDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${lastDay}`;

  for (const user of users) {
    const records = await Attendance.find({
      userId: user._id,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    // IMPORTANT: exportAttendanceCSV/exportIndividualAttendancePDF expect an Express res
    // (they call setHeader/status/send/write/end). In a zip export we must generate
    // the file content ourselves and append as a Buffer.
    let fileBuffer;

    if (type === "csv") {
      // Build CSV via the same merging logic by calling the helper with a stubbed response.
      const chunks = [];
      const stubRes = {
        headers: {},
        statusCode: 200,
        setHeader: (k, v) => {
          stubRes.headers[k] = v;
        },
        status: (code) => {
          stubRes.statusCode = code;
          return stubRes;
        },
        json: (obj) => {
          throw new Error(obj?.message || "Failed to generate CSV");
        },
        write: (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        },
        end: () => {},
      };

      exportAttendanceCSV(stubRes, records, {
        year: yearNum,
        month: monthNum,
        userName: user.name,
        userInfo: user,
      });

      fileBuffer = Buffer.concat(chunks);
    } else {
      // exportIndividualAttendancePDF uses jsPDF and finally calls res.send(Buffer)
      // We intercept send() to capture the PDF bytes.
      let pdfBuf;
      const stubRes = {
        headers: {},
        statusCode: 200,
        setHeader: (k, v) => {
          stubRes.headers[k] = v;
        },
        status: (code) => {
          stubRes.statusCode = code;
          return stubRes;
        },
        json: (obj) => {
          throw new Error(obj?.message || "Failed to generate PDF");
        },
        send: (buf) => {
          pdfBuf = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
        },
      };

      exportIndividualAttendancePDF(stubRes, records, user, {
        year: yearNum,
        month: monthNum,
        userInfo: user,
      });

      if (!pdfBuf) {
        throw new Error("Failed to generate PDF buffer");
      }
      fileBuffer = pdfBuf;
    }

    const safeName = String(user.name || "user")
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    archive.append(fileBuffer, {
      name: `${safeName || "user"}_${year}_${month}.${type}`,
    });
  }

  await archive.finalize();
});

export const exportIndividualAttendance = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { year, month, type = "pdf" } = req.query;

  if (!userId || !year || !month) {
    return res.status(400).json({
      success: false,
      message: "User ID, year and month are required",
    });
  }

  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid year or month" });
  }

  const user = await User.findById(userId).select(
    "name email department province",
  );
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const startDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-01`;
  const lastDay = new Date(yearNum, monthNum, 0).getDate();
  const endDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${lastDay}`;

  const records = await Attendance.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });

  // Records can be empty - the export will fill in all days of the month
  const options = { year: yearNum, month: monthNum, userInfo: user };

  if (type === "csv") {
    return exportAttendanceCSV(res, records, {
      ...options,
      userName: user.name,
    });
  } else {
    return exportIndividualAttendancePDF(res, records, user, options);
  }
});

export const exportMyAttendance = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { year, month, type = "pdf" } = req.query;

  if (!year || !month) {
    return res
      .status(400)
      .json({ success: false, message: "Year and month are required" });
  }

  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid year or month" });
  }

  const user = await User.findById(userId).select(
    "name email department province",
  );

  const startDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-01`;
  const lastDay = new Date(yearNum, monthNum, 0).getDate();
  const endDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${lastDay}`;

  const records = await Attendance.find({
    userId,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });

  // Records can be empty - the export will fill in all days of the month
  const options = { year: yearNum, month: monthNum, userInfo: user };

  if (type === "csv") {
    return exportAttendanceCSV(res, records, {
      ...options,
      userName: user.name,
    });
  } else {
    return exportIndividualAttendancePDF(res, records, user, options);
  }
});
