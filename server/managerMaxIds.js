// Bitrix24 manager full name ("ФАМИЛИЯ Имя", same format as
// bitrixClient.userNames()) -> their MAX user_id, found by matching names
// against the members of the "ТЛ+Берг" / "ТЛ | Общий чат" MAX chats.
// A manager missing here just doesn't get @mentioned — falls back to
// plain text — until their MAX ID is added.
const MANAGER_MAX_IDS = {
  'Чистозвонова Марина': 45008227,
  'Кирьянова Надежда': 50087257,
  'Путинцева Ирина': 27145253,
  // Shared office account "Ворота смарт Алютех Липецк", not a personal
  // profile — confirmed by the user as the account Гулякина Валерия uses.
  'Гулякина Валерия': 112976140,
};

// MAX mentions are a markdown link to max://user/<id> — max://user/name
// itself renders no differently from plain text without the ID.
function mentionManager(name) {
  const id = MANAGER_MAX_IDS[name];
  return id ? `[${name}](max://user/${id})` : name;
}

module.exports = { MANAGER_MAX_IDS, mentionManager };
