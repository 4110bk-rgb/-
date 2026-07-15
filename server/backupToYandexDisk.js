const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { ensureFolder, uploadTo, cleanupOld } = require('./yandexDiskClient');

if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
}

const execFileAsync = promisify(execFile);

const BACKUP_DIR = '/backups';
const PROJECT_ROOT = path.join(__dirname, '..');

// Only the project's own code/config — no node_modules, no .git, no assets
// already tracked in the repo (certs/, fonts/).
const BACKUP_PATHS = ['server', '.env', 'package.json', 'package-lock.json', 'public'];

async function createArchive() {
  const dateStr = new Date().toISOString().slice(0, 10);
  const archiveName = `bitrix24-dashboard-${dateStr}.tar.gz`;
  const archivePath = path.join(os.tmpdir(), archiveName);

  const existingPaths = BACKUP_PATHS.filter((p) => fs.existsSync(path.join(PROJECT_ROOT, p)));
  await execFileAsync('tar', ['-czf', archivePath, '-C', PROJECT_ROOT, ...existingPaths]);

  return { archivePath, archiveName };
}

async function backupToYandexDisk() {
  await ensureFolder(BACKUP_DIR);
  const { archivePath, archiveName } = await createArchive();
  try {
    const diskPath = `${BACKUP_DIR}/${archiveName}`;
    await uploadTo(diskPath, fs.readFileSync(archivePath));
    await cleanupOld(BACKUP_DIR, 14);
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
