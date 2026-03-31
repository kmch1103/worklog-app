// ===== 상태 =====
let state = {
  works: [],
  plans: [],
  selectedDate: null,
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth()
};

// ===== 공통 =====
function qs(s){return document.querySelector(s);}
function qsa(s){return [...document.querySelectorAll(s)];}

// ===== API =====
async function api(url, method="GET", body=null){
  const opt={method,headers:{}};
  if(body){
    opt.headers["Content-Type"]="application/json";
    opt.body=JSON.stringify(body);
  }

  const res = await fetch(url,opt);
  const text = await res.text();

  try{
    const data = JSON.parse(text);
    if(!res.ok) throw new Error(data.error||"에러");
    return data;
  }catch(e){
    throw new Error("서버 오류(JSON 아님)");
  }
}

// ===== 초기 =====
document.addEventListener("DOMContentLoaded", async ()=>{
  bindMenu();
  bindPlan();
  bindWork();
  await loadAll();
});

// ===== 메뉴 =====
function bindMenu(){
  qsa(".menu-btn").forEach(btn=>{
    btn.onclick=()=>{
      qsa(".menu-btn").forEach(b=>b.classList.remove("active"));
      qsa(".page").forEach(p=>p.classList.remove("active"));

      btn.classList.add("active");
      qs("#page-"+btn.dataset.page).classList.add("active");
    }
  });
}

// ===== 데이터 로드 =====
async function loadAll(){
  state.works = await api("/api/works");
  state.plans = await api("/api/plans");

  renderCalendar();
}

// ===== 달력 =====
function renderCalendar(){
  const grid = qs("#calendar-grid");
  if(!grid) return;

  const y = state.calendarYear;
  const m = state.calendarMonth;

  qs("#calendar-title").innerText = `${y}년 ${m+1}월`;

  const firstDay = new Date(y,m,1);
  const lastDate = new Date(y,m+1,0).getDate();
  const start = firstDay.getDay();

  let html="";

  for(let i=0;i<start;i++) html+=`<div></div>`;

  for(let d=1; d<=lastDate; d++){
    const date = formatDate(y,m+1,d);

    const workCount = state.works.filter(w=> w.start_date<=date && date<= (w.end_date||w.start_date)).length;
    const planCount = state.plans.filter(p=> p.plan_date===date).length;

    html+=`
      <div class="calendar-cell" onclick="selectDate('${date}')">
        <div>${d}</div>
        <div style="font-size:12px;color:#999">
          ${planCount?`계획${planCount}`:""}
          ${workCount?` 실적${workCount}`:""}
        </div>
      </div>
    `;
  }

  grid.innerHTML = html;
}

// ===== 날짜 선택 =====
function selectDate(date){
  state.selectedDate = date;

  renderPlanList();
  renderWorkList();
}

// ===== 계획 =====
function bindPlan(){
  qs("#btn-open-plan-form")?.addEventListener("click",()=>{
    qs("#plan_date").value = state.selectedDate;
    qs("#plan-form-wrap").classList.remove("hidden");
  });

  qs("#btn-save-plan")?.addEventListener("click",savePlan);
}

async function savePlan(){
  const payload={
    plan_date: qs("#plan_date").value,
    title: qs("#plan_title").value,
    details: qs("#plan_details").value
  };

  await api("/api/plans","POST",payload);

  qs("#plan-form-wrap").classList.add("hidden");

  loadAll();
}

function renderPlanList(){
  const wrap = qs("#selected-date-plan-list");

  const list = state.plans.filter(p=>p.plan_date===state.selectedDate);

  if(!list.length){
    wrap.innerHTML="계획 없음";
    return;
  }

  wrap.innerHTML = list.map(p=>`
    <div class="card">
      ${p.title}
    </div>
  `).join("");
}

// ===== 작업 =====
function bindWork(){
  qs("#btn-open-work-from-calendar")?.addEventListener("click",()=>{
    qs("#start_date").value = state.selectedDate;
    qs("#work-form-wrap").classList.remove("hidden");
  });

  qs("#btn-save-work")?.addEventListener("click",saveWork);
}

async function saveWork(){
  const payload={
    start_date: qs("#start_date").value,
    end_date: qs("#end_date").value,
    task_name: qs("#task_name").value
  };

  await api("/api/works","POST",payload);

  qs("#work-form-wrap").classList.add("hidden");

  loadAll();
}

function renderWorkList(){
  const wrap = qs("#selected-date-list");

  const list = state.works.filter(w=>{
    return w.start_date<=state.selectedDate && state.selectedDate<= (w.end_date||w.start_date);
  });

  if(!list.length){
    wrap.innerHTML="작업 없음";
    return;
  }

  wrap.innerHTML = list.map(w=>`
    <div class="card">
      ${w.task_name}
    </div>
  `).join("");
}

// ===== 날짜 포맷 =====
function formatDate(y,m,d){
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

// ===== 달 이동 =====
qs("#btn-prev-month")?.addEventListener("click",()=>{
  state.calendarMonth--;
  if(state.calendarMonth<0){
    state.calendarMonth=11;
    state.calendarYear--;
  }
  renderCalendar();
});

qs("#btn-next-month")?.addEventListener("click",()=>{
  state.calendarMonth++;
  if(state.calendarMonth>11){
    state.calendarMonth=0;
    state.calendarYear++;
  }
  renderCalendar();
});
