// Cross-checks today's forecast for Lipetsk against three independent,
// no-API-key weather services — any one of them can be wrong on a given
// day, so the summary shows a temperature range plus a note when sources
// disagree about rain, rather than trusting a single feed.
const LAT = 52.6031;
const LON = 39.5708;

async function fetchWttr() {
  const res = await fetch('https://wttr.in/Lipetsk?format=j1');
  if (!res.ok) throw new Error(`wttr.in HTTP ${res.status}`);
  const data = await res.json();
  const today = data.weather[0];
  const rainChance = Math.max(...today.hourly.map((h) => Number(h.chanceofrain)));

  return {
    source: 'wttr.in',
    minC: Number(today.mintempC),
    maxC: Number(today.maxtempC),
    feelsLikeC: Number(data.current_condition[0].FeelsLikeC),
    rainToday: rainChance >= 40,
    rainChancePercent: rainChance,
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

async function getWeatherSummary() {
  const settled = await Promise.allSettled([fetchWttr(), fetchMetNo(), fetch7timer()]);
  const results = settled.filter((s) => s.status === 'fulfilled').map((s) => s.value);
  if (!results.length) return null;

  const minC = Math.round(Math.min(...results.map((r) => r.minC)));
  const maxC = Math.round(Math.max(...results.map((r) => r.maxC)));
  const feelsLike = results.find((r) => r.feelsLikeC !== undefined)?.feelsLikeC;
  const wttr = results.find((r) => r.source === 'wttr.in');

  const rainVotes = results.filter((r) => r.rainToday !== undefined);
  const rainAgree = rainVotes.every((r) => r.rainToday === rainVotes[0].rainToday);

  return {
    minC,
    maxC,
    feelsLikeC: feelsLike !== undefined ? Math.round(feelsLike) : null,
    rainChancePercent: wttr ? wttr.rainChancePercent : null,
    rainLikely: rainVotes.some((r) => r.rainToday),
    sourcesAgreeOnRain: rainAgree,
    sourcesUsed: results.map((r) => r.source),
  };
}

function formatWeatherSummary(w) {
  if (!w) return null;

  const lines = [`Погода в Липецке сегодня: ${w.minC}…${w.maxC}°C`];
  if (w.feelsLikeC !== null) lines[0] += `, ощущается как ${w.feelsLikeC}°C`;

  if (w.rainChancePercent !== null) {
    lines.push(`Вероятность осадков: ${w.rainChancePercent}%${w.rainLikely ? ' — возьмите зонт на всякий случай' : ''}`);
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
