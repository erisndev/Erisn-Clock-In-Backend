// src/services/holidayService.js
// Utilities for computing movable holiday dates (no external deps).

/**
 * @param {number} year
 * @returns {Date} Easter Sunday for the given year (Gregorian calendar)
 * Uses Anonymous Gregorian algorithm / Meeus-Jones-Butcher.
 */
export function getEasterSunday(year) {
  if (!Number.isInteger(year) || year < 1583) {
    throw new Error('year must be an integer >= 1583');
  }

  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  // Use UTC to avoid local timezone shifting the calendar day.
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * @param {Date} dateUtc
 * @param {number} days
 * @returns {Date} new Date shifted by days (UTC)
 */
function addDaysUtc(dateUtc, days) {
  const d = new Date(dateUtc.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * @param {number} year
 * @returns {Date} Good Friday (2 days before Easter Sunday)
 */
export function getGoodFriday(year) {
  const easter = getEasterSunday(year);
  return addDaysUtc(easter, -2);
}

/**
 * @param {number} year
 * @returns {Date} Family Day (Ontario/most of Canada): 3rd Monday in February
 */
export function getFamilyDay(year) {
  if (!Number.isInteger(year)) {
    throw new Error('year must be an integer');
  }

  // Start at Feb 1 (UTC)
  const feb1 = new Date(Date.UTC(year, 1, 1));
  const dayOfWeek = feb1.getUTCDay(); // 0=Sun ... 1=Mon ... 6=Sat

  // Find first Monday in February
  const offsetToMonday = (1 - dayOfWeek + 7) % 7;
  const firstMonday = addDaysUtc(feb1, offsetToMonday);

  // Third Monday = first Monday + 14 days
  return addDaysUtc(firstMonday, 14);
}

/**
 * @param {Date} dateUtc
 * @returns {string} YYYY-MM-DD
 */
export function formatDateYMD(dateUtc) {
  const y = dateUtc.getUTCFullYear();
  const m = String(dateUtc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateUtc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * @param {number} year
 * @returns {{ goodFriday: Date, familyDay: Date }}
 */
export function getMovableHolidays(year) {
  return {
    goodFriday: getGoodFriday(year),
    familyDay: getFamilyDay(year),
  };
}

/**
 * Convenience for APIs/UI.
 * @param {number} year
 * @returns {{ year: number, goodFriday: string, familyDay: string }}
 */
export function getMovableHolidaysYMD(year) {
  const { goodFriday, familyDay } = getMovableHolidays(year);
  return {
    year,
    goodFriday: formatDateYMD(goodFriday),
    familyDay: formatDateYMD(familyDay),
  };
}
