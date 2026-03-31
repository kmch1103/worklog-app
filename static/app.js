let state = {
  options: {
    weather: [],
    crops: [],
    tasks: [],
    pests: [],
    materials: [],
    machines: [],
  },
  works: [],
  materials: [],
  editingWorkId: null,
};

document.addEventListener("DOMContentLoaded", async () => {
  bindMenu();
  bindWorkForm();
  bindMaterialForm();
  await loadInitialData();
});

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return [...document.querySelectorAll(selector)];
}

async function api(url, method = "GET", body = null) {
  const options = { method, headers: {} };
  if (body !== null) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "요청 중 오류가 발생했습니다.");
  }
  return data;
}

async function loadInitialData() {
  await Promise.all([
    loadOptions(),
    loadWorks(),
    loadMaterials(),
  ]);
}

function bindMenu() {
  qsa(".menu-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      qsa(".menu-btn").forEach(x => x.classList.remove("active"));
      qsa(".page").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      qs(`#page-${btn.dataset.page}`).classList.add("active");
    });
  });
}

function bindWorkForm() {
  qs("#btn-new-work").addEventListener("click", () => openWorkForm());
  qs("#btn-cancel-work").addEventListener("click", closeWorkForm);
  qs("#btn-save-work").addEventListener("click", saveWork);
}

function bindMaterialForm() {
  qs("#btn-save-material").addEventListener("click", saveMaterial);
}

async function loadOptions() {
  state.options = await api("/api/options");
  renderOptionSelects();
  renderOptionChecks();
  renderOptionsManager();
}

async function loadWorks() {
  state.works = await api("/api/works");
  renderWorks();
}

async function loadMaterials() {
  state.materials = await api("/api/materials");
  renderMaterialsTable();
}

function renderOptionSelects() {
  const weather = qs("#weather");
  const task = qs("#task_name");

  weather.innerHTML = '<option value="">선택</option>' +
    state.options.weather.map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");

  task.innerHTML = '<option value="">선택</option>' +
    state.options.tasks.map(item => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join("");
}

function renderChecks(targetId, items) {
  const box = qs(targetId);
  box.innerHTML = items.map(item => `
    <label class="check-item">
      <input type="checkbox" value="${escapeHtml(item.name)}">
      <span>${escapeHtml(item.name)}</span>
    </label>
  `).join("");
}

function renderOptionChecks() {
  renderChecks("#crops-box", state.options.crops);
  renderChecks("#pests-box", state.options.pests);
  renderChecks("#materials-box", state.options.materials);
  renderChecks("#machines-box", state.options.machines);
}

function getCheckedValues(targetId) {
  return qsa(`${targetId} input[type="checkbox"]:checked`).map(el => el.value);
}

function setCheckedValues(targetId, values) {
  const set = new Set(values || []);
  qsa(`${targetId} input[type="checkbox"]`).forEach(el => {
    el.checked = set.has(el.value);
  });
}

function openWorkForm(work = null) {
  state.editingWorkId = work ? work.id : null;
  qs("#work-form-wrap").classList.remove("hidden");
  qs("#work-form-title").textContent = work ? "작업 수정" : "작업 입력";

  if (work) {
    qs("#start_date").value = work.start_date || "";
    qs("#end_date").value = work.end_date || "";
    qs("#weather").value = work.weather || "";
    qs("#task_name").value = work.task_name || "";
    setCheckedValues("#crops-box", splitCsv(work.crops));
    setCheckedValues("#pests-box", splitCsv(work.pests));
    setCheckedValues("#materials-box", splitCsv(work.materials));
    setCheckedValues("#machines-box", splitCsv(work.machines));
    qs("#labor_cost").value = work.labor_cost || 0;
    qs("#work_hours").value = work.work_hours || 0;
    qs("#memo").value = work.memo || "";
  } else {
    const today = new Date().toISOString().slice(0, 10);
    qs("#start_date").value = today;
    qs("#end_date").value = today;
    qs("#weather").value = "";
    qs("#task_name").value = "";
    setCheckedValues("#crops-box", []);
    setCheckedValues("#pests-box", []);
    setCheckedValues("#materials-box", []);
    setCheckedValues("#machines-box", []);
    qs("#labor_cost").value = 0;
    qs("#work_hours").value = 0;
    qs("#memo").value = "";
  }
}

function closeWorkForm() {
  qs("#work-form-wrap").classList.add("hidden");
  state.editingWorkId = null;
}

async function saveWork() {
  const payload = {
    start_date: qs("#start_date").value,
    end_date: qs("#end_date").value,
    weather: qs("#weather").value,
    task_name: qs("#task_name").value,
    crops: getCheckedValues("#crops-box"),
    pests: getCheckedValues("#pests-box"),
    materials: getCheckedValues("#materials-box"),
    machines: getCheckedValues("#machines-box"),
    labor_cost: Number(qs("#labor_cost").value || 0),
    work_hours: Number(qs("#work_hours").value || 0),
    memo: qs("#memo").value.trim(),
  };

  try {
    if (state.editingWorkId) {
      await api(`/api/works/${state.editingWorkId}`, "PUT", payload);
      alert("수정되었습니다.");
    } else {
      await api("/api/works", "POST", payload);
      alert("저장되었습니다.");
    }
    closeWorkForm();
    await loadWorks();
  } catch (err) {
    alert(err.message);
  }
}

function renderWorks() {
  const wrap = qs("#works-list");

  if (!state.works.length) {
    wrap.innerHTML = '<div class="empty">등록된 작업일지가 없습니다.</div>';
    return;
  }

  wrap.innerHTML = state.works.map(work => `
    <article class="card">
      <h3>${escapeHtml(work.start_date)}${work.end_date && work.end_date !== work.start_date ? " ~ " + escapeHtml(work.end_date) : ""}</h3>
      <div class="meta">
        <div><strong>날씨:</strong> ${escapeHtml(work.weather || "-")}</div>
        <div><strong>작물:</strong> ${escapeHtml(work.crops || "-")}</div>
        <div><strong>작업:</strong> ${escapeHtml(work.task_name || "-")}</div>
        <div><strong>병충해:</strong> ${escapeHtml(work.pests || "-")}</div>
        <div><strong>자재:</strong> ${escapeHtml(work.materials || "-")}</div>
        <div><strong>기계:</strong> ${escapeHtml(work.machines || "-")}</div>
        <div><strong>인건비:</strong> ${Number(work.labor_cost || 0).toLocaleString()}원</div>
        <div><strong>작업시간:</strong> ${Number(work.work_hours || 0)}시간</div>
        <div><strong>비고:</strong> ${escapeHtml(work.memo || "-")}</div>
      </div>
      <div class="card-actions">
        <button class="btn primary" onclick="editWork(${work.id})">수정</button>
        <button class="btn danger" onclick="removeWork(${work.id})">삭제</button>
      </div>
    </article>
  `).join("");
}

function editWork(workId) {
  const work = state.works.find(x => x.id === workId);
  if (!work) return;
  openWorkForm(work);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function removeWork(workId) {
  if (!confirm("정말 삭제하시겠습니까?")) return;
  try {
    await api(`/api/works/${workId}`, "DELETE");
    await loadWorks();
    alert("삭제되었습니다.");
  } catch (err) {
    alert(err.message);
  }
}

async function saveMaterial() {
  const payload = {
    name: qs("#material_name").value.trim(),
    unit: qs("#material_unit").value.trim(),
    stock_qty: Number(qs("#material_stock").value || 0),
    unit_price: Number(qs("#material_price").value || 0),
    memo: qs("#material_memo").value.trim(),
  };

  try {
    await api("/api/materials", "POST", payload);
    qs("#material_name").value = "";
    qs("#material_unit").value = "";
    qs("#material_stock").value = 0;
    qs("#material_price").value = 0;
    qs("#material_memo").value = "";
    await loadMaterials();
    alert("자재가 저장되었습니다.");
  } catch (err) {
    alert(err.message);
  }
}

function renderMaterialsTable() {
  const wrap = qs("#materials-list");

  if (!state.materials.length) {
    wrap.innerHTML = '<div class="empty">등록된 자재가 없습니다.</div>';
    return;
  }

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>자재명</th>
          <th>단위</th>
          <th>재고</th>
          <th>단가</th>
          <th>메모</th>
        </tr>
      </thead>
      <tbody>
        ${state.materials.map(item => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.unit || "")}</td>
            <td>${Number(item.stock_qty || 0)}</td>
            <td>${Number(item.unit_price || 0).toLocaleString()}</td>
            <td>${escapeHtml(item.memo || "")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderOptionsManager() {
  Object.entries(state.options).forEach(([key, items]) => {
    const box = qs(`#options-${key}`);
    if (!box) return;

    box.innerHTML = items.map(item => `
      <div class="option-row">
        <span>${escapeHtml(item.name)}</span>
        <div class="option-actions">
          <button class="btn" onclick="renameOption('${key}', ${item.id}, '${escapeJs(item.name)}')">수정</button>
          <button class="btn danger" onclick="deleteOption('${key}', ${item.id})">삭제</button>
        </div>
      </div>
    `).join("") || '<div class="empty">항목이 없습니다.</div>';
  });
}

async function saveOption(type, inputId) {
  const input = qs(`#${inputId}`);
  const name = input.value.trim();
  if (!name) {
    alert("이름을 입력하세요.");
    return;
  }

  try {
    await api(`/api/options/${type}`, "POST", { name });
    input.value = "";
    await loadOptions();
  } catch (err) {
    alert(err.message);
  }
}

async function renameOption(type, id, currentName) {
  const name = prompt("새 이름", currentName);
  if (name === null) return;
  if (!name.trim()) {
    alert("이름을 입력하세요.");
    return;
  }

  try {
    await api(`/api/options/${type}/${id}`, "PUT", { name: name.trim(), is_active: 1 });
    await loadOptions();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteOption(type, id) {
  if (!confirm("정말 삭제하시겠습니까?")) return;
  try {
    await api(`/api/options/${type}/${id}`, "DELETE");
    await loadOptions();
  } catch (err) {
    alert(err.message);
  }
}

function splitCsv(text) {
  if (!text) return [];
  return String(text).split(",").map(x => x.trim()).filter(Boolean);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeJs(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");
}
