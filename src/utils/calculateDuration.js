/**
 * Calculate duration between clock-in and clock-out times in minutes
 * @param {Date} clockIn - Clock-in time
 * @param {Date} clockOut - Clock-out time
 * @returns {number} Duration in minutes
 */
const calculateDuration = (clockIn, clockOut) => {
  if (!clockIn || !clockOut) return 0;

  const diffMs = clockOut.getTime() - clockIn.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  return Math.max(0, diffMinutes); // Ensure non-negative duration
};

export default calculateDuration;