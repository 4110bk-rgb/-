// Turns the manager efficiency table into a short written analysis: overall
// picture plus concrete, data-driven growth points (not hardcoded to any one
// snapshot — recomputed from whatever byManager rows are passed in).
const MIN_CALLS_FOR_MISSED_RATE = 15; // below this, a missed-rate % is noise
const MIN_LEADS_FOR_QUALIFIED_RATE = 10;
const MIN_QUALIFIED_FOR_CONVERSION_RATE = 10; // below this, a conversion % is a coin flip, not a signal
const MIN_DEALS_FOR_WIN_RATE = 5;

function buildManagerAnalytics(byManager) {
  const withLeads = byManager.filter((m) => m.leadsTotal >= MIN_LEADS_FOR_QUALIFIED_RATE);
  const withQualified = byManager.filter((m) => m.leadsQualified >= MIN_QUALIFIED_FOR_CONVERSION_RATE);
  const withCalls = byManager.filter((m) => m.callsTotal >= MIN_CALLS_FOR_MISSED_RATE);
  const withDeals = byManager.filter((m) => m.dealsWon + m.dealsLost >= MIN_DEALS_FOR_WIN_RATE);

  const totals = byManager.reduce(
    (acc, m) => ({
      leadsTotal: acc.leadsTotal + m.leadsTotal,
      leadsQualified: acc.leadsQualified + m.leadsQualified,
      dealsWon: acc.dealsWon + m.dealsWon,
      dealsLost: acc.dealsLost + m.dealsLost,
      wonSum: acc.wonSum + m.wonSum,
    }),
    { leadsTotal: 0, leadsQualified: 0, dealsWon: 0, dealsLost: 0, wonSum: 0 },
  );

  const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);
  const overallQualifiedRate = pct(totals.leadsQualified, totals.leadsTotal);
  const overallWinRate = pct(totals.dealsWon, totals.dealsWon + totals.dealsLost);

  const summary = [
    `Всего по команде: ${totals.leadsTotal} лидов, из них целевых ${totals.leadsQualified} (${overallQualifiedRate}%). ` +
      `Побед в сделках: ${totals.dealsWon} из ${totals.dealsWon + totals.dealsLost} (${overallWinRate}%). ` +
      `Сумма выигранных сделок: ${totals.wonSum.toLocaleString('ru-RU')}.`,
  ];

  const growthPoints = [];

  if (withQualified.length) {
    const best = [...withQualified].sort((a, b) => b.leadConversionRate - a.leadConversionRate)[0];
    growthPoints.push(
      `Лучшая конверсия целевого лида в сделку — у ${best.name} (${best.leadConversionRate}% от ${best.leadsQualified} целевых лидов). ` +
        `Стоит разобрать её подход к работе с лидом как образец для остальных.`,
    );
  }

  if (withLeads.length) {
    const worstQualified = [...withLeads].sort((a, b) => a.leadQualifiedRate - b.leadQualifiedRate)[0];
    if (worstQualified.leadQualifiedRate < overallQualifiedRate) {
      growthPoints.push(
        `У ${worstQualified.name} доля целевых лидов всего ${worstQualified.leadQualifiedRate}% ` +
          `(при среднем по команде ${overallQualifiedRate}%) — из ${worstQualified.leadsTotal} лидов целевыми ` +
          `признаны только ${worstQualified.leadsQualified}. Стоит проверить, не квалифицирует ли она лиды слишком рано ` +
          `или не работает ли с источником, дающим много нецелевых обращений.`,
      );
    }
  }

  if (withDeals.length) {
    const worstWinRate = [...withDeals].sort((a, b) => a.dealWinRate - b.dealWinRate)[0];
    if (worstWinRate.dealWinRate < overallWinRate) {
      growthPoints.push(
        `${worstWinRate.name}: доля выигранных сделок ${worstWinRate.dealWinRate}% ` +
          `(${worstWinRate.dealsWon} из ${worstWinRate.dealsWon + worstWinRate.dealsLost}) — ниже среднего по команде. ` +
          `Разбор проигранных сделок с ней может выявить типовые причины отказа.`,
      );
    }
  }

  const zeroDeals = byManager.filter((m) => m.leadsQualified > 0 && m.dealsTotal === 0);
  for (const m of zeroDeals) {
    growthPoints.push(
      `У ${m.name} есть ${m.leadsQualified} целевых лидов за период, но ни одной сделки — стоит проверить, ` +
        `доводит ли она целевые лиды до сделки или они «зависают» на этапе лида.`,
    );
  }

  if (withCalls.length) {
    const worstMissed = [...withCalls].sort((a, b) => b.missedCallRate - a.missedCallRate)[0];
    if (worstMissed.missedCallRate > 10) {
      growthPoints.push(
        `У ${worstMissed.name} пропущено ${worstMissed.missedCallRate}% звонков из ${worstMissed.callsTotal} — ` +
          `заметно выше нормы. Стоит проверить загрузку и скорость реакции на входящие.`,
      );
    }
  }

  return { summary, growthPoints };
}

module.exports = { buildManagerAnalytics };
