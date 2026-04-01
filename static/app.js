/* =========================================================
   작업일지 v3 - app.js 전체 교체본
   목적:
   1) 기존 뼈대 유지
   2) 작업달력에서 계획 추가 / 수정 / 삭제
   3) 작업달력에서 날짜 선택 후 작업입력
   4) 계획 완료 체크
   5) 계획 -> 작업 변환
   ---------------------------------------------------------
   주의:
   - 이 파일은 app.js 전체 교체본입니다.
   - index.html / cloud_server.py 구조는 최대한 그대로 둔다는 전제입니다.
   - 서버 API:
       GET    /api/works
       POST   /api/works
       PUT    /api/works/{id}
       DELETE /api/works/{id}

       GET    /api/plans
       POST   /api/plans
       PUT    /api/plans/{id}
       DELETE /api/plans/{id}

       GET    /api/options
       GET    /api/materials
   ========================================================= */

(() => {
  "use strict";

  /* =========================
     전역 상태
     ========================= */
  const state = {
    currentView: "calendar",
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    selectedDate: null,
    works: [],
    plans: [],
    options: {
      weather: [],
      crops: [],
      tasks: [],
      pests: [],
      materials: [],
      machines: []
    },
    materialsMaster: []
  };

  /* =========================
     공통 유틸
     ========================= */
  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatDate(year, monthIndex, day) {
    return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function joinMultiValue(arr) {
    return (arr || []).filter(Boolean).join(", ");
  }

  function safeJsonParse(text, fallback = null) {
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  }

  async function api(url, options = {}) {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options
    });

    const text = await res.text();
    const data = safeJsonParse(text, text);

    if (!res.ok) {
      const msg =
        (data && data.error) ||
        (typeof data === "string" && data) ||
        `요청 실패: ${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  function showError(err) {
    console.error(err);
    alert(`오류: ${err.message || err}`);
  }

  function infoMessage(msg) {
    alert(msg);
  }

  function getMonthLabel() {
    return `${state.currentYear}년 ${state.currentMonth + 1}월`;
  }

  function getWorksByDate(dateStr) {
    return state.works.filter(w => w.start_date === dateStr);
  }

  function getPlansByDate(dateStr) {
    return state.plans.filter(p => p.plan_date === dateStr);
  }

  function getSelectedWorks() {
    if (!state.selectedDate) return [];
    return getWorksByDate(state.selectedDate);
  }

  function getSelectedPlans() {
    if (!state.selectedDate) return [];
    return getPlansByDate(state.selectedDate);
  }

  function normalizeOptionList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(v => {
      if (typeof v === "string") return v;
      return v?.name || v?.value || "";
    }).filter(Boolean);
  }

  /* =========================
     레이아웃 탐색
     ========================= */
  function getSidebarButtons() {
    const candidates = $all("button, .menu-item, .sidebar button, .sidebar .item");
    return candidates.filter(el => {
      const txt = (el.textContent || "").trim();
      return [
        "작업달력",
        "작업일지",
        "자재관리",
        "금전관리",
        "옵션관리",
        "엑셀다운",
        "백업"
      ].includes(txt);
    });
  }

  function detectMainArea() {
    const selectors = [
      ".main-content",
      ".content",
      "main",
      ".page-content",
      ".right-panel",
      ".workspace",
      ".app-main"
    ];
    for (const sel of selectors) {
      const found = $(sel);
      if (found) return found;
    }

    const side = $(".sidebar");
    if (side && side.parentElement && side.parentElement.children.length >= 2) {
      return side.parentElement.children[1];
    }

    return document.body;
  }

  const mainArea = detectMainArea();

  /* =========================
     메뉴 연결
     ========================= */
  function bindSidebarMenu() {
    const buttons = getSidebarButtons();

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const label = btn.textContent.trim();

        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        switch (label) {
          case "작업달력":
            state.currentView = "calendar";
            render();
            break;
          case "작업일지":
            state.currentView = "works";
            render();
            break;
          case "자재관리":
            state.currentView = "materials";
            render();
            break;
          case "금전관리":
            state.currentView = "money";
            render();
            break;
          case "옵션관리":
            state.currentView = "options";
            render();
            break;
          case "엑셀다운":
            state.currentView = "excel";
            render();
            break;
          case "백업":
            state.currentView = "backup";
            render();
            break;
          default:
            break;
        }
      });
    });
  }

  /* =========================
     데이터 로드
     ========================= */
  async function loadAllData() {
    const [works, plans, options, materialsMaster] = await Promise.all([
      api("/api/works").catch(() => []),
      api("/api/plans").catch(() => []),
      api("/api/options").catch(() => ({})),
      api("/api/materials").catch(() => [])
    ]);

    state.works = Array.isArray(works) ? works : [];
    state.plans = Array.isArray(plans) ? plans : [];
    state.materialsMaster = Array.isArray(materialsMaster) ? materialsMaster : [];

    state.options = {
      weather: normalizeOptionList(options.weather || options.options_weather || []),
      crops: normalizeOptionList(options.crops || options.options_crops || []),
      tasks: normalizeOptionList(options.tasks || options.options_tasks || []),
      pests: normalizeOptionList(options.pests || options.options_pests || []),
      materials: normalizeOptionList(options.materials || options.options_materials || []),
      machines: normalizeOptionList(options.machines || options.options_machines || [])
    };
  }

  async function refreshDataAndRerender() {
    await loadAllData();
    render();
  }

  /* =========================
     렌더 분기
     ========================= */
  function render() {
    switch (state.currentView) {
      case "calendar":
        renderCalendarView();
        break;
      case "works":
        renderWorksView();
        break;
      case "materials":
        renderMaterialsView();
        break;
      case "money":
        renderMoneyView();
        break;
      case "options":
        renderOptionsView();
        break;
      case "excel":
        renderExcelView();
        break;
      case "backup":
        renderBackupView();
        break;
      default:
        renderCalendarView();
        break;
    }
  }

  /* =========================
     작업달력 화면
     ========================= */
  function renderCalendarView() {
    const firstDay = new Date(state.currentYear, state.currentMonth, 1).getDay();
    const lastDate = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();

    let dayCellsHtml = "";

    for (let i = 0; i < firstDay; i++) {
      dayCellsHtml += `<div class="wl-empty-cell"></div>`;
    }

    for (let day = 1; day <= lastDate; day++) {
      const dateStr = formatDate(state.currentYear, state.currentMonth, day);
      const plans = getPlansByDate(dateStr);
      const works = getWorksByDate(dateStr);
      const isSelected = state.selectedDate === dateStr;

      dayCellsHtml += `
        <button class="wl-day-cell ${isSelected ? "selected" : ""}" data-date="${dateStr}">
          <div class="wl-day-num">${day}</div>
          <div class="wl-day-summary">
            <div class="wl-day-summary-line">계획 ${plans.length}</div>
            <div class="wl-day-summary-line">실적 ${works.length}</div>
          </div>
        </button>
      `;
    }

    const selectedPlans = getSelectedPlans();
    const selectedWorks = getSelectedWorks();

    mainArea.innerHTML = `
      <div class="wl-wrap">
        <style>
          .wl-wrap{padding:28px 20px 30px 20px;}
          .wl-card{background:#fff;border:1px solid #d7dde6;border-radius:18px;padding:16px;}
          .wl-title-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px;flex-wrap:wrap;}
          .wl-title{font-size:22px;font-weight:700;}
          .wl-month-nav{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
          .wl-btn{
            border:none;border-radius:12px;padding:10px 14px;cursor:pointer;
            background:#e7ebf2;font-weight:600;
          }
          .wl-btn.primary{background:#3d6af2;color:#fff;}
          .wl-btn.success{background:#2e8b57;color:#fff;}
          .wl-btn.danger{background:#d9534f;color:#fff;}
          .wl-btn.small{padding:6px 10px;font-size:13px;border-radius:10px;}
          .wl-calendar-grid{
            display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin-top:10px;
          }
          .wl-weekday{
            text-align:center;font-weight:700;color:#555;padding:6px 0;
          }
          .wl-empty-cell{min-height:92px;}
          .wl-day-cell{
            min-height:92px;background:#fff;border:1px solid #d7dde6;border-radius:16px;
            text-align:left;padding:8px;cursor:pointer;
          }
          .wl-day-cell.selected{outline:2px solid #3d6af2;}
          .wl-day-num{font-size:18px;font-weight:700;margin-bottom:8px;}
          .wl-day-summary{font-size:12px;color:#555;line-height:1.45;}
          .wl-detail-card{margin-top:18px;}
          .wl-detail-title{font-size:18px;font-weight:700;margin-bottom:18px;}
          .wl-section{margin-bottom:22px;}
          .wl-section-head{
            display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap;
          }
          .wl-section-title{font-size:16px;font-weight:700;}
          .wl-empty-text{color:#666;padding:6px 0;}
          .wl-list{display:flex;flex-direction:column;gap:10px;}
          .wl-item{
            border:1px solid #d7dde6;border-radius:14px;padding:12px;background:#fafbfc;
          }
          .wl-item.done{
            background:#f3f7f3;
            border-color:#bcd7c4;
          }
          .wl-item-title{font-weight:700;margin-bottom:6px;}
          .wl-item-sub{color:#555;font-size:14px;white-space:pre-wrap;}
          .wl-item-actions{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;}
          .wl-form-box{
            display:none;margin-top:12px;border:1px dashed #cfd6e2;border-radius:14px;padding:14px;background:#fbfcff;
          }
          .wl-form-box.open{display:block;}
          .wl-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
          .wl-form-grid.single{grid-template-columns:1fr;}
          .wl-input,.wl-select,.wl-textarea{
            width:100%;padding:10px 12px;border:1px solid #cfd6e2;border-radius:10px;box-sizing:border-box;
            font:inherit;background:#fff;
          }
          .wl-textarea{min-height:90px;resize:vertical;}
          .wl-check-grid{
            display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px 10px;
            border:1px solid #cfd6e2;border-radius:10px;padding:10px;background:#fff;
          }
          .wl-check-item{display:flex;align-items:center;gap:6px;font-size:14px;}
          .wl-form-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
          .wl-help{font-size:13px;color:#666;margin-top:6px;}
          .wl-work-meta{font-size:13px;color:#555;margin-top:6px;line-height:1.5;}
          .wl-status-badge{
            display:inline-block;
            margin-top:6px;
            padding:4px 8px;
            border-radius:999px;
            font-size:12px;
            font-weight:700;
            background:#eef2f7;
            color:#495057;
          }
          .wl-status-badge.done{background:#dff3e5;color:#1f6b3a;}
          .wl-status-badge.cancelled{background:#f7e3e3;color:#8a2f2f;}
          @media (max-width: 900px){
            .wl-form-grid{grid-template-columns:1fr;}
          }
        </style>

        <div class="wl-title-row">
          <div class="wl-title">작업달력</div>
          <div class="wl-month-nav">
            <button class="wl-btn" id="prevMonthBtn">이전달</button>
            <div class="wl-title">${getMonthLabel()}</div>
            <button class="wl-btn" id="nextMonthBtn">다음달</button>
          </div>
        </div>

        <div class="wl-card">
          <div class="wl-calendar-grid">
            <div class="wl-weekday">일</div>
            <div class="wl-weekday">월</div>
            <div class="wl-weekday">화</div>
            <div class="wl-weekday">수</div>
            <div class="wl-weekday">목</div>
            <div class="wl-weekday">금</div>
            <div class="wl-weekday">토</div>
            ${dayCellsHtml}
          </div>
        </div>

        <div class="wl-card wl-detail-card">
          <div class="wl-detail-title">
            ${state.selectedDate ? `${state.selectedDate}` : "날짜를 선택하세요"}
          </div>

          <div class="wl-section">
            <div class="wl-section-head">
              <div class="wl-section-title">작업계획</div>
              <button class="wl-btn primary small" id="openPlanFormBtn" ${state.selectedDate ? "" : "disabled"}>계획추가</button>
            </div>

            <div class="wl-form-box" id="planFormBox">
              <div class="wl-form-grid">
                <div>
                  <label>계획날짜</label>
                  <input class="wl-input" id="planDateInput" type="date" value="${state.selectedDate || ""}">
                </div>
                <div>
                  <label>상태</label>
                  <select class="wl-select" id="planStatusInput">
                    <option value="planned">planned</option>
                    <option value="done">done</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                </div>
              </div>

              <div class="wl-form-grid single" style="margin-top:10px;">
                <div>
                  <label>제목</label>
                  <input class="wl-input" id="planTitleInput" placeholder="예: 물관리 예정">
                </div>
                <div>
                  <label>상세내용</label>
                  <textarea class="wl-textarea" id="planDetailsInput" placeholder="예: 천혜향 하우스 물관리 예정"></textarea>
                </div>
              </div>

              <div class="wl-form-actions">
                <button class="wl-btn primary" id="savePlanBtn">저장</button>
                <button class="wl-btn" id="cancelPlanBtn">닫기</button>
              </div>
            </div>

            <div class="wl-list" id="planList">
              ${
                selectedPlans.length
                  ? selectedPlans.map(plan => `
                    <div class="wl-item ${plan.status === "done" ? "done" : ""}">
                      <div class="wl-item-title">${escapeHtml(plan.title || "(제목 없음)")}</div>
                      <div class="wl-item-sub">${escapeHtml(plan.details || "")}</div>
                      <div class="wl-status-badge ${escapeHtml(plan.status || "planned")}">상태: ${escapeHtml(plan.status || "planned")}</div>
                      <div class="wl-item-actions">
                        ${plan.status !== "done" ? `<button class="wl-btn success small" data-plan-done="${plan.id}">완료</button>` : ""}
                        <button class="wl-btn small" data-plan-convert="${plan.id}">작업변환</button>
                        <button class="wl-btn small" data-plan-edit="${plan.id}">수정</button>
                        <button class="wl-btn danger small" data-plan-delete="${plan.id}">삭제</button>
                      </div>
                    </div>
                  `).join("")
                  : `<div class="wl-empty-text">계획 없음</div>`
              }
            </div>
          </div>

          <div class="wl-section">
            <div class="wl-section-head">
              <div class="wl-section-title">작업실적</div>
              <button class="wl-btn primary small" id="openWorkFormBtn" ${state.selectedDate ? "" : "disabled"}>작업입력</button>
            </div>

            <div class="wl-form-box" id="workFormBox">
              ${renderWorkFormHtml(state.selectedDate)}
            </div>

            <div class="wl-list" id="workList">
              ${
                selectedWorks.length
                  ? selectedWorks.map(work => `
                    <div class="wl-item">
                      <div class="wl-item-title">${escapeHtml(work.task_name || "(작업명 없음)")}</div>
                      <div class="wl-item-sub">${escapeHtml(work.memo || "")}</div>
                      <div class="wl-work-meta">
                        작물: ${escapeHtml(work.crops || "")}<br>
                        병충해: ${escapeHtml(work.pests || "")}<br>
                        사용자재: ${escapeHtml(work.materials || "")}<br>
                        사용기계: ${escapeHtml(work.machines || "")}<br>
                        인건비: ${escapeHtml(work.labor_cost || 0)} / 작업시간: ${escapeHtml(work.work_hours || 0)}
                      </div>
                      <div class="wl-item-actions">
                        <button class="wl-btn small" data-work-edit="${work.id}">수정</button>
                        <button class="wl-btn danger small" data-work-delete="${work.id}">삭제</button>
                      </div>
                    </div>
                  `).join("")
                  : `<div class="wl-empty-text">작업 없음</div>`
              }
            </div>
          </div>
        </div>
      </div>
    `;

    bindCalendarEvents();
  }

  function renderWorkFormHtml(defaultDate) {
    return `
      <div class="wl-form-grid">
        <div>
          <label>시작일</label>
          <input class="wl-input" id="workStartDate" type="date" value="${defaultDate || ""}">
        </div>
        <div>
          <label>종료일</label>
          <input class="wl-input" id="workEndDate" type="date" value="${defaultDate || ""}">
        </div>
      </div>

      <div class="wl-form-grid" style="margin-top:10px;">
        <div>
          <label>날씨</label>
          ${renderSelectOrInput("workWeather", state.options.weather, "날씨 선택")}
        </div>
        <div>
          <label>작업내용</label>
          ${renderSelectOrInput("workTaskName", state.options.tasks, "작업 선택")}
        </div>
      </div>

      <div class="wl-form-grid single" style="margin-top:10px;">
        <div>
          <label>작물(다중선택)</label>
          ${renderCheckboxGroup("workCrops", state.options.crops)}
        </div>
        <div>
          <label>병충해(다중선택)</label>
          ${renderCheckboxGroup("workPests", state.options.pests)}
        </div>
        <div>
          <label>사용자재(다중선택)</label>
          ${renderCheckboxGroup("workMaterials", state.options.materials)}
        </div>
        <div>
          <label>사용기계(다중선택)</label>
          ${renderCheckboxGroup("workMachines", state.options.machines)}
        </div>
      </div>

      <div class="wl-form-grid" style="margin-top:10px;">
        <div>
          <label>인건비</label>
          <input class="wl-input" id="workLaborCost" type="number" min="0" value="0">
        </div>
        <div>
          <label>작업시간</label>
          <input class="wl-input" id="workHours" type="number" min="0" step="0.5" value="0">
        </div>
      </div>

      <div class="wl-form-grid single" style="margin-top:10px;">
        <div>
          <label>비고</label>
          <textarea class="wl-textarea" id="workMemo" placeholder="메모 입력"></textarea>
        </div>
      </div>

      <div class="wl-form-actions">
        <button class="wl-btn primary" id="saveWorkBtn">저장</button>
        <button class="wl-btn" id="cancelWorkBtn">닫기</button>
      </div>

      <div class="wl-help">작업달력에서도 날짜를 선택한 뒤 바로 작업입력이 가능합니다.</div>
    `;
  }

  function renderSelectOrInput(id, options, placeholder) {
    if (options && options.length) {
      return `
        <select class="wl-select" id="${id}">
          <option value="">${placeholder}</option>
          ${options.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}
        </select>
      `;
    }
    return `<input class="wl-input" id="${id}" placeholder="${placeholder}">`;
  }

  function renderCheckboxGroup(name, options) {
    if (!options || !options.length) {
      return `<div class="wl-help">옵션관리에서 항목을 추가하면 여기에 표시됩니다.</div>`;
    }

    return `
      <div class="wl-check-grid">
        ${options.map(v => `
          <label class="wl-check-item">
            <input type="checkbox" name="${name}" value="${escapeHtml(v)}">
            <span>${escapeHtml(v)}</span>
          </label>
        `).join("")}
      </div>
    `;
  }

  /* =========================
     이벤트 바인딩
     ========================= */
  function bindCalendarEvents() {
    const prevBtn = $("#prevMonthBtn");
    const nextBtn = $("#nextMonthBtn");
    const openPlanFormBtn = $("#openPlanFormBtn");
    const cancelPlanBtn = $("#cancelPlanBtn");
    const savePlanBtn = $("#savePlanBtn");
    const openWorkFormBtn = $("#openWorkFormBtn");
    const cancelWorkBtn = $("#cancelWorkBtn");
    const saveWorkBtn = $("#saveWorkBtn");

    prevBtn?.addEventListener("click", () => {
      state.currentMonth -= 1;
      if (state.currentMonth < 0) {
        state.currentMonth = 11;
        state.currentYear -= 1;
      }
      renderCalendarView();
    });

    nextBtn?.addEventListener("click", () => {
      state.currentMonth += 1;
      if (state.currentMonth > 11) {
        state.currentMonth = 0;
        state.currentYear += 1;
      }
      renderCalendarView();
    });

    $all(".wl-day-cell").forEach(cell => {
      cell.addEventListener("click", () => {
        state.selectedDate = cell.dataset.date;
        renderCalendarView();
      });
    });

    openPlanFormBtn?.addEventListener("click", () => {
      $("#planFormBox")?.classList.add("open");
      const dateInput = $("#planDateInput");
      if (dateInput && state.selectedDate) {
        dateInput.value = state.selectedDate;
      }
    });

    cancelPlanBtn?.addEventListener("click", () => {
      $("#planFormBox")?.classList.remove("open");
      clearPlanForm();
    });

    savePlanBtn?.addEventListener("click", handleCreatePlan);

    openWorkFormBtn?.addEventListener("click", () => {
      $("#workFormBox")?.classList.add("open");
      if ($("#workStartDate")) $("#workStartDate").value = state.selectedDate || "";
      if ($("#workEndDate")) $("#workEndDate").value = state.selectedDate || "";
    });

    cancelWorkBtn?.addEventListener("click", () => {
      $("#workFormBox")?.classList.remove("open");
      clearWorkForm();
    });

    saveWorkBtn?.addEventListener("click", handleCreateWorkFromCalendar);

    $all("[data-plan-delete]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.planDelete;
        if (!confirm("이 계획을 삭제할까요?")) return;

        try {
          await api(`/api/plans/${id}`, { method: "DELETE" });
          await refreshDataAndRerender();
          infoMessage("계획 삭제 완료");
        } catch (err) {
          showError(err);
        }
      });
    });

    $all("[data-plan-edit]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.planEdit;
        const plan = state.plans.find(p => String(p.id) === String(id));
        if (!plan) return;

        const title = prompt("계획 제목", plan.title || "");
        if (title === null) return;

        const details = prompt("상세내용", plan.details || "");
        if (details === null) return;

        const status = prompt("상태(planned / done / cancelled)", plan.status || "planned");
        if (status === null) return;

        try {
          await api(`/api/plans/${id}`, {
            method: "PUT",
            body: JSON.stringify({
              plan_date: plan.plan_date,
              title,
              details,
              status
            })
          });
          await refreshDataAndRerender();
          infoMessage("계획 수정 완료");
        } catch (err) {
          showError(err);
        }
      });
    });

    $all("[data-plan-done]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.planDone;
        const plan = state.plans.find(p => String(p.id) === String(id));
        if (!plan) return;

        try {
          await api(`/api/plans/${id}`, {
            method: "PUT",
            body: JSON.stringify({
              plan_date: plan.plan_date,
              title: plan.title || "",
              details: plan.details || "",
              status: "done"
            })
          });
          await refreshDataAndRerender();
          infoMessage("계획 완료 처리됨");
        } catch (err) {
          showError(err);
        }
      });
    });

    $all("[data-plan-convert]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.planConvert;
        const plan = state.plans.find(p => String(p.id) === String(id));
        if (!plan) return;

        if (!confirm("이 계획을 작업실적으로 변환할까요?")) return;

        try {
          await api("/api/works", {
            method: "POST",
            body: JSON.stringify({
              start_date: plan.plan_date,
              end_date: plan.plan_date,
              weather: "",
              crops: "",
              task_name: plan.title || "",
              pests: "",
              materials: "",
              machines: "",
              labor_cost: 0,
              work_hours: 0,
              memo: plan.details || ""
            })
          });

          await api(`/api/plans/${id}`, {
            method: "PUT",
            body: JSON.stringify({
              plan_date: plan.plan_date,
              title: plan.title || "",
              details: plan.details || "",
              status: "done"
            })
          });

          state.selectedDate = plan.plan_date;
          await refreshDataAndRerender();
          infoMessage("계획이 작업실적으로 변환되었습니다.");
        } catch (err) {
          showError(err);
        }
      });
    });

    $all("[data-work-delete]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.workDelete;
        if (!confirm("이 작업실적을 삭제할까요?")) return;

        try {
          await api(`/api/works/${id}`, { method: "DELETE" });
          await refreshDataAndRerender();
          infoMessage("작업 삭제 완료");
        } catch (err) {
          showError(err);
        }
      });
    });

    $all("[data-work-edit]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.workEdit;
        const work = state.works.find(w => String(w.id) === String(id));
        if (!work) return;

        const task_name = prompt("작업내용", work.task_name || "");
        if (task_name === null) return;

        const memo = prompt("비고", work.memo || "");
        if (memo === null) return;

        const labor_cost = prompt("인건비", work.labor_cost || "0");
        if (labor_cost === null) return;

        const work_hours = prompt("작업시간", work.work_hours || "0");
        if (work_hours === null) return;

        try {
          await api(`/api/works/${id}`, {
            method: "PUT",
            body: JSON.stringify({
              start_date: work.start_date,
              end_date: work.end_date,
              weather: work.weather || "",
              crops: work.crops || "",
              task_name,
              pests: work.pests || "",
              materials: work.materials || "",
              machines: work.machines || "",
              labor_cost: Number(labor_cost || 0),
              work_hours: Number(work_hours || 0),
              memo
            })
          });
          await refreshDataAndRerender();
          infoMessage("작업 수정 완료");
        } catch (err) {
          showError(err);
        }
      });
    });
  }

  /* =========================
     폼 처리
     ========================= */
  function clearPlanForm() {
    if ($("#planTitleInput")) $("#planTitleInput").value = "";
    if ($("#planDetailsInput")) $("#planDetailsInput").value = "";
    if ($("#planStatusInput")) $("#planStatusInput").value = "planned";
    if ($("#planDateInput")) $("#planDateInput").value = state.selectedDate || "";
  }

  function clearWorkForm() {
    if ($("#workStartDate")) $("#workStartDate").value = state.selectedDate || "";
    if ($("#workEndDate")) $("#workEndDate").value = state.selectedDate || "";
    if ($("#workWeather")) $("#workWeather").value = "";
    if ($("#workTaskName")) $("#workTaskName").value = "";
    if ($("#workLaborCost")) $("#workLaborCost").value = "0";
    if ($("#workHours")) $("#workHours").value = "0";
    if ($("#workMemo")) $("#workMemo").value = "";

    $all('input[name="workCrops"]:checked').forEach(el => (el.checked = false));
    $all('input[name="workPests"]:checked').forEach(el => (el.checked = false));
    $all('input[name="workMaterials"]:checked').forEach(el => (el.checked = false));
    $all('input[name="workMachines"]:checked').forEach(el => (el.checked = false));
  }

  async function handleCreatePlan() {
    const plan_date = $("#planDateInput")?.value || state.selectedDate;
    const title = $("#planTitleInput")?.value?.trim() || "";
    const details = $("#planDetailsInput")?.value?.trim() || "";
    const status = $("#planStatusInput")?.value || "planned";

    if (!plan_date) {
      infoMessage("계획 날짜를 선택하세요.");
      return;
    }

    if (!title) {
      infoMessage("계획 제목을 입력하세요.");
      return;
    }

    try {
      await api("/api/plans", {
        method: "POST",
        body: JSON.stringify({ plan_date, title, details, status })
      });

      state.selectedDate = plan_date;
      await refreshDataAndRerender();
      infoMessage("계획 추가 완료");
    } catch (err) {
      showError(err);
    }
  }

  function getCheckedValues(name) {
    return $all(`input[name="${name}"]:checked`).map(el => el.value);
  }

  async function handleCreateWorkFromCalendar() {
    const start_date = $("#workStartDate")?.value || "";
    const end_date = $("#workEndDate")?.value || start_date;
    const weather = $("#workWeather")?.value || "";
    const task_name = $("#workTaskName")?.value || "";
    const crops = getCheckedValues("workCrops");
    const pests = getCheckedValues("workPests");
    const materials = getCheckedValues("workMaterials");
    const machines = getCheckedValues("workMachines");
    const labor_cost = Number($("#workLaborCost")?.value || 0);
    const work_hours = Number($("#workHours")?.value || 0);
    const memo = $("#workMemo")?.value?.trim() || "";

    if (!start_date) {
      infoMessage("시작일을 입력하세요.");
      return;
    }

    if (!task_name) {
      infoMessage("작업내용을 입력하세요.");
      return;
    }

    try {
      await api("/api/works", {
        method: "POST",
        body: JSON.stringify({
          start_date,
          end_date,
          weather,
          crops: joinMultiValue(crops),
          task_name,
          pests: joinMultiValue(pests),
          materials: joinMultiValue(materials),
          machines: joinMultiValue(machines),
          labor_cost,
          work_hours,
          memo
        })
      });

      state.selectedDate = start_date;
      await refreshDataAndRerender();
      infoMessage("작업실적 추가 완료");
    } catch (err) {
      showError(err);
    }
  }

  /* =========================
     작업일지 화면
     ========================= */
  function renderWorksView() {
    mainArea.innerHTML = `
      <div class="wl-wrap">
        <style>
          .wl-wrap{padding:28px 20px 30px 20px;}
          .wl-simple-title{font-size:22px;font-weight:700;margin-bottom:18px;}
          .wl-simple-card{background:#fff;border:1px solid #d7dde6;border-radius:18px;padding:16px;}
          .wl-row{border:1px solid #d7dde6;border-radius:14px;padding:12px;margin-bottom:10px;background:#fafbfc;}
          .wl-row-title{font-weight:700;margin-bottom:6px;}
          .wl-row-sub{font-size:14px;color:#555;line-height:1.5;white-space:pre-wrap;}
        </style>
        <div class="wl-simple-title">작업일지</div>
        <div class="wl-simple-card">
          ${
            state.works.length
              ? [...state.works]
                  .sort((a, b) => (a.start_date < b.start_date ? 1 : -1))
                  .map(work => `
                    <div class="wl-row">
                      <div class="wl-row-title">${escapeHtml(work.start_date)} / ${escapeHtml(work.task_name || "")}</div>
                      <div class="wl-row-sub">
                        작물: ${escapeHtml(work.crops || "")}<br>
                        병충해: ${escapeHtml(work.pests || "")}<br>
                        사용자재: ${escapeHtml(work.materials || "")}<br>
                        사용기계: ${escapeHtml(work.machines || "")}<br>
                        인건비: ${escapeHtml(work.labor_cost || 0)} / 작업시간: ${escapeHtml(work.work_hours || 0)}<br>
                        비고: ${escapeHtml(work.memo || "")}
                      </div>
                    </div>
                  `).join("")
              : `<div class="wl-row-sub">작업일지 데이터가 없습니다.</div>`
          }
        </div>
      </div>
    `;
  }

  /* =========================
     자재관리 화면
     ========================= */
  function renderMaterialsView() {
    mainArea.innerHTML = `
      <div class="wl-wrap">
        <style>
          .wl-wrap{padding:28px 20px 30px 20px;}
          .wl-simple-title{font-size:22px;font-weight:700;margin-bottom:18px;}
          .wl-simple-card{background:#fff;border:1px solid #d7dde6;border-radius:18px;padding:16px;}
          .wl-row{border:1px solid #d7dde6;border-radius:14px;padding:12px;margin-bottom:10px;background:#fafbfc;}
          .wl-row-title{font-weight:700;margin-bottom:6px;}
          .wl-row-sub{font-size:14px;color:#555;line-height:1.5;white-space:pre-wrap;}
        </style>
        <div class="wl-simple-title">자재관리</div>
        <div class="wl-simple-card">
          ${
            state.materialsMaster.length
              ? state.materialsMaster.map(m => `
                  <div class="wl-row">
                    <div class="wl-row-title">${escapeHtml(m.name || "")}</div>
                    <div class="wl-row-sub">
                      재고: ${escapeHtml(m.stock_qty || 0)} / 단가: ${escapeHtml(m.unit_price || 0)}
                    </div>
                  </div>
                `).join("")
              : `<div class="wl-row-sub">자재 데이터가 없습니다.</div>`
          }
        </div>
      </div>
    `;
  }

  /* =========================
     금전관리 화면
     ========================= */
  function renderMoneyView() {
    const totalLabor = state.works.reduce((sum, w) => sum + Number(w.labor_cost || 0), 0);

    mainArea.innerHTML = `
      <div class="wl-wrap">
        <style>
          .wl-wrap{padding:28px 20px 30px 20px;}
          .wl-simple-title{font-size:22px;font-weight:700;margin-bottom:18px;}
          .wl-simple-card{background:#fff;border:1px solid #d7dde6;border-radius:18px;padding:16px;}
          .wl-row-sub{font-size:15px;color:#333;line-height:1.8;}
        </style>
        <div class="wl-simple-title">금전관리</div>
        <div class="wl-simple-card">
          <div class="wl-row-sub">
            현재는 기본 집계만 표시합니다.<br>
            총 인건비: <strong>${totalLabor.toLocaleString()}</strong><br>
            다음 단계에서 자재비 / 월별수익 / 손익 계산을 붙이면 됩니다.
          </div>
        </div>
      </div>
    `;
  }

  /* =========================
     옵션관리 화면
     ========================= */
  function renderOptionsView() {
    const box = (title, list) => `
      <div class="wl-simple-card" style="margin-bottom:12px;">
        <div style="font-weight:700;margin-bottom:10px;">${title}</div>
        <div>${list && list.length ? list.map(v => `<span style="display:inline-block;padding:6px 10px;border:1px solid #d7dde6;border-radius:999px;margin:4px;background:#fafbfc;">${escapeHtml(v)}</span>`).join("") : "없음"}</div>
      </div>
    `;

    mainArea.innerHTML = `
      <div class="wl-wrap">
        <style>
          .wl-wrap{padding:28px 20px 30px 20px;}
          .wl-simple-title{font-size:22px;font-weight:700;margin-bottom:18px;}
          .wl-simple-card{background:#fff;border:1px solid #d7dde6;border-radius:18px;padding:16px;}
        </style>
        <div class="wl-simple-title">옵션관리</div>
        ${box("날씨", state.options.weather)}
        ${box("작물", state.options.crops)}
        ${box("작업", state.options.tasks)}
        ${box("병충해", state.options.pests)}
        ${box("자재옵션", state.options.materials)}
        ${box("기계", state.options.machines)}
      </div>
    `;
  }

  /* =========================
     엑셀다운 / 백업
     ========================= */
  function renderExcelView() {
    mainArea.innerHTML = `
      <div class="wl-wrap">
        <style>
          .wl-wrap{padding:28px 20px 30px 20px;}
          .wl-simple-title{font-size:22px;font-weight:700;margin-bottom:18px;}
          .wl-simple-card{background:#fff;border:1px solid #d7dde6;border-radius:18px;padding:16px;}
        </style>
        <div class="wl-simple-title">엑셀다운</div>
        <div class="wl-simple-card">엑셀 다운로드 기능은 다음 단계에서 서버 다운로드 API와 연결하면 됩니다.</div>
      </div>
    `;
  }

  function renderBackupView() {
    mainArea.innerHTML = `
      <div class="wl-wrap">
        <style>
          .wl-wrap{padding:28px 20px 30px 20px;}
          .wl-simple-title{font-size:22px;font-weight:700;margin-bottom:18px;}
          .wl-simple-card{background:#fff;border:1px solid #d7dde6;border-radius:18px;padding:16px;}
        </style>
        <div class="wl-simple-title">백업</div>
        <div class="wl-simple-card">백업 기능은 다음 단계에서 DB 파일 다운로드 또는 JSON 백업 방식으로 붙이면 됩니다.</div>
      </div>
    `;
  }

  /* =========================
     시작
     ========================= */
  async function init() {
    try {
      bindSidebarMenu();
      await loadAllData();
      render();
    } catch (err) {
      showError(err);
    }
  }

  window.addEventListener("load", init);
})();
