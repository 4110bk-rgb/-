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
  '01-01': ['Новый год 🎄'],
  '01-02': ['Международный день научной фантастики 🚀'],
  '01-03': ['День соломинки для коктейлей 🥤'],
  '01-04': ['Всемирный день гипноза 🌀'],
  '01-07': ['Рождество Христово ⛪'],
  '01-11': ['Международный день «спасибо» 🙏'],
  '01-12': ['Международный день марципана 🍬'],
  '01-19': ['Крещение Господне ⛪'],
  '01-20': ['День осведомлённости о пингвинах 🐧'],
  '01-21': ['Международный день объятий 🤗'],
  '01-25': ['Татьянин день (День российского студенчества) 🎓'],
  '01-31': ['Международный день ювелира 💍'],

  '02-02': ['День ездовых собак 🛷'],
  '02-10': ['Международный день арабского леопарда 🐆'],
  '02-15': ['Сретение Господне ⛪'],
  '02-17': ['День кошек (в Польше) 🐱'],
  '02-20': ['Всемирный день социальной справедливости ⚖️'],
  '02-21': ['Международный день родного языка 🗣️'],
  '02-23': ['День защитника Отечества 🎖️'],

  '03-02': ['Международный день спички 🔥'],
  '03-03': ['Всемирный день писателя ✍️'],
  '03-06': ['Международный день зубного врача 🦷'],
  '03-08': ['Международный женский день 🌷'],
  '03-09': ['День нестандартно мыслящих людей 💡'],

  '04-01': ['День смеха 😄'],
  '04-04': ['Всемирный день крыс 🐀'],
  '04-07': ['Благовещение Пресвятой Богородицы ⛪'],
  '04-12': ['Международный день хомяка (а ещё День космонавтики) 🐹🚀'],
  '04-23': ['Всемирный день книги 📚'],

  '05-01': ['Праздник Весны и Труда 🌸'],
  '05-05': ['Международный день акушерки 👶'],
  '05-07': ['Всемирный день паролей 🔐'],
  '05-08': ['День ириса 🌸'],
  '05-09': ['День Победы 🎗️'],
  '05-30': ['Международный день объятий вашей кошки 🐈'],

  '06-01': ['Международный день защиты детей и Всемирный день молока 🥛'],
  '06-12': ['День России 🇷🇺'],
  '06-14': ['Международный банный день 🛁'],
  '06-23': ['Международный Олимпийский день 🏅'],

  '07-02': ['Всемирный день НЛО 🛸'],
  '07-16': ['Всемирный день змей 🐍'],
  '07-17': ['Всемирный день эмодзи 😃'],

  '08-05': ['Международный день светофора 🚦'],
  '08-13': ['Международный день левшей ✋'],
  '08-17': ['Международный день ротвейлера 🐕', 'День секонд-хенда 👕'],
  '08-19': ['Преображение Господне (Яблочный Спас) ⛪🍎'],
  '08-26': ['День благодарности собаке 🐶'],
  '08-28': ['Успение Пресвятой Богородицы ⛪'],
  '08-31': ['День блога 💻'],

  '09-01': ['День знаний 🎒'],
  '09-04': ['Международный день тхэквондо 🥋'],
  '09-05': ['Международный день благотворительности ❤️'],
  '09-11': ['День рождения стеклянной посуды 🫙'],
  '09-16': ['Международный день охраны озонового слоя 🌍'],
  '09-17': ['Международный день гнома 🧙', 'День щекотунчиков 😆'],
  '09-19': ['Международный день подражания пиратам 🏴‍☠️'],
  '09-21': ['Рождество Пресвятой Богородицы ⛪'],
  '09-24': ['Международный день караванщика 🐫'],
  '09-27': ['Всемирный день туризма ✈️', 'Воздвижение Креста Господня ⛪'],

  '10-01': ['Международный день пожилых людей 👴'],
  '10-05': ['Международный день учителя 👩‍🏫'],
  '10-26': ['День приятных сюрпризов 🎁'],
  '10-27': ['Международный день плюшевого мишки 🧸'],
  '10-29': ['День кошек (в США) 🐱'],

  '11-01': ['День гадания на кофейной гуще ☕', 'День менеджера 📊'],
  '11-04': ['День народного единства 🤝'],
  '11-07': ['День объятий с медведем 🐻'],
  '11-11': ['Всемирный день шопинга 🛍️'],
  '11-19': ['Международный день мужчин 👨'],
  '11-21': ['День бухгалтера 📒'],
  '11-29': ['Всемирный день без покупок 🚫🛒'],

  '12-04': ['Введение во храм Пресвятой Богородицы ⛪'],
  '12-05': ['Всемирный день почв 🌱'],
  '12-12': ['День Конституции РФ 🏛️', 'День пряничного домика 🍪'],
  '12-22': ['День энергетика (а ещё день электрика) ⚡'],

  // Fixed-date professional holidays directly relevant to a gate
  // sales/installation/repair business.
  '05-26': ['День российского предпринимательства 💼'],
};

// Holidays whose date shifts every year — either tied to Easter (Orthodox
// movable feasts) or defined as "Nth weekday of month" (several
// professional holidays, including ones directly relevant to this
// business: builder, welder, trade worker, driver). Listed per year
// instead of baked into the fixed DAY_FACTS table above, which would
// otherwise show the wrong date once the year changes. Needs a new entry
// added once next year's dates are published (Easter's around
// Jan-Feb, the professional ones usually confirmed well in advance too).
const MOVABLE_HOLIDAYS_BY_YEAR = {
  2026: {
    '04-05': ['Вербное воскресенье (Вход Господень в Иерусалим) ⛪🌿'],
    '04-12': ['Пасха, Светлое Христово Воскресение ⛪🥚'],
    '05-21': ['Вознесение Господне ⛪'],
    '05-29': ['День сварщика 🔥👷'],
    '05-31': ['Троица (День Святой Троицы) ⛪🕊️'],
    '07-25': ['День работника торговли 🛒'],
    '08-09': ['День строителя 🏗️'],
    '10-25': ['День автомобилиста 🚗'],
  },
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

// The curated DAY_HISTORY table above only covers a handful of dates, so it
// alone can't guarantee "2 interesting facts every day". Wikipedia's "on
// this day" feed has an entry for every date of the year, filling the gap —
// but it's raw, unfiltered history, and a lot of it is war/political/tragic
// (assassinations, invasions, disasters), not the light workplace-appropriate
// trivia this message is going for. SENSITIVE_RE screens those out; what's
// left skews toward science, culture, and other neutral "huh, interesting"
// facts, which is the best a keyword filter can do without reading each one.
const SENSITIVE_RE =
  /войн|воен|вторжен|теракт|терро|погиб|жертв|убий|убит|казн|расстрел|резня|геноцид|революц|переворот|восстан|путч|оккупац|диктат|репресс|скончал|умер[лт]|катастроф|взрыв|крестов|голод|эпидеми|пандеми|чрезвычайн|санкц|обвинен|осуд|приговор|тюрьм|концлагер|холокост|антисемит|расизм|дискримин|порабо|рабств|пытк|фсб|кгб|нквд|цру|разведк|шпион|спецслужб|заговор|конспиролог|сбил|крушени|роспуск|распущ|импичмент|отставк|германи|наводнени|землетрясен|смертельн|отравлен|алкогол|спиртн|суррогат|наркот|самоубийств|погром|неконституц|разгром|сражени|битв|штурм|осад|авари|чернобыл|избиени|побоищ|аннекс|незаконн|удар|беспилотник|дрон|перехват|свержен|диссидент|преследован|обстрел|фронт|мобилизац/i;

// A "proud" event beats a merely relevant one, which beats a generic one —
// rank by: Lipetsk + achievement > Lipetsk > Russia/USSR + achievement >
// Russia/USSR > anything else safe. The last tier only exists so the day
// still gets its 2 facts when nothing more relevant/proud turns up.
const LIPETSK_RE = /липецк/i;
const RUSSIA_RE = /росси|ссср|рсфср|(?<![пП])русск|российск|москв|кремл|петербург|ленинград/i;
const PRIDE_RE =
  /побед|чемпион|олимпи|рекорд|перв(ый|ое|ые|ой|ым) в (мире|истории)|космос|космонавт|спутник|запуск|полёт|открыт|основан|изобрет|нобелевск|награжд|орден|медал|выигра|достижени|премия|выдающ|музей|театр|балет|учреди/i;

function relevanceScore(text) {
  const lipetsk = LIPETSK_RE.test(text);
  const russia = RUSSIA_RE.test(text);
  const pride = PRIDE_RE.test(text);
  if (lipetsk) return pride ? 4 : 3;
  if (russia) return pride ? 2 : 1;
  return 0;
}

async function fetchWikipediaEvents(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const res = await fetch(`https://ru.wikipedia.org/api/rest_v1/feed/onthisday/events/${mm}/${dd}`, {
    headers: { 'User-Agent': 'vorota2-bitrix-dashboard/1.0 (internal tool)' },
  });
  if (!res.ok) throw new Error(`Wikipedia onthisday HTTP ${res.status}`);
  const data = await res.json();
  return data.events || [];
}

async function getWikipediaHistory(date, count) {
  try {
    const events = await fetchWikipediaEvents(date);
    return events
      .filter((e) => e?.text && e.year && !SENSITIVE_RE.test(e.text))
      .map((e, i) => ({ e, i, score: relevanceScore(e.text) }))
      .sort((a, b) => b.score - a.score || a.i - b.i) // stable: keep API order within the same score
      .slice(0, count)
      .map(({ e }) => `📖 в ${e.year} году: ${e.text}`);
  } catch {
    return []; // network hiccup or API change — the greeting just goes without extra facts that day
  }
}

async function getDayFact(date = new Date()) {
  const key = monthKey(date);
  const movable = MOVABLE_HOLIDAYS_BY_YEAR[date.getFullYear()]?.[key] || [];
  const holidays = [...(DAY_FACTS[key] || []), ...movable];

  const curatedHistory = DAY_HISTORY[key] || [];
  const wikiHistory = curatedHistory.length < 2 ? await getWikipediaHistory(date, 2 - curatedHistory.length) : [];
  const history = [...curatedHistory, ...wikiHistory];

  if (!holidays.length && !history.length) return null;
  return { holidays, history };
}

module.exports = { getDayFact, DAY_FACTS, DAY_HISTORY, MOVABLE_HOLIDAYS_BY_YEAR };
