const fs = require('fs');
const os = require('os');
const path = require('path');

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

const PDFDocument = require('pdfkit');
const { getCallTrackingReport } = require('./callTrackingReport');

const INK = '#0b0b0b';
const SECONDARY = '#52514e';
const MUTED = '#898781';
const GRIDLINE = '#e1e0d9';
const PAGE_MARGIN = 40;

function pct(part, total) {
  return total ? Math.round((part / total) * 1000) / 10 : 0;
}

async function generateCallTrackingPdf(days) {
  const report = await getCallTrackingReport(days);
  const now = new Date();

  const outPath = path.join(os.tmpdir(), `call-tracking-report-${Date.now()}.pdf`);
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const fontsDir = path.join(__dirname, '..', 'fonts');
  doc.registerFont('body', path.join(fontsDir, 'DejaVuSans.ttf'));
  doc.registerFont('bold', path.join(fontsDir, 'DejaVuSans-Bold.ttf'));
  doc.font('body');

  doc.font('bold').fontSize(18).fillColor(INK).text(`Коллтрекинг за ${days} дн.`);
  doc.font('body').fillColor(MUTED).fontSize(10).text(`Сформирован: ${now.toLocaleString('ru-RU')}`);
  doc.moveDown(1);

  doc.fillColor(SECONDARY).fontSize(10).text(
    'Источник данных — номер, на который позвонил клиент (сохраняется в Bitrix24 при создании лида ' +
      'со звонка). Разбивка по компаниям основана на том, где физически указан каждый номер ' +
      '(vorota2.ru — Technoline; остальные два — Bergservice). Звонки через мобильное приложение ' +
      '"Мои Звонки" не привязаны к конкретному номеру и не относятся ни к одной компании.',
    { width: doc.page.width - PAGE_MARGIN * 2 },
  );
  doc.moveDown(1);

  doc.font('bold').fillColor(INK).fontSize(13).text('По компаниям');
  doc.font('body');
  doc.moveDown(0.4);
  for (const c of report.byCompany) {
    doc.font('bold').fillColor(INK).fontSize(11).text(c.company);
    doc.font('body').fillColor(SECONDARY).fontSize(10);
    doc.text(
      `Звонков: ${c.total} · В лид (конвертировано): ${c.converted} (${pct(c.converted, c.total)}%) · ` +
        `Треш/спам: ${c.junk} (${pct(c.junk, c.total)}%)`,
    );
    doc.moveDown(0.5);
  }
  doc.moveDown(0.4);
  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y).strokeColor(GRIDLINE).stroke();
  doc.moveDown(0.8);

  doc.font('bold').fillColor(INK).fontSize(13).text('По номерам');
  doc.font('body');
  doc.moveDown(0.4);
  for (const n of report.byNumber) {
    doc.fillColor(SECONDARY).fontSize(10).text(
      `${n.number} (${n.company}) — звонков: ${n.total}, конвертировано: ${n.converted} (${pct(n.converted, n.total)}%), треш: ${n.junk}`,
    );
    doc.moveDown(0.3);
  }

  doc.moveDown(0.6);
  doc.fillColor(MUTED).fontSize(9).text(
    `Итого звонков за период: ${report.totalCalls}, из них не привязано к номеру: ${report.unattributed}.`,
    { width: doc.page.width - PAGE_MARGIN * 2 },
  );

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return outPath;
}

module.exports = { generateCallTrackingPdf };

if (require.main === module) {
  const days = Number(process.argv[2]) || 30;
  generateCallTrackingPdf(days)
    .then((p) => console.log('Generated:', p))
    .catch((err) => {
      console.error('Failed:', err.message);
      process.exit(1);
    });
}
