import json, os, io
from datetime import date, datetime
from flask import Flask, jsonify, request, render_template_string, send_file
import psycopg
from psycopg.rows import dict_row
import pandas as pd

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
<button onclick="downloadExcel()">엑셀다운로드</button>
<button onclick="downloadMonthly()">월별정산</button>

<div id="content"></div>

<script>
function go(p){ location.href='/' + p }

function downloadExcel(){
    window.location="/api/export_excel"
}

function downloadMonthly(){
    window.location="/api/export_monthly"
}

async function loadWorks(){
    let d=await fetch('/api/works_light').then(r=>r.json())
    let html="<h3>작업목록</h3>"
    d.forEach(w=>{
        html+=`<div>${w.날짜} - ${w.작업내용}</div>`
    })
    content.innerHTML=html
}

async function loadMaterials(){
    let d=await fetch('/api/materials_all').then(r=>r.json())
    let html=""
    d.forEach(m=>{
        html+=`<div>${m.자재명} (${m.재고})</div>`
    })
    content.innerHTML=html
}
</script>
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
function cancel(){ location.href='/' }
</script>
""")

# ---------------------------
# 자재
# ---------------------------
@app.route("/api/materials_all")
def materials():
    c=db();cur=c.cursor()
    cur.execute('SELECT "자재명","단위","재고" FROM "자재"')
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

    # 자재 자동 등록 + 누적
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
         json.dumps(d.get("materials",[]), ensure_ascii=False),
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
# 🔥 엑셀 (자재 상세 포함)
# ---------------------------
@app.route("/api/export_excel")
def export_excel():
    c=db();cur=c.cursor()

    cur.execute("""
        SELECT "번호","날짜","작업내용","자재비","인건비","사용자재"
        FROM "작업일지"
        ORDER BY "날짜" DESC
    """)

    rows=[]
    for r in cur.fetchall():
        row=dict(r)

        # 자재 상세 풀기
        mats=json.loads(row.get("사용자재") or "[]")
        mat_text=", ".join([f"{m['name']}({m['qty']})" for m in mats])

        rows.append({
            "번호":row["번호"],
            "날짜":row["날짜"],
            "작업내용":row["작업내용"],
            "자재상세":mat_text,
            "자재비":row["자재비"],
            "인건비":row["인건비"],
            "총금액":(row["자재비"] or 0)+(row["인건비"] or 0)
        })

    cur.close();c.close()

    df=pd.DataFrame(rows)

    output=io.BytesIO()
    df.to_excel(output,index=False)
    output.seek(0)

    return send_file(output,
        download_name="작업일지_상세.xlsx",
        as_attachment=True)

# ---------------------------
# 🔥 월별 정산 엑셀
# ---------------------------
@app.route("/api/export_monthly")
def export_monthly():
    c=db();cur=c.cursor()

    cur.execute("""
        SELECT
        SUBSTRING("날짜",1,7) as month,
        SUM("자재비") as material,
        SUM("인건비") as wage,
        SUM("자재비"+"인건비") as total
        FROM "작업일지"
        GROUP BY month
        ORDER BY month DESC
    """)

    rows=[dict(x) for x in cur.fetchall()]
    cur.close();c.close()

    df=pd.DataFrame(rows)

    output=io.BytesIO()
    df.to_excel(output,index=False)
    output.seek(0)

    return send_file(output,
        download_name="월별정산.xlsx",
        as_attachment=True)

# ---------------------------
if __name__=="__main__":
    app.run(host="0.0.0.0",port=8080)
