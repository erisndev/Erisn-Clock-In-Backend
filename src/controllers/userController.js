import User from '../models/User.js';
import asyncHandler from 'express-async-handler';

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.department = req.body.department || user.department;
    user.position = req.body.position || user.position;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      department: updatedUser.department,
      position: updatedUser.position,
      role: updatedUser.role,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

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
    res.json({ message: 'User account deleted successfully' });
  } else {
    res.status(403);
    throw new Error('Not authorized to delete this user');
  }
});

const getAllGraduates = asyncHandler(async (req, res) => {
  const graduates = await User.find({ role: "graduate" }).select('-password').sort({ name: 1 });

  res.json(graduates);
});

export { getUserProfile, updateUserProfile, deleteUser, getAllGraduates };