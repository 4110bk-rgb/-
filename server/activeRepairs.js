const { getStageWaitReport, dealUrl } = require('./stageWaitReport');

const REPAIR_STAGE_ID = 'C5:NEW'; // "Ждёт ремонт"

function getActiveRepairs(referenceDate = new Date()) {
  return getStageWaitReport(REPAIR_STAGE_ID, referenceDate);
}

module.exports = { getActiveRepairs, dealUrl, REPAIR_STAGE_ID };
