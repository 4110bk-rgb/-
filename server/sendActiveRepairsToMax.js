const { bot } = require('./maxClient');
const { getActiveRepairs } = require('./activeRepairs');
const { formatStageWaitReport, chunkStageWaitReport } = require('./stageWaitFormat');

const LABELS = {
  listLabel: 'Актуальные ремонты',
  waitLabel: 'Ждёт ремонта',
  emptyText: 'Сделок на стадии «Ждёт ремонт» сейчас нет.',
};

function formatActiveRepairs(repairs) {
  return formatStageWaitReport(repairs, LABELS);
}

async function sendActiveRepairsToMax({ chatId }) {
  const repairs = await getActiveRepairs();
  const chunks = chunkStageWaitReport(repairs, LABELS);

  let lastMessage;
  for (const chunk of chunks) {
    lastMessage = await bot.api.sendMessageToChat(chatId, chunk, { format: 'markdown' });
  }
  return lastMessage;
}

module.exports = { sendActiveRepairsToMax, formatActiveRepairs };
