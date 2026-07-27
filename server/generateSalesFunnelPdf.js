const fs = require('fs');
const os = require('os');
const path = require('path');

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

const PDFDocument = require('pdfkit');
const { getManagerEfficiencyReport } = require('./reports');

const INK = '#0b0b0b';
const SECONDARY = '#52514e';
const MUTED = '#898781';
const GRIDLINE = '#e1e0d9';
const PAGE_MARGIN = 40;

const COLUMNS = [
  { key: 'name', label: 'Менеджер', width: 110 },
  { key: 'leadsTotal', label: 'Лидов', width: 48, align: 'right' },
  { key: 'leadQualifiedRate', label: 'Квал. %', width: 55, align: 'right' },
  { key: 'leadConversionRate', label: 'В сделку %', width: 65, align: 'right' },
  { key: 'dealsWon', label: 'Выиграно', width: 60, align: 'right' },
  { key: 'dealWinRate', label: 'Win rate %', width: 65, align: 'right' },
  { key: 'avgCheck', label: 'Ср. чек', width: 75, align: 'right' },
  { key: 'avgDealDurationDays', label: 'Ср. дн. сделки', width: 80, align: 'right' },
];

function formatCell(key, value) {
  if (key === 'avgCheck') return value ? `${value.toLocaleString('ru-RU')} ₽` : '—';
  if (key === 'avgDealDurationDays') return value ? `${value} дн.` : '—';
  if (key.endsWith('Rate') || key.includes('Rate')) return `${value}%`;
  return String(value);
}

function ensureSpace(doc, needed) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
}

function drawTableHeader(doc, x) {
  doc.x = x;
  const y = doc.y;
  doc.font('bold').fontSize(8.5).fillColor(MUTED);
  let cx = x;
  for (const col of COLUMNS) {
    doc.text(col.label.toUpperCase(), cx, y, { width: col.width, align: col.align || 'left', lineBreak: false });
    cx += col.width;
  }
  doc.moveDown(0.6);
  doc.x = x;
  doc.moveTo(x, doc.y).lineTo(x + COLUMNS.reduce((s, c) => s + c.width, 0), doc.y).strokeColor(GRIDLINE).stroke();
  doc.moveDown(0.4);
}

function drawTableRow(doc, x, manager) {
  ensureSpace(doc, 20);
  doc.x = x;
  const y = doc.y;
  doc.font('body').fontSize(9).fillColor(SECONDARY);
  let cx = x;
  for (const col of COLUMNS) {
    const value = formatCell(col.key, manager[col.key]);
    doc.text(value, cx, y, { width: col.width, align: col.align || 'left', lineBreak: false });
    cx += col.width;
  }
  doc.moveDown(0.55);
  doc.x = x;
}

async function generateSalesFunnelPdf(days) {
  const report = await getManagerEfficiencyReport(days);

  const outPath = path.join(os.tmpdir(), `sales-funnel-report-${Date.now()}.pdf`);
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, layout: 'landscape' });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const fontsDir = path.join(__dirname, '..', 'fonts');
  doc.registerFont('body', path.join(fontsDir, 'DejaVuSans.ttf'));
  doc.registerFont('bold', path.join(fontsDir, 'DejaVuSans-Bold.ttf'));
  doc.font('body');

  doc.font('bold').fontSize(18).fillColor(INK).text(`Воронка продаж по менеджерам за ${days} дн.`);
  doc.font('body').fillColor(MUTED).fontSize(10).text(`Сформирован: ${new Date().toLocaleString('ru-RU')}`);
  doc.moveDown(1);

  let currentCompany = null;
  for (const m of report.byManager) {
    if (m.company !== currentCompany) {
      currentCompany = m.company;
      ensureSpace(doc, 60);
      doc.x = PAGE_MARGIN;
      doc.font('bold').fillColor(INK).fontSize(13).text(currentCompany);
      doc.moveDown(0.4);
      drawTableHeader(doc, PAGE_MARGIN);
    }
    drawTableRow(doc, PAGE_MARGIN, m);
  }

  doc.moveDown(0.8);
  doc.x = PAGE_MARGIN;
  doc.fillColor(MUTED).fontSize(8.5).text(
    'Ср. чек и ср. длительность сделки считаются только по выигранным сделкам с заполненной датой закрытия. ' +
      'Квал. % и В сделку % — от количества лидов менеджера; Win rate — от закрытых сделок (выиграно + проиграно).',
    { width: doc.page.width - PAGE_MARGIN * 2 },
  );

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return outPath;
}

module.exports = { generateSalesFunnelPdf };

if (require.main === module) {
  const days = Number(process.argv[2]) || Number(process.env.REPORT_DAYS) || 30;
  generateSalesFunnelPdf(days)
    .then((p) => console.log('Generated:', p))
    .catch((err) => {
      console.error('Failed:', err.message);
      process.exit(1);
    });
}
