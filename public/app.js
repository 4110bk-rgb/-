const REFRESH_MS = 15000;
const tooltip = document.getElementById('tooltip');

function formatCompact(n) {
  return new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} мин ${s} сек`;
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function showTooltip(evt, text) {
  tooltip.textContent = text;
  tooltip.style.opacity = '1';
  tooltip.style.left = `${evt.pageX + 12}px`;
  tooltip.style.top = `${evt.pageY - 12}px`;
}

function hideTooltip() {
  tooltip.style.opacity = '0';
}

function statTiles(items) {
  const wrap = el('div', 'tiles');
  for (const { label, value } of items) {
    const tile = el('div', 'tile');
    tile.appendChild(el('div', 'label', label));
    tile.appendChild(el('div', 'value', value));
    wrap.appendChild(tile);
  }
  return wrap;
}

// Horizontal bar list: one measure across categories, direct value label at the tip.
function barList(rows, color) {
  const wrap = el('div');
  const max = Math.max(1, ...rows.map((r) => r.value));

  for (const row of rows) {
    const line = el('div');
    line.style.display = 'grid';
    line.style.gridTemplateColumns = '120px 1fr 56px';
    line.style.alignItems = 'center';
    line.style.gap = '10px';
    line.style.marginBottom = '6px';

    const label = el('div', 'bar-label', row.label);
    label.style.overflow = 'hidden';
    label.style.textOverflow = 'ellipsis';
    label.style.whiteSpace = 'nowrap';

    const track = el('div');
    track.style.height = '16px';
    track.style.position = 'relative';

    const bar = el('div');
    const pct = Math.max(2, (row.value / max) * 100);
    bar.style.height = '100%';
    bar.style.width = `${pct}%`;
    bar.style.background = color;
    bar.style.borderRadius = '0 4px 4px 0';
    bar.addEventListener('mousemove', (e) => showTooltip(e, `${row.label}: ${row.value.toLocaleString('ru-RU')}`));
    bar.addEventListener('mouseleave', hideTooltip);
    track.appendChild(bar);

    const value = el('div', 'bar-value', row.value.toLocaleString('ru-RU'));

    line.appendChild(label);
    line.appendChild(track);
    line.appendChild(value);
    wrap.appendChild(line);
  }
  return wrap;
}

// Line + area chart for calls per day.
function lineChart(points, color) {
  const width = 560;
  const height = 180;
  const padding = { top: 10, right: 10, bottom: 24, left: 32 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...points.map((p) => p.count));

  const x = (i) => padding.left + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
  const y = (v) => padding.top + innerH - (v / max) * innerH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.count)}`).join(' ');
  const areaPath = `${linePath} L ${x(points.length - 1)} ${padding.top + innerH} L ${x(0)} ${padding.top + innerH} Z`;

  const gridLines = [0, 0.5, 1].map((f) => {
    const gy = padding.top + innerH * (1 - f);
    return `<line x1="${padding.left}" x2="${width - padding.right}" y1="${gy}" y2="${gy}" stroke="var(--gridline)" stroke-width="1" />
      <text x="${padding.left - 6}" y="${gy + 4}" text-anchor="end" class="bar-value" font-size="10">${Math.round(max * f).toLocaleString('ru-RU')}</text>`;
  }).join('');

  const dots = points.map((p, i) => `
    <circle cx="${x(i)}" cy="${y(p.count)}" r="4" fill="${color}" stroke="var(--surface-1)" stroke-width="2"
      data-label="${p.day}" data-value="${p.count}" class="dot" />
  `).join('');

  const dayLabels = points.map((p, i) => {
    if (points.length > 8 && i % Math.ceil(points.length / 8) !== 0) return '';
    return `<text x="${x(i)}" y="${height - 6}" text-anchor="middle" class="bar-label" font-size="10">${p.day.slice(5)}</text>`;
  }).join('');

  const svg = el('div');
  svg.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
      ${gridLines}
      <path d="${areaPath}" fill="${color}" opacity="0.1" stroke="none" />
      <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      ${dots}
      ${dayLabels}
    </svg>`;

  svg.querySelectorAll('.dot').forEach((dot) => {
    dot.addEventListener('mousemove', (e) => showTooltip(e, `${dot.dataset.label}: ${Number(dot.dataset.value).toLocaleString('ru-RU')} звонков`));
    dot.addEventListener('mouseleave', hideTooltip);
  });

  return svg;
}

function renderDeals(result) {
  const body = document.getElementById('deals-body');
  body.innerHTML = '';

  if (!result.ok) {
    body.appendChild(el('div', 'panel-error', `Не удалось получить данные: ${result.error}`));
    return;
  }

  const d = result.data;
  body.appendChild(statTiles([
    { label: `Сделок за ${d.days} дн.`, value: d.total.toLocaleString('ru-RU') },
    { label: 'Сумма', value: `${formatCompact(d.totalSum)} ${d.currency || ''}` },
    { label: 'Выиграно', value: d.wonCount.toLocaleString('ru-RU') },
    { label: 'Проиграно', value: d.lostCount.toLocaleString('ru-RU') },
  ]));

  const chartBlock = el('div', 'chart-block');
  chartBlock.appendChild(el('h3', null, 'По стадиям'));
  chartBlock.appendChild(barList(d.byStage.map((s) => ({ label: s.name, value: s.count })), 'var(--series-1)'));
  body.appendChild(chartBlock);
}

function renderLeads(result) {
  const body = document.getElementById('leads-body');
  body.innerHTML = '';

  if (!result.ok) {
    body.appendChild(el('div', 'panel-error', `Не удалось получить данные: ${result.error}`));
    return;
  }

  const d = result.data;
  body.appendChild(statTiles([
    { label: `Лидов за ${d.days} дн.`, value: d.total.toLocaleString('ru-RU') },
    { label: 'Конвертировано', value: d.converted.toLocaleString('ru-RU') },
    { label: 'Конверсия', value: d.total ? `${Math.round((d.converted / d.total) * 100)}%` : '—' },
  ]));

  const row = el('div', 'charts-row');

  const statusBlock = el('div', 'chart-block');
  statusBlock.appendChild(el('h3', null, 'По статусу'));
  statusBlock.appendChild(barList(d.byStatus.map((s) => ({ label: s.name, value: s.count })), 'var(--series-4)'));
  row.appendChild(statusBlock);

  const sourceBlock = el('div', 'chart-block');
  sourceBlock.appendChild(el('h3', null, 'По источнику'));
  sourceBlock.appendChild(barList(d.bySource.map((s) => ({ label: s.name, value: s.count })), 'var(--series-2)'));
  row.appendChild(sourceBlock);

  body.appendChild(row);
}

function renderCalls(result) {
  const body = document.getElementById('calls-body');
  body.innerHTML = '';

  if (!result.ok) {
    body.appendChild(el('div', 'panel-error', `Не удалось получить данные: ${result.error}. Проверьте, что у вебхука включён доступ к телефонии (voximplant).`));
    return;
  }

  const d = result.data;
  body.appendChild(statTiles([
    { label: `Звонков за ${d.days} дн.`, value: d.total.toLocaleString('ru-RU') },
    { label: 'Пропущено', value: d.missed.toLocaleString('ru-RU') },
    { label: 'Входящие / исходящие', value: `${d.incoming} / ${d.outgoing}` },
    { label: 'Средняя длительность', value: formatDuration(d.avgDuration) },
  ]));

  const chartBlock = el('div', 'chart-block');
  chartBlock.appendChild(el('h3', null, 'Звонков в день'));
  chartBlock.appendChild(lineChart(d.byDay, 'var(--series-1)'));
  body.appendChild(chartBlock);
}

async function sendLeadsReportToMax() {
  const chatId = window.prompt('ID чата MAX, куда отправить отчёт по лидам:');
  if (!chatId) return;

  const button = document.getElementById('send-leads-to-max');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Отправка…';

  try {
    const res = await fetch('/api/leads-report/send-to-max', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: Number(chatId) }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
    button.textContent = 'Отправлено ✓';
  } catch (err) {
    window.alert(`Не удалось отправить отчёт: ${err.message}`);
    button.textContent = originalLabel;
  } finally {
    button.disabled = false;
    setTimeout(() => { button.textContent = originalLabel; }, 3000);
  }
}

document.getElementById('send-leads-to-max').addEventListener('click', sendLeadsReportToMax);

async function refresh() {
  const statusEl = document.getElementById('status');
  try {
    const res = await fetch('/api/summary');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    renderDeals(data.deals);
    renderLeads(data.leads);
    renderCalls(data.calls);

    statusEl.textContent = `Обновлено: ${new Date(data.generatedAt).toLocaleTimeString('ru-RU')}`;
    statusEl.classList.remove('stale');
  } catch (err) {
    statusEl.textContent = `Ошибка обновления: ${err.message}`;
    statusEl.classList.add('stale');
  }
}

refresh();
setInterval(refresh, REFRESH_MS);
