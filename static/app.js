// static/app.js
// 전체 교체본
// 기준: 기존 Flask / DB 구조 유지, app.js에서 UI 동작 중심 처리
// 포함 내용:
// - 좌측 메뉴 전환
// - 작업달력 렌더링
// - 작업계획 CRUD
// - 작업실적(작업일지) 조회/입력/수정/삭제
// - 작업일지 카드형 표시
// - 작업일지 검색(버튼 방식)
// - 사용자재 검색형 다중선택 + 수량 입력형 + 단위 자동표시/수정 가능
// - 자재관리 화면 (재고 있음 / 없음 분리)
// - 옵션관리 기본 CRUD
//
// 주의:
// 1) index.html 안에 아래 id들이 존재해야 정상 동작합니다.
// 2) 서버 API는 다음을 사용한다고 가정합니다.
//    /api/works, /api/plans, /api/materials, /api/options
// 3) works의 확장 데이터는 memo JSON 문자열에 저장합니다.
//
// 필요한 주요 DOM id 예시:
// menuCalendar, menuWorklog, menuMaterials, menuMoney, menuOptions, menuExcel, menuBackup
// pageCalendar, pageWorklog, pageMaterials, pageMoney, pageOptions, pageExcel, pageBackup
// calendarMonthLabel, calendarPrevBtn, calendarNextBtn, calendarGrid, calendarSidePanel
// worklogSearchInput, worklogSearchBtn, worklogSearchResetBtn, worklogAddBtn, worklogList
// workModal, workModalTitle, workForm, workId
// workStartDate, workEndDate, workWeather, workTaskName, workHours, workMemo
// cropOptionsWrap, pestOptionsWrap, machineOptionsWrap
// materialSearchInput, materialSearchResults, selectedMaterialsWrap
// laborRowsWrap, addLaborRowBtn
// materialPageSearchInput, materialPageSearchBtn, materialPageSearchResetBtn, materialsSummary, materialsInStockWrap, materialsOutStockWrap, materialAddBtn
// optionTypeTabs, optionListWrap, optionAddBtn

(function () {
  'use strict';

  const state = {
    currentPage: 'calendar',
    currentMonth: new Date(),
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
    worklogKeyword: '',
    materialKeyword: '',
    selectedWorkDate: null,
    editingWorkId: null,
    editingPlanId: null,
    workMaterialSelections: [],
    currentOptionType: 'weather'
  };

  const el = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    bindElements();
    bindMenu();
    bindCalendarControls();
    bindWorklogControls();
    bindMaterialControls();
    bindOptionControls();
    bindModalControls();

    await loadInitialData();
    switchPage('calendar');
  }

  function bindElements() {
    const ids = [
      'menuCalendar', 'menuWorklog', 'menuMaterials', 'menuMoney', 'menuOptions', 'menuExcel', 'menuBackup',
      'pageCalendar', 'pageWorklog', 'pageMaterials', 'pageMoney', 'pageOptions', 'pageExcel', 'pageBackup',
      'calendarMonthLabel', 'calendarPrevBtn', 'calendarNextBtn', 'calendarGrid', 'calendarSidePanel',
      'worklogSearchInput', 'worklogSearchBtn', 'worklogSearchResetBtn', 'worklogAddBtn', 'worklogList',
      'workModal', 'workModalTitle', 'workForm', 'workId', 'workStartDate', 'workEndDate', 'workWeather', 'workTaskName', 'workHours', 'workMemo',
      'cropOptionsWrap', 'pestOptionsWrap', 'machineOptionsWrap',
      'materialSearchInput', 'materialSearchResults', 'selectedMaterialsWrap',
      'laborRowsWrap', 'addLaborRowBtn', 'workSaveBtn', 'workCloseBtn',
      'materialPageSearchInput', 'materialPageSearchBtn', 'materialPageSearchResetBtn', 'materialsSummary', 'materialsInStockWrap', 'materialsOutStockWrap', 'materialAddBtn',
      'optionTypeTabs', 'optionListWrap', 'optionAddBtn'
    ];

    ids.forEach(id => {
      el[id] = document.getElementById(id);
    });
  }

  function bindMenu() {
    safeBind(el.menuCalendar, 'click', () => switchPage('calendar'));
    safeBind(el.menuWorklog, 'click', () => switchPage('worklog'));
    safeBind(el.menuMaterials, 'click', () => switchPage('materials'));
    safeBind(el.menuMoney, 'click', () => switchPage('money'));
    safeBind(el.menuOptions, 'click', () => switchPage('options'));
    safeBind(el.menuExcel, 'click', () => switchPage('excel'));
    safeBind(el.menuBackup, 'click', () => switchPage('backup'));
  }

  function bindCalendarControls() {
    safeBind(el.calendarPrevBtn, 'click', () => {
      state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
      renderCalendar();
    });

    safeBind(el.calendarNextBtn, 'click', () => {
      state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
      renderCalendar();
    });
  }

  function bindWorklogControls() {
    safeBind(el.worklogSearchBtn, 'click', () => {
      state.worklogKeyword = (el.worklogSearchInput?.value || '').trim();
      renderWorklog();
    });

    safeBind(el.worklogSearchResetBtn, 'click', () => {
      if (el.worklogSearchInput) el.worklogSearchInput.value = '';
      state.worklogKeyword = '';
      renderWorklog();
    });

    safeBind(el.worklogAddBtn, 'click', () => openWorkModal());

    safeBind(el.materialSearchInput, 'input', () => renderMaterialSearchResults(el.materialSearchInput.value || ''));

    safeBind(el.addLaborRowBtn, 'click', () => addLaborRow());

    safeBind(el.workForm, 'submit', async (e) => {
      e.preventDefault();
      await saveWork();
    });
  }

  function bindMaterialControls() {
    safeBind(el.materialPageSearchBtn, 'click', () => {
      state.materialKeyword = (el.materialPageSearchInput?.value || '').trim();
      renderMaterialsPage();
    });

    safeBind(el.materialPageSearchResetBtn, 'click', () => {
      if (el.materialPageSearchInput) el.materialPageSearchInput.value = '';
      state.materialKeyword = '';
      renderMaterialsPage();
    });

    safeBind(el.materialAddBtn, 'click', async () => {
      const name = prompt('자재명');
      if (!name) return;
      const stockQty = prompt('초기 재고', '0');
      if (stockQty === null) return;
      const unitPrice = prompt('단가', '0');
      if (unitPrice === null) return;

      try {
        await api.post('/api/materials', {
          name: name.trim(),
          stock_qty: toNumber(stockQty),
          unit_price: toNumber(unitPrice)
        });
        await reloadMaterials();
        await reloadOptions();
        renderMaterialsPage();
      } catch (err) {
        alert('자재 추가 중 오류가 발생했습니다.');
        console.error(err);
      }
    });
  }

  function bindOptionControls() {
    if (el.optionTypeTabs) {
      el.optionTypeTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-option-type]');
        if (!btn) return;
        state.currentOptionType = btn.dataset.optionType;
        renderOptionTabsActive();
        renderOptionsPage();
      });
    }

    safeBind(el.optionAddBtn, 'click', async () => {
      const label = optionTypeLabel(state.currentOptionType);
      const value = prompt(`${label} 추가`);
      if (!value || !value.trim()) return;

      try {
        await api.post(`/api/options/${state.currentOptionType}`, { name: value.trim() });
        await reloadOptions();
        renderAllOptionBasedUI();
        renderOptionsPage();
      } catch (err) {
        alert('옵션 추가 중 오류가 발생했습니다.');
        console.error(err);
      }
    });
  }

  function bindModalControls() {
    safeBind(el.workCloseBtn, 'click', closeWorkModal);

    safeBind(el.workModal, 'click', (e) => {
      if (e.target === el.workModal) closeWorkModal();
    });
  }

  async function loadInitialData() {
    await Promise.all([
      reloadWorks(),
      reloadPlans(),
      reloadMaterials(),
      reloadOptions()
    ]);

    renderAllOptionBasedUI();
    renderCalendar();
    renderWorklog();
    renderMaterialsPage();
    renderOptionsPage();
  }

  async function reloadWorks() {
    try {
      state.works = await api.get('/api/works');
    } catch (err) {
      state.works = [];
      console.error(err);
    }
  }

  async function reloadPlans() {
    try {
      state.plans = await api.get('/api/plans');
    } catch (err) {
      state.plans = [];
      console.error(err);
    }
  }

  async function reloadMaterials() {
    try {
      state.materials = await api.get('/api/materials');
    } catch (err) {
      state.materials = [];
      console.error(err);
    }
  }

  async function reloadOptions() {
    try {
      const data = await api.get('/api/options');
      state.options.weather = normalizeOptions(data.weather || data.options_weather || []);
      state.options.crops = normalizeOptions(data.crops || data.options_crops || []);
      state.options.tasks = normalizeOptions(data.tasks || data.options_tasks || []);
      state.options.pests = normalizeOptions(data.pests || data.options_pests || []);
      state.options.materials = normalizeOptions(data.materials || data.options_materials || []);
      state.options.machines = normalizeOptions(data.machines || data.options_machines || []);
    } catch (err) {
      console.error(err);
      state.options = { weather: [], crops: [], tasks: [], pests: [], materials: [], machines: [] };
    }
  }

  function switchPage(page) {
    state.currentPage = page;

    const pageMap = {
      calendar: el.pageCalendar,
      worklog: el.pageWorklog,
      materials: el.pageMaterials,
      money: el.pageMoney,
      options: el.pageOptions,
      excel: el.pageExcel,
      backup: el.pageBackup
    };

    Object.entries(pageMap).forEach(([key, node]) => {
      if (!node) return;
      node.style.display = key === page ? '' : 'none';
    });

    const menuMap = {
      calendar: el.menuCalendar,
      worklog: el.menuWorklog,
      materials: el.menuMaterials,
      money: el.menuMoney,
      options: el.menuOptions,
      excel: el.menuExcel,
      backup: el.menuBackup
    };

    Object.entries(menuMap).forEach(([key, node]) => {
      if (!node) return;
      node.classList.toggle('active', key === page);
    });

    if (page === 'calendar') renderCalendar();
    if (page === 'worklog') renderWorklog();
    if (page === 'materials') renderMaterialsPage();
    if (page === 'options') renderOptionsPage();
  }

  function renderCalendar() {
    if (!el.calendarGrid) return;

    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    if (el.calendarMonthLabel) {
      el.calendarMonthLabel.textContent = `${year}년 ${month + 1}월`;
    }

    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push(`<div class="calendar-cell empty"></div>`);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(new Date(year, month, day));
      const dayPlans = state.plans.filter(p => normalizePlanDate(p.plan_date) === dateStr);
      const dayWorks = state.works.filter(w => isDateInWorkRange(dateStr, w.start_date, w.end_date));

      cells.push(`
        <div class="calendar-cell ${state.selectedWorkDate === dateStr ? 'selected' : ''}" data-date="${escapeHtml(dateStr)}">
          <div class="calendar-day-num">${day}</div>
          <div class="calendar-day-counts">
            <div class="plan-count">계획 ${dayPlans.length}</div>
            <div class="work-count">실적 ${dayWorks.length}</div>
          </div>
        </div>
      `);
    }

    el.calendarGrid.innerHTML = cells.join('');

    Array.from(el.calendarGrid.querySelectorAll('.calendar-cell[data-date]')).forEach(node => {
      node.addEventListener('click', () => {
        state.selectedWorkDate = node.dataset.date;
        renderCalendar();
        renderCalendarSidePanel();
      });
    });

    renderCalendarSidePanel();
  }

  function renderCalendarSidePanel() {
    if (!el.calendarSidePanel) return;

    const date = state.selectedWorkDate;
    if (!date) {
      el.calendarSidePanel.innerHTML = `
        <div class="empty-panel">날짜를 선택하면 계획과 실적을 볼 수 있습니다.</div>
      `;
      return;
    }

    const dayPlans = state.plans.filter(p => normalizePlanDate(p.plan_date) === date);
    const dayWorks = state.works.filter(w => isDateInWorkRange(date, w.start_date, w.end_date));

    el.calendarSidePanel.innerHTML = `
      <div class="panel-header">
        <h3>${escapeHtml(date)}</h3>
        <div class="panel-actions">
          <button type="button" id="addPlanBtn">계획추가</button>
          <button type="button" id="addWorkFromDateBtn">실적입력</button>
        </div>
      </div>

      <div class="calendar-panel-section">
        <h4>작업계획</h4>
        <div class="calendar-plan-list">
          ${dayPlans.length ? dayPlans.map(renderPlanItem).join('') : '<div class="empty-line">등록된 계획 없음</div>'}
        </div>
      </div>

      <div class="calendar-panel-section">
        <h4>작업실적</h4>
        <div class="calendar-work-list">
          ${dayWorks.length ? dayWorks.map(renderMiniWorkItem).join('') : '<div class="empty-line">등록된 실적 없음</div>'}
        </div>
      </div>
    `;

    const addPlanBtn = document.getElementById('addPlanBtn');
    const addWorkFromDateBtn = document.getElementById('addWorkFromDateBtn');
    safeBind(addPlanBtn, 'click', () => createPlanPrompt(date));
    safeBind(addWorkFromDateBtn, 'click', () => openWorkModal({ start_date: date, end_date: date }));

    Array.from(el.calendarSidePanel.querySelectorAll('[data-plan-edit]')).forEach(btn => {
      btn.addEventListener('click', () => editPlanPrompt(btn.dataset.planEdit));
    });
    Array.from(el.calendarSidePanel.querySelectorAll('[data-plan-delete]')).forEach(btn => {
      btn.addEventListener('click', () => deletePlan(btn.dataset.planDelete));
    });
    Array.from(el.calendarSidePanel.querySelectorAll('[data-plan-done]')).forEach(btn => {
      btn.addEventListener('click', () => markPlanDone(btn.dataset.planDone));
    });
    Array.from(el.calendarSidePanel.querySelectorAll('[data-plan-to-work]')).forEach(btn => {
      btn.addEventListener('click', () => convertPlanToWork(btn.dataset.planToWork));
    });
    Array.from(el.calendarSidePanel.querySelectorAll('[data-mini-work-edit]')).forEach(btn => {
      btn.addEventListener('click', () => {
        const work = state.works.find(w => String(w.id) === String(btn.dataset.miniWorkEdit));
        if (work) openWorkModal(work);
      });
    });
    Array.from(el.calendarSidePanel.querySelectorAll('[data-mini-work-delete]')).forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.miniWorkDelete));
    });
  }

  function renderPlanItem(plan) {
    const statusMap = { planned: '계획', done: '완료', cancelled: '취소' };
    return `
      <div class="plan-item">
        <div class="plan-main">
          <div class="plan-title">${escapeHtml(plan.title || '')}</div>
          <div class="plan-meta">상태: ${statusMap[plan.status] || plan.status || '계획'}</div>
          <div class="plan-details">${escapeHtml(plan.details || '')}</div>
        </div>
        <div class="plan-actions">
          <button type="button" data-plan-done="${escapeHtml(String(plan.id))}">완료</button>
          <button type="button" data-plan-to-work="${escapeHtml(String(plan.id))}">실적전환</button>
          <button type="button" data-plan-edit="${escapeHtml(String(plan.id))}">수정</button>
          <button type="button" data-plan-delete="${escapeHtml(String(plan.id))}">삭제</button>
        </div>
      </div>
    `;
  }

  function renderMiniWorkItem(work) {
    const meta = parseWorkMemo(work.memo);
    return `
      <div class="mini-work-item">
        <div class="mini-work-title">${escapeHtml(work.task_name || '')}</div>
        <div class="mini-work-sub">작물: ${escapeHtml(work.crops || '')}</div>
        <div class="mini-work-sub">자재: ${escapeHtml(joinMaterialNames(meta.materials))}</div>
        <div class="mini-work-actions">
          <button type="button" data-mini-work-edit="${escapeHtml(String(work.id))}">수정</button>
          <button type="button" data-mini-work-delete="${escapeHtml(String(work.id))}">삭제</button>
        </div>
      </div>
    `;
  }

  async function createPlanPrompt(date) {
    const title = prompt('작업계획 제목');
    if (!title) return;
    const details = prompt('상세 내용', '') || '';

    try {
      await api.post('/api/plans', {
        plan_date: date,
        title: title.trim(),
        details,
        status: 'planned'
      });
      await reloadPlans();
      renderCalendar();
    } catch (err) {
      alert('계획 저장 중 오류가 발생했습니다.');
      console.error(err);
    }
  }

  async function editPlanPrompt(planId) {
    const plan = state.plans.find(p => String(p.id) === String(planId));
    if (!plan) return;

    const title = prompt('작업계획 제목', plan.title || '');
    if (title === null) return;
    const details = prompt('상세 내용', plan.details || '');
    if (details === null) return;
    const status = prompt('상태(planned / done / cancelled)', plan.status || 'planned');
    if (status === null) return;

    try {
      await api.put(`/api/plans/${plan.id}`, {
        plan_date: normalizePlanDate(plan.plan_date),
        title: title.trim(),
        details,
        status: status.trim()
      });
      await reloadPlans();
      renderCalendar();
    } catch (err) {
      alert('계획 수정 중 오류가 발생했습니다.');
      console.error(err);
    }
  }

  async function deletePlan(planId) {
    if (!confirm('이 계획을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/api/plans/${planId}`);
      await reloadPlans();
      renderCalendar();
    } catch (err) {
      alert('계획 삭제 중 오류가 발생했습니다.');
      console.error(err);
    }
  }

  async function markPlanDone(planId) {
    const plan = state.plans.find(p => String(p.id) === String(planId));
    if (!plan) return;

    try {
      await api.put(`/api/plans/${plan.id}`, {
        plan_date: normalizePlanDate(plan.plan_date),
        title: plan.title,
        details: plan.details || '',
        status: 'done'
      });
      await reloadPlans();
      renderCalendar();
    } catch (err) {
      alert('계획 상태 변경 중 오류가 발생했습니다.');
      console.error(err);
    }
  }

  function convertPlanToWork(planId) {
    const plan = state.plans.find(p => String(p.id) === String(planId));
    if (!plan) return;

    openWorkModal({
      start_date: normalizePlanDate(plan.plan_date),
      end_date: normalizePlanDate(plan.plan_date),
      task_name: plan.title || '',
      memo: safeJSONStringify({ from_plan_id: plan.id, plan_details: plan.details || '' })
    });
  }

  function renderWorklog() {
    if (!el.worklogList) return;

    const keyword = state.worklogKeyword.trim().toLowerCase();
    const filtered = state.works.filter(work => workMatchesKeyword(work, keyword));
    const grouped = groupWorksByDate(filtered);
    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    if (!dates.length) {
      el.worklogList.innerHTML = `<div class="empty-panel">표시할 작업일지가 없습니다.</div>`;
      return;
    }

    el.worklogList.innerHTML = dates.map(date => {
      const items = grouped[date];
      const singleClass = items.length === 1 ? 'single-card' : '';
      return `
        <section class="worklog-date-group">
          <div class="worklog-date-title">${escapeHtml(date)}</div>
          <div class="worklog-card-row ${singleClass}">
            ${items.map(renderWorkCard).join('')}
          </div>
        </section>
      `;
    }).join('');

    Array.from(el.worklogList.querySelectorAll('[data-work-edit]')).forEach(btn => {
      btn.addEventListener('click', () => {
        const work = state.works.find(w => String(w.id) === String(btn.dataset.workEdit));
        if (work) openWorkModal(work);
      });
    });

    Array.from(el.worklogList.querySelectorAll('[data-work-delete]')).forEach(btn => {
      btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
    });
  }

  function renderWorkCard(work) {
    const meta = parseWorkMemo(work.memo);
    const laborTotal = calculateLaborTotal(meta.labor_rows);

    return `
      <article class="worklog-card">
        <div class="worklog-card-header">
          <h3>${escapeHtml(work.task_name || '')}</h3>
          <div class="card-actions">
            <button type="button" data-work-edit="${escapeHtml(String(work.id))}">수정</button>
            <button type="button" data-work-delete="${escapeHtml(String(work.id))}">삭제</button>
          </div>
        </div>

        <div class="worklog-card-body">
          <div><strong>작물:</strong> ${escapeHtml(work.crops || '')}</div>
          <div><strong>날씨:</strong> ${escapeHtml(work.weather || '')}</div>
          <div><strong>병충해:</strong> ${escapeHtml(work.pests || '')}</div>
          <div><strong>자재:</strong> ${escapeHtml(formatMaterialsForDisplay(meta.materials))}</div>
          <div><strong>자재비:</strong> ${formatMoney(meta.material_cost_total || 0)}</div>
          <div><strong>기계:</strong> ${escapeHtml(work.machines || '')}</div>
          <div><strong>인건비:</strong> ${formatMoney(laborTotal)}</div>
          <div><strong>인력상세:</strong> ${escapeHtml(formatLaborRows(meta.labor_rows))}</div>
          <div><strong>작업시간:</strong> ${escapeHtml(work.work_hours || '')}</div>
          <div><strong>기간:</strong> ${escapeHtml(work.start_date || '')} ~ ${escapeHtml(work.end_date || '')}</div>
          <div><strong>비고:</strong> ${escapeHtml(extractDisplayMemo(work.memo))}</div>
        </div>
      </article>
    `;
  }

  function openWorkModal(work = null) {
    if (!el.workModal) return;

    state.editingWorkId = work && work.id ? work.id : null;
    state.workMaterialSelections = [];

    const meta = parseWorkMemo(work?.memo);
    if (Array.isArray(meta.materials)) {
      state.workMaterialSelections = meta.materials.map(item => ({
        name: item.name || '',
        qty: item.qty === 0 ? '0' : (item.qty ?? ''),
        unit: item.unit || materialUnitByName(item.name) || ''
      }));
    }

    if (el.workModalTitle) {
      el.workModalTitle.textContent = work ? '작업일지 수정' : '작업일지 입력';
    }
    if (el.workId) el.workId.value = work?.id || '';
    if (el.workStartDate) el.workStartDate.value = work?.start_date || todayStr();
    if (el.workEndDate) el.workEndDate.value = work?.end_date || work?.start_date || todayStr();
    if (el.workWeather) el.workWeather.value = work?.weather || '';
    if (el.workTaskName) el.workTaskName.value = work?.task_name || '';
    if (el.workHours) el.workHours.value = work?.work_hours || '';
    if (el.workMemo) el.workMemo.value = meta.memo_text || rawMemoFallback(work?.memo);

    renderWeatherOptionsSelect();
    renderCheckboxOptions(el.cropOptionsWrap, state.options.crops, parseCsvList(work?.crops));
    renderCheckboxOptions(el.pestOptionsWrap, state.options.pests, parseCsvList(work?.pests));
    renderCheckboxOptions(el.machineOptionsWrap, state.options.machines, parseCsvList(work?.machines));

    renderSelectedMaterials();
    renderMaterialSearchResults('');
    renderLaborRows(meta.labor_rows || []);

    el.workModal.style.display = 'flex';
  }

  function closeWorkModal() {
    if (!el.workModal) return;
    el.workModal.style.display = 'none';
    state.editingWorkId = null;
    state.workMaterialSelections = [];
    if (el.workForm) el.workForm.reset();
    if (el.materialSearchResults) el.materialSearchResults.innerHTML = '';
    if (el.selectedMaterialsWrap) el.selectedMaterialsWrap.innerHTML = '';
    if (el.laborRowsWrap) el.laborRowsWrap.innerHTML = '';
  }

  function renderWeatherOptionsSelect() {
    if (!el.workWeather) return;
    const currentValue = el.workWeather.value || '';
    el.workWeather.innerHTML = `
      <option value="">선택</option>
      ${state.options.weather.map(item => {
        const name = optionName(item);
        return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
      }).join('')}
    `;
    el.workWeather.value = currentValue;
  }

  function renderCheckboxOptions(container, items, selectedValues = []) {
    if (!container) return;
    const selectedSet = new Set(selectedValues || []);

    container.innerHTML = items.map(item => {
      const name = optionName(item);
      const id = `opt_${container.id}_${slugify(name)}`;
      return `
        <label class="check-chip" for="${escapeHtml(id)}">
          <input type="checkbox" id="${escapeHtml(id)}" value="${escapeHtml(name)}" ${selectedSet.has(name) ? 'checked' : ''}>
          <span>${escapeHtml(name)}</span>
        </label>
      `;
    }).join('');
  }

  function renderMaterialSearchResults(keyword) {
    if (!el.materialSearchResults) return;

    const q = (keyword || '').trim().toLowerCase();
    const selectedNames = new Set(state.workMaterialSelections.map(x => x.name));

    const matched = state.materials.filter(item => {
      const name = materialName(item).toLowerCase();
      return !selectedNames.has(materialName(item)) && (!q || name.includes(q));
    });

    if (!matched.length) {
      el.materialSearchResults.innerHTML = `<div class="empty-line">검색 결과 없음</div>`;
      return;
    }

    el.materialSearchResults.innerHTML = matched.map(item => {
      const name = materialName(item);
      const unit = materialUnit(item);
      return `
        <button type="button" class="material-search-item" data-material-add="${escapeHtml(name)}" data-material-unit="${escapeHtml(unit)}">
          <span class="name">${escapeHtml(name)}</span>
          <span class="unit">${escapeHtml(unit || '')}</span>
        </button>
      `;
    }).join('');

    Array.from(el.materialSearchResults.querySelectorAll('[data-material-add]')).forEach(btn => {
      btn.addEventListener('click', () => {
        addSelectedMaterial(btn.dataset.materialAdd, btn.dataset.materialUnit || '');
        if (el.materialSearchInput) el.materialSearchInput.value = '';
        renderMaterialSearchResults('');
      });
    });
  }

  function addSelectedMaterial(name, unit) {
    if (state.workMaterialSelections.some(x => x.name === name)) return;
    state.workMaterialSelections.push({ name, qty: '', unit: unit || materialUnitByName(name) || '' });
    renderSelectedMaterials();
  }

  function renderSelectedMaterials() {
    if (!el.selectedMaterialsWrap) return;

    if (!state.workMaterialSelections.length) {
      el.selectedMaterialsWrap.innerHTML = `<div class="empty-line">선택된 자재 없음</div>`;
      return;
    }

    el.selectedMaterialsWrap.innerHTML = state.workMaterialSelections.map((item, idx) => `
      <div class="selected-material-row">
        <div class="mat-name">${escapeHtml(item.name)}</div>
        <div class="mat-qty-wrap">
          <label>수량</label>
          <input type="number" step="0.01" min="0" inputmode="decimal" value="${escapeHtml(String(item.qty ?? ''))}" data-material-qty="${idx}">
        </div>
        <div class="mat-unit-wrap">
          <label>단위</label>
          <input type="text" value="${escapeHtml(item.unit || '')}" data-material-unit="${idx}">
        </div>
        <div class="mat-remove-wrap">
          <button type="button" data-material-remove="${idx}">X</button>
        </div>
      </div>
    `).join('');

    Array.from(el.selectedMaterialsWrap.querySelectorAll('[data-material-qty]')).forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.materialQty);
        state.workMaterialSelections[idx].qty = input.value;
      });
    });

    Array.from(el.selectedMaterialsWrap.querySelectorAll('[data-material-unit]')).forEach(input => {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.materialUnit);
        state.workMaterialSelections[idx].unit = input.value;
      });
    });

    Array.from(el.selectedMaterialsWrap.querySelectorAll('[data-material-remove]')).forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.materialRemove);
        state.workMaterialSelections.splice(idx, 1);
        renderSelectedMaterials();
        renderMaterialSearchResults(el.materialSearchInput?.value || '');
      });
    });
  }

  function renderLaborRows(rows = []) {
    if (!el.laborRowsWrap) return;
    el.laborRowsWrap.innerHTML = '';

    if (!rows.length) {
      addLaborRow();
      return;
    }

    rows.forEach(row => addLaborRow(row));
  }

  function addLaborRow(data = {}) {
    if (!el.laborRowsWrap) return;

    const row = document.createElement('div');
    row.className = 'labor-row';
    row.innerHTML = `
      <select class="labor-type">
        <option value="">유형</option>
        <option value="남자" ${data.type === '남자' ? 'selected' : ''}>남자</option>
        <option value="여자" ${data.type === '여자' ? 'selected' : ''}>여자</option>
        <option value="기타" ${data.type === '기타' ? 'selected' : ''}>기타</option>
      </select>
      <input type="number" class="labor-amount" placeholder="금액" step="1" min="0" value="${escapeHtml(String(data.amount ?? ''))}">
      <input type="text" class="labor-category" placeholder="구분" value="${escapeHtml(data.category || '')}">
      <input type="text" class="labor-note" placeholder="비고" value="${escapeHtml(data.note || '')}">
      <button type="button" class="labor-remove-btn">삭제</button>
    `;

    el.laborRowsWrap.appendChild(row);
    row.querySelector('.labor-remove-btn').addEventListener('click', () => row.remove());
  }

  async function saveWork() {
    try {
      const payload = collectWorkPayload();
      if (!payload) return;

      if (state.editingWorkId) {
        await api.put(`/api/works/${state.editingWorkId}`, payload);
      } else {
        await api.post('/api/works', payload);
      }

      await reloadWorks();
      renderWorklog();
      renderCalendar();
      closeWorkModal();
    } catch (err) {
      alert('작업 저장 중 오류가 발생했습니다.');
      console.error(err);
    }
  }

  function collectWorkPayload() {
    const startDate = el.workStartDate?.value || '';
    const endDate = el.workEndDate?.value || '';
    const weather = el.workWeather?.value || '';
    const taskName = (el.workTaskName?.value || '').trim();
    const workHours = el.workHours?.value || '';
    const memoText = el.workMemo?.value || '';

    const crops = collectCheckedValues(el.cropOptionsWrap).join(',');
    const pests = collectCheckedValues(el.pestOptionsWrap).join(',');
    const machines = collectCheckedValues(el.machineOptionsWrap).join(',');

    if (!startDate) {
      alert('시작일을 입력하세요.');
      return null;
    }
    if (!endDate) {
      alert('종료일을 입력하세요.');
      return null;
    }
    if (!taskName) {
      alert('작업내용을 입력하세요.');
      return null;
    }

    const materials = state.workMaterialSelections.map(item => ({
      name: (item.name || '').trim(),
      qty: String(item.qty ?? '').trim(),
      unit: String(item.unit ?? '').trim()
    })).filter(item => item.name);

    for (const item of materials) {
      if (item.qty === '') {
        alert(`사용자재 [${item.name}] 수량을 입력하세요.`);
        return null;
      }
      const qty = Number(item.qty);
      if (!Number.isFinite(qty) || qty <= 0) {
        alert(`사용자재 [${item.name}] 수량은 0보다 커야 합니다.`);
        return null;
      }
      item.qty = qty;
    }

    const laborRows = collectLaborRows();
    const materialCostTotal = 0;

    const meta = {
      memo_text: memoText,
      material_cost_total: materialCostTotal,
      labor_rows: laborRows,
      materials
    };

    return {
      start_date: startDate,
      end_date: endDate,
      weather,
      crops,
      task_name: taskName,
      pests,
      materials: materials.map(x => x.name).join(','),
      machines,
      labor_cost: calculateLaborTotal(laborRows),
      work_hours: workHours,
      memo: JSON.stringify(meta)
    };
  }

  function collectLaborRows() {
    if (!el.laborRowsWrap) return [];

    return Array.from(el.laborRowsWrap.querySelectorAll('.labor-row')).map(row => ({
      type: row.querySelector('.labor-type')?.value || '',
      amount: toNumber(row.querySelector('.labor-amount')?.value || 0),
      category: row.querySelector('.labor-category')?.value || '',
      note: row.querySelector('.labor-note')?.value || ''
    })).filter(item => item.type || item.amount || item.category || item.note);
  }

  async function deleteWork(workId) {
    if (!confirm('이 작업일지를 삭제하시겠습니까?')) return;

    try {
      await api.delete(`/api/works/${workId}`);
      await reloadWorks();
      renderWorklog();
      renderCalendar();
    } catch (err) {
      alert('작업 삭제 중 오류가 발생했습니다.');
      console.error(err);
    }
  }

  function renderMaterialsPage() {
    if (!el.materialsInStockWrap || !el.materialsOutStockWrap) return;

    const keyword = state.materialKeyword.trim().toLowerCase();
    const filtered = state.materials.filter(item => {
      const name = materialName(item).toLowerCase();
      return !keyword || name.includes(keyword);
    });

    const inStock = filtered.filter(item => toNumber(item.stock_qty ?? item.재고 ?? 0) > 0);
    const outStock = filtered.filter(item => toNumber(item.stock_qty ?? item.재고 ?? 0) <= 0);

    if (el.materialsSummary) {
      el.materialsSummary.innerHTML = `전체 ${filtered.length}개 | 재고있음 ${inStock.length} | 재고없음 ${outStock.length}`;
    }

    el.materialsInStockWrap.innerHTML = inStock.length ? inStock.map(renderMaterialCard).join('') : '<div class="empty-line">재고 있는 자재 없음</div>';
    el.materialsOutStockWrap.innerHTML = outStock.length ? outStock.map(renderMaterialCard).join('') : '<div class="empty-line">재고 없는 자재 없음</div>';

    bindMaterialCardActions(el.materialsInStockWrap);
    bindMaterialCardActions(el.materialsOutStockWrap);
  }

  function renderMaterialCard(item) {
    const name = materialName(item);
    const qty = toNumber(item.stock_qty ?? item.재고 ?? 0);
    const unitPrice = toNumber(item.unit_price ?? item.가격 ?? 0);
    const unit = materialUnit(item);

    return `
      <article class="material-card ${qty <= 0 ? 'out' : 'in'}">
        <div class="material-card-title">${escapeHtml(name)}</div>
        <div class="material-card-line">재고: ${escapeHtml(String(qty))} ${escapeHtml(unit || '')}</div>
        <div class="material-card-line">단가: ${formatMoney(unitPrice)}</div>
        <div class="material-card-actions">
          <button type="button" data-material-stock-adjust="${escapeHtml(name)}" data-mode="in">입고</button>
          <button type="button" data-material-stock-adjust="${escapeHtml(name)}" data-mode="out">사용</button>
          <button type="button" data-material-edit="${escapeHtml(name)}">수정</button>
        </div>
      </article>
    `;
  }

  function bindMaterialCardActions(container) {
    Array.from(container.querySelectorAll('[data-material-stock-adjust]')).forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.materialStockAdjust;
        const mode = btn.dataset.mode;
        const item = state.materials.find(m => materialName(m) === name);
        if (!item) return;

        const amountInput = prompt(mode === 'in' ? '입고 수량' : '사용 수량', '0');
        if (amountInput === null) return;
        const amount = Number(amountInput);
        if (!Number.isFinite(amount) || amount < 0) {
          alert('올바른 수량을 입력하세요.');
          return;
        }

        const currentQty = toNumber(item.stock_qty ?? item.재고 ?? 0);
        const newQty = mode === 'in' ? currentQty + amount : currentQty - amount;
        if (newQty < 0) {
          alert('재고가 부족합니다.');
          return;
        }

        try {
          await updateMaterialByName(item, {
            stock_qty: newQty,
            unit_price: toNumber(item.unit_price ?? item.가격 ?? 0)
          });
          await reloadMaterials();
          renderMaterialsPage();
        } catch (err) {
          alert('재고 수정 중 오류가 발생했습니다.');
          console.error(err);
        }
      });
    });

    Array.from(container.querySelectorAll('[data-material-edit]')).forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.materialEdit;
        const item = state.materials.find(m => materialName(m) === name);
        if (!item) return;

        const currentQty = toNumber(item.stock_qty ?? item.재고 ?? 0);
        const currentPrice = toNumber(item.unit_price ?? item.가격 ?? 0);

        const newName = prompt('자재명', name);
        if (newName === null) return;
        const newQtyInput = prompt('재고', String(currentQty));
        if (newQtyInput === null) return;
        const newPriceInput = prompt('단가', String(currentPrice));
        if (newPriceInput === null) return;

        try {
          await updateMaterialByName(item, {
            name: newName.trim(),
            stock_qty: toNumber(newQtyInput),
            unit_price: toNumber(newPriceInput)
          });
          await reloadMaterials();
          await reloadOptions();
          renderMaterialsPage();
          renderAllOptionBasedUI();
        } catch (err) {
          alert('자재 수정 중 오류가 발생했습니다.');
          console.error(err);
        }
      });
    });
  }

  async function updateMaterialByName(item, payload) {
    const id = item.id ?? item.ID ?? item.material_id;
    const name = materialName(item);

    if (id !== undefined && id !== null && id !== '') {
      return api.put(`/api/materials/${id}`, payload);
    }

    return api.put(`/api/materials/${encodeURIComponent(name)}`, payload);
  }

  function renderOptionsPage() {
    renderOptionTabsActive();

    if (!el.optionListWrap) return;
    const items = state.options[state.currentOptionType] || [];

    if (!items.length) {
      el.optionListWrap.innerHTML = '<div class="empty-line">등록된 옵션이 없습니다.</div>';
      return;
    }

    el.optionListWrap.innerHTML = items.map(item => {
      const id = optionId(item);
      const name = optionName(item);
      return `
        <div class="option-row">
          <div class="option-name">${escapeHtml(name)}</div>
          <div class="option-actions">
            <button type="button" data-option-edit="${escapeHtml(String(id))}">수정</button>
            <button type="button" data-option-delete="${escapeHtml(String(id))}">삭제</button>
          </div>
        </div>
      `;
    }).join('');

    Array.from(el.optionListWrap.querySelectorAll('[data-option-edit]')).forEach(btn => {
      btn.addEventListener('click', () => editOption(btn.dataset.optionEdit));
    });
    Array.from(el.optionListWrap.querySelectorAll('[data-option-delete]')).forEach(btn => {
      btn.addEventListener('click', () => deleteOption(btn.dataset.optionDelete));
    });
  }

  function renderOptionTabsActive() {
    if (!el.optionTypeTabs) return;
    Array.from(el.optionTypeTabs.querySelectorAll('[data-option-type]')).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.optionType === state.currentOptionType);
    });
  }

  async function editOption(id) {
    const items = state.options[state.currentOptionType] || [];
    const item = items.find(x => String(optionId(x)) === String(id));
    if (!item) return;

    const newName = prompt(`${optionTypeLabel(state.currentOptionType)} 수정`, optionName(item));
    if (newName === null || !newName.trim()) return;

    try {
      await api.put(`/api/options/${state.currentOptionType}/${id}`, { name: newName.trim() });
      await reloadOptions();
      renderAllOptionBasedUI();
      renderOptionsPage();
    } catch (err) {
      alert('옵션 수정 중 오류가 발생했습니다.');
      console.error(err);
    }
  }

  async function deleteOption(id) {
    if (!confirm('이 옵션을 삭제하시겠습니까?')) return;

    try {
      await api.delete(`/api/options/${state.currentOptionType}/${id}`);
      await reloadOptions();
      renderAllOptionBasedUI();
      renderOptionsPage();
    } catch (err) {
      alert('옵션 삭제 중 오류가 발생했습니다.');
      console.error(err);
    }
  }

  function renderAllOptionBasedUI() {
    renderWeatherOptionsSelect();
    if (el.cropOptionsWrap) renderCheckboxOptions(el.cropOptionsWrap, state.options.crops, collectCheckedValues(el.cropOptionsWrap));
    if (el.pestOptionsWrap) renderCheckboxOptions(el.pestOptionsWrap, state.options.pests, collectCheckedValues(el.pestOptionsWrap));
    if (el.machineOptionsWrap) renderCheckboxOptions(el.machineOptionsWrap, state.options.machines, collectCheckedValues(el.machineOptionsWrap));
  }

  function collectCheckedValues(container) {
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
  }

  function groupWorksByDate(works) {
    return works.reduce((acc, work) => {
      const key = work.start_date || '날짜없음';
      if (!acc[key]) acc[key] = [];
      acc[key].push(work);
      return acc;
    }, {});
  }

  function workMatchesKeyword(work, keyword) {
    if (!keyword) return true;
    const meta = parseWorkMemo(work.memo);
    const haystack = [
      work.task_name,
      work.crops,
      work.weather,
      work.pests,
      work.materials,
      work.machines,
      meta.memo_text,
      joinMaterialNames(meta.materials),
      formatMaterialsForDisplay(meta.materials)
    ].join(' ').toLowerCase();

    return haystack.includes(keyword);
  }

  function parseWorkMemo(memo) {
    if (!memo) return { memo_text: '', materials: [], labor_rows: [], material_cost_total: 0 };
    try {
      const obj = typeof memo === 'string' ? JSON.parse(memo) : memo;
      return {
        memo_text: obj.memo_text || obj.note || '',
        materials: Array.isArray(obj.materials) ? obj.materials : [],
        labor_rows: Array.isArray(obj.labor_rows) ? obj.labor_rows : [],
        material_cost_total: toNumber(obj.material_cost_total || 0),
        ...obj
      };
    } catch {
      return { memo_text: String(memo), materials: [], labor_rows: [], material_cost_total: 0 };
    }
  }

  function extractDisplayMemo(memo) {
    const meta = parseWorkMemo(memo);
    return meta.memo_text || '';
  }

  function rawMemoFallback(memo) {
    const meta = parseWorkMemo(memo);
    return meta.memo_text || '';
  }

  function formatMaterialsForDisplay(materials) {
    if (!Array.isArray(materials) || !materials.length) return '';
    return materials.map(item => {
      const qty = item.qty !== undefined && item.qty !== null && item.qty !== '' ? ` ${item.qty}` : '';
      const unit = item.unit ? item.unit : '';
      return `${item.name || ''}${qty}${unit ? unit : ''}`.trim();
    }).join(', ');
  }

  function joinMaterialNames(materials) {
    if (!Array.isArray(materials) || !materials.length) return '';
    return materials.map(x => x.name || '').filter(Boolean).join(', ');
  }

  function formatLaborRows(rows) {
    if (!Array.isArray(rows) || !rows.length) return '';
    return rows.map(r => [r.type, r.amount ? `${Number(r.amount).toLocaleString()}원` : '', r.category, r.note].filter(Boolean).join('/')).join(', ');
  }

  function calculateLaborTotal(rows) {
    if (!Array.isArray(rows)) return 0;
    return rows.reduce((sum, row) => sum + toNumber(row.amount || 0), 0);
  }

  function normalizeOptions(arr) {
    return Array.isArray(arr) ? arr : [];
  }

  function optionId(item) {
    return item.id ?? item.ID ?? item.value ?? item.name;
  }

  function optionName(item) {
    if (typeof item === 'string') return item;
    return item.name ?? item.value ?? item.label ?? '';
  }

  function materialName(item) {
    return item.name ?? item.자재명 ?? '';
  }

  function materialUnit(item) {
    return item.unit ?? item.단위 ?? findOptionUnit(materialName(item)) ?? '';
  }

  function materialUnitByName(name) {
    const item = state.materials.find(m => materialName(m) === name);
    return item ? materialUnit(item) : findOptionUnit(name);
  }

  function findOptionUnit(name) {
    const item = (state.options.materials || []).find(x => optionName(x) === name);
    return item?.unit ?? item?.단위 ?? '';
  }

  function optionTypeLabel(type) {
    const map = {
      weather: '날씨',
      crops: '작물',
      tasks: '작업내용',
      pests: '병충해',
      materials: '자재',
      machines: '기계'
    };
    return map[type] || type;
  }

  function parseCsvList(value) {
    if (!value) return [];
    return String(value).split(',').map(v => v.trim()).filter(Boolean);
  }

  function formatMoney(value) {
    return `${toNumber(value).toLocaleString()}원`;
  }

  function normalizePlanDate(v) {
    if (!v) return '';
    if (typeof v === 'string') return v.slice(0, 10);
    return formatDate(new Date(v));
  }

  function isDateInWorkRange(target, start, end) {
    if (!target || !start) return false;
    const t = target.replaceAll('-', '');
    const s = String(start).slice(0, 10).replaceAll('-', '');
    const e = String(end || start).slice(0, 10).replaceAll('-', '');
    return t >= s && t <= e;
  }

  function todayStr() {
    return formatDate(new Date());
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function slugify(v) {
    return String(v || '').replace(/[^a-zA-Z0-9가-힣]+/g, '_');
  }

  function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function safeJSONStringify(obj) {
    try {
      return JSON.stringify(obj);
    } catch {
      return '{}';
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function safeBind(node, event, handler) {
    if (!node) return;
    node.addEventListener(event, handler);
  }

  const api = {
    async get(url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      return res.json();
    },
    async post(url, body) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      return parseJsonSafe(res);
    },
    async put(url, body) {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      return parseJsonSafe(res);
    },
    async delete(url) {
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      return parseJsonSafe(res);
    }
  };

  async function parseJsonSafe(res) {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { ok: true, raw: text };
    }
  }
})();
