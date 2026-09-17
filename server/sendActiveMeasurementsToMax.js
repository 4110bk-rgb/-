const { bot } = require('./maxClient');
const { getActiveMeasurements } = require('./activeMeasurements');
const { formatStageWaitReport } = require('./stageWaitFormat');

function formatActiveMeasurements(measurements) {
  return formatStageWaitReport(measurements, {
    listLabel: 'Актуальные замеры',
    waitLabel: 'Ждёт замера',
    emptyText: 'Сделок на стадии «Ждёт замер» сейчас нет.',
  });
}

async function sendActiveMeasurementsToMax({ chatId }) {
  const measurements = await getActiveMeasurements();
  const text = formatActiveMeasurements(measurements);
  return bot.api.sendMessageToChat(chatId, text);
}

module.exports = { sendActiveMeasurementsToMax, formatActiveMeasurements };
