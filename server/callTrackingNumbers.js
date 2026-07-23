// Phone number -> company mapping, maintained by hand (same pattern as
// managerCompanies.js / metrikaCounters.js). These are the numbers shown on
// each company's site/listings; SOURCE_DESCRIPTION on CALL-source leads
// records which number the customer dialed.
const NUMBER_COMPANY = {
  '+74742371357': 'Technoline', // сайт vorota2.ru
  '+74742201950': 'Bergservice',
  '+74742200918': 'Bergservice',
};

function extractNumber(sourceDescription) {
  const m = (sourceDescription || '').match(/номер: (\+?\d[\d\s\-()]*)\./);
  return m ? m[1].trim() : null;
}

function companyForNumber(number) {
  return NUMBER_COMPANY[number] || null;
}

module.exports = { NUMBER_COMPANY, extractNumber, companyForNumber };
