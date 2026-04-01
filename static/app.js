// static/app.js
// 기존 업로드한 index.html 구조 기준 전체 교체본
// 반영:
// 1) 달력 날짜칸 구분선용 class 유지
// 2) 작업계획 제목 선택형
// 3) 작업일지 입력 작물/병충해/사용기계 가로 배치(css 연동)
// 4) 같은 날짜 작업이 1개면 큰 카드, 여러 개면 작은 카드

(function () {
  'use strict';

  const state = {
    currentPage: 'calendar',
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDate: null,
    editingWorkId: null,
    editingPlanId: null,
    works: [],
    plans: [],
    materials: [],
    options: {
      weather: [],
      crops: [],
      tasks: [],
      pests: [],
      materials: [],
      machines: []
    },
    workSearchKeyword: '',
    selectedMaterialsDetailed: []
  };

  const el = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheElements();
    upgradeWorkFormForMaterialQty();
    bindMenu();
    bindCalendarButtons();
    bindWorkButtons();
    bindMaterialButtons();
    await loadAll();
    renderAll();
  }

  function cacheElements() {
    const ids = [
      'page-calendar', 'page-works', 'page-materials', 'page-money', 'page-options', 'page-excel', 'page-backup',
      'btn-prev-month', 'btn-next-month', 'calendar-title', 'calendar-grid',
      'selected-date-title', 'selected-date-plan-list', 'selected-date-list',
      'btn-open-work-from-calendar', 'btn-open-plan-form',
      'plan-form-wrap', 'plan-form-title', 'plan_date', 'plan_title', 'plan_details', 'plan_status',
      'btn-save-plan', 'btn-cancel-plan',
      'btn-new-work', 'work-form-wrap', 'work-form-title',
      'start_date', 'end_date', 'weather', 'task_name', 'crops-box', 'pests-box', 'materials-box', 'machines-box',
      'labor_cost', 'work_hours', 'memo', 'btn-save-work', 'btn-cancel-work', 'works-list',
      'material_name', 'material_unit', 'material_stock', 'material_price', 'material_memo', 'btn-save-material', 'materials-list',
      'new-weather', 'new-crops', 'new-tasks', 'new-pests', 'new-materials', 'new-machines',
      'options-weather', 'options-crops', 'options-tasks', 'options-pests', 'options-materials', 'options-machines'
    ];

    ids.forEach(id => {
      el[id] = document.getElementById(id);
    });

    el.menuButtons = Array.from(document.querySelectorAll('.menu-btn[data-page]'));
  }

  function bindMenu() {
    el.menuButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        switchPage(btn.dataset.page);
      });
    });
  }

  function bindCalendarButtons() {
    on(el['btn-prev-month'], 'click', () => {
      state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
      renderCalendar();
    });

    on(el['btn-next-month'], 'click', () => {
      state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
      renderCalendar();
    });

    on(el['btn-open-plan-form'], 'click', () => openPlanForm());
    on(el['btn-cancel-plan'], 'click', () => closePlanForm());
    on(el['btn-save-plan'], 'click', savePlan);

    on(el['btn-open-work-from-calendar'], 'click', () => {
      openWorkForm();
      if (state.selectedDate) {
        el.start_date.value = state.selectedDate;
        el.end_date.value = state.selectedDate;
      }
      switchPage('works');
    });
  }

  function bindWorkButtons() {
    on(el['btn-new-work'], 'click', () => openWorkForm());
    on(el['btn-cancel-work'], 'click', () => closeWorkForm());
    on(el['btn-save-work'], 'click', saveWork);
  }

  function bindMaterialButtons() {
    on(el['btn-save-material'], 'click', saveMaterial);
  }

  async function loadAll() {
    await Promise.all([
      loadWorks(),
      loadPlans(),
      loadMaterials(),
      loadOptions()
    ]);
  }

  async function loadWorks() {
    try {
      state.works = await apiGet('/api/works');
    } catch (e) {
      console.error(e);
      state.works = [];
    }
  }

  async function loadPlans() {
    try {
      state.plans = await apiGet('/api/plans');
    } catch (e) {
      console.error(e);
      state.plans = [];
    }
  }

  async function loadMaterials() {
    try {
      state.materials = await apiGet('/api/materials');
    } catch (e) {
      console.error(e);
      state.materials = [];
    }
  }

  async function loadOptions() {
    try {
      const data = await apiGet('/api/options');
      state.options.weather = normalizeOptions(data.weather || data.options_weather || []);
      state.options.crops = normalizeOptions(data.crops || data.options_crops || []);
      state.options.tasks = normalizeOptions(data.tasks || data.options_tasks || []);
      state.options.pests = normalizeOptions(data.pests || data.options_pests || []);
      state.options.materials = normalizeOptions(data.materials || data.options_materials || []);
      state.options.machines = normalizeOptions(data.machines || data.options_machines || []);
    } catch (e) {
      console.error(e);
      state.options = { weather: [], crops: [], tasks: [], pests: [], materials: [], machines: [] };
    }
  }

  function renderAll() {
    renderMenuState();
    renderCalendar();
    renderCalendarSidePanel();
    renderWorkFormOptions();
    renderWorks();
    renderMaterials();
    renderOptions();
  }

  function switchPage(page) {
    state.currentPage = page;
    renderMenuState();

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
    } else if (page === 'materials') {
      renderMaterials();
    } else if (page === 'options') {
      renderOptions();
    }
  }

  function renderMenuState() {
    el.menuButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === state.currentPage);
    });
  }

  function renderCalendar() {
    if (!el['calendar-grid']) return;

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

  function renderCalendarSidePanel() {
    if (!el['selected-date-title'] || !el['selected-date-plan-list'] || !el['selected-date-list']) return;

    if (!state.selectedDate) {
      el['selected-date-title'].textContent = '날짜를 선택하세요';
      el['selected-date-plan-list'].innerHTML = '';
      el['selected-date-list'].innerHTML = '';
      addHidden(el['btn-open-plan-form']);
      addHidden(el['btn-open-work-from-calendar']);
      closePlanForm();
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

  function renderPlanCard(plan) {
    const statusText = ({ planned: '계획', done: '완료', cancelled: '취소' })[plan.status] || plan.status || '계획';
    return `
      <div class="day-item plan-item">
        <div><strong>${escapeHtml(plan.title || '')}</strong></div>
        <div>상태: ${escapeHtml(statusText)}</div>
        <div>${escapeHtml(plan.details || '')}</div>
        <div class="item-actions">
          <button class="btn" data-plan-edit="${escapeHtml(String(plan.id))}">수정</button>
          <button class="btn" data-plan-done="${escapeHtml(String(plan.id))}">완료</button>
          <button class="btn" data-plan-work="${escapeHtml(String(plan.id))}">실적전환</button>
          <button class="btn" data-plan-delete="${escapeHtml(String(plan.id))}">삭제</button>
        </div>
      </div>
    `;
  }

  function renderWorkMiniCard(work) {
    const meta = parseMemo(work.memo);
    return `
      <div class="day-item work-item">
        <div><strong>${escapeHtml(work.task_name || '')}</strong></div>
        <div>작물: ${escapeHtml(work.crops || '')}</div>
        <div>자재: ${escapeHtml(formatMaterials(meta.materials))}</div>
        <div class="item-actions">
          <button class="btn" data-work-edit="${escapeHtml(String(work.id))}">수정</button>
          <button class="btn" data-work-delete="${escapeHtml(String(work.id))}">삭제</button>
        </div>
      </div>
    `;
  }

  function bindPlanCardActions() {
    document.querySelectorAll('[data-plan-edit]').forEach(btn => {
      btn.addEventListener('click', () => editPlan(btn.dataset.planEdit));
    });
    document.querySelectorAll('[data-plan-done]').forEach(btn => {
      btn.addEventListener('click', () => markPlanDone(btn.dataset.planDone));
    });
    document.querySelectorAll('[data-plan-work]').forEach(btn => {
      btn.addEventListener('click', () => convertPlanToWork(btn.dataset.planWork));
    });
    document.querySelectorAll('[data-plan-delete]').forEach(btn => {
      btn.addEventListener('click', () => deletePlan(btn.dataset.planDelete));
    });
  }

  function bindWorkMiniActions() {
    document.querySelectorAll('[data-work-edit]').forEach(btn => {
      btn.addEventListener('click', () => openWorkFormById(btn.dataset.workEdit));
    });
    document.querySelectorAll('[data-work-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
    });
  }

  function openPlanForm(plan = null) {
    if (!state.selectedDate && !plan) return;
    removeHidden(el['plan-form-wrap']);
    el['plan-form-title'].textContent = plan ? '작업계획 수정' : '작업계획 입력';
    state.editingPlanId = plan ? plan.id : null;
    el.plan_date.value = plan ? normalizePlanDate(plan.plan_date) : state.selectedDate;
    el.plan_details.value = plan?.details || '';
    el.plan_status.value = plan?.status || 'planned';
    renderPlanTitleOptions(plan?.title || '');
  }

  function closePlanForm() {
    addHidden(el['plan-form-wrap']);
    state.editingPlanId = null;
    if (el.plan_date) el.plan_date.value = '';
    if (el.plan_title) el.plan_title.value = '';
    if (el.plan_details) el.plan_details.value = '';
    if (el.plan_status) el.plan_status.value = 'planned';
  }

  function renderPlanTitleOptions(selectedValue = '') {
    if (!el.plan_title) return;
    const current = selectedValue || el.plan_title.value || '';
    el.plan_title.innerHTML =
      `<option value="">선택</option>` +
      state.options.tasks.map(item => {
        const name = optionName(item);
        return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
      }).join('');
    setSelectValue(el.plan_title, current);
  }

  async function savePlan() {
    const payload = {
      plan_date: el.plan_date.value,
      title: (el.plan_title.value || '').trim(),
      details: (el.plan_details.value || '').trim(),
      status: el.plan_status.value || 'planned'
    };

    if (!payload.plan_date) return alert('계획일을 입력하세요.');
    if (!payload.title) return alert('계획 제목을 선택하세요.');

    try {
      if (state.editingPlanId) {
        await apiPut(`/api/plans/${state.editingPlanId}`, payload);
      } else {
        await apiPost('/api/plans', payload);
      }
      await loadPlans();
      closePlanForm();
      renderCalendar();
      renderCalendarSidePanel();
    } catch (e) {
      console.error(e);
      alert('작업계획 저장 중 오류가 발생했습니다.');
    }
  }

  function editPlan(planId) {
    const plan = state.plans.find(p => String(p.id) === String(planId));
    if (!plan) return;
    openPlanForm(plan);
  }

  async function markPlanDone(planId) {
    const plan = state.plans.find(p => String(p.id) === String(planId));
    if (!plan) return;
    try {
      await apiPut(`/api/plans/${plan.id}`, {
        plan_date: normalizePlanDate(plan.plan_date),
        title: plan.title,
        details: plan.details || '',
        status: 'done'
      });
      await loadPlans();
      renderCalendar();
      renderCalendarSidePanel();
    } catch (e) {
      console.error(e);
      alert('계획 완료 처리 중 오류가 발생했습니다.');
    }
  }

  function convertPlanToWork(planId) {
    const plan = state.plans.find(p => String(p.id) === String(planId));
    if (!plan) return;
    switchPage('works');
    openWorkForm();
    el.start_date.value = normalizePlanDate(plan.plan_date);
    el.end_date.value = normalizePlanDate(plan.plan_date);
    setSelectValue(el.task_name, plan.title || '');
    el.memo.value = plan.details || '';
  }

  async function deletePlan(planId) {
    if (!confirm('이 계획을 삭제하시겠습니까?')) return;
    try {
      await apiDelete(`/api/plans/${planId}`);
      await loadPlans();
      renderCalendar();
      renderCalendarSidePanel();
    } catch (e) {
      console.error(e);
      alert('계획 삭제 중 오류가 발생했습니다.');
    }
  }

  function upgradeWorkFormForMaterialQty() {
    if (!el['work-form-wrap']) return;

    const pageHeader = el['page-works']?.querySelector('.page-header');
    if (pageHeader && !document.getElementById('works-search-wrap')) {
      const wrap = document.createElement('div');
      wrap.id = 'works-search-wrap';
      wrap.innerHTML = `
        <input type="text" id="works-search-input" placeholder="작업내용, 작물, 병충해, 자재, 비고 검색" style="padding:8px 10px; border-radius:8px; border:1px solid #ccc; min-width:260px;">
        <button type="button" class="btn" id="btn-works-search">검색</button>
        <button type="button" class="btn" id="btn-works-search-reset">초기화</button>
      `;
      pageHeader.appendChild(wrap);
    }

    const materialsField = el['materials-box']?.closest('.field');
    if (materialsField && !document.getElementById('material-picker-wrap')) {
      materialsField.innerHTML = `
        <span>사용자재</span>
        <div id="material-picker-wrap">
          <div style="display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
            <input type="text" id="material-search-input" placeholder="자재명 검색" style="padding:8px 10px; border:1px solid #ccc; border-radius:8px; min-width:220px;">
          </div>
          <div id="material-search-results" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;"></div>
          <div id="selected-materials-detailed"></div>
        </div>
      `;
    }

    const oldLaborField = el['labor_cost']?.closest('.field');
    if (oldLaborField && !document.getElementById('labor-rows-wrap')) {
      const laborGrid = oldLaborField.parentElement;
      if (laborGrid) {
        laborGrid.insertAdjacentHTML('beforebegin', `
          <div class="field">
            <span>인건비 상세</span>
            <div id="labor-rows-wrap"></div>
            <div style="margin-top:8px;"><button type="button" class="btn" id="btn-add-labor-row">행추가</button></div>
          </div>
        `);
      }
      oldLaborField.style.display = 'none';
    }

    on(document.getElementById('works-search-input'), 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.workSearchKeyword = (e.target.value || '').trim();
        renderWorks();
      }
    });

    on(document.getElementById('btn-works-search'), 'click', () => {
      state.workSearchKeyword = (document.getElementById('works-search-input')?.value || '').trim();
      renderWorks();
    });

    on(document.getElementById('btn-works-search-reset'), 'click', () => {
      const input = document.getElementById('works-search-input');
      if (input) input.value = '';
      state.workSearchKeyword = '';
      renderWorks();
    });

    on(document.getElementById('material-search-input'), 'input', (e) => {
      renderMaterialSearchResults(e.target.value || '');
    });

    on(document.getElementById('btn-add-labor-row'), 'click', () => addLaborRow());
  }

  function renderWorkFormOptions() {
    renderSelect(el.weather, state.options.weather, '선택');
    renderSelect(el.task_name, state.options.tasks, '선택');
    renderPlanTitleOptions();
    renderChecks(el['crops-box'], state.options.crops);
    renderChecks(el['pests-box'], state.options.pests);
    renderChecks(el['machines-box'], state.options.machines);
    renderMaterialSearchResults('');
    renderSelectedMaterialsDetailed();
    if (!document.getElementById('labor-rows-wrap')?.children.length) addLaborRow();
  }

  function renderWorks() {
    if (!el['works-list']) return;
    const keyword = state.workSearchKeyword.toLowerCase();

    const filtered = state.works.filter(work => {
      if (!keyword) return true;
      const meta = parseMemo(work.memo);
      const haystack = [
        work.start_date, work.end_date, work.task_name, work.weather, work.crops, work.pests, work.materials, work.machines,
        work.memo, meta.memo_text, formatMaterials(meta.materials)
      ].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });

    const groups = {};
    filtered.forEach(work => {
      const key = work.start_date || '날짜없음';
      if (!groups[key]) groups[key] = [];
      groups[key].push(work);
    });

    const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    if (!dates.length) {
      el['works-list'].innerHTML = '<div class="panel">표시할 작업일지가 없습니다.</div>';
      return;
    }

    el['works-list'].innerHTML = dates.map(date => {
      const items = groups[date];
      const rowClass = items.length === 1 ? 'work-cards-row single-card' : 'work-cards-row';
      return `
        <div class="work-group" style="margin-bottom:18px;">
          <h3 style="margin:0 0 10px 0;">${escapeHtml(date)}</h3>
          <div class="${rowClass}">
            ${items.map(item => renderWorkCard(item, items.length === 1)).join('')}
          </div>
        </div>
      `;
    }).join('');

    el['works-list'].querySelectorAll('[data-edit-work-id]').forEach(btn => {
      btn.addEventListener('click', () => openWorkFormById(btn.dataset.editWorkId));
    });

    el['works-list'].querySelectorAll('[data-delete-work-id]').forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.deleteWorkId));
    });
  }

  function renderWorkCard(work, isSingle) {
    const meta = parseMemo(work.memo);
    const laborRows = Array.isArray(meta.labor_rows) ? meta.labor_rows : [];
    const laborTotal = laborRows.reduce((sum, row) => sum + toNumber(row.amount), 0);
    const cardClass = isSingle ? 'panel work-card-large' : 'panel work-card-small';

    return `
      <div class="${cardClass}">
        <div style="display:flex; justify-content:space-between; gap:8px; align-items:flex-start; margin-bottom:8px;">
          <strong>${escapeHtml(work.task_name || '')}</strong>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn" data-edit-work-id="${escapeHtml(String(work.id))}">수정</button>
            <button class="btn" data-delete-work-id="${escapeHtml(String(work.id))}">삭제</button>
          </div>
        </div>
        <div>작물: ${escapeHtml(work.crops || '')}</div>
        <div>날씨: ${escapeHtml(work.weather || '')}</div>
        <div>병충해: ${escapeHtml(work.pests || '')}</div>
        <div>자재: ${escapeHtml(formatMaterials(meta.materials))}</div>
        <div>기계: ${escapeHtml(work.machines || '')}</div>
        <div>작업시간: ${escapeHtml(String(work.work_hours || ''))}</div>
        <div>기간: ${escapeHtml(work.start_date || '')} ~ ${escapeHtml(work.end_date || '')}</div>
        <div>인건비: ${laborTotal ? numberWithComma(laborTotal) + '원' : numberWithComma(work.labor_cost || 0) + '원'}</div>
        <div>비고: ${escapeHtml(meta.memo_text || '')}</div>
      </div>
    `;
  }

  function openWorkForm() {
    state.editingWorkId = null;
    if (el['work-form-title']) el['work-form-title'].textContent = '작업 입력';
    if (el['work-form-wrap']) removeHidden(el['work-form-wrap']);

    if (el.start_date) el.start_date.value = state.selectedDate || today();
    if (el.end_date) el.end_date.value = state.selectedDate || today();
    if (el.weather) el.weather.value = '';
    if (el.task_name) el.task_name.value = '';
    uncheckAll(el['crops-box']);
    uncheckAll(el['pests-box']);
    uncheckAll(el['machines-box']);
    if (el.work_hours) el.work_hours.value = '0';
    if (el.memo) el.memo.value = '';
    state.selectedMaterialsDetailed = [];
    renderSelectedMaterialsDetailed();
    renderMaterialSearchResults('');
    resetLaborRows();
  }

  function closeWorkForm() {
    addHidden(el['work-form-wrap']);
    state.editingWorkId = null;
  }

  function openWorkFormById(workId) {
    const work = state.works.find(w => String(w.id) === String(workId));
    if (!work) return;

    state.editingWorkId = work.id;
    if (el['work-form-title']) el['work-form-title'].textContent = '작업 수정';
    if (el['work-form-wrap']) removeHidden(el['work-form-wrap']);

    el.start_date.value = work.start_date || '';
    el.end_date.value = work.end_date || '';
    setSelectValue(el.weather, work.weather || '');
    setSelectValue(el.task_name, work.task_name || '');
    checkValues(el['crops-box'], csvToArray(work.crops));
    checkValues(el['pests-box'], csvToArray(work.pests));
    checkValues(el['machines-box'], csvToArray(work.machines));
    el.work_hours.value = work.work_hours || 0;

    const meta = parseMemo(work.memo);
    el.memo.value = meta.memo_text || '';
    state.selectedMaterialsDetailed = Array.isArray(meta.materials)
      ? meta.materials.map(item => ({
          name: item.name || '',
          qty: item.qty === 0 ? '0' : String(item.qty ?? ''),
          unit: item.unit || getMaterialUnit(item.name)
        }))
      : [];
    renderSelectedMaterialsDetailed();
    renderMaterialSearchResults(document.getElementById('material-search-input')?.value || '');
    resetLaborRows(meta.labor_rows || []);
  }

  async function saveWork() {
    const materials = state.selectedMaterialsDetailed.map(item => ({
      name: String(item.name || '').trim(),
      qty: String(item.qty ?? '').trim(),
      unit: String(item.unit || '').trim()
    })).filter(item => item.name);

    for (const item of materials) {
      if (item.qty === '') {
        return alert(`사용자재 [${item.name}] 수량을 입력하세요.`);
      }
      const qty = Number(item.qty);
      if (!Number.isFinite(qty) || qty <= 0) {
        return alert(`사용자재 [${item.name}] 수량은 0보다 커야 합니다.`);
      }
      item.qty = qty;
    }

    const laborRows = collectLaborRows();
    const laborCost = laborRows.reduce((sum, row) => sum + toNumber(row.amount), 0);

    const payload = {
      start_date: el.start_date.value,
      end_date: el.end_date.value,
      weather: el.weather.value,
      crops: collectChecked(el['crops-box']).join(','),
      task_name: el.task_name.value,
      pests: collectChecked(el['pests-box']).join(','),
      materials: materials.map(m => m.name).join(','),
      machines: collectChecked(el['machines-box']).join(','),
      labor_cost: laborCost,
      work_hours: el.work_hours.value,
      memo: JSON.stringify({
        memo_text: el.memo.value || '',
        materials,
        labor_rows: laborRows,
        material_cost_total: 0
      })
    };

    if (!payload.start_date) return alert('시작일을 입력하세요.');
    if (!payload.end_date) return alert('종료일을 입력하세요.');
    if (!payload.task_name) return alert('작업내용을 선택하세요.');

    try {
      if (state.editingWorkId) {
        await apiPut(`/api/works/${state.editingWorkId}`, payload);
      } else {
        await apiPost('/api/works', payload);
      }
      await loadWorks();
      renderWorks();
      renderCalendar();
      renderCalendarSidePanel();
      closeWorkForm();
    } catch (e) {
      console.error(e);
      alert('작업 저장 중 오류가 발생했습니다.');
    }
  }

  async function deleteWork(workId) {
    if (!confirm('이 작업을 삭제하시겠습니까?')) return;
    try {
      await apiDelete(`/api/works/${workId}`);
      await loadWorks();
      renderWorks();
      renderCalendar();
      renderCalendarSidePanel();
    } catch (e) {
      console.error(e);
      alert('작업 삭제 중 오류가 발생했습니다.');
    }
  }

  function renderMaterialSearchResults(keyword) {
    const box = document.getElementById('material-search-results');
    if (!box) return;

    const q = String(keyword || '').trim().toLowerCase();
    const selected = new Set(state.selectedMaterialsDetailed.map(item => item.name));
    const items = state.materials.filter(item => {
      const name = materialName(item);
      return !selected.has(name) && (!q || name.toLowerCase().includes(q));
    });

    box.innerHTML = items.length
      ? items.map(item => `
          <button type="button" class="btn" data-add-material="${escapeHtml(materialName(item))}" data-unit="${escapeHtml(materialUnit(item))}">
            ${escapeHtml(materialName(item))}${materialUnit(item) ? ` (${escapeHtml(materialUnit(item))})` : ''}
          </button>
        `).join('')
      : '<div class="empty-msg">검색 결과 없음</div>';

    box.querySelectorAll('[data-add-material]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedMaterialsDetailed.push({
          name: btn.dataset.addMaterial,
          qty: '',
          unit: btn.dataset.unit || getMaterialUnit(btn.dataset.addMaterial) || ''
        });
        const input = document.getElementById('material-search-input');
        if (input) input.value = '';
        renderSelectedMaterialsDetailed();
        renderMaterialSearchResults('');
      });
    });
  }

  function renderSelectedMaterialsDetailed() {
    const wrap = document.getElementById('selected-materials-detailed');
    if (!wrap) return;

    if (!state.selectedMaterialsDetailed.length) {
      wrap.innerHTML = '<div class="empty-msg">선택된 자재 없음</div>';
      return;
    }

    wrap.innerHTML = state.selectedMaterialsDetailed.map((item, idx) => `
      <div class="panel" style="margin-bottom:8px; padding:10px;">
        <div style="display:grid; grid-template-columns:1.2fr 0.7fr 0.7fr auto; gap:8px; align-items:end;">
          <div>
            <div style="font-size:12px; color:#666; margin-bottom:4px;">자재명</div>
            <div>${escapeHtml(item.name)}</div>
          </div>
          <label class="field" style="margin:0;">
            <span>수량</span>
            <input type="number" step="0.01" min="0" value="${escapeHtml(String(item.qty ?? ''))}" data-material-qty="${idx}">
          </label>
          <label class="field" style="margin:0;">
            <span>단위</span>
            <input type="text" value="${escapeHtml(item.unit || '')}" data-material-unit="${idx}">
          </label>
          <button type="button" class="btn" data-remove-material="${idx}">삭제</button>
        </div>
      </div>
    `).join('');

    wrap.querySelectorAll('[data-material-qty]').forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.materialQty);
        state.selectedMaterialsDetailed[idx].qty = input.value;
      });
    });

    wrap.querySelectorAll('[data-material-unit]').forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.materialUnit);
        state.selectedMaterialsDetailed[idx].unit = input.value;
      });
    });

    wrap.querySelectorAll('[data-remove-material]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.removeMaterial);
        state.selectedMaterialsDetailed.splice(idx, 1);
        renderSelectedMaterialsDetailed();
        renderMaterialSearchResults(document.getElementById('material-search-input')?.value || '');
      });
    });
  }

  function addLaborRow(data = {}) {
    const wrap = document.getElementById('labor-rows-wrap');
    if (!wrap) return;

    const row = document.createElement('div');
    row.className = 'panel';
    row.style.marginBottom = '8px';
    row.style.padding = '10px';
    row.innerHTML = `
      <div style="display:grid; grid-template-columns:0.8fr 0.8fr 1fr 1fr auto; gap:8px; align-items:end;">
        <label class="field" style="margin:0;">
          <span>유형</span>
          <select class="labor-type">
            <option value="">선택</option>
            <option value="남자" ${data.type === '남자' ? 'selected' : ''}>남자</option>
            <option value="여자" ${data.type === '여자' ? 'selected' : ''}>여자</option>
            <option value="기타" ${data.type === '기타' ? 'selected' : ''}>기타</option>
          </select>
        </label>
        <label class="field" style="margin:0;">
          <span>금액</span>
          <input type="number" class="labor-amount" min="0" step="1000" value="${escapeHtml(String(data.amount ?? ''))}">
        </label>
        <label class="field" style="margin:0;">
          <span>구분</span>
          <input type="text" class="labor-category" value="${escapeHtml(data.category || '')}">
        </label>
        <label class="field" style="margin:0;">
          <span>비고</span>
          <input type="text" class="labor-note" value="${escapeHtml(data.note || '')}">
        </label>
        <button type="button" class="btn labor-remove">삭제</button>
      </div>
    `;

    wrap.appendChild(row);
    row.querySelector('.labor-remove').addEventListener('click', () => row.remove());
  }

  function resetLaborRows(rows = []) {
    const wrap = document.getElementById('labor-rows-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!rows.length) {
      addLaborRow();
      return;
    }
    rows.forEach(row => addLaborRow(row));
  }

  function collectLaborRows() {
    const wrap = document.getElementById('labor-rows-wrap');
    if (!wrap) return [];

    return Array.from(wrap.children).map(row => ({
      type: row.querySelector('.labor-type')?.value || '',
      amount: toNumber(row.querySelector('.labor-amount')?.value || 0),
      category: row.querySelector('.labor-category')?.value || '',
      note: row.querySelector('.labor-note')?.value || ''
    })).filter(item => item.type || item.amount || item.category || item.note);
  }

  async function saveMaterial() {
    const payload = {
      name: (el.material_name.value || '').trim(),
      unit: (el.material_unit.value || '').trim(),
      stock_qty: toNumber(el.material_stock.value || 0),
      unit_price: toNumber(el.material_price.value || 0),
      memo: (el.material_memo.value || '').trim()
    };

    if (!payload.name) return alert('자재명을 입력하세요.');

    try {
      await apiPost('/api/materials', payload);
      el.material_name.value = '';
      el.material_unit.value = '';
      el.material_stock.value = '0';
      el.material_price.value = '0';
      el.material_memo.value = '';
      await loadMaterials();
      await loadOptions();
      renderMaterials();
      renderWorkFormOptions();
      renderOptions();
    } catch (e) {
      console.error(e);
      alert('자재 저장 중 오류가 발생했습니다.');
    }
  }

  function renderMaterials() {
    if (!el['materials-list']) return;

    const inStock = state.materials.filter(item => toNumber(item.stock_qty ?? item.재고 ?? 0) > 0);
    const outStock = state.materials.filter(item => toNumber(item.stock_qty ?? item.재고 ?? 0) <= 0);

    el['materials-list'].innerHTML = `
      <div class="panel" style="margin-bottom:12px;">
        <strong>전체 ${state.materials.length}개 | 재고 있음 ${inStock.length}개 | 재고 없음 ${outStock.length}개</strong>
      </div>
      <div class="grid two">
        <div class="panel">
          <h3>재고 있음</h3>
          ${inStock.length ? renderMaterialTable(inStock) : '<div class="empty-msg">재고 있는 자재 없음</div>'}
        </div>
        <div class="panel">
          <h3>재고 없음</h3>
          ${outStock.length ? renderMaterialTable(outStock) : '<div class="empty-msg">재고 없는 자재 없음</div>'}
        </div>
      </div>
    `;

    el['materials-list'].querySelectorAll('[data-material-adjust]').forEach(btn => {
      btn.addEventListener('click', () => adjustMaterialStock(btn.dataset.materialAdjust, btn.dataset.mode));
    });
  }

  function renderMaterialTable(items) {
    return `
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; padding:6px;">자재명</th>
            <th style="text-align:left; padding:6px;">단위</th>
            <th style="text-align:right; padding:6px;">재고</th>
            <th style="text-align:right; padding:6px;">단가</th>
            <th style="text-align:left; padding:6px;">처리</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td style="padding:6px;">${escapeHtml(materialName(item))}</td>
              <td style="padding:6px;">${escapeHtml(materialUnit(item))}</td>
              <td style="padding:6px; text-align:right;">${numberWithComma(toNumber(item.stock_qty ?? item.재고 ?? 0))}</td>
              <td style="padding:6px; text-align:right;">${numberWithComma(toNumber(item.unit_price ?? item.가격 ?? 0))}</td>
              <td style="padding:6px;">
                <button class="btn" data-material-adjust="${escapeHtml(materialName(item))}" data-mode="in">입고</button>
                <button class="btn" data-material-adjust="${escapeHtml(materialName(item))}" data-mode="out">사용</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  async function adjustMaterialStock(name, mode) {
    const item = state.materials.find(m => materialName(m) === name);
    if (!item) return;
    const input = prompt(mode === 'in' ? '입고 수량' : '사용 수량', '0');
    if (input === null) return;
    const qty = Number(input);
    if (!Number.isFinite(qty) || qty < 0) return alert('올바른 수량을 입력하세요.');

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

  function renderOptions() {
    renderOptionList('weather', el['options-weather']);
    renderOptionList('crops', el['options-crops']);
    renderOptionList('tasks', el['options-tasks']);
    renderOptionList('pests', el['options-pests']);
    renderOptionList('materials', el['options-materials']);
    renderOptionList('machines', el['options-machines']);
  }

  function renderOptionList(type, container) {
    if (!container) return;
    const items = state.options[type] || [];
    container.innerHTML = items.map(item => {
      const id = optionId(item);
      const name = optionName(item);
      return `
        <div class="panel" style="padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; gap:8px; align-items:center;">
          <span>${escapeHtml(name)}</span>
          <div style="display:flex; gap:6px;">
            <button class="btn" data-option-edit="${escapeHtml(type)}|${escapeHtml(String(id))}">수정</button>
            <button class="btn" data-option-delete="${escapeHtml(type)}|${escapeHtml(String(id))}">삭제</button>
          </div>
        </div>
      `;
    }).join('');

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

  window.saveOption = async function (type, inputId) {
    const input = document.getElementById(inputId);
    const name = (input?.value || '').trim();
    if (!name) return;

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

  async function editOption(type, id) {
    const item = (state.options[type] || []).find(opt => String(optionId(opt)) === String(id));
    if (!item) return;
    const name = prompt('옵션명 수정', optionName(item));
    if (name === null || !name.trim()) return;

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

  async function deleteOption(type, id) {
    if (!confirm('이 옵션을 삭제하시겠습니까?')) return;
    try {
      await apiDelete(`/api/options/${type}/${id}`);
      await loadOptions();
      renderOptions();
      renderWorkFormOptions();
    } catch (e) {
      console.error(e);
      alert('옵션 삭제 중 오류가 발생했습니다.');
    }
  }

  function renderSelect(select, items, placeholder) {
    if (!select) return;
    const current = select.value;
    select.innerHTML = `<option value="">${escapeHtml(placeholder || '선택')}</option>` +
      items.map(item => `<option value="${escapeHtml(optionName(item))}">${escapeHtml(optionName(item))}</option>`).join('');
    setSelectValue(select, current);
  }

  function renderChecks(container, items) {
    if (!container) return;
    const selected = collectChecked(container);
    container.innerHTML = items.map(item => {
      const name = optionName(item);
      const id = `${container.id}-${slug(name)}`;
      return `
        <label>
          <input type="checkbox" id="${escapeHtml(id)}" value="${escapeHtml(name)}" ${selected.includes(name) ? 'checked' : ''}>
          <span>${escapeHtml(name)}</span>
        </label>
      `;
    }).join('');
  }

  function collectChecked(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(x => x.value);
  }

  function checkValues(container, values) {
    renderChecks(container, state.options[mapContainerToOptionKey(container.id)] || []);
    const set = new Set(values || []);
    container.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.checked = set.has(chk.value);
    });
  }

  function uncheckAll(container) {
    if (!container) return;
    container.querySelectorAll('input[type="checkbox"]').forEach(chk => chk.checked = false);
  }

  function mapContainerToOptionKey(id) {
    return {
      'crops-box': 'crops',
      'pests-box': 'pests',
      'machines-box': 'machines'
    }[id] || '';
  }

  function parseMemo(memo) {
    if (!memo) return { memo_text: '', materials: [], labor_rows: [] };
    try {
      const obj = typeof memo === 'string' ? JSON.parse(memo) : memo;
      return {
        memo_text: obj.memo_text || obj.note || '',
        materials: Array.isArray(obj.materials) ? obj.materials : [],
        labor_rows: Array.isArray(obj.labor_rows) ? obj.labor_rows : []
      };
    } catch {
      return { memo_text: String(memo), materials: [], labor_rows: [] };
    }
  }

  function formatMaterials(materials) {
    if (!Array.isArray(materials) || !materials.length) return '';
    return materials.map(item => `${item.name || ''}${item.qty !== undefined && item.qty !== '' ? ' ' + item.qty : ''}${item.unit || ''}`).join(', ');
  }

  function materialName(item) {
    return item.name ?? item.자재명 ?? '';
  }

  function materialUnit(item) {
    return item.unit ?? item.단위 ?? getMaterialUnit(materialName(item)) ?? '';
  }

  function getMaterialUnit(name) {
    const material = state.materials.find(item => materialName(item) === name);
    if (material) return material.unit ?? material.단위 ?? '';
    const opt = (state.options.materials || []).find(item => optionName(item) === name);
    return opt?.unit ?? opt?.단위 ?? '';
  }

  function optionName(item) {
    if (typeof item === 'string') return item;
    return item.name ?? item.value ?? item.label ?? '';
  }

  function optionId(item) {
    if (typeof item === 'string') return item;
    return item.id ?? item.value ?? item.name;
  }

  function normalizeOptions(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  function normalizePlanDate(v) {
    if (!v) return '';
    return String(v).slice(0, 10);
  }

  function isDateInRange(target, start, end) {
    const t = String(target).slice(0, 10);
    const s = String(start || '').slice(0, 10);
    const e = String(end || start || '').slice(0, 10);
    return !!s && t >= s && t <= e;
  }

  function csvToArray(value) {
    return String(value || '').split(',').map(x => x.trim()).filter(Boolean);
  }

  function setSelectValue(select, value) {
    if (!select) return;
    const exists = Array.from(select.options).some(opt => opt.value === value);
    select.value = exists ? value : '';
  }

  function addHidden(node) {
    if (node) node.classList.add('hidden');
  }

  function removeHidden(node) {
    if (node) node.classList.remove('hidden');
  }

  function today() {
    return fmtDate(new Date());
  }

  function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function numberWithComma(value) {
    return toNumber(value).toLocaleString();
  }

  function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function slug(v) {
    return String(v || '').replace(/[^a-zA-Z0-9가-힣]+/g, '_');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function on(node, event, handler) {
    if (node) node.addEventListener(event, handler);
  }

  async function apiGet(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    return res.json();
  }

  async function apiPost(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    return tryJson(res);
  }

  async function apiPut(url, body) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    return tryJson(res);
  }

  async function apiDelete(url) {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    return tryJson(res);
  }

  async function tryJson(res) {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { ok: true, raw: text };
    }
  }
})();
