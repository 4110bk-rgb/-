const { getActiveRepairs } = require('./activeRepairs');
const { formatStageWaitReport, chunkStageWaitReport } = require('./stageWaitFormat');
const { sendChunked } = require('./maxChunkedSend');

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
  return sendChunked(chatId, chunks, { format: 'markdown' });
}

module.exports = { sendActiveRepairsToMax, formatActiveRepairs };
