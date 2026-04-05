from flask import Flask, request, jsonify, render_template
import sqlite3, json

app = Flask(__name__)
DB = "worklog.db"

def db():
    return sqlite3.connect(DB)

@app.route("/")
def index():
    return render_template("index.html")

# =========================
# WORKS
# =========================
@app.route("/api/works", methods=["GET"])
def get_works():
    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM works ORDER BY start_date DESC")
    rows = cur.fetchall()
    cols = [c[0] for c in cur.description]
    result = [dict(zip(cols, r)) for r in rows]
    conn.close()
    return jsonify(result)

@app.route("/api/works", methods=["POST"])
def save_work():
    data = request.json
    conn = db()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO works
    (start_date,end_date,weather,task_name,crops,pests,machines,work_hours,memo)
    VALUES (?,?,?,?,?,?,?,?,?)
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
    return jsonify({"ok": True})

@app.route("/api/works/<int:id>", methods=["PUT"])
def update_work(id):
    data = request.json
    conn = db()
    cur = conn.cursor()

    cur.execute("""
    UPDATE works SET
    start_date=?,end_date=?,weather=?,task_name=?,
    crops=?,pests=?,machines=?,work_hours=?,memo=?
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
    return jsonify({"ok": True})

@app.route("/api/works/<int:id>", methods=["DELETE"])
def delete_work(id):
    conn = db()
    cur = conn.cursor()
    cur.execute("DELETE FROM works WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# =========================
# PLANS
# =========================
@app.route("/api/plans", methods=["GET"])
def get_plans():
    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM plans ORDER BY plan_date DESC")
    rows = cur.fetchall()
    cols = [c[0] for c in cur.description]
    result = [dict(zip(cols, r)) for r in rows]
    conn.close()
    return jsonify(result)

@app.route("/api/plans", methods=["POST"])
def save_plan():
    data = request.json
    conn = db()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO plans (plan_date,title,details,status)
    VALUES (?,?,?,?)
    """, (
        data.get("plan_date"),
        data.get("title"),
        data.get("details"),
        data.get("status")
    ))

    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/plans/<int:id>", methods=["PUT"])
def update_plan(id):
    data = request.json
    conn = db()
    cur = conn.cursor()

    cur.execute("""
    UPDATE plans SET
    plan_date=?,title=?,details=?,status=?
    WHERE id=?
    """, (
        data.get("plan_date"),
        data.get("title"),
        data.get("details"),
        data.get("status"),
        id
    ))

    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/plans/<int:id>", methods=["DELETE"])
def delete_plan(id):
    conn = db()
    cur = conn.cursor()
    cur.execute("DELETE FROM plans WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# =========================
# OPTIONS
# =========================
@app.route("/api/options", methods=["GET"])
def get_options():
    conn = db()
    cur = conn.cursor()

    result = {}
    for t in ["weather","crops","tasks","pests","machines"]:
        try:
            cur.execute(f"SELECT name FROM options_{t}")
            result[t] = [r[0] for r in cur.fetchall()]
        except:
            result[t] = []

    conn.close()
    return jsonify(result)

@app.route("/api/options/<type>", methods=["POST"])
def save_option(type):
    data = request.json
    name = data.get("name")

    conn = db()
    cur = conn.cursor()

    cur.execute(f"""
    CREATE TABLE IF NOT EXISTS options_{type} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT
    )
    """)

    cur.execute(f"INSERT INTO options_{type} (name) VALUES (?)", (name,))
    conn.commit()
    conn.close()

    return jsonify({"ok": True})

# =========================
# MONEY
# =========================
@app.route("/api/money")
def money():
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

        m = memo.get("money")
        if not m: continue

        result.append({
            "date": item["start_date"],
            "task": item["task_name"],
            "type": m.get("type"),
            "amount": m.get("total_amount",0),
            "method": m.get("method"),
            "note": m.get("note")
        })

    conn.close()
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)
