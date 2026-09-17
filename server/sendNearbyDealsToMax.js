const { bot } = require('./maxClient');
const { getNearbyDealGroups } = require('./nearbyDeals');

function formatGroup(group, index) {
  const lines = [`Группа ${index + 1} (в радиусе ~${group.maxSpreadKm} км):`];
  for (const d of group.deals) {
    lines.push(`  [${d.kind}] «${d.title}» — ${d.manager}`);
    lines.push(`  ${d.address.text}`);
    lines.push(`  [Карта](${d.address.mapUrl}) · [Сделка](${d.url})`);
  }
  return lines.join('\n');
}

function formatNearbyDeals(groups) {
  if (!groups.length) return 'Сделок, которые можно объединить по маршруту, сейчас нет.';

  const lines = [`Можно объединить поездки — ${groups.length} групп(ы) рядом расположенных адресов:`, ''];
  groups.forEach((g, i) => lines.push(formatGroup(g, i), ''));
  return lines.join('\n').trim();
}

async function sendNearbyDealsToMax({ chatId }) {
  const groups = await getNearbyDealGroups();
  const text = formatNearbyDeals(groups);
  return bot.api.sendMessageToChat(chatId, text, { format: 'markdown' });
}

module.exports = { sendNearbyDealsToMax, formatNearbyDeals };
