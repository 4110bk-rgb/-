function formatDaysRu(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${n} ${few}`;
  return `${n} ${many}`;
}

// 🟢 just started waiting, 🟡 getting stale, 🔴 waiting too long — all in business days.
function waitStatusEmoji(waitingDays) {
  if (waitingDays === null) return '';
  if (waitingDays > 5) return '🔴 ';
  if (waitingDays >= 3) return '🟡 ';
  return '🟢 ';
}

function formatDeal(d, waitLabel) {
  const mark = d.urgent ? '! ' : '';
  const lines = [`${waitStatusEmoji(d.waitingDays)}${mark}«${d.title}» — ${d.url}`, `  Менеджер: ${d.manager}`];

  if (d.waitingDays !== null) {
    lines.push(`  ${waitLabel}: ${formatDaysRu(d.waitingDays, 'рабочий день', 'рабочих дня', 'рабочих дней')}`);
  }

  if (d.address) {
    lines.push(`  Адрес: [${d.address.text}](${d.address.mapUrl})`);
  }
  if (d.phones.length) {
    lines.push(`  Телефон: ${d.phones.map((p) => `[${p}](tel:${p.replace(/[^\d+]/g, '')})`).join(', ')}`);
  }

  if (d.dateStatus === 'today') {
    lines.push(`  Договорились на сегодня (${d.mentionedDate})`);
  } else if (d.dateStatus === 'overdue') {
    lines.push(
      `  ⚠️ Договаривались на ${d.mentionedDate}, просрочено на ${formatDaysRu(d.daysOverdue, 'день', 'дня', 'дней')} — нужно передоговориться с клиентом`,
    );
  } else if (d.dateStatus === 'scheduled') {
    lines.push(`  Запланировано на ${d.mentionedDate}`);
  }

  return lines.join('\n');
}

// listLabel: "Актуальные замеры" / "Актуальные ремонты"
// waitLabel: "Ждёт замера" / "Ждёт ремонта"
// emptyText: shown when the stage has no deals
function formatStageWaitReport(items, { listLabel, waitLabel, emptyText }) {
  if (!items.length) return emptyText;

  const lines = [`${listLabel} (${items.length}):`, ''];
  for (const d of items) {
    lines.push(formatDeal(d, waitLabel), '');
  }
  return lines.join('\n').trim();
}

// Same content as formatStageWaitReport, but split into several messages
// that each stay under MAX's per-message length limit (4000 chars) — the
// address/phone lines make a single deal block noticeably longer than the
// list used to be, so one long report can now tip over that limit.
function chunkStageWaitReport(items, { listLabel, waitLabel, emptyText }, limit = 3500) {
  if (!items.length) return [emptyText];

  const header = `${listLabel} (${items.length}):`;
  const chunks = [];
  let current = [header, ''];
  let currentLen = header.length;

  for (const d of items) {
    const block = formatDeal(d, waitLabel);
    if (currentLen + block.length > limit && current.length > 2) {
      chunks.push(current.join('\n').trim());
      current = [`${header} — продолжение`, ''];
      currentLen = current[0].length;
    }
    current.push(block, '');
    currentLen += block.length + 2;
  }
  chunks.push(current.join('\n').trim());
  return chunks;
}

module.exports = { formatStageWaitReport, chunkStageWaitReport, formatDaysRu };
