const { getWeatherSummary, formatWeatherSummary } = require('./weather');
const { getDayFact } = require('./dayFacts');

const YANDEX_WEATHER_URL = 'https://yandex.ru/pogoda/lipetsk';

const OPENINGS = ['Доброе утро! 👋☀️ Это Виталик!', 'Всем доброе утро! 😊👋 На связи Виталик!', 'Доброе утро, команда! 👋✨ Это снова Виталик!'];

const CLOSINGS = [
  'Хорошего и продуктивного дня всем! Пусть всё получится 💪',
  'Успешного дня, команда! Всё будет отлично 🙌',
  'Пусть сегодня всё идёт по плану — хорошего дня всем! ☀️',
];

function pickRotating(list, date) {
  return list[date.getDate() % list.length];
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDateLine(date) {
  const text = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return `📅 ${capitalize(text)}`;
}

async function buildMorningGreeting(date = new Date()) {
  const [weather, dayFact] = await Promise.all([getWeatherSummary().catch(() => null), getDayFact(date)]);

  const parts = [pickRotating(OPENINGS, date), formatDateLine(date)];

  const weatherText = formatWeatherSummary(weather);
  if (weatherText) parts.push(`${weatherText}\nПодробнее: ${YANDEX_WEATHER_URL}`);

  if (dayFact) {
    if (dayFact.holiday) parts.push(`🎉 Праздник дня: ${dayFact.holiday}`);
    if (dayFact.history) parts.push(`А ещё в этот день: ${dayFact.history}`);
  }

  parts.push(pickRotating(CLOSINGS, date));

  return parts.join('\n\n');
}

module.exports = { buildMorningGreeting };
