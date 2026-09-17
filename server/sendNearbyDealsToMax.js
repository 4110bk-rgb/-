const { bot } = require('./maxClient');
const { getNearbyDealGroupsByRadius } = require('./nearbyDeals');

function formatGroup(group, index) {
  const lines = [`Группа ${index + 1} (в радиусе ~${group.maxSpreadKm} км):`];
  for (const d of group.deals) {
    lines.push(`  [${d.kind}] «${d.title}» — ${d.manager}`);
    lines.push(`  ${d.address.text}`);
    lines.push(`  [Карта](${d.address.mapUrl}) · [Сделка](${d.url})`);
  }
  return lines.join('\n');
}

function formatRadiusSection(radiusKm, groups) {
  if (!groups.length) return `До ${radiusKm} км: подходящих групп сейчас нет.`;

  const lines = [`До ${radiusKm} км — ${groups.length} групп(ы):`, ''];
  groups.forEach((g, i) => lines.push(formatGroup(g, i), ''));
  return lines.join('\n').trim();
}

function formatNearbyDeals(byRadius) {
  const sections = byRadius.map(({ radiusKm, groups }) => formatRadiusSection(radiusKm, groups));
  return ['Можно объединить поездки:', '', ...sections.map((s) => s + '\n')].join('\n').trim();
}

async function sendNearbyDealsToMax({ chatId }) {
  const byRadius = await getNearbyDealGroupsByRadius();
  const text = formatNearbyDeals(byRadius);
  return bot.api.sendMessageToChat(chatId, text, { format: 'markdown' });
}

module.exports = { sendNearbyDealsToMax, formatNearbyDeals };
