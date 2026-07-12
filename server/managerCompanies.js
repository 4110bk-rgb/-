// Bitrix24 has no built-in "company" grouping for CRM-responsible users,
// so the manager -> company mapping is maintained here by hand.
// Anyone not listed defaults to Bergservice.
const TECHNOLINE_MANAGER_IDS = new Set([
  '21', // Кирьянова Надежда
  '37', // Путинцева Ирина
  '15', // Чистозвонова Марина
]);

// Excluded from the by-manager/by-company breakdown: heads/leadership and
// routing/technical accounts, not rank-and-file lead handlers, so their
// leads/calls shouldn't be counted against a manager's workload.
const EXCLUDED_MANAGER_IDS = new Set([
  '17', // Чистозвонов Дмитрий — руководитель, не участвует в разбивке
  '61', // Center Call — техническая учётная запись call-центра, не менеджер
  '1', // Главный Администратор — точка входа лидов, реальные сотрудники разбирают их себе
  '55', // РОП РОП — то же самое, входящая линия/очередь, не сотрудник
]);

function companyForManager(managerId) {
  return TECHNOLINE_MANAGER_IDS.has(String(managerId)) ? 'Technoline' : 'Bergservice';
}

function isExcludedManager(managerId) {
  return EXCLUDED_MANAGER_IDS.has(String(managerId));
}

module.exports = { companyForManager, isExcludedManager };
