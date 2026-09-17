require('dotenv').config();
const path = require('path');
const express = require('express');
const cron = require('node-cron');
const { getDealsReport, getLeadsReport, getCallsReport, buildManagerEfficiencyReport } = require('./reports');
const { buildWorkbook } = require('./exportXlsx');
const { getDealAttachments } = require('./dealAttachments');
const { sendDealToMax } = require('./sendDealToMax');
const { sendLeadsReportToMax } = require('./sendLeadsReportToMax');
const { sendEfficiencyReportToMax } = require('./sendEfficiencyReportToMax');
const { sendEfficiencyPdfToMax } = require('./sendEfficiencyPdfToMax');
const { getOverdueMeasurements } = require('./overdueMeasurements');
const { sendOverdueMeasurementsToMax } = require('./sendOverdueMeasurementsToMax');
const { getActiveMeasurements } = require('./activeMeasurements');
const { sendActiveMeasurementsToMax } = require('./sendActiveMeasurementsToMax');
const { getActiveRepairs } = require('./activeRepairs');
const { sendActiveRepairsToMax } = require('./sendActiveRepairsToMax');
const { sendDailyDigest } = require('./dailyDigest');
const { sendMorningGreetingToChats } = require('./sendMorningGreetingToChats');
const { sendHolidayGreetingToChats } = require('./sendHolidayGreetingToChats');
const { getNearbyDealGroupsByRadius } = require('./nearbyDeals');
const { sendNearbyDealsToMax } = require('./sendNearbyDealsToMax');
const { sendMeasurementCompletedToMax } = require('./sendMeasurementCompletedToMax');

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
  const callsResult = pick(calls);

  const efficiency =
    dealsResult.ok && leadsResult.ok
      ? {
          ok: true,
          data: buildManagerEfficiencyReport(days, leadsResult.data, dealsResult.data, callsResult.ok ? callsResult.data : null),
        }
      : { ok: false, error: 'Требуются отчёты по лидам и сделкам' };

  return { deals: dealsResult, leads: leadsResult, calls: callsResult, efficiency };
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

app.post('/api/efficiency-report/send-to-max', async (req, res) => {
  try {
    const chatId = Number(req.body.chatId);
    const days = Number(req.body.days) || REPORT_DAYS;
    const message = await sendEfficiencyReportToMax({ chatId, days });
    res.json({ ok: true, data: message });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/efficiency-report/send-pdf-to-max', async (req, res) => {
  try {
    const chatId = Number(req.body.chatId);
    const days = Number(req.body.days) || REPORT_DAYS;
    const message = await sendEfficiencyPdfToMax({ chatId, days });
    res.json({ ok: true, data: message });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/overdue-measurements', async (req, res) => {
  try {
    const data = await getOverdueMeasurements();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/overdue-measurements/send-to-max', async (req, res) => {
  try {
    const chatId = Number(req.body.chatId);
    const message = await sendOverdueMeasurementsToMax({ chatId });
    res.json({ ok: true, data: message });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/active-measurements', async (req, res) => {
  try {
    const data = await getActiveMeasurements();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/active-measurements/send-to-max', async (req, res) => {
  try {
    const chatId = Number(req.body.chatId);
    const message = await sendActiveMeasurementsToMax({ chatId });
    res.json({ ok: true, data: message });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/active-repairs', async (req, res) => {
  try {
    const data = await getActiveRepairs();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/active-repairs/send-to-max', async (req, res) => {
  try {
    const chatId = Number(req.body.chatId);
    const message = await sendActiveRepairsToMax({ chatId });
    res.json({ ok: true, data: message });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/daily-digest/send-to-max', async (req, res) => {
  try {
    const chatId = Number(req.body.chatId);
    const result = await sendDailyDigest({ chatId });
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/morning-greeting/send-to-max', async (req, res) => {
  try {
    const chatIds = Array.isArray(req.body.chatIds) ? req.body.chatIds.map(Number) : greetingChatIds;
    const result = await sendMorningGreetingToChats({ chatIds });
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/measurement-completed/send-to-max', async (req, res) => {
  try {
    const chatId = Number(req.body.chatId);
    const result = await sendMeasurementCompletedToMax({ chatId });
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/holiday-greeting/send-to-max', async (req, res) => {
  try {
    const chatIds = Array.isArray(req.body.chatIds) ? req.body.chatIds.map(Number) : holidayChatIds;
    const result = await sendHolidayGreetingToChats({ chatIds });
    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Daily 08:30 (Moscow time) digest — active measurements + repairs — to the
// MAX chat in MAX_CHAT_ID, weekdays only, skipped on Russian holidays.
const dailyDigestChatId = Number(process.env.MAX_CHAT_ID);
if (dailyDigestChatId) {
  cron.schedule(
    '30 8 * * 1-5',
    () => {
      sendDailyDigest({ chatId: dailyDigestChatId }).catch((err) => console.error('dailyDigest failed:', err));
    },
    { timezone: 'Europe/Moscow' },
  );
} else {
  console.warn('MAX_CHAT_ID is not set — the daily 08:30 digest is disabled.');
}

// Daily 08:00 (Moscow time) morning greeting only — weather + day fact —
// to every chat in MAX_GREETING_CHAT_IDS, same weekday/holiday rule.
const greetingChatIds = (process.env.MAX_GREETING_CHAT_IDS || '')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter(Boolean);
if (greetingChatIds.length) {
  cron.schedule(
    '0 8 * * 1-5',
    () => {
      sendMorningGreetingToChats({ chatIds: greetingChatIds }).catch((err) => console.error('morningGreeting failed:', err));
    },
    { timezone: 'Europe/Moscow' },
  );
} else {
  console.warn('MAX_GREETING_CHAT_IDS is not set — the daily 08:00 greeting is disabled.');
}

// 12:00 and 19:00 (Moscow time) — checks for deals that moved from "Ждёт
// замер" into "Замер выполнен" (same "Монтажная" funnel) since the last
// check, and announces them so a manager knows the замерщик filed the
// measurement and it's ready to follow up on. Same weekday/holiday rule as
// the rest of the schedule; sends nothing when there's no new transition.
if (dailyDigestChatId) {
  cron.schedule(
    '0 12,19 * * 1-5',
    () => {
      sendMeasurementCompletedToMax({ chatId: dailyDigestChatId }).catch((err) => console.error('measurementCompleted failed:', err));
    },
    { timezone: 'Europe/Moscow' },
  );
}

// 10:00 (Moscow time) holiday congratulation — every day, but it only
// actually sends on a named state holiday (New Year, 8 Марта, etc.), later
// than the regular 08:00/08:30 messages since nobody's rushing to work.
// Runs every calendar day (not just weekdays) since a holiday can land on
// any day of the week.
const holidayChatIds = [...new Set([...greetingChatIds, dailyDigestChatId].filter(Boolean))];
if (holidayChatIds.length) {
  cron.schedule(
    '0 10 * * *',
    () => {
      sendHolidayGreetingToChats({ chatIds: holidayChatIds }).catch((err) => console.error('holidayGreeting failed:', err));
    },
    { timezone: 'Europe/Moscow' },
  );
}

app.get('/api/nearby-deals', async (req, res) => {
  try {
    const data = await getNearbyDealGroupsByRadius();
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/nearby-deals/send-to-max', async (req, res) => {
  try {
    const chatId = Number(req.body.chatId);
    const message = await sendNearbyDealsToMax({ chatId });
    res.json({ ok: true, data: message });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Bitrix24 reports dashboard running at http://localhost:${PORT}`);
});
