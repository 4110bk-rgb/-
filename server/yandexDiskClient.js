const API_BASE = 'https://cloud-api.yandex.net/v1/disk';

function authHeaders() {
  if (!process.env.YANDEX_DISK_TOKEN) {
    throw new Error('YANDEX_DISK_TOKEN is not set in .env');
  }
  return { Authorization: `OAuth ${process.env.YANDEX_DISK_TOKEN}` };
}

async function ensureFolder(diskPath) {
  const res = await fetch(`${API_BASE}/resources?path=${encodeURIComponent(diskPath)}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) {
    const putRes = await fetch(`${API_BASE}/resources?path=${encodeURIComponent(diskPath)}`, {
      method: 'PUT',
      headers: authHeaders(),
    });
    if (!putRes.ok) {
      throw new Error(`Failed to create ${diskPath} on Yandex.Disk: ${putRes.status} ${await putRes.text()}`);
    }
  } else if (!res.ok) {
    throw new Error(`Failed to check ${diskPath} on Yandex.Disk: ${res.status} ${await res.text()}`);
  }
}

async function getUploadUrl(diskPath) {
  const res = await fetch(
    `${API_BASE}/resources/upload?path=${encodeURIComponent(diskPath)}&overwrite=true`,
    { headers: authHeaders() }
  );
  if (!res.ok) {
    throw new Error(`Failed to get upload URL for ${diskPath}: ${res.status} ${await res.text()}`);
  }
  const { href } = await res.json();
  return href;
}

async function uploadData(href, data) {
  const res = await fetch(href, { method: 'PUT', body: data });
  if (!res.ok && res.status !== 201) {
    throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  }
}

async function uploadTo(diskPath, data) {
  const href = await getUploadUrl(diskPath);
  await uploadData(href, data);
}

async function listItems(diskPath, { limit = 200, sort = '-created' } = {}) {
  const res = await fetch(
    `${API_BASE}/resources?path=${encodeURIComponent(diskPath)}&limit=${limit}&sort=${sort}`,
    { headers: authHeaders() }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data._embedded?.items || [];
}

async function deleteItem(diskPath) {
  await fetch(`${API_BASE}/resources?path=${encodeURIComponent(diskPath)}&permanently=true`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

// Keeps only the `keep` most recently created items directly inside diskPath.
async function cleanupOld(diskPath, keep) {
  const items = await listItems(diskPath, { limit: 200, sort: '-created' });
  const toDelete = items.slice(keep);
  for (const item of toDelete) {
    await deleteItem(item.path);
  }
}

module.exports = { ensureFolder, getUploadUrl, uploadData, uploadTo, listItems, deleteItem, cleanupOld };
