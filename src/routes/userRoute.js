import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  deleteUser,
  getAllGraduates,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// User profile routes (authenticated user)
router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile)
  .delete(protect, deleteUser);

// Admin: delete any user
router.route('/:id').delete(protect, authorize('admin'), deleteUser);

// Admin: get all graduates
router.get('/graduates', protect, authorize('admin'), getAllGraduates);

export default router;