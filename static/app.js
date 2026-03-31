// ====== 상태 ======
let state = {
  works: [],
  selectedDate: null,
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth()
};

// ====== 공통 ======
function qs(s){return document.querySelector(s);}
function qsa(s){return [...document.querySelectorAll(s)];}

// ====== API ======
async function api(url, method="GET", body=null){
  const opt={method,headers:{}};
  if(body){
    opt.headers["Content-Type"]="application/json";
    opt.body=JSON.stringify(body);
  }

  const res = await fetch(url, opt);
  const text = await res.text();

  try{
    const data = JSON.parse(text);
    if(!res.ok) throw new Error(data.error||"에러");
    return data;
  }catch(e){
    throw new Error("서버 오류 (JSON 아님)");
  }
}

// ====== 초기 ======
document.addEventListener("DOMContentLoaded", async ()=>{
  bindMenu();
  bindForm();
  await loadWorks();
  renderCalendar();
});

// ====== 메뉴 ======
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

// ====== 작업 ======
async function loadWorks(){
  state.works = await api("/api/works");
  renderWorks();
  renderCalendar();
}

function renderWorks(){
  const wrap=qs("#works-list");

  if(!state.works.length){
    wrap.innerHTML="데이터 없음";
    return;
  }

  wrap.innerHTML = state.works.map(w=>`
    <div class="card">
      <b>${w.start_date}</b> - ${w.task_name || ""}
      <button onclick="editWork(${w.id})">수정</button>
      <button onclick="delWork(${w.id})">삭제</button>
    </div>
  `).join("");
}

function bindForm(){
  qs("#btn-new-work").onclick=()=>openForm();
  qs("#btn-cancel-work").onclick=closeForm;
  qs("#btn-save-work").onclick=saveWork;
}

function openForm(){
  qs("#work-form-wrap").classList.remove("hidden");
}

function closeForm(){
  qs("#work-form-wrap").classList.add("hidden");
}

async function saveWork(){
  const payload={
    start_date: qs("#start_date").value,
    end_date: qs("#end_date").value,
    task_name: qs("#task_name").value,
    memo: qs("#memo").value
  };

  await api("/api/works","POST",payload);

  closeForm();
  loadWorks();
}

async function delWork(id){
  if(!confirm("삭제?")) return;
  await api("/api/works/"+id,"DELETE");
  loadWorks();
}

function editWork(id){
  alert("추후 구현");
}

// ====== 달력 ======
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

  for(let i=0;i<start;i++){
    html+=`<div></div>`;
  }

  for(let d=1; d<=lastDate; d++){
    const date = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

    const count = state.works.filter(w=>{
      return w.start_date <= date && date <= (w.end_date||w.start_date);
    }).length;

    html+=`
      <div class="calendar-cell" onclick="selectDate('${date}')">
        <div>${d}</div>
        <div style="color:blue">${count?count+"건":""}</div>
      </div>
    `;
  }

  grid.innerHTML = html;
}

function selectDate(date){
  state.selectedDate = date;

  const list = qs("#selected-date-list");
  const items = state.works.filter(w=>{
    return w.start_date <= date && date <= (w.end_date||w.start_date);
  });

  if(!items.length){
    list.innerHTML="작업 없음";
    return;
  }

  list.innerHTML = items.map(w=>`
    <div class="card">
      ${w.task_name || ""}
    </div>
  `).join("");
}

// ====== 달 이동 ======
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
