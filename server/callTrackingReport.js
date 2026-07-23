const { listAll } = require('./bitrixClient');
const { extractNumber, companyForNumber } = require('./callTrackingNumbers');

async function getCallTrackingReport(days) {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const leads = await listAll('crm.lead.list', {
    select: ['ID', 'SOURCE_ID', 'SOURCE_DESCRIPTION', 'STATUS_ID', 'DATE_CREATE'],
    filter: { '>=DATE_CREATE': from.toISOString().slice(0, 10), SOURCE_ID: 'CALL' },
  });

  const byNumber = {};
  let unattributed = 0;

  for (const lead of leads) {
    const number = extractNumber(lead.SOURCE_DESCRIPTION);
    const company = number ? companyForNumber(number) : null;
    const key = number || 'без номера (моб. приложение)';

    if (!company) {
      unattributed += 1;
    }

    if (!byNumber[key]) {
      byNumber[key] = { number: key, company: company || 'не определено', total: 0, converted: 0, junk: 0, other: 0 };
    }
    const bucket = byNumber[key];
    bucket.total += 1;
    if (lead.STATUS_ID === 'CONVERTED') bucket.converted += 1;
    else if (lead.STATUS_ID === 'JUNK') bucket.junk += 1;
    else bucket.other += 1;
  }

  const byCompany = {};
  for (const bucket of Object.values(byNumber)) {
    const company = bucket.company === 'не определено' ? 'Не определено' : bucket.company;
    if (!byCompany[company]) byCompany[company] = { company, total: 0, converted: 0, junk: 0, other: 0 };
    byCompany[company].total += bucket.total;
    byCompany[company].converted += bucket.converted;
    byCompany[company].junk += bucket.junk;
    byCompany[company].other += bucket.other;
  }

  return {
    days,
    totalCalls: leads.length,
    unattributed,
    byNumber: Object.values(byNumber).sort((a, b) => b.total - a.total),
    byCompany: Object.values(byCompany).sort((a, b) => b.total - a.total),
  };
}

module.exports = { getCallTrackingReport };
