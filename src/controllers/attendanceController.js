import Attendance from '../models/Attendance.js';
import asyncHandler from 'express-async-handler';
import calculateDuration from '../utils/calculateDuration.js';

// Clock-in logic with prevention of multiple daily entries
export const clockIn = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

  // Check if user already clocked in today (prevent duplicates)
  const existingAttendance = await Attendance.findOne({
    userId: userId,
    date: today
  });
  if (existingAttendance) {
    return res.status(400).json({
      success: false,
      message: 'You have already clocked in today'
    });
  }

  // Create new attendance record
  const attendance = await Attendance.create({
    userId: userId,
    date: today,
    checkIn: now
  });
console.log('New attendance record created:', attendance);
  res.status(201).json({
    success: true,
    message: 'Clocked in successfully',
    data: attendance
  });
});

// Clock-out logic with duration calculation
export const clockOut = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

  // Find today's active attendance record
  const attendance = await Attendance.findOne({
    userId: userId,
    date: today,
    isClosed: false
  });

  if (!attendance) {
    return res.status(400).json({
      success: false,
      message: 'No active clock-in found for today'
    });
  }

  // Calculate duration and update record
  const duration = calculateDuration(attendance.checkIn, now);
  attendance.checkOut = now;
  attendance.duration = duration;
  attendance.isClosed = true;
  await attendance.save();

  res.json({
    success: true,
    message: 'Clocked out successfully',
    data: attendance
  });
});

// Fetch attendance history by user
export const getAttendanceHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = 1, limit = 10, startDate, endDate } = req.query;

  const query = { userId: userId };

  // Add date filters if provided
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  const attendance = await Attendance.find(query)
    .sort({ date: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('userId', 'name email');

  const total = await Attendance.countDocuments(query);

  // Handle missing clock-out: show records that are not closed
  const processedAttendance = attendance.map(record => {
    if (!record.isClosed && !record.checkOut) {
      // Calculate current duration if still active
      const now = new Date();
      const currentDuration = calculateDuration(record.checkIn, now);
      return {
        ...record.toObject(),
        currentDuration,
        note: 'Still clocked in'
      };
    }
    return record;
  });

  res.json({
    success: true,
    data: processedAttendance,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Admin attendance fetch with filters
export const getAllAttendance = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, userId, startDate, endDate, isClosed, userName } = req.query;

  const query = {};

  // Add filters
  if (userId) query.userId = userId;
  if (isClosed !== undefined) query.isClosed = isClosed === 'true';

  // Add date filters if provided
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  let attendanceQuery = Attendance.find(query).sort({ date: -1 });

  // If filtering by user name, we need to populate and filter
  if (userName) {
    attendanceQuery = attendanceQuery.populate({
      path: 'userId',
      select: 'name email',
      match: { name: { $regex: userName, $options: 'i' } }
    });
  } else {
    attendanceQuery = attendanceQuery.populate('userId', 'name email');
  }

  const attendance = await attendanceQuery
    .limit(limit * 1)
    .skip((page - 1) * limit);

  // Filter out null results if userName filter was applied
  const filteredAttendance = userName ? attendance.filter(record => record.userId !== null) : attendance;

  const total = await Attendance.countDocuments(query);

  // Handle missing clock-out for admin view
  const processedAttendance = filteredAttendance.map(record => {
    if (!record.isClosed && !record.checkOut) {
      const now = new Date();
      const currentDuration = calculateDuration(record.checkIn, now);
      return {
        ...record.toObject(),
        currentDuration,
        note: 'Still clocked in'
      };
    }
    return record;
  });

  res.json({
    success: true,
    data: processedAttendance,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});
