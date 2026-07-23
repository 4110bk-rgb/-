const fs = require('fs');
const os = require('os');
const path = require('path');
const PDFDocument = require('pdfkit');
const { getCounterStats } = require('./yandexMetrikaClient');
const { countersForCompany } = require('./metrikaCounters');

const INK = '#0b0b0b';
const SECONDARY = '#52514e';
const MUTED = '#898781';
const GRIDLINE = '#e1e0d9';
const PAGE_MARGIN = 40;

async function getMonthToDateStats(company) {
  const counters = countersForCompany(company);
  const firstOfMonth = new Date();
  firstOfMonth.setUTCDate(1);
  const days = Math.ceil((Date.now() - firstOfMonth.getTime()) / 86400000) + 1;

  let visits = 0;
  let users = 0;
  let conversions = 0;
  for (const c of counters) {
    const stats = await getCounterStats(c.id, days);
    visits += stats.visits;
    users += stats.users;
    conversions += stats.conversions;
  }
  return { visits, users, conversions };
}

async function generateLeadsCostPdf() {
  const now = new Date();
  const monthLabel = now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

  const [technoline, bergservice] = await Promise.all([
    getMonthToDateStats('Technoline'),
    getMonthToDateStats('Bergservice'),
  ]);

  const outPath = path.join(os.tmpdir(), `leads-cost-report-${Date.now()}.pdf`);
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const fontsDir = path.join(__dirname, '..', 'fonts');
  doc.registerFont('body', path.join(fontsDir, 'DejaVuSans.ttf'));
  doc.registerFont('bold', path.join(fontsDir, 'DejaVuSans-Bold.ttf'));
  doc.font('body');

  doc.font('bold').fontSize(18).fillColor(INK).text(`Заявки с сайта — ${monthLabel}`);
  doc.font('body').fillColor(MUTED).fontSize(10).text(`Сформирован: ${now.toLocaleString('ru-RU')}`);
  doc.moveDown(1);

  doc.fillColor(SECONDARY).fontSize(10).text(
    'Стоимость рекламы (Яндекс.Директ) пока недоступна — приложению не подтверждён доступ к API ' +
      'в интерфейсе direct.yandex.ru. Ниже — только визиты и заявки/звонки с сайта (Яндекс.Метрика).',
    { width: doc.page.width - PAGE_MARGIN * 2 },
  );
  doc.moveDown(1);

  const rows = [
    ['Technoline', technoline],
    ['Bergservice', bergservice],
  ];

  for (const [company, stats] of rows) {
    doc.font('bold').fillColor(INK).fontSize(13).text(company);
    doc.font('body').fillColor(SECONDARY).fontSize(10);
    doc.text(`Визитов: ${stats.visits.toLocaleString('ru-RU')}`);
    doc.text(`Уникальных посетителей: ${stats.users.toLocaleString('ru-RU')}`);
    doc.text(`Заявок/звонков (конверсий): ${stats.conversions.toLocaleString('ru-RU')}`);
    const convRate = stats.visits ? Math.round((stats.conversions / stats.visits) * 1000) / 10 : 0;
    doc.text(`Конверсия визит → заявка: ${convRate}%`);
    doc.text('Стоимость заявки: — (ожидает подтверждения доступа к Директу)');
    doc.moveDown(0.8);
    doc.moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y).strokeColor(GRIDLINE).stroke();
    doc.moveDown(0.8);
  }

  const totalConversions = technoline.conversions + bergservice.conversions;
  doc.font('bold').fillColor(INK).fontSize(12).text(`Итого заявок по обеим компаниям: ${totalConversions}`);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return outPath;
}

module.exports = { generateLeadsCostPdf };

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  generateLeadsCostPdf()
    .then((p) => console.log('Generated:', p))
    .catch((err) => {
      console.error('Failed:', err.message);
      process.exit(1);
    });
}
