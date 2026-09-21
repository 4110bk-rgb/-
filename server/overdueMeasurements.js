const { listAll, userNames } = require('./bitrixClient');

const MEASUREMENT_CATEGORY_ID = 5; // "Монтажная" funnel
const MEASUREMENT_STAGE_ID = 'C5:PREPARATION'; // "Ждёт замер"

const MONTHS = {
  января: 0, февраля: 1, марта: 2, апреля: 3, мая: 4, июня: 5,
  июля: 6, августа: 7, сентября: 8, октября: 9, ноября: 10, декабря: 11,
};
const MONTH_NAMES = Object.keys(MONTHS).join('|');
const MONTH_NAMES_BY_INDEX = Object.keys(MONTHS); // declaration order matches the 0-11 values above

// Numeric dd.mm / dd,mm dates are common in dictated notes but also show up in
// unrelated call-log timestamps, so they only count near a measurement-related word.
const CONTEXT_WORDS = /замер|выезд|диагностик|приед|встреч/i;
const CONTEXT_WINDOW = 40;

function stripFormatting(text) {
  return (text || '').replace(/\[\/?[a-z]+[^\]]*\]/gi, ' ').replace(/\s+/g, ' ').trim();
}

function isValidDay(day) {
  return day >= 1 && day <= 31;
}

// "5–8 октября" / "30 сентября – 2 октября" — same wording either way.
function formatRangeRu(start, end) {
  const startPart = `${start.getDate()} ${MONTH_NAMES_BY_INDEX[start.getMonth()]}`;
  if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()} ${MONTH_NAMES_BY_INDEX[end.getMonth()]}`;
  return `${startPart} – ${end.getDate()} ${MONTH_NAMES_BY_INDEX[end.getMonth()]}`;
}

// Finds the current date (or date range) in a deal's free-text comment.
// Managers write the up-to-date info first and append older notes/details
// after it, so the FIRST date-like mention in the text is what's current —
// not the last. They sometimes dictate an exact day ("8 октября") and
// sometimes a window during which the measurement can happen ("с 5 по 8
// октября", "5-8 октября", "с 5.10 по 8.10") — both are worth telling apart,
// since a range shouldn't be treated as "overdue" until its LAST day passes.
// Returns { type: 'exact', date } | { type: 'range', start, end } | null.
// Assumes the current year — these are notes about upcoming visits, not
// historical records spanning past years.
function extractMeasurementDateInfo(rawText, referenceDate) {
  const text = stripFormatting(rawText);
  if (!text) return null;

  const year = referenceDate.getFullYear();
  const candidates = [];
  const rangeSpans = []; // [start, end) text spans already claimed by a range match

  const claimSpan = (m) => rangeSpans.push([m.index, m.index + m[0].length]);
  const insideRangeSpan = (index) => rangeSpans.some(([s, e]) => index >= s && index < e);

  // "с 5 по 8 октября" / "с 5 октября по 8 октября" / "с 5 октября до 8"
  const wordRangeRe = new RegExp(`с\\s+(\\d{1,2})(?:\\s+(${MONTH_NAMES}))?\\s*(?:по|до)\\s+(\\d{1,2})(?:\\s+(${MONTH_NAMES}))?`, 'gi');
  for (const m of text.matchAll(wordRangeRe)) {
    const monthName = m[2] || m[4];
    if (!monthName) continue; // need at least one month mentioned to anchor the range
    const day1 = Number(m[1]);
    const day2 = Number(m[3]);
    if (!isValidDay(day1) || !isValidDay(day2)) continue;
    const month1 = MONTHS[(m[2] || monthName).toLowerCase()];
    const month2 = MONTHS[monthName.toLowerCase()];
    candidates.push({ index: m.index, type: 'range', start: new Date(year, month1, day1), end: new Date(year, month2, day2) });
    claimSpan(m);
  }

  // "с 5.10 по 8.10"
  const numericWordRangeRe = /с\s+(\d{1,2})[.,](\d{1,2})\s*(?:по|до)\s+(\d{1,2})[.,](\d{1,2})(?!\d)/gi;
  for (const m of text.matchAll(numericWordRangeRe)) {
    const day1 = Number(m[1]);
    const month1 = Number(m[2]) - 1;
    const day2 = Number(m[3]);
    const month2 = Number(m[4]) - 1;
    if (!isValidDay(day1) || !isValidDay(day2) || month1 < 0 || month1 > 11 || month2 < 0 || month2 > 11) continue;
    candidates.push({ index: m.index, type: 'range', start: new Date(year, month1, day1), end: new Date(year, month2, day2) });
    claimSpan(m);
  }

  // "5-8 октября" (dash, single month name anchors it — no context word needed)
  const dashRangeRe = new RegExp(`(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2})\\s+(${MONTH_NAMES})`, 'gi');
  for (const m of text.matchAll(dashRangeRe)) {
    const day1 = Number(m[1]);
    const day2 = Number(m[2]);
    if (!isValidDay(day1) || !isValidDay(day2)) continue;
    const month = MONTHS[m[3].toLowerCase()];
    candidates.push({ index: m.index, type: 'range', start: new Date(year, month, day1), end: new Date(year, month, day2) });
    claimSpan(m);
  }

  // "5.10-8.10" (also "5.10.-8.10", a trailing dot before the dash is common
  // in dictated notes) — ambiguous with other numeric data, so only counts
  // near a measurement-related word.
  const numericDashRangeRe = /(\d{1,2})[.,](\d{1,2})[.,]?\s*[-–—]\s*(\d{1,2})[.,](\d{1,2})(?!\d)/g;
  for (const m of text.matchAll(numericDashRangeRe)) {
    const day1 = Number(m[1]);
    const month1 = Number(m[2]) - 1;
    const day2 = Number(m[3]);
    const month2 = Number(m[4]) - 1;
    if (!isValidDay(day1) || !isValidDay(day2) || month1 < 0 || month1 > 11 || month2 < 0 || month2 > 11) continue;

    const start = Math.max(0, m.index - CONTEXT_WINDOW);
    const window = text.slice(start, m.index + m[0].length + CONTEXT_WINDOW);
    if (!CONTEXT_WORDS.test(window)) continue;
    candidates.push({ index: m.index, type: 'range', start: new Date(year, month1, day1), end: new Date(year, month2, day2) });
    claimSpan(m);
  }

  // Single "D Month" — skipped where it's just part of an already-matched range above.
  for (const m of text.matchAll(new RegExp(`(\\d{1,2})\\s+(${MONTH_NAMES})`, 'gi'))) {
    if (insideRangeSpan(m.index)) continue;
    const day = Number(m[1]);
    const month = MONTHS[m[2].toLowerCase()];
    if (isValidDay(day)) candidates.push({ index: m.index, type: 'exact', date: new Date(year, month, day) });
  }

  // Single numeric "D.M"
  for (const m of text.matchAll(/(\d{1,2})[.,](\d{1,2})(?!\d)/g)) {
    if (insideRangeSpan(m.index)) continue;
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    if (day < 1 || day > 31 || month < 0 || month > 11) continue;

    const start = Math.max(0, m.index - CONTEXT_WINDOW);
    const window = text.slice(start, m.index + m[0].length + CONTEXT_WINDOW);
    if (CONTEXT_WORDS.test(window)) candidates.push({ index: m.index, type: 'exact', date: new Date(year, month, day) });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.index - b.index);
  const first = candidates[0];
  return first.type === 'range' ? { type: 'range', start: first.start, end: first.end } : { type: 'exact', date: first.date };
}

// Back-compat single-date view: a range's end day is what "the measurement
// needs to happen by", so it stands in for the range wherever only one date
// is used (the legacy overdue-measurements report and its date math).
function extractMeasurementDate(rawText, referenceDate) {
  const info = extractMeasurementDateInfo(rawText, referenceDate);
  if (!info) return null;
  return info.type === 'range' ? info.end : info.date;
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

module.exports = {
  getOverdueMeasurements,
  extractMeasurementDate,
  extractMeasurementDateInfo,
  formatRangeRu,
  stripFormatting,
  MEASUREMENT_CATEGORY_ID,
  MEASUREMENT_STAGE_ID,
};
