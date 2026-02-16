// src/models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "custom",
        "missed_clockout",
        "report_reminder",
        "report_reviewed",
        "break_warning",
        "break_ended",
      ],
      default: "custom",
    },
    channelsUsed: {
      type: [String], // ['email', 'webpush']
      default: [],
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for efficient pagination by user and date
notificationSchema.index({ user: 1, createdAt: -1 });

// Correct: Create model
const Notification = mongoose.model("Notification", notificationSchema);

// Correct: Export model
export default Notification;
