const { bot } = require('./maxClient');
const { getActiveMeasurements } = require('./activeMeasurements');

function formatDaysRu(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${n} ${few}`;
  return `${n} ${many}`;
}

function formatDeal(d) {
  const mark = d.urgent ? '! ' : '';
  const lines = [`${mark}«${d.title}» — ${d.url}`, `  Менеджер: ${d.manager}`];

  if (d.waitingDays !== null) {
    lines.push(`  Ждёт замера: ${formatDaysRu(d.waitingDays, 'рабочий день', 'рабочих дня', 'рабочих дней')}`);
  }

  if (d.dateStatus === 'today') {
    lines.push(`  Договорились на сегодня (${d.mentionedDate})`);
  } else if (d.dateStatus === 'overdue') {
    lines.push(
      `  ⚠️ Договаривались на ${d.mentionedDate}, просрочено на ${formatDaysRu(d.daysOverdue, 'день', 'дня', 'дней')} — нужно передоговориться с клиентом`,
    );
  } else if (d.dateStatus === 'scheduled') {
    lines.push(`  Запланировано на ${d.mentionedDate}`);
  }

  return lines.join('\n');
}

function formatActiveMeasurements(measurements) {
  if (!measurements.length) return 'Сделок на стадии «Ждёт замер» сейчас нет.';

  const lines = [`Актуальные замеры (${measurements.length}):`, ''];
  for (const d of measurements) {
    lines.push(formatDeal(d), '');
  }
  return lines.join('\n').trim();
}

async function sendActiveMeasurementsToMax({ chatId }) {
  const measurements = await getActiveMeasurements();
  const text = formatActiveMeasurements(measurements);
  return bot.api.sendMessageToChat(chatId, text);
}

module.exports = { sendActiveMeasurementsToMax, formatActiveMeasurements };
