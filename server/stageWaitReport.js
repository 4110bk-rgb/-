const { listAll, call, userNames } = require('./bitrixClient');
const { extractMeasurementDate, stripFormatting } = require('./overdueMeasurements');

const CATEGORY_ID = 5; // "Монтажная" funnel
const URGENT_THRESHOLD_DAYS = 3;

function dealUrl(dealId) {
  const base = process.env.BITRIX_WEBHOOK_URL;
  const origin = new URL(base).origin;
  return `${origin}/crm/deal/details/${dealId}/`;
}

// Weekdays elapsed since `start` (midnight-normalized), not counting `start`
// itself — weekends don't count against how long a deal has waited.
function businessDaysSince(start, today) {
  let count = 0;
  const cursor = new Date(start);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor <= today) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

// When the deal last entered `stageId` — that's when the wait started.
async function stageEnteredAt(dealId, stageId) {
  const history = await call('crm.stagehistory.list', {
    entityTypeId: 2,
    filter: { OWNER_ID: dealId },
  });
  const items = history.result?.items || [];
  const matches = items
    .filter((h) => h.STAGE_ID === stageId)
    .sort((a, b) => new Date(b.CREATED_TIME) - new Date(a.CREATED_TIME));
  return matches[0] ? new Date(matches[0].CREATED_TIME) : null;
}

// All deals currently sitting on `stageId`, with how long they've been
// waiting (business days) and whatever date the comment mentions (today /
// overdue / future).
async function getStageWaitReport(stageId, referenceDate = new Date()) {
  const deals = await listAll('crm.deal.list', {
    filter: { CATEGORY_ID, STAGE_ID: stageId },
    select: ['ID', 'TITLE', 'ASSIGNED_BY_ID', 'COMMENTS'],
  });

  const managerIds = [...new Set(deals.map((d) => d.ASSIGNED_BY_ID))];
  const managerNames = await userNames(managerIds);
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  const results = [];
  for (const deal of deals) {
    const enteredAt = await stageEnteredAt(deal.ID, stageId);
    const enteredDay = enteredAt && new Date(enteredAt.getFullYear(), enteredAt.getMonth(), enteredAt.getDate());
    const waitingDays = enteredDay ? businessDaysSince(enteredDay, today) : null;

    const mentionedDate = extractMeasurementDate(deal.COMMENTS, referenceDate);
    let dateStatus = 'none';
    let daysOverdue = null;
    if (mentionedDate) {
      if (mentionedDate.getTime() === today.getTime()) dateStatus = 'today';
      else if (mentionedDate < today) {
        dateStatus = 'overdue';
        daysOverdue = Math.round((today - mentionedDate) / 86400000);
      } else {
        dateStatus = 'scheduled';
      }
    }

    const urgent = dateStatus === 'none' && waitingDays !== null && waitingDays > URGENT_THRESHOLD_DAYS;

    results.push({
      dealId: deal.ID,
      title: deal.TITLE,
      url: dealUrl(deal.ID),
      manager: managerNames[deal.ASSIGNED_BY_ID] || deal.ASSIGNED_BY_ID,
      waitingDays,
      mentionedDate: mentionedDate ? mentionedDate.toISOString().slice(0, 10) : null,
      dateStatus,
      daysOverdue,
      urgent,
      comment: stripFormatting(deal.COMMENTS),
    });
  }

  results.sort((a, b) => (b.waitingDays || 0) - (a.waitingDays || 0));

  return results;
}

module.exports = { getStageWaitReport, dealUrl, URGENT_THRESHOLD_DAYS };
