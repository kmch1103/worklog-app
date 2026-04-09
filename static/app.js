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
    materialUnits: ['개', '병', '통', '봉', '포', 'kg', 'L', 'ml', '말', 'M']
  };

  const el = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    state.seasons = [];
    state.currentSeason = null;
    state.selectedSeasonId = 'current';
    state.editingSeasonId = null;
    state.calendarDataCurrent = { works: [], plans: [] };
    state.calendarDataPrevious = { works: [], plans: [] };

    cacheElements();
    bindMenu();
    bindCalendarButtons();
    bindWorkButtons();
    bindMaterialButtons();
    bindCalendarDetailModal();
    bindSeasonButtons();
    bindBackupButtons();
    await loadAll();
    await loadMoney();
    renderAll();
  }

  function cacheElements() {
    const ids = [
      'page-calendar', 'page-works', 'page-materials', 'page-money', 'page-options', 'page-season', 'page-excel', 'page-backup',
      'btn-prev-month', 'btn-next-month', 'calendar-title', 'calendar-current-title', 'calendar-current-grid', 'calendar-compare-title', 'calendar-compare-grid', 'calendar-compare-wrap',
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
      'money-start', 'money-end', 'money-type-filter', 'money-method-filter', 'money-season-filter',
      'btn-money-filter', 'money-list', 'money-total', 'money-cash', 'money-card',
      'backup-file-input', 'btn-import-old-db', 'backup-import-status',
      'works-season-filter', 'season-form-title', 'season_name', 'season_start', 'season_end', 'season_note', 'season_is_current', 'btn-save-season', 'btn-cancel-season', 'season-list', 'season-current-box', 'season-backup-status'
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
    on(el['btn-prev-month'], 'click', async () => {
      state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
      await refreshCalendarData();
      renderCalendar();
    });

    on(el['btn-next-month'], 'click', async () => {
      state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
      await refreshCalendarData();
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

  function bindSeasonButtons() {
    on(el['btn-save-season'], 'click', saveSeason);
    on(el['btn-cancel-season'], 'click', resetSeasonForm);
    on(el['works-season-filter'], 'change', async (e) => {
      state.selectedSeasonId = e.target.value || 'current';
      await loadWorks();
      renderWorks();
    });
    on(el['money-season-filter'], 'change', async (e) => {
      state.selectedSeasonId = e.target.value || 'current';
      await loadMoney();
      renderMoney();
    });
  }

  function bindBackupButtons() {
    on(el['btn-import-old-db'], 'click', importOldDbFile);
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

  async function importOldDbFile() {
    const fileInput = el['backup-file-input'];
    const statusBox = el['backup-import-status'];
    if (!fileInput || !fileInput.files || !fileInput.files.length) {
      alert('가져올 DB 파일을 먼저 선택하세요.');
      return;
    }
    if (!confirm('현재 작업일지/자재/옵션 데이터를 기존 DB 내용으로 교체합니다. 계속할까요?')) return;
    if (statusBox) statusBox.textContent = '가져오는 중...';

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
      const res = await fetch('/api/import_old_db', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || '가져오기 실패');
      await loadAll();
      await loadMoney();
      renderAll();
      if (statusBox) statusBox.textContent = `가져오기 완료: 작업일지 ${formatNumber(data?.imported?.works || 0)}건 / 자재 ${formatNumber(data?.imported?.materials || 0)}건`;
      fileInput.value = '';
    } catch (e) {
      console.error(e);
      if (statusBox) statusBox.textContent = `오류: ${e.message || '가져오기 실패'}`;
      alert(`가져오기 실패: ${e.message || ''}`);
    }
  }

  function autoFillMaterialName(keyword) {
    if (!keyword) return;
    const input = el['material_name'];
    if (!input) return;
    if (input.value !== keyword) input.value = keyword;
  }

  async function loadAll() {
    await Promise.all([
      loadSeasons(),
      loadPlans(),
      loadMaterials(),
      loadOptions()
    ]);
    await loadWorks();
    await refreshCalendarData();
  }

  async function loadSeasons() {
    try {
      state.seasons = await apiGet('/api/seasons');
      state.currentSeason = state.seasons.find(item => Number(item.is_current) === 1) || null;
      if (state.selectedSeasonId === 'current' && !state.currentSeason && state.seasons.length) {
        state.selectedSeasonId = String(state.seasons[0].id);
      }
    } catch (e) {
      console.error(e);
      state.seasons = [];
      state.currentSeason = null;
    }
  }

  async function loadWorks() {
    try {
      const qs = state.selectedSeasonId && state.selectedSeasonId !== 'all'
        ? `?season_id=${encodeURIComponent(state.selectedSeasonId)}`
        : '';
      state.works = await apiGet('/api/works' + qs);
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
      const qs = state.selectedSeasonId && state.selectedSeasonId !== 'all'
        ? `?season_id=${encodeURIComponent(state.selectedSeasonId)}`
        : '';
      state.moneyRows = await apiGet('/api/money' + qs);
    } catch (e) {
      console.error(e);
      state.moneyRows = [];
    }
  }

  async function refreshCalendarData() {
    const currentMonth = state.currentMonth;
    const previousMonth = new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth(), 1);
    const [currentData, previousData] = await Promise.all([
      loadCalendarDataForMonth(currentMonth),
      loadCalendarDataForMonth(previousMonth)
    ]);
    state.calendarDataCurrent = currentData;
    state.calendarDataPrevious = previousData;
  }

  async function loadCalendarDataForMonth(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth() + 1;
    try {
      return await apiGet(`/api/calendar_items?year=${year}&month=${month}`);
    } catch (e) {
      console.error(e);
      return { works: [], plans: [] };
    }
  }

  function renderAll() {
    renderMenuState();
    renderSeasonSelectors();
    renderCurrentSeasonBox();
    renderSeasonList();
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
      season: el['page-season'],
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
    } else if (page === 'works') {
      renderWorks();
      ensureWorksSearchBar();
    } else if (page === 'materials') {
      renderMaterials();
    } else if (page === 'money') {
      renderMoney();
    } else if (page === 'options') {
      renderOptions();
    } else if (page === 'season') {
      renderSeasonList();
      renderCurrentSeasonBox();
    }
  }

  function renderMenuState() {
    el.menuButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === state.currentPage);
    });
  }

  function renderSeasonSelectors() {
    const options = ['<option value="current">현재 시즌</option>', '<option value="all">전체</option>']
      .concat((state.seasons || []).map(item => `<option value="${escapeHtml(String(item.id))}">${escapeHtml(item.season_name || '')} (${escapeHtml(item.start_date || '')} ~ ${escapeHtml(item.end_date || '')})${Number(item.is_current) === 1 ? ' *' : ''}</option>`));

    ['works-season-filter', 'money-season-filter'].forEach(id => {
      const node = el[id];
      if (!node) return;
      const current = state.selectedSeasonId || 'current';
      node.innerHTML = options.join('');
      node.value = current;
    });
  }

  function renderCurrentSeasonBox() {
    if (!el['season-current-box']) return;
    const s = state.currentSeason;
    if (!s) {
      el['season-current-box'].innerHTML = '현재 시즌 없음';
      return;
    }
    el['season-current-box'].innerHTML = `<strong>${escapeHtml(s.season_name || '')}</strong><br>${escapeHtml(s.start_date || '')} ~ ${escapeHtml(s.end_date || '')}${s.note ? `<br>${escapeHtml(s.note)}` : ''}`;
  }

  function renderSeasonList() {
    if (!el['season-list']) return;
    const list = state.seasons || [];
    if (!list.length) {
      el['season-list'].innerHTML = '<div class="empty-msg">등록된 시즌이 없습니다.</div>';
      return;
    }
    el['season-list'].innerHTML = list.map(s => `
      <div class="option-item">
        <span><strong>${escapeHtml(s.season_name || '')}</strong> (${escapeHtml(s.start_date || '')} ~ ${escapeHtml(s.end_date || '')})${Number(s.is_current) === 1 ? ' [현재]' : ''}${s.note ? ` / ${escapeHtml(s.note)}` : ''}</span>
        <div class="item-actions">
          <button class="btn" data-season-current="${escapeHtml(String(s.id))}">현재설정</button>
          <button class="btn" data-season-edit="${escapeHtml(String(s.id))}">수정</button>
          <button class="btn" data-season-backup="${escapeHtml(String(s.id))}">백업</button>
          <button class="btn" data-season-delete="${escapeHtml(String(s.id))}">삭제</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('[data-season-current]').forEach(btn => {
      btn.addEventListener('click', () => setCurrentSeason(btn.dataset.seasonCurrent));
    });
    document.querySelectorAll('[data-season-edit]').forEach(btn => {
      btn.addEventListener('click', () => editSeason(btn.dataset.seasonEdit));
    });
    document.querySelectorAll('[data-season-backup]').forEach(btn => {
      btn.addEventListener('click', () => backupSeason(btn.dataset.seasonBackup));
    });
    document.querySelectorAll('[data-season-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteSeason(btn.dataset.seasonDelete));
    });
  }

  function resetSeasonForm() {
    state.editingSeasonId = null;
    if (el['season-form-title']) el['season-form-title'].textContent = '시즌 추가';
    if (el.season_name) el.season_name.value = '';
    if (el.season_start) el.season_start.value = '';
    if (el.season_end) el.season_end.value = '';
    if (el.season_note) el.season_note.value = '';
    if (el.season_is_current) el.season_is_current.checked = false;
  }

  function editSeason(seasonId) {
    const s = (state.seasons || []).find(item => String(item.id) === String(seasonId));
    if (!s) return;
    state.editingSeasonId = Number(seasonId);
    if (el['season-form-title']) el['season-form-title'].textContent = '시즌 수정';
    if (el.season_name) el.season_name.value = s.season_name || '';
    if (el.season_start) el.season_start.value = s.start_date || '';
    if (el.season_end) el.season_end.value = s.end_date || '';
    if (el.season_note) el.season_note.value = s.note || '';
    if (el.season_is_current) el.season_is_current.checked = Number(s.is_current) === 1;
    switchPage('season');
  }

  async function saveSeason() {
    const payload = {
      season_name: (el.season_name?.value || '').trim(),
      start_date: el.season_start?.value || '',
      end_date: el.season_end?.value || '',
      note: (el.season_note?.value || '').trim(),
      is_current: !!el.season_is_current?.checked
    };
    if (!payload.season_name || !payload.start_date || !payload.end_date) {
      alert('시즌명, 시작일, 종료일을 입력하세요.');
      return;
    }

    try {
      if (state.editingSeasonId) {
        await apiPut(`/api/seasons/${state.editingSeasonId}`, payload);
      } else {
        await apiPost('/api/seasons', payload);
      }
      await loadSeasons();
      if (payload.is_current) state.selectedSeasonId = 'current';
      await loadWorks();
      await loadMoney();
      await refreshCalendarData();
      renderSeasonSelectors();
      renderCurrentSeasonBox();
      renderSeasonList();
      renderWorks();
      renderCalendar();
      renderMoney();
      resetSeasonForm();
    } catch (e) {
      console.error(e);
      alert('시즌 저장 실패');
    }
  }

  async function setCurrentSeason(seasonId) {
    try {
      await apiPut(`/api/seasons/${seasonId}/set_current`, {});
      state.selectedSeasonId = 'current';
      await loadSeasons();
      await loadWorks();
      await loadMoney();
      await refreshCalendarData();
      renderSeasonSelectors();
      renderCurrentSeasonBox();
      renderSeasonList();
      renderWorks();
      renderCalendar();
      renderMoney();
    } catch (e) {
      console.error(e);
      alert('현재 시즌 설정 실패');
    }
  }

  async function deleteSeason(seasonId) {
    if (!confirm('시즌을 삭제할까요?')) return;
    try {
      await apiDelete(`/api/seasons/${seasonId}`);
      if (String(state.selectedSeasonId) === String(seasonId)) state.selectedSeasonId = 'current';
      await loadSeasons();
      await loadWorks();
      await loadMoney();
      renderSeasonSelectors();
      renderCurrentSeasonBox();
      renderSeasonList();
      renderWorks();
      renderCalendar();
      renderMoney();
      resetSeasonForm();
    } catch (e) {
      console.error(e);
      alert('시즌 삭제 실패');
    }
  }

  async function backupSeason(seasonId) {
    const statusBox = el['season-backup-status'];
    try {
      if (statusBox) statusBox.textContent = '백업 파일 생성 중...';
      const res = await fetch(`/api/seasons/${seasonId}/backup`);
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || '시즌 백업 실패');
      const seasonName = (data.season?.season_name || 'season').replace(/[\\/:*?"<>|]/g, '_');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${seasonName}_backup.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (statusBox) statusBox.textContent = `${seasonName} 백업 완료`;
    } catch (e) {
      console.error(e);
      if (statusBox) statusBox.textContent = `오류: ${e.message || '시즌 백업 실패'}`;
      alert(`시즌 백업 실패: ${e.message || ''}`);
    }
  }

  function renderCalendar() {
    if (el['calendar-title']) {
      el['calendar-title'].textContent = `${state.currentMonth.getFullYear()}년 ${state.currentMonth.getMonth() + 1}월`;
    }
    renderCalendarGridFromData(el['calendar-current-grid'], state.currentMonth, el['calendar-current-title'], state.calendarDataCurrent, false);
    const compareMonth = new Date(state.currentMonth.getFullYear() - 1, state.currentMonth.getMonth(), 1);
    renderCalendarGridFromData(el['calendar-compare-grid'], compareMonth, el['calendar-compare-title'], state.calendarDataPrevious, true);
  }

  function renderCalendarGridFromData(targetNode, monthDate, titleNode, monthData, readOnly) {
    if (!targetNode || !monthDate) return;
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0).getDate();
    const startWeekday = firstDay.getDay();

    if (titleNode) titleNode.textContent = `${year}년 ${month + 1}월`;

    const worksList = Array.isArray(monthData?.works) ? monthData.works : [];
    const plansList = Array.isArray(monthData?.plans) ? monthData.plans : [];
    const html = [];
    for (let i = 0; i < startWeekday; i++) html.push(`<div class="calendar-day empty"></div>`);

    for (let day = 1; day <= lastDate; day++) {
      const dateStr = fmtDate(new Date(year, month, day));
      const plans = plansList.filter(p => normalizePlanDate(p.plan_date) === dateStr);
      const works = worksList.filter(w => isDateInRange(dateStr, w.start_date, w.end_date));
      const selectedClass = !readOnly && state.selectedDate === dateStr ? 'selected' : '';
      const titleItems = [];

      if (plans.length) {
        titleItems.push(`
          <div class="day-title-group plan-group">
            <div class="day-group-label">계획</div>
            ${plans.slice(0, 2).map(item => `<div class="day-title-item plan" title="${escapeHtml(item.title || '')}">${escapeHtml(item.title || '')}</div>`).join('')}
          </div>
        `);
      }
      if (works.length) {
        titleItems.push(`
          <div class="day-title-group work-group">
            <div class="day-group-label">실적</div>
            ${works.slice(0, 2).map(item => `<div class="day-title-item work" title="${escapeHtml(item.task_name || '')}">${escapeHtml(item.task_name || '')}</div>`).join('')}
          </div>
        `);
      }
      const moreCount = Math.max(0, plans.length + works.length - 4);
      html.push(`
        <div class="calendar-day ${selectedClass}" ${readOnly ? '' : `data-date="${escapeHtml(dateStr)}"`}>
          <div class="day-num">${day}</div>
          <div class="day-title-list">${titleItems.join('')}</div>
          ${moreCount > 0 ? `<div class="day-more">+${moreCount}건 더보기</div>` : ''}
        </div>
      `);
    }

    targetNode.innerHTML = html.join('');
    if (!readOnly) {
      targetNode.querySelectorAll('[data-date]').forEach(node => {
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

    const plans = (state.calendarDataCurrent?.plans || []).filter(p => normalizePlanDate(p.plan_date) === dateStr);
    const works = (state.calendarDataCurrent?.works || []).filter(w => isDateInRange(dateStr, w.start_date, w.end_date));

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
          const money = meta.money || {};
          return `
            <div class="calendar-detail-card">
              <div class="calendar-detail-title">${escapeHtml(work.task_name || '')}</div>
              <div class="calendar-detail-meta">작물: ${escapeHtml(work.crops || '')}</div>
              <div class="calendar-detail-meta">병충해: ${escapeHtml(work.pests || '')}</div>
              <div class="calendar-detail-meta">사용자재: ${escapeHtml(formatMaterials(meta.materials))}</div>
              <div class="calendar-detail-meta">인건비: ${formatNumber(money.labor_total || 0)}원 / 자재비: ${formatNumber(money.material_total || 0)}원</div>
              <div class="calendar-detail-meta">비고: ${escapeHtml(meta.memo_text || '')}</div>
              <div class="item-actions">
                <button class="btn" data-work-edit="${escapeHtml(String(work.id))}">수정</button>
                <button class="btn" data-work-delete="${escapeHtml(String(work.id))}">삭제</button>
              </div>
            </div>
          `;
        }).join('')
      : `<div class="empty-msg">등록된 작업실적 없음</div>`;

    if (el['calendar-detail-body']) {
      el['calendar-detail-body'].innerHTML = `
        <div class="calendar-detail-group">
          <h4>작업계획</h4>
          ${plansHtml}
        </div>
        <div class="calendar-detail-group">
          <h4>작업실적</h4>
          ${worksHtml}
        </div>
      `;
    }

    bindPlanCardActions();
    bindWorkMiniActions();
    removeHidden(el['calendar-detail-modal']);
  }

  function closeCalendarDetailModal() {
    addHidden(el['calendar-detail-modal']);
  }

  function bindPlanCardActions() {
    document.querySelectorAll('[data-plan-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeCalendarDetailModal();
        editPlan(btn.dataset.planEdit);
      });
    });
    document.querySelectorAll('[data-plan-done]').forEach(btn => {
      btn.addEventListener('click', () => markPlanDone(btn.dataset.planDone));
    });
    document.querySelectorAll('[data-plan-work]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeCalendarDetailModal();
        convertPlanToWork(btn.dataset.planWork);
      });
    });
    document.querySelectorAll('[data-plan-delete]').forEach(btn => {
      btn.addEventListener('click', () => deletePlan(btn.dataset.planDelete));
    });
  }

  function bindWorkMiniActions() {
    document.querySelectorAll('[data-work-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        closeCalendarDetailModal();
        editWork(btn.dataset.workEdit);
      });
    });
    document.querySelectorAll('[data-work-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
    });
  }

  function openPlanModal(planId = null) {
    state.editingPlanId = planId ? Number(planId) : null;
    if (el['plan-modal-title']) {
      el['plan-modal-title'].textContent = state.editingPlanId ? '작업계획 수정' : '작업계획 입력';
    }

    resetPlanForm();

    if (state.editingPlanId) {
      const plan = state.plans.find(p => Number(p.id) === Number(state.editingPlanId));
      if (plan) {
        el.plan_date.value = normalizePlanDate(plan.plan_date) || '';
        el.plan_title.value = plan.title || '';
        el.plan_details.value = plan.details || '';
        el.plan_status.value = plan.status || 'planned';
      }
    } else {
      el.plan_date.value = state.selectedDate || fmtDate(new Date());
    }

    renderPlanSearchResults();
    removeHidden(el['plan-modal']);
  }

  function closePlanModal() {
    addHidden(el['plan-modal']);
  }

  function resetPlanForm() {
    if (el.plan_date) el.plan_date.value = '';
    if (el.plan_title) el.plan_title.value = '';
    if (el.plan_details) el.plan_details.value = '';
    if (el.plan_status) el.plan_status.value = 'planned';
    if (el['plan-search']) el['plan-search'].value = '';
    if (el['plan-search-results']) el['plan-search-results'].innerHTML = '';
  }

  function renderPlanSearchResults() {
    if (!el['plan-search-results']) return;
    const q = (el['plan-search']?.value || '').trim();
    const list = state.options.tasks || [];
    const matched = q ? list.filter(item => String(item.name || '').includes(q)).slice(0, 30) : list.slice(0, 30);

    el['plan-search-results'].innerHTML = matched.map(item => `
      <button type="button" class="search-result-item" data-plan-title-pick="${escapeHtml(item.name || '')}">
        ${escapeHtml(item.name || '')}
      </button>
    `).join('');

    el['plan-search-results'].querySelectorAll('[data-plan-title-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (el.plan_title) {
          ensurePlanTitleOption(btn.dataset.planTitlePick || '');
          el.plan_title.value = btn.dataset.planTitlePick || '';
        }
      });
    });

    rebuildPlanTitleSelect(q);
  }

  function rebuildPlanTitleSelect(searchKeyword = '') {
    if (!el.plan_title) return;
    const current = el.plan_title.value || '';
    const list = (state.options.tasks || []).map(item => item.name || '');
    const filtered = searchKeyword ? list.filter(name => String(name).includes(searchKeyword)) : list;

    const uniq = Array.from(new Set(filtered.filter(Boolean)));
    el.plan_title.innerHTML = `<option value="">선택</option>` + uniq.map(name => `
      <option value="${escapeHtml(name)}">${escapeHtml(name)}</option>
    `).join('');

    if (current && !uniq.includes(current)) {
      ensurePlanTitleOption(current);
    }
    el.plan_title.value = current;
  }

  function ensurePlanTitleOption(value) {
    if (!el.plan_title) return;
    const name = String(value || '').trim();
    if (!name) return;
    const exists = Array.from(el.plan_title.options).some(opt => opt.value === name);
    if (!exists) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      el.plan_title.appendChild(option);
    }
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
      await refreshCalendarData();
      closePlanModal();
      renderCalendar();
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
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
      await apiPut(`/api/plans/${planId}`, {
        plan_date: plan.plan_date,
        title: plan.title,
        details: plan.details,
        status: 'done'
      });
      await loadPlans();
      await refreshCalendarData();
      renderCalendar();
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
    } catch (e) {
      console.error(e);
      alert('완료 처리 실패');
    }
  }

  async function deletePlan(planId) {
    if (!confirm('삭제하시겠습니까?')) return;

    try {
      await apiDelete(`/api/plans/${planId}`);
      await loadPlans();
      await refreshCalendarData();
      renderCalendar();
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
    } catch (err) {
      console.error(err);
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

  function closeWorkModal() {
    addHidden(el['work-modal']);
  }

  function resetWorkForm() {
    if (el.start_date) el.start_date.value = '';
    if (el.repeat_days) el.repeat_days.value = 1;
    if (el.end_date) el.end_date.value = '';
    if (el.start_time) el.start_time.value = '';
    if (el.end_time) el.end_time.value = '';
    if (el.weather) el.weather.value = '';
    if (el.task_name) el.task_name.value = '';
    if (el.memo) el.memo.value = '';
    if (el.work_hours) el.work_hours.value = 0;
    if (el.labor_cost) el.labor_cost.value = 0;

    setChipSelections('crops', []);
    setChipSelections('pests', []);
    setChipSelections('machines', []);

    state.selectedMaterialsDetailed = [];
    renderSelectedMaterialsDetailed();

    resetLaborRows();
    addLaborRow();

    resetMoneyFields();
    updateEndDateFromRepeatDays();
    updateWorkHoursFromTime();
    updateMoneySummary();
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

  async function editWork(workId) {
    const work = state.works.find(item => String(item.id) === String(workId));
    if (!work) return;

    state.editingWorkId = Number(workId);
    if (el['work-modal-title']) el['work-modal-title'].textContent = '작업 수정';
    resetWorkForm();
    fillWorkForm(work);
    removeHidden(el['work-modal']);
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
      await refreshCalendarData();
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
      works = works.filter(w => {
        const meta = parseMemo(w.memo);
        const text = [
          w.start_date, w.end_date, w.weather, w.crops, w.task_name, w.pests, w.machines, w.memo, formatMaterials(meta.materials)
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
      btn.addEventListener('click', () => editWork(btn.dataset.workEdit));
    });

    document.querySelectorAll('[data-work-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
    });
  }

  function renderWorkCard(work) {
    const meta = parseMemo(work.memo);
    const materialsText = formatMaterials(meta.materials);
    const laborTotal = Number(meta?.money?.labor_total || 0);
    const materialTotal = Number(meta?.money?.material_total || 0);
    const totalAmount = Number(meta?.money?.total_amount || 0);
    const memoText = meta.memo_text || '';

    return `
      <div class="work-card">
        <div class="work-card-title">${escapeHtml(work.task_name || '')}</div>
        <div>기간: ${escapeHtml(work.start_date || '')} ~ ${escapeHtml(work.end_date || '')}</div>
        <div>날씨: ${escapeHtml(work.weather || '')}</div>
        <div>작물: ${escapeHtml(work.crops || '')}</div>
        <div>병충해: ${escapeHtml(work.pests || '')}</div>
        <div>사용기계: ${escapeHtml(work.machines || '')}</div>
        <div>사용자재: ${escapeHtml(materialsText)}</div>
        <div>작업시간: ${formatNumber(work.work_hours || 0)}시간</div>
        <div>인건비: ${formatNumber(laborTotal)}원</div>
        <div>자재비: ${formatNumber(materialTotal)}원</div>
        <div><strong>총비용: ${formatNumber(totalAmount || 0)}원</strong></div>
        <div>비고: ${escapeHtml(memoText)}</div>
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
      await refreshCalendarData();
      renderWorks();
      renderCalendar();
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
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
        <div class="material-meta">단위: ${escapeHtml(item.unit || '')} / 재고: ${formatNumber(item.stock_qty || 0)}</div>
        <div class="material-meta">단가: ${formatNumber(item.unit_price || 0)}원</div>
        <div class="material-meta">${escapeHtml(item.memo || '')}</div>
        <div class="item-actions">
          <button class="btn" data-material-edit="${escapeHtml(String(item.id))}">수정</button>
          <button class="btn" data-material-delete="${escapeHtml(String(item.id))}">삭제</button>
        </div>
      </div>
    `;
  }

  function openMaterialModal(materialId = null) {
    state.editingMaterialId = materialId ? Number(materialId) : null;
    if (el['material-modal-title']) {
      el['material-modal-title'].textContent = state.editingMaterialId ? '자재 수정' : '자재 추가';
    }

    resetMaterialForm();

    if (state.editingMaterialId) {
      const item = state.materials.find(m => Number(m.id) === Number(state.editingMaterialId));
      if (item) {
        el.material_name.value = item.name || '';
        el.material_unit.value = item.unit || state.materialUnits[0] || '';
        el.material_stock.value = item.stock_qty || 0;
        el.material_price.value = item.unit_price || 0;
        el.material_memo.value = item.memo || '';
      }
    }

    renderMaterialPickerResults('');
    removeHidden(el['material-modal']);
  }

  function closeMaterialModal() {
    addHidden(el['material-modal']);
  }

  function resetMaterialForm() {
    if (el.material_name) el.material_name.value = '';
    if (el.material_unit) el.material_unit.value = state.materialUnits[0] || '';
    if (el.material_stock) el.material_stock.value = 0;
    if (el.material_price) el.material_price.value = 0;
    if (el.material_memo) el.material_memo.value = '';
    if (el['material-search-keyword']) el['material-search-keyword'].value = '';
    if (el['material-search-box']) el['material-search-box'].innerHTML = '';
  }

  function renderMaterialPickerResults(keyword) {
    if (!el['material-search-box']) return;

    const q = String(keyword || '').trim();
    const list = !q
      ? state.materials.slice(0, 20)
      : state.materials.filter(item => (item.name || '').includes(q)).slice(0, 20);

    el['material-search-box'].innerHTML = list.map(item => `
      <button type="button" class="search-result-item" data-material-fill="${escapeHtml(String(item.id))}">
        ${escapeHtml(item.name || '')}
      </button>
    `).join('');

    el['material-search-box'].querySelectorAll('[data-material-fill]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = state.materials.find(m => String(m.id) === String(btn.dataset.materialFill));
        if (!item) return;
        el.material_name.value = item.name || '';
        el.material_unit.value = item.unit || state.materialUnits[0] || '';
        el.material_price.value = item.unit_price || 0;
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
      await loadOptions();
      renderMaterials();
      renderOptions();
      resetMaterialForm();

      if (state.editingMaterialId) {
        closeMaterialModal();
      } else if (el.material_unit) {
        el.material_unit.value = payload.unit || state.materialUnits[0] || '';
      }
    } catch (e) {
      console.error(e);
      alert('자재 저장 실패');
    }
  }

  async function deleteMaterial(materialId) {
    if (!confirm('자재를 삭제할까요?')) return;
    try {
      await apiDelete(`/api/materials/${materialId}`);
      await loadMaterials();
      await loadOptions();
      renderMaterials();
      renderOptions();
    } catch (e) {
      console.error(e);
      alert('삭제 실패');
    }
  }

  function renderOptions() {
    renderOptionList('weather', el['options-weather']);
    renderOptionList('crops', el['options-crops']);
    renderOptionList('tasks', el['options-tasks']);
    renderOptionList('pests', el['options-pests']);
    renderOptionList('machines', el['options-machines']);
    renderWorkFormOptions();
    rebuildPlanTitleSelect(el['plan-search']?.value || '');
  }

  function renderOptionList(type, target) {
    if (!target) return;
    const list = state.options[type] || [];
    target.innerHTML = list.map(item => `
      <div class="option-item">
        <span>${escapeHtml(item.name || '')}</span>
        <div class="item-actions">
          <button class="btn" data-option-edit="${escapeHtml(type)}|${escapeHtml(String(item.id))}">수정</button>
          <button class="btn" data-option-delete="${escapeHtml(type)}|${escapeHtml(String(item.id))}">삭제</button>
        </div>
      </div>
    `).join('');

    target.querySelectorAll('[data-option-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [optionType, optionId] = (btn.dataset.optionEdit || '').split('|');
        editOption(optionType, optionId);
      });
    });

    target.querySelectorAll('[data-option-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [optionType, optionId] = (btn.dataset.optionDelete || '').split('|');
        deleteOption(optionType, optionId);
      });
    });
  }

  async function saveOption(type, inputId) {
    const input = document.getElementById(inputId);
    const name = (input?.value || '').trim();
    if (!name) return;

    try {
      await apiPost(`/api/options/${type}`, { name });
      if (input) input.value = '';
      await loadOptions();
      await loadMaterials();
      renderOptions();
      renderMaterials();
    } catch (e) {
      console.error(e);
      alert('옵션 저장 실패');
    }
  }

  async function editOption(type, optionId) {
    const list = state.options[type] || [];
    const row = list.find(item => String(item.id) === String(optionId));
    if (!row) return;

    const newName = prompt('새 이름', row.name || '');
    if (newName === null) return;

    try {
      await apiPut(`/api/options/${type}/${optionId}`, { name: newName });
      await loadOptions();
      await loadMaterials();
      renderOptions();
      renderMaterials();
    } catch (e) {
      console.error(e);
      alert('옵션 수정 실패');
    }
  }

  async function deleteOption(type, optionId) {
    if (!confirm('삭제할까요?')) return;

    try {
      await apiDelete(`/api/options/${type}/${optionId}`);
      await loadOptions();
      await loadMaterials();
      renderOptions();
      renderMaterials();
    } catch (e) {
      console.error(e);
      alert('옵션 삭제 실패');
    }
  }

  function renderWorkFormOptions() {
    renderSelectOptions(el.weather, state.options.weather, true);
    renderChipBox(el['crops-box'], state.options.crops, 'crops');
    renderChipBox(el['pests-box'], state.options.pests, 'pests');
    renderChipBox(el['machines-box'], state.options.machines, 'machines');

    if (el.material_unit) {
      el.material_unit.innerHTML = state.materialUnits.map(unit => `
        <option value="${escapeHtml(unit)}">${escapeHtml(unit)}</option>
      `).join('');
    }

    rebuildPlanTitleSelect(el['plan-search']?.value || '');
  }

  function renderSelectOptions(target, list, includeDefault = false) {
    if (!target) return;
    const current = target.value;
    target.innerHTML =
      (includeDefault ? `<option value="">선택</option>` : '') +
      (list || []).map(item => `<option value="${escapeHtml(item.name || '')}">${escapeHtml(item.name || '')}</option>`).join('');
    target.value = current || '';
  }

  function renderChipBox(target, list, groupName) {
    if (!target) return;
    const selectedValues = getSelectedChipValues(groupName);

    target.innerHTML = (list || []).map(item => {
      const name = item.name || '';
      const active = selectedValues.includes(name);
      return `
        <button type="button" class="chip ${active ? 'active' : ''}" data-chip-group="${escapeHtml(groupName)}" data-chip-value="${escapeHtml(name)}">
          ${escapeHtml(name)}
        </button>
      `;
    }).join('');

    target.querySelectorAll('[data-chip-group]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
      });
    });
  }

  function getSelectedChipValues(groupName) {
    return Array.from(document.querySelectorAll(`[data-chip-group="${groupName}"].active`))
      .map(node => node.dataset.chipValue || '')
      .filter(Boolean);
  }

  function setChipSelections(groupName, values) {
    const wanted = new Set((values || []).map(v => String(v).trim()).filter(Boolean));
    document.querySelectorAll(`[data-chip-group="${groupName}"]`).forEach(node => {
      node.classList.toggle('active', wanted.has(node.dataset.chipValue || ''));
    });
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

  function renderSelectedMaterialsDetailed() {
    if (!el['selected-materials-detailed']) return;

    el['selected-materials-detailed'].innerHTML =
      state.selectedMaterialsDetailed.map((m, idx) => `
        <div class="material-row">
          <span>${escapeHtml(m.name)}</span>
          <input type="number" value="${m.qty}" min="0" step="0.1" onchange="updateMaterialQty(${idx}, this.value)">
          <select onchange="updateMaterialMethod(${idx}, this.value)">
            <option value="현금" ${m.method === '현금' ? 'selected' : ''}>현금</option>
            <option value="계좌이체" ${m.method === '계좌이체' ? 'selected' : ''}>계좌이체</option>
            <option value="카드" ${m.method === '카드' ? 'selected' : ''}>카드</option>
            <option value="외상" ${m.method === '외상' ? 'selected' : ''}>외상</option>
          </select>
          <button type="button" class="btn" onclick="removeMaterial(${idx})">삭제</button>
        </div>
      `).join('');

    updateMoneySummary();
  }

  function updateMaterialQty(index, value) {
    if (!state.selectedMaterialsDetailed[index]) return;
    state.selectedMaterialsDetailed[index].qty = Number(value || 0);
    updateMoneySummary();
  }

  function updateMaterialMethod(index, value) {
    if (!state.selectedMaterialsDetailed[index]) return;
    state.selectedMaterialsDetailed[index].method = value || '현금';
    updateMoneySummary();
  }

  function removeMaterial(index) {
    state.selectedMaterialsDetailed.splice(index, 1);
    renderSelectedMaterialsDetailed();
  }

  function resetLaborRows() {
    if (!el['labor-rows-wrap']) el['labor-rows-wrap'].innerHTML = '';
  }

  function addLaborRow(data = null) {
    if (!el['labor-rows-wrap']) return;

    const row = document.createElement('div');
    row.className = 'labor-row';
    row.innerHTML = `
      <select class="labor-type">
        <option value="">구분</option>
        <option value="남자">남자</option>
        <option value="여자">여자</option>
        <option value="기타">기타</option>
      </select>
      <input type="number" class="labor-count" min="0" step="1" value="0" placeholder="인원수">
      <input type="number" class="labor-price" min="0" step="1000" value="0" placeholder="단가">
      <input type="number" class="labor-amount" min="0" step="1000" value="0" placeholder="금액" readonly>
      <select class="labor-method">
        <option value="현금">현금</option>
        <option value="계좌이체">계좌이체</option>
        <option value="카드">카드</option>
        <option value="외상">외상</option>
      </select>
      <div style="display:flex; gap:8px;">
        <input type="text" class="labor-note" placeholder="비고">
        <button type="button" class="btn labor-remove">삭제</button>
      </div>
    `;

    el['labor-rows-wrap'].appendChild(row);

    if (data) {
      row.querySelector('.labor-type').value = data.type || '';
      row.querySelector('.labor-count').value = Number(data.count || 0);
      row.querySelector('.labor-price').value = Number(data.price || 0);
      row.querySelector('.labor-method').value = data.method || '현금';
      row.querySelector('.labor-note').value = data.note || '';
    }

    const recalc = () => {
      const count = Number(row.querySelector('.labor-count').value || 0);
      const price = Number(row.querySelector('.labor-price').value || 0);
      row.querySelector('.labor-amount').value = count * price;
      updateMoneySummary();
    };

    row.querySelector('.labor-count').addEventListener('input', recalc);
    row.querySelector('.labor-price').addEventListener('input', recalc);
    row.querySelector('.labor-method').addEventListener('change', updateMoneySummary);
    row.querySelector('.labor-note').addEventListener('input', updateMoneySummary);
    row.querySelector('.labor-remove').addEventListener('click', () => {
      row.remove();
      updateMoneySummary();
    });

    recalc();
  }

  function getLaborRows() {
    return Array.from(document.querySelectorAll('.labor-row')).map(row => ({
      type: row.querySelector('.labor-type')?.value || '',
      count: Number(row.querySelector('.labor-count')?.value || 0),
      price: Number(row.querySelector('.labor-price')?.value || 0),
      amount: Number(row.querySelector('.labor-amount')?.value || 0),
      method: row.querySelector('.labor-method')?.value || '',
      note: row.querySelector('.labor-note')?.value || ''
    })).filter(row => row.amount > 0 || row.count > 0 || row.price > 0);
  }

  function getLaborTotal() {
    return getLaborRows().reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }

  function getMaterialTotal() {
    return (state.selectedMaterialsDetailed || []).reduce((sum, item) => {
      return sum + (Number(item.qty || 0) * Number(item.price || 0));
    }, 0);
  }

  function getOtherTotal() {
    return Number(el.other_cost?.value || 0);
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

  function toggleMoneyBox(show) {
    if (!el['money-box']) return;
    el['money-box'].classList.toggle('hidden', !show);
  }

  function resetMoneyFields() {
    if (el.has_money) el.has_money.checked = false;
    toggleMoneyBox(false);
    if (el.money_note) el.money_note.value = '';
    if (el.other_cost) el.other_cost.value = 0;
    updateMoneySummary();
  }

  function updateEndDateFromRepeatDays() {
    if (!el.start_date || !el.end_date || !el.repeat_days) return;

    const start = el.start_date.value;
    const repeatDays = Math.max(1, Number(el.repeat_days.value || 1));
    if (!start) {
      el.end_date.value = '';
      return;
    }

    const startDate = parseDate(start);
    if (!startDate) {
      el.end_date.value = '';
      return;
    }

    const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + repeatDays - 1);
    el.end_date.value = fmtDate(endDate);
  }

  function updateWorkHoursFromTime() {
    if (!el.start_time || !el.end_time || !el.work_hours) return;
    const start = el.start_time.value || '';
    const end = el.end_time.value || '';

    if (!start || !end) return;

    const startMinutes = parseTimeToMinutes(start);
    const endMinutes = parseTimeToMinutes(end);
    if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) return;

    let diff = endMinutes - startMinutes;
    if (diff < 0) diff += 24 * 60;

    el.work_hours.value = (diff / 60).toFixed(1).replace(/\.0$/, '');
  }

  function renderMoney() {
    if (!el['money-list']) return;

    const start = el['money-start']?.value || '';
    const end = el['money-end']?.value || '';
    const typeFilter = el['money-type-filter']?.value || '';
    const methodFilter = el['money-method-filter']?.value || '';

    let rows = [...(state.moneyRows || [])];

    if (start) rows = rows.filter(r => (r.date || '') >= start);
    if (end) rows = rows.filter(r => (r.date || '') <= end);
    if (typeFilter) rows = rows.filter(r => (r.type || '') === typeFilter);
    if (methodFilter) rows = rows.filter(r => (r.method || '') === methodFilter);

    const total = rows.reduce((sum, r) => sum + Number(r.total || 0), 0);
    const cash = rows
      .filter(r => ['현금', '계좌이체'].includes(r.method || ''))
      .reduce((sum, r) => sum + Number(r.total || 0), 0);
    const card = rows
      .filter(r => ['카드일시불', '카드할부', '외상', '카드'].includes(r.method || ''))
      .reduce((sum, r) => sum + Number(r.total || 0), 0);

    if (el['money-total']) el['money-total'].innerText = formatNumber(total);
    if (el['money-cash']) el['money-cash'].innerText = formatNumber(cash);
    if (el['money-card']) el['money-card'].innerText = formatNumber(card);

    el['money-list'].innerHTML = rows.length ? rows.map(r => `
      <tr>
        <td>${escapeHtml(r.date || '')}</td>
        <td>${escapeHtml(r.task_name || '')}</td>
        <td>${escapeHtml(r.type || '')}</td>
        <td>${formatNumber(r.total || 0)}</td>
        <td>${escapeHtml(r.method || '')}</td>
        <td>${escapeHtml(r.note || '')}</td>
      </tr>
    `).join('') : `
      <tr><td colspan="6" class="empty-msg">조회 결과가 없습니다.</td></tr>
    `;
  }

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

  function on(node, eventName, handler) {
    if (node) node.addEventListener(eventName, handler);
  }

  function addHidden(node) {
    if (node) node.classList.add('hidden');
  }

  function removeHidden(node) {
    if (node) node.classList.remove('hidden');
  }

  function fmtDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseDate(value) {
    if (!value) return null;
    const parts = String(value).split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function parseTimeToMinutes(value) {
    const parts = String(value || '').split(':').map(Number);
    if (parts.length !== 2 || parts.some(Number.isNaN)) return NaN;
    return parts[0] * 60 + parts[1];
  }

  function normalizePlanDate(value) {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = parseDate(value);
    return d ? fmtDate(d) : '';
  }

  function isDateInRange(targetDate, startDate, endDate) {
    const start = normalizePlanDate(startDate);
    const end = normalizePlanDate(endDate || startDate);
    return targetDate >= start && targetDate <= end;
  }

  function splitCsv(value) {
    return String(value || '').split(',').map(v => v.trim()).filter(Boolean);
  }

  function calcRepeatDays(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end) return 1;
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
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

  window.saveOption = saveOption;
  window.updateMaterialQty = updateMaterialQty;
  window.updateMaterialMethod = updateMaterialMethod;
  window.removeMaterial = removeMaterial;
})();
