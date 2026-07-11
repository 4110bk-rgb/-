const { bot } = require('./maxClient');
const { getLeadsReport } = require('./reports');

function topRows(rows, limit) {
  return rows.slice(0, limit);
}

// Renders the same leads report shown on the dashboard as a compact text
// message for MAX: totals up top, then status/source/company breakdowns.
function formatLeadsReportMessage(report) {
  const lines = [`📊 Отчёт по лидам за ${report.days} дн.`, ''];

  lines.push(`Всего лидов: ${report.total}`);
  lines.push(`Конвертировано: ${report.converted}`);
  lines.push(`Конверсия: ${report.total ? Math.round((report.converted / report.total) * 100) : 0}%`);
  lines.push(`Не целевые: ${report.junk}`);

  if (report.byStatus.length) {
    lines.push('', 'По статусу:');
    for (const s of topRows(report.byStatus, 10)) lines.push(`  ${s.name}: ${s.count}`);
  }

  if (report.bySource.length) {
    lines.push('', 'По источнику:');
    for (const s of topRows(report.bySource, 10)) lines.push(`  ${s.name}: ${s.count}`);
  }

  if (report.byCompany.length) {
    lines.push('', 'По компании:');
    for (const c of report.byCompany) lines.push(`  ${c.company}: ${c.count}`);
  }

  return lines.join('\n');
}

async function sendLeadsReportToMax({ chatId, days }) {
  const report = await getLeadsReport(days);
  const text = formatLeadsReportMessage(report);
  return bot.api.sendMessageToChat(chatId, text);
}

module.exports = { sendLeadsReportToMax, formatLeadsReportMessage };
