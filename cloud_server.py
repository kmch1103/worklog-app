import json, os
from datetime import date, datetime
from flask import Flask, jsonify, request, render_template_string
import psycopg
from psycopg.rows import dict_row

app = Flask(__name__)
DATABASE_URL = os.environ.get("DATABASE_URL","")

def db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

# ---------------------------
# 메인 UI
# ---------------------------
@app.route("/")
def home():
    return render_template_string("""
<h2>작업일지</h2>

<button onclick="go('input')">작업입력</button>
<button onclick="loadWorks()">작업목록</button>
<button onclick="loadMaterials()">자재관리</button>
<button onclick="loadCalendar()">달력</button>

<div id="content"></div>

<script>
function go(p){ location.href='/' + p }

async function loadWorks(){
    let d=await fetch('/api/works_light').then(r=>r.json())
    let html="<h3>작업목록</h3>"
    d.forEach(w=>{
        html+=`<div>${w.날짜} - ${w.작업내용}
        <button onclick="edit(${w.번호})">수정</button></div>`
    })
    content.innerHTML=html
}

function edit(id){ location.href='/edit/'+id }

async function loadMaterials(){
    let d=await fetch('/api/materials_all').then(r=>r.json())
    let has="",none=""

    d.forEach(m=>{
        let row=`
        <div>${m.자재명} (${m.재고})
        <input id="q_${m.자재명}" value="${m.재고}">
        <button onclick="u('${m.자재명}')">수정</button>
        <button onclick="del('${m.자재명}')">삭제</button></div>`
        m.재고>0?has+=row:none+=row
    })

    content.innerHTML="<h3>재고 있음</h3>"+has+"<h3>재고 없음</h3>"+none
}

function u(n){
    let v=document.getElementById("q_"+n).value
    fetch('/api/materials/'+n,{method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({재고:v})}).then(loadMaterials)
}

function del(n){
    if(!confirm("삭제?"))return
    fetch('/api/materials/'+n,{method:'DELETE'}).then(loadMaterials)
}

async function loadCalendar(){
    let today=new Date()
    let y=today.getFullYear()
    let m=today.getMonth()+1

    let d=await fetch(`/api/calendar_compare/${y}/${m}`).then(r=>r.json())

    let html="<h3>올해</h3>"
    d.this.forEach(x=> html+=`<div>${x.날짜} ${x.작업내용}</div>`)

    html+="<h3>작년</h3>"
    d.last.forEach(x=> html+=`<div>${x.날짜} ${x.작업내용}</div>`)

    content.innerHTML=html
}
</script>
""")

# ---------------------------
# 입력 화면
# ---------------------------
@app.route("/input")
def input_page():
    return render_template_string("""
<h2>작업 입력</h2>

날짜 <input id="date"><br>
작업 <input id="task"><br>

자재명 <input id="mat"><br>
수량 <input id="qty" type="number"><br>

<button onclick="save()">저장</button>
<button onclick="cancel()">취소</button>

<script>
function save(){
    fetch('/api/works',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
            date:date.value,
            task:task.value,
            materials:[{name:mat.value,qty:qty.value,unit:"개"}]
        })
    }).then(()=>location.href='/')
}
function cancel(){ location.href='/' }
</script>
""")

# ---------------------------
# 수정 화면
# ---------------------------
@app.route("/edit/<int:id>")
def edit_page(id):
    return render_template_string(f"""
<h2>작업 수정 (ID:{id})</h2>

작업내용 <input id="task"><br>

<button onclick="save()">수정</button>
<button onclick="cancel()">취소</button>

<script>
function save(){{
    alert("수정 기능은 확장 가능")
    location.href='/'
}}
function cancel(){{ location.href='/' }}
</script>
""")

# ---------------------------
# 자재 API
# ---------------------------
@app.route("/api/materials_all")
def materials():
    c=db();cur=c.cursor()
    cur.execute('SELECT "자재명","단위","재고" FROM "자재"')
    r=[dict(x) for x in cur.fetchall()]
    cur.close();c.close()
    return jsonify(r)

@app.route("/api/materials/<name>",methods=["PUT"])
def update_mat(name):
    v=float(request.json.get("재고",0))
    c=db();cur=c.cursor()
    cur.execute('UPDATE "자재" SET "재고"=%s WHERE "자재명"=%s',(v,name))
    c.commit();cur.close();c.close()
    return jsonify({"ok":1})

@app.route("/api/materials/<name>",methods=["DELETE"])
def del_mat(name):
    c=db();cur=c.cursor()
    cur.execute('DELETE FROM "자재" WHERE "자재명"=%s',(name,))
    c.commit();cur.close();c.close()
    return jsonify({"ok":1})

# ---------------------------
# 작업 저장 (자재 자동등록)
# ---------------------------
@app.route("/api/works",methods=["POST"])
def add():
    d=request.json or {}
    c=db();cur=c.cursor()

    for m in d.get("materials",[]):
        cur.execute("""
        INSERT INTO "자재" ("자재명","단위","재고")
        VALUES (%s,%s,%s)
        ON CONFLICT ("자재명")
        DO UPDATE SET "재고"="자재"."재고"+EXCLUDED."재고"
        """,(m["name"],m["unit"],float(m["qty"])))

    cur.execute("""
    INSERT INTO "작업일지" ("날짜","작업내용","생성시각")
    VALUES (%s,%s,%s)
    """,(d.get("date") or date.today().isoformat(),
         d.get("task",""),
         datetime.now().isoformat()))

    c.commit();cur.close();c.close()
    return jsonify({"ok":1})

# ---------------------------
# 빠른 조회
# ---------------------------
@app.route("/api/works_light")
def works():
    c=db();cur=c.cursor()
    cur.execute('SELECT "번호","날짜","작업내용" FROM "작업일지" ORDER BY "날짜" DESC LIMIT 100')
    r=[dict(x) for x in cur.fetchall()]
    cur.close();c.close()
    return jsonify(r)

# ---------------------------
# 달력 비교
# ---------------------------
@app.route("/api/calendar_compare/<int:y>/<int:m>")
def cal(y,m):
    c=db();cur=c.cursor()

    cur.execute('SELECT "날짜","작업내용" FROM "작업일지" WHERE "날짜" LIKE %s',(f"{y}-{m:02d}%",))
    now=[dict(x) for x in cur.fetchall()]

    cur.execute('SELECT "날짜","작업내용" FROM "작업일지" WHERE "날짜" LIKE %s',(f"{y-1}-{m:02d}%",))
    prev=[dict(x) for x in cur.fetchall()]

    cur.close();c.close()
    return jsonify({"this":now,"last":prev})

# ---------------------------
if __name__=="__main__":
    app.run(host="0.0.0.0",port=8080)
