import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	date: { type: String, required: true },
	checkIn: { type: Date, default: null },
	checkOut: { type: Date, default: null },
	duration: { type: Number, default: 0 },
	isClosed: { type: Boolean, default: false },
}, { timestamps: true });

// Prevent duplicate attendance per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);


