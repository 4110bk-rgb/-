// Bitrix24 has no built-in "company" grouping for CRM-responsible users,
// so the manager -> company mapping is maintained here by hand.
// Anyone not listed defaults to Bergservice.
const TECHNOLINE_MANAGER_IDS = new Set([
  '21', // Кирьянова Надежда
  '37', // Путинцева Ирина
  '1', // Главный Администратор
  '15', // Чистозвонова Марина
]);

// Excluded from the by-manager/by-company breakdown: heads/leadership who
// aren't rank-and-file lead handlers, so their leads shouldn't be counted
// against a manager's workload.
const EXCLUDED_MANAGER_IDS = new Set([
  '17', // Чистозвонов Дмитрий — руководитель, не участвует в разбивке
]);

function companyForManager(managerId) {
  return TECHNOLINE_MANAGER_IDS.has(String(managerId)) ? 'Technoline' : 'Bergservice';
}

function isExcludedManager(managerId) {
  return EXCLUDED_MANAGER_IDS.has(String(managerId));
}

module.exports = { companyForManager, isExcludedManager };
