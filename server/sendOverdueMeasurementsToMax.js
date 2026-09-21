const { bot } = require('./maxClient');
const { getOverdueMeasurements } = require('./overdueMeasurements');

function formatOverdueMeasurements(overdue) {
  if (!overdue.length) return 'Просроченных замеров нет — все сделки на стадии «Ждёт замер» в графике.';

  const lines = [`Просроченные замеры (${overdue.length}):`, ''];
  for (const d of overdue) {
    lines.push(
      `Сделка #${d.dealId} «${d.title}»`,
      `  Менеджер: ${d.manager}`,
      `  Замер планировался: ${d.mentionedDate} (просрочен на ${d.daysOverdue} дн.)`,
      `  Нужно передоговориться с клиентом о новой дате.`,
      '',
    );
  }
  return lines.join('\n').trim();
}

async function sendOverdueMeasurementsToMax({ chatId }) {
  const overdue = await getOverdueMeasurements();
  const text = formatOverdueMeasurements(overdue);
  return bot.api.sendMessageToChat(chatId, text);
}

module.exports = { sendOverdueMeasurementsToMax, formatOverdueMeasurements };
