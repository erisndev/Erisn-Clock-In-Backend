// src/models/Notification.js
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['report_reminder','missed_clockout','custom'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: Object, default: {} },
  sentBy: { type: String, default: 'system' }, // who triggered it
  channels: [{ type: String }], // e.g., ['email','webpush','inapp']
  status: { type: String, enum: ['pending','sent','failed'], default: 'pending' },
  error: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
