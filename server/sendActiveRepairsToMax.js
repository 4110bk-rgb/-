const { bot } = require('./maxClient');
const { getActiveRepairs } = require('./activeRepairs');
const { formatStageWaitReport } = require('./stageWaitFormat');

function formatActiveRepairs(repairs) {
  return formatStageWaitReport(repairs, {
    listLabel: 'Актуальные ремонты',
    waitLabel: 'Ждёт ремонта',
    emptyText: 'Сделок на стадии «Ждёт ремонт» сейчас нет.',
  });
}

async function sendActiveRepairsToMax({ chatId }) {
  const repairs = await getActiveRepairs();
  const text = formatActiveRepairs(repairs);
  return bot.api.sendMessageToChat(chatId, text);
}

module.exports = { sendActiveRepairsToMax, formatActiveRepairs };
