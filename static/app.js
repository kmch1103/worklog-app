(function () {
  'use strict';

  const state = {
    currentPage: 'calendar',
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDate: null,
    editingWorkId: null,
    editingPlanId: null,
    editingMaterialId: null,
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
    selectedMaterialsDetailed: [],
    materialUnits: ['개', '병', '통', '봉', '포', 'kg', 'L', 'ml', '말']
  };

  const el = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheElements();
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
      'plan-modal', 'plan-modal-title', 'btn-close-plan-modal',
      'plan_date', 'plan_title', 'plan_details', 'plan_status',
      'btn-save-plan', 'btn-cancel-plan',
      'work-modal', 'work-modal-title', 'btn-close-work-modal',
      'btn-new-work',
      'start_date', 'end_date', 'weather', 'task_name', 'crops-box', 'pests-box', 'machines-box',
      'labor_cost', 'work_hours', 'memo', 'btn-save-work', 'btn-cancel-work', 'works-list',
      'material_name', 'material_unit', 'material_stock', 'material_price', 'material_memo',
      'btn-save-material', 'btn-open-material-modal', 'btn-close-material-modal', 'btn-cancel-material',
      'material-modal', 'material-modal-title', 'material-search-box', 'material-search-keyword', 'materials-list',
      'new-weather', 'new-crops', 'new-tasks', 'new-pests', 'new-materials', 'new-machines',
      'options-weather', 'options-crops', 'options-tasks', 'options-pests', 'options-materials', 'options-machines',
      'material-search-input', 'material-search-results', 'selected-materials-detailed',
      'labor-rows-wrap', 'btn-add-labor-row',
      'has_money', 'money-box', 'money_type', 'money_amount', 'money_method', 'money_note'
    ];

    ids.forEach(id => {
      el[id] = document.getElementById(id);
    });

    el.menuButtons = Array.from(document.querySelectorAll('.menu-btn[data-page]'));
  }

  function bindMenu() {
    el.menuButtons.forEach(btn => {
      btn.addEventListener('click', () => switchPage(btn.dataset.page));
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

  function toggleMoneyBox(show) {
    if (!el['money-box']) return;
    el['money-box'].classList.toggle('hidden', !show);
  }

  function resetMoneyFields() {
    if (el['has_money']) el['has_money'].checked = false;
    if (el['money_type']) el['money_type'].value = '';
    if (el['money_amount']) el['money_amount'].value = '0';
    if (el['money_method']) el['money_method'].value = '';
    if (el['money_note']) el['money_note'].value = '';
    toggleMoneyBox(false);
  }

  function bindWorkButtons() {
    on(el['btn-new-work'], 'click', () => openWorkModal());
    on(el['btn-close-work-modal'], 'click', closeWorkModal);
    on(el['btn-cancel-work'], 'click', closeWorkModal);
    on(el['btn-save-work'], 'click', saveWork);

    on(el['work-modal'], 'click', (e) => {
      if (e.target === el['work-modal']) closeWorkModal();
    });

    on(el['material-search-input'], 'input', (e) => {
      renderMaterialSearchResults(e.target.value || '');
    });

    on(el['btn-add-labor-row'], 'click', () => addLaborRow());

    on(el['has_money'], 'change', () => {
      toggleMoneyBox(el['has_money'].checked);
    });
  }

  function bindMaterialButtons() {
    on(el['btn-open-material-modal'], 'click', openMaterialModal);
    on(el['btn-close-material-modal'], 'click', closeMaterialModal);
    on(el['btn-cancel-material'], 'click', closeMaterialModal);
    on(el['btn-save-material'], 'click', saveMaterial);

    on(el['material-modal'], 'click', (e) => {
      if (e.target === el['material-modal']) closeMaterialModal();
    });

    on(el['material-search-keyword'], 'input', (e) => {
      const keyword = e.target.value || '';

      renderMaterialPickerResults(keyword);
      autoFillMaterialName(keyword);
    });
  }
function autoFillMaterialName(keyword) {
  if (!keyword) return;

  const input = el['material_name'] || el['material-name'];
  if (!input) return;

  // 이미 값이 있으면 덮어쓰지 않음
  if (!input.value.trim()) {
    input.value = keyword;
  }
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
    ensureWorksSearchBar();
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
      ensureWorksSearchBar();
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
      btn.addEventListener('click', () => openWorkModalById(btn.dataset.workEdit));
    });
    document.querySelectorAll('[data-work-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
    });
  }

  function openPlanModal(plan = null) {
    if (!state.selectedDate && !plan) return;

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

  function closePlanModal() {
    addHidden(el['plan-modal']);
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
      closePlanModal();
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
    openPlanModal(plan);
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
    openWorkModal();
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

  function openWorkModal() {
    state.editingWorkId = null;
    if (el['work-modal-title']) el['work-modal-title'].textContent = '새 작업 입력';

    el.start_date.value = state.selectedDate || today();
    el.end_date.value = state.selectedDate || today();
    el.weather.value = '';
    el.task_name.value = '';
    uncheckAll(el['crops-box']);
    uncheckAll(el['pests-box']);
    uncheckAll(el['machines-box']);
    el.work_hours.value = '0';
    el.memo.value = '';

    state.selectedMaterialsDetailed = [];
    renderSelectedMaterialsDetailed();
    renderMaterialSearchResults('');
    resetLaborRows();
    resetMoneyFields();

    removeHidden(el['work-modal']);
  }

  function closeWorkModal() {
    addHidden(el['work-modal']);
    state.editingWorkId = null;
  }

  function openWorkModalById(workId) {
    const work = state.works.find(w => String(w.id) === String(workId));
    if (!work) return;

    state.editingWorkId = work.id;
    if (el['work-modal-title']) el['work-modal-title'].textContent = '작업 수정';

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

    resetMoneyFields();

    if (meta.money) {
      if (el['has_money']) el['has_money'].checked = true;
      toggleMoneyBox(true);
      if (el['money_type']) el['money_type'].value = meta.money.type || '';
      if (el['money_amount']) el['money_amount'].value = meta.money.amount || '0';
      if (el['money_method']) el['money_method'].value = meta.money.method || '';
      if (el['money_note']) el['money_note'].value = meta.money.note || '';
    }

    renderSelectedMaterialsDetailed();
    renderMaterialSearchResults(document.getElementById('material-search-input')?.value || '');
    resetLaborRows(meta.labor_rows || []);
    removeHidden(el['work-modal']);
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
    if (!el['labor-rows-wrap']?.children.length) addLaborRow();
  }

  function ensureWorksSearchBar() {
    const pageHeader = el['page-works']?.querySelector('.page-header');
    if (!pageHeader || document.getElementById('works-search-wrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'works-search-wrap';
    wrap.innerHTML = `
      <input type="text" id="works-search-input" placeholder="작업내용, 작물, 병충해, 자재, 비고 검색" style="padding:8px 10px; border-radius:8px; border:1px solid #ccc; min-width:260px;">
      <button type="button" class="btn" id="btn-works-search">검색</button>
      <button type="button" class="btn" id="btn-works-search-reset">초기화</button>
    `;
    pageHeader.appendChild(wrap);

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
      btn.addEventListener('click', () => openWorkModalById(btn.dataset.editWorkId));
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
        ${meta.money ? `<div style="color:#2563eb; font-weight:600;">💰 ${escapeHtml(meta.money.type || '')} / ${numberWithComma(meta.money.amount || 0)}원 / ${escapeHtml(meta.money.method || '')}${meta.money.note ? ` / ${escapeHtml(meta.money.note)}` : ''}</div>` : ''}
        <div>비고: ${escapeHtml(meta.memo_text || '')}</div>
      </div>
    `;
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

    let money = null;
    const hasMoney = !!el['has_money']?.checked;

    if (hasMoney) {
      const moneyType = String(el['money_type']?.value || '').trim();
      const moneyAmount = Number(el['money_amount']?.value || 0);
      const moneyMethod = String(el['money_method']?.value || '').trim();
      const moneyNote = String(el['money_note']?.value || '').trim();

      if (!moneyType) return alert('비용구분을 선택하세요.');
      if (!Number.isFinite(moneyAmount) || moneyAmount <= 0) {
        return alert('금액은 0보다 크게 입력하세요.');
      }
      if (!moneyMethod) return alert('결제방식을 선택하세요.');

      money = {
        type: moneyType,
        amount: moneyAmount,
        method: moneyMethod,
        note: moneyNote
      };
    }

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
        material_cost_total: 0,
        money
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
      closeWorkModal();
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
    if (!el['material-search-results']) return;

    const q = String(keyword || '').trim().toLowerCase();
    const selected = new Set(state.selectedMaterialsDetailed.map(item => item.name));
    const items = state.materials.filter(item => {
      const name = materialName(item);
      return !selected.has(name) && (!q || name.toLowerCase().includes(q));
    });

    el['material-search-results'].innerHTML = items.length
      ? items.map(item => `
          <button type="button" class="btn" data-add-material="${escapeHtml(materialName(item))}" data-unit="${escapeHtml(materialUnit(item))}">
            ${escapeHtml(materialName(item))}${materialUnit(item) ? ` (${escapeHtml(materialUnit(item))})` : ''}
          </button>
        `).join('')
      : '<div class="empty-msg">검색 결과 없음</div>';

    el['material-search-results'].querySelectorAll('[data-add-material]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedMaterialsDetailed.push({
          name: btn.dataset.addMaterial,
          qty: '',
          unit: btn.dataset.unit || getMaterialUnit(btn.dataset.addMaterial) || ''
        });
        if (el['material-search-input']) el['material-search-input'].value = '';
        renderSelectedMaterialsDetailed();
        renderMaterialSearchResults('');
      });
    });
  }

  function renderSelectedMaterialsDetailed() {
    if (!el['selected-materials-detailed']) return;

    if (!state.selectedMaterialsDetailed.length) {
      el['selected-materials-detailed'].innerHTML = '<div class="empty-msg">선택된 자재 없음</div>';
      return;
    }

    el['selected-materials-detailed'].innerHTML = state.selectedMaterialsDetailed.map((item, idx) => `
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

    el['selected-materials-detailed'].querySelectorAll('[data-material-qty]').forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.materialQty);
        state.selectedMaterialsDetailed[idx].qty = input.value;
      });
    });

    el['selected-materials-detailed'].querySelectorAll('[data-material-unit]').forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.materialUnit);
        state.selectedMaterialsDetailed[idx].unit = input.value;
      });
    });

    el['selected-materials-detailed'].querySelectorAll('[data-remove-material]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.removeMaterial);
        state.selectedMaterialsDetailed.splice(idx, 1);
        renderSelectedMaterialsDetailed();
        renderMaterialSearchResults(el['material-search-input']?.value || '');
      });
    });
  }

  function addLaborRow(data = {}) {
    if (!el['labor-rows-wrap']) return;

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
          <span>인원</span>
          <input type="number" class="labor-count" min="0" step="1" value="${escapeHtml(String(data.count ?? ''))}">
        </label>
        <label class="field" style="margin:0;">
          <span>시간</span>
          <input type="number" class="labor-hours" min="0" step="0.5" value="${escapeHtml(String(data.hours ?? ''))}">
        </label>
        <label class="field" style="margin:0;">
          <span>금액</span>
          <input type="number" class="labor-amount" min="0" step="1000" value="${escapeHtml(String(data.amount ?? ''))}">
        </label>
        <button type="button" class="btn" data-remove-labor-row>삭제</button>
      </div>
    `;

    row.querySelector('[data-remove-labor-row]')?.addEventListener('click', () => {
      row.remove();
    });

    el['labor-rows-wrap'].appendChild(row);
  }

  function resetLaborRows(rows = []) {
    if (!el['labor-rows-wrap']) return;
    el['labor-rows-wrap'].innerHTML = '';
    const list = Array.isArray(rows) && rows.length ? rows : [{}];
    list.forEach(item => addLaborRow(item));
  }

  function collectLaborRows() {
    if (!el['labor-rows-wrap']) return [];
    return Array.from(el['labor-rows-wrap'].children).map(row => ({
      type: row.querySelector('.labor-type')?.value || '',
      count: row.querySelector('.labor-count')?.value || '',
      hours: row.querySelector('.labor-hours')?.value || '',
      amount: row.querySelector('.labor-amount')?.value || ''
    })).filter(item => item.type || item.count || item.hours || item.amount);
  }

  function renderMaterials() {
    if (!el['materials-list']) return;

    const total = state.materials.length;
    const inStock = state.materials.filter(item => toNumber(item.stock_qty) > 0);
    const outStock = state.materials.filter(item => toNumber(item.stock_qty) <= 0);

    el['materials-list'].innerHTML = `
      <div class="panel" style="margin-bottom:12px;">
        <strong>전체 ${total}개 | 재고 있음 ${inStock.length}개 | 재고 없음 ${outStock.length}개</strong>
      </div>
      <div class="grid two">
        <div class="panel">
          <h3>재고 있음</h3>
          ${inStock.length ? inStock.map(renderMaterialCard).join('') : '<div class="empty-msg">재고 있는 자재 없음</div>'}
        </div>
        <div class="panel">
          <h3>재고 없음</h3>
          ${outStock.length ? outStock.map(renderMaterialCard).join('') : '<div class="empty-msg">재고 없는 자재 없음</div>'}
        </div>
      </div>
    `;

    bindMaterialCardActions();
  }

  function renderMaterialCard(item) {
    const id = escapeHtml(String(item.id));
    const name = escapeHtml(materialName(item));
    const unit = escapeHtml(materialUnit(item));
    const stock = escapeHtml(String(item.stock_qty ?? 0));
    const price = escapeHtml(String(item.unit_price ?? 0));

    return `
      <div class="panel" style="margin-bottom:10px;">
        <div style="font-weight:700; margin-bottom:6px;">${name}</div>
        <div>단위: ${unit || '-'} / 재고: ${stock} / 단가: ${price}</div>
        <div style="display:flex; gap:6px; margin-top:8px;">
          <button class="btn" data-edit-material="${id}">수정</button>
          <button class="btn" data-stock-in="${id}">입고</button>
          <button class="btn" data-stock-out="${id}">사용</button>
        </div>
      </div>
    `;
  }

  function bindMaterialCardActions() {
    document.querySelectorAll('[data-edit-material]').forEach(btn => {
      btn.addEventListener('click', () => editMaterial(btn.dataset.editMaterial));
    });

    document.querySelectorAll('[data-stock-in]').forEach(btn => {
      btn.addEventListener('click', () => adjustMaterialStock(btn.dataset.stockIn, 'in'));
    });

    document.querySelectorAll('[data-stock-out]').forEach(btn => {
      btn.addEventListener('click', () => adjustMaterialStock(btn.dataset.stockOut, 'out'));
    });
  }

  function renderMaterialPickerResults(keyword) {
    if (!el['material-search-box']) return;

    const q = String(keyword || '').trim().toLowerCase();
    const items = state.materials.filter(item => {
      const name = materialName(item);
      return !q || name.toLowerCase().includes(q);
    });

    el['material-search-box'].innerHTML = items.length
      ? items.map(item => `
          <button type="button" class="btn" style="display:block; width:100%; text-align:left; margin-bottom:6px;"
            data-pick-material="${escapeHtml(String(item.id))}">
            ${escapeHtml(materialName(item))} / 단위 ${escapeHtml(materialUnit(item) || '-')} / 재고 ${escapeHtml(String(item.stock_qty ?? 0))}
          </button>
        `).join('')
      : '<div class="empty-msg">검색 결과 없음</div>';

    el['material-search-box'].querySelectorAll('[data-pick-material]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = state.materials.find(m => String(m.id) === String(btn.dataset.pickMaterial));
        if (!item) return;
        el['material_name'].value = materialName(item);
        el['material_unit'].value = materialUnit(item) || '';
        el['material_stock'].value = String(item.stock_qty ?? 0);
        el['material_price'].value = String(item.unit_price ?? 0);
        el['material_memo'].value = String(item.memo || '');
        state.editingMaterialId = item.id;
        if (el['material-modal-title']) el['material-modal-title'].textContent = '자재 수정';
      });
    });
  }

  function openMaterialModal() {
    state.editingMaterialId = null;
    if (el['material-modal-title']) el['material-modal-title'].textContent = '자재 등록';
    if (el['material_name']) el['material_name'].value = '';
    if (el['material_unit']) el['material_unit'].value = '';
    if (el['material_stock']) el['material_stock'].value = '0';
    if (el['material_price']) el['material_price'].value = '0';
    if (el['material_memo']) el['material_memo'].value = '';
    if (el['material-search-keyword']) el['material-search-keyword'].value = '';
    renderMaterialPickerResults('');
    removeHidden(el['material-modal']);
  }

  function closeMaterialModal() {
    addHidden(el['material-modal']);
    state.editingMaterialId = null;
  }

  function editMaterial(materialId) {
    const item = state.materials.find(m => String(m.id) === String(materialId));
    if (!item) return;
    state.editingMaterialId = item.id;
    if (el['material-modal-title']) el['material-modal-title'].textContent = '자재 수정';
    el['material_name'].value = materialName(item);
    el['material_unit'].value = materialUnit(item) || '';
    el['material_stock'].value = String(item.stock_qty ?? 0);
    el['material_price'].value = String(item.unit_price ?? 0);
    el['material_memo'].value = String(item.memo || '');
    if (el['material-search-keyword']) el['material-search-keyword'].value = materialName(item);
    renderMaterialPickerResults(materialName(item));
    removeHidden(el['material-modal']);
  }

  async function saveMaterial() {
    const payload = {
      name: String(el['material_name']?.value || '').trim(),
      unit: String(el['material_unit']?.value || '').trim(),
      stock_qty: Number(el['material_stock']?.value || 0),
      unit_price: Number(el['material_price']?.value || 0),
      memo: String(el['material_memo']?.value || '').trim()
    };

    if (!payload.name) return alert('자재명을 입력하세요.');

    try {
      if (state.editingMaterialId) {
        await apiPut(`/api/materials/${state.editingMaterialId}`, payload);
      } else {
        await apiPost('/api/materials', payload);
      }
      await loadMaterials();
      renderMaterials();
      closeMaterialModal();
    } catch (e) {
      console.error(e);
      alert('자재 저장 중 오류가 발생했습니다.');
    }
  }

  async function adjustMaterialStock(materialId, mode) {
    const item = state.materials.find(m => String(m.id) === String(materialId));
    if (!item) return;

    const label = mode === 'in' ? '입고' : '사용';
    const value = prompt(`${materialName(item)} ${label} 수량`, '0');
    if (value === null) return;

    const qty = Number(value);
    if (!Number.isFinite(qty) || qty < 0) {
      return alert('수량은 0 이상의 숫자로 입력하세요.');
    }

    const nextQty = mode === 'in'
      ? toNumber(item.stock_qty) + qty
      : toNumber(item.stock_qty) - qty;

    if (nextQty < 0) {
      return alert('재고보다 많이 사용할 수 없습니다.');
    }

    try {
      await apiPut(`/api/materials/${item.id}`, {
        name: materialName(item),
        unit: materialUnit(item),
        stock_qty: nextQty,
        unit_price: toNumber(item.unit_price),
        memo: String(item.memo || '')
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
    container.innerHTML = items.length
      ? items.map(item => `
          <div class="panel" style="margin-bottom:6px; padding:8px 10px; display:flex; justify-content:space-between; gap:8px; align-items:center;">
            <span>${escapeHtml(optionName(item))}</span>
            <button class="btn" data-delete-option="${escapeHtml(type)}|${escapeHtml(String(item.id))}">삭제</button>
          </div>
        `).join('')
      : '<div class="empty-msg">등록된 항목 없음</div>';

    container.querySelectorAll('[data-delete-option]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const [t, id] = btn.dataset.deleteOption.split('|');
        if (!confirm('삭제하시겠습니까?')) return;
        try {
          await apiDelete(`/api/options/${t}/${id}`);
          await loadOptions();
          renderOptions();
          renderWorkFormOptions();
        } catch (e) {
          console.error(e);
          alert('옵션 삭제 중 오류가 발생했습니다.');
        }
      });
    });
  }

  async function saveOption(type, inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const name = (input.value || '').trim();
    if (!name) return alert('값을 입력하세요.');

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
  }

  window.saveOption = saveOption;

  function normalizeOptions(items) {
    return Array.isArray(items) ? items : [];
  }

  function optionName(item) {
    if (item == null) return '';
    if (typeof item === 'string') return item;
    return String(item.name || item.value || '');
  }

  function renderSelect(select, items, placeholder = '선택') {
    if (!select) return;
    const current = select.value;
    select.innerHTML =
      `<option value="">${escapeHtml(placeholder)}</option>` +
      items.map(item => {
        const name = optionName(item);
        return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
      }).join('');
    setSelectValue(select, current);
  }

  function renderChecks(container, items) {
    if (!container) return;
    container.innerHTML = items.map(item => {
      const name = optionName(item);
      return `
        <label class="check-item">
          <input type="checkbox" value="${escapeHtml(name)}">
          <span>${escapeHtml(name)}</span>
        </label>
      `;
    }).join('');
  }

  function collectChecked(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
  }

  function checkValues(container, values) {
    if (!container) return;
    const set = new Set((values || []).map(v => String(v).trim()).filter(Boolean));
    container.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = set.has(input.value);
    });
  }

  function uncheckAll(container) {
    if (!container) return;
    container.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });
  }

  function setSelectValue(select, value) {
    if (!select) return;
    select.value = value || '';
  }

  function materialName(item) {
    return String(item?.name || item?.자재명 || '');
  }

  function materialUnit(item) {
    return String(item?.unit || item?.단위 || '');
  }

  function getMaterialUnit(name) {
    const item = state.materials.find(m => materialName(m) === name);
    return item ? materialUnit(item) : '';
  }

  function formatMaterials(materials) {
    if (!Array.isArray(materials)) return '';
    return materials.map(item => {
      const name = item?.name || '';
      const qty = item?.qty ?? '';
      const unit = item?.unit || '';
      return [name, qty, unit].filter(Boolean).join(' ');
    }).join(', ');
  }

  function parseMemo(value) {
    if (!value) return { memo_text: '', materials: [], labor_rows: [], material_cost_total: 0, money: null };
    try {
      const data = JSON.parse(value);
      return {
        memo_text: data.memo_text || '',
        materials: Array.isArray(data.materials) ? data.materials : [],
        labor_rows: Array.isArray(data.labor_rows) ? data.labor_rows : [],
        material_cost_total: data.material_cost_total || 0,
        money: data.money || null
      };
    } catch {
      return { memo_text: String(value), materials: [], labor_rows: [], material_cost_total: 0, money: null };
    }
  }

  function normalizePlanDate(value) {
    if (!value) return '';
    return String(value).slice(0, 10);
  }

  function isDateInRange(dateStr, startDate, endDate) {
    const s = normalizePlanDate(startDate);
    const e = normalizePlanDate(endDate || startDate);
    return s <= dateStr && dateStr <= e;
  }

  function fmtDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function today() {
    return fmtDate(new Date());
  }

  function addHidden(node) {
    if (!node) return;
    node.classList.add('hidden');
  }

  function removeHidden(node) {
    if (!node) return;
    node.classList.remove('hidden');
  }

  function on(node, event, handler) {
    if (!node) return;
    node.addEventListener(event, handler);
  }

  function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function numberWithComma(value) {
    return toNumber(value).toLocaleString('ko-KR');
  }

  function csvToArray(value) {
    if (!value) return [];
    return String(value).split(',').map(v => v.trim()).filter(Boolean);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
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
