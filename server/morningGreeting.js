const { getWeatherSummary, formatWeatherSummary } = require('./weather');
const { getDayFact } = require('./dayFacts');

const CLOSINGS = [
  'Хорошего и продуктивного дня всем! Пусть всё получится 💪',
  'Успешного дня, команда! Всё будет отлично 🙌',
  'Пусть сегодня всё идёт по плану — хорошего дня всем! ☀️',
];

function pickClosing(date) {
  return CLOSINGS[date.getDate() % CLOSINGS.length];
}

async function buildMorningGreeting(date = new Date()) {
  const [weather, dayFact] = await Promise.all([getWeatherSummary().catch(() => null), getDayFact(date)]);

  const parts = ['Доброе утро! ☀️'];

  const weatherText = formatWeatherSummary(weather);
  if (weatherText) parts.push(weatherText);

  if (dayFact) {
    const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const bits = [];
    if (dayFact.holiday) bits.push(dayFact.holiday);
    if (dayFact.history) bits.push(dayFact.history);
    if (bits.length) parts.push(`Сегодня, ${dateStr} — ${bits.join('. А ещё: ')}`);
  }

  parts.push(pickClosing(date));

  return parts.join('\n\n');
}

module.exports = { buildMorningGreeting };
