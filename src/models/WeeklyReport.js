import mongoose from 'mongoose';

const weeklyReportSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	weekStart: { type: String, required: true },
	weekEnd: { type: String, required: true },
	summary: { type: String, required: true },
	challenges: { type: String, default: '' },
	learnings: { type: String, default: '' },
	nextWeek: { type: String, default: '' },
	goals: { type: String, default: '' },
}, { timestamps: true });

weeklyReportSchema.index(
	{ userId: 1, weekStart: 1, weekEnd: 1 },
	{ unique: true }
);

export default mongoose.model('WeeklyReport', weeklyReportSchema);
