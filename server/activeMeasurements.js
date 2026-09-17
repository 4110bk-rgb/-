const { listAll, call, userNames } = require('./bitrixClient');
const {
  extractMeasurementDate,
  stripFormatting,
  MEASUREMENT_CATEGORY_ID,
  MEASUREMENT_STAGE_ID,
} = require('./overdueMeasurements');

function dealUrl(dealId) {
  const base = process.env.BITRIX_WEBHOOK_URL;
  const origin = new URL(base).origin;
  return `${origin}/crm/deal/details/${dealId}/`;
}

// When the deal last entered "Ждёт замер" — that's when the wait started.
async function stageEnteredAt(dealId) {
  const history = await call('crm.stagehistory.list', {
    entityTypeId: 2,
    filter: { OWNER_ID: dealId },
  });
  const items = history.result?.items || [];
  const matches = items
    .filter((h) => h.STAGE_ID === MEASUREMENT_STAGE_ID)
    .sort((a, b) => new Date(b.CREATED_TIME) - new Date(a.CREATED_TIME));
  return matches[0] ? new Date(matches[0].CREATED_TIME) : null;
}

// All deals currently waiting on "Ждёт замер", with how long they've been
// waiting and whatever date the comment mentions (today / overdue / future).
async function getActiveMeasurements(referenceDate = new Date()) {
  const deals = await listAll('crm.deal.list', {
    filter: { CATEGORY_ID: MEASUREMENT_CATEGORY_ID, STAGE_ID: MEASUREMENT_STAGE_ID },
    select: ['ID', 'TITLE', 'ASSIGNED_BY_ID', 'COMMENTS'],
  });

  const managerIds = [...new Set(deals.map((d) => d.ASSIGNED_BY_ID))];
  const managerNames = await userNames(managerIds);
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  const results = [];
  for (const deal of deals) {
    const enteredAt = await stageEnteredAt(deal.ID);
    const waitingDays = enteredAt ? Math.max(0, Math.floor((today - enteredAt) / 86400000)) : null;

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

    results.push({
      dealId: deal.ID,
      title: deal.TITLE,
      url: dealUrl(deal.ID),
      manager: managerNames[deal.ASSIGNED_BY_ID] || deal.ASSIGNED_BY_ID,
      waitingDays,
      mentionedDate: mentionedDate ? mentionedDate.toISOString().slice(0, 10) : null,
      dateStatus,
      daysOverdue,
      comment: stripFormatting(deal.COMMENTS),
    });
  }

  // Overdue first (most overdue on top), then today, then scheduled/none by longest wait.
  const rank = { overdue: 0, today: 1, scheduled: 2, none: 2 };
  results.sort((a, b) => {
    if (rank[a.dateStatus] !== rank[b.dateStatus]) return rank[a.dateStatus] - rank[b.dateStatus];
    if (a.dateStatus === 'overdue') return b.daysOverdue - a.daysOverdue;
    return (b.waitingDays || 0) - (a.waitingDays || 0);
  });

  return results;
}

module.exports = { getActiveMeasurements, dealUrl };
