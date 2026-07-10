// Bitrix24 has no built-in "company" grouping for CRM-responsible users,
// so the manager -> company mapping is maintained here by hand.
// Anyone not listed defaults to Bergservice.
const TECHNOLINE_MANAGER_IDS = new Set([
  '21', // Кирьянова Надежда
  '37', // Путинцева Ирина
  '1', // Главный Администратор
  '15', // Чистозвонова Марина
]);

function companyForManager(managerId) {
  return TECHNOLINE_MANAGER_IDS.has(String(managerId)) ? 'Technoline' : 'Bergservice';
}

module.exports = { companyForManager };
