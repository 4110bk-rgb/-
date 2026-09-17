const { bot } = require('./maxClient');
const { getActiveMeasurements } = require('./activeMeasurements');
const { formatStageWaitReport, chunkStageWaitReport } = require('./stageWaitFormat');

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

  let lastMessage;
  for (const chunk of chunks) {
    lastMessage = await bot.api.sendMessageToChat(chatId, chunk, { format: 'markdown' });
  }
  return lastMessage;
}

module.exports = { sendActiveMeasurementsToMax, formatActiveMeasurements };
