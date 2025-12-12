import { jsPDF } from 'jspdf';
import { Parser } from 'json2csv';

// EXPORT CSV
export const exportCSV = (res, data) => {
  if (!data || data.length === 0) {
    return res.status(400).json({ message: 'No data available for export' });
  }

  const fields = [
    'userId',
    'weekStart',
    'weekEnd',
    'summary',
    'challenges',
    'learnings',
    'goals',
    'status',
    'createdAt',
  ];

  const parser = new Parser({ fields });
  const csv = parser.parse(data);

  res.header('Content-Type', 'text/csv');
  res.attachment('reports.csv');
  return res.send(csv);
};

// EXPORT PDF
export const exportPDF = (res, data) => {
  if (!data || data.length === 0) {
    return res.status(400).json({ message: 'No data available for export' });
  }

  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text('Weekly Reports Export', 10, 10);

  let y = 20;
  data.forEach((r, i) => {
    doc.setFontSize(10);
    doc.text(
      `Report ${i + 1} | Week: ${new Date(r.weekStart).toISOString().substring(0, 10)} - ${new Date(r.weekEnd).toISOString().substring(0, 10)}`,
      10,
      y
    );
    y += 6;
    doc.text(`Summary: ${r.summary}`, 10, y);
    y += 6;
    doc.text(`Status: ${r.status}`, 10, y);
    y += 10;

    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  const pdf = doc.output();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=reports.pdf');
  res.send(Buffer.from(pdf, 'binary'));
};
