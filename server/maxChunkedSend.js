const { bot } = require('./maxClient');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Sends a report's message chunks one after another with a short pause
// between them — sending back-to-back sometimes let the MAX app render the
// continuation before the first part, since nothing about the request
// itself pins their display order.
async function sendChunked(chatId, chunks, extra = {}, delayMs = 1500) {
  let lastMessage;
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await sleep(delayMs);
    lastMessage = await bot.api.sendMessageToChat(chatId, chunks[i], extra);
  }
  return lastMessage;
}

module.exports = { sendChunked };
