const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

const execFileAsync = promisify(execFile);

const API_BASE = 'https://cloud-api.yandex.net/v1/disk';
const BACKUP_DIR = '/backups';
const PROJECT_ROOT = path.join(__dirname, '..');

// Only the project's own code/config — no node_modules, no .git, no assets
// already tracked in the repo (certs/, fonts/).
const BACKUP_PATHS = ['server', '.env', 'package.json', 'package-lock.json', 'public'];

function authHeaders() {
  return { Authorization: `OAuth ${process.env.YANDEX_DISK_TOKEN}` };
}

async function ensureBackupFolder() {
  const res = await fetch(`${API_BASE}/resources?path=${encodeURIComponent(BACKUP_DIR)}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) {
    const putRes = await fetch(`${API_BASE}/resources?path=${encodeURIComponent(BACKUP_DIR)}`, {
      method: 'PUT',
      headers: authHeaders(),
    });
    if (!putRes.ok) {
      throw new Error(`Failed to create ${BACKUP_DIR} on Yandex.Disk: ${putRes.status} ${await putRes.text()}`);
    }
  } else if (!res.ok) {
    throw new Error(`Failed to check ${BACKUP_DIR} on Yandex.Disk: ${res.status} ${await res.text()}`);
  }
}

async function createArchive() {
  const dateStr = new Date().toISOString().slice(0, 10);
  const archiveName = `bitrix24-dashboard-${dateStr}.tar.gz`;
  const archivePath = path.join(os.tmpdir(), archiveName);

  const existingPaths = BACKUP_PATHS.filter((p) => fs.existsSync(path.join(PROJECT_ROOT, p)));
  await execFileAsync('tar', ['-czf', archivePath, '-C', PROJECT_ROOT, ...existingPaths]);

  return { archivePath, archiveName };
}

async function uploadArchive(archivePath, archiveName) {
  const diskPath = `${BACKUP_DIR}/${archiveName}`;

  const uploadUrlRes = await fetch(
    `${API_BASE}/resources/upload?path=${encodeURIComponent(diskPath)}&overwrite=true`,
    { headers: authHeaders() }
  );
  if (!uploadUrlRes.ok) {
    throw new Error(`Failed to get upload URL: ${uploadUrlRes.status} ${await uploadUrlRes.text()}`);
  }
  const { href } = await uploadUrlRes.json();

  const fileData = fs.readFileSync(archivePath);
  const putRes = await fetch(href, { method: 'PUT', body: fileData });
  if (!putRes.ok && putRes.status !== 201) {
    throw new Error(`Upload failed: ${putRes.status} ${await putRes.text()}`);
  }

  return diskPath;
}

async function cleanupOldBackups(keep = 14) {
  const res = await fetch(
    `${API_BASE}/resources?path=${encodeURIComponent(BACKUP_DIR)}&limit=200&sort=-created`,
    { headers: authHeaders() }
  );
  if (!res.ok) return;
  const data = await res.json();
  const items = data._embedded?.items || [];
  const toDelete = items.slice(keep);
  for (const item of toDelete) {
    await fetch(`${API_BASE}/resources?path=${encodeURIComponent(item.path)}&permanently=true`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
  }
}

async function backupToYandexDisk() {
  if (!process.env.YANDEX_DISK_TOKEN) {
    throw new Error('YANDEX_DISK_TOKEN is not set in .env');
  }

  await ensureBackupFolder();
  const { archivePath, archiveName } = await createArchive();
  try {
    const diskPath = await uploadArchive(archivePath, archiveName);
    await cleanupOldBackups();
    return diskPath;
  } finally {
    fs.unlinkSync(archivePath);
  }
}

module.exports = { backupToYandexDisk };

if (require.main === module) {
  backupToYandexDisk()
    .then((diskPath) => console.log(`Backup uploaded to Yandex.Disk: ${diskPath}`))
    .catch((err) => {
      console.error('Backup failed:', err.message);
      process.exit(1);
    });
}
