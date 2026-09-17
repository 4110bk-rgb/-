const { bot } = require('./maxClient');
const { getNewlyCompletedMeasurements } = require('./measurementCompletedCheck');
const { dealUrl } = require('./stageWaitReport');
const { mentionManager } = require('./managerMaxIds');

function formatCompleted(list) {
  if (!list.length) return null;

  const lines = [`✅ Замер оформлен (${list.length}):`, ''];
  for (const d of list) {
    lines.push(`«${d.title}» — ${dealUrl(d.dealId)}`);
    lines.push(`  Менеджер: ${mentionManager(d.manager)}`);
    lines.push('  Замерщик подготовил замер — можно связываться с клиентом и готовить КП/договор.');
    lines.push('');
  }
  return lines.join('\n').trim();
}

// Sends to every chat in `chatIds` — the @mention only actually pings the
// manager in a chat they're a member of, so this is meant to target the
// team chats (ТЛ+Берг, ТЛ | Общий чат), not the private test chat.
async function sendMeasurementCompletedToMax({ chatIds }) {
  const list = await getNewlyCompletedMeasurements();
  const text = formatCompleted(list);
  if (!text) {
    console.log('measurementCompleted: nothing new');
    return { sent: false };
  }

  for (const chatId of chatIds) {
    await bot.api.sendMessageToChat(chatId, text, { format: 'markdown' });
  }
  return { sent: true, count: list.length };
}

module.exports = { sendMeasurementCompletedToMax, formatCompleted };
