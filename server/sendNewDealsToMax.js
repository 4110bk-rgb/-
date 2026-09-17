const { bot } = require('./maxClient');
const { getNewMeasurements, getNewRepairs } = require('./newDealsCheck');
const { dealUrl } = require('./stageWaitReport');
const { mentionManager } = require('./managerMaxIds');

function formatList(list, label, emoji) {
  if (!list.length) return null;

  const header = list.length > 1 ? `Появились новые ${label}ы` : `Появился новый ${label}`;
  const lines = [`${emoji} ${header} (${list.length}):`, ''];
  for (const d of list) {
    lines.push(`«${d.title}» — ${dealUrl(d.dealId)}`);
    lines.push(`  Менеджер: ${mentionManager(d.manager)}`);
    lines.push('');
  }
  return lines.join('\n').trim();
}

// Sends to every chat in `chatIds`, same as sendMeasurementCompletedToMax —
// the @mention only pings someone in a chat they're a member of.
async function sendNewDealsToMax({ chatIds }) {
  const [newMeasurements, newRepairs] = await Promise.all([getNewMeasurements(), getNewRepairs()]);
  const texts = [formatList(newMeasurements, 'замер', '📏'), formatList(newRepairs, 'ремонт', '🔧')].filter(Boolean);

  if (!texts.length) {
    console.log('newDeals: nothing new');
    return { sent: false };
  }

  for (const chatId of chatIds) {
    for (const text of texts) {
      await bot.api.sendMessageToChat(chatId, text, { format: 'markdown' });
    }
  }
  return { sent: true, measurementsCount: newMeasurements.length, repairsCount: newRepairs.length };
}

module.exports = { sendNewDealsToMax, formatList };
