


(function () { 'use strict';

const state = { currentPage: 'calendar', currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1), selectedDate: null, editingWorkId: null, editingPlanId: null, works: [], plans: [], materials: [], options: { weather: [], crops: [], tasks: [], pests: [], materials: [], machines: [] }, workSearchKeyword: '', selectedMaterialsDetailed: [] };

const el = {};

document.addEventListener('DOMContentLoaded', init);

async function init() { cacheElements(); bindMenu(); bindCalendarButtons(); bindWorkButtons(); bindMaterialButtons(); await loadAll(); renderAll(); }

function cacheElements() { const ids = [ 'page-calendar', 'page-works', 'page-materials', 'page-money', 'page-options', 'page-excel', 'page-backup', 'btn-prev-month', 'btn-next-month', 'calendar-title', 'calendar-grid', 'selected-date-title', 'selected-date-plan-list', 'selected-date-list', 'btn-open-work-from-calendar', 'btn-open-plan-form', 'plan-modal', 'plan-modal-title', 'btn-close-plan-modal', 'plan_date', 'plan_title', 'plan_details', 'plan_status', 'btn-save-plan', 'btn-cancel-plan', 'work-modal', 'work-modal-title', 'btn-close-work-modal', 'btn-new-work', 'start_date', 'end_date', 'weather', 'task_name', 'crops-box', 'pests-box', 'machines-box', 'labor_cost', 'work_hours', 'memo', 'btn-save-work', 'btn-cancel-work', 'works-list', 'btn-open-material-modal', 'material-modal', 'material-modal-title', 'btn-close-material-modal', 'material_name', 'material_unit', 'material_stock', 'material_price', 'material_memo', 'btn-save-material', 'btn-cancel-material', 'materials-list', 'new-weather', 'new-crops', 'new-tasks', 'new-pests', 'new-materials', 'new-machines', 'options-weather', 'options-crops', 'options-tasks', 'options-pests', 'options-materials', 'options-machines', 'material-search-input', 'material-search-results', 'selected-materials-detailed', 'labor-rows-wrap', 'btn-add-labor-row' ];

ids.forEach(id => {
  el[id] = document.getElementById(id);
});

el.menuButtons = Array.from(document.querySelectorAll('.menu-btn[data-page]'));
}

function bindMenu() { el.menuButtons.forEach(btn => { btn.addEventListener('click', () => switchPage(btn.dataset.page)); }); }

function bindCalendarButtons() { on(el['btn-prev-month'], 'click', () => { state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1); renderCalendar(); });

on(el['btn-next-month'], 'click', () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
  renderCalendar();
});

on(el['btn-open-plan-form'], 'click', () => openPlanModal());
on(el['btn-close-plan-modal'], 'click', closePlanModal);
on(el['btn-cancel-plan'], 'click', closePlanModal);
on(el['btn-save-plan'], 'click', savePlan);

on(el['plan-modal'], 'click', (e) => {
  if (e.target === el['plan-modal']) closePlanModal();
});

on(el['btn-open-work-from-calendar'], 'click', () => {
  openWorkModal();
  if (state.selectedDate) {
    el.start_date.value = state.selectedDate;
    el.end_date.value = state.selectedDate;
  }
});
}

function bindWorkButtons() { on(el['btn-new-work'], 'click', () => openWorkModal()); on(el['btn-close-work-modal'], 'click', closeWorkModal); on(el['btn-cancel-work'], 'click', closeWorkModal); on(el['btn-save-work'], 'click', saveWork);

on(el['work-modal'], 'click', (e) => {
  if (e.target === el['work-modal']) closeWorkModal();
});

on(el['material-search-input'], 'input', (e) => {
  renderMaterialSearchResults(e.target.value || '');
});

on(el['btn-add-labor-row'], 'click', () => addLaborRow());
}

function bindMaterialButtons() { on(el['btn-open-material-modal'], 'click', () => openMaterialModal()); on(el['btn-close-material-modal'], 'click', closeMaterialModal); on(el['btn-cancel-material'], 'click', closeMaterialModal); on(el['btn-save-material'], 'click', saveMaterial);

on(el['material-modal'], 'click', (e) => {
  if (e.target === el['material-modal']) closeMaterialModal();
});
}

async function loadAll() { await Promise.all([ loadWorks(), loadPlans(), loadMaterials(), loadOptions() ]); }

async function loadWorks() { try { state.works = await apiGet('/api/works'); } catch (e) { console.error(e); state.works = []; } }

async function loadPlans() { try { state.plans = await apiGet('/api/plans'); } catch (e) { console.error(e); state.plans = []; } }

async function loadMaterials() { try { state.materials = await apiGet('/api/materials'); } catch (e) { console.error(e); state.materials = []; } }

async function loadOptions() { try { const data = await apiGet('/api/options'); state.options.weather = normalizeOptions(data.weather || data.options_weather || []); state.options.crops = normalizeOptions(data.crops || data.options_crops || []); state.options.tasks = normalizeOptions(data.tasks || data.options_tasks || []); state.options.pests = normalizeOptions(data.pests || data.options_pests || []); state.options.materials = normalizeOptions(data.materials || data.options_materials || []); state.options.machines = normalizeOptions(data.machines || data.options_machines || []); } catch (e) { console.error(e); state.options = { weather: [], crops: [], tasks: [], pests: [], materials: [], machines: [] }; } }

function renderAll() { renderMenuState(); renderCalendar(); renderCalendarSidePanel(); renderWorkFormOptions(); renderWorks(); renderMaterials(); renderOptions(); ensureWorksSearchBar(); }

function switchPage(page) { state.currentPage = page; renderMenuState();

const pageMap = {
  calendar: el['page-calendar'],
  works: el['page-works'],
  materials: el['page-materials'],
  money: el['page-money'],
  options: el['page-options'],
  excel: el['page-excel'],
  backup: el['page-backup']
};

Object.entries(pageMap).forEach(([key, node]) => {
  if (!node) return;
  node.classList.toggle('active', key === page);
  node.style.display = key === page ? '' : 'none';
});

if (page === 'calendar') {
  renderCalendar();
  renderCalendarSidePanel();
} else if (page === 'works') {
  renderWorks();
  ensureWorksSearchBar();
} else if (page === 'materials') {
  renderMaterials();
} else if (page === 'options') {
  renderOptions();
}
}

function renderMenuState() { el.menuButtons.forEach(btn => { btn.classList.toggle('active', btn.dataset.page === state.currentPage); }); }

function renderCalendar() { if (!el['calendar-grid']) return;

const year = state.currentMonth.getFullYear();
const month = state.currentMonth.getMonth();
const firstDay = new Date(year, month, 1);
const lastDate = new Date(year, month + 1, 0).getDate();
const startWeekday = firstDay.getDay();

if (el['calendar-title']) {
  el['calendar-title'].textContent = `${year}년 ${month + 1}월`;
}

const html = [];
for (let i = 0; i < startWeekday; i++) {
  html.push(`<div class="calendar-day empty"></div>`);
}

for (let day = 1; day <= lastDate; day++) {
  const dateStr = fmtDate(new Date(year, month, day));
  const planCount = state.plans.filter(p => normalizePlanDate(p.plan_date) === dateStr).length;
  const workCount = state.works.filter(w => isDateInRange(dateStr, w.start_date, w.end_date)).length;
  const selectedClass = state.selectedDate === dateStr ? 'selected' : '';

  html.push(`
    <div class="calendar-day ${selectedClass}" data-date="${escapeHtml(dateStr)}">
      <div class="day-num">${day}</div>
      <div class="day-count">계획 ${planCount}</div>
      <div class="day-count">실적 ${workCount}</div>
    </div>
  `);
}

el['calendar-grid'].innerHTML = html.join('');

el['calendar-grid'].querySelectorAll('[data-date]').forEach(node => {
  node.addEventListener('click', () => {
    state.selectedDate = node.dataset.date;
    renderCalendar();
    renderCalendarSidePanel();
  });
});
}

function renderCalendarSidePanel() { if (!el['selected-date-title'] || !el['selected-date-plan-list'] || !el['selected-date-list']) return;

if (!state.selectedDate) {
  el['selected-date-title'].textContent = '날짜를 선택하세요';
  el['selected-date-plan-list'].innerHTML = '';
  el['selected-date-list'].innerHTML = '';
  addHidden(el['btn-open-plan-form']);
  addHidden(el['btn-open-work-from-calendar']);
  return;
}

el['selected-date-title'].textContent = state.selectedDate;
removeHidden(el['btn-open-plan-form']);
removeHidden(el['btn-open-work-from-calendar']);

const plans = state.plans.filter(p => normalizePlanDate(p.plan_date) === state.selectedDate);
const works = state.works.filter(w => isDateInRange(state.selectedDate, w.start_date, w.end_date));

el['selected-date-plan-list'].innerHTML = plans.length
  ? plans.map(renderPlanCard).join('')
  : `<div class="empty-msg">등록된 계획 없음</div>`;

el['selected-date-list'].innerHTML = works.length
  ? works.map(renderWorkMiniCard).join('')
  : `<div class="empty-msg">등록된 작업실적 없음</div>`;

bindPlanCardActions();
bindWorkMiniActions();
}

function renderPlanCard(plan) { const statusText = ({ planned: '계획', done: '완료', cancelled: '취소' })[plan.status] || plan.status || '계획'; return <div class="day-item plan-item"> <div><strong>${escapeHtml(plan.title || '')}</strong></div> <div>상태: ${escapeHtml(statusText)}</div> <div>${escapeHtml(plan.details || '')}</div> <div class="item-actions"> <button class="btn" data-plan-edit="${escapeHtml(String(plan.id))}">수정</button> <button class="btn" data-plan-done="${escapeHtml(String(plan.id))}">완료</button> <button class="btn" data-plan-work="${escapeHtml(String(plan.id))}">실적전환</button> <button class="btn" data-plan-delete="${escapeHtml(String(plan.id))}">삭제</button> </div> </div> ; }

function renderWorkMiniCard(work) { const meta = parseMemo(work.memo); return <div class="day-item work-item"> <div><strong>${escapeHtml(work.task_name || '')}</strong></div> <div>작물: ${escapeHtml(work.crops || '')}</div> <div>자재: ${escapeHtml(formatMaterials(meta.materials))}</div> <div class="item-actions"> <button class="btn" data-work-edit="${escapeHtml(String(work.id))}">수정</button> <button class="btn" data-work-delete="${escapeHtml(String(work.id))}">삭제</button> </div> </div> ; }

function bindPlanCardActions() { document.querySelectorAll('[data-plan-edit]').forEach(btn => { btn.addEventListener('click', () => editPlan(btn.dataset.planEdit)); }); document.querySelectorAll('[data-plan-done]').forEach(btn => { btn.addEventListener('click', () => markPlanDone(btn.dataset.planDone)); }); document.querySelectorAll('[data-plan-work]').forEach(btn => { btn.addEventListener('click', () => convertPlanToWork(btn.dataset.planWork)); }); document.querySelectorAll('[data-plan-delete]').forEach(btn => { btn.addEventListener('click', () => deletePlan(btn.dataset.planDelete)); }); }

function bindWorkMiniActions() { document.querySelectorAll('[data-work-edit]').forEach(btn => { btn.addEventListener('click', () => openWorkModalById(btn.dataset.workEdit)); }); document.querySelectorAll('[data-work-delete]').forEach(btn => { btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete)); }); }

function openPlanModal(plan = null) { if (!state.selectedDate && !plan) return;

state.editingPlanId = plan ? plan.id : null;
if (el['plan-modal-title']) {
  el['plan-modal-title'].textContent = plan ? '작업계획 수정' : '작업계획 입력';
}

el.plan_date.value = plan ? normalizePlanDate(plan.plan_date) : state.selectedDate;
el.plan_details.value = plan?.details || '';
el.plan_status.value = plan?.status || 'planned';
renderPlanTitleOptions(plan?.title || '');

removeHidden(el['plan-modal']);
}

function closePlanModal() { addHidden(el['plan-modal']); state.editingPlanId = null; if (el.plan_date) el.plan_date.value = ''; if (el.plan_title) el.plan_title.value = ''; if (el.plan_details) el.plan_details.value = ''; if (el.plan_status) el.plan_status.value = 'planned'; }

function renderPlanTitleOptions(selectedValue = '') { if (!el.plan_title) return; const current = selectedValue || el.plan_title.value || ''; el.plan_title.innerHTML = <option value="">선택</option> + state.options.tasks.map(item => { const name = optionName(item); return <option value="${escapeHtml(name)}">${escapeHtml(name)}</option>; }).join(''); setSelectValue(el.plan_title, current); }

async function savePlan() { const payload = { plan_date: el.plan_date.value, title: (el.plan_title.value || '').trim(), details: (el.plan_details.value || '').trim(), status: el.plan_status.value || 'planned' };

if (!payload.plan_date) return alert('계획일을 입력하세요.');
if (!payload.title) return alert('계획 제목을 선택하세요.');

try {
  if (state.editingPlanId) {
    await apiPut(`/api/plans/${state.editingPlanId}`, payload);
  } else {
    await apiPost('/api/plans', payload);
  }
  await loadPlans();
  closePlanModal();
  renderCalendar();
  renderCalendarSidePanel();
} catch (e) {
  console.error(e);
  alert('작업계획 저장 중 오류가 발생했습니다.');
}
}

function editPlan(planId) { const plan = state.plans.find(p => String(p.id) === String(planId)); if (!plan) return; openPlanModal(plan); }

async function markPlanDone(planId) { const plan = state.plans.find(p => String(p.id) === String(planId)); if (!plan) return; try { await apiPut(/api/plans/${plan.id}, { plan_date: normalizePlanDate(plan.plan_date), title: plan.title, details: plan.details || '', status: 'done' }); await loadPlans(); renderCalendar(); renderCalendarSidePanel(); } catch (e) { console.error(e); alert('계획 완료 처리 중 오류가 발생했습니다.'); } }

function convertPlanToWork(planId) { const plan = state.plans.find(p => String(p.id) === String(planId)); if (!plan) return; openWorkModal(); el.start_date.value = normalizePlanDate(plan.plan_date); el.end_date.value = normalizePlanDate(plan.plan_date); setSelectValue(el.task_name, plan.title || ''); el.memo.value = plan.details || ''; }

async function deletePlan(planId) { if (!confirm('이 계획을 삭제하시겠습니까?')) return; try { await apiDelete(/api/plans/${planId}); await loadPlans(); renderCalendar(); renderCalendarSidePanel(); } catch (e) { console.error(e); alert('계획 삭제 중 오류가 발생했습니다.'); } }

function ensureWorksSearchBar() { const page = el['page-works']; if (!page || document.getElementById('works-search-wrap')) return;

const wrap = document.createElement('div');
wrap.id = 'works-search-wrap';
wrap.className = 'panel';
wrap.style.padding = '12px';
wrap.innerHTML = `
  <div class="inline-form" style="margin-bottom:0;">
    <input type="text" id="works-search-input" placeholder="작업내용, 작물, 자재, 메모 검색">
    <button class="btn primary" id="btn-works-search">검색</button>
    <button class="btn" id="btn-works-search-reset">초기화</button>
  </div>
`;

const header = page.querySelector('.page-header');
if (header) header.insertAdjacentElement('afterend', wrap);

const input = document.getElementById('works-search-input');
const btn = document.getElementById('btn-works-search');
const reset = document.getElementById('btn-works-search-reset');

if (input) input.value = state.workSearchKeyword;
on(btn, 'click', () => {
  state.workSearchKeyword = (input?.value || '').trim();
  renderWorks();
});
on(reset, 'click', () => {
  state.workSearchKeyword = '';
  if (input) input.value = '';
  renderWorks();
});
}

function renderWorkFormOptions() { renderSelect(el.weather, state.options.weather, '날씨 선택'); renderSelect(el.task_name, state.options.tasks, '작업내용 선택'); renderChecks(el['crops-box'], state.options.crops); renderChecks(el['pests-box'], state.options.pests); renderChecks(el['machines-box'], state.options.machines); renderPlanTitleOptions(); renderMaterialUnitOptions(); }

function openWorkModal(work = null) { state.editingWorkId = work ? work.id : null; if (el['work-modal-title']) { el['work-modal-title'].textContent = work ? '작업일지 수정' : '새 작업 입력'; }

const meta = parseMemo(work?.memo);

el.start_date.value = work?.start_date ? String(work.start_date).slice(0, 10) : today();
el.end_date.value = work?.end_date ? String(work.end_date).slice(0, 10) : el.start_date.value;
setSelectValue(el.weather, work?.weather || '');
setSelectValue(el.task_name, work?.task_name || '');
checkValues(el['crops-box'], csvToArray(work?.crops || ''));
checkValues(el['pests-box'], csvToArray(work?.pests || ''));
checkValues(el['machines-box'], csvToArray(work?.machine || ''));
el.labor_cost.value = work?.labor_cost || 0;
el.work_hours.value = work?.work_hours || 0;
el.memo.value = meta.memo_text || '';

state.selectedMaterialsDetailed = Array.isArray(meta.materials) ? meta.materials.map(x => ({
  name: x.name || '',
  qty: x.qty ?? '',
  unit: x.unit || getMaterialUnit(x.name || '') || ''
})) : [];

if (el['material-search-input']) el['material-search-input'].value = '';
if (el['material-search-results']) el['material-search-results'].innerHTML = '';
renderSelectedMaterialsDetailed();

renderLaborRows(meta.labor_rows || []);

removeHidden(el['work-modal']);
}

async function openWorkModalById(workId) { const work = state.works.find(item => String(item.id) === String(workId)); if (!work) return; openWorkModal(work); }

function closeWorkModal() { addHidden(el['work-modal']); state.editingWorkId = null; el.start_date.value = today(); el.end_date.value = today(); setSelectValue(el.weather, ''); setSelectValue(el.task_name, ''); uncheckAll(el['crops-box']); uncheckAll(el['pests-box']); uncheckAll(el['machines-box']); el.labor_cost.value = 0; el.work_hours.value = 0; el.memo.value = ''; state.selectedMaterialsDetailed = []; renderSelectedMaterialsDetailed(); if (el['material-search-input']) el['material-search-input'].value = ''; if (el['material-search-results']) el['material-search-results'].innerHTML = ''; renderLaborRows([]); }

function renderLaborRows(rows = []) { const wrap = el['labor-rows-wrap']; if (!wrap) return;

if (!rows.length) {
  rows = [{ name: '', hours: '', cost: '' }];
}

wrap.innerHTML = rows.map((row, index) => `
  <div class="labor-row" data-labor-index="${index}">
    <input type="text" class="labor-name" placeholder="이름" value="${escapeHtml(row.name || '')}">
    <input type="number" class="labor-hours" min="0" step="0.5" placeholder="시간" value="${escapeHtml(row.hours || '')}">
    <input type="number" class="labor-cost" min="0" step="1000" placeholder="금액" value="${escapeHtml(row.cost || '')}">
    <button type="button" class="btn danger btn-remove-labor">삭제</button>
  </div>
`).join('');

wrap.querySelectorAll('.btn-remove-labor').forEach(btn => {
  btn.addEventListener('click', () => {
    const row = btn.closest('.labor-row');
    if (row) row.remove();
    if (!wrap.querySelector('.labor-row')) addLaborRow();
  });
});
}

function addLaborRow() { const wrap = el['labor-rows-wrap']; if (!wrap) return; const index = wrap.querySelectorAll('.labor-row').length; const div = document.createElement('div'); div.className = 'labor-row'; div.dataset.laborIndex = String(index); div.innerHTML = <input type="text" class="labor-name" placeholder="이름"> <input type="number" class="labor-hours" min="0" step="0.5" placeholder="시간"> <input type="number" class="labor-cost" min="0" step="1000" placeholder="금액"> <button type="button" class="btn danger btn-remove-labor">삭제</button> ; wrap.appendChild(div); div.querySelector('.btn-remove-labor')?.addEventListener('click', () => { div.remove(); if (!wrap.querySelector('.labor-row')) addLaborRow(); }); }

function collectLaborRows() { const wrap = el['labor-rows-wrap']; if (!wrap) return []; return Array.from(wrap.querySelectorAll('.labor-row')).map(row => ({ name: (row.querySelector('.labor-name')?.value || '').trim(), hours: (row.querySelector('.labor-hours')?.value || '').trim(), cost: (row.querySelector('.labor-cost')?.value || '').trim() })).filter(item => item.name || item.hours || item.cost); }

function renderMaterialSearchResults(keyword) { const box = el['material-search-results']; if (!box) return; const q = String(keyword || '').trim().toLowerCase(); if (!q) { box.innerHTML = ''; return; }

const filtered = state.materials.filter(item => materialName(item).toLowerCase().includes(q));
if (!filtered.length) {
  box.innerHTML = `<div class="empty-msg">검색 결과 없음</div>`;
  return;
}

box.innerHTML = filtered.map(item => {
  const name = materialName(item);
  const unit = materialUnit(item);
  return `
    <button type="button" class="material-search-item" data-material-name="${escapeHtml(name)}" data-material-unit="${escapeHtml(unit)}">
      <span>${escapeHtml(name)}</span>
      <small>${escapeHtml(unit)}</small>
    </button>
  `;
}).join('');

box.querySelectorAll('.material-search-item').forEach(btn => {
  btn.addEventListener('click', () => addSelectedMaterial(btn.dataset.materialName, btn.dataset.materialUnit));
});
}

function addSelectedMaterial(name, unit) { if (!name) return; const exists = state.selectedMaterialsDetailed.find(item => item.name === name); if (exists) return; state.selectedMaterialsDetailed.push({ name, qty: '', unit: unit || getMaterialUnit(name) || '' }); renderSelectedMaterialsDetailed(); if (el['material-search-input']) el['material-search-input'].value = ''; if (el['material-search-results']) el['material-search-results'].innerHTML = ''; }

function renderSelectedMaterialsDetailed() { const box = el['selected-materials-detailed']; if (!box) return;

if (!state.selectedMaterialsDetailed.length) {
  box.innerHTML = `<div class="empty-msg">선택된 자재 없음</div>`;
  return;
}

box.innerHTML = state.selectedMaterialsDetailed.map((item, idx) => `
  <div class="selected-material-row" data-selected-index="${idx}">
    <div class="selected-material-name">${escapeHtml(item.name)}</div>
    <input type="number" class="selected-material-qty" min="0" step="0.1" placeholder="수량" value="${escapeHtml(item.qty)}">
    <div class="selected-material-unit">${escapeHtml(item.unit)}</div>
    <button type="button" class="btn danger btn-remove-selected-material">삭제</button>
  </div>
`).join('');

box.querySelectorAll('.selected-material-row').forEach(row => {
  const index = Number(row.dataset.selectedIndex);
  const qtyInput = row.querySelector('.selected-material-qty');
  qtyInput?.addEventListener('input', () => {
    state.selectedMaterialsDetailed[index].qty = qtyInput.value;
  });
  row.querySelector('.btn-remove-selected-material')?.addEventListener('click', () => {
    state.selectedMaterialsDetailed.splice(index, 1);
    renderSelectedMaterialsDetailed();
  });
});
}

async function saveWork() { const payload = { start_date: el.start_date.value, end_date: el.end_date.value, weather: el.weather.value, task_name: el.task_name.value, crops: collectChecked(el['crops-box']).join(', '), pests: collectChecked(el['pests-box']).join(', '), machine: collectChecked(el['machines-box']).join(', '), labor_cost: toNumber(el.labor_cost.value), work_hours: toNumber(el.work_hours.value), memo: JSON.stringify({ memo_text: (el.memo.value || '').trim(), materials: state.selectedMaterialsDetailed.filter(item => item.name), labor_rows: collectLaborRows() }) };

if (!payload.start_date) return alert('시작일을 입력하세요.');
if (!payload.end_date) payload.end_date = payload.start_date;
if (!payload.task_name) return alert('작업내용을 선택하세요.');

try {
  if (state.editingWorkId) {
    await apiPut(`/api/works/${state.editingWorkId}`, payload);
  } else {
    await apiPost('/api/works', payload);
  }
  await loadWorks();
  closeWorkModal();
  renderCalendar();
  renderCalendarSidePanel();
  renderWorks();
} catch (e) {
  console.error(e);
  alert('작업 저장 중 오류가 발생했습니다.');
}
}

async function deleteWork(workId) { if (!confirm('이 작업을 삭제하시겠습니까?')) return; try { await apiDelete(/api/works/${workId}); await loadWorks(); renderCalendar(); renderCalendarSidePanel(); renderWorks(); } catch (e) { console.error(e); alert('작업 삭제 중 오류가 발생했습니다.'); } }

function renderWorks() { const list = el['works-list']; if (!list) return;

const keyword = state.workSearchKeyword.trim().toLowerCase();
let works = [...state.works];

if (keyword) {
  works = works.filter(work => {
    const memo = parseMemo(work.memo);
    const haystack = [
      work.start_date,
      work.end_date,
      work.weather,
      work.task_name,
      work.crops,
      work.pests,
      work.machine,
      memo.memo_text,
      formatMaterials(memo.materials)
    ].join(' ').toLowerCase();
    return haystack.includes(keyword);
  });
}

works.sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));

const grouped = new Map();
works.forEach(work => {
  const key = String(work.start_date).slice(0, 10);
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(work);
});

if (!grouped.size) {
  list.classList.remove('cards');
  list.innerHTML = `<div class="panel empty">등록된 작업이 없습니다.</div>`;
  return;
}

list.classList.remove('cards');

list.innerHTML = Array.from(grouped.entries()).map(([date, items]) => {
  const singleClass = items.length === 1 ? 'single-card' : 'multi-card';
  return `
    <div class="work-date-group ${singleClass}">
      <div class="group-date-title">${escapeHtml(date)}</div>
      <div class="work-date-cards ${items.length === 1 ? 'one' : 'many'}">
        ${items.map(work => renderWorkCard(work)).join('')}
      </div>
    </div>
  `;
}).join('');

list.querySelectorAll('[data-work-edit]').forEach(btn => {
  btn.addEventListener('click', () => openWorkModalById(btn.dataset.workEdit));
});
list.querySelectorAll('[data-work-delete]').forEach(btn => {
  btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
});
}

function renderWorkCard(work) { const meta = parseMemo(work.memo); const materials = formatMaterials(meta.materials); return <article class="card work-card"> <h3>${escapeHtml(work.task_name || '')}</h3> <div class="meta"> <div><strong>기간:</strong> ${escapeHtml(String(work.start_date).slice(0, 10))} ~ ${escapeHtml(String(work.end_date || work.start_date).slice(0, 10))}</div> <div><strong>날씨:</strong> ${escapeHtml(work.weather || '')}</div> <div><strong>작물:</strong> ${escapeHtml(work.crops || '')}</div> <div><strong>병충해:</strong> ${escapeHtml(work.pests || '')}</div> <div><strong>사용기계:</strong> ${escapeHtml(work.machine || '')}</div> <div><strong>사용자재:</strong> ${escapeHtml(materials || '')}</div> <div><strong>인건비:</strong> ${numberWithComma(work.labor_cost || 0)}원</div> <div><strong>작업시간:</strong> ${escapeHtml(String(work.work_hours || 0))}시간</div> <div><strong>메모:</strong> ${escapeHtml(meta.memo_text || '')}</div> </div> <div class="card-actions"> <button class="btn" data-work-edit="${escapeHtml(String(work.id))}">수정</button> <button class="btn danger" data-work-delete="${escapeHtml(String(work.id))}">삭제</button> </div> </article> ; }

function openMaterialModal() { if (el['material-modal-title']) { el['material-modal-title'].textContent = '자재 추가'; } renderMaterialUnitOptions(); if (!el.material_unit.value) { el.material_unit.value = '개'; } removeHidden(el['material-modal']); el.material_name?.focus(); }

function closeMaterialModal() { addHidden(el['material-modal']); resetMaterialForm(true); }

function renderMaterialUnitOptions() { if (!el.material_unit) return; const units = ['개', '병', '통', '봉', '포', 'kg', 'L', 'ml', '말', 'M']; const current = el.material_unit.value || '개'; el.material_unit.innerHTML = units.map(unit => <option value="${escapeHtml(unit)}">${escapeHtml(unit)}</option>).join(''); setSelectValue(el.material_unit, current); if (!el.material_unit.value) { el.material_unit.value = '개'; } }

function resetMaterialForm(keepUnit = true) { const prevUnit = keepUnit ? (el.material_unit?.value || '개') : '개'; if (el.material_name) el.material_name.value = ''; if (el.material_stock) el.material_stock.value = 0; if (el.material_price) el.material_price.value = 0; if (el.material_memo) el.material_memo.value = ''; renderMaterialUnitOptions(); if (el.material_unit) { el.material_unit.value = prevUnit; } el.material_name?.focus(); }

async function saveMaterial() { const payload = { name: (el.material_name.value || '').trim(), unit: (el.material_unit.value || '').trim(), stock_qty: toNumber(el.material_stock.value), unit_price: toNumber(el.material_price.value), memo: (el.material_memo.value || '').trim() };

if (!payload.name) return alert('자재명을 입력하세요.');
if (!payload.unit) return alert('단위를 선택하세요.');

try {
  await apiPost('/api/materials', payload);
  await loadMaterials();
  renderMaterials();
  resetMaterialForm(true);
  alert('자재가 저장되었습니다.');
} catch (e) {
  console.error(e);
  alert('자재 저장 중 오류가 발생했습니다.');
}
}

function renderMaterials() { const list = el['materials-list']; if (!list) return;

if (!state.materials.length) {
  list.innerHTML = `<div class="empty">등록된 자재가 없습니다.</div>`;
  return;
}

const withStock = state.materials.filter(item => toNumber(item.stock_qty ?? item.재고 ?? 0) > 0);
const emptyStock = state.materials.filter(item => toNumber(item.stock_qty ?? item.재고 ?? 0) <= 0);

list.innerHTML = `
  <div class="material-section-wrap">
    <section class="panel material-stock-panel">
      <div class="material-section-title">재고 있음</div>
      ${renderMaterialTable(withStock, true)}
    </section>
    <section class="panel material-stock-panel">
      <div class="material-section-title">재고 없음</div>
      ${renderMaterialTable(emptyStock, false)}
    </section>
  </div>
`;

list.querySelectorAll('[data-material-stock]').forEach(btn => {
  btn.addEventListener('click', () => adjustMaterialStock(btn.dataset.materialStock, btn.dataset.mode));
});
}

function renderMaterialTable(items, hasStock) { if (!items.length) { return <div class="empty-msg">해당 자재 없음</div>; }

return `
  <div class="material-table-wrap">
    <table class="material-table">
      <thead>
        <tr>
          <th class="col-name">자재명</th>
          <th class="col-unit">단위</th>
          <th class="col-stock">재고</th>
          <th class="col-price">단가</th>
          <th class="col-actions">처리</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => {
          const name = materialName(item);
          const unit = materialUnit(item);
          const stock = toNumber(item.stock_qty ?? item.재고 ?? 0);
          const price = toNumber(item.unit_price ?? item.가격 ?? 0);
          return `
            <tr>
              <td class="material-name-cell">
                <div class="material-name-text">${escapeHtml(name)}</div>
              </td>
              <td class="nowrap-cell">${escapeHtml(unit)}</td>
              <td class="nowrap-cell">${escapeHtml(String(stock))}</td>
              <td class="nowrap-cell">${numberWithComma(price)}원</td>
              <td class="material-action-cell">
                <div class="material-action-buttons">
                  <button class="btn" data-material-stock="${escapeHtml(name)}" data-mode="in">입고</button>
                  ${hasStock ? `<button class="btn danger" data-material-stock="${escapeHtml(name)}" data-mode="out">사용</button>` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
`;
}

async function adjustMaterialStock(name, mode) { const item = state.materials.find(m => materialName(m) === name); if (!item) return; const input = prompt(mode === 'in' ? '입고 수량' : '사용 수량', '0'); if (input === null) return; const qty = Number(input); if (!Number.isFinite(qty) || qty < 0) return alert('올바른 수량을 입력하세요.');

const current = toNumber(item.stock_qty ?? item.재고 ?? 0);
const next = mode === 'in' ? current + qty : current - qty;
if (next < 0) return alert('재고가 부족합니다.');

const id = item.id ?? item.material_id ?? materialName(item);
try {
  await apiPut(`/api/materials/${encodeURIComponent(id)}`, {
    name: materialName(item),
    unit: materialUnit(item),
    stock_qty: next,
    unit_price: toNumber(item.unit_price ?? item.가격 ?? 0)
  });
  await loadMaterials();
  renderMaterials();
} catch (e) {
  console.error(e);
  alert('재고 수정 중 오류가 발생했습니다.');
}
}

function renderOptions() { renderOptionList('weather', el['options-weather']); renderOptionList('crops', el['options-crops']); renderOptionList('tasks', el['options-tasks']); renderOptionList('pests', el['options-pests']); renderOptionList('materials', el['options-materials']); renderOptionList('machines', el['options-machines']); }

function renderOptionList(type, container) { if (!container) return; const items = state.options[type] || []; container.innerHTML = items.map(item => { const id = optionId(item); const name = optionName(item); return <div class="panel" style="padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; gap:8px; align-items:center;"> <span>${escapeHtml(name)}</span> <div style="display:flex; gap:6px;"> <button class="btn" data-option-edit="${escapeHtml(type)}|${escapeHtml(String(id))}">수정</button> <button class="btn" data-option-delete="${escapeHtml(type)}|${escapeHtml(String(id))}">삭제</button> </div> </div> ; }).join('');

container.querySelectorAll('[data-option-edit]').forEach(btn => {
  btn.addEventListener('click', () => {
    const [optType, id] = btn.dataset.optionEdit.split('|');
    editOption(optType, id);
  });
});
container.querySelectorAll('[data-option-delete]').forEach(btn => {
  btn.addEventListener('click', () => {
    const [optType, id] = btn.dataset.optionDelete.split('|');
    deleteOption(optType, id);
  });
});
}

window.saveOption = async function (type, inputId) { const input = document.getElementById(inputId); const name = (input?.value || '').trim(); if (!name) return;

try {
  await apiPost(`/api/options/${type}`, { name });
  input.value = '';
  await loadOptions();
  renderOptions();
  renderWorkFormOptions();
} catch (e) {
  console.error(e);
  alert('옵션 저장 중 오류가 발생했습니다.');
}
};

async function editOption(type, id) { const item = (state.options[type] || []).find(opt => String(optionId(opt)) === String(id)); if (!item) return; const name = prompt('옵션명 수정', optionName(item)); if (name === null || !name.trim()) return;

try {
  await apiPut(`/api/options/${type}/${id}`, { name: name.trim() });
  await loadOptions();
  renderOptions();
  renderWorkFormOptions();
} catch (e) {
  console.error(e);
  alert('옵션 수정 중 오류가 발생했습니다.');
}
}

async function deleteOption(type, id) { if (!confirm('이 옵션을 삭제하시겠습니까?')) return; try { await apiDelete(/api/options/${type}/${id}); await loadOptions(); renderOptions(); renderWorkFormOptions(); } catch (e) { console.error(e); alert('옵션 삭제 중 오류가 발생했습니다.'); } }

function renderSelect(select, items, placeholder) { if (!select) return; const current = select.value; select.innerHTML = <option value="">${escapeHtml(placeholder || '선택')}</option> + items.map(item => <option value="${escapeHtml(optionName(item))}">${escapeHtml(optionName(item))}</option>).join(''); setSelectValue(select, current); }

function renderChecks(container, items) { if (!container) return; const selected = collectChecked(container); container.innerHTML = items.map(item => { const name = optionName(item); const id = ${container.id}-${slug(name)}; return <label> <input type="checkbox" id="${escapeHtml(id)}" value="${escapeHtml(name)}" ${selected.includes(name) ? 'checked' : ''}> <span>${escapeHtml(name)}</span> </label> ; }).join(''); }

function collectChecked(container) { if (!container) return []; return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(x => x.value); }

function checkValues(container, values) { renderChecks(container, state.options[mapContainerToOptionKey(container.id)] || []); const set = new Set(values || []); container.querySelectorAll('input[type="checkbox"]').forEach(chk => { chk.checked = set.has(chk.value); }); }

function uncheckAll(container) { if (!container) return; container.querySelectorAll('input[type="checkbox"]').forEach(chk => chk.checked = false); }

function mapContainerToOptionKey(id) { return { 'crops-box': 'crops', 'pests-box': 'pests', 'machines-box': 'machines' }[id] || ''; }

function parseMemo(memo) { if (!memo) return { memo_text: '', materials: [], labor_rows: [] }; try { const obj = typeof memo === 'string' ? JSON.parse(memo) : memo; return { memo_text: obj.memo_text || obj.note || '', materials: Array.isArray(obj.materials) ? obj.materials : [], labor_rows: Array.isArray(obj.labor_rows) ? obj.labor_rows : [] }; } catch { return { memo_text: String(memo), materials: [], labor_rows: [] }; } }

function formatMaterials(materials) { if (!Array.isArray(materials) || !materials.length) return ''; return materials.map(item => ${item.name || ''}${item.qty !== undefined && item.qty !== '' ? ' ' + item.qty : ''}${item.unit || ''}).join(', '); }

function materialName(item) { return item.name ?? item.자재명 ?? ''; }

function materialUnit(item) { return item.unit ?? item.단위 ?? getMaterialUnit(materialName(item)) ?? ''; }

function getMaterialUnit(name) { const material = state.materials.find(item => materialName(item) === name); if (material) return material.unit ?? material.단위 ?? ''; const opt = (state.options.materials || []).find(item => optionName(item) === name); return opt?.unit ?? opt?.단위 ?? ''; }

function optionName(item) { if (typeof item === 'string') return item; return item.name ?? item.value ?? item.label ?? ''; }

function optionId(item) { if (typeof item === 'string') return item; return item.id ?? item.value ?? item.name; }

function normalizeOptions(arr) { return Array.isArray(arr) ? arr : []; }

function normalizePlanDate(v) { if (!v) return ''; return String(v).slice(0, 10); }

function isDateInRange(target, start, end) { const t = String(target).slice(0, 10); const s = String(start || '').slice(0, 10); const e = String(end || start || '').slice(0, 10); return !!s && t >= s && t <= e; }

function csvToArray(value) { return String(value || '').split(',').map(x => x.trim()).filter(Boolean); }

function setSelectValue(select, value) { if (!select) return; const exists = Array.from(select.options).some(opt => opt.value === value); select.value = exists ? value : ''; }

function addHidden(node) { if (node) node.classList.add('hidden'); }

function removeHidden(node) { if (node) node.classList.remove('hidden'); }

function today() { return fmtDate(new Date()); }

function fmtDate(d) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return ${y}-${m}-${day}; }

function numberWithComma(value)
