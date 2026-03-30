import json, os, io
from datetime import date, datetime
from flask import Flask, request, jsonify, render_template
from flask import Flask, jsonify, request, render_template_string, send_file
import psycopg
from psycopg.rows import dict_row
import pandas as pd

app = Flask(__name__)
@app.route("/")
def home():
    return render_template("index.html")
DATABASE_URL = os.environ.get("DATABASE_URL","")

def db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

# ---------------------------
# 📱 메인 UI (모바일 최적화)
# ---------------------------

<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:sans-serif;padding:10px}
button{padding:12px;margin:5px;font-size:16px;width:100%}
.card{border:1px solid #ddd;padding:10px;margin:5px;border-radius:10px}
</style>
</head>

<body>

<h2>📒 작업일지</h2>

<button onclick="go('input')">➕ 작업입력</button>
<button onclick="loadWorks()">📋 작업목록</button>
<button onclick="loadMaterials()">📦 자재관리</button>
<button onclick="loadChart()">📊 월별수익</button>
<button onclick="downloadExcel()">⬇ 엑셀</button>
<button onclick="downloadMonthly()">📅 월정산</button>
<button onclick="backup()">☁ 백업</button>

<div id="content"></div>

<script>
function go(p){location.href='/' + p}

function downloadExcel(){location='/api/export_excel'}
function downloadMonthly(){location='/api/export_monthly'}

function backup(){
    fetch('/api/backup').then(()=>alert("백업 완료"))
}

async function loadWorks(){
    let d=await fetch('/api/works_light').then(r=>r.json())
    let html=""
    d.forEach(w=>{
        html+=`<div class="card">${w.날짜}<br>${w.작업내용}</div>`
    })
    content.innerHTML=html
}

async function loadMaterials(){
    let d=await fetch('/api/materials_all').then(r=>r.json())
    let html=""
    d.forEach(m=>{
        html+=`<div class="card">${m.자재명} (${m.재고})</div>`
    })
    content.innerHTML=html
}

async function loadChart(){
    let d=await fetch('/api/monthly_json').then(r=>r.json())

    let html="<h3>월별 수익</h3>"
    d.forEach(x=>{
        html+=`<div class="card">${x.month} → ${x.total}원</div>`
    })
    content.innerHTML=html
}
</script>

</body>
</html>
""")

# ---------------------------
# 입력
# ---------------------------
@app.route("/input")
def input_page():
    return render_template_string("""
<h2>작업 입력</h2>

날짜 <input id="date"><br>
작업 <input id="task"><br>

자재명 <input id="mat"><br>
수량 <input id="qty" type="number"><br>

자재비 <input id="material_cost"><br>
인건비 <input id="wage_cost"><br>

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
            material_cost:material_cost.value,
            wage_cost:wage_cost.value,
            materials:[{name:mat.value,qty:qty.value,unit:"개"}]
        })
    }).then(()=>location.href='/')
}
function cancel(){location.href='/'}
</script>
""")

# ---------------------------
# 자재
# ---------------------------
@app.route("/api/materials_all")
def materials():
    c=db();cur=c.cursor()
    cur.execute('SELECT "자재명","재고" FROM "자재"')
    r=[dict(x) for x in cur.fetchall()]
    cur.close();c.close()
    return jsonify(r)

# ---------------------------
# 작업 저장
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
    INSERT INTO "작업일지"
    ("날짜","작업내용","자재비","인건비","사용자재","생성시각")
    VALUES (%s,%s,%s,%s,%s,%s)
    """,(d.get("date") or date.today().isoformat(),
         d.get("task",""),
         float(d.get("material_cost",0)),
         float(d.get("wage_cost",0)),
         json.dumps(d.get("materials",[]),ensure_ascii=False),
         datetime.now().isoformat()))

    c.commit();cur.close();c.close()
    return jsonify({"ok":1})

# ---------------------------
# 작업 조회
# ---------------------------
@app.route("/api/works_light")
def works():
    c=db();cur=c.cursor()
    cur.execute('SELECT "날짜","작업내용" FROM "작업일지" ORDER BY "날짜" DESC LIMIT 100')
    r=[dict(x) for x in cur.fetchall()]
    cur.close();c.close()
    return jsonify(r)

# ---------------------------
# 📊 월별 JSON (그래프용)
# ---------------------------
@app.route("/api/monthly_json")
def monthly():
    c=db();cur=c.cursor()
    cur.execute("""
        SELECT SUBSTRING("날짜",1,7) as month,
        SUM("자재비"+"인건비") as total
        FROM "작업일지"
        GROUP BY month ORDER BY month DESC
    """)
    r=[dict(x) for x in cur.fetchall()]
    cur.close();c.close()
    return jsonify(r)

# ---------------------------
# 엑셀
# ---------------------------
@app.route("/api/export_excel")
def export_excel():
    c=db();cur=c.cursor()
    cur.execute('SELECT * FROM "작업일지"')
    rows=[dict(x) for x in cur.fetchall()]
    df=pd.DataFrame(rows)
    output=io.BytesIO()
    df.to_excel(output,index=False)
    output.seek(0)
    return send_file(output,download_name="작업일지.xlsx",as_attachment=True)

# ---------------------------
# 월별 엑셀
# ---------------------------
@app.route("/api/export_monthly")
def export_monthly():
    c=db();cur=c.cursor()
    cur.execute("""
        SELECT SUBSTRING("날짜",1,7) as month,
        SUM("자재비") as material,
        SUM("인건비") as wage,
        SUM("자재비"+"인건비") as total
        FROM "작업일지"
        GROUP BY month
    """)
    df=pd.DataFrame([dict(x) for x in cur.fetchall()])
    output=io.BytesIO()
    df.to_excel(output,index=False)
    output.seek(0)
    return send_file(output,download_name="월정산.xlsx",as_attachment=True)

# ---------------------------
# ☁ 백업
# ---------------------------
@app.route("/api/backup")
def backup():
    c=db();cur=c.cursor()
    cur.execute('SELECT * FROM "작업일지"')
    rows=[dict(x) for x in cur.fetchall()]
    cur.close();c.close()

    with open("backup.json","w",encoding="utf-8") as f:
        json.dump(rows,f,ensure_ascii=False)

    return jsonify({"ok":1})

# ---------------------------
if __name__=="__main__":
    app.run(host="0.0.0.0",port=8080)
