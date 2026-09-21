const { bot } = require('./maxClient');
const { getNearbyDealGroupsByRadius } = require('./nearbyDeals');
const { formatDeal } = require('./stageWaitFormat');

const KIND_EMOJI = { замер: '📏', ремонт: '🔧' };
const WAIT_LABEL = { замер: 'Ждёт замера', ремонт: 'Ждёт ремонта' };

// Same card as the "Актуальные замеры/ремонты" report (traffic-light,
// address, phone, date status), just prefixed with the deal's kind since a
// group here can mix замеры and ремонты.
function formatGroupDeal(d) {
  const block = formatDeal(d, WAIT_LABEL[d.kind] || 'Ждёт');
  const [firstLine, ...rest] = block.split('\n');
  return [`${KIND_EMOJI[d.kind] || ''}  ${firstLine}`, ...rest].join('\n');
}

function formatGroup(group, index) {
  const lines = [`Группа ${index + 1} (в радиусе ~${group.maxSpreadKm} км):`, ''];
  for (const d of group.deals) {
    lines.push(formatGroupDeal(d), '');
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
