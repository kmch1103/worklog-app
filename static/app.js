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
    await loadMoney();
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
      'start_date', 'repeat_days', 'end_date', 'weather', 'task_name', 'crops-box', 'pests-box', 'machines-box',
      'labor_cost', 'work_hours', 'memo', 'btn-save-work', 'btn-cancel-work', 'works-list',
      'material_name', 'material_unit', 'material_stock', 'material_price', 'material_memo',
      'btn-save-material', 'btn-open-material-modal', 'btn-close-material-modal', 'btn-cancel-material',
      'material-modal', 'material-modal-title', 'material-search-box', 'material-search-keyword', 'materials-list',
      'new-weather', 'new-crops', 'new-tasks', 'new-pests', 'new-materials', 'new-machines',
      'options-weather', 'options-crops', 'options-tasks', 'options-pests', 'options-materials', 'options-machines',
      'material-search-input', 'material-search-results', 'selected-materials-detailed',
      'labor-rows-wrap', 'btn-add-labor-row',
      'has_money', 'money-box', 'money_method', 'money_note', 'other_cost', 'money_labor_total', 'money_material_total', 'money_total_amount',
      'money-start', 'money-end', 'money-type-filter', 'money-method-filter',
      'btn-money-filter', 'money-list', 'money-total', 'money-cash', 'money-card'
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
    if (el['other_cost']) el['other_cost'].value = '0';
    if (el['money_method']) el['money_method'].value = '';
    if (el['money_note']) el['money_note'].value = '';
    updateMoneySummary();
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

    on(el['start_date'], 'change', updateEndDateFromRepeatDays);
    on(el['repeat_days'], 'input', updateEndDateFromRepeatDays);

    on(el['has_money'], 'change', () => {
      toggleMoneyBox(el['has_money'].checked);
      updateMoneySummary();
    });

    on(el['other_cost'], 'input', updateMoneySummary);

    on(el['btn-money-filter'], 'click', renderMoney);
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

    if (input.value !== keyword) {
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
    } else if (page === 'money') {
      renderMoney();
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
        title: plan.title || '',
        details: plan.details || '',
        status: 'done'
      });
      await loadPlans();
      renderCalendar();
      renderCalendarSidePanel();
    } catch (e) {
      console.error(e);
      alert('계획 상태 변경 중 오류가 발생했습니다.');
    }
  }

  function convertPlanToWork(planId) {
    const plan = state.plans.find(p => String(p.id) === String(planId));
    if (!plan) return;

    openWorkModal();
    el.start_date.value = normalizePlanDate(plan.plan_date);
    el.end_date.value = normalizePlanDate(plan.plan_date);
    if (el.task_name) el.task_name.value = plan.title || '';
    if (el.memo) el.memo.value = plan.details || '';
  }

  function deletePlan(planId) {
    if (!confirm('삭제하시겠습니까?')) return;

    apiDelete(`/api/plans/${planId}`)
      .then(() => {
        loadPlans().then(() => {
          renderCalendar();
          renderCalendarSidePanel();
        });
      })
      .catch(err => {
        console.error(err);
        alert('삭제 실패');
      });
  }

  // ==========================
  // 작업 모달
  // ==========================

  function openWorkModal() {
    state.editingWorkId = null;
    el['work-modal-title'].textContent = '작업 입력';

    resetWorkForm();

    const defaultDate = state.selectedDate || fmtDate(new Date());
    if (el.start_date) el.start_date.value = defaultDate;
    if (el.repeat_days) el.repeat_days.value = 1;
    updateEndDateFromRepeatDays();

    removeHidden(el['work-modal']);
  }

  function openWorkModalById(id) {
    const work = state.works.find(w => String(w.id) === String(id));
    if (!work) return;

    state.editingWorkId = work.id;
    el['work-modal-title'].textContent = '작업 수정';

    fillWorkForm(work);
    removeHidden(el['work-modal']);
  }

  function closeWorkModal() {
    addHidden(el['work-modal']);
    state.editingWorkId = null;
  }

  function resetWorkForm() {
    el.start_date.value = '';
    if (el.repeat_days) el.repeat_days.value = 1;
    el.end_date.value = '';
    el.weather.value = '';
    el.task_name.value = '';
    if (el.work_hours) el.work_hours.value = 0;
    el.memo.value = '';

    clearChipSelections('crops');
    clearChipSelections('pests');
    clearChipSelections('machines');

    resetMoneyFields();
    resetLaborRows();
    state.selectedMaterialsDetailed = [];
    renderSelectedMaterialsDetailed();
  }

  function fillWorkForm(work) {
    const meta = parseMemo(work.memo);

    el.start_date.value = work.start_date || '';
    if (el.repeat_days) {
      el.repeat_days.value = Number(meta.repeat_days || calcRepeatDays(work.start_date, work.end_date) || 1);
    }
    el.end_date.value = work.end_date || work.start_date || '';
    el.weather.value = work.weather || '';
    el.task_name.value = work.task_name || '';
    if (el.work_hours) el.work_hours.value = work.work_hours || meta.work_hours || 0;
    el.memo.value = meta.memo_text || '';

    setChipSelections('crops', splitCsv(work.crops));
    setChipSelections('pests', splitCsv(work.pests));
    setChipSelections('machines', splitCsv(work.machines));

    state.selectedMaterialsDetailed = Array.isArray(meta.materials) ? meta.materials.map(m => ({
      id: m.id || '',
      name: m.name || '',
      unit: m.unit || '',
      price: Number(m.price || m.unit_price || 0),
      qty: Number(m.qty || 0) || 0
    })) : [];
    renderSelectedMaterialsDetailed();

    resetLaborRows();
    if (Array.isArray(meta.labor_rows) && meta.labor_rows.length) {
      meta.labor_rows.forEach(row => addLaborRow(row.amount || 0));
    }

    if (meta.money) {
      el.has_money.checked = true;
      toggleMoneyBox(true);

      el.money_method.value = meta.money.method || '';
      el.money_note.value = meta.money.note || '';
      el.other_cost.value = meta.money.other_total || 0;
    } else {
      resetMoneyFields();
    }

    updateEndDateFromRepeatDays();
    updateMoneySummary();
  }

  // ==========================
  // 자동 합산 핵심
  // ==========================

  function getLaborTotal() {
    let total = 0;
    document.querySelectorAll('.labor-row .labor-amount-input').forEach(el => {
      total += Number(el.value) || 0;
    });
    return total;
  }

  function getMaterialTotal() {
    let total = 0;

    state.selectedMaterialsDetailed.forEach(m => {
      total += (m.price || 0) * (m.qty || 0);
    });

    return total;
  }

  function getOtherTotal() {
    return Number(el.other_cost?.value) || 0;
  }

  function updateMoneySummary() {
    const labor = getLaborTotal();
    const material = getMaterialTotal();
    const other = getOtherTotal();

    const total = labor + material + other;

    if (el.money_labor_total) el.money_labor_total.innerText = labor;
    if (el.money_material_total) el.money_material_total.innerText = material;
    if (el.money_total_amount) el.money_total_amount.innerText = total;
  }

  // ==========================
  // 자재 선택
  // ==========================

  function renderSelectedMaterialsDetailed() {
    if (!el['selected-materials-detailed']) return;

    el['selected-materials-detailed'].innerHTML =
      state.selectedMaterialsDetailed.map((m, idx) => `
        <div class="material-row">
          ${m.name}
          <input type="number" value="${m.qty}" 
            onchange="updateMaterialQty(${idx}, this.value)">
          <button onclick="removeMaterial(${idx})">삭제</button>
        </div>
      `).join('');

    updateMoneySummary();
  }

  window.updateMaterialQty = function (idx, qty) {
    state.selectedMaterialsDetailed[idx].qty = Number(qty) || 0;
    updateMoneySummary();
  };

  window.removeMaterial = function (idx) {
    state.selectedMaterialsDetailed.splice(idx, 1);
    renderSelectedMaterialsDetailed();
  };

  // ==========================
  // 인건비
  // ==========================

  function addLaborRow(amount = 0) {
    const wrap = el['labor-rows-wrap'];
    if (!wrap) return;

    const div = document.createElement('div');
    div.className = 'labor-row';

    div.innerHTML = `
      <input type="number" class="labor-amount-input" min="0" step="100" value="${Number(amount) || 0}" onchange="updateMoneySummary()">
      <button type="button" onclick="this.parentElement.remove(); updateMoneySummary()">삭제</button>
    `;

    wrap.appendChild(div);
    updateMoneySummary();
  }

  function resetLaborRows() {
    if (!el['labor-rows-wrap']) return;
    el['labor-rows-wrap'].innerHTML = '';
  }

  function getLaborRows() {
    return Array.from(document.querySelectorAll('.labor-amount-input')).map(node => ({
      amount: Number(node.value) || 0
    })).filter(row => row.amount > 0);
  }

  function updateEndDateFromRepeatDays() {
    if (!el.start_date || !el.end_date) return;
    const start = el.start_date.value;
    const repeatDays = Math.max(1, Number(el.repeat_days?.value) || 1);
    if (!start) {
      el.end_date.value = '';
      return;
    }

    const d = new Date(start + 'T00:00:00');
    d.setDate(d.getDate() + repeatDays - 1);
    el.end_date.value = fmtDate(d);
  }

  function calcRepeatDays(startDate, endDate) {
    const start = String(startDate || '').slice(0, 10);
    const end = String(endDate || startDate || '').slice(0, 10);
    if (!start || !end) return 1;
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const diff = Math.round((e - s) / 86400000);
    return diff >= 0 ? diff + 1 : 1;
  }

  // ==========================
  // 저장
  // ==========================

  async function saveWork() {

    const hasMoney = el.has_money.checked;

    let money = null;

    if (hasMoney) {
      const labor = getLaborTotal();
      const material = getMaterialTotal();
      const other = getOtherTotal();
      const total = labor + material + other;

      money = {
        type: labor > 0 && material > 0 ? '인건비+자재비' : labor > 0 ? '인건비' : material > 0 ? '자재비' : '기타',
        total_amount: total,
        labor_total: labor,
        material_total: material,
        other_total: other,
        method: el.money_method.value,
        note: el.money_note.value
      };
    }

    updateEndDateFromRepeatDays();

    const payload = {
      start_date: el.start_date.value,
      end_date: el.end_date.value,
      weather: el.weather.value,
      crops: getSelectedChipValues('crops').join(','),
      task_name: el.task_name.value,
      pests: getSelectedChipValues('pests').join(','),
      machines: getSelectedChipValues('machines').join(','),
      work_hours: Number(el.work_hours?.value || 0),
      memo: JSON.stringify({
        memo_text: (el.memo.value || '').trim(),
        repeat_days: Math.max(1, Number(el.repeat_days?.value) || 1),
        materials: state.selectedMaterialsDetailed,
        labor_rows: getLaborRows(),
        work_hours: Number(el.work_hours?.value || 0),
        money: money
      })
    };

    try {
      if (state.editingWorkId) {
        await apiPut(`/api/works/${state.editingWorkId}`, payload);
      } else {
        await apiPost('/api/works', payload);
      }

      await loadWorks();
      await loadMoney();
      closeWorkModal();
      renderWorks();
      renderCalendar();
      renderCalendarSidePanel();
      renderMoney();

    } catch (e) {
      console.error(e);
      alert('저장 실패');
    }
  }

  // ==========================
  // 작업일지 목록
  // ==========================

  function renderWorks() {
    if (!el['works-list']) return;

    let works = [...state.works];

    if (state.workSearchKeyword) {
      const keyword = state.workSearchKeyword.trim();
      works = works.filter(w => {
        const meta = parseMemo(w.memo);
        const text = [
          w.start_date,
          w.end_date,
          w.weather,
          w.crops,
          w.task_name,
          w.pests,
          w.materials,
          w.machines,
          w.memo,
          formatMaterials(meta.materials)
        ].join(' ');
        return text.includes(keyword);
      });
    }

    if (!works.length) {
      el['works-list'].innerHTML = `<div class="empty-msg">등록된 작업일지가 없습니다.</div>`;
      return;
    }

    const grouped = {};
    works.forEach(w => {
      const key = w.start_date || '';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(w);
    });

    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    el['works-list'].innerHTML = dates.map(date => {
      const items = grouped[date];
      return `
        <div class="work-date-group">
          <div class="work-date-title">${escapeHtml(date)}</div>
          <div class="work-date-row ${items.length === 1 ? 'single-card' : ''}">
            ${items.map(renderWorkCard).join('')}
          </div>
        </div>
      `;
    }).join('');

    document.querySelectorAll('[data-work-edit]').forEach(btn => {
      btn.addEventListener('click', () => openWorkModalById(btn.dataset.workEdit));
    });

    document.querySelectorAll('[data-work-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
    });
  }

  function renderWorkCard(work) {
    const meta = parseMemo(work.memo);
    const money = meta.money || null;
    const memoText = meta.memo_text || '';
    const repeatDays = Number(meta.repeat_days || calcRepeatDays(work.start_date, work.end_date) || 1);

    return `
      <div class="work-card">
        <div class="work-card-title">${escapeHtml(work.task_name || '')}</div>
        <div>기간: ${escapeHtml(work.start_date || '')}${work.end_date && work.end_date !== work.start_date ? ' ~ ' + escapeHtml(work.end_date) : ''}${repeatDays > 1 ? ` (${repeatDays}일)` : ''}</div>
        <div>날씨: ${escapeHtml(work.weather || '')}</div>
        <div>작물: ${escapeHtml(work.crops || '')}</div>
        <div>병충해: ${escapeHtml(work.pests || '')}</div>
        <div>사용기계: ${escapeHtml(work.machines || '')}</div>
        <div>자재: ${escapeHtml(formatMaterials(meta.materials))}</div>
        <div>메모: ${escapeHtml(memoText)}</div>
        ${money ? `<div class="money-inline">총금액: ${formatNumber(money.total_amount || money.amount || 0)}원 / ${escapeHtml(money.method || '')}</div>` : ''}
        <div class="item-actions">
          <button class="btn" data-work-edit="${escapeHtml(String(work.id))}">수정</button>
          <button class="btn" data-work-delete="${escapeHtml(String(work.id))}">삭제</button>
        </div>
      </div>
    `;
  }

  async function deleteWork(workId) {
    if (!confirm('삭제하시겠습니까?')) return;

    try {
      await apiDelete(`/api/works/${workId}`);
      await loadWorks();
      renderWorks();
      renderCalendar();
      renderCalendarSidePanel();
      await loadMoney();
      renderMoney();
    } catch (e) {
      console.error(e);
      alert('삭제 실패');
    }
  }

  function ensureWorksSearchBar() {
    const pageHeader = document.querySelector('#page-works .page-header');
    if (!pageHeader) return;
    if (document.getElementById('works-search-input')) return;

    const box = document.createElement('div');
    box.className = 'works-search-box';
    box.innerHTML = `
      <input id="works-search-input" type="text" class="search-input" placeholder="작업내용 / 자재 / 병충해 검색">
    `;
    pageHeader.appendChild(box);

    const input = document.getElementById('works-search-input');
    input.value = state.workSearchKeyword || '';
    input.addEventListener('input', (e) => {
      state.workSearchKeyword = e.target.value || '';
      renderWorks();
    });
  }

  // ==========================
  // 자재관리
  // ==========================

  function renderMaterials() {
    if (!el['materials-list']) return;

    const hasStock = state.materials.filter(m => Number(m.stock_qty || 0) > 0);
    const noStock = state.materials.filter(m => Number(m.stock_qty || 0) <= 0);

    el['materials-list'].innerHTML = `
      <div class="materials-split">
        <div class="panel">
          <h3>재고 있음</h3>
          <div class="materials-grid">
            ${hasStock.length ? hasStock.map(renderMaterialCard).join('') : `<div class="empty-msg">없음</div>`}
          </div>
        </div>
        <div class="panel">
          <h3>재고 없음</h3>
          <div class="materials-grid">
            ${noStock.length ? noStock.map(renderMaterialCard).join('') : `<div class="empty-msg">없음</div>`}
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('[data-material-edit]').forEach(btn => {
      btn.addEventListener('click', () => openMaterialModal(btn.dataset.materialEdit));
    });

    document.querySelectorAll('[data-material-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteMaterial(btn.dataset.materialDelete));
    });
  }

  function renderMaterialCard(item) {
    return `
      <div class="material-card">
        <div class="material-name">${escapeHtml(item.name || '')}</div>
        <div class="material-meta">단위: ${escapeHtml(item.unit || '')} / 재고: ${formatNumber(item.stock_qty || 0)} / 단가: ${formatNumber(item.unit_price || 0)}</div>
        <div class="material-memo">${escapeHtml(item.memo || '')}</div>
        <div class="item-actions">
          <button class="btn" data-material-edit="${escapeHtml(String(item.id))}">수정</button>
          <button class="btn" data-material-delete="${escapeHtml(String(item.id))}">삭제</button>
        </div>
      </div>
    `;
  }

  function openMaterialModal(id = null) {
    state.editingMaterialId = id ? Number(id) : null;
    const item = state.materials.find(m => Number(m.id) === Number(id));

    if (el['material-modal-title']) {
      el['material-modal-title'].textContent = item ? '자재 수정' : '자재 추가';
    }

    if (item) {
      el.material_name.value = item.name || '';
      el.material_unit.value = item.unit || '개';
      el.material_stock.value = item.stock_qty || 0;
      el.material_price.value = item.unit_price || 0;
      el.material_memo.value = item.memo || '';
    } else {
      el.material_name.value = '';
      el.material_unit.value = '개';
      el.material_stock.value = 0;
      el.material_price.value = 0;
      el.material_memo.value = '';
    }

    removeHidden(el['material-modal']);
  }

  function closeMaterialModal() {
    addHidden(el['material-modal']);
    state.editingMaterialId = null;
  }

  async function saveMaterial() {
    const payload = {
      name: (el.material_name.value || '').trim(),
      unit: (el.material_unit.value || '').trim(),
      stock_qty: Number(el.material_stock.value) || 0,
      unit_price: Number(el.material_price.value) || 0,
      memo: (el.material_memo.value || '').trim()
    };

    if (!payload.name) return alert('자재명을 입력하세요.');

    try {
      if (state.editingMaterialId) {
        await apiPut(`/api/materials/${state.editingMaterialId}`, payload);
      } else {
        await apiPost('/api/materials', payload);
      }
      await loadMaterials();
      closeMaterialModal();
      renderMaterials();
    } catch (e) {
      console.error(e);
      alert('자재 저장 중 오류가 발생했습니다.');
    }
  }

  async function deleteMaterial(id) {
    if (!confirm('삭제하시겠습니까?')) return;

    try {
      await apiDelete(`/api/materials/${id}`);
      await loadMaterials();
      renderMaterials();
    } catch (e) {
      console.error(e);
      alert('자재 삭제 실패');
    }
  }

  function renderMaterialSearchResults(keyword) {
    if (!el['material-search-results']) return;

    const q = (keyword || '').trim();
    if (!q) {
      el['material-search-results'].innerHTML = '';
      return;
    }

    const matched = state.materials.filter(item => (item.name || '').includes(q));

    el['material-search-results'].innerHTML = matched.map(item => `
      <div class="search-result-item" data-pick-material="${escapeHtml(String(item.id))}">
        ${escapeHtml(item.name)} / 재고 ${formatNumber(item.stock_qty || 0)} / 단가 ${formatNumber(item.unit_price || 0)}
      </div>
    `).join('');

    document.querySelectorAll('[data-pick-material]').forEach(node => {
      node.addEventListener('click', () => {
        const item = state.materials.find(m => String(m.id) === String(node.dataset.pickMaterial));
        if (!item) return;

        const exists = state.selectedMaterialsDetailed.find(m => String(m.id) === String(item.id));
        if (exists) {
          exists.qty += 1;
        } else {
          state.selectedMaterialsDetailed.push({
            id: item.id,
            name: item.name,
            unit: item.unit || '',
            price: Number(item.unit_price || 0),
            qty: 1
          });
        }

        if (el['material-search-input']) el['material-search-input'].value = '';
        if (el['material-search-results']) el['material-search-results'].innerHTML = '';
        renderSelectedMaterialsDetailed();
      });
    });
  }

  function renderMaterialPickerResults(keyword) {
    if (!el['material-search-box']) return;

    const q = (keyword || '').trim();
    const matched = !q
      ? state.materials
      : state.materials.filter(item => (item.name || '').includes(q));

    el['material-search-box'].innerHTML = matched.map(item => `
      <div class="material-picker-row">
        <span>${escapeHtml(item.name || '')}</span>
      </div>
    `).join('');
  }

  // ==========================
  // 옵션관리
  // ==========================

  function renderOptions() {
    renderOptionList('weather', 'options-weather');
    renderOptionList('crops', 'options-crops');
    renderOptionList('tasks', 'options-tasks');
    renderOptionList('pests', 'options-pests');
    renderOptionList('materials', 'options-materials');
    renderOptionList('machines', 'options-machines');
  }

  function renderOptionList(type, targetId) {
    const node = el[targetId];
    if (!node) return;

    const items = state.options[type] || [];
    node.innerHTML = items.map(item => {
      const id = optionId(item);
      const name = optionName(item);
      return `
        <div class="option-item">
          <span>${escapeHtml(name)}</span>
          <button class="btn" onclick="editOption('${escapeHtml(type)}', '${escapeHtml(String(id))}', '${escapeHtml(name)}')">수정</button>
          <button class="btn" onclick="removeOption('${escapeHtml(type)}', '${escapeHtml(String(id))}')">삭제</button>
        </div>
      `;
    }).join('');
  }

  window.saveOption = async function (type, inputId) {
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
      alert('옵션 저장 실패');
    }
  };

  window.editOption = async function (type, id, oldName) {
    const name = prompt('수정할 이름', oldName || '');
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      await apiPut(`/api/options/${type}/${id}`, { name: trimmed });
      await loadOptions();
      renderOptions();
      renderWorkFormOptions();
    } catch (e) {
      console.error(e);
      alert('옵션 수정 실패');
    }
  };

  window.removeOption = async function (type, id) {
    if (!confirm('삭제하시겠습니까?')) return;

    try {
      await apiDelete(`/api/options/${type}/${id}`);
      await loadOptions();
      renderOptions();
      renderWorkFormOptions();
    } catch (e) {
      console.error(e);
      alert('옵션 삭제 실패');
    }
  };

  function renderWorkFormOptions() {
    renderSelectOptions(el.weather, state.options.weather, true);
    renderSelectOptions(el.task_name, state.options.tasks, true);
    renderChipBox(el['crops-box'], state.options.crops, 'crops');
    renderChipBox(el['pests-box'], state.options.pests, 'pests');
    renderChipBox(el['machines-box'], state.options.machines, 'machines');
  }

  function renderSelectOptions(selectEl, items, includeEmpty = false) {
    if (!selectEl) return;
    const current = selectEl.value || '';
    selectEl.innerHTML =
      (includeEmpty ? `<option value="">선택</option>` : '') +
      (items || []).map(item => {
        const name = optionName(item);
        return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
      }).join('');
    setSelectValue(selectEl, current);
  }

  function renderChipBox(container, items, type) {
    if (!container) return;

    let selectedValues = [];
    if (type === 'crops') selectedValues = getSelectedChipValues('crops');
    if (type === 'pests') selectedValues = getSelectedChipValues('pests');
    if (type === 'machines') selectedValues = getSelectedChipValues('machines');

    container.innerHTML = (items || []).map(item => {
      const name = optionName(item);
      const active = selectedValues.includes(name) ? 'active' : '';
      return `<button type="button" class="chip ${active}" data-chip-type="${escapeHtml(type)}" data-chip-value="${escapeHtml(name)}">${escapeHtml(name)}</button>`;
    }).join('');

    container.querySelectorAll('[data-chip-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
      });
    });
  }

  function getSelectedChipValues(type) {
    return Array.from(document.querySelectorAll(`[data-chip-type="${type}"].active`))
      .map(node => node.dataset.chipValue)
      .filter(Boolean);
  }

  function setChipSelections(type, values) {
    const selected = new Set((values || []).filter(Boolean));
    document.querySelectorAll(`[data-chip-type="${type}"]`).forEach(node => {
      node.classList.toggle('active', selected.has(node.dataset.chipValue));
    });
  }

  function clearChipSelections(type) {
    document.querySelectorAll(`[data-chip-type="${type}"]`).forEach(node => {
      node.classList.remove('active');
    });
  }

  function splitCsv(value) {
    return String(value || '').split(',').map(v => v.trim()).filter(Boolean);
  }

  // ==========================
  // 금전관리
  // ==========================

  async function loadMoney() {
    try {
      state.moneyRows = await apiGet('/api/money');
    } catch (e) {
      console.error(e);
      state.moneyRows = [];
    }
  }

  function renderMoney() {
    if (!el['money-list']) return;

    const start = el['money-start']?.value || '';
    const end = el['money-end']?.value || '';
    const typeFilter = el['money-type-filter']?.value || '';
    const methodFilter = el['money-method-filter']?.value || '';

    let rows = [...(state.moneyRows || [])].map(row => normalizeMoneyRow(row));

    if (start) rows = rows.filter(r => (r.date || '') >= start);
    if (end) rows = rows.filter(r => (r.date || '') <= end);
    if (typeFilter) rows = rows.filter(r => (r.type || '') === typeFilter);
    if (methodFilter) rows = rows.filter(r => (r.method || '') === methodFilter);

    const total = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const cash = rows
      .filter(r => ['현금', '계좌이체'].includes(r.method || ''))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const card = rows
      .filter(r => ['카드일시불', '카드할부', '외상', '카드'].includes(r.method || ''))
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);

    if (el['money-total']) el['money-total'].innerText = formatNumber(total);
    if (el['money-cash']) el['money-cash'].innerText = formatNumber(cash);
    if (el['money-card']) el['money-card'].innerText = formatNumber(card);

    el['money-list'].innerHTML = rows.length ? rows.map(r => `
      <tr>
        <td>${escapeHtml(r.date || '')}</td>
        <td>${escapeHtml(r.task_name || '')}</td>
        <td>${escapeHtml(r.type || '')}</td>
        <td>${formatNumber(r.amount || 0)}</td>
        <td>${escapeHtml(r.method || '')}</td>
        <td>${escapeHtml(r.note || '')}</td>
      </tr>
    `).join('') : `
      <tr><td colspan="6" class="empty-msg">조회 결과가 없습니다.</td></tr>
    `;
  }

  function normalizeMoneyRow(row) {
    const amount = Number(row?.total_amount ?? row?.amount ?? row?.total ?? 0);
    const rawType = String(row?.type || '').trim();
    let type = rawType;
    if (!type || type === '통합' || type === '인건비+자재비') {
      if (Number(row?.material_total || 0) > 0 && Number(row?.labor_total || 0) > 0) type = '기타';
      else if (Number(row?.material_total || 0) > 0) type = '자재비';
      else if (Number(row?.labor_total || 0) > 0) type = '인건비';
      else type = '기타';
    }
    return {
      ...row,
      amount,
      type,
      date: String(row?.date || row?.work_date || row?.start_date || '').slice(0, 10),
      task_name: row?.task_name || row?.task || '',
      method: row?.method || '',
      note: row?.note || row?.memo || ''
    };
  }

  // ==========================
  // API 유틸
  // ==========================

  async function apiGet(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    return res.json();
  }

  async function apiPost(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    return res.json();
  }

  async function apiPut(url, payload) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload || {})
    });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    return res.json();
  }

  async function apiDelete(url) {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`${url} ${res.status}`);
    return res.json();
  }

  // ==========================
  // 공통 유틸
  // ==========================

  function on(node, eventName, handler) {
    if (node) node.addEventListener(eventName, handler);
  }

  function addHidden(node) {
    if (node) node.classList.add('hidden');
  }

  function removeHidden(node) {
    if (node) node.classList.remove('hidden');
  }

  function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function normalizePlanDate(v) {
    if (!v) return '';
    return String(v).slice(0, 10);
  }

  function isDateInRange(dateStr, startDate, endDate) {
    const start = String(startDate || '').slice(0, 10);
    const end = String(endDate || startDate || '').slice(0, 10);
    return start <= dateStr && dateStr <= end;
  }

  function parseMemo(memo) {
    if (!memo) return {};
    try {
      const parsed = JSON.parse(memo);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function formatMaterials(materials) {
    if (!materials) return '';
    if (Array.isArray(materials)) {
      return materials.map(m => {
        if (typeof m === 'string') return m;
        return `${m.name || ''}${m.qty ? ` ${m.qty}${m.unit || ''}` : ''}`.trim();
      }).join(', ');
    }
    return String(materials);
  }

  function normalizeOptions(items) {
    return Array.isArray(items) ? items : [];
  }

  function optionName(item) {
    if (typeof item === 'string') return item;
    return item?.name || '';
  }

  function optionId(item) {
    if (typeof item === 'string') return item;
    return item?.id ?? item?.name ?? '';
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    const values = Array.from(selectEl.options).map(opt => opt.value);
    selectEl.value = values.includes(value) ? value : '';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('ko-KR');
  }

  window.updateMoneySummary = updateMoneySummary;
})(); 
