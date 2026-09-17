// Real unofficial/international "fun" observance days, curated from
// calend.ru and similar sources, filtered to stay workplace-appropriate
// (no alcohol, no adult content, nothing somber or political).
//
// This is NOT a complete 366-day table — most calendar days simply don't
// have a well-documented, appropriate "fun holiday" attached to them, and
// making one up would defeat the point. Days with no entry here just don't
// get a "праздник дня" line in the morning message; that's expected, not
// a bug. Each date holds an array (usually just one item — a genuine
// second holiday on the same day is the exception, not filled in with
// something made up just to reach two). Feel free to add more verified
// dates and second entries as you come across them.
const DAY_FACTS = {
  '01-02': ['Международный день научной фантастики 🚀'],
  '01-03': ['День соломинки для коктейлей 🥤'],
  '01-04': ['Всемирный день гипноза 🌀'],
  '01-11': ['Международный день «спасибо» 🙏'],
  '01-12': ['Международный день марципана 🍬'],
  '01-20': ['День осведомлённости о пингвинах 🐧'],
  '01-21': ['Международный день объятий 🤗'],
  '01-31': ['Международный день ювелира 💍'],

  '02-02': ['День ездовых собак 🛷'],
  '02-10': ['Международный день арабского леопарда 🐆'],
  '02-17': ['День кошек (в Польше) 🐱'],
  '02-20': ['Всемирный день социальной справедливости ⚖️'],
  '02-21': ['Международный день родного языка 🗣️'],

  '03-02': ['Международный день спички 🔥'],
  '03-03': ['Всемирный день писателя ✍️'],
  '03-06': ['Международный день зубного врача 🦷'],
  '03-09': ['День нестандартно мыслящих людей 💡'],

  '04-01': ['День смеха 😄'],
  '04-04': ['Всемирный день крыс 🐀'],
  '04-12': ['Международный день хомяка (а ещё День космонавтики) 🐹🚀'],
  '04-23': ['Всемирный день книги 📚'],

  '05-05': ['Международный день акушерки 👶'],
  '05-07': ['Всемирный день паролей 🔐'],
  '05-08': ['День ириса 🌸'],
  '05-30': ['Международный день объятий вашей кошки 🐈'],

  '06-01': ['Международный день защиты детей и Всемирный день молока 🥛'],
  '06-14': ['Международный банный день 🛁'],
  '06-23': ['Международный Олимпийский день 🏅'],

  '07-02': ['Всемирный день НЛО 🛸'],
  '07-16': ['Всемирный день змей 🐍'],
  '07-17': ['Всемирный день эмодзи 😃'],

  '08-05': ['Международный день светофора 🚦'],
  '08-13': ['Международный день левшей ✋'],
  '08-17': ['Международный день ротвейлера 🐕', 'День секонд-хенда 👕'],
  '08-26': ['День благодарности собаке 🐶'],
  '08-31': ['День блога 💻'],

  '09-04': ['Международный день тхэквондо 🥋'],
  '09-05': ['Международный день благотворительности ❤️'],
  '09-11': ['День рождения стеклянной посуды 🫙'],
  '09-16': ['Международный день охраны озонового слоя 🌍'],
  '09-17': ['Международный день гнома 🧙', 'День щекотунчиков 😆'],
  '09-19': ['Международный день подражания пиратам 🏴‍☠️'],
  '09-24': ['Международный день караванщика 🐫'],
  '09-27': ['Всемирный день туризма ✈️'],

  '10-01': ['Международный день пожилых людей 👴'],
  '10-26': ['День приятных сюрпризов 🎁'],
  '10-27': ['Международный день плюшевого мишки 🧸'],
  '10-29': ['День кошек (в США) 🐱'],

  '11-01': ['День гадания на кофейной гуще ☕'],
  '11-07': ['День объятий с медведем 🐻'],
  '11-11': ['Всемирный день шопинга 🛍️'],
  '11-19': ['Международный день мужчин 👨'],
  '11-29': ['Всемирный день без покупок 🚫🛒'],

  '12-05': ['Всемирный день почв 🌱'],
  '12-12': ['День Конституции РФ 🏛️', 'День пряничного домика 🍪'],
};

// A few well-known, high-confidence historical facts to pair with specific
// dates — kept short and separate from DAY_FACTS since most dates don't
// have one and this list is even more selective. Same array convention:
// a second fact is only added when there's a real one, not invented.
const DAY_HISTORY = {
  '09-17': [
    '🐧 в 1991 году Линус Торвальдс опубликовал исходный код Linux',
    '📻 в 1922 году в Москве прозвучал первый в стране радиоконцерт со словами «Слушайте! Говорит Москва!»',
  ],
};

function monthKey(date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDayFact(date = new Date()) {
  const key = monthKey(date);
  const holidays = DAY_FACTS[key] || [];
  const history = DAY_HISTORY[key] || [];
  if (!holidays.length && !history.length) return null;
  return { holidays, history };
}

module.exports = { getDayFact, DAY_FACTS, DAY_HISTORY };
