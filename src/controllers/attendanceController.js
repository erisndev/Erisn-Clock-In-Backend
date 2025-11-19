import Attendance from '../models/Attendance.js';
import asyncHandler from 'express-async-handler';
import calculateDuration from '../utils/calculateDuration.js';

// Clock-in logic with prevention of multiple daily entries
export const clockIn = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  // Handle timezone - assume UTC+2 (South Africa) but store in UTC
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Check if user already clocked in today (prevent duplicates)
  const existingAttendance = await Attendance.findOne({
    user: userId,
    date: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
    }
  });

  if (existingAttendance) {
    return res.status(400).json({
      success: false,
      message: 'You have already clocked in today'
    });
  }

  // Create new attendance record
  const attendance = await Attendance.create({
    user: userId,
    date: today,
    clockIn: now
  });

  res.status(201).json({
    success: true,
    message: 'Clocked in successfully',
    data: attendance
  });
});

// Clock-out logic with duration calculation
export const clockOut = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  // Handle timezone - assume UTC+2 (South Africa) but store in UTC
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Find today's active attendance record
  const attendance = await Attendance.findOne({
    user: userId,
    date: {
      $gte: today,
      $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
    },
    status: 'active'
  });

  if (!attendance) {
    return res.status(400).json({
      success: false,
      message: 'No active clock-in found for today'
    });
  }

  // Calculate duration and update record
  const duration = calculateDuration(attendance.clockIn, now);
  attendance.clockOut = now;
  attendance.duration = duration;
  attendance.status = 'completed';
  await attendance.save();

  res.json({
    success: true,
    message: 'Clocked out successfully',
    data: attendance
  });
});

// Fetch attendance history by user
export const getAttendanceHistory = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { page = 1, limit = 10, startDate, endDate } = req.query;

  const query = { user: userId };

  // Add date filters if provided (handle timezone)
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const attendance = await Attendance.find(query)
    .sort({ date: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate('user', 'name email');

  const total = await Attendance.countDocuments(query);

  // Handle missing clock-out: show records with status 'active' and no clockOut
  const processedAttendance = attendance.map(record => {
    if (record.status === 'active' && !record.clockOut) {
      // Calculate current duration if still active
      const now = new Date();
      const currentDuration = calculateDuration(record.clockIn, now);
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
  const { page = 1, limit = 10, userId, startDate, endDate, status, userName } = req.query;

  const query = {};

  // Add filters
  if (userId) query.user = userId;
  if (status) query.status = status;

  // Add date filters if provided (handle timezone)
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  let attendanceQuery = Attendance.find(query).sort({ date: -1 });

  // If filtering by user name, we need to populate and filter
  if (userName) {
    attendanceQuery = attendanceQuery.populate({
      path: 'user',
      select: 'name email',
      match: { name: { $regex: userName, $options: 'i' } }
    });
  } else {
    attendanceQuery = attendanceQuery.populate('user', 'name email');
  }

  const attendance = await attendanceQuery
    .limit(limit * 1)
    .skip((page - 1) * limit);

  // Filter out null results if userName filter was applied
  const filteredAttendance = userName ? attendance.filter(record => record.user !== null) : attendance;

  const total = await Attendance.countDocuments(query);

  // Handle missing clock-out for admin view
  const processedAttendance = filteredAttendance.map(record => {
    if (record.status === 'active' && !record.clockOut) {
      const now = new Date();
      const currentDuration = calculateDuration(record.clockIn, now);
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
