const fs = require('fs');
const os = require('os');
const path = require('path');
const PDFDocument = require('pdfkit');
const { getManagerEfficiencyReport } = require('./reports');
const { buildManagerAnalytics } = require('./managerAnalytics');

// Ordinal one-hue ramp (light -> dark = top of funnel -> bottom), per the
// dataviz palette: funnel stages are an ordered sequence, so color encodes
// that order rather than four unrelated categories.
const FUNNEL_STEPS = [
  { hex: '#86b6ef', textColor: '#0b0b0b' }, // step 250 - Лиды
  { hex: '#5598e7', textColor: '#ffffff' }, // step 350 - Целевые
  { hex: '#2a78d6', textColor: '#ffffff' }, // step 450 - Конвертировано
  { hex: '#184f95', textColor: '#ffffff' }, // step 600 - Выиграно
];

const INK = '#0b0b0b';
const SECONDARY = '#52514e';
const MUTED = '#898781';
const GRIDLINE = '#e1e0d9';

const PAGE_MARGIN = 40;
const FUNNEL_STAGE_LABELS = ['Лиды', 'Целевые', 'Конвертировано', 'Выиграно'];

function drawFunnel(doc, x, y, width, stages) {
  const barHeight = 14;
  const gap = 6;
  const max = Math.max(1, ...stages);

  stages.forEach((value, i) => {
    const barY = y + i * (barHeight + gap);
    const barWidth = Math.max(6, (value / max) * width);
    const { hex, textColor } = FUNNEL_STEPS[i];

    doc.roundedRect(x, barY, barWidth, barHeight, 4).fill(hex);

    const prev = i === 0 ? null : stages[i - 1];
    const rate = prev ? (prev ? Math.round((value / prev) * 1000) / 10 : 0) : null;
    const label = `${FUNNEL_STAGE_LABELS[i]}: ${value}${rate !== null ? ` (${rate}%)` : ''}`;

    // Value fits on the bar when it's wide enough; otherwise place it just after the bar end.
    doc.font('body').fontSize(9);
    const labelWidth = doc.widthOfString(label);
    if (labelWidth + 12 <= barWidth) {
      doc.fillColor(textColor).text(label, x + 6, barY + 3, { width: barWidth - 12, lineBreak: false });
    } else {
      doc.fillColor(SECONDARY).text(label, x + barWidth + 8, barY + 3, { lineBreak: false });
    }
  });

  return y + stages.length * (barHeight + gap);
}

function ensureSpace(doc, needed) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) doc.addPage();
}

async function generateEfficiencyPdf(days) {
  const report = await getManagerEfficiencyReport(days);
  const analytics = buildManagerAnalytics(report.byManager);

  const outPath = path.join(os.tmpdir(), `efficiency-report-${Date.now()}.pdf`);
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  // Default Helvetica has no Cyrillic glyphs, so register a font that does.
  const fontsDir = path.join(__dirname, '..', 'fonts');
  doc.registerFont('body', path.join(fontsDir, 'DejaVuSans.ttf'));
  doc.registerFont('bold', path.join(fontsDir, 'DejaVuSans-Bold.ttf'));
  doc.font('body');

  doc.font('bold').fontSize(18).fillColor(INK).text(`Эффективность менеджеров за ${days} дн.`, { align: 'left' });
  doc.font('body');
  doc.fillColor(MUTED).fontSize(10).text(`Сформирован: ${new Date().toLocaleString('ru-RU')}`);
  doc.moveDown(1);

  doc.font('bold').fillColor(INK).fontSize(13).text('Аналитика');
  doc.font('body');
  doc.moveDown(0.3);
  doc.fillColor(SECONDARY).fontSize(10);
  for (const line of analytics.summary) doc.text(line, { width: doc.page.width - PAGE_MARGIN * 2 });
  doc.moveDown(0.8);

  doc.font('bold').fillColor(INK).fontSize(13).text('Точки роста');
  doc.font('body');
  doc.moveDown(0.3);
  doc.fillColor(SECONDARY).fontSize(10);
  analytics.growthPoints.forEach((point, i) => {
    doc.text(`${i + 1}. ${point}`, { width: doc.page.width - PAGE_MARGIN * 2 });
    doc.moveDown(0.3);
  });
  doc.moveDown(0.6);

  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(doc.page.width - PAGE_MARGIN, doc.y).strokeColor(GRIDLINE).stroke();
  doc.moveDown(0.8);

  let currentCompany = null;
  const funnelWidth = doc.page.width - PAGE_MARGIN * 2 - 20;

  for (const m of report.byManager) {
    ensureSpace(doc, 100);
    doc.x = PAGE_MARGIN;

    if (m.company !== currentCompany) {
      currentCompany = m.company;
      ensureSpace(doc, 30);
      doc.x = PAGE_MARGIN;
      doc.font('bold').fillColor(INK).fontSize(13).text(currentCompany);
      doc.font('body');
      doc.moveDown(0.4);
      doc.x = PAGE_MARGIN;
    }

    doc.font('bold').fillColor(INK).fontSize(11).text(m.name);
    doc.font('body');
    doc.x = PAGE_MARGIN;
    doc.fillColor(MUTED).fontSize(9).text(
      `Сделок: ${m.dealsTotal} (побед ${m.dealsWon}, проигрышей ${m.dealsLost}, ${m.dealWinRate}%) · ` +
        `сумма: ${m.wonSum.toLocaleString('ru-RU')} · звонков: ${m.callsTotal} (пропущено ${m.missedCallRate}%)`,
    );
    doc.moveDown(0.4);

    const funnelY = drawFunnel(doc, PAGE_MARGIN, doc.y, funnelWidth, [
      m.leadsTotal,
      m.leadsQualified,
      m.leadsConverted,
      m.dealsWon,
    ]);
    doc.y = funnelY;
    doc.moveDown(0.8);
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return outPath;
}

module.exports = { generateEfficiencyPdf };
