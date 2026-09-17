const { listAll, userNames } = require('./bitrixClient');

const MEASUREMENT_CATEGORY_ID = 5; // "Монтажная" funnel
const MEASUREMENT_STAGE_ID = 'C5:PREPARATION'; // "Ждёт замер"

const MONTHS = {
  января: 0, февраля: 1, марта: 2, апреля: 3, мая: 4, июня: 5,
  июля: 6, августа: 7, сентября: 8, октября: 9, ноября: 10, декабря: 11,
};
const MONTH_NAMES = Object.keys(MONTHS).join('|');

// Numeric dd.mm / dd,mm dates are common in dictated notes but also show up in
// unrelated call-log timestamps, so they only count near a measurement-related word.
const CONTEXT_WORDS = /замер|выезд|диагностик|приед|встреч/i;
const CONTEXT_WINDOW = 40;

function stripFormatting(text) {
  return (text || '').replace(/\[\/?[a-z]+[^\]]*\]/gi, ' ').replace(/\s+/g, ' ').trim();
}

// Finds the most recently mentioned date in a deal's free-text comment and
// returns it as a Date (assumed to be in the current year — these are notes
// about upcoming visits, not historical records spanning past years).
function extractMeasurementDate(rawText, referenceDate) {
  const text = stripFormatting(rawText);
  if (!text) return null;

  const year = referenceDate.getFullYear();
  const candidates = [];

  for (const m of text.matchAll(new RegExp(`(\\d{1,2})\\s+(${MONTH_NAMES})`, 'gi'))) {
    const day = Number(m[1]);
    const month = MONTHS[m[2].toLowerCase()];
    if (day >= 1 && day <= 31) candidates.push({ index: m.index, date: new Date(year, month, day) });
  }

  for (const m of text.matchAll(/(\d{1,2})[.,](\d{1,2})(?!\d)/g)) {
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    if (day < 1 || day > 31 || month < 0 || month > 11) continue;

    const start = Math.max(0, m.index - CONTEXT_WINDOW);
    const window = text.slice(start, m.index + m[0].length + CONTEXT_WINDOW);
    if (CONTEXT_WORDS.test(window)) candidates.push({ index: m.index, date: new Date(year, month, day) });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.index - b.index);
  return candidates[candidates.length - 1].date;
}

// Deals sitting on "Ждёт замер" whose comment mentions a date that has
// already passed — the measurement was likely missed or needs rescheduling.
async function getOverdueMeasurements(referenceDate = new Date()) {
  const deals = await listAll('crm.deal.list', {
    filter: { CATEGORY_ID: MEASUREMENT_CATEGORY_ID, STAGE_ID: MEASUREMENT_STAGE_ID },
    select: ['ID', 'TITLE', 'ASSIGNED_BY_ID', 'COMMENTS'],
  });

  const managerIds = [...new Set(deals.map((d) => d.ASSIGNED_BY_ID))];
  const managerNames = await userNames(managerIds);

  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const overdue = [];

  for (const deal of deals) {
    const mentionedDate = extractMeasurementDate(deal.COMMENTS, referenceDate);
    if (!mentionedDate || mentionedDate >= today) continue;

    const daysOverdue = Math.round((today - mentionedDate) / 86400000);
    overdue.push({
      dealId: deal.ID,
      title: deal.TITLE,
      manager: managerNames[deal.ASSIGNED_BY_ID] || deal.ASSIGNED_BY_ID,
      mentionedDate: mentionedDate.toISOString().slice(0, 10),
      daysOverdue,
      comment: stripFormatting(deal.COMMENTS),
    });
  }

  overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
  return overdue;
}

module.exports = { getOverdueMeasurements, extractMeasurementDate };
