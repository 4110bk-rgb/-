const ExcelJS = require('exceljs');

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A78D6' } };
const HEADER_FONT = { color: { argb: 'FFFFFFFF' }, bold: true };

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });
}

function addSummarySheet(workbook, { deals, leads, calls, days }) {
  const sheet = workbook.addWorksheet('Сводка');
  sheet.columns = [{ width: 32 }, { width: 20 }];

  sheet.addRow([`Отчёт Bitrix24 за последние ${days} дн.`]).font = { bold: true, size: 14 };
  sheet.addRow([`Сформирован: ${new Date().toLocaleString('ru-RU')}`]);
  sheet.addRow([]);

  const section = (title, rows) => {
    const titleRow = sheet.addRow([title]);
    titleRow.font = { bold: true };
    for (const [label, value] of rows) sheet.addRow([label, value]);
    sheet.addRow([]);
  };

  if (deals.ok) {
    section('Сделки', [
      ['Всего сделок', deals.data.total],
      ['Сумма', `${deals.data.totalSum} ${deals.data.currency || ''}`],
      ['Выиграно', deals.data.wonCount],
      ['Проиграно', deals.data.lostCount],
    ]);
  } else {
    section('Сделки', [['Ошибка', deals.error]]);
  }

  if (leads.ok) {
    section('Лиды', [
      ['Всего лидов', leads.data.total],
      ['Конвертировано', leads.data.converted],
      ['Конверсия', leads.data.total ? `${Math.round((leads.data.converted / leads.data.total) * 100)}%` : '—'],
    ]);
  } else {
    section('Лиды', [['Ошибка', leads.error]]);
  }

  if (calls.ok) {
    section('Звонки', [
      ['Всего звонков', calls.data.total],
      ['Пропущено', calls.data.missed],
      ['Входящие', calls.data.incoming],
      ['Исходящие', calls.data.outgoing],
      ['Средняя длительность, сек', calls.data.avgDuration],
    ]);
  } else {
    section('Звонки', [['Ошибка', calls.error]]);
  }
}

function addDealsSheet(workbook, deals) {
  if (!deals.ok) return;
  const sheet = workbook.addWorksheet('Сделки по стадиям');
  sheet.columns = [
    { header: 'Стадия', key: 'name', width: 36 },
    { header: 'Кол-во сделок', key: 'count', width: 16 },
    { header: 'Сумма', key: 'sum', width: 16 },
  ];
  styleHeaderRow(sheet.getRow(1));
  for (const s of deals.data.byStage) sheet.addRow({ name: s.name, count: s.count, sum: s.sum });
}

function addLeadsSheet(workbook, leads) {
  if (!leads.ok) return;
  const sheet = workbook.addWorksheet('Лиды');
  sheet.columns = [
    { header: 'Статус', key: 'status', width: 28 },
    { header: 'Кол-во', key: 'statusCount', width: 12 },
    { header: '', key: 'gap', width: 4 },
    { header: 'Источник', key: 'source', width: 28 },
    { header: 'Кол-во', key: 'sourceCount', width: 12 },
  ];
  styleHeaderRow(sheet.getRow(1));

  const rows = Math.max(leads.data.byStatus.length, leads.data.bySource.length);
  for (let i = 0; i < rows; i++) {
    const st = leads.data.byStatus[i];
    const src = leads.data.bySource[i];
    sheet.addRow({
      status: st?.name || '',
      statusCount: st?.count ?? '',
      source: src?.name || '',
      sourceCount: src?.count ?? '',
    });
  }
}

function addCallsSheet(workbook, calls) {
  if (!calls.ok) return;
  const sheet = workbook.addWorksheet('Звонки по дням');
  sheet.columns = [
    { header: 'Дата', key: 'day', width: 14 },
    { header: 'Кол-во звонков', key: 'count', width: 16 },
  ];
  styleHeaderRow(sheet.getRow(1));
  for (const d of calls.data.byDay) sheet.addRow({ day: d.day, count: d.count });
}

async function buildWorkbook({ deals, leads, calls, days }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Bitrix24 Reports Dashboard';
  workbook.created = new Date();

  addSummarySheet(workbook, { deals, leads, calls, days });
  addDealsSheet(workbook, deals);
  addLeadsSheet(workbook, leads);
  addCallsSheet(workbook, calls);

  return workbook;
}

module.exports = { buildWorkbook };
