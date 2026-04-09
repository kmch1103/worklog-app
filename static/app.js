(function () {
  'use strict';

  const state = {
    currentPage: 'calendar',
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDate: null,
    editingWorkId: null,
    editingPlanId: null,
    editingMaterialId: null,
    editingSeasonId: null,
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
    optionTab: 'weather',
    seasons: []
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
    window.addEventListener('resize', updateMobileCalendarMode);
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
      'new-weather', 'new-crops', 'new-tasks', 'new-pests', 'new-machines',
      'options-weather', 'options-crops', 'options-tasks', 'options-pests', 'options-machines',
      'material-search-input', 'material-search-results', 'selected-materials-detailed',
      'labor-rows-wrap', 'btn-add-labor-row',
      'has_money', 'money-box', 'money_note', 'other_cost', 'money_labor_total', 'money_material_total', 'money_total_amount',
      'money-start', 'money-end', 'money-type-filter', 'money-method-filter',
      'btn-money-filter', 'money-list', 'money-total', 'money-cash', 'money-card',
      'material-list-search', 'season_name', 'season_start_date', 'season_end_date', 'season_note', 'season_is_current',
      'btn-save-season', 'btn-reset-season', 'season-list'
    ];

    ids.forEach(id => {
      el[id] = document.getElementById(id);
    });

    el.menuButtons = Array.from(document.querySelectorAll('.menu-btn[data-page]'));
    el.optionTabButtons = Array.from(document.querySelectorAll('[data-option-tab]'));
    el.optionPanels = Array.from(document.querySelectorAll('[data-option-panel]'));
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
    if (!el['calendar-detail-modal'] || !el['calendar-detail-body']) return;

    state.selectedDate = dateStr;
    if (el['calendar-detail-title']) {
      el['calendar-detail-title'].textContent = `${dateStr} 상세`;
    }

    const plans = state.plans.filter(p => normalizePlanDate(p.plan_date) === dateStr);
    const works = state.works.filter(w => isDateInRange(dateStr, w.start_date, w.end_date));

    el['calendar-detail-body'].innerHTML = `
      <div class="calendar-detail-group">
        <h4>계획</h4>
        ${plans.length ? plans.map(item => `
          <div class="calendar-detail-card">
            <div class="calendar-detail-title">${escapeHtml(item.title || '')}</div>
            <div class="calendar-detail-meta">
              날짜: ${escapeHtml(normalizePlanDate(item.plan_date))}<br>
              상태: ${escapeHtml(item.status || '')}<br>
              내용: ${escapeHtml(item.details || '')}
            </div>
            <div class="item-actions">
              <button class="btn" data-plan-edit="${escapeHtml(String(item.id))}">수정</button>
              <button class="btn" data-plan-delete="${escapeHtml(String(item.id))}">삭제</button>
            </div>
          </div>
        `).join('') : `<div class="empty-msg">등록된 계획이 없습니다.</div>`}
      </div>

      <div class="calendar-detail-group">
        <h4>실적</h4>
        ${works.length ? works.map(item => {
          const memo = parseMemo(item.memo);
          return `
            <div class="calendar-detail-card">
              <div class="calendar-detail-title">${escapeHtml(item.task_name || '')}</div>
              <div class="calendar-detail-meta">
                기간: ${escapeHtml(item.start_date || '')} ~ ${escapeHtml(item.end_date || '')}<br>
                작물: ${escapeHtml(item.crops || '')}<br>
                병충해: ${escapeHtml(item.pests || '')}<br>
                기계: ${escapeHtml(item.machines || '')}<br>
                메모: ${escapeHtml(memo.memo_text || '')}
              </div>
              <div class="item-actions">
                <button class="btn" data-work-edit="${escapeHtml(String(item.id))}">수정</button>
                <button class="btn" data-work-delete="${escapeHtml(String(item.id))}">삭제</button>
              </div>
            </div>
          `;
        }).join('') : `<div class="empty-msg">등록된 실적이 없습니다.</div>`}
      </div>
    `;

    el['calendar-detail-body'].querySelectorAll('[data-plan-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeCalendarDetailModal();
        openPlanModal(btn.dataset.planEdit);
      });
    });

    el['calendar-detail-body'].querySelectorAll('[data-plan-delete]').forEach(btn => {
      btn.addEventListener('click', () => deletePlan(btn.dataset.planDelete));
    });

    el['calendar-detail-body'].querySelectorAll('[data-work-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeCalendarDetailModal();
        openWorkModal(btn.dataset.workEdit);
      });
    });

    el['calendar-detail-body'].querySelectorAll('[data-work-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
    });

    removeHidden(el['calendar-detail-modal']);
  }

  function closeCalendarDetailModal() {
    addHidden(el['calendar-detail-modal']);
  }

  function openPlanModal(id = null) {
    state.editingPlanId = id ? Number(id) : null;
    const item = state.plans.find(p => String(p.id) === String(id));

    if (el['plan-modal-title']) {
      el['plan-modal-title'].textContent = item ? '작업계획 수정' : '작업계획 추가';
    }

    if (item) {
      el['plan_date'].value = normalizePlanDate(item.plan_date);
      el['plan_title'].value = item.title || '';
      el['plan_details'].value = item.details || '';
      el['plan_status'].value = item.status || 'planned';
    } else {
      el['plan_date'].value = state.selectedDate || fmtDate(new Date());
      el['plan_title'].value = '';
      el['plan_details'].value = '';
      el['plan_status'].value = 'planned';
    }

    renderPlanSearchResults();
    removeHidden(el['plan-modal']);
  }

  function closePlanModal() {
    addHidden(el['plan-modal']);
    state.editingPlanId = null;
  }

  function renderPlanSearchResults() {
    if (!el['plan-search-results']) return;

    const q = (el['plan-search']?.value || '').trim();
    const source = state.options.tasks.map(optionName).filter(Boolean);
    const matched = !q ? source.slice(0, 20) : source.filter(name => name.includes(q)).slice(0, 20);

    el['plan-search-results'].innerHTML = matched.map(name => `
      <button type="button" class="search-result-item" data-plan-pick="${escapeHtml(name)}">${escapeHtml(name)}</button>
    `).join('');

    el['plan-search-results'].querySelectorAll('[data-plan-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (el['plan_title']) el['plan_title'].value = btn.dataset.planPick || '';
      });
    });
  }

  async function savePlan() {
    const payload = {
      plan_date: el['plan_date']?.value || '',
      title: (el['plan_title']?.value || '').trim(),
      details: (el['plan_details']?.value || '').trim(),
      status: el['plan_status']?.value || 'planned'
    };

    if (!payload.plan_date || !payload.title) {
      return alert('날짜와 제목을 입력하세요.');
    }

    try {
      if (state.editingPlanId) {
        await apiPut(`/api/plans/${state.editingPlanId}`, payload);
      } else {
        await apiPost('/api/plans', payload);
      }

      await loadPlans();
      renderCalendar();
      closePlanModal();
    } catch (e) {
      console.error(e);
      alert('계획 저장 실패');
    }
  }

  async function deletePlan(id) {
    if (!confirm('삭제하시겠습니까?')) return;

    try {
      await apiDelete(`/api/plans/${id}`);
      await loadPlans();
      renderCalendar();
      if (!hasHidden(el['calendar-detail-modal'])) {
        openCalendarDetailModal(state.selectedDate);
      }
    } catch (e) {
      console.error(e);
      alert('계획 삭제 실패');
    }
  }

  function openWorkModal(id = null) {
    state.editingWorkId = id ? Number(id) : null;
    const item = state.works.find(w => String(w.id) === String(id));
    const memo = item ? parseMemo(item.memo) : emptyMemo();

    if (el['work-modal-title']) {
      el['work-modal-title'].textContent = item ? '작업 수정' : '새 작업 입력';
    }

    if (item) {
      el['start_date'].value = item.start_date || '';
      el['repeat_days'].value = countInclusiveDays(item.start_date, item.end_date);
      updateEndDateFromRepeatDays();
      el['start_time'].value = memo.start_time || '';
      el['end_time'].value = memo.end_time || '';
      el['weather'].value = item.weather || '';
      el['task_name'].value = item.task_name || '';
      setCheckedValues('crops-box', splitCsv(item.crops));
      setCheckedValues('pests-box', splitCsv(item.pests));
      setCheckedValues('machines-box', splitCsv(item.machines));
      state.selectedMaterialsDetailed = normalizeMaterialRows(memo.materials || []);
      renderSelectedMaterialsDetailed();
      renderLaborRows(memo.labor_rows || []);
      el['work_hours'].value = memo.work_hours || item.work_hours || 0;
      el['memo'].value = memo.memo_text || '';
      const money = memo.money || {};
      el['has_money'].checked = !!money.type || Number(money.total_amount || 0) > 0;
      toggleMoneyBox(el['has_money'].checked);
      el['other_cost'].value = Number(money.other_total || 0);
      el['money_note'].value = money.note || '';
      updateMoneySummary();
    } else {
      el['start_date'].value = state.selectedDate || fmtDate(new Date());
      el['repeat_days'].value = 1;
      updateEndDateFromRepeatDays();
      el['start_time'].value = '';
      el['end_time'].value = '';
      el['weather'].value = '';
      el['task_name'].value = '';
      setCheckedValues('crops-box', []);
      setCheckedValues('pests-box', []);
      setCheckedValues('machines-box', []);
      state.selectedMaterialsDetailed = [];
      renderSelectedMaterialsDetailed();
      renderLaborRows([]);
      el['work_hours'].value = '';
      el['memo'].value = '';
      el['has_money'].checked = false;
      toggleMoneyBox(false);
      el['other_cost'].value = 0;
      el['money_note'].value = '';
      updateMoneySummary();
      if (el['material-search-input']) el['material-search-input'].value = '';
      if (el['material-search-results']) el['material-search-results'].innerHTML = '';
    }

    removeHidden(el['work-modal']);
  }

  function closeWorkModal() {
    addHidden(el['work-modal']);
    state.editingWorkId = null;
  }

  function renderWorkFormOptions() {
    renderSelectOptions(el['weather'], state.options.weather, '날씨 선택');
    renderSelectOptions(el['task_name'], state.options.tasks, '작업내용 선택');
    renderCheckList(el['crops-box'], state.options.crops);
    renderCheckList(el['pests-box'], state.options.pests);
    renderCheckList(el['machines-box'], state.options.machines);
  }

  function renderSelectOptions(selectEl, items, placeholder) {
    if (!selectEl) return;
    const current = selectEl.value || '';
    selectEl.innerHTML = `<option value="">${escapeHtml(placeholder || '선택')}</option>` + items.map(item => {
      const name = optionName(item);
      return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }).join('');
    selectEl.value = current;
  }

  function renderCheckList(container, items) {
    if (!container) return;
    const selected = getCheckedValues(container.id);
    container.innerHTML = items.map(item => {
      const name = optionName(item);
      const active = selected.includes(name);
      return `<button type="button" class="chip ${active ? 'active' : ''}" data-check-value="${escapeHtml(name)}">${escapeHtml(name)}</button>`;
    }).join('');

    container.querySelectorAll('[data-check-value]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
      });
    });
  }

  function getCheckedValues(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll('[data-check-value].active')).map(btn => btn.dataset.checkValue || '');
  }

  function setCheckedValues(containerId, values) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const set = new Set(values || []);
    container.querySelectorAll('[data-check-value]').forEach(btn => {
      btn.classList.toggle('active', set.has(btn.dataset.checkValue || ''));
    });
  }

  function renderSelectedMaterialsDetailed() {
    if (!el['selected-materials-detailed']) return;

    const rows = state.selectedMaterialsDetailed;
    el['selected-materials-detailed'].innerHTML = rows.length ? rows.map((row, idx) => `
      <div class="material-row">
        <strong>${escapeHtml(row.name || '')}</strong>
        <span>${escapeHtml(row.unit || '')}</span>
        <input type="number" min="0" step="0.1" value="${escapeHtml(String(row.qty || 0))}" data-material-qty="${idx}">
        <select data-material-method="${idx}">
          ${['현금', '계좌이체', '카드일시불', '카드할부', '외상'].map(method => `
            <option value="${escapeHtml(method)}" ${row.method === method ? 'selected' : ''}>${escapeHtml(method)}</option>
          `).join('')}
        </select>
        <span>${formatNumber(Number(row.price || 0) * Number(row.qty || 0))}원</span>
        <button type="button" class="btn" data-material-remove="${idx}">삭제</button>
      </div>
    `).join('') : `<div class="empty-msg">선택된 자재가 없습니다.</div>`;

    el['selected-materials-detailed'].querySelectorAll('[data-material-qty]').forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.materialQty);
        if (!state.selectedMaterialsDetailed[idx]) return;
        state.selectedMaterialsDetailed[idx].qty = Number(input.value || 0);
        renderSelectedMaterialsDetailed();
        updateMoneySummary();
      });
    });

    el['selected-materials-detailed'].querySelectorAll('[data-material-method]').forEach(select => {
      select.addEventListener('change', () => {
        const idx = Number(select.dataset.materialMethod);
        if (!state.selectedMaterialsDetailed[idx]) return;
        state.selectedMaterialsDetailed[idx].method = select.value || '현금';
        updateMoneySummary();
      });
    });

    el['selected-materials-detailed'].querySelectorAll('[data-material-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedMaterialsDetailed.splice(Number(btn.dataset.materialRemove), 1);
        renderSelectedMaterialsDetailed();
        updateMoneySummary();
      });
    });
  }

  function renderLaborRows(rows) {
    if (!el['labor-rows-wrap']) return;
    const normalized = rows.length ? rows.map(normalizeLaborRow) : [normalizeLaborRow({})];

    el['labor-rows-wrap'].innerHTML = normalized.map((row, idx) => `
      <div class="labor-row">
        <select data-labor-type="${idx}">
          ${['남자', '여자', '기타'].map(type => `
            <option value="${escapeHtml(type)}" ${row.type === type ? 'selected' : ''}>${escapeHtml(type)}</option>
          `).join('')}
        </select>
        <input type="number" min="0" step="1" value="${escapeHtml(String(row.count || 0))}" data-labor-count="${idx}">
        <input type="number" min="0" step="100" value="${escapeHtml(String(row.price || 0))}" data-labor-price="${idx}">
        <div class="readonly-money">${formatNumber(row.amount || 0)}원</div>
        <input type="text" value="${escapeHtml(row.note || '')}" placeholder="비고" data-labor-note="${idx}">
        <button type="button" class="btn" data-labor-remove="${idx}">삭제</button>
      </div>
    `).join('');

    wireLaborRowEvents();
    updateMoneySummary();
  }

  function wireLaborRowEvents() {
    if (!el['labor-rows-wrap']) return;

    const rebuild = () => {
      const rows = collectLaborRows();
      renderLaborRows(rows);
    };

    el['labor-rows-wrap'].querySelectorAll('[data-labor-type],[data-labor-count],[data-labor-price],[data-labor-note]').forEach(node => {
      const type = node.tagName === 'SELECT' ? 'change' : 'input';
      node.addEventListener(type, rebuild);
    });

    el['labor-rows-wrap'].querySelectorAll('[data-labor-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rows = collectLaborRows();
        rows.splice(Number(btn.dataset.laborRemove), 1);
        renderLaborRows(rows);
      });
    });
  }

  function addLaborRow() {
    const rows = collectLaborRows();
    rows.push(normalizeLaborRow({}));
    renderLaborRows(rows);
  }

  function collectLaborRows() {
    if (!el['labor-rows-wrap']) return [];
    const rows = [];
    const total = el['labor-rows-wrap'].querySelectorAll('.labor-row').length;

    for (let i = 0; i < total; i++) {
      rows.push(normalizeLaborRow({
        type: el['labor-rows-wrap'].querySelector(`[data-labor-type="${i}"]`)?.value || '남자',
        count: Number(el['labor-rows-wrap'].querySelector(`[data-labor-count="${i}"]`)?.value || 0),
        price: Number(el['labor-rows-wrap'].querySelector(`[data-labor-price="${i}"]`)?.value || 0),
        note: el['labor-rows-wrap'].querySelector(`[data-labor-note="${i}"]`)?.value || ''
      }));
    }

    return rows.filter(row => row.count > 0 || row.price > 0 || row.note);
  }

  function normalizeLaborRow(row) {
    const count = Number(row.count || 0);
    const price = Number(row.price || 0);
    return {
      type: row.type || '남자',
      count,
      price,
      amount: count * price,
      method: row.method || '',
      note: row.note || ''
    };
  }

  function updateEndDateFromRepeatDays() {
    if (!el['start_date'] || !el['end_date']) return;
    const start = el['start_date'].value;
    const repeatDays = Math.max(1, Number(el['repeat_days']?.value || 1));
    if (!start) {
      el['end_date'].value = '';
      return;
    }

    const date = new Date(start + 'T00:00:00');
    date.setDate(date.getDate() + repeatDays - 1);
    el['end_date'].value = fmtDate(date);
  }

  function updateWorkHoursFromTime() {
    if (!el['start_time'] || !el['end_time'] || !el['work_hours']) return;
    const start = el['start_time'].value;
    const end = el['end_time'].value;
    if (!start || !end) return;

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    const hours = Math.round((diff / 60) * 10) / 10;
    el['work_hours'].value = hours;
  }

  function toggleMoneyBox(show) {
    if (!el['money-box']) return;
    el['money-box'].classList.toggle('hidden', !show);
  }

  function updateMoneySummary() {
    const laborTotal = collectLaborRows().reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const materialTotal = state.selectedMaterialsDetailed.reduce((sum, row) => sum + (Number(row.price || 0) * Number(row.qty || 0)), 0);
    const otherTotal = Number(el['other_cost']?.value || 0);
    const total = laborTotal + materialTotal + otherTotal;

    if (el['money_labor_total']) el['money_labor_total'].textContent = `${formatNumber(laborTotal)} 원`;
    if (el['money_material_total']) el['money_material_total'].textContent = `${formatNumber(materialTotal)} 원`;
    if (el['money_total_amount']) el['money_total_amount'].textContent = `${formatNumber(total)} 원`;
  }

  async function saveWork() {
    const laborRows = collectLaborRows();
    const materialRows = normalizeMaterialRows(state.selectedMaterialsDetailed);
    const laborTotal = laborRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const materialTotal = materialRows.reduce((sum, row) => sum + (Number(row.price || 0) * Number(row.qty || 0)), 0);
    const otherTotal = Number(el['other_cost']?.value || 0);
    const totalAmount = laborTotal + materialTotal + otherTotal;
    const hasMoney = !!el['has_money']?.checked;

    const memo = {
      memo_text: (el['memo']?.value || '').trim(),
      repeat_days: Number(el['repeat_days']?.value || 1),
      start_time: el['start_time']?.value || '',
      end_time: el['end_time']?.value || '',
      materials: materialRows,
      labor_rows: laborRows,
      work_hours: Number(el['work_hours']?.value || 0),
      money: hasMoney ? {
        type: buildMoneyType(laborTotal, materialTotal, otherTotal),
        total_amount: totalAmount,
        labor_total: laborTotal,
        material_total: materialTotal,
        other_total: otherTotal,
        method: buildMoneyMethod(laborRows, materialRows),
        note: (el['money_note']?.value || '').trim()
      } : null
    };

    const payload = {
      start_date: el['start_date']?.value || '',
      end_date: el['end_date']?.value || '',
      weather: el['weather']?.value || '',
      task_name: el['task_name']?.value || '',
      crops: getCheckedValues('crops-box').join(','),
      pests: getCheckedValues('pests-box').join(','),
      machines: getCheckedValues('machines-box').join(','),
      work_hours: Number(el['work_hours']?.value || 0),
      memo: JSON.stringify(memo)
    };

    if (!payload.start_date || !payload.task_name) {
      return alert('시작일과 작업내용을 입력하세요.');
    }

    try {
      if (state.editingWorkId) {
        await apiPut(`/api/works/${state.editingWorkId}`, payload);
      } else {
        await apiPost('/api/works', payload);
      }

      await loadWorks();
      await loadMoney();
      renderWorks();
      renderCalendar();
      renderMoney();
      closeWorkModal();
      if (!hasHidden(el['calendar-detail-modal']) && state.selectedDate) {
        openCalendarDetailModal(state.selectedDate);
      }
    } catch (e) {
      console.error(e);
      alert('작업 저장 실패');
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
      renderMoney();
      if (!hasHidden(el['calendar-detail-modal']) && state.selectedDate) {
        openCalendarDetailModal(state.selectedDate);
      }
    } catch (e) {
      console.error(e);
      alert('작업 삭제 실패');
    }
  }

  function ensureWorksSearchBar() {
    const page = el['page-works'];
    if (!page || page.querySelector('.works-search-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'works-search-wrap';
    wrap.style.marginBottom = '12px';
    wrap.innerHTML = `
      <input type="text" id="works-search-input" placeholder="검색어 입력 (작업내용, 작물, 병충해, 메모)"
             style="padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; width:min(560px,100%);">
    `;

    const header = page.querySelector('.page-header');
    if (header && header.nextSibling) {
      page.insertBefore(wrap, header.nextSibling);
    } else {
      page.appendChild(wrap);
    }

    const input = wrap.querySelector('#works-search-input');
    input.value = state.workSearchKeyword || '';
    input.addEventListener('input', () => {
      state.workSearchKeyword = input.value || '';
      renderWorks();
    });
  }

  function renderWorks() {
    if (!el['works-list']) return;

    const keyword = (state.workSearchKeyword || '').trim();
    const filtered = !keyword ? state.works.slice() : state.works.filter(item => {
      const memo = parseMemo(item.memo);
      const haystack = [
        item.start_date, item.end_date, item.weather, item.task_name,
        item.crops, item.pests, item.machines, memo.memo_text,
        (memo.materials || []).map(m => m.name).join(','),
        (memo.labor_rows || []).map(r => r.note).join(',')
      ].join(' ');
      return haystack.includes(keyword);
    });

    const groups = groupByDate(filtered);
    const dates = Object.keys(groups).sort((a, b) => a < b ? 1 : -1);

    el['works-list'].innerHTML = dates.length ? dates.map(date => {
      const items = groups[date];
      return `
        <div class="work-date-group">
          <div class="work-date-title">${escapeHtml(date)}</div>
          <div class="work-date-row ${items.length === 1 ? 'single-card' : ''}">
            ${items.map(renderWorkCard).join('')}
          </div>
        </div>
      `;
    }).join('') : `<div class="empty-msg">등록된 작업이 없습니다.</div>`;

    el['works-list'].querySelectorAll('[data-work-edit]').forEach(btn => {
      btn.addEventListener('click', () => openWorkModal(btn.dataset.workEdit));
    });

    el['works-list'].querySelectorAll('[data-work-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
    });
  }

  function renderWorkCard(item) {
    const memo = parseMemo(item.memo);
    const materialsText = (memo.materials || []).map(m => `${m.name} ${formatNumber(m.qty)}${m.unit || ''}`).join(', ');
    const laborRows = memo.labor_rows || [];
    const money = memo.money || {};

    return `
      <div class="work-card">
        <div class="work-card-title">${escapeHtml(item.task_name || '')}</div>
        <div><strong>기간</strong> ${escapeHtml(item.start_date || '')} ~ ${escapeHtml(item.end_date || '')}</div>
        <div><strong>날씨</strong> ${escapeHtml(item.weather || '')}</div>
        <div><strong>작물</strong> ${escapeHtml(item.crops || '')}</div>
        <div><strong>병충해</strong> ${escapeHtml(item.pests || '')}</div>
        <div><strong>사용기계</strong> ${escapeHtml(item.machines || '')}</div>
        <div><strong>사용자재</strong> ${escapeHtml(materialsText)}</div>
        <div><strong>인력</strong> ${escapeHtml(laborRows.map(r => `${r.type} ${r.count}명`).join(', '))}</div>
        <div><strong>작업시간</strong> ${escapeHtml(String(memo.work_hours || item.work_hours || ''))}</div>
        <div><strong>메모</strong> ${escapeHtml(memo.memo_text || '')}</div>
        ${money && money.type ? `<div><strong>비용</strong> ${escapeHtml(money.type || '')} / ${formatNumber(money.total_amount || 0)}원</div>` : ''}
        <div class="item-actions">
          <button class="btn" data-work-edit="${escapeHtml(String(item.id))}">수정</button>
          <button class="btn" data-work-delete="${escapeHtml(String(item.id))}">삭제</button>
        </div>
      </div>
    `;
  }

  function renderMaterials() {
    if (!el['materials-list']) return;

    const q = (state.materialListSearchKeyword || '').trim();
    const filtered = !q
      ? state.materials.slice()
      : state.materials.filter(m => String(m.name || '').includes(q) || String(m.memo || '').includes(q) || String(m.unit || '').includes(q));

    const hasStock = filtered.filter(m => Number(m.stock_qty || 0) > 0);
    const noStock = filtered.filter(m => Number(m.stock_qty || 0) <= 0);

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
    const item = state.materials.find(m => String(m.id) === String(id));

    if (el['material-modal-title']) {
      el['material-modal-title'].textContent = item ? '자재 수정' : '자재 추가';
    }

    if (item) {
      el['material_name'].value = item.name || '';
      el['material_unit'].value = item.unit || '';
      el['material_stock'].value = item.stock_qty || 0;
      el['material_price'].value = item.unit_price || 0;
      el['material_memo'].value = item.memo || '';
    } else {
      el['material_name'].value = '';
      el['material_unit'].value = '';
      el['material_stock'].value = '';
      el['material_price'].value = '';
      el['material_memo'].value = '';
      if (el['material-search-keyword']) el['material-search-keyword'].value = '';
      if (el['material-search-box']) el['material-search-box'].innerHTML = '';
    }

    removeHidden(el['material-modal']);
  }

  function closeMaterialModal() {
    addHidden(el['material-modal']);
    state.editingMaterialId = null;
  }

  async function saveMaterial() {
    const payload = {
      name: (el['material_name']?.value || '').trim(),
      unit: el['material_unit']?.value || '',
      stock_qty: Number(el['material_stock']?.value || 0),
      unit_price: Number(el['material_price']?.value || 0),
      memo: (el['material_memo']?.value || '').trim()
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

  function renderMaterialSearchResults(keyword) {
    if (!el['material-search-results']) return;

    const q = String(keyword || '').trim();
    const matched = !q
      ? state.materials.slice(0, 20)
      : state.materials.filter(item => (item.name || '').includes(q)).slice(0, 20);

    el['material-search-results'].innerHTML = matched.map(item => `
      <button type="button" class="search-result-item" data-material-pick="${escapeHtml(String(item.id))}">
        ${escapeHtml(item.name || '')} / 재고 ${formatNumber(item.stock_qty || 0)} / ${escapeHtml(item.unit || '')}
      </button>
    `).join('');

    el['material-search-results'].querySelectorAll('[data-material-pick]').forEach(btn => {
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

  function renderOptions() {
    renderOptionList('weather', 'options-weather');
    renderOptionList('crops', 'options-crops');
    renderOptionList('tasks', 'options-tasks');
    renderOptionList('pests', 'options-pests');
    renderOptionList('machines', 'options-machines');
    renderSeasonList();

    (el.optionPanels || []).forEach(panel => {
      const active = (panel.dataset.optionPanel || '') === state.optionTab;
      panel.classList.toggle('hidden-by-tab', !active);
    });

    (el.optionTabButtons || []).forEach(btn => {
      btn.classList.toggle('active', (btn.dataset.optionTab || '') === state.optionTab);
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

  function renderSeasonList() {
    const node = el['season-list'];
    if (!node) return;

    const items = state.seasons || [];
    node.innerHTML = items.length ? items.map(item => `
      <div class="season-card ${Number(item.is_current || 0) ? 'current' : ''}">
        <div class="season-card-title">${escapeHtml(item.season_name || '')}${Number(item.is_current || 0) ? ' (현재)' : ''}</div>
        <div class="season-card-meta">기간: ${escapeHtml(item.start_date || '')} ~ ${escapeHtml(item.end_date || '')}<br>비고: ${escapeHtml(item.note || '')}</div>
        <div class="item-actions">
          <button class="btn" data-season-edit="${escapeHtml(String(item.id))}">수정</button>
          <button class="btn" data-season-current="${escapeHtml(String(item.id))}">현재로 설정</button>
          <button class="btn" data-season-delete="${escapeHtml(String(item.id))}">삭제</button>
        </div>
      </div>
    `).join('') : `<div class="empty-msg">등록된 시즌이 없습니다.</div>`;

    node.querySelectorAll('[data-season-edit]').forEach(btn => {
      btn.addEventListener('click', () => fillSeasonForm(btn.dataset.seasonEdit));
    });
    node.querySelectorAll('[data-season-current]').forEach(btn => {
      btn.addEventListener('click', () => setCurrentSeason(btn.dataset.seasonCurrent));
    });
    node.querySelectorAll('[data-season-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteSeason(btn.dataset.seasonDelete));
    });
  }

  function resetSeasonForm() {
    state.editingSeasonId = null;
    if (el['season_name']) el['season_name'].value = '';
    if (el['season_start_date']) el['season_start_date'].value = '';
    if (el['season_end_date']) el['season_end_date'].value = '';
    if (el['season_note']) el['season_note'].value = '';
    if (el['season_is_current']) el['season_is_current'].value = '0';
  }

  function fillSeasonForm(id) {
    const item = (state.seasons || []).find(s => String(s.id) === String(id));
    if (!item) return;
    state.editingSeasonId = Number(item.id);
    if (el['season_name']) el['season_name'].value = item.season_name || '';
    if (el['season_start_date']) el['season_start_date'].value = item.start_date || '';
    if (el['season_end_date']) el['season_end_date'].value = item.end_date || '';
    if (el['season_note']) el['season_note'].value = item.note || '';
    if (el['season_is_current']) el['season_is_current'].value = Number(item.is_current || 0) ? '1' : '0';
    state.optionTab = 'seasons';
    renderOptions();
  }

  async function saveSeason() {
    const payload = {
      season_name: (el['season_name']?.value || '').trim(),
      start_date: el['season_start_date']?.value || '',
      end_date: el['season_end_date']?.value || '',
      note: (el['season_note']?.value || '').trim(),
      is_current: (el['season_is_current']?.value || '0') === '1'
    };

    if (!payload.season_name || !payload.start_date || !payload.end_date) {
      return alert('시즌명, 시작일, 종료일을 입력하세요.');
    }

    try {
      if (state.editingSeasonId) {
        await apiPut(`/api/seasons/${state.editingSeasonId}`, payload);
      } else {
        await apiPost('/api/seasons', payload);
      }
      await loadSeasons();
      resetSeasonForm();
      renderOptions();
    } catch (e) {
      console.error(e);
      alert('시즌 저장 실패');
    }
  }

  async function setCurrentSeason(id) {
    try {
      await apiPut(`/api/seasons/${id}/set_current`, {});
      await loadSeasons();
      renderOptions();
    } catch (e) {
      console.error(e);
      alert('현재 시즌 설정 실패');
    }
  }

  async function deleteSeason(id) {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await apiDelete(`/api/seasons/${id}`);
      await loadSeasons();
      if (String(state.editingSeasonId || '') === String(id)) resetSeasonForm();
      renderOptions();
    } catch (e) {
      console.error(e);
      alert('시즌 삭제 실패');
    }
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

  function renderMoney() {
    if (!el['money-list']) return;

    const start = el['money-start']?.value || '';
    const end = el['money-end']?.value || '';
    const typeFilter = el['money-type-filter']?.value || '';
    const methodFilter = el['money-method-filter']?.value || '';

    const rows = state.moneyRows.filter(row => {
      const date = row.date || '';
      if (start && date < start) return false;
      if (end && date > end) return false;
      if (typeFilter && row.type !== typeFilter) return false;
      if (methodFilter && row.method !== methodFilter) return false;
      return true;
    });

    el['money-list'].innerHTML = rows.map(row => `
      <tr>
        <td>${escapeHtml(row.date || '')}</td>
        <td>${escapeHtml(row.task_name || '')}</td>
        <td>${escapeHtml(row.type || '')}</td>
        <td>${formatNumber(row.total || 0)}</td>
        <td>${escapeHtml(row.method || '')}</td>
        <td>${escapeHtml(row.note || '')}</td>
      </tr>
    `).join('');

    const total = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
    const cash = rows.filter(row => ['현금', '계좌이체'].includes(row.method)).reduce((sum, row) => sum + Number(row.total || 0), 0);
    const card = rows.filter(row => ['카드일시불', '카드할부', '외상'].includes(row.method)).reduce((sum, row) => sum + Number(row.total || 0), 0);

    if (el['money-total']) el['money-total'].textContent = formatNumber(total);
    if (el['money-cash']) el['money-cash'].textContent = formatNumber(cash);
    if (el['money-card']) el['money-card'].textContent = formatNumber(card);
  }

  function parseMemo(raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
      return {
        memo_text: parsed.memo_text || '',
        repeat_days: Number(parsed.repeat_days || 1),
        start_time: parsed.start_time || '',
        end_time: parsed.end_time || '',
        materials: normalizeMaterialRows(parsed.materials || []),
        labor_rows: (parsed.labor_rows || []).map(normalizeLaborRow),
        work_hours: Number(parsed.work_hours || 0),
        money: parsed.money || null
      };
    } catch (e) {
      return emptyMemo(raw);
    }
  }

  function emptyMemo(text = '') {
    return {
      memo_text: typeof text === 'string' ? text : '',
      repeat_days: 1,
      start_time: '',
      end_time: '',
      materials: [],
      labor_rows: [],
      work_hours: 0,
      money: null
    };
  }

  function normalizeMaterialRows(rows) {
    return (rows || []).map(item => ({
      id: item.id || '',
      name: item.name || '',
      unit: item.unit || '',
      price: Number(item.price || item.unit_price || 0),
      qty: Number(item.qty || 0),
      method: item.method || '현금'
    })).filter(item => item.name);
  }

  function buildMoneyType(laborTotal, materialTotal, otherTotal) {
    const hasLabor = laborTotal > 0;
    const hasMaterial = materialTotal > 0;
    const hasOther = otherTotal > 0;

    if (hasLabor && hasMaterial && !hasOther) return '인건비+자재비';
    if (hasLabor && !hasMaterial && !hasOther) return '인건비';
    if (!hasLabor && hasMaterial && !hasOther) return '자재비';
    return '기타';
  }

  function buildMoneyMethod(laborRows, materialRows) {
    const methods = []
      .concat((laborRows || []).map(r => r.method).filter(Boolean))
      .concat((materialRows || []).map(r => r.method).filter(Boolean));

    if (!methods.length) return '';
    return methods[0];
  }

  function groupByDate(rows) {
    return rows.reduce((acc, item) => {
      const key = item.start_date || '';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  function countInclusiveDays(start, end) {
    if (!start || !end) return 1;
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  }

  function splitCsv(text) {
    return String(text || '').split(',').map(v => v.trim()).filter(Boolean);
  }

  function normalizePlanDate(value) {
    return String(value || '').slice(0, 10);
  }

  function isDateInRange(dateStr, start, end) {
    return dateStr >= String(start || '') && dateStr <= String(end || start || '');
  }

  function normalizeOptions(items) {
    return (items || []).map(item => {
      if (typeof item === 'string') return { id: item, name: item };
      return item;
    });
  }

  function optionName(item) {
    return typeof item === 'string' ? item : (item?.name || '');
  }

  function optionId(item) {
    return typeof item === 'string' ? item : (item?.id ?? item?.name ?? '');
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

  function hasHidden(node) {
    return !node || node.classList.contains('hidden');
  }

  function addHidden(node) {
    if (node) node.classList.add('hidden');
  }

  function removeHidden(node) {
    if (node) node.classList.remove('hidden');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function on(node, eventName, handler) {
    if (node) node.addEventListener(eventName, handler);
  }

  async function apiGet(url) {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function apiPost(url, payload) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload || {})
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function apiPut(url, payload) {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload || {})
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async function apiDelete(url) {
    const res = await fetch(url, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
})();
