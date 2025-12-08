// src/models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["custom", "missed_clockout", "report_reminder"],
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

// Correct: Create model
const Notification = mongoose.model("Notification", notificationSchema);

// Correct: Export model
export default Notification;
