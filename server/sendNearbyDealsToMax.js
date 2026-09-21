const { bot } = require('./maxClient');
const { getNearbyDealGroupsByRadius } = require('./nearbyDeals');

const KIND_EMOJI = { замер: '📏', ремонт: '🔧' };

function formatGroup(group, index) {
  const lines = [`Группа ${index + 1} (в радиусе ~${group.maxSpreadKm} км):`, ''];
  for (const d of group.deals) {
    lines.push(`${KIND_EMOJI[d.kind] || ''} «${d.title}» — ${d.manager}`);
    lines.push(`  ${d.address.text}`);
    lines.push(`  [Карта](${d.address.mapUrl}) · [Сделка](${d.url})`);
    lines.push('');
  }
  return lines.join('\n').trim();
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

// kinds restricts the grouping to just measurements (['замер']), just
// repairs (['ремонт']), or (default, when omitted) both.
async function sendNearbyDealsToMax({ chatId, kinds }) {
  const byRadius = await getNearbyDealGroupsByRadius(undefined, kinds);
  const text = formatNearbyDeals(byRadius);
  return bot.api.sendMessageToChat(chatId, text, { format: 'markdown' });
}

module.exports = { sendNearbyDealsToMax, formatNearbyDeals };
