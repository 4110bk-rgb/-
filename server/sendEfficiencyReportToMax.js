const { bot } = require('./maxClient');
const { getManagerEfficiencyReport } = require('./reports');

function formatEfficiencyReport(data) {
  const lines = [`Эффективность менеджеров за ${data.days} дн.`];

  let currentCompany = null;
  for (const m of data.byManager) {
    if (m.company !== currentCompany) {
      currentCompany = m.company;
      lines.push('', `${currentCompany}:`);
    }

    lines.push(
      `  ${m.name}`,
      `    Лидов: ${m.leadsTotal}, целевых: ${m.leadsQualified} (${m.leadQualifiedRate}%), конверсия: ${m.leadConversionRate}%`,
      `    Сделок: ${m.dealsTotal}, побед: ${m.dealsWon}/${m.dealsLost} (${m.dealWinRate}%), сумма: ${m.wonSum.toLocaleString('ru-RU')}`,
      `    Звонков: ${m.callsTotal}, пропущено: ${m.missedCallRate}%`,
    );
  }

  return lines.join('\n');
}

async function sendEfficiencyReportToMax({ chatId, days }) {
  const data = await getManagerEfficiencyReport(days);
  const text = formatEfficiencyReport(data);
  return bot.api.sendMessageToChat(chatId, text);
}

module.exports = { sendEfficiencyReportToMax };
