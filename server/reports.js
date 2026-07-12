const { call, listAll, userNames } = require('./bitrixClient');
const { companyForManager, isExcludedManager } = require('./managerCompanies');

function daysAgoIso(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function dateKey(isoString) {
  return (isoString || '').slice(0, 10);
}

async function statusMap(entityId) {
  const rows = await listAll('crm.status.list', { filter: { ENTITY_ID: entityId } });
  const map = {};
  for (const row of rows) map[row.STATUS_ID] = row.NAME;
  return map;
}

async function getDealsReport(days) {
  const since = daysAgoIso(days);
  const deals = await listAll('crm.deal.list', {
    select: ['ID', 'STAGE_ID', 'CATEGORY_ID', 'OPPORTUNITY', 'CURRENCY_ID', 'ASSIGNED_BY_ID', 'DATE_CREATE', 'CLOSED'],
    filter: { '>=DATE_CREATE': since },
    order: { DATE_CREATE: 'DESC' },
  });

  const categoryIds = [...new Set(deals.map((d) => Number(d.CATEGORY_ID) || 0))];
  const stageNames = {};
  for (const catId of categoryIds) {
    const entityId = catId === 0 ? 'DEAL_STAGE' : `DEAL_STAGE_${catId}`;
    Object.assign(stageNames, await statusMap(entityId));
  }

  const managerIds = [...new Set(deals.map((d) => d.ASSIGNED_BY_ID).filter(Boolean))];
  const managerNames = await userNames(managerIds);

  let totalSum = 0;
  let wonCount = 0;
  let lostCount = 0;
  const byStage = {};
  const byManager = {};

  for (const deal of deals) {
    const sum = Number(deal.OPPORTUNITY) || 0;
    totalSum += sum;

    const stageId = deal.STAGE_ID || 'UNKNOWN';
    if (!byStage[stageId]) {
      byStage[stageId] = { stageId, name: stageNames[stageId] || stageId, count: 0, sum: 0 };
    }
    byStage[stageId].count += 1;
    byStage[stageId].sum += sum;

    const isWon = /WON/i.test(stageId);
    const isLost = /LOSE|LOST/i.test(stageId);
    if (isWon) wonCount += 1;
    if (isLost) lostCount += 1;

    const managerId = deal.ASSIGNED_BY_ID || 'UNKNOWN';
    if (!isExcludedManager(managerId)) {
      if (!byManager[managerId]) {
        byManager[managerId] = {
          managerId,
          name: managerNames[managerId] || managerId,
          company: companyForManager(managerId),
          total: 0,
          won: 0,
          lost: 0,
          wonSum: 0,
        };
      }
      byManager[managerId].total += 1;
      if (isWon) {
        byManager[managerId].won += 1;
        byManager[managerId].wonSum += sum;
      }
      if (isLost) byManager[managerId].lost += 1;
    }
  }

  const managersByCompany = Object.values(byManager).sort((a, b) => {
    if (a.company !== b.company) return a.company.localeCompare(b.company);
    return b.total - a.total;
  });

  return {
    days,
    total: deals.length,
    totalSum: Math.round(totalSum),
    currency: deals[0]?.CURRENCY_ID || null,
    wonCount,
    lostCount,
    byStage: Object.values(byStage).sort((a, b) => b.count - a.count),
    byManager: managersByCompany,
  };
}

async function getLeadsReport(days) {
  const since = daysAgoIso(days);
  const leads = await listAll('crm.lead.list', {
    select: ['ID', 'STATUS_ID', 'STATUS_SEMANTIC_ID', 'SOURCE_ID', 'ASSIGNED_BY_ID', 'DATE_CREATE'],
    filter: { '>=DATE_CREATE': since },
    order: { DATE_CREATE: 'DESC' },
  });

  const [statusNames, sourceNames] = await Promise.all([
    statusMap('STATUS'),
    statusMap('SOURCE'),
  ]);

  const managerIds = [...new Set(leads.map((l) => l.ASSIGNED_BY_ID).filter(Boolean))];
  const managerNames = await userNames(managerIds);

  const byStatus = {};
  const bySource = {};
  const byManager = {};
  let converted = 0;
  let junk = 0;

  for (const lead of leads) {
    const statusId = lead.STATUS_ID || 'UNKNOWN';
    const sourceId = lead.SOURCE_ID || 'UNKNOWN';
    const managerId = lead.ASSIGNED_BY_ID || 'UNKNOWN';

    if (!byStatus[statusId]) {
      byStatus[statusId] = { statusId, name: statusNames[statusId] || statusId, count: 0 };
    }
    byStatus[statusId].count += 1;

    if (!bySource[sourceId]) {
      bySource[sourceId] = { sourceId, name: sourceNames[sourceId] || sourceId, count: 0 };
    }
    bySource[sourceId].count += 1;

    const isConverted = statusId === 'CONVERTED';
    // STATUS_SEMANTIC_ID: 'F' = failure/junk (не целевой), 'S' = converted, 'P' = in progress.
    const isJunk = lead.STATUS_SEMANTIC_ID === 'F';

    if (!isExcludedManager(managerId)) {
      if (!byManager[managerId]) {
        byManager[managerId] = {
          managerId,
          name: managerNames[managerId] || managerId,
          company: companyForManager(managerId),
          count: 0,
          qualified: 0,
          converted: 0,
        };
      }
      byManager[managerId].count += 1;
      if (!isJunk) byManager[managerId].qualified += 1;
      if (isConverted) byManager[managerId].converted += 1;
    }

    if (isConverted) converted += 1;
    if (isJunk) junk += 1;
  }

  const byCompany = {};
  for (const m of Object.values(byManager)) {
    byCompany[m.company] = (byCompany[m.company] || 0) + m.count;
  }

  const managersByCompany = Object.values(byManager).sort((a, b) => {
    if (a.company !== b.company) return a.company.localeCompare(b.company);
    return b.count - a.count;
  });

  return {
    days,
    total: leads.length,
    converted,
    qualified: leads.length - junk,
    junk,
    byStatus: Object.values(byStatus).sort((a, b) => b.count - a.count),
    bySource: Object.values(bySource).sort((a, b) => b.count - a.count),
    byManager: managersByCompany,
    byCompany: Object.entries(byCompany)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count),
  };
}

async function getCallsReport(days) {
  const since = daysAgoIso(days);
  const calls = await listAll('voximplant.statistic.get', {
    filter: { '>CALL_START_DATE': since },
    order: { CALL_START_DATE: 'DESC' },
  });

  let totalDuration = 0;
  let missed = 0;
  let incoming = 0;
  let outgoing = 0;
  const byDay = {};

  for (const c of calls) {
    const duration = Number(c.CALL_DURATION) || 0;
    totalDuration += duration;

    const isIncoming = Number(c.CALL_TYPE) === 2;
    if (isIncoming) incoming += 1;
    else outgoing += 1;

    const failed = String(c.CALL_FAILED_CODE) !== '200';
    if (isIncoming && (duration === 0 || failed)) missed += 1;

    const day = dateKey(c.CALL_START_DATE);
    byDay[day] = (byDay[day] || 0) + 1;
  }

  const byDaySorted = Object.entries(byDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({ day, count }));

  return {
    days,
    total: calls.length,
    totalDuration,
    avgDuration: calls.length ? Math.round(totalDuration / calls.length) : 0,
    missed,
    incoming,
    outgoing,
    byDay: byDaySorted,
  };
}

function pct(numerator, denominator) {
  return denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

// Merges the leads and deals manager breakdowns into one per-manager funnel:
// leads in -> qualified -> converted to a deal -> deal won, so a manager's
// whole conversion path is visible in one row instead of two separate reports.
// Takes already-fetched leads/deals reports rather than fetching its own
// copies — callers that already have both (e.g. the dashboard summary,
// which fetches every report in parallel) should pass them in to avoid
// doubling up on Bitrix24 API calls.
function buildConversionReport(days, leads, deals) {
  const managers = {};
  const ensure = (m) => {
    if (!managers[m.managerId]) {
      managers[m.managerId] = { managerId: m.managerId, name: m.name, company: m.company };
    }
    return managers[m.managerId];
  };

  for (const m of leads.byManager) {
    Object.assign(ensure(m), {
      leadsTotal: m.count,
      leadsQualified: m.qualified,
      leadsConverted: m.converted,
    });
  }

  for (const m of deals.byManager) {
    Object.assign(ensure(m), {
      dealsTotal: m.total,
      dealsWon: m.won,
      dealsLost: m.lost,
      wonSum: Math.round(m.wonSum),
    });
  }

  const byManager = Object.values(managers)
    .map((m) => {
      const leadsTotal = m.leadsTotal || 0;
      const leadsQualified = m.leadsQualified || 0;
      const leadsConverted = m.leadsConverted || 0;
      const dealsWon = m.dealsWon || 0;
      const dealsLost = m.dealsLost || 0;

      return {
        ...m,
        leadsTotal,
        leadsQualified,
        leadsConverted,
        dealsTotal: m.dealsTotal || 0,
        dealsWon,
        dealsLost,
        wonSum: m.wonSum || 0,
        leadQualifiedRate: pct(leadsQualified, leadsTotal),
        leadConversionRate: pct(leadsConverted, leadsQualified),
        dealWinRate: pct(dealsWon, dealsWon + dealsLost),
      };
    })
    .sort((a, b) => {
      if (a.company !== b.company) return a.company.localeCompare(b.company);
      return b.leadsTotal - a.leadsTotal;
    });

  return { days, byManager };
}

async function getConversionReport(days) {
  const [leads, deals] = await Promise.all([getLeadsReport(days), getDealsReport(days)]);
  return buildConversionReport(days, leads, deals);
}

module.exports = { getDealsReport, getLeadsReport, getCallsReport, getConversionReport, buildConversionReport };
