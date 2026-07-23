const TOKEN = () => process.env.YANDEX_ADS_TOKEN;
const MANAGEMENT_BASE = 'https://api-metrika.yandex.net/management/v1';
const STAT_BASE = 'https://api-metrika.yandex.net/stat/v1/data';

// Goal types that represent a real lead-generation action (form submitted or
// phone number clicked) as opposed to page-view/engagement autogoals.
const LEAD_GOAL_TYPES = new Set(['form', 'phone']);

async function metrikaFetch(url) {
  const res = await fetch(url, { headers: { Authorization: `OAuth ${TOKEN()}` } });
  const data = await res.json();
  if (data.errors || data.error) {
    throw new Error(`Yandex.Metrika error: ${JSON.stringify(data.errors || data.error)}`);
  }
  return data;
}

async function getLeadGoalIds(counterId) {
  const data = await metrikaFetch(`${MANAGEMENT_BASE}/counter/${counterId}/goals`);
  return (data.goals || []).filter((g) => LEAD_GOAL_TYPES.has(g.type)).map((g) => g.id);
}

async function getCounterStats(counterId, days) {
  const leadGoalIds = await getLeadGoalIds(counterId);
  const goalMetrics = leadGoalIds.map((id) => `ym:s:goal${id}reaches`);
  const metrics = ['ym:s:visits', 'ym:s:users', ...goalMetrics];

  const url = `${STAT_BASE}?ids=${counterId}&metrics=${metrics.join(',')}&date1=${days}daysAgo&date2=today`;
  const data = await metrikaFetch(url);
  const totals = data.totals || [];

  const visits = totals[0] || 0;
  const users = totals[1] || 0;
  const conversions = totals.slice(2).reduce((sum, v) => sum + (v || 0), 0);

  return { visits, users, conversions };
}

module.exports = { getCounterStats, getLeadGoalIds };
