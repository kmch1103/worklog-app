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
    moneyRows: [],
    options: {
      weather: [],
      crops: [],
      tasks: [],
      pests: [],
      machines: []
    },
    workSearchKeyword: '',
    selectedMaterialsDetailed: [],
    materialUnits: ['개', '병', '통', '봉', '포', 'kg', 'L', 'ml', '말', 'M'],
    mobileCalendarMode: 'current',
    materialListSearchKeyword: '',

    // 🔥 추가된 핵심
    optionTab: 'weather'
  };

  const el = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheElements();
    bindMenu();
    bindCalendarButtons();
    bindMobileCalendarButtons();
    bindWorkButtons();
    bindMaterialButtons();
    bindOptionButtons(); // 🔥 추가
    await loadAll();
    await loadMoney();
    renderAll();
    updateMobileCalendarMode();
    window.addEventListener('resize', updateMobileCalendarMode);
  }

  function cacheElements() {
    const ids = [
      'page-calendar', 'page-works', 'page-materials', 'page-money', 'page-options',
      'btn-prev-month', 'btn-next-month',
      'calendar-grid', 'calendar-compare-grid',

      'btn-new-work',
      'works-list',

      'materials-list',

      'options-weather', 'options-crops', 'options-tasks',
      'options-pests', 'options-machines'
    ];

    ids.forEach(id => {
      el[id] = document.getElementById(id);
    });

    el.menuButtons = Array.from(document.querySelectorAll('.menu-btn[data-page]'));

    // 🔥 옵션 버튼/패널
    el.optionTabButtons = Array.from(document.querySelectorAll('.option-tab-btn'));
    el.optionPanels = Array.from(document.querySelectorAll('.option-panel'));
  }

  function bindMenu() {
    el.menuButtons.forEach(btn => {
      btn.addEventListener('click', () => switchPage(btn.dataset.page));
    });
  }

  function bindOptionButtons() {
    el.optionTabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        state.optionTab = btn.dataset.optionTab;
        renderOptions();
      });
    });
  }

  function switchPage(page) {
    state.currentPage = page;

    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById('page-' + page).style.display = '';

    if (page === 'options') {
      renderOptions();
    }
  }

  async function loadAll() {
    await Promise.all([
      loadOptions()
    ]);
  }

  async function loadOptions() {
    try {
      const data = await apiGet('/api/options');
      state.options = data;
    } catch (e) {
      console.error(e);
    }
  }

  function renderAll() {
    renderOptions();
  }

  function renderOptions() {
    renderOptionList('weather', 'options-weather');
    renderOptionList('crops', 'options-crops');
    renderOptionList('tasks', 'options-tasks');
    renderOptionList('pests', 'options-pests');
    renderOptionList('machines', 'options-machines');

    const isMobile = window.innerWidth <= 900;

    el.optionTabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.optionTab === state.optionTab);
    });

    el.optionPanels.forEach(panel => {
      if (isMobile) {
        panel.style.display = panel.dataset.optionPanel === state.optionTab ? '' : 'none';
      } else {
        panel.style.display = '';
      }
    });
  }

  function renderOptionList(type, targetId) {
    const node = document.getElementById(targetId);
    if (!node) return;

    const items = state.options[type] || [];

    node.innerHTML = items.map(item => `
      <div class="option-item">
        <span>${item.name}</span>
        <button onclick="editOption('${type}','${item.id}','${item.name}')">수정</button>
        <button onclick="removeOption('${type}','${item.id}')">삭제</button>
      </div>
    `).join('');
  }

  window.saveOption = async function(type, inputId){
    const input = document.getElementById(inputId);
    const name = input.value.trim();
    if(!name) return;

    await apiPost(`/api/options/${type}`, {name});
    input.value='';
    await loadOptions();
    renderOptions();
  }

  window.editOption = async function(type, id, oldName){
    const name = prompt("수정", oldName);
    if(!name) return;

    await apiPut(`/api/options/${type}/${id}`, {name});
    await loadOptions();
    renderOptions();
  }

  window.removeOption = async function(type, id){
    if(!confirm("삭제?")) return;

    await apiDelete(`/api/options/${type}/${id}`);
    await loadOptions();
    renderOptions();
  }

  async function apiGet(url) {
    const res = await fetch(url);
    return res.json();
  }

  async function apiPost(url, data) {
    await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
  }

  async function apiPut(url, data) {
    await fetch(url, {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
  }

  async function apiDelete(url) {
    await fetch(url, {method:'DELETE'});
  }

})();

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
    moneyRows: [],
    options: {
      weather: [],
      crops: [],
      tasks: [],
      pests: [],
      machines: []
    },
    workSearchKeyword: '',
    selectedMaterialsDetailed: [],
    materialUnits: ['개', '병', '통', '봉', '포', 'kg', 'L', 'ml', '말', 'M'],
    mobileCalendarMode: 'current',
    optionTab: 'weather'
  };

  const el = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheElements();
    bindMenu();
    bindCalendarButtons();
    bindMobileCalendarButtons();
    bindWorkButtons();
    bindMaterialButtons();
    bindOptionButtons();
    bindCalendarDetailModal();
    await loadAll();
    await loadMoney();
    renderAll();
    updateMobileCalendarMode();
    window.addEventListener('resize', () => {
      updateMobileCalendarMode();
      renderOptions();
    });
  }

  function cacheElements() {
    const ids = [
      'page-calendar', 'page-works', 'page-materials', 'page-money', 'page-options', 'page-excel', 'page-backup',
      'btn-prev-month', 'btn-next-month', 'btn-mobile-current', 'btn-mobile-previous', 'calendar-title', 'calendar-current-title', 'calendar-grid', 'calendar-compare-title', 'calendar-compare-grid', 'calendar-compare-wrap',
      'btn-open-work-from-calendar', 'btn-open-plan-form',
      'plan-modal', 'plan-modal-title', 'btn-close-plan-modal',
      'plan_date', 'plan_title', 'plan_details', 'plan_status', 'plan-search', 'plan-search-results',
      'btn-save-plan', 'btn-cancel-plan',
      'calendar-detail-modal', 'calendar-detail-title', 'calendar-detail-body',
      'btn-close-calendar-detail', 'btn-calendar-add-plan', 'btn-calendar-add-work',
      'work-modal', 'work-modal-title', 'btn-close-work-modal',
      'btn-new-work',
      'start_date', 'repeat_days', 'end_date', 'start_time', 'end_time',
      'weather', 'task_name', 'crops-box', 'pests-box', 'machines-box',
      'labor_cost', 'work_hours', 'memo', 'btn-save-work', 'btn-cancel-work', 'works-list',
      'material_name', 'material_unit', 'material_stock', 'material_price', 'material_memo',
      'btn-save-material', 'btn-open-material-modal', 'btn-close-material-modal', 'btn-cancel-material',
      'material-modal', 'material-modal-title', 'material-search-box', 'material-search-keyword', 'materials-list',
      'new-weather', 'new-crops', 'new-tasks', 'new-pests', 'new-pests-recommend', 'new-machines',
      'options-weather', 'options-crops', 'options-tasks', 'options-pests', 'options-machines',
      'material-search-input', 'material-search-results', 'selected-materials-detailed',
      'recommended-materials-wrap', 'recommended-materials-box',
      'labor-rows-wrap', 'btn-add-labor-row',
      'has_money', 'money-box', 'money_note', 'other_cost', 'money_labor_total', 'money_material_total', 'money_total_amount',
      'money-start', 'money-end', 'money-type-filter', 'money-method-filter',
      'btn-money-filter', 'money-list', 'money-total', 'money-cash', 'money-card'
    ];

    ids.forEach(id => {
      el[id] = document.getElementById(id);
    });

    el.menuButtons = Array.from(document.querySelectorAll('.menu-btn[data-page]'));
    el.optionTabButtons = Array.from(document.querySelectorAll('.option-tab-btn[data-option-tab]'));
    el.optionPanels = Array.from(document.querySelectorAll('.option-panel[data-option-panel]'));
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
    on(el['plan-search'], 'input', renderPlanSearchResults);
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
        updateEndDateFromRepeatDays();
      }
    });
  }

  function bindMobileCalendarButtons() {
    on(el['btn-mobile-current'], 'click', () => {
      state.mobileCalendarMode = 'current';
      updateMobileCalendarMode();
    });

    on(el['btn-mobile-previous'], 'click', () => {
      state.mobileCalendarMode = 'previous';
      updateMobileCalendarMode();
    });
  }

  function updateMobileCalendarMode() {
    const wrap = el['calendar-compare-wrap'];
    if (!wrap) return;

    const isMobile = window.innerWidth <= 900;
    wrap.classList.remove('mobile-show-current', 'mobile-show-previous');

    if (isMobile) {
      wrap.classList.add(state.mobileCalendarMode === 'previous' ? 'mobile-show-previous' : 'mobile-show-current');
    }

    if (el['btn-mobile-current']) el['btn-mobile-current'].classList.toggle('active', state.mobileCalendarMode === 'current');
    if (el['btn-mobile-previous']) el['btn-mobile-previous'].classList.toggle('active', state.mobileCalendarMode === 'previous');
  }

  function bindCalendarDetailModal() {
    on(el['btn-close-calendar-detail'], 'click', closeCalendarDetailModal);

    on(el['calendar-detail-modal'], 'click', (e) => {
      if (e.target === el['calendar-detail-modal']) closeCalendarDetailModal();
    });

    on(el['btn-calendar-add-plan'], 'click', () => {
      closeCalendarDetailModal();
      openPlanModal();
    });

    on(el['btn-calendar-add-work'], 'click', () => {
      closeCalendarDetailModal();
      openWorkModal();
      if (state.selectedDate) {
        el.start_date.value = state.selectedDate;
        if (el.repeat_days) el.repeat_days.value = 1;
        updateEndDateFromRepeatDays();
      }
    });
  }

  function bindWorkButtons() {
    on(el['btn-new-work'], 'click', () => openWorkModal());
    on(el['btn-close-work-modal'], 'click', closeWorkModal);
    on(el['btn-cancel-work'], 'click', closeWorkModal);
    on(el['btn-save-work'], 'click', saveWork);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeWorkModal();
        closePlanModal();
        closeCalendarDetailModal();
        closeMaterialModal();
      }
    });

    on(el['material-search-input'], 'input', (e) => {
      renderMaterialSearchResults(e.target.value || '');
    });

    on(el['btn-add-labor-row'], 'click', () => addLaborRow());

    on(el['start_date'], 'change', updateEndDateFromRepeatDays);
    on(el['repeat_days'], 'input', updateEndDateFromRepeatDays);

    on(el['start_time'], 'change', updateWorkHoursFromTime);
    on(el['end_time'], 'change', updateWorkHoursFromTime);

    on(el['has_money'], 'change', () => {
      toggleMoneyBox(el['has_money'].checked);
      updateMoneySummary();
    });

    on(el['other_cost'], 'input', updateMoneySummary);
    on(el['btn-money-filter'], 'click', renderMoney);
  }

  function bindMaterialButtons() {
    on(el['btn-open-material-modal'], 'click', () => openMaterialModal());
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

  function bindOptionButtons() {
    (el.optionTabButtons || []).forEach(btn => {
      btn.addEventListener('click', () => {
        state.optionTab = btn.dataset.optionTab || 'weather';
        renderOptions();
      });
    });
  }

  function autoFillMaterialName(keyword) {
    if (!keyword) return;
    const input = el['material_name'];
    if (!input) return;
    if (input.value !== keyword) input.value = keyword;
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
      state.options.weather = normalizeOptions(data.weather || []);
      state.options.crops = normalizeOptions(data.crops || []);
      state.options.tasks = normalizeOptions(data.tasks || []);
      state.options.pests = normalizeOptions(data.pests || []);
      state.options.machines = normalizeOptions(data.machines || []);
    } catch (e) {
      console.error(e);
      state.options = { weather: [], crops: [], tasks: [], pests: [], machines: [] };
    }
  }

  async function loadMoney() {
    try {
      state.moneyRows = await apiGet('/api/money');
    } catch (e) {
      console.error(e);
      state.moneyRows = [];
    }
  }

  function renderAll() {
    renderMenuState();
    renderCalendar();
    renderWorkFormOptions();
    renderWorks();
    renderMaterials();
    renderOptions();
    renderMoney();
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
      updateMobileCalendarMode();
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
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();

    if (el['calendar-title']) {
      el['calendar-title'].textContent = `${year}년 ${month + 1}월`;
    }
    if (el['calendar-current-title']) {
      el['calendar-current-title'].textContent = '현재';
    }

    renderCalendarGrid(el['calendar-grid'], year, month, false);

    const compareYear = year - 1;
    if (el['calendar-compare-title']) {
      el['calendar-compare-title'].textContent = `${compareYear}년 ${month + 1}월`;
    }
    renderCalendarGrid(el['calendar-compare-grid'], compareYear, month, true);

    updateMobileCalendarMode();
  }

  function renderCalendarGrid(targetEl, year, month, isCompare) {
    if (!targetEl) return;

    const firstDay = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0).getDate();
    const startWeekday = firstDay.getDay();

    const html = [];
    for (let i = 0; i < startWeekday; i++) {
      html.push(`<div class="calendar-day empty"></div>`);
    }

    for (let day = 1; day <= lastDate; day++) {
      const dateStr = fmtDate(new Date(year, month, day));
      const plans = state.plans.filter(p => normalizePlanDate(p.plan_date) === dateStr);
      const works = state.works.filter(w => isDateInRange(dateStr, w.start_date, w.end_date));
      const selectedClass = !isCompare && state.selectedDate === dateStr ? 'selected' : '';

      const titleItems = [];

      if (plans.length) {
        titleItems.push(`
          <div class="day-title-group plan-group">
            <div class="day-group-label">계획</div>
            ${plans.slice(0, 2).map(item => `
              <div class="day-title-item plan" title="${escapeHtml(item.title || '')}">
                ${escapeHtml(item.title || '')}
              </div>
            `).join('')}
          </div>
        `);
      }

      if (works.length) {
        titleItems.push(`
          <div class="day-title-group work-group">
            <div class="day-group-label">실적</div>
            ${works.slice(0, 2).map(item => `
              <div class="day-title-item work" title="${escapeHtml(item.task_name || '')}">
                ${escapeHtml(item.task_name || '')}
              </div>
            `).join('')}
          </div>
        `);
      }

      const moreCount = Math.max(0, plans.length + works.length - 4);

      html.push(`
        <div class="calendar-day ${selectedClass}" ${isCompare ? '' : `data-date="${escapeHtml(dateStr)}"`}>
          <div class="day-num">${day}</div>
          <div class="day-title-list">
            ${titleItems.join('')}
          </div>
          ${moreCount > 0 ? `<div class="day-more">+${moreCount}건 더보기</div>` : ''}
        </div>
      `);
    }

    targetEl.innerHTML = html.join('');

    if (!isCompare) {
      targetEl.querySelectorAll('[data-date]').forEach(node => {
        node.addEventListener('click', () => {
          state.selectedDate = node.dataset.date;
          renderCalendar();
          openCalendarDetailModal(node.dataset.date);
        });
      });
    }
  }

  function openCalendarDetailModal(dateStr) {
    if (!el['calendar-detail-modal']) return;

    state.selectedDate = dateStr;
    if (el['calendar-detail-title']) {
      el['calendar-detail-title'].textContent = `${dateStr} 상세`;
    }

    const plans = state.plans.filter(p => normalizePlanDate(p.plan_date) === dateStr);
    const works = state.works.filter(w => isDateInRange(dateStr, w.start_date, w.end_date));

    const plansHtml = plans.length
      ? plans.map(plan => `
          <div class="calendar-detail-card">
            <div class="calendar-detail-title">${escapeHtml(plan.title || '')}</div>
            <div class="calendar-detail-meta">상태: ${escapeHtml(plan.status || 'planned')}</div>
            <div class="calendar-detail-meta">${escapeHtml(plan.details || '')}</div>
            <div class="item-actions">
              <button class="btn" data-plan-edit="${escapeHtml(String(plan.id))}">수정</button>
              <button class="btn" data-plan-done="${escapeHtml(String(plan.id))}">완료</button>
              <button class="btn" data-plan-work="${escapeHtml(String(plan.id))}">실적전환</button>
              <button class="btn" data-plan-delete="${escapeHtml(String(plan.id))}">삭제</button>
            </div>
          </div>
        `).join('')
      : `<div class="empty-msg">등록된 계획 없음</div>`;

    const worksHtml = works.length
      ? works.map(work => {
          const meta = parseMemo(work.memo);
          const materialsText = (meta.materials || []).map(m => `${m.name || ''} ${m.qty || 0}${m.unit || ''}`).join(', ');
          return `
            <div class="calendar-detail-card">
              <div class="calendar-detail-title">${escapeHtml(work.task_name || '')}</div>
              <div class="calendar-detail-meta">작물: ${escapeHtml(work.crops || '')}</div>
              <div class="calendar-detail-meta">병충해: ${escapeHtml(work.pests || '')}</div>
              <div class="calendar-detail-meta">기계: ${escapeHtml(work.machines || '')}</div>
              <div class="calendar-detail-meta">자재: ${escapeHtml(materialsText || '')}</div>
              <div class="calendar-detail-meta">메모: ${escapeHtml(meta.memo_text || '')}</div>
              <div class="item-actions">
                <button class="btn" data-work-edit="${escapeHtml(String(work.id))}">수정</button>
                <button class="btn" data-work-delete="${escapeHtml(String(work.id))}">삭제</button>
              </div>
            </div>
          `;
        }).join('')
      : `<div class="empty-msg">등록된 실적 없음</div>`;

    if (el['calendar-detail-body']) {
      el['calendar-detail-body'].innerHTML = `
        <div class="calendar-detail-group">
          <h4>계획</h4>
          ${plansHtml}
        </div>
        <div class="calendar-detail-group">
          <h4>실적</h4>
          ${worksHtml}
        </div>
      `;
    }

    if (el['btn-calendar-add-plan']) {
      el['btn-calendar-add-plan'].classList.remove('hidden');
    }
    if (el['btn-calendar-add-work']) {
      el['btn-calendar-add-work'].classList.remove('hidden');
    }

    bindCalendarDetailActions();
    removeHidden(el['calendar-detail-modal']);
  }

  function bindCalendarDetailActions() {
    if (!el['calendar-detail-body']) return;

    el['calendar-detail-body'].querySelectorAll('[data-plan-edit]').forEach(btn => {
      btn.addEventListener('click', () => openPlanModalById(btn.dataset.planEdit));
    });

    el['calendar-detail-body'].querySelectorAll('[data-plan-done]').forEach(btn => {
      btn.addEventListener('click', () => markPlanDone(btn.dataset.planDone));
    });

    el['calendar-detail-body'].querySelectorAll('[data-plan-work]').forEach(btn => {
      btn.addEventListener('click', () => convertPlanToWork(btn.dataset.planWork));
    });

    el['calendar-detail-body'].querySelectorAll('[data-plan-delete]').forEach(btn => {
      btn.addEventListener('click', () => deletePlan(btn.dataset.planDelete));
    });

    el['calendar-detail-body'].querySelectorAll('[data-work-edit]').forEach(btn => {
      btn.addEventListener('click', () => openWorkModalById(btn.dataset.workEdit));
    });

    el['calendar-detail-body'].querySelectorAll('[data-work-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
    });
  }

  function closeCalendarDetailModal() {
    addHidden(el['calendar-detail-modal']);
  }

  function openPlanModal() {
    state.editingPlanId = null;
    if (el['plan-modal-title']) el['plan-modal-title'].textContent = '작업계획 입력';
    resetPlanForm();
    if (state.selectedDate && el.plan_date) el.plan_date.value = state.selectedDate;
    renderPlanSearchResults();
    removeHidden(el['plan-modal']);
  }

  function openPlanModalById(id) {
    const plan = state.plans.find(p => String(p.id) === String(id));
    if (!plan) return;

    state.editingPlanId = plan.id;
    if (el['plan-modal-title']) el['plan-modal-title'].textContent = '작업계획 수정';
    fillPlanForm(plan);
    renderPlanSearchResults();
    removeHidden(el['plan-modal']);
  }

  function closePlanModal() {
    addHidden(el['plan-modal']);
    state.editingPlanId = null;
  }

  function resetPlanForm() {
    if (el.plan_date) el.plan_date.value = '';
    if (el.plan_title) el.plan_title.value = '';
    if (el.plan_details) el.plan_details.value = '';
    if (el.plan_status) el.plan_status.value = 'planned';
  }

  function fillPlanForm(plan) {
    if (el.plan_date) el.plan_date.value = normalizePlanDate(plan.plan_date);
    if (el.plan_title) el.plan_title.value = plan.title || '';
    if (el.plan_details) el.plan_details.value = plan.details || '';
    if (el.plan_status) el.plan_status.value = plan.status || 'planned';
  }

  function renderPlanSearchResults() {
    if (!el['plan-search-results']) return;
    const keyword = (el.plan_search?.value || el['plan-search']?.value || '').trim();
    const items = (state.options.tasks || []).filter(item => optionName(item).includes(keyword));
    el['plan-search-results'].innerHTML = items.map(item => {
      const name = optionName(item);
      return `<button type="button" class="search-result-item" data-plan-pick="${escapeHtml(name)}">${escapeHtml(name)}</button>`;
    }).join('');

    el['plan-search-results'].querySelectorAll('[data-plan-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (el.plan_title) el.plan_title.value = btn.dataset.planPick || '';
      });
    });
  }

  async function savePlan() {
    const payload = {
      plan_date: el.plan_date?.value || '',
      title: (el.plan_title?.value || '').trim(),
      details: (el.plan_details?.value || '').trim(),
      status: el.plan_status?.value || 'planned'
    };

    try {
      if (state.editingPlanId) {
        await apiPut(`/api/plans/${state.editingPlanId}`, payload);
      } else {
        await apiPost('/api/plans', payload);
      }
      await loadPlans();
      closePlanModal();
      renderCalendar();
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
    } catch (e) {
      console.error(e);
      alert('저장 실패');
    }
  }

  async function markPlanDone(id) {
    try {
      await apiPut(`/api/plans/${id}`, { status: 'done' });
      await loadPlans();
      renderCalendar();
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
    } catch (e) {
      console.error(e);
      alert('완료 처리 실패');
    }
  }

  async function convertPlanToWork(id) {
    const plan = state.plans.find(p => String(p.id) === String(id));
    if (!plan) return;

    closeCalendarDetailModal();
    openWorkModal();
    if (el.start_date) el.start_date.value = normalizePlanDate(plan.plan_date);
    if (el.repeat_days) el.repeat_days.value = 1;
    updateEndDateFromRepeatDays();
    if (el.task_name) {
      const taskExists = (state.options.tasks || []).some(item => optionName(item) === (plan.title || ''));
      if (!taskExists) {
        try {
          await apiPost('/api/options/tasks', { name: plan.title || '' });
          await loadOptions();
          renderWorkFormOptions();
        } catch (e) {
          console.error(e);
        }
      }
      setSelectValue(el.task_name, plan.title || '');
    }
    if (el.memo) el.memo.value = plan.details || '';
  }

  async function deletePlan(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await apiDelete(`/api/plans/${id}`);
      await loadPlans();
      renderCalendar();
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
    } catch (e) {
      console.error(e);
      alert('삭제 실패');
    }
  }

  function openWorkModal() {
    state.editingWorkId = null;
    if (el['work-modal-title']) el['work-modal-title'].textContent = '작업 입력';

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
    if (el['work-modal-title']) el['work-modal-title'].textContent = '작업 수정';
    fillWorkForm(work);
    removeHidden(el['work-modal']);
  }

  function closeWorkModal() {
    addHidden(el['work-modal']);
    state.editingWorkId = null;
  }

  function resetWorkForm() {
    if (el.start_date) el.start_date.value = '';
    if (el.repeat_days) el.repeat_days.value = 1;
    if (el.end_date) el.end_date.value = '';
    if (el.start_time) el.start_time.value = '';
    if (el.end_time) el.end_time.value = '';
    if (el.weather) el.weather.value = '';
    if (el.task_name) el.task_name.value = '';
    if (el.work_hours) el.work_hours.value = 0;
    if (el.memo) el.memo.value = '';

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
    if (el.start_time) el.start_time.value = meta.start_time || '';
    if (el.end_time) el.end_time.value = meta.end_time || '';
    el.weather.value = work.weather || '';
    el.task_name.value = work.task_name || '';
    if (el.work_hours) el.work_hours.value = work.work_hours || meta.work_hours || 0;
    el.memo.value = meta.memo_text || '';

    setChipSelections('crops', splitCsv(work.crops));
    setChipSelections('pests', splitCsv(work.pests));
    setChipSelections('machines', splitCsv(work.machines));

    state.selectedMaterialsDetailed = Array.isArray(meta.materials)
      ? meta.materials.map(m => ({
          id: m.id || '',
          name: m.name || '',
          unit: m.unit || '',
          price: Number(m.price || m.unit_price || 0),
          qty: Number(m.qty || 0),
          method: m.method || '현금'
        }))
      : [];
    renderSelectedMaterialsDetailed();

    resetLaborRows();
    if (Array.isArray(meta.labor_rows) && meta.labor_rows.length) {
      meta.labor_rows.forEach(row => addLaborRow(row));
    }

    if (meta.money) {
      el.has_money.checked = true;
      toggleMoneyBox(true);
      el.money_note.value = meta.money.note || '';
      el.other_cost.value = meta.money.other_total || 0;
    } else {
      resetMoneyFields();
    }

    updateEndDateFromRepeatDays();
    updateWorkHoursFromTime();
    updateMoneySummary();
  }

  function updateWorkHoursFromTime() {
    if (!el.start_time || !el.end_time || !el.work_hours) return;
    const start = el.start_time.value;
    const end = el.end_time.value;
    if (!start || !end) return;

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const diff = endMin - startMin;
    if (diff >= 0) {
      el.work_hours.value = Math.round((diff / 60) * 10) / 10;
    }
  }

  function toggleMoneyBox(show) {
    if (!el['money-box']) return;
    el['money-box'].classList.toggle('hidden', !show);
  }

  function resetMoneyFields() {
    if (el['has_money']) el['has_money'].checked = false;
    if (el['other_cost']) el['other_cost'].value = '0';
    if (el['money_note']) el['money_note'].value = '';
    updateMoneySummary();
    toggleMoneyBox(false);
  }

  function getLaborTotal() {
    let total = 0;
    document.querySelectorAll('.labor-row .labor-amount').forEach(node => {
      total += Number(node.value) || 0;
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

    if (el.money_labor_total) el.money_labor_total.innerText = formatNumber(labor);
    if (el.money_material_total) el.money_material_total.innerText = formatNumber(material);
    if (el.money_total_amount) el.money_total_amount.innerText = formatNumber(total);
  }

  function resetLaborRows() {
    const wrap = el['labor-rows-wrap'];
    if (!wrap) return;
    wrap.innerHTML = '';
  }

  function addLaborRow(row = null) {
    const wrap = el['labor-rows-wrap'];
    if (!wrap) return;

    const item = {
      type: row?.type || '남자',
      count: Number(row?.count || 0),
      price: Number(row?.price || 0),
      amount: Number(row?.amount || 0),
      method: row?.method || '',
      note: row?.note || ''
    };

    const div = document.createElement('div');
    div.className = 'labor-row';
    div.innerHTML = `
      <select class="labor-type">
        <option value="남자" ${item.type === '남자' ? 'selected' : ''}>남자</option>
        <option value="여자" ${item.type === '여자' ? 'selected' : ''}>여자</option>
        <option value="기타" ${item.type === '기타' ? 'selected' : ''}>기타</option>
      </select>
      <input type="number" class="labor-count" value="${escapeHtml(String(item.count))}" min="0" step="1">
      <input type="number" class="labor-price" value="${escapeHtml(String(item.price))}" min="0" step="100">
      <input type="number" class="labor-amount" value="${escapeHtml(String(item.amount || item.count * item.price))}" readonly>
      <input type="text" class="labor-note" value="${escapeHtml(item.note)}" placeholder="비고">
      <button type="button" class="btn labor-remove">삭제</button>
    `;
    wrap.appendChild(div);

    const countEl = div.querySelector('.labor-count');
    const priceEl = div.querySelector('.labor-price');
    const amountEl = div.querySelector('.labor-amount');
    const removeBtn = div.querySelector('.labor-remove');

    const syncAmount = () => {
      const count = Number(countEl.value) || 0;
      const price = Number(priceEl.value) || 0;
      amountEl.value = String(count * price);
      updateMoneySummary();
    };

    countEl.addEventListener('input', syncAmount);
    priceEl.addEventListener('input', syncAmount);
    removeBtn.addEventListener('click', () => {
      div.remove();
      updateMoneySummary();
    });
  }

  function getLaborRows() {
    return Array.from(document.querySelectorAll('.labor-row')).map(row => {
      const type = row.querySelector('.labor-type')?.value || '';
      const count = Number(row.querySelector('.labor-count')?.value || 0);
      const price = Number(row.querySelector('.labor-price')?.value || 0);
      const amount = Number(row.querySelector('.labor-amount')?.value || 0);
      const note = row.querySelector('.labor-note')?.value || '';
      return { type, count, price, amount, method: '', note };
    }).filter(row => row.count > 0 || row.price > 0 || row.note);
  }

  function renderSelectedMaterialsDetailed() {
    const box = el['selected-materials-detailed'];
    if (!box) return;

    if (!state.selectedMaterialsDetailed.length) {
      box.innerHTML = `<div class="empty-msg">선택된 자재 없음</div>`;
      return;
    }

    box.innerHTML = state.selectedMaterialsDetailed.map((item, idx) => `
      <div class="material-row" data-material-row="${idx}">
        <strong>${escapeHtml(item.name || '')}</strong>
        <input type="number" class="material-qty" value="${escapeHtml(String(item.qty || 0))}" min="0" step="0.1">
        <span>${escapeHtml(item.unit || '')}</span>
        <span>${formatNumber((item.price || 0) * (item.qty || 0))}원</span>
        <button type="button" class="btn material-remove">삭제</button>
      </div>
    `).join('');

    box.querySelectorAll('[data-material-row]').forEach(row => {
      const idx = Number(row.dataset.materialRow);
      const qtyEl = row.querySelector('.material-qty');
      const removeBtn = row.querySelector('.material-remove');

      qtyEl.addEventListener('input', () => {
        state.selectedMaterialsDetailed[idx].qty = Number(qtyEl.value) || 0;
        renderSelectedMaterialsDetailed();
        updateMoneySummary();
      });

      removeBtn.addEventListener('click', () => {
        state.selectedMaterialsDetailed.splice(idx, 1);
        renderSelectedMaterialsDetailed();
        updateMoneySummary();
      });
    });
  }

  function renderMaterialSearchResults(keyword) {
    const results = el['material-search-results'];
    if (!results) return;

    const key = String(keyword || '').trim();
    const rows = (state.materials || []).filter(item => (item.name || '').includes(key));

    results.innerHTML = rows.map(item => `
      <button type="button" class="search-result-item" data-material-pick="${escapeHtml(String(item.id))}">
        ${escapeHtml(item.name || '')} / 재고 ${escapeHtml(String(item.stock_qty || 0))}${escapeHtml(item.unit || '')}
      </button>
    `).join('');

    results.querySelectorAll('[data-material-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = state.materials.find(m => String(m.id) === String(btn.dataset.materialPick));
        if (!item) return;

        const exists = state.selectedMaterialsDetailed.find(m => String(m.id) === String(item.id));
        if (!exists) {
          state.selectedMaterialsDetailed.push({
            id: item.id,
            name: item.name || '',
            unit: item.unit || '',
            price: Number(item.unit_price || 0),
            qty: 1,
            method: '현금'
          });
        }

        if (el['material-search-input']) el['material-search-input'].value = '';
        results.innerHTML = '';
        renderSelectedMaterialsDetailed();
      });
    });
  }

  function renderMaterialPickerResults(keyword) {
    const box = el['material-search-box'];
    if (!box) return;

    const key = String(keyword || '').trim();
    const rows = (state.materials || []).filter(item => (item.name || '').includes(key));

    box.innerHTML = rows.map(item => `
      <div class="search-result-item">${escapeHtml(item.name || '')}</div>
    `).join('');
  }

  async function saveWork() {
    const hasMoney = !!el.has_money.checked;

    const labor = getLaborTotal();
    const material = getMaterialTotal();
    const other = getOtherTotal();
    const total = labor + material + other;

    const money = hasMoney
      ? {
          type:
            labor > 0 && material > 0 ? '인건비+자재비' :
            labor > 0 ? '인건비' :
            material > 0 ? '자재비' : '기타',
          total_amount: total,
          labor_total: labor,
          material_total: material,
          other_total: other,
          note: el.money_note.value
        }
      : null;

    updateEndDateFromRepeatDays();
    updateWorkHoursFromTime();

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
        start_time: el.start_time?.value || '',
        end_time: el.end_time?.value || '',
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
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
      renderMoney();
    } catch (e) {
      console.error(e);
      alert('저장 실패');
    }
  }

  function renderWorks() {
    if (!el['works-list']) return;

    let works = [...state.works];

    if (state.workSearchKeyword) {
      const keyword = state.workSearchKeyword.trim();
      works = works.filter(work => {
        const meta = parseMemo(work.memo);
        const text = [
          work.start_date, work.end_date, work.weather, work.task_name,
          work.crops, work.pests, work.machines,
          meta.memo_text,
          (meta.materials || []).map(m => m.name).join(','),
          (meta.labor_rows || []).map(r => r.note).join(',')
        ].join(' ');
        return text.includes(keyword);
      });
    }

    const groupMap = {};
    works.forEach(work => {
      const key = work.start_date || '';
      if (!groupMap[key]) groupMap[key] = [];
      groupMap[key].push(work);
    });

    const dates = Object.keys(groupMap).sort((a, b) => b.localeCompare(a));

    el['works-list'].innerHTML = dates.map(date => {
      const rows = groupMap[date];
      return `
        <div class="work-date-group">
          <div class="work-date-title">${escapeHtml(date)}</div>
          <div class="work-date-row ${rows.length === 1 ? 'single-card' : ''}">
            ${rows.map(work => renderWorkCard(work)).join('')}
          </div>
        </div>
      `;
    }).join('') || `<div class="empty-msg">작업일지 없음</div>`;

    el['works-list'].querySelectorAll('[data-work-edit]').forEach(btn => {
      btn.addEventListener('click', () => openWorkModalById(btn.dataset.workEdit));
    });
    el['works-list'].querySelectorAll('[data-work-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
    });
  }

  function renderWorkCard(work) {
    const meta = parseMemo(work.memo);
    const materialsText = (meta.materials || []).map(m => `${m.name || ''} ${m.qty || 0}${m.unit || ''}`).join(', ');
    return `
      <div class="work-card">
        <div class="work-card-title">${escapeHtml(work.task_name || '')}</div>
        <div><strong>기간</strong> ${escapeHtml(work.start_date || '')} ~ ${escapeHtml(work.end_date || '')}</div>
        <div><strong>날씨</strong> ${escapeHtml(work.weather || '')}</div>
        <div><strong>작물</strong> ${escapeHtml(work.crops || '')}</div>
        <div><strong>병충해</strong> ${escapeHtml(work.pests || '')}</div>
        <div><strong>사용기계</strong> ${escapeHtml(work.machines || '')}</div>
        <div><strong>자재</strong> ${escapeHtml(materialsText)}</div>
        <div><strong>메모</strong> ${escapeHtml(meta.memo_text || '')}</div>
        <div class="item-actions">
          <button class="btn" data-work-edit="${escapeHtml(String(work.id))}">수정</button>
          <button class="btn" data-work-delete="${escapeHtml(String(work.id))}">삭제</button>
        </div>
      </div>
    `;
  }

  function ensureWorksSearchBar() {
    const page = el['page-works'];
    if (!page || page.querySelector('.works-search-bar')) return;

    const bar = document.createElement('div');
    bar.className = 'works-search-bar';
    bar.style.margin = '0 0 12px 0';
    bar.innerHTML = `
      <input type="text" id="works-search-input" placeholder="작업내용 / 작물 / 병충해 / 메모 검색" style="width:100%; max-width:420px;">
    `;
    const header = page.querySelector('.page-header');
    if (header && header.nextSibling) page.insertBefore(bar, header.nextSibling);

    const input = bar.querySelector('#works-search-input');
    input.value = state.workSearchKeyword || '';
    input.addEventListener('input', () => {
      state.workSearchKeyword = input.value || '';
      renderWorks();
    });
  }

  function parseMemo(raw) {
    try {
      const obj = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
      return {
        memo_text: obj.memo_text || '',
        repeat_days: Number(obj.repeat_days || 1),
        start_time: obj.start_time || '',
        end_time: obj.end_time || '',
        materials: Array.isArray(obj.materials) ? obj.materials : [],
        labor_rows: Array.isArray(obj.labor_rows) ? obj.labor_rows : [],
        work_hours: Number(obj.work_hours || 0),
        money: obj.money || null
      };
    } catch (e) {
      return {
        memo_text: String(raw || ''),
        repeat_days: 1,
        start_time: '',
        end_time: '',
        materials: [],
        labor_rows: [],
        work_hours: 0,
        money: null
      };
    }
  }

  function normalizeOptions(items) {
    return (items || []).map(item => {
      if (typeof item === 'string') {
        return { id: item, name: item };
      }
      return item || {};
    });
  }

  function optionId(item) {
    return item?.id ?? item?.name ?? '';
  }

  function optionName(item) {
    return item?.name ?? '';
  }

  function renderMaterials() {
    if (!el['materials-list']) return;

    const withStock = state.materials.filter(item => Number(item.stock_qty || 0) > 0);
    const withoutStock = state.materials.filter(item => Number(item.stock_qty || 0) <= 0);

    el['materials-list'].innerHTML = `
      <div class="grid two materials-split">
        <div class="panel">
          <h3>재고 있음</h3>
          ${withStock.length ? withStock.map(item => renderMaterialItem(item)).join('') : `<div class="empty-msg">없음</div>`}
        </div>
        <div class="panel">
          <h3>재고 없음</h3>
          ${withoutStock.length ? withoutStock.map(item => renderMaterialItem(item)).join('') : `<div class="empty-msg">없음</div>`}
        </div>
      </div>
    `;

    el['materials-list'].querySelectorAll('[data-material-edit]').forEach(btn => {
      btn.addEventListener('click', () => openMaterialModalById(btn.dataset.materialEdit));
    });
    el['materials-list'].querySelectorAll('[data-material-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteMaterial(btn.dataset.materialDelete));
    });
  }

  function renderMaterialItem(item) {
    return `
      <div class="day-item">
        <div><strong>${escapeHtml(item.name || '')}</strong></div>
        <div>단위: ${escapeHtml(item.unit || '')}</div>
        <div>재고: ${formatNumber(item.stock_qty || 0)}</div>
        <div>단가: ${formatNumber(item.unit_price || 0)}</div>
        <div>${escapeHtml(item.memo || '')}</div>
        <div class="item-actions">
          <button class="btn" data-material-edit="${escapeHtml(String(item.id))}">수정</button>
          <button class="btn" data-material-delete="${escapeHtml(String(item.id))}">삭제</button>
        </div>
      </div>
    `;
  }

  function openMaterialModal() {
    state.editingMaterialId = null;
    if (el['material-modal-title']) el['material-modal-title'].textContent = '자재 추가';

    if (el.material_name) el.material_name.value = '';
    if (el.material_unit) el.material_unit.value = '';
    if (el.material_stock) el.material_stock.value = 0;
    if (el.material_price) el.material_price.value = 0;
    if (el.material_memo) el.material_memo.value = '';
    if (el['material-search-keyword']) el['material-search-keyword'].value = '';
    if (el['material-search-box']) el['material-search-box'].innerHTML = '';

    removeHidden(el['material-modal']);
  }

  function openMaterialModalById(id) {
    const item = state.materials.find(m => String(m.id) === String(id));
    if (!item) return;

    state.editingMaterialId = item.id;
    if (el['material-modal-title']) el['material-modal-title'].textContent = '자재 수정';

    if (el.material_name) el.material_name.value = item.name || '';
    if (el.material_unit) el.material_unit.value = item.unit || '';
    if (el.material_stock) el.material_stock.value = item.stock_qty || 0;
    if (el.material_price) el.material_price.value = item.unit_price || 0;
    if (el.material_memo) el.material_memo.value = item.memo || '';

    removeHidden(el['material-modal']);
  }

  function closeMaterialModal() {
    addHidden(el['material-modal']);
    state.editingMaterialId = null;
  }

  async function saveMaterial() {
    const payload = {
      name: normalizeName(el.material_name?.value),
      unit: normalizeName(el.material_unit?.value),
      stock_qty: Number(el.material_stock?.value || 0),
      unit_price: Number(el.material_price?.value || 0),
      memo: normalizeName(el.material_memo?.value)
    };

    if (!payload.name) {
      alert('자재명을 입력하세요.');
      return;
    }

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
      alert('자재 저장 실패');
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

  function renderOptions() {
    renderOptionList('weather', 'options-weather');
    renderOptionList('crops', 'options-crops');
    renderOptionList('tasks', 'options-tasks');
    renderOptionList('pests', 'options-pests');
    renderOptionList('machines', 'options-machines');

    const isMobile = window.innerWidth <= 900;

    (el.optionTabButtons || []).forEach(btn => {
      btn.classList.toggle('active', (btn.dataset.optionTab || '') === state.optionTab);
    });

    (el.optionPanels || []).forEach(panel => {
      if (isMobile) {
        panel.style.display = panel.dataset.optionPanel === state.optionTab ? '' : 'none';
      } else {
        panel.style.display = '';
      }
    });
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

  window.saveOption = async function(type, inputId){
    const input = document.getElementById(inputId);
    const name = input.value.trim();
    if(!name) return;

    await apiPost(`/api/options/${type}`, {name});
    input.value='';
    await loadOptions();
    renderOptions();
  }

  window.editOption = async function(type, id, oldName){
    const name = prompt("수정", oldName);
    if(!name) return;

    await apiPut(`/api/options/${type}/${id}`, {name});
    await loadOptions();
    renderOptions();
  }

  window.removeOption = async function(type, id){
    if(!confirm("삭제?")) return;

    await apiDelete(`/api/options/${type}/${id}`);
    await loadOptions();
    renderOptions();
  }

  async function apiGet(url) {
    const res = await fetch(url);
    return res.json();
  }

  async function apiPost(url, data) {
    await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
  }

  async function apiPut(url, data) {
    await fetch(url, {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
  }

  async function apiDelete(url) {
    await fetch(url, {method:'DELETE'});
  }

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

  function normalizePlanDate(value) {
    return String(value || '').slice(0, 10);
  }

  function isDateInRange(dateStr, startDate, endDate) {
    const start = String(startDate || '').slice(0, 10);
    const end = String(endDate || startDate || '').slice(0, 10);
    return start <= dateStr && dateStr <= end;
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    const exists = Array.from(selectEl.options).some(opt => opt.value === value);
    selectEl.value = exists ? value : '';
  }

  function normalizeName(value) {
    return String(value || '').trim();
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

  function updateEndDateFromRepeatDays() {
    const start = el.start_date?.value || '';
    const repeatDays = Math.max(1, Number(el.repeat_days?.value) || 1);
    if (!start) {
      el.end_date.value = '';
      return;
    }

    const d = new Date(start + 'T00:00:00');
    d.setDate(d.getDate() + repeatDays - 1);
    el.end_date.value = fmtDate(d);
  }

  function splitCsv(value) {
    return String(value || '').split(',').map(v => v.trim()).filter(Boolean);
  }

  function clearChipSelections(type) {
    document.querySelectorAll(`[data-chip-type="${type}"]`).forEach(node => node.classList.remove('active'));
  }

  function setChipSelections(type, values) {
    clearChipSelections(type);
    const set = new Set(values || []);
    document.querySelectorAll(`[data-chip-type="${type}"]`).forEach(node => {
      if (set.has(node.dataset.chipValue)) node.classList.add('active');
    });
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
})();
