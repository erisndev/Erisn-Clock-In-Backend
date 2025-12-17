import User from '../models/User.js';
import asyncHandler from 'express-async-handler';
import logger from '../utils/logger.js';

// ==================== GET USER PROFILE ====================
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// ==================== UPDATE USER PROFILE ====================
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.cellNumber = req.body.cellNumber || user.cellNumber;
    user.department = req.body.department || user.department;
    user.province = req.body.province || user.province;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    logger.info('User profile updated', { userId: user._id });

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      cellNumber: updatedUser.cellNumber,
      department: updatedUser.department,
      province: updatedUser.province,
      role: updatedUser.role,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// ==================== DELETE USER ====================
const deleteUser = asyncHandler(async (req, res) => {
  const userToDelete = await User.findById(req.params.id || req.user._id);

  if (!userToDelete) {
    res.status(404);
    throw new Error('User not found');
  }

  if (
    userToDelete._id.toString() === req.user._id.toString() ||
    req.user.role === 'admin'
  ) {
    await User.deleteOne({ _id: userToDelete._id });
    logger.info('User deleted', { userId: userToDelete._id, deletedBy: req.user._id });
    res.json({ message: 'User account deleted successfully' });
  } else {
    res.status(403);
    throw new Error('Not authorized to delete this user');
  }
});

// ==================== GET ALL GRADUATES (Admin) ====================
const getAllGraduates = asyncHandler(async (req, res) => {
  const graduates = await User.find({ role: 'graduate' })
    .select('-password')
    .sort({ name: 1 });

  res.json(graduates);
});

// ==================== GET USER PREFERENCES ====================
const getUserPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('preferences');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    success: true,
    preferences: user.preferences || {
      timezone: 'UTC',
      notificationChannels: ['email'],
      emailFrequency: 'immediate',
    },
  });
});

// ==================== UPDATE USER PREFERENCES ====================
const updateUserPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { timezone, notificationChannels, emailFrequency } = req.body;

  // Initialize preferences if not exists
  if (!user.preferences) {
    user.preferences = {
      timezone: 'UTC',
      notificationChannels: ['email'],
      emailFrequency: 'immediate',
    };
  }

  // Update only provided fields
  if (timezone !== undefined) {
    user.preferences.timezone = timezone;
  }

  if (notificationChannels !== undefined) {
    // Validate channels
    const validChannels = ['email', 'webpush'];
    const filtered = notificationChannels.filter((ch) => validChannels.includes(ch));
    user.preferences.notificationChannels = filtered;
  }

  if (emailFrequency !== undefined) {
    const validFrequencies = ['immediate', 'daily', 'weekly'];
    if (validFrequencies.includes(emailFrequency)) {
      user.preferences.emailFrequency = emailFrequency;
    }
  }

  await user.save();

  logger.info('User preferences updated', { userId: user._id });

  res.json({
    success: true,
    preferences: user.preferences,
  });
});

export {
  getUserProfile,
  updateUserProfile,
  deleteUser,
  getAllGraduates,
  getUserPreferences,
  updateUserPreferences,
};
