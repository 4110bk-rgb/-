const { isWorkingDay } = require('./ruHolidays');
const { sendActiveMeasurementsToMax } = require('./sendActiveMeasurementsToMax');
const { sendActiveRepairsToMax } = require('./sendActiveRepairsToMax');

async function sendDailyDigest({ chatId }) {
  if (!isWorkingDay()) {
    console.log('dailyDigest: skipped — weekend or holiday');
    return { skipped: true };
  }

  await sendActiveMeasurementsToMax({ chatId });
  await sendActiveRepairsToMax({ chatId });
  console.log('dailyDigest: sent');
  return { skipped: false };
}

module.exports = { sendDailyDigest };
