// Cross-checks today's forecast for Lipetsk against several independent
// weather services — any one of them can be wrong on a given day, so the
// summary shows a temperature range plus a note when sources disagree
// about rain, rather than trusting a single feed.
const LAT = 52.6031;
const LON = 39.5708;

const DAYPART_LABELS = { morning: 'утром', day: 'днём', evening: 'вечером' };
const RAIN_THRESHOLD = 40; // percent, above which we call it out explicitly

// wttr.in's j1 hourly times are already local to the queried location.
const WTTR_HOUR_TO_PART = { '600': 'morning', '900': 'morning', '1200': 'day', '1500': 'day', '1800': 'evening', '2100': 'evening' };

async function fetchWttr() {
  const res = await fetch('https://wttr.in/Lipetsk?format=j1');
  if (!res.ok) throw new Error(`wttr.in HTTP ${res.status}`);
  const data = await res.json();
  const today = data.weather[0];
  const rainChance = Math.max(...today.hourly.map((h) => Number(h.chanceofrain)));

  const parts = {};
  for (const h of today.hourly) {
    const partKey = WTTR_HOUR_TO_PART[h.time];
    if (!partKey) continue;
    if (!parts[partKey]) parts[partKey] = { temps: [], rainChances: [] };
    parts[partKey].temps.push(Number(h.tempC));
    parts[partKey].rainChances.push(Number(h.chanceofrain));
  }
  const daypartTemps = {};
  for (const [key, v] of Object.entries(parts)) {
    daypartTemps[key] = {
      minC: Math.min(...v.temps),
      maxC: Math.max(...v.temps),
      rainChancePercent: Math.max(...v.rainChances),
    };
  }

  return {
    source: 'wttr.in',
    minC: Number(today.mintempC),
    maxC: Number(today.maxtempC),
    feelsLikeC: Number(data.current_condition[0].FeelsLikeC),
    rainToday: rainChance >= RAIN_THRESHOLD,
    rainChancePercent: rainChance,
    daypartTemps,
  };
}

async function fetchMetNo() {
  const res = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${LAT}&lon=${LON}`, {
    headers: { 'User-Agent': 'vorota2-bitrix-dashboard/1.0 (internal tool)' },
  });
  if (!res.ok) throw new Error(`met.no HTTP ${res.status}`);
  const data = await res.json();
  const todayKey = new Date().toISOString().slice(0, 10);

  const todayEntries = data.properties.timeseries.filter((t) => t.time.startsWith(todayKey));
  const temps = todayEntries.map((t) => t.data.instant.details.air_temperature);
  const rainToday = todayEntries.some((t) => {
    const symbol = t.data.next_6_hours?.summary?.symbol_code || t.data.next_1_hours?.summary?.symbol_code || '';
    const precip = t.data.next_6_hours?.details?.precipitation_amount || 0;
    return /rain|sleet|snow|shower/i.test(symbol) || precip > 0;
  });

  return {
    source: 'met.no',
    minC: Math.min(...temps),
    maxC: Math.max(...temps),
    rainToday,
  };
}

async function fetch7timer() {
  const res = await fetch(`https://www.7timer.info/bin/api.pl?lon=${LON}&lat=${LAT}&product=civil&output=json`);
  if (!res.ok) throw new Error(`7timer HTTP ${res.status}`);
  const data = await res.json();
  const todayEntries = data.dataseries.filter((d) => d.timepoint <= 24);
  const temps = todayEntries.map((d) => d.temp2m);
  const rainToday = todayEntries.some((d) => d.prec_type && d.prec_type !== 'none');

  return {
    source: '7timer.info',
    minC: Math.min(...temps),
    maxC: Math.max(...temps),
    rainToday,
  };
}

// Only runs once you have a free key from https://yandex.ru/dev/weather —
// set YANDEX_WEATHER_API_KEY in .env. Yandex's own API already splits the
// day into night/morning/day/evening parts, so when it's present it becomes
// the preferred source for the daypart breakdown below.
async function fetchYandex() {
  const key = process.env.YANDEX_WEATHER_API_KEY;
  if (!key) return null;

  const res = await fetch(`https://api.weather.yandex.ru/v2/forecast?lat=${LAT}&lon=${LON}&lang=ru&limit=1`, {
    headers: { 'X-Yandex-Weather-Key': key },
  });
  if (!res.ok) throw new Error(`Яндекс.Погода HTTP ${res.status}`);
  const data = await res.json();
  const today = data.forecasts[0];
  const parts = {};
  for (const partKey of ['morning', 'day', 'evening']) {
    const p = today.parts[partKey];
    if (!p) continue;
    parts[partKey] = { minC: p.temp_min ?? p.temp, maxC: p.temp_max ?? p.temp, rainChancePercent: p.prec_prob };
  }

  return {
    source: 'Яндекс.Погода',
    minC: today.parts.day?.temp_min ?? today.parts.day?.temp,
    maxC: today.parts.day?.temp_max ?? today.parts.day?.temp,
    rainToday: Object.values(parts).some((p) => p.rainChancePercent >= RAIN_THRESHOLD),
    rainChancePercent: Math.max(...Object.values(parts).map((p) => p.rainChancePercent || 0)),
    daypartTemps: parts,
  };
}

async function getWeatherSummary() {
  const settled = await Promise.allSettled([fetchWttr(), fetchMetNo(), fetch7timer(), fetchYandex()]);
  const results = settled.filter((s) => s.status === 'fulfilled' && s.value).map((s) => s.value);
  if (!results.length) return null;

  const minC = Math.round(Math.min(...results.map((r) => r.minC)));
  const maxC = Math.round(Math.max(...results.map((r) => r.maxC)));
  const feelsLike = results.find((r) => r.feelsLikeC !== undefined)?.feelsLikeC;

  // Prefer Yandex's own morning/day/evening split when available, since it
  // comes pre-bucketed by the source itself; otherwise fall back to the
  // buckets derived from wttr.in's hourly data.
  const daypartSource = results.find((r) => r.source === 'Яндекс.Погода') || results.find((r) => r.daypartTemps);
  const dayparts = daypartSource
    ? Object.entries(daypartSource.daypartTemps).map(([key, v]) => ({
        label: DAYPART_LABELS[key],
        minC: Math.round(v.minC),
        maxC: Math.round(v.maxC),
        rainChancePercent: v.rainChancePercent,
        rainy: v.rainChancePercent >= RAIN_THRESHOLD,
      }))
    : [];

  const rainVotes = results.filter((r) => r.rainToday !== undefined);
  const rainAgree = rainVotes.every((r) => r.rainToday === rainVotes[0].rainToday);

  return {
    minC,
    maxC,
    feelsLikeC: feelsLike !== undefined ? Math.round(feelsLike) : null,
    rainChancePercent: daypartSource ? daypartSource.rainChancePercent : null,
    rainLikely: rainVotes.some((r) => r.rainToday),
    rainTimes: dayparts.filter((p) => p.rainy).map((p) => p.label),
    sourcesAgreeOnRain: rainAgree,
    sourcesUsed: results.map((r) => r.source),
    dayparts,
  };
}

function formatWeatherSummary(w) {
  if (!w) return null;

  const lines = [`Погода в Липецке сегодня: ${w.minC}…${w.maxC}°C`];
  if (w.feelsLikeC !== null) lines[0] += `, ощущается как ${w.feelsLikeC}°C`;

  if (w.dayparts.length) {
    lines.push(w.dayparts.map((p) => `${p.label}: ${p.minC}…${p.maxC}°C`).join(', '));
  }

  if (w.rainTimes.length) {
    lines.push(`Осадки ожидаются: ${w.rainTimes.join(', ')} — возьмите зонт`);
  } else if (w.rainChancePercent !== null) {
    lines.push(`Вероятность осадков: ${w.rainChancePercent}%`);
  } else if (w.rainLikely) {
    lines.push('Возможны осадки — возьмите зонт на всякий случай');
  }

  if (!w.sourcesAgreeOnRain) {
    lines.push('(источники расходятся насчёт дождя — точный прогноз неясен)');
  }

  lines.push(`Источники: ${w.sourcesUsed.join(', ')}`);
  return lines.join('\n');
}

module.exports = { getWeatherSummary, formatWeatherSummary };
