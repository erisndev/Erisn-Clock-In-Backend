import { Router } from 'express';
import { clockIn, clockOut, getAttendanceHistory, getAllAttendance } from '../controllers/attendanceController.js';
import { protect, authorize } from '../middlewares/auth.js';

const router = Router();

// All attendance routes require authentication
router.use(protect);

// User routes
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/history', getAttendanceHistory);

// Admin routes (require admin role)
router.get('/all', authorize('admin'), getAllAttendance);

export default router;
