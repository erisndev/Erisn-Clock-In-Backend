import mongoose from 'mongoose';

const weeklyReportSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	weekStart: { type: Date, required: true },
	weekEnd: { type: Date, required: true },
	summary: { type: String, required: true, trim: true },
	challenges: { type: String, default: '', trim: true },
	learnings: { type: String, default: '', trim: true },
	nextWeek: { type: String, default: '', trim: true },
	goals: { type: String, default: '', trim: true },
	status: {
		type: String,
		enum: ['Draft', 'Submitted', 'Reviewed', 'Approved', 'Rejected'],
		default: 'Submitted',
	},
	// Admin review fields
	reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
	reviewedAt: { type: Date },
	reviewComment: { type: String, trim: true, default: '' },
}, { timestamps: true });

weeklyReportSchema.index(
	{ userId: 1, weekStart: 1, weekEnd: 1 },
	{ unique: true }
);



// Normalize date format before save
weeklyReportSchema.pre('save', function (next) {
  if (this.weekStart && !(this.weekStart instanceof Date)) {
    this.weekStart = new Date(this.weekStart);
  }
  if (this.weekEnd && !(this.weekEnd instanceof Date)) {
    this.weekEnd = new Date(this.weekEnd);
  }
  next();
});

// Optional helper method
weeklyReportSchema.methods.getDateRange = function () {
  return `${this.weekStart.toISOString().split('T')[0]} → ${this.weekEnd.toISOString().split('T')[0]}`;
};

export default mongoose.model('WeeklyReport', weeklyReportSchema);
