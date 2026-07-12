const fs = require('fs');
const { bot } = require('./maxClient');
const { generateEfficiencyPdf } = require('./generateEfficiencyPdf');

async function sendEfficiencyPdfToMax({ chatId, days }) {
  const pdfPath = await generateEfficiencyPdf(days);
  try {
    const file = await bot.api.uploadFile({ source: pdfPath });
    return await bot.api.sendMessageToChat(chatId, `Эффективность менеджеров за ${days} дн. — воронка по каждому и точки роста.`, {
      attachments: [file.toJson()],
    });
  } finally {
    fs.unlink(pdfPath, () => {});
  }
}

module.exports = { sendEfficiencyPdfToMax };
