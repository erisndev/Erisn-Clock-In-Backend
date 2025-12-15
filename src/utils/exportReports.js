import { jsPDF } from "jspdf";
import { Parser } from 'json2csv';

// EXPORT PDF - Professional HTML-style
export const exportPDF = (res, data) => {
  if (!data || data.length === 0) {
    return res.status(400).json({ message: "No data available for export" });
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  let y = 15;

  data.forEach((r, index) => {
    if (y > 260) {
      doc.addPage();
      y = 15;
    }

    // HEADER
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0); // Green color
    doc.text("Weekly Report", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`Name: ${r.userId?.name || "N/A"}`, margin, y);
    y += 6;
    doc.text(`Email: ${r.userId?.email || "N/A"}`, margin, y);
    y += 6;
    doc.text(`Role: ${r.userId?.role || "N/A"}`, margin, y);
    y += 6;
    doc.text(`Report Date: ${new Date(r.createdAt).toLocaleDateString()}`, margin, y);
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
    doc.text(`Week start: ${new Date(r.weekStart).toISOString().split("T")[0]}`, margin, y);
    y += 5;
    doc.text(`Week end: ${new Date(r.weekEnd).toISOString().split("T")[0]}`, margin, y);
    y += 5;
    doc.text("Summary:", margin, y);
    y += 5;
    doc.text(r.summary || "-", margin + 10, y, { maxWidth: pageWidth - margin * 2 - 10 });
    y += 12;

    // CHALLENGES
    doc.setFont("helvetica", "bold");
    doc.text("Challenges", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    (r.challenges?.split("\n") || ["-"]).forEach(line => {
      doc.text(`• ${line}`, margin + 10, y, { maxWidth: pageWidth - margin * 2 - 10 });
      y += 5;
    });
    y += 5;

    // LEARNINGS
    doc.setFont("helvetica", "bold");
    doc.text("Learnings", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    (r.learnings?.split("\n") || ["-"]).forEach(line => {
      doc.text(`• ${line}`, margin + 10, y, { maxWidth: pageWidth - margin * 2 - 10 });
      y += 5;
    });
    y += 5;

    // NEXT WEEK
    doc.setFont("helvetica", "bold");
    doc.text("Goals for Next Week", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    (r.nextWeek?.split("\n") || ["-"]).forEach(line => {
      doc.text(`• ${line}`, margin + 10, y, { maxWidth: pageWidth - margin * 2 - 10 });
      y += 5;
    });
    y += 5;

    // ACTION ITEMS / TARGETS
    doc.setFont("helvetica", "bold");
    doc.text("Action Items / Targets", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    (r.goals?.split("\n") || ["-"]).forEach(line => {
      doc.text(`• ${line}`, margin + 10, y, { maxWidth: pageWidth - margin * 2 - 10 });
      y += 5;
    });
    y += 5;

    // Footer separator
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
  });

  const pdf = doc.output();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=weekly_reports.pdf");
  res.send(Buffer.from(pdf, "binary"));
};

// EXPORT CSV - Professional Style
export const exportCSV = (res, data) => {
  if (!data || data.length === 0) {
    return res.status(400).json({ message: 'No data available for export' });
  }

  // Map the data into readable format
  const csvData = data.map((r, index) => ({
    'No.': index + 1,
    'Name': r.userId?.name || 'N/A',
    'Email': r.userId?.email || 'N/A',
    'Role': r.userId?.role || 'N/A',
    'Week Start': new Date(r.weekStart).toISOString().split('T')[0],
    'Week End': new Date(r.weekEnd).toISOString().split('T')[0],
    'Summary': r.summary || '-',
    'Challenges': r.challenges || '-',
    'Learnings': r.learnings || '-',
    'Next Week Goals': r.nextWeek || '-',
    'Action Items / Targets': r.goals || '-',
    'Status': r.status || 'Pending',
    'Report Date': new Date(r.createdAt).toISOString().split('T')[0],
  }));

  const fields = [
    'No.',
    'Name',
    'Email',
    'Role',
    'Week Start',
    'Week End',
    'Summary',
    'Challenges',
    'Learnings',
    'Next Week Goals',
    'Action Items / Targets',
    'Status',
    'Report Date',
  ];

  const parser = new Parser({ fields, quote: '"' });
  const csv = parser.parse(csvData);

  // Set headers for download
  res.header('Content-Type', 'text/csv');
  res.attachment('weekly_reports.csv');
  return res.send(csv);
};
