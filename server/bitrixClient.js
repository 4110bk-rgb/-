const WEBHOOK_URL = process.env.BITRIX_WEBHOOK_URL;

if (!WEBHOOK_URL) {
  throw new Error('BITRIX_WEBHOOK_URL is not set. Copy .env.example to .env and fill it in.');
}

const BASE_URL = WEBHOOK_URL.endsWith('/') ? WEBHOOK_URL : `${WEBHOOK_URL}/`;
const MAX_PAGES = 600; // safety cap: up to 30,000 records per report (a year of calls can be 10,000+)

const MAX_RETRIES = 4;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function call(method, params = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}${method}.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      // QUERY_LIMIT_EXCEEDED means the webhook hit Bitrix24's rate limit — worth
      // retrying with backoff; other Bitrix errors (bad params, missing scope) won't
      // resolve themselves, so fail immediately.
      if (data.error === 'QUERY_LIMIT_EXCEEDED' && attempt < MAX_RETRIES) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      if (data.error) {
        throw new Error(`Bitrix24 ${method} error: ${data.error} - ${data.error_description || ''}`);
      }
      return data;
    } catch (err) {
      // Transient network failures (the sandboxed egress path can drop long-running
      // connections) are retried; anything else (including the Bitrix error thrown above) is not.
      if (err.message.startsWith('Bitrix24 ') || attempt === MAX_RETRIES) throw err;
      lastErr = err;
      await sleep(500 * 2 ** attempt);
    }
  }
  throw lastErr;
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

async function userNames(ids) {
  if (!ids.length) return {};
  const users = await listAll('user.get', { filter: { ID: ids } });
  const map = {};
  for (const u of users) {
    map[u.ID] = [u.LAST_NAME, u.NAME].filter(Boolean).join(' ') || u.ID;
  }
  return map;
}

module.exports = { call, listAll, userNames };
