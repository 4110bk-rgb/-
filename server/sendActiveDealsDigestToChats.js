const { isWorkingDay } = require('./ruHolidays');
const { sendActiveMeasurementsToMax } = require('./sendActiveMeasurementsToMax');
const { sendActiveRepairsToMax } = require('./sendActiveRepairsToMax');
const { sendNearbyDealsToMax } = require('./sendNearbyDealsToMax');

// Active measurements + repairs (no greeting), followed by the
// nearby-deals recommendation (10km / 30km trip-combining groups), to
// every chat in `chatIds` — same weekday/holiday rule as the rest of the
// schedule.
async function sendActiveDealsDigestToChats({ chatIds }) {
  if (!isWorkingDay()) {
    console.log('activeDealsDigest: skipped — weekend or holiday');
    return { skipped: true };
  }

  for (const chatId of chatIds) {
    await sendActiveMeasurementsToMax({ chatId });
    await sendActiveRepairsToMax({ chatId });
    await sendNearbyDealsToMax({ chatId });
  }
  console.log(`activeDealsDigest: sent to ${chatIds.length} chat(s)`);
  return { skipped: false };
}

module.exports = { sendActiveDealsDigestToChats };
