/* =========================================================
   작업일지 v7 - app.js 전체 교체본
   변경사항:
   1) 작업달력 기존 기능 유지
   2) 작업달력 상태 한글 표시 유지
   3) 작업일지 = 날짜별 큰 박스 + 같은 날짜 작업 가로 카드
   4) 작업일지 상단에 "작업입력" 버튼 추가
   5) 입력 팝업창(모달) 추가
   6) 인건비 = 행추가 방식
      - 유형(남자/여자/기타)
      - 금액
      - 구분
      - 비고
   7) 자재비 총액 입력 추가
   ---------------------------------------------------------
   참고:
   - 현재 works 테이블에 인건비 상세/자재비 전용 컬럼이 없으므로
     상세 데이터는 안전하게 memo 안에 숨김데이터로 저장해서 재표시합니다.
   ========================================================= */

(() => {
  "use strict";

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

  function getStatusLabel(status) {
    if (status === "planned") return "계획";
    if (status === "done") return "완료";
    if (status === "cancelled") return "취소";
    return status || "";
  }

  function formatField(value) {
    if (value === null || value === undefined) return "-";
    if (String(value).trim() === "") return "-";
    return escapeHtml(value);
  }

  function normalizeOptionList(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map(v => {
        if (typeof v === "string") return v;
        return v?.name || v?.value || "";
      })
      .filter(Boolean);
  }

  function getCheckedValues(name, root = document) {
    return $all(`input[name="${name}"]:checked`, root).map(el => el.value);
  }

  /* =========================
     확장 데이터(memo 내부 저장)
     ========================= */
  const META_START = "[[WORK_META]]";
  const META_END = "[[/WORK_META]]";

  function parseWorkExtra(memoText) {
    const raw = String(memoText || "");
    const start = raw.indexOf(META_START);
    const end = raw.indexOf(META_END);

    if (start === -1 || end === -1 || end < start) {
      return {
        plainMemo: raw,
        meta: {
          materialCost: 0,
          laborRows: []
        }
      };
    }

    const jsonText = raw.slice(start + META_START.length, end).trim();
    const plainMemo = (raw.slice(0, start) + raw.slice(end + META_END.length)).trim();

    let meta = { materialCost: 0, laborRows: [] };
    try {
      const parsed = JSON.parse(jsonText);
      meta = {
        materialCost: Number(parsed?.materialCost || 0),
        laborRows: Array.isArray(parsed?.laborRows) ? parsed.laborRows : []
      };
    } catch (_) {
      // 무시
    }

    return { plainMemo, meta };
  }

  function buildWorkMemo(plainMemo, meta) {
    const cleanMemo = String(plainMemo || "").trim();
    const safeMeta = {
      materialCost: Number(meta?.materialCost || 0),
      laborRows: Array.isArray(meta?.laborRows) ? meta.laborRows : []
    };
    return `${cleanMemo}\n${META_START}${JSON.stringify(safeMeta)}${META_END}`.trim();
  }

  function sumLaborCost(laborRows) {
    return (laborRows || []).reduce((sum, row) => sum + Number(row?.cost || 0), 0);
  }

  function renderLaborSummaryHtml(work) {
    const parsed = parseWorkExtra(work.memo || "");
    const rows = parsed.meta.laborRows || [];
    if (!rows.length) return `<div class="ww-mini-line"><b>인력상세</b> -</div>`;

    const summary = rows.map(row => {
      const type = escapeHtml(row.type || "-");
      const cost = Number(row.cost || 0).toLocaleString();
      const role = escapeHtml(row.role || "-");
      return `${type} ${cost}원 (${role})`;
    }).join("<br>");

    return `<div class="ww-mini-line"><b>인력상세</b><br>${summary}</div>`;
  }

  function getMaterialCostFromWork(work) {
    const parsed = parseWorkExtra(work.memo || "");
    return Number(parsed.meta.materialCost || 0);
  }

  function getPlainMemoFromWork(work) {
    const parsed = parseWorkExtra(work.memo || "");
    return parsed.plainMemo || "";
  }

  /* =========================
     API
     ========================= */
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
          .wl-status-badge.planned{background:#e8eefc;color:#2e4f99;}

          .ww-wrap{padding:28px 20px 30px 20px;}
          .ww-title{font-size:22px;font-weight:700;margin-bottom:18px;}
          .ww-date-group{
            background:#fff;border:1px solid #d7dde6;border-radius:18px;
            padding:16px;margin-bottom:18px;
          }
          .ww-date-title{
            font-size:18px;font-weight:700;margin-bottom:14px;padding-bottom:10px;
            border-bottom:1px solid #e5e9f0;
          }
          .ww-card-row{
            display:flex;
            gap:12px;
            flex-wrap:wrap;
            align-items:stretch;
          }
          .ww-work-card{
            width:280px;
            min-height:220px;
            border:1px solid #d7dde6;
            border-radius:14px;
            padding:14px;
            background:#fafbfc;
            display:flex;
            flex-direction:column;
            box-sizing:border-box;
          }
          .ww-work-name{
            font-size:16px;
            font-weight:700;
            margin-bottom:10px;
            line-height:1.4;
          }
          .ww-mini-list{
            font-size:14px;
            color:#444;
            line-height:1.6;
            flex:1;
          }
          .ww-mini-line{
            margin-bottom:4px;
            word-break:break-word;
          }
          .ww-mini-line b{
            color:#222;
            display:inline-block;
            min-width:64px;
          }
          .ww-memo{
            margin-top:10px;
            padding-top:10px;
            border-top:1px dashed #d7dde6;
            font-size:14px;
            color:#444;
            white-space:pre-wrap;
          }
          .ww-actions{
            margin-top:12px;
            display:flex;
            gap:8px;
            flex-wrap:wrap;
          }
          .ww-empty{
            background:#fff;border:1px solid #d7dde6;border-radius:18px;
            padding:20px;color:#666;
          }

          .wm-overlay{
            position:fixed;inset:0;background:rgba(0,0,0,0.45);display:none;
            align-items:center;justify-content:center;z-index:9999;padding:20px;
          }
          .wm-overlay.open{display:flex;}
          .wm-modal{
            width:min(960px, 100%);
            max-height:90vh;
            overflow:auto;
            background:#fff;border-radius:20px;padding:20px;
            box-shadow:0 10px 40px rgba(0,0,0,0.18);
          }
          .wm-title{
            font-size:20px;font-weight:700;margin-bottom:16px;
          }
          .wm-section{
            margin-bottom:18px;padding:14px;border:1px solid #d7dde6;border-radius:14px;background:#fafbfc;
          }
          .wm-section-title{
            font-size:15px;font-weight:700;margin-bottom:12px;
          }
          .wm-grid{
            display:grid;grid-template-columns:1fr 1fr;gap:10px;
          }
          .wm-grid.one{grid-template-columns:1fr;}
          .wm-labor-list{display:flex;flex-direction:column;gap:10px;}
          .wm-labor-row{
            border:1px dashed #cfd6e2;border-radius:12px;padding:10px;background:#fff;
          }
          .wm-labor-grid{
            display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;
            align-items:end;
          }
          .wm-labor-grid-note{
            display:grid;grid-template-columns:1fr;gap:8px;margin-top:8px;
          }
          @media (max-width: 900px){
            .wl-form-grid,.wm-grid,.wm-labor-grid{grid-template-columns:1fr;}
            .wm-modal{padding:16px;}
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
                      <div class="wl-status-badge ${escapeHtml(plan.status || "planned")}">상태: ${getStatusLabel(plan.status || "planned")}</div>
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
              ${renderCalendarWorkFormHtml(state.selectedDate)}
            </div>

            <div class="wl-list" id="workList">
              ${
                selectedWorks.length
                  ? selectedWorks.map(work => `
                    <div class="wl-item">
                      <div class="wl-item-title">${escapeHtml(work.task_name || "(작업명 없음)")}</div>
                      <div class="wl-item-sub">${escapeHtml(getPlainMemoFromWork(work) || "")}</div>
                      <div class="wl-work-meta">
                        작물: ${formatField(work.crops)}<br>
                        병충해: ${formatField(work.pests)}<br>
                        사용자재: ${formatField(work.materials)}<br>
                        사용기계: ${formatField(work.machines)}<br>
                        자재비: ${formatField(getMaterialCostFromWork(work).toLocaleString())}<br>
                        인건비: ${formatField(work.labor_cost ?? 0)} / 작업시간: ${formatField(work.work_hours ?? 0)}
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

  function renderCalendarWorkFormHtml(defaultDate) {
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
          <label>인건비 총액</label>
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

      <div class="wl-help">작업달력에서는 간단 입력 방식, 작업일지에서는 팝업 상세 입력 방식을 사용합니다.</div>
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
     작업달력 이벤트
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
      if (dateInput && state.selectedDate) dateInput.value = state.selectedDate;
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
      clearCalendarWorkForm();
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
              memo: buildWorkMemo(plan.details || "", { materialCost: 0, laborRows: [] })
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

        const parsed = parseWorkExtra(work.memo || "");
        const task_name = prompt("작업내용", work.task_name || "");
        if (task_name === null) return;

        const memo = prompt("비고", parsed.plainMemo || "");
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
              memo: buildWorkMemo(memo, parsed.meta)
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

  function clearPlanForm() {
    if ($("#planTitleInput")) $("#planTitleInput").value = "";
    if ($("#planDetailsInput")) $("#planDetailsInput").value = "";
    if ($("#planStatusInput")) $("#planStatusInput").value = "planned";
    if ($("#planDateInput")) $("#planDateInput").value = state.selectedDate || "";
  }

  function clearCalendarWorkForm() {
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
          memo: buildWorkMemo(memo, { materialCost: 0, laborRows: [] })
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
    const grouped = {};

    state.works.forEach(work => {
      const key = work.start_date || "날짜없음";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(work);
    });

    const sortedDates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

    mainArea.innerHTML = `
      <div class="ww-wrap">
        <style>
          .wl-btn{
            border:none;border-radius:12px;padding:10px 14px;cursor:pointer;
            background:#e7ebf2;font-weight:600;
          }
          .wl-btn.primary{background:#3d6af2;color:#fff;}
          .wl-btn.danger{background:#d9534f;color:#fff;}
          .wl-btn.small{padding:6px 10px;font-size:13px;border-radius:10px;}

          .ww-wrap{padding:28px 20px 30px 20px;}
          .ww-head{
            display:flex;justify-content:space-between;align-items:center;gap:12px;
            margin-bottom:18px;flex-wrap:wrap;
          }
          .ww-title{font-size:22px;font-weight:700;}
          .ww-date-group{
            background:#fff;
            border:1px solid #d7dde6;
            border-radius:18px;
            padding:16px;
            margin-bottom:18px;
          }
          .ww-date-title{
            font-size:18px;
            font-weight:700;
            margin-bottom:14px;
            padding-bottom:10px;
            border-bottom:1px solid #e5e9f0;
          }
          .ww-card-row{
            display:flex;
            flex-wrap:wrap;
            gap:12px;
            align-items:stretch;
          }
          .ww-work-card{
            width:280px;
            min-height:260px;
            border:1px solid #d7dde6;
            border-radius:14px;
            padding:14px;
            background:#fafbfc;
            display:flex;
            flex-direction:column;
            box-sizing:border-box;
          }
          .ww-work-card.only-one{
            width:100%;
          }
          .ww-work-name{
            font-size:16px;
            font-weight:700;
            margin-bottom:10px;
            line-height:1.4;
          }
          .ww-mini-list{
            font-size:14px;
            color:#444;
            line-height:1.6;
            flex:1;
          }
          .ww-mini-line{
            margin-bottom:4px;
            word-break:break-word;
          }
          .ww-mini-line b{
            color:#222;
            display:inline-block;
            min-width:64px;
          }
          .ww-memo{
            margin-top:10px;
            padding-top:10px;
            border-top:1px dashed #d7dde6;
            font-size:14px;
            color:#444;
            white-space:pre-wrap;
          }
          .ww-actions{
            margin-top:12px;
            display:flex;
            gap:8px;
            flex-wrap:wrap;
          }
          .ww-empty{
            background:#fff;
            border:1px solid #d7dde6;
            border-radius:18px;
            padding:20px;
            color:#666;
          }

          .wm-overlay{
            position:fixed;inset:0;background:rgba(0,0,0,0.45);display:none;
            align-items:center;justify-content:center;z-index:9999;padding:20px;
          }
          .wm-overlay.open{display:flex;}
          .wm-modal{
            width:min(960px, 100%);
            max-height:90vh;
            overflow:auto;
            background:#fff;border-radius:20px;padding:20px;
            box-shadow:0 10px 40px rgba(0,0,0,0.18);
          }
          .wm-title{
            font-size:20px;font-weight:700;margin-bottom:16px;
          }
          .wm-section{
            margin-bottom:18px;padding:14px;border:1px solid #d7dde6;border-radius:14px;background:#fafbfc;
          }
          .wm-section-title{
            font-size:15px;font-weight:700;margin-bottom:12px;
          }
          .wm-grid{
            display:grid;grid-template-columns:1fr 1fr;gap:10px;
          }
          .wm-grid.one{grid-template-columns:1fr;}
          .wm-input,.wm-select,.wm-textarea{
            width:100%;padding:10px 12px;border:1px solid #cfd6e2;border-radius:10px;box-sizing:border-box;
            font:inherit;background:#fff;
          }
          .wm-textarea{min-height:90px;resize:vertical;}
          .wm-check-grid{
            display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px 10px;
            border:1px solid #cfd6e2;border-radius:10px;padding:10px;background:#fff;
          }
          .wm-check-item{display:flex;align-items:center;gap:6px;font-size:14px;}
          .wm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
          .wm-labor-list{display:flex;flex-direction:column;gap:10px;}
          .wm-labor-row{
            border:1px dashed #cfd6e2;border-radius:12px;padding:10px;background:#fff;
          }
          .wm-labor-grid{
            display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:8px;align-items:end;
          }
          .wm-labor-grid-note{
            display:grid;grid-template-columns:1fr;gap:8px;margin-top:8px;
          }

          @media (max-width: 900px){
            .ww-work-card{width:100%;}
            .wm-grid,.wm-labor-grid{grid-template-columns:1fr;}
          }
        </style>

        <div class="ww-head">
          <div class="ww-title">작업일지</div>
          <button class="wl-btn primary" id="openWorkModalBtn">작업입력</button>
        </div>

        ${
          sortedDates.length
            ? sortedDates.map(date => {
              const works = grouped[date];
              const onlyOne = works.length === 1;

              return `
                <div class="ww-date-group">
                  <div class="ww-date-title">${escapeHtml(date)}</div>
                  <div class="ww-card-row">
                    ${
                      works.map(work => `
                        <div class="ww-work-card ${onlyOne ? "only-one" : ""}">
                          <div class="ww-work-name">${escapeHtml(work.task_name || "(작업명 없음)")}</div>

                          <div class="ww-mini-list">
                            <div class="ww-mini-line"><b>작물</b> ${formatField(work.crops)}</div>
                            <div class="ww-mini-line"><b>날씨</b> ${formatField(work.weather)}</div>
                            <div class="ww-mini-line"><b>병충해</b> ${formatField(work.pests)}</div>
                            <div class="ww-mini-line"><b>자재</b> ${formatField(work.materials)}</div>
                            <div class="ww-mini-line"><b>자재비</b> ${formatField(getMaterialCostFromWork(work).toLocaleString())}</div>
                            <div class="ww-mini-line"><b>기계</b> ${formatField(work.machines)}</div>
                            <div class="ww-mini-line"><b>인건비</b> ${formatField(Number(work.labor_cost || 0).toLocaleString())}</div>
                            ${renderLaborSummaryHtml(work)}
                            <div class="ww-mini-line"><b>시간</b> ${formatField(work.work_hours ?? 0)}</div>
                            <div class="ww-mini-line"><b>기간</b> ${formatField(work.start_date)} ~ ${formatField(work.end_date)}</div>
                          </div>

                          <div class="ww-memo"><b>비고</b><br>${formatField(getPlainMemoFromWork(work))}</div>

                          <div class="ww-actions">
                            <button class="wl-btn small" data-work-edit="${work.id}">수정</button>
                            <button class="wl-btn danger small" data-work-delete="${work.id}">삭제</button>
                          </div>
                        </div>
                      `).join("")
                    }
                  </div>
                </div>
              `;
            }).join("")
            : `<div class="ww-empty">작업일지 데이터가 없습니다.</div>`
        }

        <div class="wm-overlay" id="workModalOverlay">
          <div class="wm-modal">
            <div class="wm-title">작업 입력</div>

            <div class="wm-section">
              <div class="wm-section-title">기본정보</div>
              <div class="wm-grid">
                <div>
                  <label>시작일</label>
                  <input class="wm-input" id="modalStartDate" type="date" value="${state.selectedDate || ""}">
                </div>
                <div>
                  <label>종료일</label>
                  <input class="wm-input" id="modalEndDate" type="date" value="${state.selectedDate || ""}">
                </div>
                <div>
                  <label>날씨</label>
                  ${renderModalSelectOrInput("modalWeather", state.options.weather, "날씨 선택")}
                </div>
                <div>
                  <label>작업내용</label>
                  ${renderModalSelectOrInput("modalTaskName", state.options.tasks, "작업 선택")}
                </div>
              </div>
            </div>

            <div class="wm-section">
              <div class="wm-section-title">다중선택</div>
              <div class="wm-grid one">
                <div>
                  <label>작물</label>
                  ${renderModalCheckboxGroup("modalCrops", state.options.crops)}
                </div>
                <div>
                  <label>병충해</label>
                  ${renderModalCheckboxGroup("modalPests", state.options.pests)}
                </div>
                <div>
                  <label>사용자재</label>
                  ${renderModalCheckboxGroup("modalMaterials", state.options.materials)}
                </div>
                <div>
                  <label>사용기계</label>
                  ${renderModalCheckboxGroup("modalMachines", state.options.machines)}
                </div>
              </div>
            </div>

            <div class="wm-section">
              <div class="wm-section-title">금액 / 시간</div>
              <div class="wm-grid">
                <div>
                  <label>자재비 총액</label>
                  <input class="wm-input" id="modalMaterialCost" type="number" min="0" value="0">
                </div>
                <div>
                  <label>작업시간</label>
                  <input class="wm-input" id="modalWorkHours" type="number" min="0" step="0.5" value="0">
                </div>
              </div>
            </div>

            <div class="wm-section">
              <div class="wm-section-title">인건비 상세</div>
              <div class="wm-labor-list" id="laborRowsContainer"></div>
              <div class="wm-actions">
                <button class="wl-btn" id="addLaborRowBtn">+ 인건비 추가</button>
              </div>
            </div>

            <div class="wm-section">
              <div class="wm-section-title">비고</div>
              <div class="wm-grid one">
                <div>
                  <textarea class="wm-textarea" id="modalMemo" placeholder="비고 입력"></textarea>
                </div>
              </div>
            </div>

            <div class="wm-actions">
              <button class="wl-btn primary" id="saveModalWorkBtn">저장</button>
              <button class="wl-btn" id="closeWorkModalBtn">닫기</button>
            </div>
          </div>
        </div>
      </div>
    `;

    bindWorksViewEvents();
  }

  function renderModalSelectOrInput(id, options, placeholder) {
    if (options && options.length) {
      return `
        <select class="wm-select" id="${id}">
          <option value="">${placeholder}</option>
          ${options.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("")}
        </select>
      `;
    }
    return `<input class="wm-input" id="${id}" placeholder="${placeholder}">`;
  }

  function renderModalCheckboxGroup(name, options) {
    if (!options || !options.length) {
      return `<div style="color:#666;">옵션관리에서 항목을 추가하면 여기에 표시됩니다.</div>`;
    }

    return `
      <div class="wm-check-grid">
        ${options.map(v => `
          <label class="wm-check-item">
            <input type="checkbox" name="${name}" value="${escapeHtml(v)}">
            <span>${escapeHtml(v)}</span>
          </label>
        `).join("")}
      </div>
    `;
  }

  function createLaborRowHtml(index) {
    return `
      <div class="wm-labor-row" data-labor-row="${index}">
        <div class="wm-labor-grid">
          <div>
            <label>유형</label>
            <select class="wm-select labor-type">
              <option value="남자">남자</option>
              <option value="여자">여자</option>
              <option value="기타">기타</option>
            </select>
          </div>
          <div>
            <label>금액</label>
            <input class="wm-input labor-cost" type="number" min="0" value="0">
          </div>
          <div>
            <label>구분</label>
            <input class="wm-input labor-role" placeholder="예: 전정 인부">
          </div>
          <div>
            <button type="button" class="wl-btn danger small remove-labor-row-btn">삭제</button>
          </div>
        </div>
        <div class="wm-labor-grid-note">
          <div>
            <label>비고</label>
            <input class="wm-input labor-note" placeholder="예: 추가작업">
          </div>
        </div>
      </div>
    `;
  }

  function bindWorksViewEvents() {
    const openModalBtn = $("#openWorkModalBtn");
    const overlay = $("#workModalOverlay");
    const closeModalBtn = $("#closeWorkModalBtn");
    const addLaborRowBtn = $("#addLaborRowBtn");
    const saveModalWorkBtn = $("#saveModalWorkBtn");

    openModalBtn?.addEventListener("click", () => {
      overlay?.classList.add("open");
      if ($("#modalStartDate") && state.selectedDate) $("#modalStartDate").value = state.selectedDate;
      if ($("#modalEndDate") && state.selectedDate) $("#modalEndDate").value = state.selectedDate;

      if ($("#laborRowsContainer") && $("#laborRowsContainer").children.length === 0) {
        addLaborRow();
      }
    });

    closeModalBtn?.addEventListener("click", () => {
      closeWorkModal();
    });

    overlay?.addEventListener("click", (e) => {
      if (e.target === overlay) closeWorkModal();
    });

    addLaborRowBtn?.addEventListener("click", () => {
      addLaborRow();
    });

    saveModalWorkBtn?.addEventListener("click", handleCreateWorkFromModal);

    $all(".remove-labor-row-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.closest(".wm-labor-row")?.remove();
      });
    });

    $all("[data-work-delete]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.workDelete;
        if (!confirm("이 작업을 삭제할까요?")) return;

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

        const parsed = parseWorkExtra(work.memo || "");
        const task_name = prompt("작업내용", work.task_name || "");
        if (task_name === null) return;

        const memo = prompt("비고", parsed.plainMemo || "");
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
              memo: buildWorkMemo(memo, parsed.meta)
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

  function addLaborRow() {
    const container = $("#laborRowsContainer");
    if (!container) return;

    const index = container.children.length + 1;
    container.insertAdjacentHTML("beforeend", createLaborRowHtml(index));

    const newRow = container.lastElementChild;
    const removeBtn = $(".remove-labor-row-btn", newRow);
    removeBtn?.addEventListener("click", () => {
      newRow.remove();
    });
  }

  function closeWorkModal() {
    $("#workModalOverlay")?.classList.remove("open");
    clearWorkModal();
  }

  function clearWorkModal() {
    if ($("#modalStartDate")) $("#modalStartDate").value = state.selectedDate || "";
    if ($("#modalEndDate")) $("#modalEndDate").value = state.selectedDate || "";
    if ($("#modalWeather")) $("#modalWeather").value = "";
    if ($("#modalTaskName")) $("#modalTaskName").value = "";
    if ($("#modalMaterialCost")) $("#modalMaterialCost").value = "0";
    if ($("#modalWorkHours")) $("#modalWorkHours").value = "0";
    if ($("#modalMemo")) $("#modalMemo").value = "";

    $all('input[name="modalCrops"]:checked').forEach(el => (el.checked = false));
    $all('input[name="modalPests"]:checked').forEach(el => (el.checked = false));
    $all('input[name="modalMaterials"]:checked').forEach(el => (el.checked = false));
    $all('input[name="modalMachines"]:checked').forEach(el => (el.checked = false));

    const container = $("#laborRowsContainer");
    if (container) {
      container.innerHTML = "";
    }
  }

  function collectLaborRows() {
    return $all(".wm-labor-row").map(row => {
      return {
        type: $(".labor-type", row)?.value || "남자",
        cost: Number($(".labor-cost", row)?.value || 0),
        role: $(".labor-role", row)?.value?.trim() || "",
        note: $(".labor-note", row)?.value?.trim() || ""
      };
    }).filter(row => row.type || row.cost || row.role || row.note);
  }

  async function handleCreateWorkFromModal() {
    const start_date = $("#modalStartDate")?.value || "";
    const end_date = $("#modalEndDate")?.value || start_date;
    const weather = $("#modalWeather")?.value || "";
    const task_name = $("#modalTaskName")?.value || "";
    const crops = getCheckedValues("modalCrops");
    const pests = getCheckedValues("modalPests");
    const materials = getCheckedValues("modalMaterials");
    const machines = getCheckedValues("modalMachines");
    const materialCost = Number($("#modalMaterialCost")?.value || 0);
    const work_hours = Number($("#modalWorkHours")?.value || 0);
    const plainMemo = $("#modalMemo")?.value?.trim() || "";
    const laborRows = collectLaborRows();
    const labor_cost = sumLaborCost(laborRows);

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
          memo: buildWorkMemo(plainMemo, {
            materialCost,
            laborRows
          })
        })
      });

      closeWorkModal();
      await refreshDataAndRerender();
      infoMessage("작업 입력 완료");
    } catch (err) {
      showError(err);
    }
  }

  /* =========================
     나머지 메뉴
     ========================= */
  function renderMaterialsView() {
    mainArea.innerHTML = `
      <div class="wl-wrap">
        <style>
          .wl-wrap{padding:28px 20px 30px 20px;}
          .wl-title{font-size:22px;font-weight:700;margin-bottom:18px;}
          .wl-card{background:#fff;border:1px solid #d7dde6;border-radius:18px;padding:16px;}
          .wl-item{border:1px solid #d7dde6;border-radius:14px;padding:12px;background:#fafbfc;}
          .wl-item + .wl-item{margin-top:10px;}
          .wl-item-title{font-weight:700;margin-bottom:6px;}
          .wl-item-sub{color:#555;font-size:14px;}
          .wl-empty-text{color:#666;}
        </style>
        <div class="wl-title">자재관리</div>
        <div class="wl-card">
          ${
            state.materialsMaster.length
              ? state.materialsMaster.map(m => `
                <div class="wl-item">
                  <div class="wl-item-title">${escapeHtml(m.name || "")}</div>
                  <div class="wl-item-sub">
                    재고: ${formatField(m.stock_qty ?? 0)} / 단가: ${formatField(m.unit_price ?? 0)}
                  </div>
                </div>
              `).join("")
              : `<div class="wl-empty-text">자재 데이터가 없습니다.</div>`
          }
        </div>
      </div>
    `;
  }

  function renderMoneyView() {
    const totalLabor = state.works.reduce((sum, w) => sum + Number(w.labor_cost || 0), 0);
    const totalMaterial = state.works.reduce((sum, w) => sum + Number(getMaterialCostFromWork(w) || 0), 0);

    mainArea.innerHTML = `
      <div class="wl-wrap">
        <style>
          .wl-wrap{padding:28px 20px 30px 20px;}
          .wl-title{font-size:22px;font-weight:700;margin-bottom:18px;}
          .wl-card{background:#fff;border:1px solid #d7dde6;border-radius:18px;padding:16px;}
        </style>
        <div class="wl-title">금전관리</div>
        <div class="wl-card">
          총 인건비: <strong>${totalLabor.toLocaleString()}</strong><br>
          총 자재비: <strong>${totalMaterial.toLocaleString()}</strong><br>
          다음 단계에서 월별 집계 / 손익 계산을 붙이면 됩니다.
        </div>
      </div>
    `;
  }

  function renderOptionsView() {
    const box = (title, list) => `
      <div class="wl-card" style="margin-bottom:12px;">
        <div style="font-weight:700;margin-bottom:10px;">${title}</div>
        <div>
          ${
            list && list.length
              ? list.map(v => `
                  <span style="display:inline-block;padding:6px 10px;border:1px solid #d7dde6;border-radius:999px;margin:4px;background:#fafbfc;">
                    ${escapeHtml(v)}
                  </span>
                `).join("")
              : "없음"
          }
        </div>
      </div>
    `;

    mainArea.innerHTML = `
      <div class="wl-wrap">
        <style>
          .wl-wrap{padding:28px 20px 30px 20px;}
          .wl-title{font-size:22px;font-weight:700;margin-bottom:18px;}
          .wl-card{background:#fff;border:1px solid #d7dde6;border-radius:18px;padding:16px;}
        </style>
        <div class="wl-title">옵션관리</div>
        ${box("날씨", state.options.weather)}
        ${box("작물", state.options.crops)}
        ${box("작업", state.options.tasks)}
        ${box("병충해", state.options.pests)}
        ${box("자재옵션", state.options.materials)}
        ${box("기계", state.options.machines)}
      </div>
    `;
  }

  function renderExcelView() {
    mainArea.innerHTML = `
      <div class="wl-wrap">
        <style>
          .wl-wrap{padding:28px 20px 30px 20px;}
          .wl-title{font-size:22px;font-weight:700;margin-bottom:18px;}
          .wl-card{background:#fff;border:1px solid #d7dde6;border-radius:18px;padding:16px;}
        </style>
        <div class="wl-title">엑셀다운</div>
        <div class="wl-card">엑셀 다운로드 기능은 다음 단계에서 서버 다운로드 API와 연결하면 됩니다.</div>
      </div>
    `;
  }

  function renderBackupView() {
    mainArea.innerHTML = `
      <div class="wl-wrap">
        <style>
          .wl-wrap{padding:28px 20px 30px 20px;}
          .wl-title{font-size:22px;font-weight:700;margin-bottom:18px;}
          .wl-card{background:#fff;border:1px solid #d7dde6;border-radius:18px;padding:16px;}
        </style>
        <div class="wl-title">백업</div>
        <div class="wl-card">백업 기능은 다음 단계에서 DB 파일 다운로드 또는 JSON 백업 방식으로 붙이면 됩니다.</div>
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
