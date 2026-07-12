require('dotenv').config();
const path = require('path');
const express = require('express');
const { getDealsReport, getLeadsReport, getCallsReport, buildConversionReport } = require('./reports');
const { buildWorkbook } = require('./exportXlsx');
const { getDealAttachments } = require('./dealAttachments');
const { sendDealToMax } = require('./sendDealToMax');
const { sendLeadsReportToMax } = require('./sendLeadsReportToMax');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const REPORT_DAYS = Number(process.env.REPORT_DAYS) || 30;

app.use(express.json());
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

  const dealsResult = pick(deals);
  const leadsResult = pick(leads);

  const conversion =
    dealsResult.ok && leadsResult.ok
      ? { ok: true, data: buildConversionReport(days, leadsResult.data, dealsResult.data) }
      : { ok: false, error: 'Требуются отчёты по лидам и сделкам' };

  return { deals: dealsResult, leads: leadsResult, calls: pick(calls), conversion };
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

app.get('/api/deals/:id/attachments', async (req, res) => {
  try {
    const data = await getDealAttachments(req.params.id);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/max/chats', async (req, res) => {
  try {
    const { bot } = require('./maxClient');
    const chats = await bot.api.getAllChats();
    res.json({ ok: true, data: chats });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/deals/:id/send-to-max', async (req, res) => {
  try {
    const chatId = Number(req.body.chatId);
    const message = await sendDealToMax({ chatId, dealId: req.params.id });
    res.json({ ok: true, data: message });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/leads-report/send-to-max', async (req, res) => {
  try {
    const chatId = Number(req.body.chatId);
    const days = Number(req.body.days) || REPORT_DAYS;
    const message = await sendLeadsReportToMax({ chatId, days });
    res.json({ ok: true, data: message });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Bitrix24 reports dashboard running at http://localhost:${PORT}`);
});
