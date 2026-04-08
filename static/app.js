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
    seasons: [],
    currentSeason: null,
    selectedSeasonId: 'current',
    editingSeasonId: null,
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
      'btn-prev-month', 'btn-next-month', 'calendar-title', 'calendar-grid',
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
      'backup-file-input', 'btn-import-old-db', 'backup-import-status',
      'works-season-filter', 'money-season-filter', 'season-form-title', 'season_name', 'season_start', 'season_end', 'season_note', 'season_is_current', 'btn-save-season', 'btn-cancel-season', 'season-list'
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
      renderCalendar();
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

    const ok = confirm('현재 작업일지/자재/옵션 데이터가 기존 DB 내용으로 교체됩니다. 계속할까요?');
    if (!ok) return;

    if (statusBox) statusBox.textContent = '가져오는 중...';

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
      const res = await fetch('/api/import_old_db', {
        method: 'POST',
        body: formData
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || '가져오기에 실패했습니다.');
      }

      await loadAll();
      await loadMoney();
      renderAll();
      renderCalendar();

      if (fileInput) fileInput.value = '';

      const summary = data.imported
        ? `가져오기 완료: 작업일지 ${formatNumber(data.imported.works || 0)}건 / 자재 ${formatNumber(data.imported.materials || 0)}건`
        : '가져오기 완료';

      if (statusBox) statusBox.textContent = summary;
      alert(summary);
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
      const qs = state.selectedSeasonId && state.selectedSeasonId !== 'all' ? `?season_id=${encodeURIComponent(state.selectedSeasonId)}` : '';
      state.works = await apiGet(`/api/works${qs}`);
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
      const qs = state.selectedSeasonId && state.selectedSeasonId !== 'all' ? `?season_id=${encodeURIComponent(state.selectedSeasonId)}` : '';
      state.moneyRows = await apiGet(`/api/money${qs}`);
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
    renderSeasonSelectors();
    renderSeasonList();
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
    }
  }

  function renderMenuState() {
    el.menuButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === state.currentPage);
    });
  }

  function renderSeasonSelectors() {
    const options = ['<option value="current">현재 시즌</option>']
      .concat(state.seasons.map(item => `<option value="${escapeHtml(String(item.id))}">${escapeHtml(item.season_name || '')} (${escapeHtml(item.start_date || '')} ~ ${escapeHtml(item.end_date || '')})${Number(item.is_current) === 1 ? ' *' : ''}</option>`));

    ['works-season-filter', 'money-season-filter'].forEach(id => {
      const node = el[id];
      if (!node) return;
      const currentValue = state.selectedSeasonId || 'current';
      node.innerHTML = options.join('');
      node.value = currentValue;
    });
  }

  function renderSeasonList() {
    if (!el['season-list']) return;
    if (!state.seasons.length) {
      el['season-list'].innerHTML = '<div class="empty-msg">등록된 시즌이 없습니다.</div>';
      return;
    }

    el['season-list'].innerHTML = state.seasons.map(item => `
      <div class="option-item">
        <span><strong>${escapeHtml(item.season_name || '')}</strong> (${escapeHtml(item.start_date || '')} ~ ${escapeHtml(item.end_date || '')})${Number(item.is_current) === 1 ? ' [현재]' : ''}${item.note ? ` / ${escapeHtml(item.note)}` : ''}</span>
        <div class="item-actions">
          <button class="btn" data-season-current="${escapeHtml(String(item.id))}">현재설정</button>
          <button class="btn" data-season-edit="${escapeHtml(String(item.id))}">수정</button>
          <button class="btn" data-season-delete="${escapeHtml(String(item.id))}">삭제</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('[data-season-current]').forEach(btn => {
      btn.addEventListener('click', () => setCurrentSeason(btn.dataset.seasonCurrent));
    });
    document.querySelectorAll('[data-season-edit]').forEach(btn => {
      btn.addEventListener('click', () => editSeason(btn.dataset.seasonEdit));
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
    const item = state.seasons.find(row => String(row.id) === String(seasonId));
    if (!item) return;
    state.editingSeasonId = Number(seasonId);
    if (el['season-form-title']) el['season-form-title'].textContent = '시즌 수정';
    if (el.season_name) el.season_name.value = item.season_name || '';
    if (el.season_start) el.season_start.value = item.start_date || '';
    if (el.season_end) el.season_end.value = item.end_date || '';
    if (el.season_note) el.season_note.value = item.note || '';
    if (el.season_is_current) el.season_is_current.checked = Number(item.is_current) === 1;
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
      if (payload.is_current) {
        state.selectedSeasonId = 'current';
        await loadWorks();
        await loadMoney();
      }
      renderSeasonSelectors();
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
      renderSeasonSelectors();
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
      if (String(state.selectedSeasonId) === String(seasonId)) {
        state.selectedSeasonId = 'current';
      }
      await loadSeasons();
      await loadWorks();
      await loadMoney();
      renderSeasonSelectors();
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

    el['calendar-grid'].innerHTML = html.join('');

    el['calendar-grid'].querySelectorAll('[data-date]').forEach(node => {
      node.addEventListener('click', () => {
        state.selectedDate = node.dataset.date;
        renderCalendar();
        openCalendarDetailModal(node.dataset.date);
      });
    });
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
        openWorkModalById(btn.dataset.workEdit);
      });
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
    if (el['plan-search']) el['plan-search'].value = '';
    if (el['plan-search-results']) el['plan-search-results'].innerHTML = '';
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
    if (el['plan-search']) el['plan-search'].value = '';
    if (el['plan-search-results']) el['plan-search-results'].innerHTML = '';
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
    if (current) el.plan_title.value = current;
  }

  function renderPlanSearchResults() {
    if (!el['plan-search-results']) return;
    const keyword = (el['plan-search']?.value || '').trim();
    const filtered = state.options.tasks
      .map(optionName)
      .filter(name => !keyword || name.includes(keyword))
      .slice(0, 30);

    el['plan-search-results'].innerHTML = filtered.map(name => `
      <button type="button" class="search-result-item" data-plan-pick="${escapeHtml(name)}">${escapeHtml(name)}</button>
    `).join('');

    el['plan-search-results'].querySelectorAll('[data-plan-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (el.plan_title) el.plan_title.value = btn.dataset.planPick || '';
      });
    });
  }

  async function savePlan() {
    const payload = {
      plan_date: el.plan_date?.value || '',
      title: el.plan_title?.value || '',
      details: el.plan_details?.value || '',
      status: el.plan_status?.value || 'planned'
    };

    if (!payload.plan_date || !payload.title) {
      alert('계획일과 계획 제목을 입력하세요.');
      return;
    }

    try {
      if (state.editingPlanId) {
        await apiPut(`/api/plans/${state.editingPlanId}`, payload);
      } else {
        await apiPost('/api/plans', payload);
      }
      await loadPlans();
      renderCalendar();
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
      closePlanModal();
    } catch (e) {
      console.error(e);
      alert('계획 저장 실패');
    }
  }

  async function editPlan(planId) {
    const plan = state.plans.find(item => String(item.id) === String(planId));
    if (!plan) return;
    openPlanModal(plan);
  }

  async function markPlanDone(planId) {
    const plan = state.plans.find(item => String(item.id) === String(planId));
    if (!plan) return;
    try {
      await apiPut(`/api/plans/${planId}`, {
        plan_date: plan.plan_date,
        title: plan.title,
        details: plan.details,
        status: 'done'
      });
      await loadPlans();
      renderCalendar();
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
    } catch (e) {
      console.error(e);
      alert('완료 처리 실패');
    }
  }

  async function deletePlan(planId) {
    if (!confirm('계획을 삭제할까요?')) return;
    try {
      await apiDelete(`/api/plans/${planId}`);
      await loadPlans();
      renderCalendar();
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
    } catch (e) {
      console.error(e);
      alert('계획 삭제 실패');
    }
  }

  function convertPlanToWork(planId) {
    const plan = state.plans.find(item => String(item.id) === String(planId));
    if (!plan) return;
    closePlanModal();
    openWorkModal();
    if (el.task_name) el.task_name.value = plan.title || '';
    if (el.memo) el.memo.value = plan.details || '';
    if (el.start_date) el.start_date.value = normalizePlanDate(plan.plan_date);
    if (el.repeat_days) el.repeat_days.value = 1;
    updateEndDateFromRepeatDays();
  }

  function openWorkModal() {
    state.editingWorkId = null;
    if (el['work-modal-title']) el['work-modal-title'].textContent = '새 작업 입력';
    resetWorkModal();
    if (state.selectedDate && el.start_date) {
      el.start_date.value = state.selectedDate;
      updateEndDateFromRepeatDays();
    }
    removeHidden(el['work-modal']);
  }

  function openWorkModalById(workId) {
    const work = state.works.find(item => String(item.id) === String(workId));
    if (!work) return;

    state.editingWorkId = Number(workId);
    if (el['work-modal-title']) el['work-modal-title'].textContent = '작업 수정';
    resetWorkModal();

    if (el.start_date) el.start_date.value = (work.start_date || '').slice(0, 10);
    if (el.end_date) el.end_date.value = (work.end_date || '').slice(0, 10);
    if (el.weather) el.weather.value = work.weather || '';
    if (el.task_name) el.task_name.value = work.task_name || '';
    if (el.work_hours) el.work_hours.value = work.work_hours || 0;

    const memo = parseMemo(work.memo);
    if (el.memo) el.memo.value = memo.memo_text || '';
    if (el.repeat_days) el.repeat_days.value = memo.repeat_days || calcRepeatDays(work.start_date, work.end_date);
    if (el.start_time) el.start_time.value = memo.start_time || '';
    if (el.end_time) el.end_time.value = memo.end_time || '';

    setChipSelections('crops', splitByComma(work.crops));
    setChipSelections('pests', splitByComma(work.pests));
    setChipSelections('machines', splitByComma(work.machines));

    state.selectedMaterialsDetailed = Array.isArray(memo.materials) ? memo.materials.map(item => ({
      id: item.id || '',
      name: item.name || '',
      unit: item.unit || '',
      price: Number(item.price || 0),
      qty: Number(item.qty || 0),
      method: item.method || ''
    })) : [];
    renderSelectedMaterials();

    resetLaborRows();
    const laborRows = Array.isArray(memo.labor_rows) ? memo.labor_rows : [];
    if (laborRows.length) {
      laborRows.forEach(addLaborRow);
    } else {
      addLaborRow();
    }

    const money = memo.money || {};
    if (el.has_money) el.has_money.checked = !!money.type;
    if (el.money_note) el.money_note.value = money.note || '';
    if (el.other_cost) el.other_cost.value = Number(money.other_total || 0);
    toggleMoneyBox(!!money.type);
    updateMoneySummary();

    removeHidden(el['work-modal']);
  }

  function closeWorkModal() {
    addHidden(el['work-modal']);
  }

  function resetWorkModal() {
    state.editingWorkId = null;
    if (el.start_date) el.start_date.value = fmtDate(new Date());
    if (el.repeat_days) el.repeat_days.value = 1;
    if (el.end_date) el.end_date.value = fmtDate(new Date());
    if (el.start_time) el.start_time.value = '';
    if (el.end_time) el.end_time.value = '';
    if (el.weather) el.weather.value = '';
    if (el.task_name) el.task_name.value = '';
    if (el.work_hours) el.work_hours.value = '';
    if (el.memo) el.memo.value = '';

    clearChipSelections('crops');
    clearChipSelections('pests');
    clearChipSelections('machines');

    state.selectedMaterialsDetailed = [];
    renderSelectedMaterials();

    resetLaborRows();
    addLaborRow();

    if (el.has_money) el.has_money.checked = false;
    if (el.money_note) el.money_note.value = '';
    if (el.other_cost) el.other_cost.value = 0;
    toggleMoneyBox(false);
    updateMoneySummary();
  }

  async function saveWork() {
    const laborRows = getLaborRows();
    const laborTotal = laborRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const materialTotal = state.selectedMaterialsDetailed.reduce((sum, row) => sum + (Number(row.qty || 0) * Number(row.price || 0)), 0);
    const otherTotal = Number(el.other_cost?.value || 0);
    const totalAmount = laborTotal + materialTotal + otherTotal;
    const hasMoney = !!el.has_money?.checked;

    let moneyType = '';
    if (laborTotal > 0 && materialTotal > 0) moneyType = '인건비+자재비';
    else if (laborTotal > 0) moneyType = '인건비';
    else if (materialTotal > 0) moneyType = '자재비';
    else if (otherTotal > 0) moneyType = '기타';

    const memoObj = {
      memo_text: el.memo?.value || '',
      repeat_days: Number(el.repeat_days?.value || 1),
      start_time: el.start_time?.value || '',
      end_time: el.end_time?.value || '',
      materials: state.selectedMaterialsDetailed,
      labor_rows: laborRows,
      work_hours: Number(el.work_hours?.value || 0),
      money: hasMoney ? {
        type: moneyType,
        total_amount: totalAmount,
        labor_total: laborTotal,
        material_total: materialTotal,
        other_total: otherTotal,
        method: '',
        note: el.money_note?.value || ''
      } : null
    };

    const payload = {
      start_date: el.start_date?.value || '',
      end_date: el.end_date?.value || '',
      weather: el.weather?.value || '',
      task_name: el.task_name?.value || '',
      crops: getSelectedChipValues('crops').join(','),
      pests: getSelectedChipValues('pests').join(','),
      machines: getSelectedChipValues('machines').join(','),
      work_hours: Number(el.work_hours?.value || 0),
      memo: JSON.stringify(memoObj)
    };

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
    } catch (e) {
      console.error(e);
      alert('작업 저장 실패');
    }
  }

  async function deleteWork(workId) {
    if (!confirm('작업을 삭제할까요?')) return;
    try {
      await apiDelete(`/api/works/${workId}`);
      await loadWorks();
      await loadMoney();
      renderWorks();
      renderCalendar();
      renderMoney();
      if (state.selectedDate) openCalendarDetailModal(state.selectedDate);
    } catch (e) {
      console.error(e);
      alert('작업 삭제 실패');
    }
  }

  function ensureWorksSearchBar() {
    const page = document.getElementById('page-works');
    if (!page) return;
    let box = document.getElementById('works-search-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'works-search-box';
      box.className = 'panel';
      box.style.marginBottom = '12px';
      box.innerHTML = `
        <input type="text" id="works-search-input" placeholder="작업내용, 작물, 병충해, 자재 검색">
      `;
      const list = document.getElementById('works-list');
      if (list) page.insertBefore(box, list);
      const input = document.getElementById('works-search-input');
      if (input) {
        input.addEventListener('input', (e) => {
          state.workSearchKeyword = e.target.value || '';
          renderWorks();
        });
      }
    }
    const input = document.getElementById('works-search-input');
    if (input) input.value = state.workSearchKeyword || '';
  }

  function renderWorks() {
    if (!el['works-list']) return;

    let works = [...state.works];
    const keyword = (state.workSearchKeyword || '').trim();
    if (keyword) {
      works = works.filter(item => {
        const memo = parseMemo(item.memo);
        const bag = [
          item.start_date, item.end_date, item.weather, item.task_name,
          item.crops, item.pests, item.machines,
          memo.memo_text, formatMaterials(memo.materials)
        ].join(' ');
        return bag.includes(keyword);
      });
    }

    if (!works.length) {
      el['works-list'].innerHTML = `<div class="empty-msg">표시할 작업일지가 없습니다.</div>`;
      return;
    }

    const grouped = {};
    works.forEach(item => {
      const key = (item.start_date || '').slice(0, 10);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    const html = Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => {
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

    el['works-list'].innerHTML = html;

    document.querySelectorAll('[data-work-edit]').forEach(btn => {
      btn.addEventListener('click', () => openWorkModalById(btn.dataset.workEdit));
    });
    document.querySelectorAll('[data-work-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
    });
  }

  function renderWorkCard(item) {
    const memo = parseMemo(item.memo);
    const money = memo.money || {};
    return `
      <div class="work-card">
        <div class="work-card-title">${escapeHtml(item.task_name || '')}</div>
        <div>기간: ${escapeHtml((item.start_date || '').slice(0, 10))} ~ ${escapeHtml((item.end_date || '').slice(0, 10))}</div>
        <div>날씨: ${escapeHtml(item.weather || '')}</div>
        <div>작물: ${escapeHtml(item.crops || '')}</div>
        <div>병충해: ${escapeHtml(item.pests || '')}</div>
        <div>사용기계: ${escapeHtml(item.machines || '')}</div>
        <div>사용자재: ${escapeHtml(formatMaterials(memo.materials))}</div>
        <div>작업시간: ${formatNumber(item.work_hours || 0)}시간</div>
        <div>인건비: ${formatNumber(money.labor_total || 0)}원</div>
        <div>자재비: ${formatNumber(money.material_total || 0)}원</div>
        <div>비고: ${escapeHtml(memo.memo_text || '')}</div>
        <div class="item-actions">
          <button class="btn" data-work-edit="${escapeHtml(String(item.id))}">수정</button>
          <button class="btn" data-work-delete="${escapeHtml(String(item.id))}">삭제</button>
        </div>
      </div>
    `;
  }

  function renderMaterials() {
    if (!el['materials-list']) return;
    const withStock = state.materials.filter(item => Number(item.stock_qty || 0) > 0);
    const withoutStock = state.materials.filter(item => Number(item.stock_qty || 0) <= 0);

    el['materials-list'].innerHTML = `
      <div class="grid three" style="grid-template-columns:1fr 1fr;">
        <div class="panel">
          <h3>재고 있음</h3>
          ${withStock.length ? withStock.map(renderMaterialItem).join('') : '<div class="empty-msg">없음</div>'}
        </div>
        <div class="panel">
          <h3>재고 없음</h3>
          ${withoutStock.length ? withoutStock.map(renderMaterialItem).join('') : '<div class="empty-msg">없음</div>'}
        </div>
      </div>
    `;

    document.querySelectorAll('[data-material-edit]').forEach(btn => {
      btn.addEventListener('click', () => openMaterialModalById(btn.dataset.materialEdit));
    });
    document.querySelectorAll('[data-material-delete]').forEach(btn => {
      btn.addEventListener('click', () => deleteMaterial(btn.dataset.materialDelete));
    });
  }

  function renderMaterialItem(item) {
    return `
      <div class="option-item">
        <span>${escapeHtml(item.name || '')} / ${escapeHtml(item.unit || '')} / 재고 ${formatNumber(item.stock_qty || 0)} / 단가 ${formatNumber(item.unit_price || 0)}</span>
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
    if (el.material_unit) el.material_unit.value = state.materialUnits[0] || '';
    if (el.material_stock) el.material_stock.value = 0;
    if (el.material_price) el.material_price.value = 0;
    if (el.material_memo) el.material_memo.value = '';
    if (el['material-search-keyword']) el['material-search-keyword'].value = '';
    if (el['material-search-box']) el['material-search-box'].innerHTML = '';
    removeHidden(el['material-modal']);
  }

  function openMaterialModalById(materialId) {
    const item = state.materials.find(row => String(row.id) === String(materialId));
    if (!item) return;
    state.editingMaterialId = Number(materialId);
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

  function renderMaterialPickerResults(keyword) {
    if (!el['material-search-box']) return;
    const q = (keyword || '').trim();
    const list = state.materials.filter(item => !q || (item.name || '').includes(q)).slice(0, 30);

    el['material-search-box'].innerHTML = list.map(item => `
      <button type="button" class="search-result-item" data-material-select="${escapeHtml(String(item.id))}">
        ${escapeHtml(item.name || '')} / ${formatNumber(item.stock_qty || 0)}${escapeHtml(item.unit || '')}
      </button>
    `).join('');

    el['material-search-box'].querySelectorAll('[data-material-select]').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = state.materials.find(row => String(row.id) === String(btn.dataset.materialSelect));
        if (!item) return;
        if (el.material_name) el.material_name.value = item.name || '';
        if (el.material_unit) el.material_unit.value = item.unit || '';
        if (el.material_price) el.material_price.value = item.unit_price || 0;
      });
    });
  }

  async function saveMaterial() {
    const payload = {
      name: el.material_name?.value || '',
      unit: el.material_unit?.value || '',
      stock_qty: Number(el.material_stock?.value || 0),
      unit_price: Number(el.material_price?.value || 0),
      memo: el.material_memo?.value || ''
    };

    if (!payload.name.trim()) {
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
    if (!confirm('자재를 삭제할까요?')) return;
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
    renderOptionBox('weather', 'options-weather');
    renderOptionBox('crops', 'options-crops');
    renderOptionBox('tasks', 'options-tasks');
    renderOptionBox('pests', 'options-pests');
    renderOptionBox('machines', 'options-machines');
    renderWeatherOptions();
    renderChipOptions('crops', 'crops-box');
    renderChipOptions('pests', 'pests-box');
    renderChipOptions('machines', 'machines-box');
    renderMaterialUnitOptions();
    renderPlanTitleOptions();
  }

  function renderOptionBox(type, targetId) {
    const target = el[targetId];
    if (!target) return;
    target.innerHTML = state.options[type].map(item => {
      const name = optionName(item);
      return `
        <div class="option-item">
          <span>${escapeHtml(name)}</span>
          <div class="item-actions">
            <button class="btn" data-option-edit="${escapeHtml(type)}|${escapeHtml(String(item.id))}">수정</button>
            <button class="btn" data-option-delete="${escapeHtml(type)}|${escapeHtml(String(item.id))}">삭제</button>
          </div>
        </div>
      `;
    }).join('');

    target.querySelectorAll('[data-option-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [typeName, id] = (btn.dataset.optionEdit || '').split('|');
        editOption(typeName, id);
      });
    });

    target.querySelectorAll('[data-option-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [typeName, id] = (btn.dataset.optionDelete || '').split('|');
        deleteOption(typeName, id);
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
      renderOptions();
    } catch (e) {
      console.error(e);
      alert('옵션 저장 실패');
    }
  }

  async function editOption(type, id) {
    const item = state.options[type].find(row => String(row.id) === String(id));
    if (!item) return;
    const current = optionName(item);
    const next = prompt('수정할 이름', current);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) return;

    try {
      await apiPut(`/api/options/${type}/${id}`, { name: trimmed });
      await loadOptions();
      await loadMaterials();
      renderOptions();
      renderMaterials();
    } catch (e) {
      console.error(e);
      alert('옵션 수정 실패');
    }
  }

  async function deleteOption(type, id) {
    if (!confirm('삭제할까요?')) return;

    try {
      await apiDelete(`/api/options/${type}/${id}`);
      await loadOptions();
      await loadMaterials();
      renderOptions();
      renderMaterials();
    } catch (e) {
      console.error(e);
      alert('옵션 삭제 실패');
    }
  }

  function renderWeatherOptions() {
    if (!el.weather) return;
    const current = el.weather.value || '';
    el.weather.innerHTML = `<option value="">선택</option>` + state.options.weather.map(item => {
      const name = optionName(item);
      return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }).join('');
    if (current) el.weather.value = current;
  }

  function renderMaterialUnitOptions() {
    if (!el.material_unit) return;
    const current = el.material_unit.value || '';
    el.material_unit.innerHTML = state.materialUnits.map(unit => `<option value="${escapeHtml(unit)}">${escapeHtml(unit)}</option>`).join('');
    if (current) el.material_unit.value = current;
  }

  function renderSelectedMaterials() {
    if (!el['selected-materials-detailed']) return;
    el['selected-materials-detailed'].innerHTML = state.selectedMaterialsDetailed.map((item, idx) => `
      <div class="material-row">
        <span>${escapeHtml(item.name || '')}</span>
        <input type="number" value="${Number(item.qty || 0)}" min="0" step="0.1" data-material-qty="${idx}">
        <span>${escapeHtml(item.unit || '')}</span>
        <span>${formatNumber((Number(item.qty || 0) * Number(item.price || 0)) || 0)}원</span>
        <button type="button" class="btn" data-material-remove="${idx}">삭제</button>
      </div>
    `).join('');

    document.querySelectorAll('[data-material-qty]').forEach(node => {
      node.addEventListener('input', () => {
        const idx = Number(node.dataset.materialQty);
        if (state.selectedMaterialsDetailed[idx]) {
          state.selectedMaterialsDetailed[idx].qty = Number(node.value || 0);
          updateMoneySummary();
          renderSelectedMaterials();
        }
      });
    });

    document.querySelectorAll('[data-material-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.selectedMaterialsDetailed.splice(Number(btn.dataset.materialRemove), 1);
        renderSelectedMaterials();
        updateMoneySummary();
      });
    });
  }

  function resetLaborRows() {
    if (el['labor-rows-wrap']) el['labor-rows-wrap'].innerHTML = '';
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
      <input type="number" class="labor-count" min="0" value="0" placeholder="인원">
      <input type="number" class="labor-price" min="0" value="0" placeholder="단가">
      <input type="number" class="labor-amount" min="0" value="0" placeholder="금액" readonly>
      <select class="labor-method">
        <option value="">결제방식</option>
        <option value="현금">현금</option>
        <option value="계좌이체">계좌이체</option>
        <option value="카드">카드</option>
        <option value="외상">외상</option>
      </select>
      <input type="text" class="labor-note" placeholder="비고">
      <button type="button" class="btn labor-remove">삭제</button>
    `;
    el['labor-rows-wrap'].appendChild(row);

    const type = row.querySelector('.labor-type');
    const count = row.querySelector('.labor-count');
    const price = row.querySelector('.labor-price');
    const amount = row.querySelector('.labor-amount');
    const method = row.querySelector('.labor-method');
    const note = row.querySelector('.labor-note');

    if (data) {
      type.value = data.type || '';
      count.value = Number(data.count || 0);
      price.value = Number(data.price || 0);
      amount.value = Number(data.amount || 0);
      method.value = data.method || '';
      note.value = data.note || '';
    }

    const calc = () => {
      amount.value = Number(count.value || 0) * Number(price.value || 0);
      updateMoneySummary();
    };

    count.addEventListener('input', calc);
    price.addEventListener('input', calc);
    method.addEventListener('change', updateMoneySummary);
    row.querySelector('.labor-remove').addEventListener('click', () => {
      row.remove();
      updateMoneySummary();
    });

    calc();
  }

  function getLaborRows() {
    return Array.from(document.querySelectorAll('.labor-row')).map(row => ({
      type: row.querySelector('.labor-type')?.value || '',
      count: Number(row.querySelector('.labor-count')?.value || 0),
      price: Number(row.querySelector('.labor-price')?.value || 0),
      amount: Number(row.querySelector('.labor-amount')?.value || 0),
      method: row.querySelector('.labor-method')?.value || '',
      note: row.querySelector('.labor-note')?.value || ''
    })).filter(row => row.count > 0 || row.price > 0 || row.amount > 0 || row.note);
  }

  function updateMoneySummary() {
    const laborTotal = getLaborRows().reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const materialTotal = state.selectedMaterialsDetailed.reduce((sum, row) => sum + (Number(row.qty || 0) * Number(row.price || 0)), 0);
    const otherTotal = Number(el.other_cost?.value || 0);
    const totalAmount = laborTotal + materialTotal + otherTotal;

    if (el.money_labor_total) el.money_labor_total.innerText = formatNumber(laborTotal);
    if (el.money_material_total) el.money_material_total.innerText = formatNumber(materialTotal);
    if (el.money_total_amount) el.money_total_amount.innerText = formatNumber(totalAmount);
  }

  function toggleMoneyBox(show) {
    if (!el['money-box']) return;
    el['money-box'].classList.toggle('hidden', !show);
  }

  function updateEndDateFromRepeatDays() {
    const start = el.start_date?.value || '';
    const repeatDays = Math.max(1, Number(el.repeat_days?.value || 1));
    if (!start || !el.end_date) return;
    const base = new Date(start);
    if (Number.isNaN(base.getTime())) return;
    base.setDate(base.getDate() + repeatDays - 1);
    el.end_date.value = fmtDate(base);
  }

  function updateWorkHoursFromTime() {
    const start = el.start_time?.value || '';
    const end = el.end_time?.value || '';
    if (!start || !end || !el.work_hours) return;

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    if ([sh, sm, eh, em].some(v => Number.isNaN(v))) return;

    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (endMin < startMin) endMin += 24 * 60;

    const hours = (endMin - startMin) / 60;
    el.work_hours.value = hours.toFixed(1).replace(/\.0$/, '');
  }

  function renderChipOptions(type, targetId) {
    const container = el[targetId];
    if (!container) return;
    const currentSelected = getSelectedChipValues(type);
    container.innerHTML = state.options[type].map(item => {
      const name = optionName(item);
      const active = currentSelected.includes(name) ? 'active' : '';
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
      return materials.map(item => {
        if (!item || typeof item !== 'object') return '';
        const qty = Number(item.qty || 0);
        return `${item.name || ''}${qty ? ` ${qty}${item.unit || ''}` : ''}`.trim();
      }).filter(Boolean).join(', ');
    }
    return String(materials || '');
  }

  function optionName(item) {
    return item?.name || item?.항목 || item?.이름 || '';
  }

  function normalizeOptions(list) {
    return (list || []).map(item => ({
      id: item.id,
      name: optionName(item)
    })).filter(item => item.name);
  }

  function splitByComma(value) {
    return String(value || '').split(',').map(v => v.trim()).filter(Boolean);
  }

  function calcRepeatDays(startDate, endDate) {
    const start = new Date(startDate || '');
    const end = new Date(endDate || startDate || '');
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
    return Math.max(1, Math.floor((end - start) / 86400000) + 1);
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
})();
