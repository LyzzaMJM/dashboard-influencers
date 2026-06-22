/* ═══════════════════════════════════════════════════════════════
   VOLUNTEER OS — app.js
   Pure frontend. No backend required.
   Modules: Navigation | Calendar (Notion) | Discipline | 
            Schedules | Productivity (Google Sheets) | Charts
═══════════════════════════════════════════════════════════════ */

'use strict';

/* ───────────────────────────────────────────────
   CONFIG & CONSTANTS
─────────────────────────────────────────────── */
const VOLUNTEERS = [
  { id: 'v1', name: 'Maricielo Sanjinez',             initials: 'MS', role: 'Voluntaria', avatarIdx: 0 },
  { id: 'v2', name: 'Angelí Silvana Cardenas Pachas', initials: 'AS', role: 'Voluntaria', avatarIdx: 1 },
  { id: 'v3', name: 'Anyelí Avalos',                  initials: 'AA', role: 'Voluntaria', avatarIdx: 2 },
  { id: 'v4', name: 'Francisco Toledo',               initials: 'FT', role: 'Voluntario', avatarIdx: 3 },
  { id: 'v5', name: 'Angie Morales Mechato',          initials: 'AM', role: 'Voluntaria', avatarIdx: 4 },
];

const DAILY_GOAL   = 80;
const WEEKLY_GOAL  = 400;
const DAYS_ABBR    = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DAYS_FULL    = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MONTHS_ES    = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1R1wxzm9EmdnzYDwHNS4JIqI3hqyjjtGo-iJnoV1HaCM/export?format=csv&gid=1048433770';
const CORS_PROXY    = 'https://corsproxy.io/?';

/* ───────────────────────────────────────────────
   APPLICATION STATE
─────────────────────────────────────────────── */
const state = {
  /* Discipline: { [volunteerId]: { reds, ambers, greens, history: [...] } } */
  discipline: {},
  /* Schedules: { [volunteerId]: { shifts, attendance: { [dateStr]: status } } } */
  schedules: {},
  /* Productivity data from sheets */
  productivity: {},
  /* Calendar events */
  calEvents: [],
  /* UI state */
  calYear: new Date().getFullYear(),
  calMonth: new Date().getMonth(),
  schedWeekOffset: 0,
  charts: {},
};

/* ───────────────────────────────────────────────
   SEED DATA (used when real APIs unavailable)
─────────────────────────────────────────────── */
function seedState() {
  const today = new Date();

  VOLUNTEERS.forEach((v, i) => {
    // Discipline
    const reds   = Math.floor(Math.random() * 2);
    const ambers = Math.floor(Math.random() * 3);
    const greens = 5 - reds - ambers;
    state.discipline[v.id] = {
      reds, ambers, greens,
      history: generateSanctionHistory(v.id, reds, ambers, greens),
    };

    // Schedules
    const shifts = [
      { start: '09:00', end: '13:00', label: 'Mañana' },
      ...(i % 2 === 0 ? [{ start: '15:00', end: '19:00', label: 'Tarde' }] : []),
    ];
    state.schedules[v.id] = { shifts, attendance: generateAttendance(today) };

    // Productivity
    state.productivity[v.id] = { contacts: generateContactHistory(today) };
  });

  // Seed Notion-like calendar events
  state.calEvents = generateCalendarEvents(today.getFullYear(), today.getMonth());
}

function generateSanctionHistory(vid, reds, ambers, greens) {
  const history = [];
  const reasons = {
    roja:    ['Sin registros del día', 'Ausencia sin justificación', 'Falta grave reportada'],
    amarilla:['Baja actividad (15% meta)', 'Solo 12 contactos registrados', 'Actividad incompleta'],
    verde:   ['Meta cumplida 100%', 'Excelente jornada', 'Superó la meta diaria'],
  };
  const now = new Date();
  let dayOffset = 1;
  for (let r = 0; r < reds;   r++) { history.push(mkRecord(vid, 'roja',    now, dayOffset++, reasons.roja));    }
  for (let a = 0; a < ambers; a++) { history.push(mkRecord(vid, 'amarilla', now, dayOffset++, reasons.amarilla)); }
  for (let g = 0; g < greens; g++) { history.push(mkRecord(vid, 'verde',    now, dayOffset++, reasons.verde));    }
  return history.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function mkRecord(vid, type, now, offset, reasons) {
  const d = new Date(now); d.setDate(d.getDate() - offset);
  return {
    id: `${vid}-${Date.now()}-${Math.random()}`,
    vid,
    type,
    date: fmtDate(d),
    note: reasons[Math.floor(Math.random() * reasons.length)],
  };
}

function generateAttendance(today) {
  const att = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow === 0) { att[fmtDate(d)] = 'off'; continue; }
    const r = Math.random();
    att[fmtDate(d)] = r < .65 ? 'present' : r < .8 ? 'late' : r < .92 ? 'absent' : 'off';
  }
  return att;
}

function generateContactHistory(today) {
  const contacts = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const dow = d.getDay();
    if (dow === 0) { contacts[fmtDate(d)] = 0; continue; }
    const r = Math.random();
    contacts[fmtDate(d)] = r < .1 ? 0 : r < .25 ? Math.floor(r * 100) : Math.floor(60 + r * 60);
  }
  return contacts;
}

function generateCalendarEvents(year, month) {
  const events = [];
  const types  = [
    { type: 'news',     label: 'Publicación de noticias', color: 'green' },
    { type: 'activity', label: 'Actividad del equipo',    color: 'blue'  },
    { type: 'reminder', label: 'Recordatorio importante', color: 'amber' },
    { type: 'critical', label: 'Pendiente crítico',       color: 'red'   },
  ];
  const titles = {
    news:     ['Newsletter mensual','Reporte semanal publicado','Comunicado al equipo','Actualización de novedades'],
    activity: ['Reunión de equipo','Capacitación virtual','Revisión de metas','Jornada de voluntariado'],
    reminder: ['Entrega de informes','Cierre de semana','Evaluación de desempeño','Renovación de compromisos'],
    critical: ['Urgente: meta no cumplida','Seguimiento pendiente','Alerta de bajo rendimiento','Revisión disciplinaria'],
  };
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const eventDays   = new Set();
  while (eventDays.size < Math.min(12, daysInMonth)) {
    eventDays.add(Math.floor(Math.random() * daysInMonth) + 1);
  }
  eventDays.forEach(day => {
    const numEvents = Math.floor(Math.random() * 2) + 1;
    for (let n = 0; n < numEvents; n++) {
      const t = types[Math.floor(Math.random() * types.length)];
      const titleArr = titles[t.type];
      events.push({
        id:    `ev-${year}-${month}-${day}-${n}`,
        date:  `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,
        title: titleArr[Math.floor(Math.random() * titleArr.length)],
        type:  t.type,
        label: t.label,
        color: t.color,
        note:  'Evento generado localmente. Conecte su token de Notion para ver datos reales.',
      });
    }
  });
  return events;
}

/* ───────────────────────────────────────────────
   UTILITIES
─────────────────────────────────────────────── */
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseDateStr(str) {
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatDisplay(dateStr) {
  const d = parseDateStr(dateStr);
  return `${DAYS_FULL[d.getDay()]} ${d.getDate()} de ${MONTHS_ES[d.getMonth()]}`;
}
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function getVolunteerStatus(vid) {
  const d = state.discipline[vid];
  if (!d) return 'active';
  if (d.reds >= 2) return 'risk';
  if (d.ambers >= 2) return 'warned';
  if (d.reds >= 1) return 'warned';
  return 'active';
}
function getStatusLabel(s) {
  return { active: 'Activo', warned: 'Advertido', risk: 'Riesgo de expulsión' }[s] || s;
}
function getStatusBadgeClass(s) {
  return { active: 'dsb-active', warned: 'dsb-warning', risk: 'dsb-risk' }[s] || '';
}
function getVolunteerContacts(vid, period = 'today') {
  const c = state.productivity[vid]?.contacts || {};
  const today = fmtDate(new Date());
  if (period === 'today')  return c[today] || 0;
  if (period === 'week')   return getLast7Days().reduce((a,d) => a + (c[d]||0), 0);
  if (period === 'month')  return Object.values(c).reduce((a,v) => a + v, 0);
  return 0;
}
function getLast7Days() {
  return Array.from({length: 7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - i); return fmtDate(d);
  });
}

/* ───────────────────────────────────────────────
   TOAST NOTIFICATIONS
─────────────────────────────────────────────── */
function toast(msg, type = 'info', duration = 3500) {
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>',
  };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `${icons[type] || icons.info}<span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, duration);
}

/* ───────────────────────────────────────────────
   NAVIGATION
─────────────────────────────────────────────── */
const sectionTitles = {
  dashboard:   'Dashboard General',
  calendar:    'Calendario Notion',
  discipline:  'Sistema de Disciplina',
  schedules:   'Control de Horarios',
  productivity:'Productividad & Métricas',
};

function navigate(sectionId) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.section === sectionId));
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === `section-${sectionId}`));
  document.getElementById('pageTitle').textContent = sectionTitles[sectionId] || sectionId;
}

/* ───────────────────────────────────────────────
   MODULE: DASHBOARD
─────────────────────────────────────────────── */
function renderDashboard() {
  renderAlerts();
  renderGlobalMetrics();
  renderVolunteerCards();
  renderDisciplineOverview();
  renderCharts();
}

function renderAlerts() {
  const banner = document.getElementById('alertsBanner');
  const alerts = [];

  VOLUNTEERS.forEach(v => {
    const status = getVolunteerStatus(v.id);
    const d = state.discipline[v.id];
    if (status === 'risk') {
      alerts.push({ type: 'red', msg: `🔴 ${v.name} — Riesgo de expulsión (${d.reds} rojas acumuladas este mes)` });
    } else if (status === 'warned') {
      alerts.push({ type: 'amber', msg: `🟡 ${v.name} — Advertencia formal emitida` });
    }
    const today = getVolunteerContacts(v.id, 'today');
    if (today === 0) alerts.push({ type: 'red', msg: `⚠️ ${v.name} — Sin registros hoy. Amonestación roja pendiente.` });
  });

  if (!alerts.length) {
    alerts.push({ type: 'green', msg: '✅ Sin alertas críticas activas. El equipo está en buen estado.' });
  }

  const iconSvg = (t) => t === 'red'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`
    : t === 'amber'
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;

  banner.innerHTML = alerts.map(a =>
    `<div class="alert-item alert-${a.type}">${iconSvg(a.type)}<span>${a.msg}</span></div>`
  ).join('');
}

function renderGlobalMetrics() {
  const todayContacts = VOLUNTEERS.reduce((a,v) => a + getVolunteerContacts(v.id,'today'), 0);
  const weekContacts  = VOLUNTEERS.reduce((a,v) => a + getVolunteerContacts(v.id,'week'), 0);
  const monthContacts = VOLUNTEERS.reduce((a,v) => a + getVolunteerContacts(v.id,'month'), 0);
  const alerts        = VOLUNTEERS.filter(v => getVolunteerStatus(v.id) !== 'active').length;

  el('metricToday').textContent    = todayContacts.toLocaleString();
  el('metricTodayPct').textContent = `de ${(VOLUNTEERS.length * DAILY_GOAL).toLocaleString()} meta`;
  el('metricWeek').textContent     = weekContacts.toLocaleString();
  el('metricWeekPct').textContent  = `de ${(VOLUNTEERS.length * WEEKLY_GOAL).toLocaleString()} meta`;
  el('metricMonth').textContent    = monthContacts.toLocaleString();
  el('metricMonthPct').textContent = `contactos este mes`;
  el('metricAlerts').textContent   = alerts;
}

function renderVolunteerCards() {
  const container = document.getElementById('volunteerCards');
  container.innerHTML = VOLUNTEERS.map((v, i) => {
    const contacts    = getVolunteerContacts(v.id, 'today');
    const pct         = Math.min(100, Math.round((contacts / DAILY_GOAL) * 100));
    const fillClass   = pct === 0 ? 'fill-red' : pct < 30 ? 'fill-amber' : 'fill-green';
    const cardClass   = pct === 0 ? 'status-red' : pct < 30 ? 'status-amber' : 'status-green';
    const semRed      = pct === 0;
    const semAmber    = pct > 0 && pct < 30;
    const semGreen    = pct >= 80;
    const d           = state.discipline[v.id] || {};
    const weekTotal   = getVolunteerContacts(v.id, 'week');
    const status      = getVolunteerStatus(v.id);

    return `
    <div class="vol-card ${cardClass}">
      <div class="vol-card-top">
        <div class="vol-avatar av-${v.avatarIdx}">${v.initials}</div>
        <div class="vol-info">
          <div class="vol-name" title="${v.name}">${v.name}</div>
          <div class="vol-role">${v.role}</div>
        </div>
        <div class="semaphore">
          <div class="sem-light sem-red   ${semRed   ? 'active' : ''}"></div>
          <div class="sem-light sem-amber ${semAmber ? 'active' : ''}"></div>
          <div class="sem-light sem-green ${semGreen ? 'active' : ''}"></div>
        </div>
      </div>
      <div class="vol-progress-bar">
        <div class="progress-label">
          <span>Progreso hoy</span>
          <span>${pct}% — ${contacts} / ${DAILY_GOAL}</span>
        </div>
        <div class="progress-track"><div class="progress-fill ${fillClass}" style="width:${pct}%"></div></div>
      </div>
      <div class="vol-stats">
        <div class="vol-stat">
          <div class="stat-value">${contacts}</div>
          <div class="stat-label">Hoy</div>
        </div>
        <div class="vol-stat">
          <div class="stat-value">${weekTotal}</div>
          <div class="stat-label">Semana</div>
        </div>
        <div class="vol-stat">
          <div class="stat-value">${getVolunteerContacts(v.id,'month')}</div>
          <div class="stat-label">Mes</div>
        </div>
      </div>
      <div class="vol-badges">
        <span class="badge badge-red">🔴 ${d.reds || 0} rojas</span>
        <span class="badge badge-amber">🟡 ${d.ambers || 0} amarillas</span>
        <span class="badge ${status === 'active' ? 'badge-green' : status === 'warned' ? 'badge-amber' : 'badge-red'}">${getStatusLabel(status)}</span>
      </div>
    </div>`;
  }).join('');
}

function renderDisciplineOverview() {
  const container = document.getElementById('disciplineOverview');
  container.innerHTML = VOLUNTEERS.map(v => {
    const d = state.discipline[v.id] || {};
    const status = getVolunteerStatus(v.id);
    return `
    <div class="disc-mini">
      <div class="disc-mini-name">${v.name}</div>
      <div class="disc-mini-row"><span>Rojas</span><span class="val-red">${d.reds || 0}</span></div>
      <div class="disc-mini-row"><span>Amarillas</span><span class="val-amber">${d.ambers || 0}</span></div>
      <div class="disc-mini-row"><span>Verdes</span><span class="val-green">${d.greens || 0}</span></div>
      <div class="disc-mini-row"><span>Estado</span>
        <span class="${status === 'active' ? 'val-green' : status === 'warned' ? 'val-amber' : 'val-red'}">${getStatusLabel(status)}</span>
      </div>
    </div>`;
  }).join('');
}

function renderCharts() {
  // Destroy old charts
  Object.values(state.charts).forEach(c => { try { c.destroy(); } catch(_){} });
  state.charts = {};

  const ctxRanking = document.getElementById('chartRanking')?.getContext('2d');
  const ctxGoals   = document.getElementById('chartGoals')?.getContext('2d');

  if (!ctxRanking || !ctxGoals) return;

  const labels    = VOLUNTEERS.map(v => v.name.split(' ')[0]);
  const totalData = VOLUNTEERS.map(v => getVolunteerContacts(v.id, 'month'));
  const pctData   = VOLUNTEERS.map(v => Math.min(100, Math.round((getVolunteerContacts(v.id,'today') / DAILY_GOAL) * 100)));
  const colors    = ['#6366f1','#06b6d4','#f43f5e','#f59e0b','#10b981'];

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#9ba8c8', font: { size: 11 } } },
      tooltip: { backgroundColor: '#1e2740', titleColor: '#e8ecf4', bodyColor: '#9ba8c8', borderColor: '#2e3d63', borderWidth: 1 },
    },
    scales: {
      x: { ticks: { color: '#6b7ba4', font: { size: 10 } }, grid: { color: 'rgba(46,61,99,.4)' } },
      y: { ticks: { color: '#6b7ba4', font: { size: 10 } }, grid: { color: 'rgba(46,61,99,.4)' } },
    },
  };

  state.charts.ranking = new Chart(ctxRanking, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Contactos Mes',
        data: totalData,
        backgroundColor: colors.map(c => c + '99'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: { ...chartDefaults },
  });

  state.charts.goals = new Chart(ctxGoals, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: '% Cumplimiento',
        data: pctData,
        backgroundColor: 'rgba(59,130,246,.2)',
        borderColor: '#3b82f6',
        pointBackgroundColor: colors,
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: chartDefaults.plugins,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { color: '#6b7ba4', backdropColor: 'transparent', font: { size: 9 } },
          grid: { color: 'rgba(46,61,99,.4)' },
          pointLabels: { color: '#9ba8c8', font: { size: 10 } },
        }
      }
    },
  });
}

/* ───────────────────────────────────────────────
   MODULE: CALENDAR (Notion)
─────────────────────────────────────────────── */
function renderCalendar() {
  const year  = state.calYear;
  const month = state.calMonth;
  document.getElementById('calMonthTitle').textContent = `${MONTHS_ES[month]} ${year}`;

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr    = fmtDate(new Date());

  // Build event lookup
  const evByDay = {};
  state.calEvents.forEach(ev => {
    if (!evByDay[ev.date]) evByDay[ev.date] = [];
    evByDay[ev.date].push(ev);
  });

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evs     = evByDay[dateStr] || [];
    const isToday = dateStr === todayStr;

    const cell = document.createElement('div');
    cell.className = `cal-day${isToday ? ' today' : ''}`;
    cell.dataset.date = dateStr;

    const dots = evs.map(e => `<div class="day-dot dot-${e.color}" title="${e.title}"></div>`).join('');
    const preview = evs.length ? `<div class="day-event-title">${evs[0].title}${evs.length > 1 ? ` +${evs.length-1}` : ''}</div>` : '';

    cell.innerHTML = `
      <div class="day-num">${d}</div>
      <div class="day-dots">${dots}</div>
      ${preview}
    `;
    cell.addEventListener('click', () => showDayDetail(dateStr, evs));
    grid.appendChild(cell);
  }
}

function showDayDetail(dateStr, evs) {
  document.getElementById('eventPanelDate').textContent = formatDisplay(dateStr);
  const list = document.getElementById('eventList');

  if (!evs.length) {
    list.innerHTML = '<p class="event-empty">No hay eventos registrados para este día.</p>';
    return;
  }

  list.innerHTML = evs.map(e => `
    <div class="event-item ev-${e.color}">
      <div class="event-item-body">
        <div class="event-item-title">${e.title}</div>
        <div class="event-item-type">${e.label}</div>
        ${e.note ? `<div class="event-item-note">${e.note}</div>` : ''}
      </div>
    </div>
  `).join('');
}

async function syncNotion() {
  const token  = document.getElementById('notionToken').value.trim();
  const dbId   = document.getElementById('notionDbId').value.trim();

  if (!token || !dbId) {
    toast('Ingresa tu Notion Token y Database ID primero.', 'error');
    return;
  }

  toast('Conectando con Notion…', 'info');

  try {
    // Notion requires a backend proxy due to CORS. We'll attempt direct fetch and handle gracefully.
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_size: 100 }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const events = [];

    data.results.forEach(page => {
      const props = page.properties;
      // Try common property names
      const titleProp = props.Name || props.Título || props.Title || props.Nombre;
      const dateProp  = props.Date || props.Fecha || props.Fecha_inicio;
      const typeProp  = props.Tipo || props.Type || props.Categoría;

      if (!titleProp || !dateProp) return;

      const title = titleProp.title?.[0]?.plain_text || 'Sin título';
      const date  = dateProp.date?.start;
      const type  = typeProp?.select?.name || 'activity';
      const colorMap = { 'noticias': 'green', 'actividad': 'blue', 'recordatorio': 'amber', 'crítico': 'red', 'pendiente': 'red' };
      const color = colorMap[type.toLowerCase()] || 'blue';

      if (date) events.push({ id: page.id, date: date.slice(0,10), title, type, color, label: type, note: '' });
    });

    state.calEvents = events;
    renderCalendar();
    toast(`Notion sincronizado: ${events.length} eventos cargados.`, 'success');
  } catch (err) {
    toast(`Error Notion: ${err.message}. Verifica token/DB ID y permisos CORS.`, 'error');
    console.error('Notion sync error:', err);
  }
}

/* ───────────────────────────────────────────────
   MODULE: DISCIPLINE
─────────────────────────────────────────────── */
function renderDisciplineSection() {
  // Cards
  const cards = document.getElementById('disciplineCards');
  cards.innerHTML = VOLUNTEERS.map(v => {
    const d = state.discipline[v.id] || {};
    const status = getVolunteerStatus(v.id);
    const contacts = getVolunteerContacts(v.id, 'today');
    const pct = Math.round((contacts / DAILY_GOAL) * 100);
    let currentColor = 'verde';
    if (contacts === 0) currentColor = 'roja';
    else if (pct < 30) currentColor = 'amarilla';

    return `
    <div class="disc-card">
      <div class="disc-card-header">
        <div class="vol-avatar av-${v.avatarIdx}" style="width:34px;height:34px;font-size:.8rem;">${v.initials}</div>
        <div>
          <div class="vol-name">${v.name}</div>
          <div class="vol-role" style="font-size:.68rem;">Estado hoy: ${currentColor === 'roja' ? '🔴 Roja' : currentColor === 'amarilla' ? '🟡 Amarilla' : '🟢 Verde'}</div>
        </div>
        <span class="disc-status-badge ${getStatusBadgeClass(status)}">${getStatusLabel(status)}</span>
      </div>
      <div class="disc-counters">
        <div class="disc-counter dc-red">
          <div class="dc-value">${d.reds || 0}</div>
          <div class="dc-label">🔴 Rojas</div>
        </div>
        <div class="disc-counter dc-amber">
          <div class="dc-value">${d.ambers || 0}</div>
          <div class="dc-label">🟡 Amarillas</div>
        </div>
        <div class="disc-counter dc-green">
          <div class="dc-value">${d.greens || 0}</div>
          <div class="dc-label">🟢 Verdes</div>
        </div>
      </div>
      <div class="disc-rule-summary">
        ${status === 'risk'   ? `<strong style="color:var(--red-400)">⚠️ RIESGO DE EXPULSIÓN</strong> — Acumuló 2 o más rojas este mes.` :
          status === 'warned' ? `<strong style="color:var(--amber-400)">⚠️ ADVERTENCIA FORMAL</strong> — ${d.ambers >= 2 ? '2 amarillas en la semana.' : '1 roja registrada.'}` :
          `<strong style="color:var(--green-400)">✓ Sin sanciones activas</strong> — Continuar monitoreando.`}
        <br/><span>Reglas: 0 registros → 🔴 | &lt;30% → 🟡 | ≥80% → 🟢</span>
      </div>
    </div>`;
  }).join('');

  // Table
  const tbody = document.getElementById('sanctionTableBody');
  const allHistory = VOLUNTEERS.flatMap(v =>
    (state.discipline[v.id]?.history || []).map(h => ({ ...h, volName: VOLUNTEERS.find(x => x.id === h.vid)?.name || h.vid }))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = allHistory.length ? allHistory.map(h => `
    <tr>
      <td style="font-family:var(--font-mono);font-size:.72rem;">${h.date}</td>
      <td>${h.volName}</td>
      <td><span class="chip chip-${h.type === 'roja' ? 'red' : h.type === 'amarilla' ? 'amber' : 'green'}">${h.type === 'roja' ? '🔴 Roja' : h.type === 'amarilla' ? '🟡 Amarilla' : '🟢 Verde'}</span></td>
      <td>${h.note}</td>
      <td><span class="chip chip-gray">Registrada</span></td>
    </tr>
  `).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--slate-400)">Sin registros.</td></tr>`;

  // Populate volunteer select in modal
  const sel = document.getElementById('modalVolunteer');
  sel.innerHTML = '<option value="">Seleccionar...</option>' +
    VOLUNTEERS.map(v => `<option value="${v.id}">${v.name}</option>`).join('');
}

function saveSanction() {
  const vid  = document.getElementById('modalVolunteer').value;
  const type = document.getElementById('modalType').value;
  const date = document.getElementById('modalDate').value || fmtDate(new Date());
  const note = document.getElementById('modalNote').value.trim() || 'Sin nota';

  if (!vid) { toast('Selecciona un voluntario.', 'error'); return; }

  if (!state.discipline[vid]) state.discipline[vid] = { reds: 0, ambers: 0, greens: 0, history: [] };
  const d = state.discipline[vid];
  if (type === 'roja')    d.reds++;
  if (type === 'amarilla') d.ambers++;
  if (type === 'verde')   d.greens++;

  d.history.unshift({ id: `manual-${Date.now()}`, vid, type, date, note });
  closeSanctionModal();
  renderDisciplineSection();
  renderDashboard();
  toast('Evento disciplinario registrado.', 'success');
}

function openSanctionModal()  { document.getElementById('sanctionModal').classList.add('open'); document.getElementById('modalDate').value = fmtDate(new Date()); }
function closeSanctionModal() { document.getElementById('sanctionModal').classList.remove('open'); }

/* ───────────────────────────────────────────────
   MODULE: SCHEDULES
─────────────────────────────────────────────── */
function getWeekDates(offset = 0) {
  const today = new Date();
  const dow   = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow + 1 + (offset * 7));
  return Array.from({length: 6}, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
}

function renderSchedules() {
  const weekDates = getWeekDates(state.schedWeekOffset);
  const weekLabel = `${weekDates[0].getDate()} – ${weekDates[5].getDate()} ${MONTHS_ES[weekDates[0].getMonth()]} ${weekDates[0].getFullYear()}`;
  document.getElementById('weekLabel').textContent = weekLabel;

  // Schedule cards
  const grid = document.getElementById('schedulesGrid');
  grid.innerHTML = VOLUNTEERS.map(v => {
    const sched = state.schedules[v.id] || { shifts: [], attendance: {} };
    const shifts = sched.shifts || [];
    const att    = sched.attendance || {};

    const attDots = weekDates.map(d => {
      const ds = fmtDate(d);
      const status = att[ds];
      const dayAbbr = DAYS_ABBR[d.getDay()];
      const cls = !status || status === 'future' ? 'att-future' :
                  status === 'present' ? 'att-present' :
                  status === 'late'    ? 'att-late'    :
                  status === 'absent'  ? 'att-absent'  : 'att-off';
      const icon = status === 'present' ? '✓' : status === 'late' ? '~' : status === 'absent' ? '✗' : status === 'off' ? '−' : '?';
      return `<div class="att-dot ${cls}" title="${DAYS_FULL[d.getDay()]} ${d.getDate()}: ${status || 'pendiente'}">${icon}</div>`;
    }).join('');

    const presentCount = weekDates.filter(d => att[fmtDate(d)] === 'present').length;
    const lateCount    = weekDates.filter(d => att[fmtDate(d)] === 'late').length;
    const absentCount  = weekDates.filter(d => att[fmtDate(d)] === 'absent').length;
    const workDays     = weekDates.filter(d => d.getDay() !== 0).length;
    const puncPct      = workDays ? Math.round(((presentCount + lateCount * .5) / workDays) * 100) : 0;
    const puncClass    = puncPct >= 80 ? 'fill-green' : puncPct >= 50 ? 'fill-amber' : 'fill-red';

    const shiftsHtml = shifts.map(s => `
      <div class="sched-shift">
        <div class="shift-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${s.label}: ${s.start} – ${s.end}
        </div>
      </div>
    `).join('');

    const alertHtml = absentCount >= 3 ? `<div style="font-size:.68rem;color:var(--red-400);margin-top:.5rem;">⚠️ ${absentCount} ausencias esta semana</div>` :
                      lateCount >= 3   ? `<div style="font-size:.68rem;color:var(--amber-400);margin-top:.5rem;">⚠️ ${lateCount} tardanzas esta semana</div>` : '';

    return `
    <div class="sched-card">
      <div class="sched-card-header">
        <div class="vol-avatar av-${v.avatarIdx}" style="width:32px;height:32px;font-size:.75rem;">${v.initials}</div>
        <div class="sched-name">${v.name}</div>
      </div>
      <div class="sched-shifts">${shiftsHtml}</div>
      <div style="font-size:.68rem;color:var(--slate-400);margin-bottom:.4rem;">Asistencia semanal:</div>
      <div class="attendance-dots">${attDots}</div>
      <div class="punctuality-bar">
        <div class="punc-label"><span>Puntualidad</span><span>${puncPct}%</span></div>
        <div class="progress-track"><div class="progress-fill ${puncClass}" style="width:${puncPct}%"></div></div>
      </div>
      ${alertHtml}
    </div>`;
  }).join('');

  // Attendance table
  renderAttendanceTable(weekDates);
  renderPermissions();
}

function renderAttendanceTable(weekDates) {
  const head = document.getElementById('attendanceHead');
  const body = document.getElementById('attendanceBody');

  head.innerHTML = `<tr>
    <th>Voluntario</th>
    ${weekDates.map(d => `<th>${DAYS_ABBR[d.getDay()]}<br/><span style="font-weight:400;font-size:.65rem;">${d.getDate()}/${d.getMonth()+1}</span></th>`).join('')}
    <th>Asistencias</th>
  </tr>`;

  body.innerHTML = VOLUNTEERS.map(v => {
    const att = state.schedules[v.id]?.attendance || {};
    const cells = weekDates.map(d => {
      const s = att[fmtDate(d)];
      const cls = s === 'present' ? 'chip-green' : s === 'late' ? 'chip-amber' : s === 'absent' ? 'chip-red' : 'chip-gray';
      const lbl = s === 'present' ? '✓' : s === 'late' ? '~' : s === 'absent' ? '✗' : '−';
      return `<td><span class="chip ${cls}">${lbl}</span></td>`;
    }).join('');
    const presentCount = weekDates.filter(d => att[fmtDate(d)] === 'present').length;
    return `<tr><td style="font-weight:500;color:white;">${v.name.split(' ')[0]}</td>${cells}<td style="text-align:center;font-weight:600;">${presentCount}/${weekDates.length}</td></tr>`;
  }).join('');
}

function renderPermissions() {
  const list = document.getElementById('permissionsList');
  const perms = [
    { vol: VOLUNTEERS[0], dates: '20–21 Jun 2025', type: 'badge-amber', label: 'Descanso aprobado' },
    { vol: VOLUNTEERS[2], dates: '23 Jun 2025',     type: 'badge-blue',  label: 'Permiso médico' },
    { vol: VOLUNTEERS[4], dates: '25–28 Jun 2025',  type: 'badge-green', label: 'Vacaciones programadas' },
  ];
  list.innerHTML = perms.map(p => `
    <div class="perm-item">
      <div class="vol-avatar av-${p.vol.avatarIdx}" style="width:30px;height:30px;font-size:.7rem;">${p.vol.initials}</div>
      <div class="perm-vol">${p.vol.name}</div>
      <div class="perm-dates">${p.dates}</div>
      <div class="perm-type"><span class="badge ${p.type}">${p.label}</span></div>
    </div>
  `).join('');
}

/* ───────────────────────────────────────────────
   MODULE: PRODUCTIVITY (Google Sheets)
─────────────────────────────────────────────── */
async function loadGoogleSheetData() {
  const statusDot  = document.querySelector('#gsStatus .status-dot');
  const statusText = document.getElementById('gsStatusText');
  statusDot.className = 'status-dot status-loading';
  statusText.textContent = 'Cargando datos del Sheet…';

  try {
    const url = CORS_PROXY + encodeURIComponent(SHEET_CSV_URL);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const csv = await res.text();
    parseSheetCSV(csv);
    statusDot.className = 'status-dot status-ok';
    statusText.textContent = 'Datos sincronizados ✓';
    toast('Google Sheets sincronizado correctamente.', 'success');
  } catch (err) {
    console.warn('Google Sheets fetch failed, using simulated data.', err);
    statusDot.className = 'status-dot status-error';
    statusText.textContent = 'Datos simulados (CORS bloqueado)';
    toast('No se pudo conectar a Google Sheets. Usando datos simulados.', 'info');
  }

  renderProductivity();
}

function parseSheetCSV(csv) {
  const rows = csv.split('\n').map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g,'')));
  if (rows.length < 2) return;
  // Try to map columns to volunteers by name matching
  const header = rows[0].map(h => h.toLowerCase());
  VOLUNTEERS.forEach(v => {
    const firstName = v.name.split(' ')[0].toLowerCase();
    const colIdx = header.findIndex(h => h.includes(firstName) || h.includes(v.initials.toLowerCase()));
    if (colIdx === -1) return;
    const contacts = {};
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const dateCell = row[0];
      const val = parseInt(row[colIdx], 10);
      if (dateCell && !isNaN(val)) {
        // Try to parse various date formats
        const d = new Date(dateCell);
        if (!isNaN(d)) contacts[fmtDate(d)] = val;
      }
    }
    if (Object.keys(contacts).length) {
      state.productivity[v.id].contacts = contacts;
    }
  });
}

function renderProductivity() {
  // Timeline chart
  const ctxTimeline = document.getElementById('chartTimeline')?.getContext('2d');
  if (ctxTimeline) {
    if (state.charts.timeline) { try { state.charts.timeline.destroy(); } catch(_){} }
    const last14 = Array.from({length:14}, (_,i) => {
      const d = new Date(); d.setDate(d.getDate() - 13 + i); return d;
    });
    const labels = last14.map(d => `${d.getDate()}/${d.getMonth()+1}`);
    const colors = ['#6366f1','#06b6d4','#f43f5e','#f59e0b','#10b981'];

    state.charts.timeline = new Chart(ctxTimeline, {
      type: 'line',
      data: {
        labels,
        datasets: VOLUNTEERS.map((v, i) => ({
          label: v.name.split(' ')[0],
          data: last14.map(d => (state.productivity[v.id]?.contacts || {})[fmtDate(d)] || 0),
          borderColor: colors[i],
          backgroundColor: colors[i] + '22',
          fill: true,
          tension: .4,
          pointRadius: 3,
          pointHoverRadius: 6,
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#9ba8c8', font: { size: 11 }, boxWidth: 16 } },
          tooltip: { backgroundColor: '#1e2740', titleColor: '#e8ecf4', bodyColor: '#9ba8c8', borderColor: '#2e3d63', borderWidth: 1 },
        },
        scales: {
          x: { ticks: { color: '#6b7ba4', font: { size: 10 } }, grid: { color: 'rgba(46,61,99,.4)' } },
          y: { ticks: { color: '#6b7ba4', font: { size: 10 } }, grid: { color: 'rgba(46,61,99,.4)' },
               title: { display: true, text: 'Contactos', color: '#6b7ba4', font: { size: 10 } } },
        },
        interaction: { mode: 'index', intersect: false },
      }
    });
  }

  // Productivity table
  const tbody = document.getElementById('productivityBody');
  const rows = VOLUNTEERS.map(v => {
    const contacts = state.productivity[v.id]?.contacts || {};
    const allVals  = Object.values(contacts).filter(x => x > 0);
    const total    = allVals.reduce((a,x) => a+x, 0);
    const avg      = allVals.length ? Math.round(total / allVals.length) : 0;
    const goalPct  = Math.min(100, Math.round((avg / DAILY_GOAL) * 100));
    const weekPct  = Math.min(100, Math.round((getVolunteerContacts(v.id,'week') / WEEKLY_GOAL) * 100));
    const pClass   = goalPct >= 80 ? 'val-green' : goalPct >= 30 ? 'val-amber' : 'val-red';
    const trend    = avg >= DAILY_GOAL ? '↑ En meta' : avg > 40 ? '→ Moderado' : '↓ Bajo';
    const tClass   = avg >= DAILY_GOAL ? 'chip-green' : avg > 40 ? 'chip-amber' : 'chip-red';
    return `<tr>
      <td style="font-weight:600;color:white;">${v.name}</td>
      <td style="font-family:var(--font-mono);">${total.toLocaleString()}</td>
      <td style="font-family:var(--font-mono);">${avg}</td>
      <td><div class="progress-track" style="width:80px;display:inline-block;"><div class="progress-fill ${pClass.replace('val-','fill-')}" style="width:${goalPct}%"></div></div> ${goalPct}%</td>
      <td>${weekPct}%</td>
      <td class="${pClass}" style="font-weight:600;">${goalPct}%</td>
      <td><span class="chip ${tClass}">${trend}</span></td>
    </tr>`;
  }).join('');

  tbody.innerHTML = rows;
}

/* ───────────────────────────────────────────────
   GLOBAL UPDATE
─────────────────────────────────────────────── */
function updateAll() {
  toast('Actualizando todos los módulos…', 'info');
  renderDashboard();
  renderCalendar();
  renderDisciplineSection();
  renderSchedules();
  renderProductivity();
  setTimeout(() => toast('Actualización completa.', 'success'), 800);
}

/* ───────────────────────────────────────────────
   HELPERS
─────────────────────────────────────────────── */
function el(id) { return document.getElementById(id); }

/* ───────────────────────────────────────────────
   INIT
─────────────────────────────────────────────── */
function init() {
  // Date in header
  const now = new Date();
  el('pageDate').textContent = now.toLocaleDateString('es-PE', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  // Seed data
  seedState();

  // Initial render
  renderDashboard();
  renderCalendar();
  renderDisciplineSection();
  renderSchedules();

  // Start productivity with simulated data, then try to fetch real
  renderProductivity();
  loadGoogleSheetData();

  /* ── NAVIGATION ── */
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const sid = item.dataset.section;
      navigate(sid);
      if (sid === 'calendar')    renderCalendar();
      if (sid === 'discipline')  renderDisciplineSection();
      if (sid === 'schedules')   renderSchedules();
      if (sid === 'productivity') loadGoogleSheetData();
      // Close sidebar on mobile
      if (window.innerWidth < 900) el('sidebar').classList.remove('open');
    });
  });

  /* ── HAMBURGER ── */
  el('hamburgerBtn').addEventListener('click', () => {
    el('sidebar').classList.toggle('open');
  });

  /* ── TOPBAR BUTTONS ── */
  el('btnUpdateAll').addEventListener('click', updateAll);
  el('btnSyncNotion').addEventListener('click', () => {
    navigate('calendar');
    setTimeout(syncNotion, 100);
  });
  el('btnRecalculate').addEventListener('click', () => {
    renderDashboard();
    renderDisciplineSection();
    renderProductivity();
    toast('Métricas recalculadas.', 'success');
  });

  /* ── CALENDAR NAV ── */
  el('calPrev').addEventListener('click', () => {
    state.calMonth--;
    if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
    state.calEvents = generateCalendarEvents(state.calYear, state.calMonth);
    renderCalendar();
  });
  el('calNext').addEventListener('click', () => {
    state.calMonth++;
    if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
    state.calEvents = generateCalendarEvents(state.calYear, state.calMonth);
    renderCalendar();
  });
  el('btnSyncNotionCal').addEventListener('click', syncNotion);
  el('eventPanelClose').addEventListener('click', () => {
    el('eventList').innerHTML = '<p class="event-empty">Haz clic en un día del calendario para ver sus eventos.</p>';
    el('eventPanelDate').textContent = 'Selecciona un día';
  });

  /* ── DISCIPLINE ── */
  el('btnAddSanction').addEventListener('click', openSanctionModal);
  el('closeSanctionModal').addEventListener('click', closeSanctionModal);
  el('cancelSanctionModal').addEventListener('click', closeSanctionModal);
  el('saveSanction').addEventListener('click', saveSanction);
  el('sanctionModal').addEventListener('click', e => { if (e.target === el('sanctionModal')) closeSanctionModal(); });

  /* ── SCHEDULES WEEK NAV ── */
  el('weekPrev').addEventListener('click', () => { state.schedWeekOffset--; renderSchedules(); });
  el('weekNext').addEventListener('click', () => { state.schedWeekOffset++; renderSchedules(); });

  /* ── AUTO-REFRESH every 5 min ── */
  setInterval(() => {
    if (document.getElementById('section-dashboard').classList.contains('active')) {
      renderDashboard();
    }
  }, 5 * 60 * 1000);
}

document.addEventListener('DOMContentLoaded', init);
