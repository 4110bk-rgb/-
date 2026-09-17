const fs = require('fs');
const path = require('path');
const { listAll, call, userNames } = require('./bitrixClient');

const CATEGORY_ID = 5; // "Монтажная" funnel
const COMPLETED_STAGE_ID = 'C5:PREPAYMENT_INVOICE'; // "Замер выполнен"

// Persisted so a deal that moved into "Замер выполнен" is only reported
// once, across separate cron runs (and server restarts, as long as the
// disk survives them) — not just kept in memory.
const STATE_FILE = path.join(__dirname, '..', 'data', 'measurementCompletedState.json');

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}

async function stageEnteredAt(dealId) {
  const history = await call('crm.stagehistory.list', {
    entityTypeId: 2,
    filter: { OWNER_ID: dealId },
  });
  const items = history.result?.items || [];
  const matches = items
    .filter((h) => h.STAGE_ID === COMPLETED_STAGE_ID)
    .sort((a, b) => new Date(b.CREATED_TIME) - new Date(a.CREATED_TIME));
  return matches[0] ? new Date(matches[0].CREATED_TIME) : null;
}

// Deals that moved from "Ждёт замер" into "Замер выполнен" since the last
// time this ran — the замерщик has filed the measurement and a manager can
// follow up with the client. First-ever run just starts the watermark at
// "now" instead of reporting the whole backlog of past transitions.
async function getNewlyCompletedMeasurements() {
  const state = readState();
  const now = new Date();

  if (!state) {
    writeState({ lastCheckedAt: now.toISOString() });
    return [];
  }

  const since = new Date(state.lastCheckedAt);
  const deals = await listAll('crm.deal.list', {
    filter: { CATEGORY_ID, STAGE_ID: COMPLETED_STAGE_ID },
    select: ['ID', 'TITLE', 'ASSIGNED_BY_ID'],
  });

  const managerIds = [...new Set(deals.map((d) => d.ASSIGNED_BY_ID))];
  const managerNames = await userNames(managerIds);

  const results = [];
  for (const deal of deals) {
    const enteredAt = await stageEnteredAt(deal.ID);
    if (enteredAt && enteredAt > since) {
      results.push({
        dealId: deal.ID,
        title: deal.TITLE,
        manager: managerNames[deal.ASSIGNED_BY_ID] || deal.ASSIGNED_BY_ID,
        enteredAt,
      });
    }
  }

  writeState({ lastCheckedAt: now.toISOString() });
  return results;
}

module.exports = { getNewlyCompletedMeasurements, COMPLETED_STAGE_ID };
