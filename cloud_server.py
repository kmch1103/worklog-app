from flask import Flask, request, jsonify, render_template
import sqlite3, json, datetime

app = Flask(__name__)

DB = "worklog.db"

# =========================
# DB 연결
# =========================
def db():
    return sqlite3.connect(DB)

# =========================
# 기본 페이지
# =========================
@app.route("/")
def index():
    return render_template("index.html")

# =========================
# 작업 조회
# =========================
@app.route("/api/works", methods=["GET"])
def get_works():
    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM works ORDER BY start_date DESC")
    rows = cur.fetchall()
    cols = [c[0] for c in cur.description]

    result = []
    for r in rows:
        item = dict(zip(cols, r))
        result.append(item)

    conn.close()
    return jsonify(result)

# =========================
# 작업 저장
# =========================
@app.route("/api/works", methods=["POST"])
def save_work():
    data = request.json

    conn = db()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO works (
        start_date, end_date, weather, task_name,
        crops, pests, machines,
        work_hours, memo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("start_date"),
        data.get("end_date"),
        data.get("weather"),
        data.get("task_name"),
        data.get("crops"),
        data.get("pests"),
        data.get("machines"),
        data.get("work_hours"),
        data.get("memo")
    ))

    conn.commit()
    conn.close()

    return jsonify({"result": "ok"})

# =========================
# 작업 수정
# =========================
@app.route("/api/works/<int:id>", methods=["PUT"])
def update_work(id):
    data = request.json

    conn = db()
    cur = conn.cursor()

    cur.execute("""
    UPDATE works SET
        start_date=?,
        end_date=?,
        weather=?,
        task_name=?,
        crops=?,
        pests=?,
        machines=?,
        work_hours=?,
        memo=?
    WHERE id=?
    """, (
        data.get("start_date"),
        data.get("end_date"),
        data.get("weather"),
        data.get("task_name"),
        data.get("crops"),
        data.get("pests"),
        data.get("machines"),
        data.get("work_hours"),
        data.get("memo"),
        id
    ))

    conn.commit()
    conn.close()

    return jsonify({"result": "ok"})

# =========================
# 삭제
# =========================
@app.route("/api/works/<int:id>", methods=["DELETE"])
def delete_work(id):
    conn = db()
    cur = conn.cursor()
    cur.execute("DELETE FROM works WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"result": "ok"})

# =========================
# 금전관리
# =========================
@app.route("/api/money", methods=["GET"])
def money():
    start = request.args.get("start")
    end = request.args.get("end")
    mtype = request.args.get("type")
    method = request.args.get("method")

    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM works")
    rows = cur.fetchall()
    cols = [c[0] for c in cur.description]

    result = []

    for r in rows:
        item = dict(zip(cols, r))

        try:
            memo = json.loads(item.get("memo") or "{}")
        except:
            memo = {}

        money = memo.get("money", {})

        if not money:
            continue

        date = item.get("start_date")

        # 날짜 필터
        if start and date < start:
            continue
        if end and date > end:
            continue

        # 구분
        if mtype and money.get("type") != mtype:
            continue

        # 방식
        if method and money.get("method") != method:
            continue

        result.append({
            "date": date,
            "task": item.get("task_name"),
            "type": money.get("type"),
            "amount": money.get("amount", 0),
            "method": money.get("method"),
            "note": money.get("note", "")
        })

    conn.close()
    return jsonify(result)

# =========================
# 옵션관리
# =========================
@app.route("/api/options", methods=["GET"])
def options():
    conn = db()
    cur = conn.cursor()

    result = {
        "weather": [],
        "crops": [],
        "tasks": [],
        "pests": [],
        "machines": []
    }

    for key in result.keys():
        try:
            cur.execute(f"SELECT name FROM options_{key}")
            result[key] = [r[0] for r in cur.fetchall()]
        except:
            pass

    conn.close()
    return jsonify(result)

# =========================
# 실행
# =========================
if __name__ == "__main__":
    app.run(debug=True)
