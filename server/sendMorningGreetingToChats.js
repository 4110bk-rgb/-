const { bot } = require('./maxClient');
const { isWorkingDay } = require('./ruHolidays');
const { buildMorningGreeting } = require('./morningGreeting');

async function sendMorningGreetingToChats({ chatIds }) {
  if (!isWorkingDay()) {
    console.log('morningGreeting: skipped — weekend or holiday');
    return { skipped: true };
  }

  const text = await buildMorningGreeting();
  for (const chatId of chatIds) {
    await bot.api.sendMessageToChat(chatId, text, { format: 'markdown' });
  }
  console.log(`morningGreeting: sent to ${chatIds.length} chat(s)`);
  return { skipped: false };
}

module.exports = { sendMorningGreetingToChats };
