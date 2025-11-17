import Attendance from '../models/Attendance.js';
import asyncHandler from 'express-async-handler';
import calculateDuration from '../utils/calculateDuration.js';

export const clockIn = asyncHandler(async (req, res) => {
  // logic for clock-in
});

export const clockOut = asyncHandler(async (req, res) => {
  // logic for clock-out
});
