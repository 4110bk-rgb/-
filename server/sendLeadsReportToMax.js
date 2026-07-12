const { bot } = require('./maxClient');
const { getLeadsReport } = require('./reports');

function formatLeadsReport(data) {
  const lines = [
    `Отчёт по лидам за ${data.days} дн.`,
    '',
    `Всего лидов: ${data.total}`,
    `Квалифицированы (целевые): ${data.qualified}`,
    `Не целевые: ${data.junk}`,
    `Конвертированы в сделку: ${data.converted}`,
  ];

  for (const company of data.byCompany) {
    lines.push('', `${company.company} — ${company.count} лидов`);
    for (const m of data.byManager.filter((mgr) => mgr.company === company.company)) {
      lines.push(`  ${m.name}: ${m.count}`);
    }
  }

  return lines.join('\n');
}

async function sendLeadsReportToMax({ chatId, days }) {
  const data = await getLeadsReport(days);
  const text = formatLeadsReport(data);
  return bot.api.sendMessageToChat(chatId, text);
}

module.exports = { sendLeadsReportToMax };
