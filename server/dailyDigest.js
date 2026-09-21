const { bot } = require('./maxClient');
const { isWorkingDay } = require('./ruHolidays');
const { buildMorningGreeting } = require('./morningGreeting');
const { sendActiveMeasurementsToMax } = require('./sendActiveMeasurementsToMax');
const { sendActiveRepairsToMax } = require('./sendActiveRepairsToMax');

async function sendDailyDigest({ chatId }) {
  if (!isWorkingDay()) {
    console.log('dailyDigest: skipped — weekend or holiday');
    return { skipped: true };
  }

  const greeting = await buildMorningGreeting();
  await bot.api.sendMessageToChat(chatId, greeting);
  await sendActiveMeasurementsToMax({ chatId });
  await sendActiveRepairsToMax({ chatId });
  console.log('dailyDigest: sent');
  return { skipped: false };
}

module.exports = { sendDailyDigest };
