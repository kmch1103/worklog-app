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
      task_categories: [],
      tasks: [],
      pests: [],
      machines: []
    },
    workSearchKeyword: '',
    selectedMaterialsDetailed: [],
    materialUnits: ['개', '병', '통', '봉', '포', 'kg', 'L', 'ml', '말', 'M'],
    mobileCalendarMode: 'current',
    materialListSearchKeyword: '',
    optionTab: 'weather',
    seasons: [],
    editingSeasonId: null,
    editingTaskOptionId: null
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

    bindHistoryNavigation();

    await loadAll();
    await loadMoney();
    renderAll();
    updateMobileCalendarMode();
    initializeHistoryState();

    window.addEventListener('resize', updateMobileCalendarMode);
  }

  function cacheElements() {
    const ids = [
      'page-calendar','page-works','page-materials','page-money','page-options','page-excel','page-backup',
      'btn-prev-month','btn-next-month','btn-mobile-current','btn-mobile-previous',
      'calendar-title','calendar-current-title','calendar-grid',
      'calendar-compare-title','calendar-compare-grid','calendar-compare-wrap',

      'btn-open-work-from-calendar','btn-open-plan-form',

      'plan-modal','plan-modal-title','btn-close-plan-modal',
      'plan_date','plan_title','plan_details','plan_status',
      'plan-search','plan-search-results',

      'btn-save-plan','btn-cancel-plan',

      'calendar-detail-modal','calendar-detail-title','calendar-detail-body',
      'btn-close-calendar-detail','btn-calendar-add-plan','btn-calendar-add-work',

      'work-modal','work-modal-title','btn-close-work-modal',
      'btn-new-work',

      'start_date','repeat_days','end_date','start_time','end_time',
      'weather','task_category','task_name','crops-box','pests-box','machines-box',

      'labor_cost','work_hours','memo',
      'btn-save-work','btn-cancel-work','works-list',

      'material_name','material_unit','material_stock','material_price','material_memo',
      'btn-save-material','btn-open-material-modal','btn-close-material-modal','btn-cancel-material',
      'material-modal','material-modal-title','material-search-box','material-search-keyword','materials-list',

      'new-weather','new-crops','new-task-categories','new-task-category','new-tasks','new-pests','new-pests-recommend','new-machines',
      'options-weather','options-crops','options-task-categories','options-tasks','options-pests','options-machines',

      'material-search-input','material-search-results','selected-materials-detailed',

      'recommended-materials-wrap','recommended-materials-box','material-list-search',

      'season_name','season_start_date','season_end_date','season_note','season_is_current',
      'btn-save-season','btn-reset-season','season-list',

      'labor-rows-wrap','btn-add-labor-row',

      'has_money','money-box','money_note','other_cost',
      'money_labor_total','money_material_total','money_total_amount',

      'money-start','money-end','money-type-filter','money-method-filter',
      'btn-money-filter','money-list','money-total','money-cash','money-card'
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

    on(el['plan-search'], 'input', (e) => {
      renderPlanSearchResults();
      if (el.plan_title) {
        el.plan_title.value = (e.target.value || '').trim();
      }
    });

    on(el['btn-close-plan-modal'], 'click', closePlanModal);
    on(el['btn-cancel-plan'], 'click', closePlanModal);
    on(el['btn-save-plan'], 'click', savePlan);

    on(el['btn-open-work-from-calendar'], 'click', () => {
      openWorkModal();
      if (state.selectedDate) {
        el.start_date.value = state.selectedDate;
        updateEndDateFromRepeatDays();
      }
    });
  }

  function bindCalendarDetailModal() {
    on(el['btn-close-calendar-detail'], 'click', closeCalendarDetailModal);

    on(el['btn-calendar-add-plan'], 'click', () => {
      closeCalendarDetailModal();
      openPlanModal();
    });

    on(el['btn-calendar-add-work'], 'click', () => {
      closeCalendarDetailModal();
      openWorkModal();
      if (state.selectedDate && el.start_date) {
        el.start_date.value = state.selectedDate;
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
        e.preventDefault();
      }
    });

    on(el['material-search-input'], 'input', (e) => {
      renderMaterialSearchResults(e.target.value || '');
    });

    on(el['btn-add-labor-row'], 'click', () => addLaborRow());

    on(el['start_date'], 'change', updateEndDateFromRepeatDays);
    on(el['repeat_days'], 'input', updateEndDateFromRepeatDays);

    on(el['task_category'], 'change', () => renderTaskOptionsByCategory(el['task_category']?.value || ''));
    on(el['start_time'], 'change', () => syncWorkTimeFields('time'));
    on(el['end_time'], 'change', () => syncWorkTimeFields('time'));
    on(el['work_hours'], 'input', () => syncWorkTimeFields('hours'));
    on(el['work_hours'], 'change', () => syncWorkTimeFields('hours'));

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

    on(el['material-search-keyword'], 'input', (e) => {
      const keyword = e.target.value || '';
      renderMaterialPickerResults(keyword);
      autoFillMaterialName(keyword);
    });

    on(el['material-list-search'], 'input', (e) => {
      state.materialListSearchKeyword = (e.target.value || '').trim();
      renderMaterials();
    });
  }

  function bindOptionButtons() {
    (el.optionTabButtons || []).forEach(btn => {
      btn.addEventListener('click', () => {
        state.optionTab = btn.dataset.optionTab || 'weather';
        renderOptions();
      });
    });

    on(el['btn-save-season'], 'click', saveSeason);
    on(el['btn-reset-season'], 'click', resetSeasonForm);
    on(el['new-task-category'], 'change', () => {
      renderTaskOptionList();
      updateTaskOptionEditorUI();
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
      loadOptions(),
      loadSeasons()
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
      state.optionsRaw = {
        weather: data.weather || [],
        crops: data.crops || [],
        task_categories: data.task_categories || [],
        tasks: data.tasks || [],
        pests: data.pests || [],
        machines: data.machines || []
      };
      state.options.weather = normalizeOptions(data.weather || []);
      state.options.crops = normalizeOptions(data.crops || []);
      state.options.task_categories = normalizeOptions(data.task_categories || []);
      state.options.tasks = normalizeOptions(data.tasks || []);
      state.options.pests = normalizeOptions(data.pests || []);
      state.options.machines = normalizeOptions(data.machines || []);
      state.options.pestsRaw = data.pests || [];
    } catch (e) {
      console.error(e);
      state.options = { weather: [], crops: [], task_categories: [], tasks: [], pests: [], machines: [], pestsRaw: [] };
      state.optionsRaw = { weather: [], crops: [], task_categories: [], tasks: [], pests: [], machines: [] };
    }
  }

  async function loadSeasons() {
    try {
      state.seasons = await apiGet('/api/seasons');
    } catch (e) {
      console.error(e);
      state.seasons = [];
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

  function switchPage(page, options = {}) {
    state.currentPage = page;
    if (!options.skipHistory) {
      pushHistoryState(page, '');
    }
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
      const selectedClass = state.selectedDate === dateStr ? 'selected' : '';

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
        <div class="calendar-day ${selectedClass}" data-date="${escapeHtml(dateStr)}">
          <div class="day-num">${day}</div>
          <div class="day-title-list">
            ${titleItems.join('')}
          </div>
          ${moreCount > 0 ? `<div class="day-more">+${moreCount}건 더보기</div>` : ''}
        </div>
      `);
    }

    targetEl.innerHTML = html.join('');

    targetEl.querySelectorAll('[data-date]').forEach(node => {
      node.addEventListener('click', () => {
        state.selectedDate = node.dataset.date;
        renderCalendar();
        openCalendarDetailModal(node.dataset.date);
      });
    });
  }

  function openCalendarDetailModal(dateStr, options = {}) {
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
              <div class="calendar-detail-meta">작업분류: ${escapeHtml(work.task_category || '')}</div>
              <div class="calendar-detail-meta">작물: ${escapeHtml(work.crops || '')}</div>
              <div class="calendar-detail-meta">병충해: ${escapeHtml(work.pests || '')}</div>
              <div class="calendar-detail-meta">기계: ${escapeHtml(work.machines || '')}</div>
              <div class="calendar-detail-meta">시간: ${escapeHtml(formatWorkTimeText(meta, work) || '')}</div>
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
    if (!options.skipHistory) {
      pushHistoryState(state.currentPage, 'calendar-detail');
    }
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
      btn.addEventListener('click', () => createWorkFromPlan(btn.dataset.planWork));
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

  function openPlanModal(options = {}) {
    state.editingPlanId = null;
    if (el['plan-modal-title']) el['plan-modal-title'].textContent = '작업계획 입력';
    resetPlanForm();
    if (state.selectedDate && el.plan_date) el.plan_date.value = state.selectedDate;
    renderPlanSearchResults();
    removeHidden(el['plan-modal']);
    if (!options.skipHistory) {
      pushHistoryState(state.currentPage, 'plan');
    }
  }

  function openPlanModalById(id, options = {}) {
    const plan = state.plans.find(p => String(p.id) === String(id));
    if (!plan) return;

    state.editingPlanId = plan.id;
    if (el['plan-modal-title']) el['plan-modal-title'].textContent = '작업계획 수정';
    fillPlanForm(plan);
    renderPlanSearchResults();
    removeHidden(el['plan-modal']);
    if (!options.skipHistory) {
      pushHistoryState(state.currentPage, 'plan');
    }
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
        const picked = btn.dataset.planPick || '';
        if (el.plan_title) el.plan_title.value = picked;
        if (el['plan-search']) el['plan-search'].value = picked;
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

    if (!payload.title) {
      alert('작업 제목을 입력하세요.');
      return;
    }

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
    const plan = state.plans.find(p => String(p.id) === String(id));
    if (!plan) return;

    try {
      await apiPut(`/api/plans/${id}`, {
        plan_date: plan.plan_date || '',
        title: plan.title || '',
        details: plan.details || '',
        status: 'done'
      });
      await loadPlans();
      renderCalendar();
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
    } catch (e) {
      console.error(e);
      alert('상태 변경 실패');
    }
  }

  function createWorkFromPlan(id) {
    const plan = state.plans.find(p => String(p.id) === String(id));
    if (!plan) return;

    closeCalendarDetailModal();
    openWorkModal();
    if (el.start_date) el.start_date.value = normalizePlanDate(plan.plan_date);
    if (el.task_name) el.task_name.value = plan.title || '';
    if (el.memo && plan.details) el.memo.value = plan.details || '';
    updateEndDateFromRepeatDays();
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

  function openWorkModal(options = {}) {
    state.editingWorkId = null;
    if (el['work-modal-title']) el['work-modal-title'].textContent = '작업 입력';

    resetWorkForm();

    const defaultDate = state.selectedDate || fmtDate(new Date());
    if (el.start_date) el.start_date.value = defaultDate;
    if (el.repeat_days) el.repeat_days.value = 1;
    updateEndDateFromRepeatDays();

    removeHidden(el['work-modal']);
    if (!options.skipHistory) {
      pushHistoryState(state.currentPage, 'work');
    }
  }

  function openWorkModalById(id, options = {}) {
    const work = state.works.find(w => String(w.id) === String(id));
    if (!work) return;

    state.editingWorkId = work.id;
    if (el['work-modal-title']) el['work-modal-title'].textContent = '작업 수정';
    fillWorkForm(work);
    removeHidden(el['work-modal']);
    if (!options.skipHistory) {
      pushHistoryState(state.currentPage, 'work');
    }
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
    if (el.task_category) el.task_category.value = '';
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
    renderRecommendedMaterials();
    renderTaskOptionsByCategory('');
  }

  function fillWorkForm(work) {
    const meta = parseMemo(work.memo);

    if (el.start_date) el.start_date.value = work.start_date || '';
    if (el.repeat_days) {
      el.repeat_days.value = Number(meta.repeat_days || calcRepeatDays(work.start_date, work.end_date) || 1);
    }
    if (el.end_date) el.end_date.value = work.end_date || work.start_date || '';
    if (el.start_time) el.start_time.value = meta.start_time || '';
    if (el.end_time) el.end_time.value = meta.end_time || '';
    if (el.weather) el.weather.value = work.weather || '';
    if (el.task_category) el.task_category.value = work.task_category || '';
    renderTaskOptionsByCategory(work.task_category || '');
    if (el.task_name) el.task_name.value = work.task_name || '';
    if (el.work_hours) el.work_hours.value = work.work_hours || meta.work_hours || 0;
    if (el.memo) el.memo.value = meta.memo_text || '';

    setChipSelections('crops', splitCsv(work.crops));
    setChipSelections('pests', splitCsv(work.pests));
    setChipSelections('machines', splitCsv(work.machines));
    renderRecommendedMaterials();

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
      if (el.has_money) el.has_money.checked = true;
      toggleMoneyBox(true);
      if (el.money_note) el.money_note.value = meta.money.note || '';
      if (el.other_cost) el.other_cost.value = meta.money.other_total || 0;
    } else {
      resetMoneyFields();
    }

    updateEndDateFromRepeatDays();
    syncWorkTimeFields('time');
    updateMoneySummary();
    renderRecommendedMaterials();
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
      el.work_hours.value = (diff / 60).toFixed(1).replace('.0', '');
    }
  }

  function updateEndTimeFromHours() {
    if (!el.start_time || !el.end_time || !el.work_hours) return;
    const start = el.start_time.value;
    const hours = Number(el.work_hours.value || 0);
    if (!start || hours <= 0) return;

    const [sh, sm] = start.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = startMin + Math.round(hours * 60);
    const eh = Math.floor(endMin / 60) % 24;
    const em = endMin % 60;
    el.end_time.value = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  }

  function syncWorkTimeFields(source) {
    if (source === 'time') {
      updateWorkHoursFromTime();
    } else if (source === 'hours') {
      updateEndTimeFromHours();
    }
  }

  function updateEndDateFromRepeatDays() {
    if (!el.start_date || !el.end_date || !el.repeat_days) return;

    const start = el.start_date.value;
    const repeatDays = Number(el.repeat_days.value || 1);

    if (!start) {
      el.end_date.value = '';
      return;
    }

    const date = new Date(start);
    if (Number.isNaN(date.getTime())) {
      el.end_date.value = start;
      return;
    }

    date.setDate(date.getDate() + Math.max(1, repeatDays) - 1);
    el.end_date.value = fmtDate(date);
  }

  function calcRepeatDays(startDate, endDate) {
    if (!startDate || !endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff + 1 : 1;
  }

  function splitCsv(value) {
    return String(value || '')
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
  }

  function optionName(item) {
    if (item == null) return '';
    return typeof item === 'string' ? item : (item.name || item.항목 || '');
  }

  function normalizeOptions(items) {
    return (items || [])
      .map(item => optionName(item))
      .filter(Boolean);
  }

  function getTaskCategoryName(item) {
    if (!item) return '';
    if (typeof item === 'string') return '';
    return item.category_name || item.category || '';
  }

  function renderWorkFormOptions() {
    setSelectOptions(el.weather, state.options.weather, true);
    setSelectOptions(el.task_category, state.options.task_categories, true, '카테고리 선택');
    renderTaskOptionsByCategory(el.task_category?.value || '');
    renderChipOptions('crops', state.options.crops);
    renderChipOptions('pests', state.options.pests);
    renderChipOptions('machines', state.options.machines);
    renderRecommendedMaterials();
  }

  function renderTaskOptionsByCategory(categoryName, keepCurrentValue = true) {
    const selectEl = el.task_name;
    if (!selectEl) return;

    const current = keepCurrentValue ? (selectEl.value || '') : '';
    const rawTasks = state.optionsRaw?.tasks || [];
    const list = categoryName
      ? rawTasks.filter(item => getTaskCategoryName(item) === categoryName)
      : rawTasks;

    const options = [`<option value="">세부작업 선택</option>`];
    list.forEach(item => {
      const name = optionName(item);
      options.push(`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`);
    });

    selectEl.innerHTML = options.join('');
    if (current && list.some(item => optionName(item) === current)) {
      selectEl.value = current;
    }
  }

  function setSelectOptions(selectEl, items, allowEmpty = false, emptyLabel = '선택') {
    if (!selectEl) return;
    const current = selectEl.value || '';
    const options = [];

    if (allowEmpty) {
      options.push(`<option value="">${escapeHtml(emptyLabel)}</option>`);
    }

    (items || []).forEach(item => {
      const name = optionName(item);
      options.push(`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`);
    });

    selectEl.innerHTML = options.join('');
    if ((items || []).some(item => optionName(item) === current)) {
      selectEl.value = current;
    }
  }

  function renderChipOptions(type, items) {
    const box = el[`${type}-box`];
    if (!box) return;

    const selected = new Set(getSelectedChipValues(type));

    box.innerHTML = (items || []).map(item => {
      const name = optionName(item);
      const checked = selected.has(name);
      return `
        <label class="chip ${checked ? 'active' : ''}">
          <input type="checkbox" value="${escapeHtml(name)}" ${checked ? 'checked' : ''}>
          <span>${escapeHtml(name)}</span>
        </label>
      `;
    }).join('');

    box.querySelectorAll('.chip').forEach(chip => {
      const input = chip.querySelector('input[type="checkbox"]');
      chip.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        e.preventDefault();
        input.checked = !input.checked;
        chip.classList.toggle('active', input.checked);

        if (type === 'pests') {
          renderRecommendedMaterials();
        }
      });
    });

    box.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', () => {
        input.closest('.chip')?.classList.toggle('active', input.checked);
        if (type === 'pests') {
          renderRecommendedMaterials();
        }
      });
    });
  }

  function clearChipSelections(type) {
    const box = el[`${type}-box`];
    if (!box) return;
    box.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });
    box.querySelectorAll('.chip').forEach(chip => {
      chip.classList.remove('active');
    });
  }

  function setChipSelections(type, values) {
    const box = el[`${type}-box`];
    if (!box) return;

    const valueSet = new Set(values || []);
    box.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = valueSet.has(input.value);
      input.closest('.chip')?.classList.toggle('active', input.checked);
    });
  }

  function getLaborTotal() {
    const rows = getLaborRows();
    return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
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
    const noteEl = div.querySelector('.labor-note');

    function recalc() {
      const count = Number(countEl.value || 0);
      const price = Number(priceEl.value || 0);
      amountEl.value = String(count * price);
      updateMoneySummary();
    }

    countEl.addEventListener('input', recalc);
    priceEl.addEventListener('input', recalc);
    noteEl.addEventListener('input', updateMoneySummary);

    div.querySelector('.labor-remove').addEventListener('click', () => {
      div.remove();
      updateMoneySummary();
    });

    recalc();
  }

  function getLaborRows() {
    const wrap = el['labor-rows-wrap'];
    if (!wrap) return [];
    return Array.from(wrap.querySelectorAll('.labor-row')).map(row => {
      const type = row.querySelector('.labor-type')?.value || '';
      const count = Number(row.querySelector('.labor-count')?.value || 0);
      const price = Number(row.querySelector('.labor-price')?.value || 0);
      const amount = Number(row.querySelector('.labor-amount')?.value || 0);
      const note = row.querySelector('.labor-note')?.value || '';
      return { type, count, price, amount, method: '', note };
    }).filter(item => item.count > 0 || item.price > 0 || item.note);
  }

  function renderMaterialSearchResults(keyword) {
    const box = el['material-search-results'];
    if (!box) return;

    const q = (keyword || '').trim().toLowerCase();
    if (!q) {
      box.innerHTML = '';
      return;
    }

    const matched = state.materials.filter(item => {
      const text = `${item.name || ''} ${item.unit || ''}`.toLowerCase();
      return text.includes(q);
    }).slice(0, 30);

    box.innerHTML = matched.length
      ? matched.map(item => `
          <button type="button" class="search-result-item" data-add-material="${escapeHtml(String(item.id))}">
            ${escapeHtml(item.name || '')} / ${escapeHtml(item.unit || '')} / 단가 ${formatNumber(item.unit_price || item.price || 0)}
          </button>
        `).join('')
      : `<div class="empty-msg">검색 결과 없음</div>`;

    box.querySelectorAll('[data-add-material]').forEach(btn => {
      btn.addEventListener('click', () => addSelectedMaterial(btn.dataset.addMaterial));
    });
  }

  function addSelectedMaterial(id) {
    const source = state.materials.find(item => String(item.id) === String(id));
    if (!source) return;

    const exists = state.selectedMaterialsDetailed.find(item => String(item.id) === String(id));
    if (exists) {
      exists.qty = Number(exists.qty || 0) + 1;
    } else {
      state.selectedMaterialsDetailed.push({
        id: source.id,
        name: source.name || '',
        unit: source.unit || '',
        price: Number(source.unit_price || source.price || 0),
        qty: 1,
        method: ''
      });
    }

    renderSelectedMaterialsDetailed();
    updateMoneySummary();
    if (el['material-search-input']) el['material-search-input'].value = '';
    if (el['material-search-results']) el['material-search-results'].innerHTML = '';
  }

  function findMaterialByRecommendedName(name) {
    const target = String(name || '').trim().toLowerCase();
    if (!target) return null;

    let found = state.materials.find(item => String(item.name || '').trim().toLowerCase() === target);
    if (found) return found;

    found = state.materials.find(item => String(item.name || '').trim().toLowerCase().includes(target));
    if (found) return found;

    found = state.materials.find(item => target.includes(String(item.name || '').trim().toLowerCase()));
    if (found) return found;

    return null;
  }

  function renderSelectedMaterialsDetailed() {
    const box = el['selected-materials-detailed'];
    if (!box) return;

    if (!state.selectedMaterialsDetailed.length) {
      box.innerHTML = `<div class="empty-msg">선택된 자재 없음</div>`;
      return;
    }

    box.innerHTML = state.selectedMaterialsDetailed.map((item, idx) => `
      <div class="material-row">
        <span style="min-width:140px;"><strong>${escapeHtml(item.name || '')}</strong></span>
        <input type="number" min="0" step="0.1" value="${escapeHtml(String(item.qty || 0))}" data-material-qty="${idx}">
        <span>${escapeHtml(item.unit || '')}</span>
        <span>단가 ${formatNumber(item.price || 0)}</span>
        <span>합계 ${formatNumber((item.price || 0) * (item.qty || 0))}</span>
        <button type="button" class="btn" data-material-remove="${idx}">삭제</button>
      </div>
    `).join('');

    box.querySelectorAll('[data-material-qty]').forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.materialQty);
        if (Number.isNaN(idx) || !state.selectedMaterialsDetailed[idx]) return;
        state.selectedMaterialsDetailed[idx].qty = Number(input.value || 0);
        renderSelectedMaterialsDetailed();
        updateMoneySummary();
      });
    });

    box.querySelectorAll('[data-material-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.materialRemove);
        if (Number.isNaN(idx)) return;
        state.selectedMaterialsDetailed.splice(idx, 1);
        renderSelectedMaterialsDetailed();
        updateMoneySummary();
      });
    });
  }

  function renderRecommendedMaterials() {
    const wrap = el['recommended-materials-wrap'];
    const box = el['recommended-materials-box'];
    if (!wrap || !box) return;

    const selectedPests = getSelectedChipValues('pests');
    const recommends = new Set();

    selectedPests.forEach(pestName => {
      const rec = getPestRecommend(pestName);
      splitCsv(rec).forEach(name => {
        if (name) recommends.add(name);
      });
    });

    const names = Array.from(recommends);
    if (!names.length) {
      wrap.classList.add('hidden');
      box.innerHTML = `<div class="recommended-materials-empty">추천 자재 없음</div>`;
      return;
    }

    wrap.classList.remove('hidden');
    box.innerHTML = names.map(name => `
      <button type="button" class="search-result-item" data-recommend-material="${escapeHtml(name)}">${escapeHtml(name)}</button>
    `).join('');

    box.querySelectorAll('[data-recommend-material]').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.recommendMaterial || '';
        const item = findMaterialByRecommendedName(name);

        if (item) {
          addSelectedMaterial(item.id);
          return;
        }

        const exists = state.selectedMaterialsDetailed.find(m => (m.name || '') === name);
        if (exists) {
          exists.qty = Number(exists.qty || 0) + 1;
        } else {
          state.selectedMaterialsDetailed.push({
            id: '',
            name,
            unit: '',
            price: 0,
            qty: 1,
            method: ''
          });
        }

        renderSelectedMaterialsDetailed();
        updateMoneySummary();
      });
    });
  }

  function getSelectedChipValues(type) {
    const box = el[`${type}-box`];
    if (!box) return [];
    return Array.from(box.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
  }

  function renderOptions() {
    renderOptionList('weather', state.options.weather, el['options-weather'], el['new-weather']);
    renderOptionList('crops', state.options.crops, el['options-crops'], el['new-crops']);
    renderTaskCategorySelect();
    renderTaskCategoryList();
    renderTaskOptionList();
    updateTaskOptionEditorUI();
    renderOptionList('pests', state.options.pests, el['options-pests'], el['new-pests'], el['new-pests-recommend']);
    renderOptionList('machines', state.options.machines, el['options-machines'], el['new-machines']);

    (el.optionPanels || []).forEach(panel => {
      const tab = panel.dataset.optionPanel;
      if (window.innerWidth <= 900) {
        panel.style.display = tab === state.optionTab ? '' : 'none';
      } else {
        panel.style.display = '';
      }
    });

    (el.optionTabButtons || []).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.optionTab === state.optionTab);
    });

    renderSeasonList();
  }

  function renderTaskCategoryList() {
    const listEl = el['options-task-categories'];
    if (!listEl) return;

    const rawItems = state.optionsRaw?.task_categories || [];
    listEl.innerHTML = rawItems.map(item => {
      const name = optionName(item);
      const itemId = item?.id ?? name;
      return `
        <div class="option-item">
          <div class="option-item-main">
            <span>${escapeHtml(name)}</span>
          </div>
          <div class="item-actions">
            <button type="button" class="btn" data-task-category-edit="${escapeHtml(String(itemId))}|${escapeHtml(name)}">수정</button>
            <button type="button" class="btn" data-task-category-delete="${escapeHtml(String(itemId))}">삭제</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-task-category-edit]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const [optionId, currentName] = String(btn.dataset.taskCategoryEdit || '').split('|');
        const newName = prompt('수정할 작업분류', currentName || '');
        if (newName == null) return;
        const trimmed = newName.trim();
        if (!trimmed) return;

        try {
          await apiPut(`/api/options/task_categories/${optionId}`, { name: trimmed });
          await loadOptions();
          renderOptions();
          renderWorkFormOptions();
        } catch (e) {
          console.error(e);
          alert('수정 실패');
        }
      });
    });

    listEl.querySelectorAll('[data-task-category-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
          await apiDelete(`/api/options/task_categories/${btn.dataset.taskCategoryDelete}`);
          await loadOptions();
          renderOptions();
          renderWorkFormOptions();
        } catch (e) {
          console.error(e);
          alert('삭제 실패');
        }
      });
    });
  }


  function renderTaskCategorySelect() {
    const selectEl = el['new-task-category'];
    if (!selectEl) return;

    const current = selectEl.value || '';
    const rawItems = state.optionsRaw?.task_categories || [];
    const html = ['<option value="">작업분류 선택</option>']
      .concat(rawItems.map(item => {
        const name = optionName(item);
        return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
      }))
      .join('');

    selectEl.innerHTML = html;
    if (rawItems.some(item => optionName(item) === current)) {
      selectEl.value = current;
    }
  }

  function getTaskOptionSaveButton() {
    return document.querySelector('[data-option-panel="tasks"] .inline-form .btn.primary');
  }

  function updateTaskOptionEditorUI() {
    const btn = getTaskOptionSaveButton();
    if (!btn) return;
    btn.textContent = state.editingTaskOptionId ? '수정 저장' : '추가';
  }

  function renderTaskOptionList() {
    const listEl = el['options-tasks'];
    if (!listEl) return;

    const rawItems = state.optionsRaw?.tasks || [];
    const selectedCategory = (el['new-task-category']?.value || '').trim();
    const items = selectedCategory
      ? rawItems.filter(item => getTaskCategoryName(item) === selectedCategory)
      : rawItems;

    listEl.innerHTML = items.map(item => {
      const name = optionName(item);
      const itemId = item?.id ?? name;
      const categoryName = getTaskCategoryName(item);
      return `
        <div class="option-item">
          <div class="option-item-main">
            <span>${escapeHtml(name)}</span>
            <div class="option-subtext">${escapeHtml(categoryName || '작업분류 없음')}</div>
          </div>
          <div class="item-actions">
            <button type="button" class="btn" data-task-edit="${escapeHtml(String(itemId))}|${escapeHtml(name)}|${escapeHtml(categoryName)}">수정</button>
            <button type="button" class="btn" data-task-delete="${escapeHtml(String(itemId))}">삭제</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-task-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [optionId, currentName, currentCategory] = String(btn.dataset.taskEdit || '').split('|');
        state.editingTaskOptionId = optionId || null;
        if (el['new-task-category']) el['new-task-category'].value = currentCategory || '';
        if (el['new-tasks']) {
          el['new-tasks'].value = currentName || '';
          el['new-tasks'].focus();
        }
        updateTaskOptionEditorUI();
        renderTaskOptionList();
      });
    });

    listEl.querySelectorAll('[data-task-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
          await apiDelete(`/api/options/tasks/${btn.dataset.taskDelete}`);
          if (String(state.editingTaskOptionId || '') === String(btn.dataset.taskDelete || '')) {
            state.editingTaskOptionId = null;
            if (el['new-tasks']) el['new-tasks'].value = '';
          }
          await loadOptions();
          renderOptions();
          renderWorkFormOptions();
        } catch (e) {
          console.error(e);
          alert('삭제 실패');
        }
      });
    });
  }

  function renderOptionList(type, items, listEl, inputEl, extraInputEl = null) {
    if (!listEl) return;

    const rawItems = state.optionsRaw?.[type] || (items || []).map(name => ({ name }));

    listEl.innerHTML = rawItems.map(item => {
      const name = optionName(item);
      const itemId = item?.id ?? name;
      return `
        <div class="option-item">
          <div class="option-item-main">
            <span>${escapeHtml(name)}</span>
            ${type === 'pests' ? `<div class="option-subtext">${escapeHtml(getPestRecommend(name))}</div>` : ''}
          </div>
          <div class="item-actions">
            <button type="button" class="btn" data-option-edit="${escapeHtml(type)}|${escapeHtml(String(itemId))}|${escapeHtml(name)}">수정</button>
            <button type="button" class="btn" data-option-delete="${escapeHtml(type)}|${escapeHtml(String(itemId))}">삭제</button>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('[data-option-edit]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const [optionType, optionId, currentName] = String(btn.dataset.optionEdit || '').split('|');
        const newName = prompt('수정할 이름', currentName || '');
        if (newName == null) return;
        const trimmed = newName.trim();
        if (!trimmed) return;

        let recommended = '';
        if (optionType === 'pests') {
          recommended = prompt('추천약제 (쉼표로 구분)', getPestRecommend(currentName || '')) || '';
        }

        try {
          await apiPut(`/api/options/${optionType}/${optionId}`, {
            name: trimmed,
            recommended_materials: recommended.trim()
          });
          await loadOptions();
          renderOptions();
          renderWorkFormOptions();
        } catch (e) {
          console.error(e);
          alert('수정 실패');
        }
      });
    });

    listEl.querySelectorAll('[data-option-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const [optionType, optionId] = String(btn.dataset.optionDelete || '').split('|');
        if (!confirm('삭제하시겠습니까?')) return;
        try {
          await apiDelete(`/api/options/${optionType}/${optionId}`);
          await loadOptions();
          renderOptions();
          renderWorkFormOptions();
        } catch (e) {
          console.error(e);
          alert('삭제 실패');
        }
      });
    });
  }

  async function saveTaskCategory() {
    const inputNode = el['new-task-categories'];
    if (!inputNode) return;

    const name = (inputNode.value || '').trim();
    if (!name) {
      alert('작업분류를 입력하세요.');
      inputNode.focus();
      return;
    }

    try {
      await apiPost('/api/options/task_categories', { name });
      inputNode.value = '';
      await loadOptions();
      renderOptions();
      renderWorkFormOptions();
    } catch (e) {
      console.error(e);
      alert('추가 실패');
    }
  }

  async function saveTaskOption() {
    const nameNode = el['new-tasks'];
    const categoryNode = el['new-task-category'];
    if (!nameNode || !categoryNode) return;

    const name = (nameNode.value || '').trim();
    const category_name = (categoryNode.value || '').trim();

    if (!name) {
      alert('세부작업을 입력하세요.');
      nameNode.focus();
      return;
    }

    try {
      if (state.editingTaskOptionId) {
        await apiPut(`/api/options/tasks/${state.editingTaskOptionId}`, { name, category_name });
      } else {
        await apiPost('/api/options/tasks', { name, category_name });
      }
      state.editingTaskOptionId = null;
      nameNode.value = '';
      await loadOptions();
      renderOptions();
      renderWorkFormOptions();
    } catch (e) {
      console.error(e);
      alert(state.editingTaskOptionId ? '수정 실패' : '추가 실패');
    }
  }

  async function saveOption(type, inputId, extraInputId = null) {
    const inputNode = document.getElementById(inputId);
    const extraNode = extraInputId ? document.getElementById(extraInputId) : null;
    if (!inputNode) return;

    const name = (inputNode.value || '').trim();
    if (!name) {
      alert('항목명을 입력하세요.');
      inputNode.focus();
      return;
    }

    const payload = { name };
    if (type === 'pests') {
      payload.recommended_materials = (extraNode?.value || '').trim();
    }

    try {
      await apiPost(`/api/options/${type}`, payload);
      inputNode.value = '';
      if (extraNode) extraNode.value = '';
      await loadOptions();
      renderOptions();
      renderWorkFormOptions();
    } catch (e) {
      console.error(e);
      alert('추가 실패');
    }
  }

  window.saveOption = function(type, inputId) {
    if (type === 'task_categories') {
      return saveTaskCategory();
    }
    if (type === 'tasks') {
      return saveTaskOption();
    }
    const extraId = type === 'pests' ? 'new-pests-recommend' : null;
    return saveOption(type, inputId, extraId);
  };

  function getPestRecommend(name) {
    const item = (state.options.pestsRaw || []).find(p => optionName(p) === name);
    return item?.recommended_materials || item?.recommend || '';
  }

  async function saveSeason() {
    const payload = {
      season_name: (el.season_name?.value || '').trim(),
      start_date: el.season_start_date?.value || '',
      end_date: el.season_end_date?.value || '',
      note: (el.season_note?.value || '').trim(),
      is_current: String(el.season_is_current?.value || '0') === '1'
    };

    if (!payload.season_name) {
      alert('시즌명을 입력하세요.');
      return;
    }

    try {
      if (state.editingSeasonId) {
        await apiPut(`/api/seasons/${state.editingSeasonId}`, payload);
      } else {
        await apiPost('/api/seasons', payload);
      }
      resetSeasonForm();
      await loadSeasons();
      renderSeasonList();
    } catch (e) {
      console.error(e);
      alert('시즌 저장 실패');
    }
  }

  function resetSeasonForm() {
    state.editingSeasonId = null;
    if (el.season_name) el.season_name.value = '';
    if (el.season_start_date) el.season_start_date.value = '';
    if (el.season_end_date) el.season_end_date.value = '';
    if (el.season_note) el.season_note.value = '';
    if (el.season_is_current) el.season_is_current.value = '0';
  }

  function renderSeasonList() {
    const wrap = el['season-list'];
    if (!wrap) return;

    if (!state.seasons.length) {
      wrap.innerHTML = `<div class="empty-msg">시즌 없음</div>`;
      return;
    }

    wrap.innerHTML = state.seasons.map(season => `
      <div class="season-card ${Number(season.is_current || 0) ? 'current' : ''}">
        <div class="season-card-title">${escapeHtml(season.season_name || season.name || '')}</div>
        <div class="season-card-meta">
          ${escapeHtml(season.start_date || '')} ~ ${escapeHtml(season.end_date || '')}<br>
          ${escapeHtml(season.note || '')}
        </div>
        <div class="item-actions">
          <button type="button" class="btn" data-season-edit="${escapeHtml(String(season.id))}">수정</button>
          <button type="button" class="btn" data-season-delete="${escapeHtml(String(season.id))}">삭제</button>
        </div>
      </div>
    `).join('');

    wrap.querySelectorAll('[data-season-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const season = state.seasons.find(s => String(s.id) === String(btn.dataset.seasonEdit));
        if (!season) return;
        state.editingSeasonId = season.id;
        if (el.season_name) el.season_name.value = season.season_name || season.name || '';
        if (el.season_start_date) el.season_start_date.value = season.start_date || '';
        if (el.season_end_date) el.season_end_date.value = season.end_date || '';
        if (el.season_note) el.season_note.value = season.note || '';
        if (el.season_is_current) el.season_is_current.value = String(Number(season.is_current || 0));
      });
    });

    wrap.querySelectorAll('[data-season-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
          await apiDelete(`/api/seasons/${btn.dataset.seasonDelete}`);
          await loadSeasons();
          renderSeasonList();
        } catch (e) {
          console.error(e);
          alert('삭제 실패');
        }
      });
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
    const compareWrap = el['calendar-compare-wrap'];
    const currentWrap = document.querySelector('.calendar-current-wrap');
    const currentBtn = el['btn-mobile-current'];
    const previousBtn = el['btn-mobile-previous'];

    if (!compareWrap || !currentWrap) return;

    const isMobile = window.innerWidth <= 900;
    if (!isMobile) {
      currentWrap.style.display = '';
      compareWrap.style.display = '';
      if (currentBtn) currentBtn.classList.remove('active');
      if (previousBtn) previousBtn.classList.remove('active');
      return;
    }

    currentWrap.style.display = state.mobileCalendarMode === 'current' ? '' : 'none';
    compareWrap.style.display = state.mobileCalendarMode === 'previous' ? '' : 'none';

    if (currentBtn) currentBtn.classList.toggle('active', state.mobileCalendarMode === 'current');
    if (previousBtn) previousBtn.classList.toggle('active', state.mobileCalendarMode === 'previous');
  }

  function resetMoneyFields() {
    if (el.has_money) el.has_money.checked = false;
    if (el.money_note) el.money_note.value = '';
    if (el.other_cost) el.other_cost.value = 0;
    toggleMoneyBox(false);
    updateMoneySummary();
  }

  function toggleMoneyBox(show) {
    const box = el['money-box'];
    if (!box) return;
    box.classList.toggle('hidden', !show);
  }

  async function openMaterialModal(options = {}) {
    state.editingMaterialId = null;
    if (el['material-modal-title']) el['material-modal-title'].textContent = '자재 추가';
    resetMaterialForm();
    removeHidden(el['material-modal']);
    if (!options.skipHistory) {
      pushHistoryState(state.currentPage, 'material');
    }
  }

  function openMaterialModalById(id, options = {}) {
    const item = state.materials.find(m => String(m.id) === String(id));
    if (!item) return;

    state.editingMaterialId = item.id;
    if (el['material-modal-title']) el['material-modal-title'].textContent = '자재 수정';

    if (el.material_name) el.material_name.value = item.name || '';
    if (el.material_unit) el.material_unit.value = item.unit || state.materialUnits[0] || '';
    if (el.material_stock) el.material_stock.value = item.stock_qty ?? item.stock ?? 0;
    if (el.material_price) el.material_price.value = item.unit_price ?? item.price ?? 0;
    if (el.material_memo) el.material_memo.value = item.memo || '';

    removeHidden(el['material-modal']);
    if (!options.skipHistory) {
      pushHistoryState(state.currentPage, 'material');
    }
  }

  function closeMaterialModal() {
    addHidden(el['material-modal']);
    state.editingMaterialId = null;
  }

  function resetMaterialForm() {
    if (el.material_name) el.material_name.value = '';
    if (el.material_unit) el.material_unit.value = state.materialUnits[0] || '';
    if (el.material_stock) el.material_stock.value = '0';
    if (el.material_price) el.material_price.value = '0';
    if (el.material_memo) el.material_memo.value = '';
    if (el['material-search-keyword']) el['material-search-keyword'].value = '';
    if (el['material-search-box']) el['material-search-box'].innerHTML = '';
  }

  function renderMaterialPickerResults(keyword) {
    const box = el['material-search-box'];
    if (!box) return;

    const q = (keyword || '').trim().toLowerCase();
    if (!q) {
      box.innerHTML = '';
      return;
    }

    const matched = state.materials.filter(item =>
      (item.name || '').toLowerCase().includes(q)
    ).slice(0, 20);

    box.innerHTML = matched.length
      ? matched.map(item => `
          <button type="button" class="search-result-item" data-material-pick="${escapeHtml(String(item.id))}">
            ${escapeHtml(item.name || '')} / ${escapeHtml(item.unit || '')}
          </button>
        `).join('')
      : `<div class="empty-msg">검색 결과 없음</div>`;

    box.querySelectorAll('[data-material-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = state.materials.find(m => String(m.id) === String(btn.dataset.materialPick));
        if (!item) return;
        el.material_name.value = item.name || '';
        el.material_unit.value = item.unit || '';
        el.material_price.value = item.unit_price || item.price || 0;
      });
    });
  }

  async function saveMaterial() {
    const payload = {
      name: (el.material_name?.value || '').trim(),
      unit: el.material_unit?.value || '',
      stock_qty: Number(el.material_stock?.value || 0),
      unit_price: Number(el.material_price?.value || 0),
      memo: (el.material_memo?.value || '').trim()
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
      resetMaterialForm();
      closeMaterialModal();
    } catch (e) {
      console.error(e);
      alert('자재 저장 실패');
    }
  }

  async function deleteWork(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await apiDelete(`/api/works/${id}`);
      await loadWorks();
      await loadMoney();
      renderWorks();
      renderCalendar();
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
      renderMoney();
    } catch (e) {
      console.error(e);
      alert('삭제 실패');
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
      alert('삭제 실패');
    }
  }

  function renderMaterials() {
    const wrap = el['materials-list'];
    if (!wrap) return;

    const q = (state.materialListSearchKeyword || '').trim().toLowerCase();

    const filtered = state.materials.filter(item => {
      const text = `${item.name || ''} ${item.unit || ''} ${item.memo || ''}`.toLowerCase();
      return text.includes(q);
    });

    const inStock = filtered.filter(item => Number(item.stock_qty || item.stock || 0) > 0);
    const outStock = filtered.filter(item => Number(item.stock_qty || item.stock || 0) <= 0);

    wrap.innerHTML = `
      <div class="materials-two-col">
        <div>
          <h3>재고 있음</h3>
          ${renderMaterialSection(inStock)}
        </div>
        <div>
          <h3>재고 없음</h3>
          ${renderMaterialSection(outStock)}
        </div>
      </div>
    `;

    wrap.querySelectorAll('[data-material-edit]').forEach(btn => {
      btn.addEventListener('click', () => openMaterialModalById(btn.dataset.materialEdit));
    });

    wrap.querySelectorAll('[data-material-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteMaterial(btn.dataset.materialDelete));
    });
  }

  function renderMaterialSection(items) {
    if (!items.length) {
      return `<div class="empty-msg">없음</div>`;
    }

    return items.map(item => `
      <div class="day-item">
        <div><strong>${escapeHtml(item.name || '')}</strong></div>
        <div>재고: ${formatNumber(item.stock_qty || item.stock || 0)} ${escapeHtml(item.unit || '')}</div>
        <div>단가: ${formatNumber(item.unit_price || item.price || 0)}</div>
        <div>메모: ${escapeHtml(item.memo || '')}</div>
        <div class="item-actions">
          <button type="button" class="btn" data-material-edit="${escapeHtml(String(item.id))}">수정</button>
          <button type="button" class="btn" data-material-delete="${escapeHtml(String(item.id))}">삭제</button>
        </div>
      </div>
    `).join('');
  }

  function renderMoney() {
    const wrap = el['money-list'];
    if (!wrap) return;

    const start = el['money-start']?.value || '';
    const end = el['money-end']?.value || '';
    const typeFilter = el['money-type-filter']?.value || '';
    const methodFilter = el['money-method-filter']?.value || '';

    const filtered = state.moneyRows.filter(row => {
      if (start && row.date < start) return false;
      if (end && row.date > end) return false;
      if (typeFilter && row.type !== typeFilter) return false;
      if (methodFilter && row.method !== methodFilter) return false;
      return true;
    });

    const total = filtered.reduce((sum, row) => sum + Number(row.total_amount || row.total || 0), 0);
    const cash = filtered.reduce((sum, row) => sum + Number(row.cash_amount || 0), 0);
    const card = filtered.reduce((sum, row) => sum + Number(row.card_amount || 0), 0);

    if (el['money-total']) el['money-total'].innerText = formatNumber(total);
    if (el['money-cash']) el['money-cash'].innerText = formatNumber(cash);
    if (el['money-card']) el['money-card'].innerText = formatNumber(card);

    if (!filtered.length) {
      wrap.innerHTML = `<div class="empty-msg">금전 내역 없음</div>`;
      return;
    }

    wrap.innerHTML = `
      <table class="money-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th>구분</th>
            <th>총금액</th>
            <th>인건비</th>
            <th>자재비</th>
            <th>기타</th>
            <th>비고</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(row => `
            <tr>
              <td>${escapeHtml(row.date || '')}</td>
              <td>${escapeHtml(row.type || '')}</td>
              <td>${formatNumber(row.total_amount || row.total || 0)}</td>
              <td>${formatNumber(row.labor_total || 0)}</td>
              <td>${formatNumber(row.material_total || 0)}</td>
              <td>${formatNumber(row.other_total || 0)}</td>
              <td>${escapeHtml(row.note || '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function bindHistoryNavigation() {
    window.addEventListener('popstate', (event) => {
      const page = event.state?.page || state.currentPage || 'calendar';
      const modal = event.state?.modal || '';

      closeAllModals();

      switchPage(page, { skipHistory: true });

      if (modal === 'calendar-detail' && state.selectedDate) {
        openCalendarDetailModal(state.selectedDate, { skipHistory: true });
      } else if (modal === 'plan') {
        openPlanModal({ skipHistory: true });
      } else if (modal === 'work') {
        openWorkModal({ skipHistory: true });
      } else if (modal === 'material') {
        openMaterialModal({ skipHistory: true });
      }
    });
  }

  function initializeHistoryState() {
    const initialState = { page: state.currentPage || 'calendar', modal: '' };
    history.replaceState(initialState, '', location.href);
  }

  function pushHistoryState(page, modal) {
    const nextState = { page: page || state.currentPage || 'calendar', modal: modal || '' };
    const currentState = history.state || {};
    if (currentState.page === nextState.page && currentState.modal === nextState.modal) {
      return;
    }
    history.pushState(nextState, '', location.href);
  }

  function closeAllModals() {
    closeCalendarDetailModal();
    closePlanModal();
    closeWorkModal();
    closeMaterialModal();
  }

  function normalizePlanDate(value) {
    return String(value || '').slice(0, 10);
  }

  function isDateInRange(target, start, end) {
    const s = String(start || '');
    const e = String(end || start || '');
    return !!target && !!s && target >= s && target <= e;
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    selectEl.value = value || '';
  }

  function removeHidden(node) {
    if (!node) return;
    node.classList.remove('hidden');
  }

  function addHidden(node) {
    if (!node) return;
    node.classList.add('hidden');
  }

  function fmtDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('ko-KR');
  }

  function formatWorkTimeText(meta, work) {
    const start = meta.start_time || '';
    const end = meta.end_time || '';
    const hours = Number(meta.work_hours || work.work_hours || 0);

    const parts = [];
    if (start) parts.push(`시작 ${start}`);
    if (end) parts.push(`종료 ${end}`);
    if (hours > 0) parts.push(`총 ${hours}시간`);

    return parts.join(' / ');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseMemo(raw) {
    if (!raw) {
      return {
        memo_text: '',
        repeat_days: 1,
        start_time: '',
        end_time: '',
        materials: [],
        labor_rows: [],
        work_hours: 0,
        money: null
      };
    }

    try {
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
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

  function ensureWorksSearchBar() {
    const page = el['page-works'];
    if (!page) return;

    let box = page.querySelector('.works-search-box');
    if (!box) {
      box = document.createElement('div');
      box.className = 'works-search-box';
      box.style.marginBottom = '12px';
      box.innerHTML = `
        <input type="text" id="works-search-input" placeholder="검색어 입력" style="width:100%; max-width:420px;">
      `;
      const target = page.querySelector('.page-header-actions') || page.firstElementChild || page;
      if (target && target.parentNode === page) {
        page.insertBefore(box, target.nextSibling);
      } else {
        page.insertBefore(box, page.firstChild);
      }

      const input = box.querySelector('#works-search-input');
      input.addEventListener('input', (e) => {
        state.workSearchKeyword = (e.target.value || '').trim();
        renderWorks();
      });
    }
  }

  function renderWorks() {
    const wrap = el['works-list'];
    if (!wrap) return;

    const q = (state.workSearchKeyword || '').trim().toLowerCase();
    const works = [...state.works].sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || '')));

    const filtered = works.filter(work => {
      const meta = parseMemo(work.memo);
      const text = [
        work.start_date,
        work.end_date,
        work.weather,
        work.task_name,
        work.crops,
        work.pests,
        work.machines,
        meta.memo_text,
        (meta.materials || []).map(m => `${m.name || ''} ${m.qty || ''} ${m.unit || ''}`).join(' ')
      ].join(' ').toLowerCase();

      return text.includes(q);
    });

    if (!filtered.length) {
      wrap.innerHTML = `<div class="empty-msg">작업 내역 없음</div>`;
      return;
    }

    const grouped = {};
    filtered.forEach(work => {
      const date = work.start_date || '';
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(work);
    });

    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    wrap.innerHTML = dates.map(date => {
      const items = grouped[date];
      return `
        <div class="work-date-group">
          <div class="work-date-title">${escapeHtml(date)}</div>
          <div class="work-date-row ${items.length === 1 ? 'single-card' : ''}">
            ${items.map(work => renderWorkCard(work)).join('')}
          </div>
        </div>
      `;
    }).join('');

    wrap.querySelectorAll('[data-work-edit]').forEach(btn => {
      btn.addEventListener('click', () => openWorkModalById(btn.dataset.workEdit));
    });

    wrap.querySelectorAll('[data-work-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
    });
  }

  function renderWorkCard(work) {
    const meta = parseMemo(work.memo);
    const materialsText = (meta.materials || []).map(m => `${m.name || ''} ${m.qty || 0}${m.unit || ''}`).join(', ');
    const laborText = (meta.labor_rows || []).map(r => `${r.type || ''} ${r.count || 0}명`).join(', ');

    return `
      <div class="work-card">
        <div class="work-card-title">${escapeHtml(work.task_name || '')}</div>
        <div>기간: ${escapeHtml(work.start_date || '')} ~ ${escapeHtml(work.end_date || '')}</div>
        <div>날씨: ${escapeHtml(work.weather || '')}</div>
        <div>작업분류: ${escapeHtml(work.task_category || '')}</div>
        <div>작물: ${escapeHtml(work.crops || '')}</div>
        <div>병충해: ${escapeHtml(work.pests || '')}</div>
        <div>기계: ${escapeHtml(work.machines || '')}</div>
        <div>시간: ${escapeHtml(formatWorkTimeText(meta, work) || '')}</div>
        <div>자재: ${escapeHtml(materialsText || '')}</div>
        <div>인력: ${escapeHtml(laborText || '')}</div>
        <div>메모: ${escapeHtml(meta.memo_text || '')}</div>
        <div class="item-actions">
          <button type="button" class="btn" data-work-edit="${escapeHtml(String(work.id))}">수정</button>
          <button type="button" class="btn" data-work-delete="${escapeHtml(String(work.id))}">삭제</button>
        </div>
      </div>
    `;
  }

  async function saveWork() {
    if ((!el.end_time?.value || '').trim() === '' && Number(el.work_hours?.value || 0) > 0) {
      syncWorkTimeFields('hours');
    } else if ((el.start_time?.value || '').trim() !== '' && (el.end_time?.value || '').trim() !== '') {
      syncWorkTimeFields('time');
    }

    const crops = getSelectedChipValues('crops').join(', ');
    const pests = getSelectedChipValues('pests').join(', ');
    const machines = getSelectedChipValues('machines').join(', ');

    const laborRows = getLaborRows();
    const money = el.has_money?.checked ? {
      type: buildMoneyType(),
      total_amount: getLaborTotal() + getMaterialTotal() + getOtherTotal(),
      labor_total: getLaborTotal(),
      material_total: getMaterialTotal(),
      other_total: getOtherTotal(),
      method: '',
      note: (el.money_note?.value || '').trim()
    } : null;

    const payload = {
      start_date: el.start_date?.value || '',
      end_date: el.end_date?.value || el.start_date?.value || '',
      weather: el.weather?.value || '',
      task_category: el.task_category?.value || '',
      task_name: el.task_name?.value || '',
      crops,
      pests,
      machines,
      work_hours: Number(el.work_hours?.value || 0),
      memo: JSON.stringify({
        memo_text: (el.memo?.value || '').trim(),
        repeat_days: Number(el.repeat_days?.value || 1),
        start_time: el.start_time?.value || '',
        end_time: el.end_time?.value || '',
        materials: state.selectedMaterialsDetailed.map(item => ({
          id: item.id || '',
          name: item.name || '',
          unit: item.unit || '',
          price: Number(item.price || 0),
          qty: Number(item.qty || 0),
          method: item.method || ''
        })),
        labor_rows: laborRows,
        work_hours: Number(el.work_hours?.value || 0),
        money
      }, null, 0)
    };

    if (!payload.start_date) {
      alert('시작일을 입력하세요.');
      return;
    }

    if (!payload.task_name) {
      alert('세부작업을 선택하세요.');
      return;
    }

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
      alert(`저장 실패\n${e.message || e}`);
    }
  }

  function buildMoneyType() {
    const labor = getLaborTotal();
    const material = getMaterialTotal();
    const other = getOtherTotal();

    if (labor > 0 && material > 0 && other > 0) return '인건비+자재비+기타';
    if (labor > 0 && material > 0) return '인건비+자재비';
    if (labor > 0 && other > 0) return '인건비+기타';
    if (material > 0 && other > 0) return '자재비+기타';
    if (labor > 0) return '인건비';
    if (material > 0) return '자재비';
    if (other > 0) return '기타';
    return '';
  }

  async function apiGet(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }

  async function parseApiError(res) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data && (data.error || data.message)) {
        message = data.error || data.message;
      }
    } catch (e) {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch (ignore) {}
    }
    return message;
  }

  async function apiPost(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    if (!res.ok) throw new Error(await parseApiError(res));
    return res.json().catch(() => ({}));
  }

  async function apiPut(url, body) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    if (!res.ok) throw new Error(await parseApiError(res));
    return res.json().catch(() => ({}));
  }

  async function apiDelete(url) {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json().catch(() => ({}));
  }

  function on(node, event, handler) {
    if (!node) return;
    node.addEventListener(event, handler);
  }
})();
