js
const express = require("express");
const router = express.Router();
const {
  adminGetReports,
  adminExportReports
} = require("../controllers/adminController");

const admin = require("../middleware/admin"); // only admins allowed

router.get("/reports", admin, adminGetReports);
router.get("/reports/export", admin, adminExportReports);

module.exports = router;




/exportUtils.js` (CSV + PDF Export)

```js
const { jsPDF } = require("jspdf");
const { Parser } = require("json2csv");

// EXPORT CSV
exports.exportCSV = (res, data) => {
  const fields = [
    "userId",
    "weekStart",
    "weekEnd",
    "summary",
    "challenges",
    "learnings",
    "goals",
    "status",
    "createdAt"
  ];

  const parser = new Parser({ fields });
  const csv = parser.parse(data);

  res.header("Content-Type", "text/csv");
  res.attachment("reports.csv");
  return res.send(csv);
};

// EXPORT PDF
exports.exportPDF = (res, data) => {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text("Weekly Reports Export", 10, 10);

  let y = 20;
  data.forEach((r, i) => {
    doc.setFontSize(10);
    doc.text(
      Report ${i + 1} | Week: ${r.weekStart.toISOString().substring(0,10)} - ${r.weekEnd.toISOString().substring(0,10)},
      10,
      y
    );
    y += 6;
    doc.text(Summary: ${r.summary}, 10, y);
    y += 6;
    doc.text(Status: ${r.status}, 10, y);
    y += 10;

    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  const pdf = doc.output();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=reports.pdf");
  res.send(Buffer.from(pdf, "binary"));
};