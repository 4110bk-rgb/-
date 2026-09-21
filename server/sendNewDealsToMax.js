const { getNewMeasurements, getNewRepairs } = require('./newDealsCheck');
const { getActiveMeasurements } = require('./activeMeasurements');
const { getActiveRepairs } = require('./activeRepairs');
const { chunkStageWaitReport } = require('./stageWaitFormat');
const { sendChunked } = require('./maxChunkedSend');

const LABELS = {
  measurement: { listLabel: 'Новые замеры', waitLabel: 'Ждёт замера', emptyText: '' },
  repair: { listLabel: 'Новые ремонты', waitLabel: 'Ждёт ремонта', emptyText: '' },
};

// Cross-references the watermark-detected "new since last check" deal IDs
// against the full active-measurements/repairs data (address, phone, wait
// time, date status, etc.) so the "new" announcement carries the same
// amount of detail as the "Актуальные замеры/ремонты" report, not just a
// bare title and link.
async function buildNewDealChunks(getNewIds, getFullList, labels) {
  const newDeals = await getNewIds();
  if (!newDeals.length) return { chunks: [], count: 0 };

  const newIds = new Set(newDeals.map((d) => d.dealId));
  const fullList = await getFullList();
  const enriched = fullList.filter((d) => newIds.has(d.dealId));

  return { chunks: chunkStageWaitReport(enriched, labels), count: enriched.length };
}

// Sends to every chat in `chatIds` — the @mention only pings someone in a
// chat they're a member of.
async function sendNewDealsToMax({ chatIds }) {
  const [measurements, repairs] = await Promise.all([
    buildNewDealChunks(getNewMeasurements, getActiveMeasurements, LABELS.measurement),
    buildNewDealChunks(getNewRepairs, getActiveRepairs, LABELS.repair),
  ]);

  const allChunks = [...measurements.chunks, ...repairs.chunks];
  if (!allChunks.length) {
    console.log('newDeals: nothing new');
    return { sent: false };
  }

  for (const chatId of chatIds) {
    await sendChunked(chatId, allChunks, { format: 'markdown' });
  }
  return { sent: true, measurementsCount: measurements.count, repairsCount: repairs.count };
}

module.exports = { sendNewDealsToMax, buildNewDealChunks };
