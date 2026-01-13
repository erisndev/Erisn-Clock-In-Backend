import { jsPDF } from "jspdf";
import { getEasterSunday, getGoodFriday, formatDateYMD } from "../services/holidayService.js";

// ==================== HELPER FUNCTIONS ====================

const formatDuration = (ms) => {
  if (!ms || ms <= 0) return "0h 0m";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

const formatTime = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getMonthName = (year, month) => {
  return new Date(year, month - 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/"/g, '""');
  return str.includes(",") || str.includes('"') || str.includes("\n")
    ? `"${str}"`
    : str;
};

const getDayName = (dateStr) => {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" });
};

const getShortDayName = (dateStr) => {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
};

// Check if date is weekend
const isWeekend = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6;
};

// Get South African holidays
const getHolidays = (year) => {
  const holidays = {
    [`${year}-01-01`]: "New Year's Day",
    [`${year}-03-21`]: "Human Rights Day",
    [`${year}-04-27`]: "Freedom Day",
    [`${year}-05-01`]: "Workers' Day",
    [`${year}-06-16`]: "Youth Day",
    [`${year}-08-09`]: "National Women's Day",
    [`${year}-09-24`]: "Heritage Day",
    [`${year}-12-16`]: "Day of Reconciliation",
    [`${year}-12-25`]: "Christmas Day",
    [`${year}-12-26`]: "Day of Goodwill",
  };

  // Movable holidays (computed yearly)
  // South Africa: Good Friday (Fri before Easter Sunday) and Family Day (Mon after Easter Sunday)
  holidays[formatDateYMD(getGoodFriday(year))] = "Good Friday";

  const easterSunday = getEasterSunday(year);
  const familyDayUtc = new Date(
    Date.UTC(
      easterSunday.getUTCFullYear(),
      easterSunday.getUTCMonth(),
      easterSunday.getUTCDate() + 1
    )
  );
  holidays[formatDateYMD(familyDayUtc)] = "Family Day";

  return holidays;
};

// Generate all days of a month
const generateMonthDays = (year, month) => {
  const days = [];
  const lastDay = new Date(year, month, 0).getDate();
  const holidays = getHolidays(year);
  const today = new Date().toISOString().split("T")[0];

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isWeekendDay = isWeekend(dateStr);
    const holidayName = holidays[dateStr] || null;
    const isFuture = dateStr > today;

    let type = "workday";
    let defaultStatus = "absent";

    if (isWeekendDay) {
      type = "weekend";
      defaultStatus = "weekend";
    } else if (holidayName) {
      type = "holiday";
      defaultStatus = "holiday";
    }

    days.push({
      date: dateStr,
      dayName: getDayName(dateStr),
      shortDayName: getShortDayName(dateStr),
      type,
      defaultStatus,
      holidayName,
      isFuture,
      isWeekend: isWeekendDay,
    });
  }

  return days;
};

// Merge attendance records with all month days
const mergeWithMonthDays = (records, year, month, userInfo = null) => {
  const monthDays = generateMonthDays(year, month);
  const recordMap = new Map();

  // Create map of existing records by date
  records.forEach((record) => {
    recordMap.set(record.date, record);
  });

  // Merge with all days
  return monthDays.map((day) => {
    const record = recordMap.get(day.date);

    if (record) {
      return {
        ...day,
        ...record,
        user: record.user || record.userId || userInfo,
        attendanceStatus: record.attendanceStatus || day.defaultStatus,
        clockIn: record.clockIn,
        clockOut: record.clockOut,
        duration: record.duration || 0,
        breakDuration: record.breakDuration || 0,
        autoClockOut: record.autoClockOut || false,
        notes: record.clockInNotes || record.clockOutNotes || "",
      };
    }

    // No record exists - return day with defaults
    return {
      ...day,
      _id: null,
      user: userInfo,
      attendanceStatus: day.isFuture ? "upcoming" : day.defaultStatus,
      clockIn: null,
      clockOut: null,
      duration: 0,
      breakDuration: 0,
      autoClockOut: false,
      notes: day.isFuture
        ? "Upcoming"
        : day.type === "weekend"
          ? "Weekend"
          : day.holidayName || "",
    };
  });
};

// ==================== EXPORT ATTENDANCE CSV ====================
export const exportAttendanceCSV = (res, records, options = {}) => {
  const { month, year, userName, userInfo } = options;

  // Merge with all month days
  const data = mergeWithMonthDays(records, year, month, userInfo);

  if (data.length === 0) {
    return res
      .status(400)
      .json({ message: "No attendance data available for export" });
  }

  const filename = userName
    ? `attendance_${userName.replace(/\s+/g, "_")}_${year}_${month}.csv`
    : `attendance_${year}_${month}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

  const fields = [
    "No.",
    "Date",
    "Day",
    "Name",
    "Email",
    "Department",
    "Status",
    "Type",
    "Clock In",
    "Clock Out",
    "Break Duration",
    "Work Duration",
    "Auto Clock Out",
    "Notes",
  ];

  res.write(fields.join(",") + "\n");

  data.forEach((r, index) => {
    const row = [
      index + 1,
      r.date,
      r.dayName,
      r.user?.name || userName || "N/A",
      r.user?.email || "N/A",
      r.user?.department || "-",
      r.attendanceStatus || "absent",
      r.type || "workday",
      r.clockIn ? formatTime(r.clockIn) : "-",
      r.clockOut ? formatTime(r.clockOut) : "-",
      formatDuration(r.breakDuration),
      formatDuration(r.duration),
      r.autoClockOut ? "Yes" : "No",
      r.notes || r.holidayName || "-",
    ];

    res.write(row.map(escapeCSV).join(",") + "\n");
  });

  res.end();
};

// ==================== EXPORT ATTENDANCE PDF ====================
export const exportAttendancePDF = (res, records, options = {}) => {
  const { month, year, userName, userInfo } = options;

  // Merge with all month days
  const data = mergeWithMonthDays(records, year, month, userInfo);

  if (data.length === 0) {
    return res
      .status(400)
      .json({ message: "No attendance data available for export" });
  }

  const monthName = getMonthName(year, month);
  const filename = userName
    ? `attendance_${userName.replace(/\s+/g, "_")}_${year}_${month}.pdf`
    : `attendance_${year}_${month}.pdf`;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Calculate summary (only for past/current days)
  const today = new Date().toISOString().split("T")[0];
  const pastDays = data.filter((d) => d.date <= today);

  const summary = {
    present: pastDays.filter((r) => r.attendanceStatus === "present").length,
    absent: pastDays.filter((r) => r.attendanceStatus === "absent").length,
    weekend: data.filter(
      (r) => r.attendanceStatus === "weekend" || r.type === "weekend"
    ).length,
    holiday: data.filter(
      (r) => r.attendanceStatus === "holiday" || r.type === "holiday"
    ).length,
    upcoming: data.filter((r) => r.isFuture && r.type === "workday").length,
    totalWorkHours: pastDays.reduce((sum, r) => sum + (r.duration || 0), 0),
  };

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Monthly Attendance Report", pageWidth / 2, 15, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(monthName, pageWidth / 2, 22, { align: "center" });

  if (userName) {
    doc.text(`Employee: ${userName}`, pageWidth / 2, 28, { align: "center" });
  }

  // Summary box
  let y = userName ? 35 : 30;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 2, 2, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const summaryY = y + 7;
  const colWidth = (pageWidth - margin * 2) / 6;

  doc.setTextColor(22, 163, 74);
  doc.text(`Present: ${summary.present}`, margin + colWidth * 0.5, summaryY, {
    align: "center",
  });

  doc.setTextColor(220, 38, 38);
  doc.text(`Absent: ${summary.absent}`, margin + colWidth * 1.5, summaryY, {
    align: "center",
  });

  doc.setTextColor(59, 130, 246);
  doc.text(`Weekend: ${summary.weekend}`, margin + colWidth * 2.5, summaryY, {
    align: "center",
  });

  doc.setTextColor(139, 92, 246);
  doc.text(`Holiday: ${summary.holiday}`, margin + colWidth * 3.5, summaryY, {
    align: "center",
  });

  doc.setTextColor(156, 163, 175);
  doc.text(`Upcoming: ${summary.upcoming}`, margin + colWidth * 4.5, summaryY, {
    align: "center",
  });

  doc.setTextColor(0, 0, 0);
  doc.text(
    `Hours: ${formatDuration(summary.totalWorkHours)}`,
    margin + colWidth * 5.5,
    summaryY,
    { align: "center" }
  );

  y += 25;

  // Table header
  const columns = [
    { header: "Date", width: 25 },
    { header: "Day", width: 22 },
    { header: "Name", width: 40 },
    { header: "Status", width: 22 },
    { header: "Type", width: 20 },
    { header: "Clock In", width: 22 },
    { header: "Clock Out", width: 22 },
    { header: "Break", width: 18 },
    { header: "Work Time", width: 22 },
    { header: "Notes", width: 50 },
  ];

  const drawTableHeader = (yPos) => {
    doc.setFillColor(31, 41, 55);
    doc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);

    let x = margin + 2;
    columns.forEach((col) => {
      doc.text(col.header, x, yPos + 5.5);
      x += col.width;
    });

    return yPos + 8;
  };

  y = drawTableHeader(y);

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);

  const getStatusColor = (status, isFuture) => {
    if (isFuture) return [156, 163, 175]; // Gray for upcoming
    switch (status) {
      case "present":
        return [22, 163, 74];
      case "absent":
        return [220, 38, 38];
      case "weekend":
        return [59, 130, 246];
      case "holiday":
        return [139, 92, 246];
      case "upcoming":
        return [156, 163, 175];
      default:
        return [107, 114, 128];
    }
  };

  data.forEach((r, index) => {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 15;
      y = drawTableHeader(y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
    }

    // Row background
    if (r.isFuture) {
      doc.setFillColor(243, 244, 246); // Light gray for future
    } else if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(margin, y, pageWidth - margin * 2, 7, "F");

    const userName = r.user?.name || "N/A";

    doc.setFontSize(7);
    let x = margin + 2;

    // Date
    doc.setTextColor(0, 0, 0);
    doc.text(r.date, x, y + 5);
    x += columns[0].width;

    // Day
    doc.text(r.shortDayName, x, y + 5);
    x += columns[1].width;

    // Name
    const truncatedName =
      userName.length > 18 ? userName.substring(0, 16) + "..." : userName;
    doc.text(truncatedName, x, y + 5);
    x += columns[2].width;

    // Status with color
    const statusColor = getStatusColor(r.attendanceStatus, r.isFuture);
    doc.setTextColor(...statusColor);
    const displayStatus = r.isFuture
      ? "upcoming"
      : r.attendanceStatus || "absent";
    doc.text(displayStatus, x, y + 5);
    doc.setTextColor(0, 0, 0);
    x += columns[3].width;

    // Type
    doc.text(r.type || "workday", x, y + 5);
    x += columns[4].width;

    // Clock In
    doc.text(r.clockIn ? formatTime(r.clockIn) : "-", x, y + 5);
    x += columns[5].width;

    // Clock Out
    doc.text(r.clockOut ? formatTime(r.clockOut) : "-", x, y + 5);
    x += columns[6].width;

    // Break
    doc.text(formatDuration(r.breakDuration), x, y + 5);
    x += columns[7].width;

    // Work Time
    doc.text(formatDuration(r.duration), x, y + 5);
    x += columns[8].width;

    // Notes
    const notes = r.holidayName || r.notes || (r.isFuture ? "Upcoming" : "-");
    const truncatedNotes =
      notes.length > 25 ? notes.substring(0, 23) + "..." : notes;
    doc.setTextColor(107, 114, 128);
    doc.text(truncatedNotes, x, y + 5);
    doc.setTextColor(0, 0, 0);

    y += 7;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Generated: ${new Date().toLocaleString("en-ZA")}`,
      margin,
      pageHeight - 5
    );
    doc.text(
      `Page ${i} of ${pageCount} | Total Days: ${data.length}`,
      pageWidth - margin,
      pageHeight - 5,
      { align: "right" }
    );
  }

  const pdf = doc.output();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  res.send(Buffer.from(pdf, "binary"));
};

// ==================== EXPORT INDIVIDUAL ATTENDANCE PDF ====================
export const exportIndividualAttendancePDF = (
  res,
  records,
  userInfo,
  options = {}
) => {
  const { month, year } = options;

  // Merge with all month days
  const data = mergeWithMonthDays(records, year, month, userInfo);

  if (data.length === 0) {
    return res
      .status(400)
      .json({ message: "No attendance data available for export" });
  }

  const monthName = getMonthName(year, month);
  const filename = `attendance_${userInfo.name.replace(/\s+/g, "_")}_${year}_${month}.pdf`;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Attendance Report", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text(monthName, pageWidth / 2, 28, { align: "center" });

  // Employee Info Box
  let y = 40;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 3, 3, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Employee Information", margin + 5, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Name: ${userInfo.name}`, margin + 5, y + 16);
  doc.text(`Email: ${userInfo.email}`, margin + 5, y + 22);
  doc.text(`Department: ${userInfo.department || "N/A"}`, margin + 100, y + 16);
  doc.text(`Province: ${userInfo.province || "N/A"}`, margin + 100, y + 22);

  y += 40;

  // Summary - only count past/current days for present/absent
  const today = new Date().toISOString().split("T")[0];
  const pastDays = data.filter((d) => d.date <= today);

  const summary = {
    present: pastDays.filter((r) => r.attendanceStatus === "present").length,
    absent: pastDays.filter(
      (r) => r.attendanceStatus === "absent" && r.type === "workday"
    ).length,
    weekend: data.filter((r) => r.type === "weekend").length,
    holiday: data.filter((r) => r.type === "holiday").length,
    upcoming: data.filter((r) => r.isFuture && r.type === "workday").length,
    totalWorkHours: pastDays.reduce((sum, r) => sum + (r.duration || 0), 0),
    totalBreakHours: pastDays.reduce(
      (sum, r) => sum + (r.breakDuration || 0),
      0
    ),
  };

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Monthly Summary", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const summaryItems = [
    { label: "Days Present", value: summary.present, color: [22, 163, 74] },
    { label: "Days Absent", value: summary.absent, color: [220, 38, 38] },
    { label: "Weekend days", value: summary.weekend, color: [59, 130, 246] },
    { label: "Holidays", value: summary.holiday, color: [139, 92, 246] },
    { label: "Upcoming Days", value: summary.upcoming, color: [156, 163, 175] },
    {
      label: "Total Work Time",
      value: formatDuration(summary.totalWorkHours),
      color: [0, 0, 0],
    },
  ];

  const boxWidth = (pageWidth - margin * 2 - 10) / 3;
  summaryItems.forEach((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const boxX = margin + col * (boxWidth + 5);
    const boxY = y + row * 18;

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(boxX, boxY, boxWidth, 15, 2, 2, "F");

    doc.setTextColor(...item.color);
    doc.setFont("helvetica", "bold");
    doc.text(String(item.value), boxX + boxWidth / 2, boxY + 6, {
      align: "center",
    });

    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(item.label, boxX + boxWidth / 2, boxY + 12, { align: "center" });
    doc.setFontSize(10);
  });

  y += 45;

  // Attendance Details Table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Daily Attendance", margin, y);
  y += 8;

  const drawTableHeader = (yPos) => {
    doc.setFillColor(31, 41, 55);
    doc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Date", margin + 3, yPos + 5.5);
    doc.text("Day", margin + 28, yPos + 5.5);
    doc.text("Status", margin + 50, yPos + 5.5);
    doc.text("Clock In", margin + 80, yPos + 5.5);
    doc.text("Clock Out", margin + 105, yPos + 5.5);
    doc.text("Work Time", margin + 135, yPos + 5.5);
    doc.text("Notes", margin + 160, yPos + 5.5);

    return yPos + 8;
  };

  y = drawTableHeader(y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);

  data.forEach((r, index) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
      y = drawTableHeader(y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
    }

    // Row background
    if (r.isFuture) {
      doc.setFillColor(243, 244, 246);
    } else if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(margin, y, pageWidth - margin * 2, 6, "F");

    doc.text(r.date, margin + 3, y + 4.5);
    doc.text(r.shortDayName, margin + 28, y + 4.5);

    // Status with color
    const statusColors = {
      present: [22, 163, 74],
      absent: [220, 38, 38],
      weekend: [59, 130, 246],
      holiday: [139, 92, 246],
      upcoming: [156, 163, 175],
    };
    const displayStatus = r.isFuture
      ? "upcoming"
      : r.attendanceStatus || "absent";
    doc.setTextColor(...(statusColors[displayStatus] || [0, 0, 0]));
    doc.text(displayStatus, margin + 50, y + 4.5);
    doc.setTextColor(0, 0, 0);

    doc.text(r.clockIn ? formatTime(r.clockIn) : "-", margin + 80, y + 4.5);
    doc.text(r.clockOut ? formatTime(r.clockOut) : "-", margin + 105, y + 4.5);
    doc.text(formatDuration(r.duration), margin + 135, y + 4.5);

    const notes = r.holidayName || (r.isFuture ? "Upcoming" : "-");
    doc.setTextColor(107, 114, 128);
    doc.text(notes.substring(0, 15), margin + 160, y + 4.5);
    doc.setTextColor(0, 0, 0);

    y += 6;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Generated: ${new Date().toLocaleString("en-ZA")}`,
      margin,
      pageHeight - 8
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
  }

  const pdf = doc.output();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  res.send(Buffer.from(pdf, "binary"));
};

export default {
  exportAttendanceCSV,
  exportAttendancePDF,
  exportIndividualAttendancePDF,
};
