/* =========================================================
   작업일지 v4 - app.js 전체 교체본
   변경사항:
   1) 작업일지 = 날짜별 그룹 + 작업별 상세 분리
   2) 작업달력 상태 한글 표시 (계획/완료/취소)
   3) 기존 구조 유지
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
    options: { weather: [], crops: [], tasks: [], pests: [], materials: [], machines: [] },
    materialsMaster: []
  };

  /* ========================= 유틸 ========================= */

  const $ = (s, r=document)=>r.querySelector(s);
  const $all = (s, r=document)=>Array.from(r.querySelectorAll(s));

  const pad = n => String(n).padStart(2,"0");
  const formatDate = (y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;

  function escapeHtml(v){
    if(v==null) return "";
    return String(v)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  function getStatusLabel(status){
    if(status==="planned") return "계획";
    if(status==="done") return "완료";
    if(status==="cancelled") return "취소";
    return status;
  }

  async function api(url,opt={}){
    const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opt});
    const t=await r.text();
    const d=(()=>{try{return JSON.parse(t)}catch{return t}})();
    if(!r.ok) throw new Error(d?.error||t);
    return d;
  }

  /* ========================= 데이터 ========================= */

  async function loadAll(){
    const [w,p,o,m]=await Promise.all([
      api("/api/works").catch(()=>[]),
      api("/api/plans").catch(()=>[]),
      api("/api/options").catch(()=>({})),
      api("/api/materials").catch(()=>[])
    ]);

    state.works=w||[];
    state.plans=p||[];
    state.materialsMaster=m||[];

    const norm=a=>Array.isArray(a)?a.map(x=>x.name||x):[];
    state.options={
      weather:norm(o.weather||o.options_weather),
      crops:norm(o.crops||o.options_crops),
      tasks:norm(o.tasks||o.options_tasks),
      pests:norm(o.pests||o.options_pests),
      materials:norm(o.materials||o.options_materials),
      machines:norm(o.machines||o.options_machines)
    };
  }

  /* ========================= 렌더 ========================= */

  function render(){
    if(state.currentView==="calendar") renderCalendar();
    else if(state.currentView==="works") renderWorks();
    else main.innerHTML="<div style='padding:20px'>준비중</div>";
  }

  const main = document.querySelector(".content") || document.body;

  /* ========================= 달력 ========================= */

  function renderCalendar(){
    const first=new Date(state.currentYear,state.currentMonth,1).getDay();
    const last=new Date(state.currentYear,state.currentMonth+1,0).getDate();

    let cells="";
    for(let i=0;i<first;i++) cells+="<div></div>";

    for(let d=1;d<=last;d++){
      const ds=formatDate(state.currentYear,state.currentMonth,d);
      const plans=state.plans.filter(p=>p.plan_date===ds);
      const works=state.works.filter(w=>w.start_date===ds);

      cells+=`
        <div class="day" data-date="${ds}">
          <b>${d}</b><br>
          계획 ${plans.length}<br>
          실적 ${works.length}
        </div>`;
    }

    const sel=state.selectedDate;
    const pList=state.plans.filter(p=>p.plan_date===sel);
    const wList=state.works.filter(w=>w.start_date===sel);

    main.innerHTML=`
      <div style="padding:20px">
        <h2>${state.currentYear}년 ${state.currentMonth+1}월</h2>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px">
          ${cells}
        </div>

        <hr>
        <h3>${sel||"날짜 선택"}</h3>

        <h4>작업계획</h4>
        ${pList.map(p=>`
          <div>
            ${p.title} (${getStatusLabel(p.status)})
          </div>
        `).join("")||"없음"}

        <h4>작업실적</h4>
        ${wList.map(w=>`
          <div>${w.task_name}</div>
        `).join("")||"없음"}
      </div>
    `;

    $all(".day").forEach(el=>{
      el.onclick=()=>{state.selectedDate=el.dataset.date;render();}
    });
  }

  /* ========================= 작업일지 (핵심) ========================= */

  function renderWorks(){

    // 날짜별 그룹
    const grouped={};
    state.works.forEach(w=>{
      if(!grouped[w.start_date]) grouped[w.start_date]=[];
      grouped[w.start_date].push(w);
    });

    const dates=Object.keys(grouped).sort().reverse();

    main.innerHTML=`
      <div style="padding:20px">
        <h2>작업일지</h2>

        ${dates.map(date=>`
          <div style="margin-bottom:20px">
            <h3>${date}</h3>

            ${grouped[date].map(w=>`
              <div style="border:1px solid #ccc;padding:10px;margin:5px 0">
                <b>${w.task_name}</b><br>
                작물: ${w.crops}<br>
                병충해: ${w.pests}<br>
                자재: ${w.materials}<br>
                기계: ${w.machines}<br>
                인건비: ${w.labor_cost}<br>
                시간: ${w.work_hours}<br>
                메모: ${w.memo}<br>

                <button data-edit="${w.id}">수정</button>
                <button data-del="${w.id}">삭제</button>
              </div>
            `).join("")}

          </div>
        `).join("")}

      </div>
    `;

    // 삭제
    $all("[data-del]").forEach(btn=>{
      btn.onclick=async()=>{
        if(!confirm("삭제?"))return;
        await api(`/api/works/${btn.dataset.del}`,{method:"DELETE"});
        await loadAll();render();
      };
    });

    // 수정 (간단)
    $all("[data-edit]").forEach(btn=>{
      btn.onclick=async()=>{
        const w=state.works.find(x=>x.id==btn.dataset.edit);
        const name=prompt("작업명",w.task_name);
        if(name==null)return;

        await api(`/api/works/${w.id}`,{
          method:"PUT",
          body:JSON.stringify({...w,task_name:name})
        });

        await loadAll();render();
      };
    });
  }

  /* ========================= 시작 ========================= */

  window.onload=async()=>{
    await loadAll();
    render();

    // 메뉴 연결 (간단)
    document.querySelectorAll("button, .menu-item").forEach(b=>{
      if(b.textContent.includes("작업일지")) b.onclick=()=>{state.currentView="works";render();}
      if(b.textContent.includes("작업달력")) b.onclick=()=>{state.currentView="calendar";render();}
    });
  };

})();
