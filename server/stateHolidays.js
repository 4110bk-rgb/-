// Named Russian state holidays (not every non-working day — see
// ruHolidays.js for the full "day off" list, which also includes plain
// extra days around New Year with no holiday of their own to name).
// Needs the same yearly update as ruHolidays.js once next year's dates
// are confirmed.
const STATE_HOLIDAYS_BY_YEAR = {
  2026: {
    '01-01': { name: 'Новый год', message: 'С Новым годом! 🎄🎉 Пусть он принесёт много хороших сделок, довольных клиентов и поводов для радости!' },
    '01-07': { name: 'Рождество Христово', message: 'С Рождеством Христовым! 🎄✨ Тепла, света и хорошего настроения!' },
    '02-23': { name: 'День защитника Отечества', message: 'С Днём защитника Отечества! 🎖️ Здоровья, мира и всего самого доброго!' },
    '03-08': { name: 'Международный женский день', message: 'С 8 Марта! 🌷💐 Красоты, весеннего настроения и только приятных дней!' },
    '05-01': { name: 'Праздник Весны и Труда', message: 'С Праздником Весны и Труда! 🌸☀️ Хорошего отдыха и весеннего настроения!' },
    '05-09': { name: 'День Победы', message: 'С Днём Победы! 🎗️ Мирного неба и благодарности тем, кто его отстоял.' },
    '06-12': { name: 'День России', message: 'С Днём России! 🇷🇺 Хорошего дня и отличного настроения!' },
    '11-04': { name: 'День народного единства', message: 'С Днём народного единства! 🤝 Добра, согласия и хорошего дня!' },
  },
};

function dateKey(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getStateHoliday(date = new Date()) {
  const table = STATE_HOLIDAYS_BY_YEAR[date.getFullYear()];
  if (!table) return null;
  return table[dateKey(date)] || null;
}

module.exports = { getStateHoliday };
