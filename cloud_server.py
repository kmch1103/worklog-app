from flask import Flask, request, jsonify, render_template
import sqlite3
import json

app = Flask(__name__)
DB = "worklog.db"


def db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_column(cur, table_name, column_name, column_def):
    cols = [r["name"] for r in cur.execute(f"PRAGMA table_info({table_name})").fetchall()]
    if column_name not in cols:
        cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}")


def init_db():
    conn = db()
    cur = conn.cursor()

    # 작업일지
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
        work_hours REAL DEFAULT 0,
        memo TEXT DEFAULT ''
    )
    """)

    # 작업계획
    cur.execute("""
    CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_date TEXT,
        title TEXT,
        details TEXT,
        status TEXT DEFAULT 'planned'
    )
    """)

    # 자재관리
    cur.execute("""
    CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        unit TEXT DEFAULT '',
        stock_qty REAL DEFAULT 0,
        unit_price REAL DEFAULT 0,
        memo TEXT DEFAULT ''
    )
    """)

    # 혹시 예전 materials 테이블이 stock / price 필드만 가진 경우 대비
    ensure_column(cur, "materials", "stock_qty", "REAL DEFAULT 0")
    ensure_column(cur, "materials", "unit_price", "REAL DEFAULT 0")
    ensure_column(cur, "materials", "unit", "TEXT DEFAULT ''")
    ensure_column(cur, "materials", "memo", "TEXT DEFAULT ''")

    # 옵션 테이블들
    option_types = ["weather", "crops", "tasks", "pests", "materials", "machines"]
    for t in option_types:
        cur.execute(f"""
        CREATE TABLE IF NOT EXISTS options_{t} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
        """)

    conn.commit()
    conn.close()


init_db()


def rows_to_dicts(rows):
    return [dict(r) for r in rows]


def normalize_option_name(name):
    return (name or "").strip()


def sync_material_option(cur, material_name):
    name = normalize_option_name(material_name)
    if not name:
        return
    row = cur.execute(
        "SELECT id FROM options_materials WHERE name = ?",
        (name,)
    ).fetchone()
    if not row:
        cur.execute(
            "INSERT INTO options_materials (name) VALUES (?)",
            (name,)
        )


@app.route("/")
def index():
    return render_template("index.html")


# =========================
# WORKS
# =========================
@app.route("/api/works", methods=["GET"])
def get_works():
    conn = db()
    rows = conn.execute("SELECT * FROM works ORDER BY start_date DESC, id DESC").fetchall()
    conn.close()
    return jsonify(rows_to_dicts(rows))


@app.route("/api/works", methods=["POST"])
def create_work():
    data = request.get_json(force=True) or {}

    conn = db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO works (
            start_date, end_date, weather, task_name,
            crops, pests, machines, work_hours, memo
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("start_date", ""),
        data.get("end_date", ""),
        data.get("weather", ""),
        data.get("task_name", ""),
        data.get("crops", ""),
        data.get("pests", ""),
        data.get("machines", ""),
        float(data.get("work_hours") or 0),
        data.get("memo", "")
    ))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/works/<int:work_id>", methods=["PUT"])
def update_work(work_id):
    data = request.get_json(force=True) or {}

    conn = db()
    cur = conn.cursor()
    cur.execute("""
        UPDATE works
        SET start_date = ?,
            end_date = ?,
            weather = ?,
            task_name = ?,
            crops = ?,
            pests = ?,
            machines = ?,
            work_hours = ?,
            memo = ?
        WHERE id = ?
    """, (
        data.get("start_date", ""),
        data.get("end_date", ""),
        data.get("weather", ""),
        data.get("task_name", ""),
        data.get("crops", ""),
        data.get("pests", ""),
        data.get("machines", ""),
        float(data.get("work_hours") or 0),
        data.get("memo", ""),
        work_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/works/<int:work_id>", methods=["DELETE"])
def delete_work(work_id):
    conn = db()
    conn.execute("DELETE FROM works WHERE id = ?", (work_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# =========================
# PLANS
# =========================
@app.route("/api/plans", methods=["GET"])
def get_plans():
    conn = db()
    rows = conn.execute("SELECT * FROM plans ORDER BY plan_date DESC, id DESC").fetchall()
    conn.close()
    return jsonify(rows_to_dicts(rows))


@app.route("/api/plans", methods=["POST"])
def create_plan():
    data = request.get_json(force=True) or {}

    conn = db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO plans (plan_date, title, details, status)
        VALUES (?, ?, ?, ?)
    """, (
        data.get("plan_date", ""),
        data.get("title", ""),
        data.get("details", ""),
        data.get("status", "planned")
    ))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/plans/<int:plan_id>", methods=["PUT"])
def update_plan(plan_id):
    data = request.get_json(force=True) or {}

    conn = db()
    cur = conn.cursor()
    cur.execute("""
        UPDATE plans
        SET plan_date = ?,
            title = ?,
            details = ?,
            status = ?
        WHERE id = ?
    """, (
        data.get("plan_date", ""),
        data.get("title", ""),
        data.get("details", ""),
        data.get("status", "planned"),
        plan_id
    ))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/plans/<int:plan_id>", methods=["DELETE"])
def delete_plan(plan_id):
    conn = db()
    conn.execute("DELETE FROM plans WHERE id = ?", (plan_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# =========================
# OPTIONS
# =========================
@app.route("/api/options", methods=["GET"])
def get_options():
    conn = db()
    result = {}

    for t in ["weather", "crops", "tasks", "pests", "materials", "machines"]:
        rows = conn.execute(
            f"SELECT id, name FROM options_{t} ORDER BY name"
        ).fetchall()
        result[t] = rows_to_dicts(rows)

    conn.close()
    return jsonify(result)


@app.route("/api/options/<option_type>", methods=["POST"])
def create_option(option_type):
    if option_type not in ["weather", "crops", "tasks", "pests", "materials", "machines"]:
        return jsonify({"ok": False, "error": "invalid option type"}), 400

    data = request.get_json(force=True) or {}
    name = normalize_option_name(data.get("name"))

    if not name:
        return jsonify({"ok": False, "error": "name required"}), 400

    conn = db()
    cur = conn.cursor()
    cur.execute(
        f"INSERT OR IGNORE INTO options_{option_type} (name) VALUES (?)",
        (name,)
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/options/<option_type>/<int:option_id>", methods=["PUT"])
def update_option(option_type, option_id):
    if option_type not in ["weather", "crops", "tasks", "pests", "materials", "machines"]:
        return jsonify({"ok": False, "error": "invalid option type"}), 400

    data = request.get_json(force=True) or {}
    new_name = normalize_option_name(data.get("name"))

    if not new_name:
        return jsonify({"ok": False, "error": "name required"}), 400

    conn = db()
    cur = conn.cursor()

    old_row = cur.execute(
        f"SELECT name FROM options_{option_type} WHERE id = ?",
        (option_id,)
    ).fetchone()

    cur.execute(
        f"UPDATE options_{option_type} SET name = ? WHERE id = ?",
        (new_name, option_id)
    )

    # 사용자재 옵션 이름 수정 시 materials 테이블 이름도 같이 수정
    if option_type == "materials" and old_row:
        old_name = old_row["name"]
        cur.execute(
            "UPDATE materials SET name = ? WHERE name = ?",
            (new_name, old_name)
        )

    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/options/<option_type>/<int:option_id>", methods=["DELETE"])
def delete_option(option_type, option_id):
    if option_type not in ["weather", "crops", "tasks", "pests", "materials", "machines"]:
        return jsonify({"ok": False, "error": "invalid option type"}), 400

    conn = db()
    cur = conn.cursor()

    row = cur.execute(
        f"SELECT name FROM options_{option_type} WHERE id = ?",
        (option_id,)
    ).fetchone()

    cur.execute(
        f"DELETE FROM options_{option_type} WHERE id = ?",
        (option_id,)
    )

    # 사용자재 옵션 삭제 시 materials에서도 같은 이름 자재 삭제
    if option_type == "materials" and row:
        cur.execute("DELETE FROM materials WHERE name = ?", (row["name"],))

    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# =========================
# MATERIALS
# =========================
@app.route("/api/materials", methods=["GET"])
def get_materials():
    conn = db()
    rows = conn.execute("""
        SELECT id, name, unit, stock_qty, unit_price, memo
        FROM materials
        ORDER BY
          CASE WHEN COALESCE(stock_qty, 0) > 0 THEN 0 ELSE 1 END,
          name
    """).fetchall()
    conn.close()
    return jsonify(rows_to_dicts(rows))


@app.route("/api/materials", methods=["POST"])
def create_material():
    data = request.get_json(force=True) or {}

    name = normalize_option_name(data.get("name"))
    unit = (data.get("unit") or "").strip()
    stock_qty = float(data.get("stock_qty") or 0)
    unit_price = float(data.get("unit_price") or 0)
    memo = (data.get("memo") or "").strip()

    if not name:
        return jsonify({"ok": False, "error": "name required"}), 400

    conn = db()
    cur = conn.cursor()

    # 같은 이름 있으면 갱신
    row = cur.execute(
        "SELECT id FROM materials WHERE name = ?",
        (name,)
    ).fetchone()

    if row:
        cur.execute("""
            UPDATE materials
            SET unit = ?, stock_qty = ?, unit_price = ?, memo = ?
            WHERE id = ?
        """, (unit, stock_qty, unit_price, memo, row["id"]))
    else:
        cur.execute("""
            INSERT INTO materials (name, unit, stock_qty, unit_price, memo)
            VALUES (?, ?, ?, ?, ?)
        """, (name, unit, stock_qty, unit_price, memo))

    # 옵션관리 사용자재와 자동 연동
    sync_material_option(cur, name)

    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/materials/<int:material_id>", methods=["PUT"])
def update_material(material_id):
    data = request.get_json(force=True) or {}

    name = normalize_option_name(data.get("name"))
    unit = (data.get("unit") or "").strip()
    stock_qty = float(data.get("stock_qty") or 0)
    unit_price = float(data.get("unit_price") or 0)
    memo = (data.get("memo") or "").strip()

    if not name:
        return jsonify({"ok": False, "error": "name required"}), 400

    conn = db()
    cur = conn.cursor()

    old_row = cur.execute(
        "SELECT name FROM materials WHERE id = ?",
        (material_id,)
    ).fetchone()

    cur.execute("""
        UPDATE materials
        SET name = ?, unit = ?, stock_qty = ?, unit_price = ?, memo = ?
        WHERE id = ?
    """, (name, unit, stock_qty, unit_price, memo, material_id))

    # 자재명 바뀌면 옵션관리 사용자재 이름도 같이 변경
    if old_row:
        old_name = old_row["name"]
        opt_row = cur.execute(
            "SELECT id FROM options_materials WHERE name = ?",
            (old_name,)
        ).fetchone()
        if opt_row:
            cur.execute(
                "UPDATE options_materials SET name = ? WHERE id = ?",
                (name, opt_row["id"])
            )
        else:
            sync_material_option(cur, name)
    else:
        sync_material_option(cur, name)

    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/materials/<int:material_id>", methods=["DELETE"])
def delete_material(material_id):
    conn = db()
    cur = conn.cursor()

    row = cur.execute(
        "SELECT name FROM materials WHERE id = ?",
        (material_id,)
    ).fetchone()

    cur.execute("DELETE FROM materials WHERE id = ?", (material_id,))

    # 자재 삭제 시 옵션 사용자재도 같은 이름이면 삭제
    if row:
        cur.execute(
            "DELETE FROM options_materials WHERE name = ?",
            (row["name"],)
        )

    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# =========================
# MONEY
# =========================
@app.route("/api/money", methods=["GET"])
def get_money():
    conn = db()
    rows = conn.execute("SELECT * FROM works ORDER BY start_date DESC, id DESC").fetchall()
    conn.close()

    result = []
    for row in rows:
        item = dict(row)
        memo = {}
        try:
            memo = json.loads(item.get("memo") or "{}")
        except Exception:
            memo = {}

        money = memo.get("money") or {}
        if not money:
            continue

        result.append({
            "date": item.get("start_date", ""),
            "task_name": item.get("task_name", ""),
            "type": money.get("type", ""),
            "total": float(money.get("total_amount") or money.get("amount") or 0),
            "method": money.get("method", ""),
            "note": money.get("note", "")
        })

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)
