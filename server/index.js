require('dotenv').config();
const path = require('path');
const express = require('express');
const { getDealsReport, getLeadsReport, getCallsReport } = require('./reports');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const REPORT_DAYS = Number(process.env.REPORT_DAYS) || 30;

app.use(express.static(path.join(__dirname, '..', 'public')));

// One JSON payload per report, fetched in parallel; each failure is isolated
// so a missing webhook scope (e.g. telephony) doesn't take down the others.
app.get('/api/summary', async (req, res) => {
  const days = Number(req.query.days) || REPORT_DAYS;

  const [deals, leads, calls] = await Promise.allSettled([
    getDealsReport(days),
    getLeadsReport(days),
    getCallsReport(days),
  ]);

  const pick = (settled) =>
    settled.status === 'fulfilled' ? { ok: true, data: settled.value } : { ok: false, error: settled.reason.message };

  res.json({
    generatedAt: new Date().toISOString(),
    deals: pick(deals),
    leads: pick(leads),
    calls: pick(calls),
  });
});

app.listen(PORT, () => {
  console.log(`Bitrix24 reports dashboard running at http://localhost:${PORT}`);
});
