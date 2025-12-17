import { Router } from 'express';
import {
  clockIn,
  clockOut,
  breakIn,
  breakOut,
  getStatus,
  getTodayAttendance,
  getAttendanceHistory,
  getAllAttendance,
  getAttendanceSummary,
  exportMonthlyAttendance,
  exportIndividualAttendance,
  exportMyAttendance
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

// All attendance routes require authentication
router.use(protect);

// ==================== User Routes ====================

// Get current clock status
router.get('/status', getStatus);

// Get today's attendance record
router.get('/today', getTodayAttendance);

// Clock in (only once per day, before 17:00, workdays only)
router.post('/clock-in', clockIn);

// Clock out
router.post('/clock-out', clockOut);

// Start break (one per day)
router.post('/break-in', breakIn);

// End break
router.post('/break-out', breakOut);

// Get attendance history
router.get('/history', getAttendanceHistory);

// Export my attendance (user)
router.get('/export/my', exportMyAttendance);

// ==================== Admin Routes ====================

// Get all attendance records (admin only)
router.get('/all', authorize('admin'), getAllAttendance);

// Get attendance summary (admin only)
router.get('/summary', authorize('admin'), getAttendanceSummary);

// Export monthly attendance (admin only)
router.get('/export', authorize('admin'), exportMonthlyAttendance);

// Export individual user attendance (admin only)
router.get('/export/:userId', authorize('admin'), exportIndividualAttendance);

export default router;
