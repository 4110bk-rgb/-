const { getActiveMeasurements } = require('./activeMeasurements');
const { formatStageWaitReport, chunkStageWaitReport } = require('./stageWaitFormat');
const { sendChunked } = require('./maxChunkedSend');

const LABELS = {
  listLabel: 'Актуальные замеры',
  waitLabel: 'Ждёт замера',
  emptyText: 'Сделок на стадии «Ждёт замер» сейчас нет.',
};

function formatActiveMeasurements(measurements) {
  return formatStageWaitReport(measurements, LABELS);
}

async function sendActiveMeasurementsToMax({ chatId }) {
  const measurements = await getActiveMeasurements();
  const chunks = chunkStageWaitReport(measurements, LABELS);
  return sendChunked(chatId, chunks, { format: 'markdown' });
}

module.exports = { sendActiveMeasurementsToMax, formatActiveMeasurements };
