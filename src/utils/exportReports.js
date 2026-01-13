import { jsPDF } from "jspdf";
import { Transform } from "stream";
import { stripHtml } from "./sanitize.js";

// ==================== EXPORT PDF ====================
export const exportPDF = (res, data) => {
  if (!data || data.length === 0) {
    return res.status(400).json({ message: "No data available for export" });
  }

  // Limit PDF to prevent memory issues
  const MAX_PDF_RECORDS = 100;
  if (data.length > MAX_PDF_RECORDS) {
    return res.status(413).json({
      message: `Too many records (${data.length}) for PDF export. Maximum is ${MAX_PDF_RECORDS}. Please use CSV or narrow your date range.`,
    });
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  let y = 15;

  data.forEach((r) => {
    if (y > 260) {
      doc.addPage();
      y = 15;
    }

    // HEADER
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Weekly Report", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`Name: ${stripHtml(r.userId?.name) || "N/A"}`, margin, y);
    y += 6;
    doc.text(`Email: ${r.userId?.email || "N/A"}`, margin, y);
    y += 6;
    doc.text(`Role: ${r.userId?.role || "N/A"}`, margin, y);
    y += 6;
    doc.text(
      `Report Date: ${new Date(r.createdAt).toLocaleDateString()}`,
      margin,
      y
    );
    y += 6;
    doc.text(`Status: ${r.status || "N/A"}`, margin, y);
    y += 10;

    // WEEK OVERVIEW
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Week Overview", margin, y);
    y += 6;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(
      `Week start: ${new Date(r.weekStart).toISOString().split("T")[0]}`,
      margin,
      y
    );
    y += 5;
    doc.text(
      `Week end: ${new Date(r.weekEnd).toISOString().split("T")[0]}`,
      margin,
      y
    );
    y += 5;
    doc.text("Summary:", margin, y);
    y += 5;
    doc.text(stripHtml(r.summary) || "-", margin + 10, y, {
      maxWidth: pageWidth - margin * 2 - 10,
    });
    y += 12;

    // CHALLENGES
    doc.setFont("helvetica", "bold");
    doc.text("Challenges", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const challenges = stripHtml(r.challenges)?.split("\n") || ["-"];
    challenges.forEach((line) => {
      if (line.trim()) {
        doc.text(`• ${line}`, margin + 10, y, {
          maxWidth: pageWidth - margin * 2 - 10,
        });
        y += 5;
      }
    });
    y += 5;

    // LEARNINGS
    doc.setFont("helvetica", "bold");
    doc.text("Learnings", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const learnings = stripHtml(r.learnings)?.split("\n") || ["-"];
    learnings.forEach((line) => {
      if (line.trim()) {
        doc.text(`• ${line}`, margin + 10, y, {
          maxWidth: pageWidth - margin * 2 - 10,
        });
        y += 5;
      }
    });
    y += 5;

    // NEXT WEEK
    doc.setFont("helvetica", "bold");
    doc.text("Goals for Next Week", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const nextWeek = stripHtml(r.nextWeek)?.split("\n") || ["-"];
    nextWeek.forEach((line) => {
      if (line.trim()) {
        doc.text(`• ${line}`, margin + 10, y, {
          maxWidth: pageWidth - margin * 2 - 10,
        });
        y += 5;
      }
    });
    y += 5;

    // ACTION ITEMS / TARGETS
    doc.setFont("helvetica", "bold");
    doc.text("Action Items / Targets", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const goals = stripHtml(r.goals)?.split("\n") || ["-"];
    goals.forEach((line) => {
      if (line.trim()) {
        doc.text(`• ${line}`, margin + 10, y, {
          maxWidth: pageWidth - margin * 2 - 10,
        });
        y += 5;
      }
    });
    y += 5;

    // Review info if available
    if (r.reviewerId || r.reviewComment) {
      doc.setFont("helvetica", "bold");
      doc.text("Review", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      if (r.reviewerId) {
        doc.text(
          `Reviewer: ${r.reviewerId?.name || r.reviewerId}`,
          margin + 10,
          y
        );
        y += 5;
      }
      if (r.reviewedAt) {
        doc.text(
          `Reviewed: ${new Date(r.reviewedAt).toLocaleDateString()}`,
          margin + 10,
          y
        );
        y += 5;
      }
      if (r.reviewComment) {
        doc.text(`Comment: ${stripHtml(r.reviewComment)}`, margin + 10, y, {
          maxWidth: pageWidth - margin * 2 - 10,
        });
        y += 5;
      }
      y += 5;
    }

    // Footer separator
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
  });

  const pdf = doc.output();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=weekly_reports.pdf"
  );
  res.send(Buffer.from(pdf, "binary"));
};

// ==================== EXPORT CSV (Streaming) ====================
export const exportCSV = (res, data) => {
  if (!data || data.length === 0) {
    return res.status(400).json({ message: "No data available for export" });
  }

  // Set headers for streaming CSV
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=weekly_reports.csv"
  );

  // CSV header
  const fields = [
    "No.",
    "Name",
    "Email",
    "Role",
    "Week Start",
    "Week End",
    "Summary",
    "Challenges",
    "Learnings",
    "Next Week Goals",
    "Action Items / Targets",
    "Status",
    "Reviewer",
    "Review Comment",
    "Report Date",
  ];

  // Escape CSV field
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return "";
    const str = String(value).replace(/"/g, '""');
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str}"`
      : str;
  };

  // Write header
  res.write(fields.join(",") + "\n");

  // Stream rows
  data.forEach((r, index) => {
    const row = [
      index + 1,
      stripHtml(r.userId?.name) || "N/A",
      r.userId?.email || "N/A",
      r.userId?.role || "N/A",
      new Date(r.weekStart).toISOString().split("T")[0],
      new Date(r.weekEnd).toISOString().split("T")[0],
      stripHtml(r.summary) || "-",
      stripHtml(r.challenges) || "-",
      stripHtml(r.learnings) || "-",
      stripHtml(r.nextWeek) || "-",
      stripHtml(r.goals) || "-",
      r.status || "Pending",
      r.reviewerId?.name || "-",
      stripHtml(r.reviewComment) || "-",
      new Date(r.createdAt).toISOString().split("T")[0],
    ];

    res.write(row.map(escapeCSV).join(",") + "\n");
  });

  res.end();
};
