const { getStageWaitReport, dealUrl } = require('./stageWaitReport');
const { MEASUREMENT_STAGE_ID } = require('./overdueMeasurements');

function getActiveMeasurements(referenceDate = new Date()) {
  return getStageWaitReport(MEASUREMENT_STAGE_ID, referenceDate);
}

module.exports = { getActiveMeasurements, dealUrl };
