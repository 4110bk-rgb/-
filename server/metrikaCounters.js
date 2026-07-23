// Yandex.Metrika counter -> company mapping, maintained by hand (same pattern as
// managerCompanies.js — Metrika has no native grouping by business entity).
const COUNTERS = [
  { id: '61779715', name: 'Vorota2.ru (основной)', site: 'Vorota2.ru', company: 'Technoline' },
  { id: '104641689', name: 'vorota2.ru технолайн', site: 'vorota2.ru', company: 'Technoline' },
  { id: '104270006', name: 'Берг сервис розница', site: 'vorota-lip.ru', company: 'Bergservice' },
  { id: '106892336', name: 'vorota-smart.ru', site: 'vorota-smart.ru', company: 'Bergservice' },
];

function countersForCompany(company) {
  return COUNTERS.filter((c) => c.company === company);
}

module.exports = { COUNTERS, countersForCompany };
