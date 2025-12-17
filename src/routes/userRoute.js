import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  deleteUser,
  getAllGraduates,
  getUserPreferences,
  updateUserPreferences,
} from '../controllers/userController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { updatePreferencesValidation } from '../middlewares/validators.js';

const router = express.Router();

// User profile routes (authenticated user)
router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile)
  .delete(protect, deleteUser);

// User preferences
router
  .route('/preferences')
  .get(protect, getUserPreferences)
  .put(protect, updatePreferencesValidation, updateUserPreferences);

// Admin: delete any user
router.route('/:id').delete(protect, authorize('admin'), deleteUser);

// Admin: get all graduates
router.get('/graduates', protect, authorize('admin'), getAllGraduates);

export default router;
