const { bot } = require('./maxClient');
const { isWorkingDay } = require('./ruHolidays');
const { buildMorningGreeting } = require('./morningGreeting');
const { sendActiveMeasurementsToMax } = require('./sendActiveMeasurementsToMax');
const { sendActiveRepairsToMax } = require('./sendActiveRepairsToMax');
const { sendNearbyDealsToMax } = require('./sendNearbyDealsToMax');

// Greeting, then active measurements + repairs, then the nearby-deals
// recommendation (10km / 30km trip-combining groups), to every chat in
// `chatIds` — same weekday/holiday rule as the rest of the schedule.
async function sendActiveDealsDigestToChats({ chatIds }) {
  if (!isWorkingDay()) {
    console.log('activeDealsDigest: skipped — weekend or holiday');
    return { skipped: true };
  }

  const greeting = await buildMorningGreeting();
  for (const chatId of chatIds) {
    await bot.api.sendMessageToChat(chatId, greeting, { format: 'markdown' });
    await sendActiveMeasurementsToMax({ chatId });
    await sendActiveRepairsToMax({ chatId });
    await sendNearbyDealsToMax({ chatId });
  }
  console.log(`activeDealsDigest: sent to ${chatIds.length} chat(s)`);
  return { skipped: false };
}

module.exports = { sendActiveDealsDigestToChats };
