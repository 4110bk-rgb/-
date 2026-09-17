// Russian non-working holidays, from the official government production
// calendar (published ~autumn of the prior year). This table only covers
// the years it's been filled in for — add the next year's dates each
// December from https://www.consultant.ru/law/ref/calendar/proizvodstvennye/
const HOLIDAYS_BY_YEAR = {
  2026: [
    '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05',
    '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09',
    '2026-02-23',
    '2026-03-08',
    '2026-05-01', '2026-05-02', '2026-05-03',
    '2026-05-09', '2026-05-10', '2026-05-11',
    '2026-06-12', '2026-06-13', '2026-06-14',
    '2026-11-04',
  ],
};

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

// Weekday and not a holiday. Falls back to a weekday-only check (with a
// console warning) for a year that hasn't been filled in yet — sending one
// extra notification on an unlisted holiday beats silently going dark.
function isWorkingDay(date = new Date()) {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;

  const year = date.getFullYear();
  const holidays = HOLIDAYS_BY_YEAR[year];
  if (!holidays) {
    console.warn(`ruHolidays: no holiday table for ${year} — treating all weekdays as working days`);
    return true;
  }

  return !holidays.includes(dateKey(date));
}

module.exports = { isWorkingDay };
