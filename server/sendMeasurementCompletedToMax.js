const { bot } = require('./maxClient');
const { getNewlyCompletedMeasurements } = require('./measurementCompletedCheck');
const { dealUrl } = require('./stageWaitReport');

function formatCompleted(list) {
  if (!list.length) return null;

  const lines = [`✅ Замер оформлен (${list.length}):`, ''];
  for (const d of list) {
    lines.push(`«${d.title}» — ${dealUrl(d.dealId)}`);
    lines.push(`  Менеджер: ${d.manager}`);
    lines.push('  Замерщик подготовил замер — можно связываться с клиентом и готовить КП/договор.');
    lines.push('');
  }
  return lines.join('\n').trim();
}

async function sendMeasurementCompletedToMax({ chatId }) {
  const list = await getNewlyCompletedMeasurements();
  const text = formatCompleted(list);
  if (!text) {
    console.log('measurementCompleted: nothing new');
    return { sent: false };
  }

  await bot.api.sendMessageToChat(chatId, text, { format: 'markdown' });
  return { sent: true, count: list.length };
}

module.exports = { sendMeasurementCompletedToMax, formatCompleted };
