const WEBHOOK_URL = process.env.BITRIX_WEBHOOK_URL;

if (!WEBHOOK_URL) {
  throw new Error('BITRIX_WEBHOOK_URL is not set. Copy .env.example to .env and fill it in.');
}

const BASE_URL = WEBHOOK_URL.endsWith('/') ? WEBHOOK_URL : `${WEBHOOK_URL}/`;
const PAGE_SIZE = 50;
const MAX_PAGES = 40; // safety cap: up to 2000 records per report

async function call(method, params = {}) {
  const res = await fetch(`${BASE_URL}${method}.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Bitrix24 ${method} error: ${data.error} - ${data.error_description || ''}`);
  }
  return data;
}

// Paginates a Bitrix24 list method (crm.deal.list, crm.lead.list, voximplant.statistic.get, ...)
// until the API stops returning a "next" cursor or the safety cap is hit.
async function listAll(method, params = {}) {
  const items = [];
  let start = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await call(method, { ...params, start });
    const batch = Array.isArray(data.result) ? data.result : data.result?.items || [];
    items.push(...batch);

    if (typeof data.next !== 'number') break;
    start = data.next;
  }

  return items;
}

module.exports = { call, listAll };
