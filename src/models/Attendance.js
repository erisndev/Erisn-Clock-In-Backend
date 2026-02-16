import mongoose from 'mongoose';
import { endOfDayUTCForTZ } from "../utils/time.js";
import { getEasterSunday, getGoodFriday, getFamilyDay, formatDateYMD } from "../services/holidayService.js";

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

  // Break reminder state
  breakAlmostOverNotified: { type: Boolean, default: false },
  
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
//
// IMPORTANT:
// When `clockOut` is missing we should NOT use `new Date()` ("now") because that makes
// duration grow indefinitely and can spill into the next day.
// Instead, cap the duration at the configured end-of-day auto clock-out wall time.
//
// This returns a duration in milliseconds.
attendanceSchema.methods.calculateWorkDuration = function(tz = process.env.TZ || "Africa/Johannesburg") {
  if (!this.clockIn) return 0;

  // Closed sessions always use the persisted duration/clockOut.
  if (this.isClosed && this.clockOut) {
    const totalTime = this.clockOut.getTime() - this.clockIn.getTime();
    const workTime = totalTime - (this.breakDuration || 0);
    return Math.max(0, workTime);
  }

  // Open session:
  // - If clockOut exists, use it.
  // - Otherwise cap at the end-of-day (23:59:59.999) for the attendance `date` in the business TZ.
  const endTime = this.clockOut || endOfDayUTCForTZ(this.date, tz);

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

  // Movable holidays (computed yearly)
  // South Africa: Good Friday (Fri before Easter Sunday) and Family Day (Mon after Easter Sunday)
  const easterSunday = getEasterSunday(year);
  const familyDay = formatDateYMD(new Date(Date.UTC(
    easterSunday.getUTCFullYear(),
    easterSunday.getUTCMonth(),
    easterSunday.getUTCDate() + 1
  )));

  holidays.push({ date: formatDateYMD(getGoodFriday(year)), name: 'Good Friday' });
  holidays.push({ date: familyDay, name: 'Family Day' });

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
