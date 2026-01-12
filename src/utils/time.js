// src/utils/time.js
// Centralized timezone-safe helpers

const DEFAULT_TZ = process.env.TZ || "Africa/Johannesburg";

// Build YYYY-MM-DD from a Date in a specific TZ using Intl parts (no ISO or locale parsing)
export function dateKeyInTZ(date = new Date(), tz = DEFAULT_TZ) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date); // en-CA gives YYYY-MM-DD
}

// Convert a TZ-local date key (YYYY-MM-DD) to the UTC instant representing TZ 00:00:00.000
export function startOfDayUTCForTZ(dateKey, tz = DEFAULT_TZ) {
  const [y, m, d] = dateKey.split("-").map(Number);
  // Build the instant for that date at 00:00 in tz by asking Intl for the offset via a Date object
  // We create a Date from components in UTC first, then adjust by the timezone offset difference
  // Trick: Use Date.UTC and then find the offset at that local wall time via formatter
  const approx = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  // Find actual TZ wall clock components for approx and adjust if day shifted; instead we compute using formatToParts timeZoneName 'shortOffset'
  // Since Node doesn't expose IANA offset easily, we binary search within +/- 1 day to find the instant whose TZ parts equal the requested wall-time.
  return findInstantForTZWallTime(y, m, d, 0, 0, 0, 0, tz);
}

// Convert a TZ-local date key (YYYY-MM-DD) to the UTC instant representing TZ 23:59:59.999
export function endOfDayUTCForTZ(dateKey, tz = DEFAULT_TZ) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return findInstantForTZWallTime(y, m, d, 23, 59, 59, 999, tz);
}

// Format a Date for display in TZ
export function formatDateInTZ(date, tz = DEFAULT_TZ) {
  if (!date) return null;
  const fmt = new Intl.DateTimeFormat("en-ZA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return fmt.format(date);
}

// Determine weekday (0=Sunday..6=Saturday) for a TZ calendar date key
export function weekdayFromDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  // Use Zeller's Congruence-like calculation on calendar date independent of runtime TZ
  // JavaScript Date can be avoided; compute weekday deterministically
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  let Y = y;
  if (m < 3) Y -= 1;
  const w = (Y + Math.floor(Y / 4) - Math.floor(Y / 100) + Math.floor(Y / 400) + t[m - 1] + d) % 7;
  // Zeller gives 0=Sunday
  return w;
}

// Internal: find the UTC instant whose TZ wall time equals y-m-d h:m:s.ms in tz
function findInstantForTZWallTime(y, m, d, hh, mm, ss, ms, tz) {
  // Start from UTC guess
  let guess = new Date(Date.UTC(y, m - 1, d, hh, mm, ss, ms));
  // Adjust by iteratively comparing the TZ parts; should converge within few steps
  for (let i = 0; i < 6; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(guess)
      .reduce((acc, p) => ((acc[p.type] = p.value), acc), {});

    const gy = Number(parts.year);
    const gm = Number(parts.month);
    const gd = Number(parts.day);
    const gh = Number(parts.hour);
    const gmin = Number(parts.minute);
    const gs = Number(parts.second);

    const cmp = (gy - y) * 1e9 + (gm - m) * 1e8 + (gd - d) * 1e6 + (gh - hh) * 1e4 + (gmin - mm) * 1e2 + (gs - ss);
    if (cmp === 0) {
      // align milliseconds separately by measuring offset from start of second
      const aligned = new Date(guess.getTime() - (guess.getMilliseconds() - ms));
      return aligned;
    }
    // If TZ parts are ahead/behind, adjust by the difference in seconds approximately
    const deltaSeconds = (hh - gh) * 3600 + (mm - gmin) * 60 + (ss - gs) + (y - gy) * 24 * 3600 * 366 + (m - gm) * 31 * 24 * 3600 + (d - gd) * 24 * 3600; // over-approx
    guess = new Date(guess.getTime() + deltaSeconds * 1000);
  }
  // Fallback: return initial guess (best-effort)
  return guess;
}

export default {
  dateKeyInTZ,
  startOfDayUTCForTZ,
  endOfDayUTCForTZ,
  formatDateInTZ,
  weekdayFromDateKey,
};
