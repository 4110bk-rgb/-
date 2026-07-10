const { call, listAll } = require('./bitrixClient');

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

async function userNames(ids) {
  if (!ids.length) return {};
  const users = await listAll('user.get', { filter: { ID: ids } });
  const map = {};
  for (const u of users) {
    map[u.ID] = [u.LAST_NAME, u.NAME].filter(Boolean).join(' ') || u.ID;
  }
  return map;
}

async function getDealsReport(days) {
  const since = daysAgoIso(days);
  const deals = await listAll('crm.deal.list', {
    select: ['ID', 'STAGE_ID', 'CATEGORY_ID', 'OPPORTUNITY', 'CURRENCY_ID', 'DATE_CREATE', 'CLOSED'],
    filter: { '>=DATE_CREATE': since },
    order: { DATE_CREATE: 'DESC' },
  });

  const categoryIds = [...new Set(deals.map((d) => Number(d.CATEGORY_ID) || 0))];
  const stageNames = {};
  for (const catId of categoryIds) {
    const entityId = catId === 0 ? 'DEAL_STAGE' : `DEAL_STAGE_${catId}`;
    Object.assign(stageNames, await statusMap(entityId));
  }

  let totalSum = 0;
  let wonCount = 0;
  let lostCount = 0;
  const byStage = {};

  for (const deal of deals) {
    const sum = Number(deal.OPPORTUNITY) || 0;
    totalSum += sum;

    const stageId = deal.STAGE_ID || 'UNKNOWN';
    if (!byStage[stageId]) {
      byStage[stageId] = { stageId, name: stageNames[stageId] || stageId, count: 0, sum: 0 };
    }
    byStage[stageId].count += 1;
    byStage[stageId].sum += sum;

    if (/WON/i.test(stageId)) wonCount += 1;
    if (/LOSE|LOST/i.test(stageId)) lostCount += 1;
  }

  return {
    days,
    total: deals.length,
    totalSum: Math.round(totalSum),
    currency: deals[0]?.CURRENCY_ID || null,
    wonCount,
    lostCount,
    byStage: Object.values(byStage).sort((a, b) => b.count - a.count),
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

    if (!byManager[managerId]) {
      byManager[managerId] = { managerId, name: managerNames[managerId] || managerId, count: 0 };
    }
    byManager[managerId].count += 1;

    if (statusId === 'CONVERTED') converted += 1;
    // STATUS_SEMANTIC_ID: 'F' = failure/junk (не целевой), 'S' = converted, 'P' = in progress.
    if (lead.STATUS_SEMANTIC_ID === 'F') junk += 1;
  }

  return {
    days,
    total: leads.length,
    converted,
    qualified: leads.length - junk,
    junk,
    byStatus: Object.values(byStatus).sort((a, b) => b.count - a.count),
    bySource: Object.values(bySource).sort((a, b) => b.count - a.count),
    byManager: Object.values(byManager).sort((a, b) => b.count - a.count),
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

module.exports = { getDealsReport, getLeadsReport, getCallsReport };
