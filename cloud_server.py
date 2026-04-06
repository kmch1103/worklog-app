from flask import Flask, request, jsonify, render_template
import sqlite3, json

app = Flask(__name__)
DB = "worklog.db"

def db():
    return sqlite3.connect(DB)

# =========================
# DB 초기화 (자동 생성)
# =========================
def init_db():
    conn = db()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS works (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_date TEXT,
        end_date TEXT,
        weather TEXT,
        task_name TEXT,
        crops TEXT,
        pests TEXT,
        machines TEXT,
        work_hours TEXT,
        memo TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_date TEXT,
        title TEXT,
        details TEXT,
        status TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        unit TEXT,
        stock REAL,
        price REAL,
        memo TEXT
    )
    """)

    conn.commit()
    conn.close()

init_db()

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
    conn.close()
    return jsonify([dict(zip(cols, r)) for r in rows])

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
    conn.close()
    return jsonify([dict(zip(cols, r)) for r in rows])

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

# =========================
# OPTIONS (핵심 수정)
# =========================
@app.route("/api/options", methods=["GET"])
def get_options():
    conn = db()
    cur = conn.cursor()

    result = {}
    for t in ["weather","crops","tasks","pests","materials","machines"]:
        cur.execute(f"""
        CREATE TABLE IF NOT EXISTS options_{t} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT
        )
        """)
        cur.execute(f"SELECT id,name FROM options_{t}")
        result[t] = [{"id":r[0],"name":r[1]} for r in cur.fetchall()]

    conn.close()
    return jsonify(result)

@app.route("/api/options/<type>", methods=["POST"])
def save_option(type):
    data = request.json
    conn = db()
    cur = conn.cursor()

    cur.execute(f"INSERT INTO options_{type} (name) VALUES (?)", (data["name"],))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/options/<type>/<int:id>", methods=["PUT"])
def update_option(type, id):
    data = request.json
    conn = db()
    cur = conn.cursor()

    cur.execute(f"UPDATE options_{type} SET name=? WHERE id=?", (data["name"], id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/options/<type>/<int:id>", methods=["DELETE"])
def delete_option(type, id):
    conn = db()
    cur = conn.cursor()

    cur.execute(f"DELETE FROM options_{type} WHERE id=?", (id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# =========================
# MATERIALS (핵심 추가)
# =========================
@app.route("/api/materials", methods=["GET"])
def get_materials():
    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM materials")
    rows = cur.fetchall()
    cols = [c[0] for c in cur.description]
    conn.close()
    return jsonify([dict(zip(cols, r)) for r in rows])

@app.route("/api/materials", methods=["POST"])
def save_material():
    data = request.json
    conn = db()
    cur = conn.cursor()

    cur.execute("""
    INSERT INTO materials (name,unit,stock,price,memo)
    VALUES (?,?,?,?,?)
    """, (
        data.get("name"),
        data.get("unit"),
        data.get("stock"),
        data.get("price"),
        data.get("memo")
    ))

    conn.commit()
    conn.close()
    return jsonify({"ok": True})
