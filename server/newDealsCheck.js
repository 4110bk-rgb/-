const fs = require('fs');
const path = require('path');
const { listAll, call, userNames } = require('./bitrixClient');

const CATEGORY_ID = 5; // "Монтажная" funnel

const STAGES = {
  measurement: { stageId: 'C5:PREPARATION', stateFile: 'newMeasurementsState.json' }, // "Ждёт замер"
  repair: { stageId: 'C5:NEW', stateFile: 'newRepairsState.json' }, // "Ждёт ремонт"
};

function stateFilePath(name) {
  return path.join(__dirname, '..', 'data', name);
}

function readState(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state));
}

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

// Deals that entered `kind`'s stage since the last check — a watermark per
// kind (own state file), same pattern as measurementCompletedCheck.js.
// First-ever run just starts the watermark at "now" instead of reporting
// the whole existing queue as "new".
async function getNewDeals(kind) {
  const { stageId, stateFile } = STAGES[kind];
  const file = stateFilePath(stateFile);
  const state = readState(file);
  const now = new Date();

  if (!state) {
    writeState(file, { lastCheckedAt: now.toISOString() });
    return [];
  }

  const since = new Date(state.lastCheckedAt);
  const deals = await listAll('crm.deal.list', {
    filter: { CATEGORY_ID, STAGE_ID: stageId },
    select: ['ID', 'TITLE', 'ASSIGNED_BY_ID'],
  });

  const managerIds = [...new Set(deals.map((d) => d.ASSIGNED_BY_ID))];
  const managerNames = await userNames(managerIds);

  const results = [];
  for (const deal of deals) {
    const enteredAt = await stageEnteredAt(deal.ID, stageId);
    if (enteredAt && enteredAt > since) {
      results.push({
        dealId: deal.ID,
        title: deal.TITLE,
        manager: managerNames[deal.ASSIGNED_BY_ID] || deal.ASSIGNED_BY_ID,
        enteredAt,
      });
    }
  }

  writeState(file, { lastCheckedAt: now.toISOString() });
  return results;
}

const getNewMeasurements = () => getNewDeals('measurement');
const getNewRepairs = () => getNewDeals('repair');

module.exports = { getNewMeasurements, getNewRepairs };
