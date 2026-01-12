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
		default: 'Draft',
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
  const tz = process.env.TZ || 'Africa/Johannesburg';
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${fmt.format(this.weekStart)} → ${fmt.format(this.weekEnd)}`;
};

export default mongoose.model('WeeklyReport', weeklyReportSchema);
