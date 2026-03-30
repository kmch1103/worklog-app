import json
import os
from datetime import date, datetime

from flask import Flask, jsonify, render_template_string, request
import psycopg
from psycopg.rows import dict_row

app = Flask(__name__)
DATABASE_URL = os.environ.get("DATABASE_URL", "")

def db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

# ---------------------------
# 메인 UI
# ---------------------------
@app.route("/")
def home():
    return render_template_string("""
    <h2>작업일지</h2>

    <button onclick="goInput()">작업입력</button>
    <button onclick="loadWorks()">작업목록</button>
    <button onclick="loadMaterials()">자재관리</button>

    <div id="content"></div>

<script>
function goInput(){
    location.href='/input'
}

async function loadWorks(){
    const res = await fetch('/api/works_light');
    const data = await res.json();

    let html = "<h3>작업목록</h3>";

    data.forEach(w=>{
        html += `
        <div>
            ${w.날짜} - ${w.작업내용}
            <button onclick="edit(${w.번호})">수정</button>
        </div>`;
    });

    document.getElementById("content").innerHTML = html;
}

function edit(id){
    location.href='/edit/'+id
}

async function loadMaterials(){
    const res = await fetch('/api/materials_all');
    const data = await res.json();

    let has="", none="";

    data.forEach(m=>{
        let row = `
        <div>
            ${m.자재명} (${m.재고})
            <input value="${m.재고}" id="q_${m.자재명}">
            <button onclick="u('${m.자재명}')">수정</button>
        </div>`;

        if(m.재고>0) has+=row;
        else none+=row;
    });

    document.getElementById("content").innerHTML =
        "<h3>재고 있음</h3>"+has+
        "<h3>재고 없음</h3>"+none;
}

function u(name){
    let v=document.getElementById("q_"+name).value;

    fetch('/api/materials/'+name,{
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({재고:v})
    }).then(loadMaterials)
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

    날짜 <input id="date"><br><br>
    작업내용 <input id="task"><br><br>

    자재명 <input id="mat"><br>
    수량 <input id="qty" type="number"><br><br>

    <button onclick="save()">저장</button>
    <button onclick="cancel()">취소</button>

<script>
function save(){
    const data={
        date:document.getElementById("date").value,
        task:document.getElementById("task").value,
        materials:[{
            name:document.getElementById("mat").value,
            qty:document.getElementById("qty").value,
            unit:"개"
        }]
    }

    fetch('/api/works',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(data)
    }).then(()=>location.href='/')
}

function cancel(){
    location.href='/'
}
</script>
    """)

# ---------------------------
# 수정 화면
# ---------------------------
@app.route("/edit/<int:id>")
def edit_page(id):
    return render_template_string(f"""
    <h2>작업 수정</h2>

    작업ID: {id}<br><br>

    작업내용 <input id="task"><br><br>

    <button onclick="save()">수정</button>
    <button onclick="cancel()">취소</button>

<script>
function save(){{
    alert("수정 기능은 다음 단계에서 확장")
    location.href='/'
}}

function cancel(){{
    location.href='/'
}}
</script>
    """)

# ---------------------------
# 자재 API
# ---------------------------
@app.route("/api/materials_all")
def materials_all():
    conn=db();cur=conn.cursor()
    cur.execute('SELECT "자재명","단위","재고" FROM "자재"')
    rows=[dict(r) for r in cur.fetchall()]
    cur.close();conn.close()
    return jsonify(rows)

@app.route("/api/materials/<name>", methods=["PUT"])
def update_material(name):
    qty=float(request.json.get("재고",0))
    conn=db();cur=conn.cursor()
    cur.execute('UPDATE "자재" SET "재고"=%s WHERE "자재명"=%s',(qty,name))
    conn.commit()
    cur.close();conn.close()
    return jsonify({"ok":True})

# ---------------------------
# 작업 저장 (자재 자동등록)
# ---------------------------
@app.route("/api/works", methods=["POST"])
def add_work():
    data=request.json or {}
    conn=db();cur=conn.cursor()

    for m in data.get("materials",[]):
        cur.execute("""
        INSERT INTO "자재" ("자재명","단위","재고")
        VALUES (%s,%s,%s)
        ON CONFLICT ("자재명")
        DO UPDATE SET "재고"="자재"."재고"+EXCLUDED."재고"
        """,(m["name"],m["unit"],float(m["qty"])))

    cur.execute("""
    INSERT INTO "작업일지" ("날짜","작업내용","생성시각")
    VALUES (%s,%s,%s)
    """,(data.get("date") or date.today().isoformat(),
         data.get("task",""),
         datetime.now().isoformat()))

    conn.commit()
    cur.close();conn.close()
    return jsonify({"ok":True})

# ---------------------------
# 빠른 조회
# ---------------------------
@app.route("/api/works_light")
def works():
    conn=db();cur=conn.cursor()
    cur.execute('SELECT "번호","날짜","작업내용" FROM "작업일지" ORDER BY "날짜" DESC LIMIT 100')
    rows=[dict(r) for r in cur.fetchall()]
    cur.close();conn.close()
    return jsonify(rows)

# ---------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
