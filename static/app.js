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
    incomeRows: [],
    options: {
      weather: [],
      crops: [],
      task_categories: [],
      tasks: [],
      pests: [],
      machines: []
    },
    workSearchKeyword: '',
    workFilterStartDate: '',
    workFilterEndDate: '',
    workFilterTaskCategory: '',
    workFilterTaskName: '',
    workFilterCrop: '',
    selectedMaterialsDetailed: [],
    materialUnits: ['개', '병', '통', '봉', '포', 'kg', 'L', 'ml', '말', 'M'],
    mobileCalendarMode: 'current',
    materialListSearchKeyword: '',
    materialFilterTab: 'all',
    optionTab: 'weather',
    seasons: [],
    editingSeasonId: null,
    editingTaskOptionId: null,
    editingIncomeId: null,
    seasonPanelCollapsed: true,
    recentQuickVisible: false
  };

  const el = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheElements();
    bindMenu();
    bindQuickExitButton();
    bindScrollJumpButtons();
    bindCalendarButtons();
    bindMobileCalendarButtons();
    bindWorkButtons();
    bindMaterialButtons();
    bindIncomeButtons();
    bindOptionButtons();
    bindExcelButtons();
    bindCalendarDetailModal();

    bindHistoryNavigation();

    await loadAll();
    await loadMoney();
    renderAll();
    updateMobileCalendarMode();
    initializeHistoryState();

    window.addEventListener('resize', () => {
      updateMobileCalendarMode();
      stabilizeWorksFloatingButton();
      updateScrollJumpButtons();
    });

    window.addEventListener('scroll', updateScrollJumpButtons, { passive: true });

    stabilizeWorksFloatingButton();
    updateScrollJumpButtons();
  }

  function cacheElements() {
    const ids = [
      'page-calendar','page-works','page-materials','page-money','page-options','page-excel','page-backup',
      'btn-prev-month','btn-next-month','btn-mobile-current','btn-mobile-previous','btn-mobile-quick-exit','btn-scroll-top','btn-scroll-bottom',
      'calendar-title','calendar-current-title','calendar-grid',
      'calendar-compare-title','calendar-compare-grid','calendar-compare-wrap',

      'btn-open-work-from-calendar','btn-open-plan-form',

      'plan-modal','plan-modal-title','btn-close-plan-modal',
      'plan_date','plan_title','plan_details','plan_status',
      'plan-search','plan-search-results',

      'btn-save-plan','btn-cancel-plan',

      'calendar-detail-modal','calendar-detail-title','calendar-detail-body',
      'btn-close-calendar-detail','btn-calendar-add-plan','btn-calendar-add-work',

      'work-modal','work-modal-title','btn-close-work-modal','btn-load-recent-work','favorite-work-select','btn-load-favorite-work','btn-save-favorite-work','btn-delete-favorite-work','favorite-work-status',
      'btn-new-work',

      'start_date','repeat_days','end_date','start_time','end_time',
      'weather','task_category','task_name','crops-box','pests-box','pests-field','machines-box',

      'labor_cost','work_hours','memo',
      'btn-save-work','btn-cancel-work','works-list',

      'material_name','material_unit','material_stock','material_price','material_price_last_year','material_price_this_year','material_memo',
      'btn-save-material','btn-open-material-modal','btn-close-material-modal','btn-cancel-material',
      'material-modal','material-modal-title','material-search-box','material-search-keyword','materials-list',

      'new-weather','new-crops','new-task-categories','new-task-category','new-tasks','new-pests','new-pests-recommend','new-machines',
      'options-weather','options-crops','options-task-categories','options-tasks','options-pests','options-machines',

      'material-search-input','material-search-results','default-material-method','btn-apply-material-method','selected-materials-detailed',
      'task-name-search','btn-clear-task-name','task-name-datalist','recent-task-picks','task-name-options','task-recommend-wrap','task-recommend-box','task-material-recommend-wrap','task-material-recommend-box','pest-search-input','recent-material-picks',

      'recommended-materials-wrap','recommended-materials-box','material-list-search',

      'season-panel','season-panel-header','btn-toggle-season-panel','season-panel-toggle-text','season-panel-summary','season-panel-body',
      'season_name','season_start_date','season_end_date','season_note','season_is_current',
      'btn-save-season','btn-reset-season','season-list',

      'labor-rows-wrap','btn-add-labor-row',

      'has_money','money-box','money_method','money_installment_wrap','money_installment_months','money_note','other_cost',
      'money_labor_total','money_material_total','money_total_amount',

      'money-start','money-end','money-period-filter','money-season-filter','money-type-filter','money-method-filter','money-keyword-filter',
      'btn-money-filter','money-list','money-total','money-income-total','money-net-profit','money-cash','money-transfer','money-card-lump','money-card-install','money-credit','money-credit-list','money-scope-label','money-scope-month-count','money-scope-row-count','money-monthly-list','money-monthly-empty','btn-open-income-modal','income-modal','income-modal-title','btn-close-income-modal','btn-cancel-income','btn-save-income','income_date','income_type','income_amount','income_method','income_note',
      'task-option-modal','task-option-modal-title','btn-close-task-option-modal','btn-cancel-task-option','btn-save-task-option','edit-task-category','edit-task-name','btn-download-excel-all','btn-download-excel-current-season'
    ];

    ids.forEach(id => {
      el[id] = document.getElementById(id);
    });

    el.menuButtons = Array.from(document.querySelectorAll('.menu-btn[data-page]'));
    el.optionTabButtons = Array.from(document.querySelectorAll('.option-tab-btn[data-option-tab]'));
    el.materialTabButtons = Array.from(document.querySelectorAll('.material-tab-btn[data-material-tab]'));
    el.optionPanels = Array.from(document.querySelectorAll('.option-panel[data-option-panel]'));
  }

  function bindMenu() {
    el.menuButtons.forEach(btn => {
      btn.addEventListener('click', () => switchPage(btn.dataset.page));
    });
  }


  function bindQuickExitButton() {
    on(el['btn-mobile-quick-exit'], 'click', handleQuickExit);
  }

  function handleQuickExit() {
    closeAllModals();
    switchPage('calendar', { skipHistory: true });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function bindScrollJumpButtons() {
    on(el['btn-scroll-top'], 'click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    on(el['btn-scroll-bottom'], 'click', () => {
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo({ top: maxY, behavior: 'smooth' });
    });
  }

  function updateScrollJumpButtons() {
    const topBtn = el['btn-scroll-top'];
    const bottomBtn = el['btn-scroll-bottom'];
    if (!topBtn || !bottomBtn) return;

    const isWorksPage = state.currentPage === 'works';
    const top = window.scrollY || document.documentElement.scrollTop || 0;
    const doc = document.documentElement;
    const maxY = Math.max(0, doc.scrollHeight - window.innerHeight);
    const showTop = isWorksPage && top > 160;
    const showBottom = isWorksPage && maxY > 160 && top < (maxY - 120);

    topBtn.classList.toggle('hidden', !showTop);
    bottomBtn.classList.toggle('hidden', !showBottom);
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
    on(el['btn-load-recent-work'], 'click', loadRecentWorkIntoForm);
    on(el['btn-save-favorite-work'], 'click', saveCurrentWorkAsFavorite);
    on(el['btn-load-favorite-work'], 'click', loadFavoriteWorkIntoForm);
    on(el['btn-delete-favorite-work'], 'click', deleteFavoriteWork);
    on(el['favorite-work-select'], 'change', syncFavoriteWorkButtons);
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
    on(el['task-name-search'], 'input', (e) => {
      syncTaskNameSearchToSelect(e.target.value || '');
    });
    on(el['task-name-search'], 'change', (e) => {
      syncTaskNameSearchToSelect(e.target.value || '');
    });
    on(el['btn-clear-task-name'], 'click', () => {
      clearTaskSelection();
    });
    on(el['pest-search-input'], 'input', (e) => {
      filterChipOptions('pests', e.target.value || '');
    });
    on(el['btn-apply-material-method'], 'click', applyDefaultMaterialMethodToAll);

    on(el['btn-add-labor-row'], 'click', () => addLaborRow());

    on(el['start_date'], 'change', updateEndDateFromRepeatDays);
    on(el['repeat_days'], 'input', updateEndDateFromRepeatDays);

    on(el['task_category'], 'change', () => {
      clearTaskSelection(false);
      renderTaskOptionsByCategory(el['task_category']?.value || '');
      updatePestSectionVisibility(true);
    });
    on(el['start_time'], 'change', () => syncWorkTimeFields('time'));
    on(el['end_time'], 'change', () => syncWorkTimeFields('time'));
    on(el['work_hours'], 'input', () => syncWorkTimeFields('hours'));
    on(el['work_hours'], 'change', () => syncWorkTimeFields('hours'));

    on(el['has_money'], 'change', () => {
      toggleMoneyBox(el['has_money'].checked);
      updateMoneySummary();
    });

    on(el['money_method'], 'change', () => {
        updateMoneySummary();
    });
    on(el['money_installment_months'], 'input', updateMoneySummary);
    on(el['other_cost'], 'input', updateMoneySummary);

    on(el['money-period-filter'], 'change', () => {
      applyMoneyQuickPeriod();
      renderMoney();
    });
    on(el['money-start'], 'change', () => {
      syncMoneyQuickPeriodFromDates();
      renderMoney();
    });
    on(el['money-end'], 'change', () => {
      syncMoneyQuickPeriodFromDates();
      renderMoney();
    });
    on(el['money-type-filter'], 'change', renderMoney);
    on(el['money-method-filter'], 'change', renderMoney);
    on(el['money-keyword-filter'], 'input', renderMoney);
    on(el['btn-money-filter'], 'click', async () => {
      syncMoneyQuickPeriodFromDates();
      await loadMoney();
      renderMoney();
    });
  }


  function bindIncomeButtons() {
    on(el['btn-open-income-modal'], 'click', openIncomeModal);
    on(el['btn-close-income-modal'], 'click', closeIncomeModal);
    on(el['btn-cancel-income'], 'click', closeIncomeModal);
    on(el['btn-save-income'], 'click', saveIncome);
  }

  function openIncomeModal(income = null) {
    state.editingIncomeId = income && income.id ? income.id : null;
    if (el['income-modal-title']) {
      el['income-modal-title'].textContent = state.editingIncomeId ? '수익 수정' : '수익 입력';
    }
    if (el['income_date']) el['income_date'].value = income?.income_date || fmtDate(new Date());
    if (el['income_type']) el['income_type'].value = income?.income_type || '판매수익';
    if (el['income_amount']) el['income_amount'].value = income?.amount || '';
    if (el['income_method']) el['income_method'].value = income?.method || '현금';
    if (el['income_note']) el['income_note'].value = income?.note || '';
    removeHidden(el['income-modal']);
  }

  function closeIncomeModal() {
    state.editingIncomeId = null;
    if (el['income-modal-title']) {
      el['income-modal-title'].textContent = '수익 입력';
    }
    addHidden(el['income-modal']);
  }

  async function saveIncome() {
    const payload = {
      income_date: (el['income_date']?.value || '').trim(),
      income_type: (el['income_type']?.value || '').trim(),
      amount: Number(el['income_amount']?.value || 0),
      method: (el['income_method']?.value || '').trim(),
      note: (el['income_note']?.value || '').trim()
    };

    if (!payload.income_date) {
      alert('수익 날짜를 입력하세요.');
      return;
    }
    if (!payload.income_type) {
      alert('수익 구분을 선택하세요.');
      return;
    }
    if (!(payload.amount > 0)) {
      alert('수익 금액을 입력하세요.');
      return;
    }

    try {
      if (state.editingIncomeId) {
        await apiPut(`/api/incomes/${state.editingIncomeId}`, payload);
      } else {
        await apiPost('/api/incomes', payload);
      }
      await loadMoney();
      renderMoney();
      closeIncomeModal();
      alert(state.editingIncomeId ? '수익을 수정했습니다.' : '수익을 저장했습니다.');
    } catch (e) {
      console.error(e);
      alert(`수익 저장 실패: ${e.message || e}`);
    }
  }

  async function editIncomeById(incomeId) {
    const row = (state.incomeRows || []).find(item => String(item.id) === String(incomeId));
    if (!row) {
      alert('수익 내역을 찾지 못했습니다.');
      return;
    }
    openIncomeModal(row);
  }

  async function deleteIncomeById(incomeId) {
    const row = (state.incomeRows || []).find(item => String(item.id) === String(incomeId));
    if (!row) {
      alert('수익 내역을 찾지 못했습니다.');
      return;
    }
    if (!confirm('이 수익 내역을 삭제할까요?')) return;

    try {
      await apiDelete(`/api/incomes/${incomeId}`);
      await loadMoney();
      renderMoney();
      alert('수익을 삭제했습니다.');
    } catch (e) {
      console.error(e);
      alert(`수익 삭제 실패: ${e.message || e}`);
    }
  }

  function bindIncomeRowActions() {
    document.querySelectorAll('[data-income-edit]').forEach(btn => {
      btn.addEventListener('click', () => editIncomeById(btn.dataset.incomeEdit));
    });
    document.querySelectorAll('[data-income-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteIncomeById(btn.dataset.incomeDelete));
    });
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

    (el.materialTabButtons || []).forEach(btn => {
      btn.addEventListener('click', () => {
        state.materialFilterTab = btn.dataset.materialTab || 'all';
        renderMaterials();
      });
    });
  }


  function bindExcelButtons() {
    on(el['btn-download-excel-all'], 'click', () => {
      window.location.href = '/api/export_excel';
    });
    on(el['btn-download-excel-current-season'], 'click', async () => {
      try {
        const current = await apiGet('/api/seasons/current');
        if (current && current.id) {
          window.location.href = `/api/export_excel?season_id=${encodeURIComponent(current.id)}`;
        } else {
          alert('현재시즌이 설정되어 있지 않아 전체 엑셀로 내려받습니다.');
          window.location.href = '/api/export_excel';
        }
      } catch (e) {
        console.error(e);
        alert('현재시즌 확인 중 오류가 발생했습니다. 전체 엑셀로 내려받습니다.');
        window.location.href = '/api/export_excel';
      }
    });
  }

  function bindOptionButtons() {
    (el.optionTabButtons || []).forEach(btn => {
      btn.addEventListener('click', () => {
        state.optionTab = btn.dataset.optionTab || 'weather';
        renderOptions();
      });
    });

    on(el['btn-toggle-season-panel'], 'click', (e) => {
      e.preventDefault();
      toggleSeasonPanel();
    });
    on(el['season-panel-header'], 'click', (e) => {
      const isToggleButton = e.target && e.target.closest && e.target.closest('#btn-toggle-season-panel');
      if (isToggleButton) return;
      toggleSeasonPanel();
    });
    on(el['season-panel-header'], 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleSeasonPanel();
      }
    });

    on(el['btn-save-season'], 'click', saveSeason);
    on(el['btn-reset-season'], 'click', resetSeasonForm);
    on(el['btn-close-task-option-modal'], 'click', closeTaskOptionModal);
    on(el['btn-cancel-task-option'], 'click', closeTaskOptionModal);
    on(el['btn-save-task-option'], 'click', saveTaskOptionEdit);
    on(el['new-task-category'], 'change', () => renderTaskOptionList());
    on(el['money-season-filter'], 'change', async () => { await loadMoney(); renderMoney(); });
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
      const seasonId = el['money-season-filter']?.value || '';
      const url = seasonId ? `/api/money?season_id=${encodeURIComponent(seasonId)}` : '/api/money';
      const incomeUrl = seasonId ? `/api/incomes?season_id=${encodeURIComponent(seasonId)}` : '/api/incomes';
      const [moneyRows, incomeRows] = await Promise.all([
        apiGet(url),
        apiGet(incomeUrl).catch(() => [])
      ]);
      state.moneyRows = Array.isArray(moneyRows) ? moneyRows : [];
      state.incomeRows = Array.isArray(incomeRows) ? incomeRows : [];
    } catch (e) {
      console.error(e);
      state.moneyRows = [];
      state.incomeRows = [];
    }
  }



  function isBlockingModalOpen() {
    const modalIds = [
      'work-modal',
      'plan-modal',
      'calendar-detail-modal',
      'material-modal',
      'task-option-modal',
      'income-modal'
    ];

    return modalIds.some(id => {
      const node = el[id];
      return !!node && !node.classList.contains('hidden');
    });
  }

  function stabilizeWorksFloatingButton() {
    const wrap = document.querySelector('#page-works .works-floating-action');
    const btn = el['btn-new-work'];
    if (!wrap || !btn) return;

    const isMobile = window.innerWidth <= 900;
    wrap.style.position = 'fixed';
    wrap.style.zIndex = '9999';
    wrap.style.bottom = isMobile ? '74px' : '18px';
    wrap.style.right = isMobile ? '14px' : '20px';
    wrap.style.left = isMobile ? 'auto' : '278px';
    wrap.style.display = state.currentPage === 'works' && !isBlockingModalOpen() ? 'flex' : 'none';
    wrap.style.justifyContent = 'flex-end';
    wrap.style.pointerEvents = 'none';
    btn.style.pointerEvents = 'auto';
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
    updateScrollJumpButtons();
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

    stabilizeWorksFloatingButton();
    updateScrollJumpButtons();

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
              <button class="btn${(plan.status || '') === 'done' ? ' done' : ''}" ${(plan.status || '') === 'done' ? 'disabled' : ''} data-plan-done="${escapeHtml(String(plan.id))}">${(plan.status || '') === 'done' ? '완료됨' : '완료'}</button>
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
      btn.addEventListener('click', () => {
        closeCalendarDetailModal();
        openPlanModalById(btn.dataset.planEdit);
      });
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

    if ((plan.status || '') === 'done') {
      alert('이미 완료된 계획입니다.');
      return;
    }

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
      alert('계획을 완료 처리했습니다.');
    } catch (e) {
      console.error(e);
      alert(`상태 변경 실패: ${e.message || e}`);
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
    renderFavoriteWorkSelect();
    syncFavoriteWorkButtons();
    renderRecentQuickPicks();
    updatePestSectionVisibility(false);
    clearTaskSelection(false);

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
    renderFavoriteWorkSelect();
    syncFavoriteWorkButtons();
    renderRecentQuickPicks();
    updatePestSectionVisibility(false);
    syncTaskNameDatalist(el.task_category?.value || '');
    removeHidden(el['work-modal']);
    if (!options.skipHistory) {
      pushHistoryState(state.currentPage, 'work');
    }
  }

  function loadRecentWorkIntoForm() {
    const sorted = [...(state.works || [])]
      .filter(work => !state.editingWorkId || String(work.id) !== String(state.editingWorkId))
      .sort((a, b) => String(b.start_date || '').localeCompare(String(a.start_date || '')));
    const recent = sorted[0];
    if (!recent) {
      alert('불러올 최근 작업이 없습니다.');
      return;
    }

    const currentStartDate = el.start_date?.value || fmtDate(new Date());
    const currentRepeatDays = Number(el.repeat_days?.value || 1);

    fillWorkForm(recent);

    if (el.start_date) el.start_date.value = currentStartDate;
    if (el.repeat_days) el.repeat_days.value = currentRepeatDays || 1;
    updateEndDateFromRepeatDays();

    state.editingWorkId = null;
    if (el['work-modal-title']) el['work-modal-title'].textContent = '작업 입력';
    state.recentQuickVisible = true;
    renderRecentQuickPicks();
  }


  function getFavoriteWorkStorageKey() {
    return 'worklog_favorite_works_v1';
  }

  function getFavoriteWorks() {
    try {
      const raw = localStorage.getItem(getFavoriteWorkStorageKey()) || '[]';
      const rows = JSON.parse(raw);
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }


  function setFavoriteWorks(rows) {
    try {
      localStorage.setItem(getFavoriteWorkStorageKey(), JSON.stringify(rows || []));
      return true;
    } catch (e) {
      console.error(e);
      showFavoriteWorkStatus('즐겨찾기 저장에 실패했습니다. 브라우저 저장공간을 확인하세요.');
      return false;
    }
  }

  function showFavoriteWorkStatus(message) {
    if (el['favorite-work-status']) {
      el['favorite-work-status'].textContent = message || '';
    }
  }

  function renderFavoriteWorkSelect(selectedId = '') {
    const select = el['favorite-work-select'];
    if (!select) return;

    const items = getFavoriteWorks();
    const current = selectedId || select.value || '';
    select.innerHTML = ['<option value="">즐겨찾기 선택</option>']
      .concat(items.map(item => `<option value="${escapeHtml(String(item.id || ''))}">${escapeHtml(item.name || '이름없음')}</option>`))
      .join('');

    if (current && items.some(item => String(item.id) === String(current))) {
      select.value = String(current);
    } else {
      select.value = '';
    }
    showFavoriteWorkStatus(items.length ? `저장된 즐겨찾기 ${items.length}개` : '저장된 즐겨찾기 없음');
    syncFavoriteWorkButtons();
  }

  function syncFavoriteWorkButtons() {
    const hasSelection = !!(el['favorite-work-select']?.value || '');
    if (el['btn-load-favorite-work']) el['btn-load-favorite-work'].disabled = !hasSelection;
    if (el['btn-delete-favorite-work']) el['btn-delete-favorite-work'].disabled = !hasSelection;
  }

  function buildWorkTemplateFromForm() {
    const startTime = String(el.start_time?.value || '').trim();
    const endTime = String(el.end_time?.value || '').trim();
    const workHoursInput = Number(el.work_hours?.value || 0);
    const normalizedWorkHours = Number.isFinite(workHoursInput) ? workHoursInput : 0;

    return {
      weather: el.weather?.value || '',
      task_category: el.task_category?.value || '',
      task_name: el.task_name?.value || '',
      crops: getSelectedChips('crops'),
      pests: getSelectedChips('pests'),
      machines: getSelectedChips('machines'),
      work_hours: normalizedWorkHours,
      memo_text: el.memo?.value || '',
      start_time: startTime,
      end_time: endTime,
      materials: JSON.parse(JSON.stringify(state.selectedMaterialsDetailed || [])),
      labor_rows: JSON.parse(JSON.stringify(getLaborRows() || [])),
      money: {
        enabled: !!el.has_money?.checked,
        note: el.money_note?.value || '',
        other_total: Number(el.other_cost?.value || 0),
        method: String(el.money_method?.value || '').trim(),
        installment_months: Number(el.money_installment_months?.value || 0)
      }
    };
  }

  function applyWorkTemplateToForm(template) {
    if (!template) return;

    const currentStartDate = el.start_date?.value || fmtDate(new Date());
    const currentRepeatDays = Number(el.repeat_days?.value || 1);

    if (el.weather) el.weather.value = template.weather || '';
    if (el.task_category) el.task_category.value = template.task_category || '';
    renderTaskOptionsByCategory(template.task_category || '');
    if (el.task_name) el.task_name.value = template.task_name || '';
    if (el['task-name-search']) el['task-name-search'].value = template.task_name || '';
    renderTaskQuickOptions(template.task_category || '', template.task_name || '');
    if (el.work_hours) el.work_hours.value = template.work_hours || 0;
    if (el.memo) el.memo.value = template.memo_text || '';
    if (el.start_time) el.start_time.value = template.start_time || '';
    if (el.end_time) el.end_time.value = template.end_time || '';

    setChipSelections('crops', template.crops || []);
    setChipSelections('pests', template.pests || []);
    setChipSelections('machines', template.machines || []);
    updatePestSectionVisibility(false);
    updatePestSectionVisibility(false);
    renderRecommendedMaterials();

    state.selectedMaterialsDetailed = Array.isArray(template.materials)
      ? JSON.parse(JSON.stringify(template.materials))
      : [];
    renderSelectedMaterialsDetailed();

    resetLaborRows();
    if (Array.isArray(template.labor_rows) && template.labor_rows.length) {
      template.labor_rows.forEach(row => addLaborRow(row));
    }

    if (el.has_money) el.has_money.checked = !!template.money?.enabled;
    toggleMoneyBox(!!template.money?.enabled);
    if (el.money_note) el.money_note.value = template.money?.note || '';
    if (el.other_cost) el.other_cost.value = template.money?.other_total || 0;
    if (el.money_method) el.money_method.value = template.money?.method || '';
    if (el.money_installment_months) el.money_installment_months.value = template.money?.installment_months || 0;

    if (el.start_date) el.start_date.value = currentStartDate;
    if (el.repeat_days) el.repeat_days.value = currentRepeatDays || 1;
    updateEndDateFromRepeatDays();
    syncWorkTimeFields('time');
    updateMoneySummary();
  }

  function saveCurrentWorkAsFavorite() {
    const baseName = (el.task_name?.value || el.task_category?.value || '').trim();
    const name = prompt('즐겨찾기 이름', baseName || '새 즐겨찾기');
    if (name == null) return;

    const trimmed = name.trim();
    if (!trimmed) {
      alert('즐겨찾기 이름을 입력하세요.');
      return;
    }

    const rows = getFavoriteWorks();
    const newItem = {
      id: `${Date.now()}`,
      name: trimmed,
      template: buildWorkTemplateFromForm()
    };
    rows.push(newItem);
    const ok = setFavoriteWorks(rows);
    if (!ok) {
      alert('즐겨찾기 저장 실패');
      return;
    }
    renderFavoriteWorkSelect(newItem.id);
    showFavoriteWorkStatus(`저장 완료: ${trimmed}`);
    alert('즐겨찾기로 저장했습니다.');
  }

  function loadFavoriteWorkIntoForm() {
    const selectedId = el['favorite-work-select']?.value || '';
    if (!selectedId) {
      alert('불러올 즐겨찾기를 선택하세요.');
      return;
    }

    const item = getFavoriteWorks().find(row => String(row.id) === String(selectedId));
    if (!item) {
      alert('선택한 즐겨찾기를 찾을 수 없습니다.');
      renderFavoriteWorkSelect();
      return;
    }

    applyWorkTemplateToForm(item.template || {});
    state.editingWorkId = null;
    if (el['work-modal-title']) el['work-modal-title'].textContent = '작업 입력';
    showFavoriteWorkStatus(`불러옴: ${item.name || ''}`);
  }

  function deleteFavoriteWork() {
    const selectedId = el['favorite-work-select']?.value || '';
    if (!selectedId) {
      alert('삭제할 즐겨찾기를 선택하세요.');
      return;
    }
    if (!confirm('선택한 즐겨찾기를 삭제하시겠습니까?')) return;

    const rows = getFavoriteWorks().filter(row => String(row.id) !== String(selectedId));
    const ok = setFavoriteWorks(rows);
    if (!ok) {
      alert('즐겨찾기 삭제 실패');
      return;
    }
    renderFavoriteWorkSelect('');
    showFavoriteWorkStatus('즐겨찾기를 삭제했습니다.');
  }

  function closeWorkModal() {
    addHidden(el['work-modal']);
    state.editingWorkId = null;
    clearTaskSelection(false);
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
    if (el['task-name-search']) el['task-name-search'].value = '';
    if (el['task-name-options']) el['task-name-options'].innerHTML = '';
    if (el['pest-search-input']) el['pest-search-input'].value = '';
    if (el.work_hours) el.work_hours.value = 0;
    if (el.memo) el.memo.value = '';

    clearChipSelections('crops');
    clearChipSelections('pests');
    clearChipSelections('machines');

    resetMoneyFields();
    resetLaborRows();
    state.recentQuickVisible = false;
    state.selectedMaterialsDetailed = [];
    renderSelectedMaterialsDetailed();
    renderRecommendedMaterials();
    renderTaskOptionsByCategory('');
    updatePestSectionVisibility(false);
    syncFavoriteWorkButtons();
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
    if (el['task-name-search']) el['task-name-search'].value = work.task_name || '';
    renderTaskQuickOptions(work.task_category || '', work.task_name || '');
    renderTaskMaterialRecommendations(work.task_name || '');
    if (el.work_hours) el.work_hours.value = work.work_hours || meta.work_hours || 0;
    if (el.memo) el.memo.value = meta.memo_text || '';

    setChipSelections('crops', splitCsv(work.crops));
    setChipSelections('pests', splitCsv(work.pests));
    setChipSelections('machines', splitCsv(work.machines));
    updatePestSectionVisibility(false);
    renderRecommendedMaterials();

    state.selectedMaterialsDetailed = Array.isArray(meta.materials)
      ? meta.materials.map(m => ({
          id: m.id || '',
          name: m.name || '',
          unit: m.unit || '',
          price: Number(m.price || m.unit_price || 0),
          qty: Number(m.qty || 0),
          method: m.method || '',
          installment_months: Number(m.installment_months || 0),
          material_type: m.material_type || '재고형',
          action: m.action || '사용',
          cost_included: m.cost_included !== false
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
    setSelectOptions(el.task_category, state.options.task_categories, true, '작업분류 선택');
    renderTaskOptionsByCategory(el.task_category?.value || '');
    renderChipOptions('crops', state.options.crops);
    renderChipOptions('pests', state.options.pests);
    renderChipOptions('machines', state.options.machines);
    renderRecommendedMaterials();
    renderRecentQuickPicks();
    updatePestSectionVisibility(false);
    syncTaskNameDatalist(el.task_category?.value || '');
    renderTaskCategoryRecommendations(el.task_category?.value || '');
    renderTaskMaterialRecommendations(el.task_name?.value || '');
    filterChipOptions('pests', el['pest-search-input']?.value || '');
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
    } else if (!keepCurrentValue) {
      selectEl.value = '';
    }

    syncTaskNameDatalist(categoryName || '');
    if (selectEl.value && el['task-name-search']) {
      el['task-name-search'].value = selectEl.value;
    }
    renderTaskQuickOptions(categoryName || '', el['task-name-search']?.value || selectEl.value || '');
    renderTaskCategoryRecommendations(categoryName || '');
    renderTaskMaterialRecommendations(selectEl.value || '');
  }


function getRecentStorageKey(type) {
  return `worklog_recent_${type}_v1`;
}

function getRecentItems(type) {
  try {
    const rows = JSON.parse(localStorage.getItem(getRecentStorageKey(type)) || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    console.error(e);
    return [];
  }
}

function setRecentItems(type, items) {
  try {
    localStorage.setItem(getRecentStorageKey(type), JSON.stringify(items || []));
  } catch (e) {
    console.error(e);
  }
}

function rememberRecentItem(type, value) {
  const next = String(value || '').trim();
  if (!next) return;
  const rows = getRecentItems(type).filter(item => item !== next);
  rows.unshift(next);
  setRecentItems(type, rows.slice(0, 5));
}

function rememberRecentWorkFormValues(payload) {
  rememberRecentItem('tasks', payload.task_name || '');
  (state.selectedMaterialsDetailed || []).forEach(item => rememberRecentItem('materials', item.name || ''));
}

function renderRecentQuickPicks() {
  if (!state.recentQuickVisible) {
    if (el['recent-task-picks']) {
      el['recent-task-picks'].innerHTML = '';
      el['recent-task-picks'].classList.add('hidden');
    }
    if (el['recent-material-picks']) {
      el['recent-material-picks'].innerHTML = '';
      el['recent-material-picks'].classList.add('hidden');
    }
    return;
  }
  renderRecentTaskPicks();
  renderRecentMaterialPicks();
}

function getRecentWorkQuickRows() {
  const works = Array.isArray(state.works) ? [...state.works] : [];
  return works
    .sort((a, b) => {
      const ad = String(a.start_date || '');
      const bd = String(b.start_date || '');
      if (bd !== ad) return bd.localeCompare(ad);
      return Number(b.id || 0) - Number(a.id || 0);
    })
    .slice(0, 5);
}

function getRecentWorkQuickLabel(work) {
  const category = String(work?.task_category || '').trim();
  const task = String(work?.task_name || '').trim();
  if (category && task) return `${category}-${task}`;
  return task || category || '최근 작업';
}

function renderRecentTaskPicks() {
  const box = el['recent-task-picks'];
  if (!box) return;

  const rows = getRecentWorkQuickRows();
  if (!rows.length) {
    box.innerHTML = '';
    box.classList.add('hidden');
    return;
  }

  box.classList.remove('hidden');
  box.innerHTML = `
    <div class="task-quick-section-title">최근 작업 빠른불러오기</div>
    <div class="task-chip-wrap">
      ${rows.map(work => `
        <button type="button" class="quick-pick-chip" data-recent-work-id="${escapeHtml(String(work.id || ''))}" title="${escapeHtml(String(work.start_date || ''))}">
          ${escapeHtml(getRecentWorkQuickLabel(work))}
        </button>
      `).join('')}
    </div>
  `;

  box.querySelectorAll('[data-recent-work-id]').forEach(btn => {
    btn.addEventListener('click', () => applyRecentWorkQuickPick(btn.dataset.recentWorkId || ''));
  });
}

function renderRecentMaterialPicks() {
  const box = el['recent-material-picks'];
  if (!box) return;
  const rows = getRecentItems('materials');
  if (!rows.length) {
    box.innerHTML = '';
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  box.innerHTML = rows.map(name => `<button type="button" class="quick-pick-chip" data-recent-material="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('');
  box.querySelectorAll('[data-recent-material]').forEach(btn => {
    btn.addEventListener('click', () => addRecentMaterialByName(btn.dataset.recentMaterial || ''));
  });
}

function applyRecentWorkQuickPick(workId) {
  const work = (state.works || []).find(item => String(item.id) === String(workId));
  if (!work) {
    alert('불러올 최근 작업을 찾지 못했습니다.');
    return;
  }

  const currentStartDate = el.start_date?.value || fmtDate(new Date());
  const currentRepeatDays = Number(el.repeat_days?.value || 1);

  fillWorkForm(work);

  if (el.start_date) el.start_date.value = currentStartDate;
  if (el.repeat_days) el.repeat_days.value = currentRepeatDays || 1;
  updateEndDateFromRepeatDays();

  state.editingWorkId = null;
  if (el['work-modal-title']) el['work-modal-title'].textContent = '작업 입력';
  showFavoriteWorkStatus(`최근 작업 불러옴: ${getRecentWorkQuickLabel(work)}`);
}

function addRecentMaterialByName(name) {
  const target = String(name || '').trim().toLowerCase();
  if (!target) return;
  let found = state.materials.find(item => String(item.name || '').trim().toLowerCase() === target);
  if (!found) {
    found = state.materials.find(item => String(item.name || '').trim().toLowerCase().includes(target));
  }
  if (!found) return;
  addSelectedMaterial(found.id);
}

function clearTaskSelection() {
  const currentCategory = el.task_category?.value || '';
  if (el.task_name) el.task_name.value = '';
  if (el['task-name-search']) el['task-name-search'].value = '';

  if (el['task-name-options']) {
    el['task-name-options'].querySelectorAll('.task-option-chip.active').forEach(node => node.classList.remove('active'));
  }

  syncTaskNameDatalist(currentCategory);
  renderTaskQuickOptions(currentCategory, '');
  renderTaskCategoryRecommendations(currentCategory);
  renderTaskMaterialRecommendations('');
}

function syncTaskNameDatalist(categoryName = '') {
  const listEl = el['task-name-datalist'];
  if (!listEl) return;
  const rawTasks = state.optionsRaw?.tasks || [];
  const list = categoryName ? rawTasks.filter(item => getTaskCategoryName(item) === categoryName) : rawTasks;
  listEl.innerHTML = list.map(item => {
    const name = optionName(item);
    return `<option value="${escapeHtml(name)}"></option>`;
  }).join('');
  if (el.task_name?.value && el['task-name-search']) {
    el['task-name-search'].value = el.task_name.value;
  }
}

function selectTaskNameValue(value, syncSearch = false) {
  const target = String(value || '').trim();
  if (!el.task_name) return;
  if (!target) {
    el.task_name.value = '';
    if (syncSearch && el['task-name-search']) el['task-name-search'].value = '';
    renderTaskQuickOptions(el.task_category?.value || '', '');
    renderTaskMaterialRecommendations('');
    return;
  }

  let option = Array.from(el.task_name.options || []).find(opt => opt.value === target);
  if (!option) {
    option = document.createElement('option');
    option.value = target;
    option.textContent = target;
    option.dataset.custom = '1';
    el.task_name.appendChild(option);
  }
  el.task_name.value = target;
  if (syncSearch && el['task-name-search']) {
    el['task-name-search'].value = target;
  }
  renderTaskQuickOptions(el.task_category?.value || '', target);
  renderTaskMaterialRecommendations(target);
}

function renderTaskQuickOptions(categoryName = '', keyword = '') {
  const box = el['task-name-options'];
  if (!box) return;

  const rawTasks = state.optionsRaw?.tasks || [];
  const q = String(keyword || '').trim().toLowerCase();
  const currentValue = String(el.task_name?.value || '').trim();

  let list = categoryName
    ? rawTasks.filter(item => getTaskCategoryName(item) === categoryName)
    : rawTasks.slice();

  if (q) {
    list = list.filter(item => optionName(item).toLowerCase().includes(q));
  }

  const uniqueNames = [];
  const seen = new Set();
  list.forEach(item => {
    const name = optionName(item);
    if (!name || seen.has(name)) return;
    seen.add(name);
    uniqueNames.push(name);
  });

  const limited = uniqueNames.slice(0, 24);
  const chips = [];

  if (q && !seen.has(String(keyword || '').trim())) {
    chips.push(`
      <button type="button" class="task-option-chip direct-input" data-task-option-value="${escapeHtml(String(keyword || '').trim())}">
        직접입력: ${escapeHtml(String(keyword || '').trim())}
      </button>
    `);
  }

  limited.forEach(name => {
    const activeClass = currentValue === name ? ' active' : '';
    chips.push(`
      <button type="button" class="task-option-chip${activeClass}" data-task-option-value="${escapeHtml(name)}">
        ${escapeHtml(name)}
      </button>
    `);
  });

  if (!chips.length) {
    box.innerHTML = `<div class="task-option-empty">표시할 세부작업이 없습니다. 검색어를 바꾸거나 직접입력하세요.</div>`;
    return;
  }

  box.innerHTML = chips.join('');
  box.querySelectorAll('[data-task-option-value]').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.taskOptionValue || '';
      selectTaskNameValue(value, true);
    });
  });
}

function syncTaskNameSearchToSelect(keyword) {
  const q = String(keyword || '').trim();
  if (!el.task_name) return;
  if (!q) {
    el.task_name.value = '';
    renderTaskQuickOptions(el.task_category?.value || '', '');
    return;
  }

  const option = Array.from(el.task_name.options || []).find(opt => opt.value === q)
    || Array.from(el.task_name.options || []).find(opt => opt.value && opt.value.includes(q));

  if (option) {
    el.task_name.value = option.value;
    renderTaskMaterialRecommendations(option.value);
  } else {
    selectTaskNameValue(q, false);
  }
  renderTaskQuickOptions(el.task_category?.value || '', q);
}


function getTaskHistoryRowsByCategory(categoryName = '') {
  const category = String(categoryName || '').trim();
  const works = Array.isArray(state.works) ? state.works : [];
  if (!category) return [];
  return works.filter(work => String(work.task_category || '').trim() === category);
}

function getTaskRecommendationNames(categoryName = '') {
  const rows = getTaskHistoryRowsByCategory(categoryName);
  const scoreMap = new Map();
  rows.forEach(work => {
    const name = String(work.task_name || '').trim();
    if (!name) return;
    scoreMap.set(name, (scoreMap.get(name) || 0) + 1);
  });

  const optionNames = (state.optionsRaw?.tasks || [])
    .filter(item => !categoryName || getTaskCategoryName(item) === categoryName)
    .map(item => optionName(item))
    .filter(Boolean);

  optionNames.forEach(name => {
    if (!scoreMap.has(name)) scoreMap.set(name, 0);
  });

  return Array.from(scoreMap.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], 'ko');
    })
    .map(([name]) => name)
    .filter(Boolean)
    .slice(0, 8);
}

function renderTaskCategoryRecommendations(categoryName = '') {
  const wrap = el['task-recommend-wrap'];
  const box = el['task-recommend-box'];
  if (!wrap || !box) return;

  const names = getTaskRecommendationNames(categoryName).filter(name => name !== String(el.task_name?.value || '').trim());
  if (!categoryName || !names.length) {
    wrap.classList.add('hidden');
    box.innerHTML = '';
    return;
  }

  wrap.classList.remove('hidden');
  box.innerHTML = names.map(name => `
    <button type="button" class="search-result-item" data-task-recommend="${escapeHtml(name)}">${escapeHtml(name)}</button>
  `).join('');

  box.querySelectorAll('[data-task-recommend]').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.taskRecommend || '';
      selectTaskNameValue(value, true);
    });
  });
}

function getTaskMaterialRecommendationNames(taskName = '') {
  const target = String(taskName || '').trim();
  if (!target) return [];

  const scoreMap = new Map();
  (state.works || []).forEach(work => {
    if (String(work.task_name || '').trim() !== target) return;
    const meta = parseMemo(work.memo);
    const materials = Array.isArray(meta.materials) ? meta.materials : [];
    materials.forEach(item => {
      const name = String(item.name || '').trim();
      if (!name) return;
      const qty = Number(item.qty || 0) || 1;
      scoreMap.set(name, (scoreMap.get(name) || 0) + qty);
    });
  });

  return Array.from(scoreMap.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0], 'ko');
    })
    .map(([name]) => name)
    .slice(0, 8);
}

function addRecommendedMaterialName(name) {
  const target = String(name || '').trim();
  if (!target) return;

  const item = findMaterialByRecommendedName(target);
  if (item) {
    addSelectedMaterial(item.id);
    return;
  }

  const exists = state.selectedMaterialsDetailed.find(m => String(m.name || '').trim() === target);
  if (exists) {
    exists.qty = Number(exists.qty || 0) + 1;
  } else {
    state.selectedMaterialsDetailed.push({
      id: '',
      name: target,
      unit: '',
      price: 0,
      qty: 1,
      method: getDefaultMaterialMethod(),
      installment_months: 0
    });
  }

  renderSelectedMaterialsDetailed();
  updateMoneySummary();
}

function renderTaskMaterialRecommendations(taskName = '') {
  const wrap = el['task-material-recommend-wrap'];
  const box = el['task-material-recommend-box'];
  if (!wrap || !box) return;

  const names = getTaskMaterialRecommendationNames(taskName);
  if (!taskName || !names.length) {
    wrap.classList.add('hidden');
    box.innerHTML = '';
    return;
  }

  wrap.classList.remove('hidden');
  box.innerHTML = names.map(name => `
    <button type="button" class="search-result-item" data-task-material-recommend="${escapeHtml(name)}">${escapeHtml(name)}</button>
  `).join('');

  box.querySelectorAll('[data-task-material-recommend]').forEach(btn => {
    btn.addEventListener('click', () => addRecommendedMaterialName(btn.dataset.taskMaterialRecommend || ''));
  });
}

function filterChipOptions(type, keyword) {
  const box = el[`${type}-box`];
  if (!box) return;
  const q = String(keyword || '').trim().toLowerCase();
  box.querySelectorAll('.chip').forEach(chip => {
    const text = (chip.textContent || '').trim().toLowerCase();
    chip.style.display = !q || text.includes(q) ? '' : 'none';
  });
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


  function isSprayCategory(value) {
    const text = String(value || '').trim();
    return !!text && text.includes('방제');
  }

  function updatePestSectionVisibility(clearWhenHidden = false) {
    const pestField = el['pests-field'];
    const category = el['task_category']?.value || '';
    const visible = isSprayCategory(category);

    if (pestField) {
      pestField.classList.toggle('hidden', !visible);
    }
    if (!visible) {
      if (clearWhenHidden) {
        if (el['pest-search-input']) el['pest-search-input'].value = '';
        clearChipSelections('pests');
      }
      if (el['recommended-materials-wrap']) el['recommended-materials-wrap'].classList.add('hidden');
      if (el['recommended-materials-box']) el['recommended-materials-box'].innerHTML = '';
    } else {
      renderRecommendedMaterials();
    }
  }

  function getLaborTotal() {
    const rows = getLaborRows();
    return rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }

  function getMaterialTotal() {
    let total = 0;
    state.selectedMaterialsDetailed.forEach(m => {
      if (m.cost_included === false) return;
      const line = Number(m.price || 0) * Number(m.qty || 0);
      total += (m.action || '') === '반품' ? -line : line;
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

    const methodValue = String(row?.method || '');
    const installmentValue = String(row?.installment_months || row?.installment || '');
    const item = {
      type: row?.type || '남자',
      count: Number(row?.count || 0),
      price: Number(row?.price || 0),
      amount: Number(row?.amount || 0),
      method: methodValue,
      installment_months: installmentValue,
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
      <select class="labor-method">
        <option value="" ${item.method === '' ? 'selected' : ''}>결제방식</option>
        <option value="현금" ${item.method === '현금' ? 'selected' : ''}>현금</option>
        <option value="계좌이체" ${item.method === '계좌이체' ? 'selected' : ''}>계좌이체</option>
        <option value="카드일시불" ${item.method === '카드일시불' ? 'selected' : ''}>카드일시불</option>
        <option value="카드할부" ${item.method === '카드할부' ? 'selected' : ''}>카드할부</option>
        <option value="외상" ${item.method === '외상' ? 'selected' : ''}>외상</option>
      </select>
      <input type="number" class="labor-installment ${item.method === '카드할부' ? '' : 'hidden'}" value="${escapeHtml(item.installment_months)}" min="2" step="1" placeholder="할부개월수">
      <input type="text" class="labor-note" value="${escapeHtml(item.note)}" placeholder="비고">
      <button type="button" class="btn labor-remove">삭제</button>
    `;
    wrap.appendChild(div);

    const countEl = div.querySelector('.labor-count');
    const priceEl = div.querySelector('.labor-price');
    const amountEl = div.querySelector('.labor-amount');
    const methodEl = div.querySelector('.labor-method');
    const installmentEl = div.querySelector('.labor-installment');
    const noteEl = div.querySelector('.labor-note');

    function syncInstallmentVisibility() {
      const isCardInstallment = (methodEl.value || '') === '카드할부';
      installmentEl.classList.toggle('hidden', !isCardInstallment);
      if (!isCardInstallment) installmentEl.value = '';
    }

    function recalc() {
      const count = Number(countEl.value || 0);
      const price = Number(priceEl.value || 0);
      amountEl.value = String(count * price);
      updateMoneySummary();
    }

    countEl.addEventListener('input', recalc);
    priceEl.addEventListener('input', recalc);
    methodEl.addEventListener('change', () => {
      syncInstallmentVisibility();
      updateMoneySummary();
    });
    installmentEl.addEventListener('input', updateMoneySummary);
    noteEl.addEventListener('input', updateMoneySummary);

    div.querySelector('.labor-remove').addEventListener('click', () => {
      div.remove();
      updateMoneySummary();
    });

    syncInstallmentVisibility();
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
      const method = row.querySelector('.labor-method')?.value || '';
      const installmentMonths = row.querySelector('.labor-installment')?.value || '';
      const note = row.querySelector('.labor-note')?.value || '';
      return { type, count, price, amount, method, installment_months: installmentMonths, note };
    }).filter(item => item.count > 0 || item.price > 0 || item.note || item.method || item.installment_months);
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
        method: getDefaultMaterialMethod(),
        installment_months: 0,
        material_type: '재고형',
        action: '사용',
        cost_included: true
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


  function getDefaultMaterialMethod() {
    return (el['default-material-method']?.value || '').trim();
  }

  function getMaterialMethodOptionsHtml(selectedValue = '') {
    const options = [
      ['','선택'],
      ['현금','현금'],
      ['계좌이체','계좌이체'],
      ['카드일시불','카드일시불'],
      ['카드할부','카드할부'],
      ['외상','외상']
    ];
    return options.map(([value,label]) => {
      const selected = value === selectedValue ? ' selected' : '';
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    }).join('');
  }

  function applyDefaultMaterialMethodToAll() {
    const method = getDefaultMaterialMethod();
    if (!method) {
      alert('기본 결제방식을 선택하세요.');
      return;
    }
    state.selectedMaterialsDetailed = state.selectedMaterialsDetailed.map(item => ({
      ...item,
      method,
      installment_months: method === '카드할부' ? Number(item.installment_months || 0) : 0
    }));
    renderSelectedMaterialsDetailed();
  }

  function renderSelectedMaterialsDetailed() {
    const box = el['selected-materials-detailed'];
    if (!box) return;

    if (!state.selectedMaterialsDetailed.length) {
      box.innerHTML = `<div class="empty-msg">선택된 자재 없음</div>`;
      return;
    }

    box.innerHTML = state.selectedMaterialsDetailed.map((item, idx) => {
      const method = item.method || '';
      const showInstallment = method === '카드할부';
      const materialType = item.material_type || '재고형';
      const action = item.action || '사용';
      const costIncluded = item.cost_included !== false;
      const showAction = materialType === '재고형';
      const lineAmount = Number(item.price || 0) * Number(item.qty || 0);
      const signedAmount = action === '반품' ? -lineAmount : lineAmount;
      return `
      <div class="material-row material-row-inline material-row-compact">
        <span class="material-name"><strong>${escapeHtml(item.name || '')}</strong></span>
        <input type="number" min="0" step="0.1" value="${escapeHtml(String(item.qty || 0))}" data-material-qty="${idx}">
        <span class="material-unit">${escapeHtml(item.unit || '')}</span>
        <span class="material-price">단가 ${formatNumber(item.price || 0)}</span>
        <span class="material-total">합계 ${formatNumber(signedAmount)}</span>
        <span class="material-type-wrap">
          <select data-material-type="${idx}" class="material-type-select">
            <option value="재고형" ${materialType === '재고형' ? 'selected' : ''}>재고형</option>
            <option value="비용형" ${materialType === '비용형' ? 'selected' : ''}>비용형</option>
          </select>
        </span>
        <span class="material-cost-wrap">
          <label class="material-cost-label"><input type="checkbox" data-material-cost="${idx}" ${costIncluded ? 'checked' : ''}> 비용발생</label>
        </span>
        <span class="material-action-wrap ${showAction ? '' : 'hidden'}">
          <select data-material-action="${idx}" class="material-action-select">
            <option value="구입" ${action === '구입' ? 'selected' : ''}>구입</option>
            <option value="사용" ${action === '사용' ? 'selected' : ''}>사용</option>
            <option value="반품" ${action === '반품' ? 'selected' : ''}>반품</option>
          </select>
        </span>
        <span class="material-method-wrap">
          <select data-material-method="${idx}" class="material-method-select">${getMaterialMethodOptionsHtml(method)}</select>
          ${showInstallment ? `<input type="number" min="0" step="1" value="${escapeHtml(String(item.installment_months || 0))}" data-material-installment="${idx}" class="material-installment-input" placeholder="개월">` : ''}
        </span>
        <button type="button" class="btn" data-material-remove="${idx}">삭제</button>
      </div>
    `;}).join('');

    box.querySelectorAll('[data-material-qty]').forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.materialQty);
        if (Number.isNaN(idx) || !state.selectedMaterialsDetailed[idx]) return;
        state.selectedMaterialsDetailed[idx].qty = Number(input.value || 0);
        updateMoneySummary();
      });
      input.addEventListener('change', () => {
        const idx = Number(input.dataset.materialQty);
        if (Number.isNaN(idx) || !state.selectedMaterialsDetailed[idx]) return;
        state.selectedMaterialsDetailed[idx].qty = Number(input.value || 0);
        renderSelectedMaterialsDetailed();
      });
    });

    box.querySelectorAll('[data-material-type]').forEach(select => {
      select.addEventListener('change', () => {
        const idx = Number(select.dataset.materialType);
        if (Number.isNaN(idx) || !state.selectedMaterialsDetailed[idx]) return;
        const target = state.selectedMaterialsDetailed[idx];
        target.material_type = select.value || '재고형';
        if (target.material_type === '비용형') {
          target.action = '사용';
          target.cost_included = true;
        } else {
          target.action = target.action || '사용';
          if (typeof target.cost_included !== 'boolean') target.cost_included = true;
        }
        renderSelectedMaterialsDetailed();
        updateMoneySummary();
      });
    });

    box.querySelectorAll('[data-material-cost]').forEach(input => {
      input.addEventListener('change', () => {
        const idx = Number(input.dataset.materialCost);
        if (Number.isNaN(idx) || !state.selectedMaterialsDetailed[idx]) return;
        state.selectedMaterialsDetailed[idx].cost_included = !!input.checked;
        renderSelectedMaterialsDetailed();
        updateMoneySummary();
      });
    });

    box.querySelectorAll('[data-material-action]').forEach(select => {
      select.addEventListener('change', () => {
        const idx = Number(select.dataset.materialAction);
        if (Number.isNaN(idx) || !state.selectedMaterialsDetailed[idx]) return;
        state.selectedMaterialsDetailed[idx].action = select.value || '사용';
        renderSelectedMaterialsDetailed();
        updateMoneySummary();
      });
    });

    box.querySelectorAll('[data-material-method]').forEach(select => {
      select.addEventListener('change', () => {
        const idx = Number(select.dataset.materialMethod);
        if (Number.isNaN(idx) || !state.selectedMaterialsDetailed[idx]) return;
        state.selectedMaterialsDetailed[idx].method = select.value || '';
        if ((select.value || '') !== '카드할부') {
          state.selectedMaterialsDetailed[idx].installment_months = 0;
        }
        renderSelectedMaterialsDetailed();
      });
    });

    box.querySelectorAll('[data-material-installment]').forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.materialInstallment);
        if (Number.isNaN(idx) || !state.selectedMaterialsDetailed[idx]) return;
        state.selectedMaterialsDetailed[idx].installment_months = Number(input.value || 0);
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
        addRecommendedMaterialName(name);
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
    renderTaskCategoryList();
    renderTaskOptionList();
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

    renderTaskCategorySelects();
    renderSeasonList();
    renderMoneySeasonOptions();
    updateSeasonPanelUi();
  }

  function toggleSeasonPanel(forceValue = null) {
    if (typeof forceValue === 'boolean') {
      state.seasonPanelCollapsed = forceValue;
    } else {
      state.seasonPanelCollapsed = !state.seasonPanelCollapsed;
    }
    updateSeasonPanelUi();
  }

  function updateSeasonPanelUi() {
    const panel = el['season-panel'];
    if (!panel) return;

    panel.classList.toggle('collapsed', !!state.seasonPanelCollapsed);

    if (el['season-panel-header']) {
      el['season-panel-header'].setAttribute('aria-expanded', String(!state.seasonPanelCollapsed));
    }
    if (el['season-panel-toggle-text']) {
      el['season-panel-toggle-text'].textContent = state.seasonPanelCollapsed ? '펼치기' : '접기';
    }
    if (el['season-panel-summary']) {
      const currentSeason = (state.seasons || []).find(season => Number(season.is_current || 0) === 1);
      const total = (state.seasons || []).length;
      if (currentSeason) {
        el['season-panel-summary'].textContent = `현재시즌: ${currentSeason.season_name || currentSeason.name || ''} · 등록 ${total}개`;
      } else if (total > 0) {
        el['season-panel-summary'].textContent = `등록된 시즌 ${total}개 · 펼치기 후 수정할 수 있습니다.`;
      } else {
        el['season-panel-summary'].textContent = '시즌 입력/수정은 펼치기 후 사용할 수 있습니다.';
      }
    }
  }


  function renderTaskCategorySelects() {
    const categoryItems = state.optionsRaw?.task_categories || [];
    const buildOptions = (selectedValue = '', emptyLabel = '작업분류 선택') => {
      return [`<option value="">${escapeHtml(emptyLabel)}</option>`]
        .concat(categoryItems.map(item => {
          const name = optionName(item);
          const selected = name === selectedValue ? ' selected' : '';
          return `<option value="${escapeHtml(name)}"${selected}>${escapeHtml(name)}</option>`;
        }))
        .join('');
    };

    if (el['new-task-category']) {
      const current = el['new-task-category'].value || '';
      el['new-task-category'].innerHTML = buildOptions(current);
      if (current) el['new-task-category'].value = current;
    }

    if (el['edit-task-category']) {
      const current = el['edit-task-category'].value || '';
      el['edit-task-category'].innerHTML = buildOptions(current);
      if (current) el['edit-task-category'].value = current;
    }
  }

  function renderMoneySeasonOptions() {
    const node = el['money-season-filter'];
    if (!node) return;

    const current = node.value || '';
    const options = [
      '<option value="">전체 시즌</option>',
      '<option value="current">현재 시즌</option>'
    ].concat((state.seasons || []).map(season => {
      const seasonId = String(season.id);
      const seasonName = season.season_name || season.name || '';
      return `<option value="${escapeHtml(seasonId)}">${escapeHtml(seasonName)}</option>`;
    }));

    node.innerHTML = options.join('');
    if (current && Array.from(node.options).some(opt => opt.value === current)) {
      node.value = current;
    }
  }

  function openTaskOptionModal(optionId, currentName, currentCategory) {
    state.editingTaskOptionId = optionId;
    if (el['task-option-modal-title']) el['task-option-modal-title'].textContent = '세부작업 수정';
    renderTaskCategorySelects();
    if (el['edit-task-name']) el['edit-task-name'].value = currentName || '';
    if (el['edit-task-category']) el['edit-task-category'].value = currentCategory || '';
    removeHidden(el['task-option-modal']);
  }

  function closeTaskOptionModal() {
    addHidden(el['task-option-modal']);
    state.editingTaskOptionId = null;
    if (el['edit-task-name']) el['edit-task-name'].value = '';
    if (el['edit-task-category']) el['edit-task-category'].value = '';
  }

  async function saveTaskOptionEdit() {
    const optionId = state.editingTaskOptionId;
    if (!optionId) return;

    const name = (el['edit-task-name']?.value || '').trim();
    const category_name = (el['edit-task-category']?.value || '').trim();

    if (!name) {
      alert('세부작업을 입력하세요.');
      el['edit-task-name']?.focus();
      return;
    }

    try {
      await apiPut(`/api/options/tasks/${optionId}`, { name, category_name });
      closeTaskOptionModal();
      await loadOptions();
      renderOptions();
      renderWorkFormOptions();
    } catch (e) {
      console.error(e);
      alert('수정 실패');
    }
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

  function renderTaskOptionList() {
    const listEl = el['options-tasks'];
    if (!listEl) return;

    const selectedCategory = (el['new-task-category']?.value || '').trim();
    const rawItems = state.optionsRaw?.tasks || [];
    const filteredItems = selectedCategory
      ? rawItems.filter(item => getTaskCategoryName(item) === selectedCategory)
      : rawItems;

    listEl.innerHTML = filteredItems.map(item => {
      const name = optionName(item);
      const itemId = item?.id ?? name;
      const categoryName = getTaskCategoryName(item);
      return `
        <div class="option-item">
          <div class="option-item-main">
            <span>${escapeHtml(name)}</span>
            <div class="option-subtext">${escapeHtml(categoryName || '분류 없음')}</div>
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
        openTaskOptionModal(optionId, currentName, currentCategory);
      });
    });

    listEl.querySelectorAll('[data-task-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
          await apiDelete(`/api/options/tasks/${btn.dataset.taskDelete}`);
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
      await apiPost('/api/options/tasks', { name, category_name });
      nameNode.value = '';
      await loadOptions();
      renderOptions();
      renderWorkFormOptions();
    } catch (e) {
      console.error(e);
      alert('추가 실패');
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

  window.saveOption = function(type, inputId, extraInputId) {
    if (type === 'task_categories') {
      return saveTaskCategory();
    }
    if (type === 'tasks') {
      return saveTaskOption();
    }
    const extraId = type === 'pests' ? 'new-pests-recommend' : extraInputId;
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
      toggleSeasonPanel(false);
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
        toggleSeasonPanel(false);
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
    const currentBtn = el['btn-mobile-current'];
    const previousBtn = el['btn-mobile-previous'];

    if (!compareWrap) return;

    const isMobile = window.innerWidth <= 900;
    if (!isMobile) {
      compareWrap.classList.remove('mobile-show-current', 'mobile-show-previous');
      if (currentBtn) currentBtn.classList.remove('active');
      if (previousBtn) previousBtn.classList.remove('active');
      return;
    }

    compareWrap.classList.remove('mobile-show-current', 'mobile-show-previous');
    compareWrap.classList.add(state.mobileCalendarMode === 'previous' ? 'mobile-show-previous' : 'mobile-show-current');

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

  function toggleInstallmentField() {
    const wrap = el['money_installment_wrap'];
    if (!wrap) return;
    const method = el['money_method']?.value || '';
    const show = method === '카드할부';
    wrap.style.display = show ? '' : 'none';
    if (!show && el['money_installment_months']) {
      el['money_installment_months'].value = 0;
    }
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
    if (el.material_price_last_year) el.material_price_last_year.value = item.price_last_year ?? 0;
    if (el.material_price_this_year) el.material_price_this_year.value = (item.price_this_year ?? item.unit_price ?? item.price ?? 0);
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
    if (el.material_price_last_year) el.material_price_last_year.value = '0';
    if (el.material_price_this_year) el.material_price_this_year.value = '0';
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
        if (el.material_price_last_year) el.material_price_last_year.value = item.price_last_year ?? 0;
        if (el.material_price_this_year) el.material_price_this_year.value = (item.price_this_year ?? item.unit_price ?? item.price ?? 0);
      });
    });
  }

  async function saveMaterial() {
    const payload = {
      name: (el.material_name?.value || '').trim(),
      unit: el.material_unit?.value || '',
      stock_qty: Number(el.material_stock?.value || 0),
      unit_price: Number(el.material_price?.value || 0),
      price_last_year: Number(el.material_price_last_year?.value || 0),
      price_this_year: Number(el.material_price_this_year?.value || 0),
      memo: (el.material_memo?.value || '').trim()
    };

    if (!payload.unit_price && payload.price_this_year > 0) {
      payload.unit_price = payload.price_this_year;
    }

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
      const text = `${item.name || ''} ${item.unit || ''} ${item.memo || ''} ${item.price_last_year || ''} ${item.price_this_year || ''}`.toLowerCase();
      return text.includes(q);
    });

    const inStock = filtered.filter(item => Number(item.stock_qty || item.stock || 0) > 0);
    const outStock = filtered.filter(item => Number(item.stock_qty || item.stock || 0) <= 0);
    const tab = state.materialFilterTab || 'all';

    if (tab === 'in') {
      wrap.innerHTML = `
        <div class="materials-single-col">
          <div>
            <h3>재고 있음</h3>
            ${renderMaterialSection(inStock)}
          </div>
        </div>
      `;
    } else if (tab === 'out') {
      wrap.innerHTML = `
        <div class="materials-single-col">
          <div>
            <h3>재고 없음</h3>
            ${renderMaterialSection(outStock)}
          </div>
        </div>
      `;
    } else {
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
    }

    (el.materialTabButtons || []).forEach(btn => {
      btn.classList.toggle('active', (btn.dataset.materialTab || 'all') === tab);
    });

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
        <div>현재단가: ${formatNumber(item.unit_price || item.price || 0)}</div>
        <div>작년단가: ${formatNumber(item.price_last_year || 0)}</div>
        <div>올해단가: ${formatNumber(item.price_this_year || item.unit_price || item.price || 0)}</div>
        <div>차이: ${formatPriceDiff(item.price_last_year || 0, item.price_this_year || item.unit_price || item.price || 0)}</div>
        <div>증감률: ${formatRateDiff(item.price_last_year || 0, item.price_this_year || item.unit_price || item.price || 0)}</div>
        <div>메모: ${escapeHtml(item.memo || '')}</div>
        <div class="item-actions">
          <button type="button" class="btn" data-material-edit="${escapeHtml(String(item.id))}">수정</button>
          <button type="button" class="btn" data-material-delete="${escapeHtml(String(item.id))}">삭제</button>
        </div>
      </div>
    `).join('');
  }


  function applyMoneyQuickPeriod() {
    const period = el['money-period-filter']?.value || '';
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (!el['money-start'] || !el['money-end']) return;

    if (period === 'today') {
      const date = `${yyyy}-${mm}-${dd}`;
      el['money-start'].value = date;
      el['money-end'].value = date;
      return;
    }
    if (period === 'month') {
      const start = `${yyyy}-${mm}-01`;
      const lastDay = String(new Date(yyyy, today.getMonth() + 1, 0).getDate()).padStart(2, '0');
      const end = `${yyyy}-${mm}-${lastDay}`;
      el['money-start'].value = start;
      el['money-end'].value = end;
      return;
    }
    if (!period) {
      el['money-start'].value = '';
      el['money-end'].value = '';
    }
  }

  function syncMoneyQuickPeriodFromDates() {
    const start = el['money-start']?.value || '';
    const end = el['money-end']?.value || '';
    if (!el['money-period-filter']) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const monthStart = `${yyyy}-${mm}-01`;
    const monthEnd = `${yyyy}-${mm}-${String(new Date(yyyy, today.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

    if (!start && !end) {
      el['money-period-filter'].value = '';
    } else if (start === todayStr && end === todayStr) {
      el['money-period-filter'].value = 'today';
    } else if (start === monthStart && end === monthEnd) {
      el['money-period-filter'].value = 'month';
    } else {
      el['money-period-filter'].value = 'custom';
    }
  }


  function getSelectedMoneyScopeLabel() {
    const seasonValue = el['money-season-filter']?.value || '';
    if (seasonValue === 'current') return '현재시즌';
    if (seasonValue && seasonValue !== 'all') {
      const season = (state.seasons || []).find(item => String(item.id) === String(seasonValue));
      if (season) return season.season_name || '선택시즌';
    }

    const start = el['money-start']?.value || '';
    const end = el['money-end']?.value || '';
    if (start && end) return `${start} ~ ${end}`;
    if (start) return `${start} 이후`;
    if (end) return `${end} 이전`;
    return '전체';
  }

  function renderMonthlySettlement(rows) {
    const body = el['money-monthly-list'];
    const empty = el['money-monthly-empty'];
    if (!body) return;

    const grouped = {};
    (rows || []).forEach(row => {
      const date = row.date || '';
      if (!date || date.length < 7) return;
      const monthKey = date.slice(0, 7);
      if (!grouped[monthKey]) {
        grouped[monthKey] = { income: 0, expense: 0 };
      }
      if (row.row_kind === 'income') {
        grouped[monthKey].income += Number(row.total_amount || 0);
      } else {
        grouped[monthKey].expense += Number(row.total_amount || 0);
      }
    });

    const monthKeys = Object.keys(grouped).sort().reverse();
    if (!monthKeys.length) {
      body.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      if (el['money-scope-month-count']) el['money-scope-month-count'].textContent = '월 수: 0';
      return;
    }

    if (empty) empty.classList.add('hidden');
    if (el['money-scope-month-count']) el['money-scope-month-count'].textContent = `월 수: ${monthKeys.length}`;

    body.innerHTML = monthKeys.map(monthKey => {
      const item = grouped[monthKey];
      const incomeAmount = Number(item.income || 0);
      const expenseAmount = Number(item.expense || 0);
      const net = incomeAmount - expenseAmount;
      return `
        <tr>
          <td>${escapeHtml(monthKey)}</td>
          <td>${formatNumber(incomeAmount)}</td>
          <td>${formatNumber(expenseAmount)}</td>
          <td>${net > 0 ? '+' : ''}${formatNumber(net)}</td>
        </tr>
      `;
    }).join('');
  }

  function normalizeMoneyMethodFilterValue(value) {
    return value || '';
  }

  function renderMoney() {
    const wrap = el['money-list'];
    if (!wrap) return;

    const start = el['money-start']?.value || '';
    const end = el['money-end']?.value || '';
    const typeFilter = el['money-type-filter']?.value || '';
    const methodFilter = normalizeMoneyMethodFilterValue(el['money-method-filter']?.value || '');
    const keyword = (el['money-keyword-filter']?.value || '').trim().toLowerCase();
    const table = wrap.closest('table');
    const tableWrap = wrap.closest('.money-table-wrap');
    const thead = table?.querySelector('thead');
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    const expenseRows = (state.moneyRows || []).map(row => ({
      row_kind: 'expense',
      date: row.date || '',
      task_name: row.task_name || '',
      type: row.type || '',
      total_amount: Number(row.total_amount || row.total || 0),
      labor_total: Number(row.labor_total || 0),
      material_total: Number(row.material_total || 0),
      other_total: Number(row.other_total || 0),
      method: row.method || '',
      method_display: row.method_display || row.method || '',
      note: row.note || '',
      cash_amount: Number(row.cash_amount || 0),
      transfer_amount: Number(row.transfer_amount || 0),
      card_lump_amount: Number(row.card_lump_amount || 0),
      card_install_amount: Number(row.card_install_amount || 0),
      credit_amount: Number(row.credit_amount || 0),
      work_memo: row.work_memo || ''
    }));

    const incomeRows = (state.incomeRows || []).map(row => {
      const amount = Number(row.amount || 0);
      const method = row.method || '';
      return {
        id: row.id,
        row_kind: 'income',
        date: row.income_date || '',
        task_name: row.income_type || '수익',
        type: '수익',
        total_amount: amount,
        labor_total: 0,
        material_total: 0,
        other_total: amount,
        method,
        method_display: method,
        note: row.note || '',
        cash_amount: method === '현금' ? amount : 0,
        transfer_amount: method === '계좌이체' ? amount : 0,
        card_lump_amount: method === '카드일시불' ? amount : 0,
        card_install_amount: method === '카드할부' ? amount : 0,
        credit_amount: method === '외상' ? amount : 0,
        work_memo: ''
      };
    });

    const mergedRows = expenseRows.concat(incomeRows);

    const filtered = mergedRows.filter(row => {
      if (start && row.date < start) return false;
      if (end && row.date > end) return false;
      if (typeFilter) {
        if (typeFilter === '수익') {
          if (row.row_kind !== 'income') return false;
        } else if (row.row_kind === 'income' || row.type !== typeFilter) {
          return false;
        }
      }
      if (methodFilter) {
        const rowMethod = row.method || '';
        const isCardMethod = rowMethod === '카드일시불' || rowMethod === '카드할부';
        if (methodFilter === '카드') {
          if (!isCardMethod) return false;
        } else if (rowMethod !== methodFilter) {
          return false;
        }
      }
      if (keyword) {
        const text = [
          row.date,
          row.task_name,
          row.type,
          row.method,
          row.method_display,
          row.note,
          row.work_memo
        ].join(' ').toLowerCase();
        if (!text.includes(keyword)) return false;
      }
      return true;
    });

    const incomeTotal = filtered
      .filter(row => row.row_kind === 'income')
      .reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
    const expenseTotal = filtered
      .filter(row => row.row_kind === 'expense')
      .reduce((sum, row) => sum + Number(row.total_amount || 0), 0);

    const cash = filtered.reduce((sum, row) => sum + Number(row.cash_amount || 0), 0);
    const transfer = filtered.reduce((sum, row) => sum + Number(row.transfer_amount || 0), 0);
    const cardLump = filtered.reduce((sum, row) => sum + Number(row.card_lump_amount || 0), 0);
    const cardInstall = filtered.reduce((sum, row) => sum + Number(row.card_install_amount || 0), 0);
    const credit = filtered.reduce((sum, row) => sum + Number(row.credit_amount || 0), 0);

    if (el['money-income-total']) el['money-income-total'].innerText = formatNumber(incomeTotal);
    if (el['money-total']) el['money-total'].innerText = formatNumber(expenseTotal);
    if (el['money-net-profit']) el['money-net-profit'].innerText = formatNumber(incomeTotal - expenseTotal);
    if (el['money-cash']) el['money-cash'].innerText = formatNumber(cash);
    if (el['money-transfer']) el['money-transfer'].innerText = formatNumber(transfer);
    if (el['money-card-lump']) el['money-card-lump'].innerText = formatNumber(cardLump);
    if (el['money-card-install']) el['money-card-install'].innerText = formatNumber(cardInstall);
    if (el['money-credit']) el['money-credit'].innerText = formatNumber(credit);
    if (el['money-scope-label']) el['money-scope-label'].textContent = `정산범위: ${getSelectedMoneyScopeLabel()}`;
    if (el['money-scope-row-count']) el['money-scope-row-count'].textContent = `건수: ${filtered.length}`;
    renderMonthlySettlement(filtered);

    renderMonthlySettlement(filtered);
    const creditRows = filtered.filter(row => row.method === '외상');
    if (el['money-credit-list']) {
      el['money-credit-list'].innerHTML = creditRows.length
        ? `<table class="money-table"><thead><tr><th>날짜</th><th>작업</th><th>금액</th><th>비고</th></tr></thead><tbody>${creditRows.map(row => `
            <tr>
              <td>${escapeHtml(row.date || '')}</td>
              <td>${escapeHtml(row.task_name || '')}</td>
              <td>${formatNumber(row.total_amount || 0)}</td>
              <td>${escapeHtml(row.note || '')}</td>
            </tr>
          `).join('')}</tbody></table>`
        : `<div class="empty-msg">외상 내역 없음</div>`;
    }

    if (thead) thead.style.display = isMobile ? 'none' : '';
    if (tableWrap) tableWrap.classList.toggle('money-mobile-view', isMobile);

    if (!filtered.length) {
      wrap.innerHTML = isMobile
        ? `<tr><td colspan="7"><div class="empty-msg">금전 내역 없음</div></td></tr>`
        : `<div class="empty-msg">금전 내역 없음</div>`;
      return;
    }

    if (isMobile) {
      const grouped = filtered.reduce((acc, row) => {
        const key = row.date || '날짜 없음';
        (acc[key] ||= []).push(row);
        return acc;
      }, {});

      wrap.innerHTML = Object.entries(grouped).map(([date, rows]) => `
        <tr class="money-mobile-group-row">
          <td colspan="7">
            <div class="money-mobile-date">${escapeHtml(date)}</div>
            <div class="money-mobile-cards">
              ${rows.map(row => `
                <div class="money-mobile-card">
                  <div class="money-mobile-card-head">
                    <strong>${escapeHtml(row.task_name || '작업명 없음')}</strong>
                    <span>${escapeHtml(row.method_display || row.method || '-')}</span>
                  </div>
                  <div class="money-mobile-card-amount">${row.row_kind === 'income' ? '+' : ''}총금액 ${formatNumber(row.total_amount || 0)}원</div>
                  <div class="money-mobile-card-grid">
                    <div><b>구분</b><span>${escapeHtml(row.type || '-')}</span></div>
                    <div><b>인건비</b><span>${formatNumber(row.labor_total || 0)}원</span></div>
                    <div><b>자재비</b><span>${formatNumber(row.material_total || 0)}원</span></div>
                    <div><b>기타</b><span>${formatNumber(row.other_total || 0)}원</span></div>
                  </div>
                  ${row.note ? `<div class="money-mobile-card-note"><b>비고</b><span>${escapeHtml(row.note || '')}</span></div>` : ''}
                  ${row.row_kind === 'income' ? `<div class="money-mobile-card-actions"><button class="btn" data-income-edit="${escapeHtml(String(row.id || ''))}">수정</button><button class="btn" data-income-delete="${escapeHtml(String(row.id || ''))}">삭제</button></div>` : ''}
                </div>
              `).join('')}
            </div>
          </td>
        </tr>
      `).join('');
      bindIncomeRowActions();
      return;
    }

    wrap.innerHTML = filtered.map(row => `
      <tr>
        <td>${escapeHtml(row.date || '')}</td>
        <td>${escapeHtml(row.task_name || '')}</td>
        <td>${escapeHtml(row.type || '')}</td>
        <td>${row.row_kind === 'income' ? '+' : ''}${formatNumber(row.total_amount || 0)}</td>
        <td>${escapeHtml(row.method_display || row.method || '')}</td>
        <td>${escapeHtml(row.note || '')}</td>
        <td>
          ${row.row_kind === 'income'
            ? `<div class="money-row-actions"><button class="btn" data-income-edit="${escapeHtml(String(row.id || ''))}">수정</button><button class="btn" data-income-delete="${escapeHtml(String(row.id || ''))}">삭제</button></div>`
            : ''}
        </td>
      </tr>
    `).join('');

    bindIncomeRowActions();
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
    closeIncomeModal();
    closeTaskOptionModal();
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
    stabilizeWorksFloatingButton();
  }

  function addHidden(node) {
    if (!node) return;
    node.classList.add('hidden');
    stabilizeWorksFloatingButton();
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

  function formatPriceDiff(lastYear, thisYear) {
    const diff = Number(thisYear || 0) - Number(lastYear || 0);
    const sign = diff > 0 ? '+' : '';
    return `${sign}${formatNumber(diff)}`;
  }

  function formatRateDiff(lastYear, thisYear) {
    const base = Number(lastYear || 0);
    const current = Number(thisYear || 0);
    if (base <= 0) {
      return current > 0 ? '신규' : '0%';
    }
    const rate = ((current - base) / base) * 100;
    const sign = rate > 0 ? '+' : '';
    return `${sign}${rate.toFixed(1)}%`;
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
      box.className = 'works-search-box panel';
      box.style.marginBottom = '12px';
      box.innerHTML = `
        <div class="works-filter-grid">
          <div>
            <label class="inline-help">시작일</label>
            <input type="date" id="works-filter-start">
          </div>
          <div>
            <label class="inline-help">종료일</label>
            <input type="date" id="works-filter-end">
          </div>
          <div>
            <label class="inline-help">작업분류</label>
            <select id="works-filter-task-category"></select>
          </div>
          <div>
            <label class="inline-help">세부작업</label>
            <select id="works-filter-task-name"></select>
          </div>
          <div>
            <label class="inline-help">작물</label>
            <select id="works-filter-crop"></select>
          </div>
          <div>
            <label class="inline-help">검색</label>
            <input type="text" id="works-search-input" placeholder="메모/자재/작업 검색">
          </div>
        </div>
        <div class="works-filter-actions">
          <button type="button" class="btn" id="btn-works-filter-reset">필터 초기화</button>
        </div>
      `;
      const header = page.querySelector('.page-header');
      if (header && header.parentNode === page) {
        page.insertBefore(box, header.nextSibling);
      } else {
        page.insertBefore(box, page.firstChild);
      }

      el['works-filter-start'] = box.querySelector('#works-filter-start');
      el['works-filter-end'] = box.querySelector('#works-filter-end');
      el['works-filter-task-category'] = box.querySelector('#works-filter-task-category');
      el['works-filter-task-name'] = box.querySelector('#works-filter-task-name');
      el['works-filter-crop'] = box.querySelector('#works-filter-crop');
      const input = box.querySelector('#works-search-input');
      const resetBtn = box.querySelector('#btn-works-filter-reset');

      input.addEventListener('input', (e) => {
        state.workSearchKeyword = (e.target.value || '').trim();
        renderWorks();
      });
      el['works-filter-start'].addEventListener('change', (e) => {
        state.workFilterStartDate = e.target.value || '';
        renderWorks();
      });
      el['works-filter-end'].addEventListener('change', (e) => {
        state.workFilterEndDate = e.target.value || '';
        renderWorks();
      });
      el['works-filter-task-category'].addEventListener('change', (e) => {
        state.workFilterTaskCategory = e.target.value || '';
        state.workFilterTaskName = '';
        renderWorksSearchFilterOptions();
        renderWorks();
      });
      el['works-filter-task-name'].addEventListener('change', (e) => {
        state.workFilterTaskName = e.target.value || '';
        renderWorks();
      });
      el['works-filter-crop'].addEventListener('change', (e) => {
        state.workFilterCrop = e.target.value || '';
        renderWorks();
      });
      resetBtn.addEventListener('click', () => {
        state.workSearchKeyword = '';
        state.workFilterStartDate = '';
        state.workFilterEndDate = '';
        state.workFilterTaskCategory = '';
        state.workFilterTaskName = '';
        state.workFilterCrop = '';
        renderWorksSearchFilterOptions();
        if (el['works-filter-start']) el['works-filter-start'].value = '';
        if (el['works-filter-end']) el['works-filter-end'].value = '';
        const searchInput = box.querySelector('#works-search-input');
        if (searchInput) searchInput.value = '';
        renderWorks();
      });
    }

    renderWorksSearchFilterOptions();
    if (el['works-filter-start']) el['works-filter-start'].value = state.workFilterStartDate || '';
    if (el['works-filter-end']) el['works-filter-end'].value = state.workFilterEndDate || '';
    const searchInput = box.querySelector('#works-search-input');
    if (searchInput) searchInput.value = state.workSearchKeyword || '';
  }

  function renderWorksSearchFilterOptions() {
    const categoryEl = el['works-filter-task-category'];
    const taskEl = el['works-filter-task-name'];
    const cropEl = el['works-filter-crop'];
    if (!categoryEl || !taskEl || !cropEl) return;

    const categoryOptions = ['<option value="">전체 작업분류</option>']
      .concat((state.options.task_categories || []).map(item => {
        const name = optionName(item);
        return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
      }));
    categoryEl.innerHTML = categoryOptions.join('');
    categoryEl.value = state.workFilterTaskCategory || '';

    const allTasks = state.optionsRaw?.tasks || [];
    const taskList = state.workFilterTaskCategory
      ? allTasks.filter(item => (item.category_name || '') === state.workFilterTaskCategory)
      : allTasks;
    const taskOptions = ['<option value="">전체 세부작업</option>']
      .concat(taskList.map(item => {
        const name = optionName(item);
        return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
      }));
    taskEl.innerHTML = taskOptions.join('');
    taskEl.value = state.workFilterTaskName || '';

    const cropSet = new Set();
    (state.works || []).forEach(work => {
      splitCsv(work.crops).forEach(crop => cropSet.add(crop));
    });
    const cropOptions = ['<option value="">전체 작물</option>']
      .concat(Array.from(cropSet).sort().map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`));
    cropEl.innerHTML = cropOptions.join('');
    cropEl.value = state.workFilterCrop || '';
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
        work.task_category,
        work.task_name,
        work.crops,
        work.pests,
        work.machines,
        meta.memo_text,
        (meta.materials || []).map(m => `${m.name || ''} ${m.qty || ''} ${m.unit || ''}`).join(' ')
      ].join(' ').toLowerCase();

      const inKeyword = text.includes(q);
      const inStart = !state.workFilterStartDate || String(work.start_date || '') >= state.workFilterStartDate;
      const inEnd = !state.workFilterEndDate || String(work.start_date || '') <= state.workFilterEndDate;
      const inCategory = !state.workFilterTaskCategory || String(work.task_category || '') === state.workFilterTaskCategory;
      const inTask = !state.workFilterTaskName || String(work.task_name || '') === state.workFilterTaskName;
      const cropValues = splitCsv(work.crops);
      const inCrop = !state.workFilterCrop || cropValues.includes(state.workFilterCrop);

      return inKeyword && inStart && inEnd && inCategory && inTask && inCrop;
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

    updateScrollJumpButtons();
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
    const rawStartTime = (el.start_time?.value || '').trim();
    const rawEndTime = (el.end_time?.value || '').trim();
    let normalizedWorkHours = Number(el.work_hours?.value || 0);

    if (rawStartTime !== '' && rawEndTime !== '') {
      syncWorkTimeFields('time');
      normalizedWorkHours = Number(el.work_hours?.value || 0);
    } else if (rawStartTime !== '' && rawEndTime === '' && normalizedWorkHours > 0) {
      syncWorkTimeFields('hours');
    }

    if (!Number.isFinite(normalizedWorkHours) || normalizedWorkHours < 0) {
      normalizedWorkHours = 0;
    }

    const startTime = (el.start_time?.value || '').trim();
    const endTime = (el.end_time?.value || '').trim();

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
          method: item.method || '',
          installment_months: Number(item.installment_months || 0),
          material_type: item.material_type || '재고형',
          action: item.action || '사용',
          cost_included: item.cost_included !== false
        })),
        labor_rows: laborRows,
        work_hours: normalizedWorkHours,
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
      rememberRecentWorkFormValues(payload);
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