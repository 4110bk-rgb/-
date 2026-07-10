require('dotenv').config();
const path = require('path');
const express = require('express');
const { getDealsReport, getLeadsReport, getCallsReport } = require('./reports');
const { buildWorkbook } = require('./exportXlsx');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const REPORT_DAYS = Number(process.env.REPORT_DAYS) || 30;

app.use(express.static(path.join(__dirname, '..', 'public')));

// Fetches all three reports in parallel; each failure is isolated so a
// missing webhook scope (e.g. telephony) doesn't take down the others.
async function fetchAllReports(days) {
  const [deals, leads, calls] = await Promise.allSettled([
    getDealsReport(days),
    getLeadsReport(days),
    getCallsReport(days),
  ]);

  const pick = (settled) =>
    settled.status === 'fulfilled' ? { ok: true, data: settled.value } : { ok: false, error: settled.reason.message };

  return { deals: pick(deals), leads: pick(leads), calls: pick(calls) };
}

app.get('/api/summary', async (req, res) => {
  const days = Number(req.query.days) || REPORT_DAYS;
  const reports = await fetchAllReports(days);
  res.json({ generatedAt: new Date().toISOString(), ...reports });
});

app.get('/api/export.xlsx', async (req, res) => {
  const days = Number(req.query.days) || REPORT_DAYS;
  const reports = await fetchAllReports(days);
  const workbook = await buildWorkbook({ ...reports, days });

  const filename = `bitrix24-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  res.end();
});

app.listen(PORT, () => {
  console.log(`Bitrix24 reports dashboard running at http://localhost:${PORT}`);
});
