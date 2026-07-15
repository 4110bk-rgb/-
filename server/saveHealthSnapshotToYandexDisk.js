const fs = require('fs');
const { ensureFolder, uploadTo, cleanupOld } = require('./yandexDiskClient');
const { generateEfficiencyPdf } = require('./generateEfficiencyPdf');

const SNAPSHOT_DIR = '/health-reports';

// Saves one dashboard "health check" — the report request and its results,
// plus the human-readable efficiency PDF — into its own dated subfolder, so
// it can later be reviewed as a standalone snapshot in time.
async function saveHealthSnapshotToYandexDisk({ days, reports }) {
  await ensureFolder(SNAPSHOT_DIR);

  const now = new Date();
  const folderName = now.toISOString().replace(/[:.]/g, '-');
  const folderPath = `${SNAPSHOT_DIR}/${folderName}`;
  await ensureFolder(folderPath);

  const summary = {
    request: { days, requestedAt: now.toISOString() },
    result: reports,
  };
  await uploadTo(`${folderPath}/summary.json`, Buffer.from(JSON.stringify(summary, null, 2)));

  const pdfPath = await generateEfficiencyPdf(days);
  try {
    await uploadTo(`${folderPath}/efficiency-report.pdf`, fs.readFileSync(pdfPath));
  } finally {
    fs.unlink(pdfPath, () => {});
  }

  await cleanupOld(SNAPSHOT_DIR, 60);

  return folderPath;
}

module.exports = { saveHealthSnapshotToYandexDisk };
