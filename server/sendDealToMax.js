const { bot } = require('./maxClient');
const { getDealAttachments } = require('./dealAttachments');

function formatMessage(data) {
  const lines = [`Сделка #${data.dealId}`];

  for (const comment of data.comments) {
    if (!comment.text && !comment.photos.length && !comment.files.length) continue;

    const date = new Date(comment.created).toLocaleString('ru-RU');
    lines.push('', `${comment.author}, ${date}:`, comment.text || '(без текста)');

    for (const file of comment.files) lines.push(`📎 ${file.name}: ${file.url}`);
  }

  return lines.join('\n');
}

// Fetches a deal's timeline comments/photos from Bitrix24 and forwards them
// as one MAX message: photos go up as image attachments (uploaded straight
// from their Bitrix24 disk URL), everything else stays as text.
async function sendDealToMax({ chatId, dealId }) {
  const data = await getDealAttachments(dealId);
  const text = formatMessage(data);

  const attachments = [];
  for (const photo of data.photos) {
    const image = await bot.api.uploadImage({ url: photo.url });
    attachments.push(image.toJson());
  }

  return bot.api.sendMessageToChat(chatId, text, attachments.length ? { attachments } : undefined);
}

module.exports = { sendDealToMax };
