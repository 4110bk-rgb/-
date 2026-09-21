const { bot } = require('./maxClient');
const { getStateHoliday } = require('./stateHolidays');

async function sendHolidayGreetingToChats({ chatIds }) {
  const holiday = getStateHoliday();
  if (!holiday) {
    console.log('holidayGreeting: skipped — not a named state holiday today');
    return { skipped: true };
  }

  const text = `Это Виталик! 🎉\n\n${holiday.message}`;
  for (const chatId of chatIds) {
    await bot.api.sendMessageToChat(chatId, text, { format: 'markdown' });
  }
  console.log(`holidayGreeting: sent "${holiday.name}" to ${chatIds.length} chat(s)`);
  return { skipped: false, holiday: holiday.name };
}

module.exports = { sendHolidayGreetingToChats };
