import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  
  // Attendance type
  type: {
    type: String,
    enum: ['workday', 'weekend', 'holiday'],
    default: 'workday'
  },
  
  // Attendance status
  attendanceStatus: {
    type: String,
    enum: ['absent', 'present', 'weekend', 'holiday'],
    default: 'absent'
  },
  
  // Clock times
  clockIn: { type: Date, default: null },
  clockOut: { type: Date, default: null },
  
  // Break tracking
  breakIn: { type: Date, default: null },
  breakOut: { type: Date, default: null },
  breakDuration: { type: Number, default: 0 }, // in milliseconds
  breakTaken: { type: Boolean, default: false },
  
  // Duration in milliseconds (work time excluding breaks)
  duration: { type: Number, default: 0 },
  
  // Formatted duration string
  durationFormatted: { type: String, default: null },
  
  // Notes
  clockInNotes: { type: String, default: '', trim: true },
  clockOutNotes: { type: String, default: '', trim: true },
  
  // Clock status (for active session tracking)
  clockStatus: {
    type: String,
    enum: ['clocked-out', 'clocked-in', 'on-break'],
    default: 'clocked-out'
  },
  
  // Auto actions
  autoClockOut: { type: Boolean, default: false }, // True if system auto clocked out
  autoMarkedAbsent: { type: Boolean, default: false }, // True if system marked absent
  
  // Session closed
  isClosed: { type: Boolean, default: false },
  
  // Holiday name (if type is holiday)
  holidayName: { type: String, default: '' },
}, { timestamps: true });

// Prevent duplicate attendance per day per user
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

// Helper method to format duration
attendanceSchema.methods.formatDuration = function(ms) {
  if (!ms || ms <= 0) return '0h 0m';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

// Calculate work duration (excluding breaks)
attendanceSchema.methods.calculateWorkDuration = function() {
  if (!this.clockIn) return 0;
  
  const endTime = this.clockOut || new Date();
  const totalTime = endTime.getTime() - this.clockIn.getTime();
  const workTime = totalTime - (this.breakDuration || 0);
  
  return Math.max(0, workTime);
};

// Static method to check if a date is a weekend
attendanceSchema.statics.isWeekend = function(dateKey /* YYYY-MM-DD */) {
  // Compute weekday from calendar date parts without relying on runtime timezone interpretation
  const [y, m, d] = dateKey.split('-').map(Number);
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let Y = y;
  if (m < 3) Y -= 1;
  const w = (Y + Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400) + t[m - 1] + d) % 7; // 0=Sunday..6=Saturday
  return w === 0 || w === 6;
};

// Static method to get South African public holidays for a year
attendanceSchema.statics.getHolidays = function(year) {
  // South African public holidays (fixed dates)
  const holidays = [
    { date: `${year}-01-01`, name: "New Year's Day" },
    { date: `${year}-03-21`, name: "Human Rights Day" },
    { date: `${year}-04-27`, name: "Freedom Day" },
    { date: `${year}-05-01`, name: "Workers' Day" },
    { date: `${year}-06-16`, name: "Youth Day" },
    { date: `${year}-08-09`, name: "National Women's Day" },
    { date: `${year}-09-24`, name: "Heritage Day" },
    { date: `${year}-12-16`, name: "Day of Reconciliation" },
    { date: `${year}-12-25`, name: "Christmas Day" },
    { date: `${year}-12-26`, name: "Day of Goodwill" },
  ];
  
  // Add Easter dates (calculated - these vary each year)
  // For simplicity, you can add them manually or use a library
  // Example for 2024:
  if (year === 2024) {
    holidays.push({ date: '2024-03-29', name: 'Good Friday' });
    holidays.push({ date: '2024-04-01', name: 'Family Day' });
  } else if (year === 2025) {
    holidays.push({ date: '2025-04-18', name: 'Good Friday' });
    holidays.push({ date: '2025-04-21', name: 'Family Day' });
  }
  
  return holidays;
};

// Static method to check if a date is a holiday
attendanceSchema.statics.isHoliday = function(dateStr) {
  // dateStr is already a TZ-calibrated day key (YYYY-MM-DD)
  const year = Number(dateStr.slice(0, 4));
  const holidays = this.getHolidays(year);
  const holiday = holidays.find(h => h.date === dateStr);
  return holiday || null;
};

export default mongoose.model('Attendance', attendanceSchema);
