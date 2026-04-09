from flask import Flask, request, jsonify, render_template
import sqlite3
import json
import os
import tempfile
import uuid
from datetime import datetime

app = Flask(__name__)
DB = "worklog.db"


def db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def rows_to_dicts(rows):
    return [dict(r) for r in rows]


def ensure_column(cur, table_name, column_name, column_def):
    cols = [r["name"] for r in cur.execute(f"PRAGMA table_info({table_name})").fetchall()]
    if column_name not in cols:
        cur.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}")


def normalize_name(value):
    return (value or "").strip()


def sync_material_option(cur, material_name):
    name = normalize_name(material_name)
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


def safe_float(value, default=0):
    try:
        if value is None or value == "":
            return default
        return float(value)
    except Exception:
        return default


def row_value(row, key, default=""):
    try:
        value = row[key]
        return default if value is None else value
    except Exception:
        return default


def parse_old_materials(raw_text, material_price_map):
    raw = (raw_text or "").strip()
    if not raw:
        return []

    parts = [p.strip() for p in raw.split(";") if p.strip()]
    result = []

    for part in parts:
        tokens = [t.strip() for t in part.split("|")]
        name = tokens[0] if len(tokens) >= 1 else ""
        qty = safe_float(tokens[1], 0) if len(tokens) >= 2 else 0
        unit = tokens[2] if len(tokens) >= 3 else ""
        price = safe_float(material_price_map.get(name), 0)

        if not name:
            continue

        result.append({
            "id": "",
            "name": name,
            "unit": unit,
            "price": price,
            "qty": qty,
            "method": ""
        })

    return result


def parse_old_labor_rows(row):
    raw = str(row_value(row, "인력내역", "") or "").strip()
    rows = []

    if raw:
        for chunk in raw.split(";"):
            chunk = chunk.strip()
            if not chunk:
                continue

            tokens = [t.strip() for t in chunk.split("|")]
            labor_type = tokens[0] if len(tokens) >= 1 else ""
            count = int(safe_float(tokens[1], 0)) if len(tokens) >= 2 else 0
            price = safe_float(tokens[2], 0) if len(tokens) >= 3 else 0
            note = tokens[3] if len(tokens) >= 4 else ""
            amount = count * price

            if count > 0 or price > 0 or note:
                rows.append({
                    "type": labor_type,
                    "count": count,
                    "price": price,
                    "amount": amount,
                    "method": "",
                    "note": note
                })

    if rows:
        return rows

    legacy_map = [
        ("남자", "남자수", "남자단가"),
        ("여자", "여자수", "여자단가"),
        ("기타", "기타수", "기타단가")
    ]

    for labor_type, count_key, price_key in legacy_map:
        count = int(safe_float(row_value(row, count_key, 0), 0))
        price = safe_float(row_value(row, price_key, 0), 0)
        amount = count * price
        if count > 0 or price > 0:
            rows.append({
                "type": labor_type,
                "count": count,
                "price": price,
                "amount": amount,
                "method": "",
                "note": ""
            })

    return rows


def build_import_money(materials, labor_rows, legacy_labor_cost):
    material_total = sum(safe_float(item.get("qty"), 0) * safe_float(item.get("price"), 0) for item in materials)
    labor_total = sum(safe_float(item.get("amount"), 0) for item in labor_rows)

    if labor_total <= 0:
        labor_total = safe_float(legacy_labor_cost, 0)

    total_amount = labor_total + material_total
    if total_amount <= 0:
        return None

    if labor_total > 0 and material_total > 0:
        money_type = "인건비+자재비"
    elif labor_total > 0:
        money_type = "인건비"
    elif material_total > 0:
        money_type = "자재비"
    else:
        money_type = "기타"

    return {
        "type": money_type,
        "total_amount": total_amount,
        "labor_total": labor_total,
        "material_total": material_total,
        "other_total": 0,
        "method": "",
        "note": "기존 DB 가져오기"
    }


def clear_current_data(cur):
    cur.execute("DELETE FROM works")
    cur.execute("DELETE FROM materials")
    for t in ["weather", "crops", "tasks", "pests", "materials", "machines"]:
        cur.execute(f"DELETE FROM options_{t}")


def import_old_options(old_conn, cur, old_table, new_table, old_column):
    try:
        rows = old_conn.execute(f"SELECT {old_column} FROM '{old_table}'").fetchall()
        for row in rows:
            name = normalize_name(row[0])
            if name:
                cur.execute(f"INSERT OR IGNORE INTO {new_table} (name) VALUES (?)", (name,))
    except Exception:
        pass


def import_old_db_into_current(uploaded_db_path):
    old_conn = sqlite3.connect(uploaded_db_path)
    old_conn.row_factory = sqlite3.Row

    conn = db()
    cur = conn.cursor()

    try:
        material_rows = old_conn.execute("SELECT 자재명, 단위, 가격, 재고 FROM 자재").fetchall()
        material_price_map = {}
        for row in material_rows:
            name = normalize_name(row_value(row, "자재명", ""))
            if name:
                material_price_map[name] = safe_float(row_value(row, "가격", 0), 0)

        clear_current_data(cur)

        for row in material_rows:
            name = normalize_name(row_value(row, "자재명", ""))
            unit = normalize_name(row_value(row, "단위", ""))
            unit_price = safe_float(row_value(row, "가격", 0), 0)
            stock_qty = safe_float(row_value(row, "재고", 0), 0)

            if not name:
                continue

            cur.execute("""
                INSERT INTO materials (name, unit, stock_qty, unit_price, memo)
                VALUES (?, ?, ?, ?, '')
            """, (name, unit, stock_qty, unit_price))
            sync_material_option(cur, name)

        import_old_options(old_conn, cur, "옵션_날씨", "options_weather", "항목")
        import_old_options(old_conn, cur, "옵션_작물", "options_crops", "항목")
        import_old_options(old_conn, cur, "옵션_작업내용", "options_tasks", "항목")
        import_old_options(old_conn, cur, "옵션_기계", "options_machines", "항목")
        import_old_options(old_conn, cur, "병충해", "options_pests", "이름")

        work_rows = old_conn.execute("SELECT * FROM 작업일지 ORDER BY 날짜 ASC, 번호 ASC").fetchall()

        for row in work_rows:
            materials = parse_old_materials(row_value(row, "사용자재", ""), material_price_map)
            labor_rows = parse_old_labor_rows(row)
            money = build_import_money(materials, labor_rows, row_value(row, "인건비", 0))

            memo_obj = {
                "memo_text": str(row_value(row, "비고", "") or ""),
                "repeat_days": 1,
                "start_time": str(row_value(row, "시작시간", "") or ""),
                "end_time": str(row_value(row, "종료시간", "") or ""),
                "materials": materials,
                "labor_rows": labor_rows,
                "work_hours": safe_float(row_value(row, "작업시간", 0), 0),
                "money": money,
                "legacy": {
                    "created_at": str(row_value(row, "생성시각", "") or ""),
                    "updated_at": str(row_value(row, "수정시각", "") or ""),
                    "work_list": str(row_value(row, "작업목록", "") or "")
                }
            }

            cur.execute("""
                INSERT INTO works (
                    start_date, end_date, weather, task_name,
                    crops, pests, machines, work_hours, memo
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(row_value(row, "날짜", "") or ""),
                str(row_value(row, "종료날짜", "") or row_value(row, "날짜", "") or ""),
                str(row_value(row, "날씨", "") or ""),
                str(row_value(row, "작업내용", "") or ""),
                str(row_value(row, "작물", "") or ""),
                str(row_value(row, "적용병충해", "") or ""),
                str(row_value(row, "사용기계", "") or ""),
                safe_float(row_value(row, "작업시간", 0), 0),
                json.dumps(memo_obj, ensure_ascii=False)
            ))

        conn.commit()
        return {
            "ok": True,
            "imported": {
                "works": len(work_rows),
                "materials": len(material_rows)
            }
        }
    except Exception as e:
        conn.rollback()
        return {"ok": False, "error": str(e)}
    finally:
        conn.close()
        old_conn.close()



def current_timestamp():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def get_season_row(conn, season_id):
    if season_id in (None, '', 'all'):
        return None

    if season_id == 'current':
        return conn.execute("SELECT * FROM seasons WHERE is_current = 1 ORDER BY id DESC LIMIT 1").fetchone()

    try:
        sid = int(season_id)
    except Exception:
        return None

    return conn.execute("SELECT * FROM seasons WHERE id = ?", (sid,)).fetchone()


def apply_season_filter_sql(base_sql, season_row, date_column='start_date'):
    if not season_row:
        return base_sql, ()
    return f"{base_sql} WHERE {date_column} BETWEEN ? AND ?", (season_row['start_date'], season_row['end_date'])


def season_payload(row):
    if not row:
        return None
    return {
        'id': row['id'],
        'season_name': row['season_name'],
        'start_date': row['start_date'],
        'end_date': row['end_date'],
        'is_current': row['is_current'],
        'note': row['note'],
        'created_at': row['created_at'],
    }

def init_db():
    conn = db()
    cur = conn.cursor()

    # works
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

    ensure_column(cur, "works", "end_date", "TEXT")
    ensure_column(cur, "works", "weather", "TEXT")
    ensure_column(cur, "works", "task_name", "TEXT")
    ensure_column(cur, "works", "crops", "TEXT")
    ensure_column(cur, "works", "pests", "TEXT")
    ensure_column(cur, "works", "machines", "TEXT")
    ensure_column(cur, "works", "work_hours", "REAL DEFAULT 0")
    ensure_column(cur, "works", "memo", "TEXT DEFAULT ''")


    
    # plans
    cur.execute("""
    CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_date TEXT,
        title TEXT,
        details TEXT,
        status TEXT DEFAULT 'planned'
    )
    """)

    # materials
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

    ensure_column(cur, "materials", "unit", "TEXT DEFAULT ''")
    ensure_column(cur, "materials", "stock_qty", "REAL DEFAULT 0")
    ensure_column(cur, "materials", "unit_price", "REAL DEFAULT 0")
    ensure_column(cur, "materials", "memo", "TEXT DEFAULT ''")

    # option tables
    for t in ["weather", "crops", "tasks", "pests", "materials", "machines"]:
        cur.execute(f"""
        CREATE TABLE IF NOT EXISTS options_{t} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
        """)
    ensure_column(cur, "options_pests", "recommended_materials", "TEXT DEFAULT ''")

    # seasons
    cur.execute("""
    CREATE TABLE IF NOT EXISTS seasons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        season_name TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        is_current INTEGER DEFAULT 0,
        note TEXT DEFAULT '',
        created_at TEXT DEFAULT ''
    )
    """)
    ensure_column(cur, "seasons", "note", "TEXT DEFAULT ''")
    ensure_column(cur, "seasons", "created_at", "TEXT DEFAULT ''")

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
    season_id = (request.args.get("season_id") or "").strip()
    season = get_season_row(conn, season_id)
    sql, params = apply_season_filter_sql("SELECT * FROM works", season, "start_date")
    rows = conn.execute(sql + " ORDER BY start_date DESC, id DESC", params).fetchall()
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
    rows = conn.execute(
        "SELECT * FROM plans ORDER BY plan_date DESC, id DESC"
    ).fetchall()
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

    # 프론트에서 지금 쓰는 것만 내려줌
    result = {}
    for t in ["weather", "crops", "tasks", "machines"]:
        rows = conn.execute(
            f"SELECT id, name FROM options_{t} ORDER BY name"
        ).fetchall()
        result[t] = rows_to_dicts(rows)

    pest_rows = conn.execute("""
        SELECT id, name, COALESCE(recommended_materials, '') AS recommended_materials
        FROM options_pests
        ORDER BY name
    """).fetchall()
    result["pests"] = rows_to_dicts(pest_rows)

    conn.close()
    return jsonify(result)


@app.route("/api/options/<option_type>", methods=["POST"])
def create_option(option_type):
    if option_type not in ["weather", "crops", "tasks", "pests", "machines", "materials"]:
        return jsonify({"ok": False, "error": "invalid option type"}), 400

    data = request.get_json(force=True) or {}
    name = normalize_name(data.get("name"))
    recommended_materials = normalize_name(data.get("recommended_materials"))
    if not name:
        return jsonify({"ok": False, "error": "name required"}), 400

    conn = db()
    cur = conn.cursor()

    if option_type == "pests":
        cur.execute(
            "INSERT OR IGNORE INTO options_pests (name, recommended_materials) VALUES (?, ?)",
            (name, recommended_materials)
        )
        cur.execute(
            "UPDATE options_pests SET recommended_materials = ? WHERE name = ?",
            (recommended_materials, name)
        )
    else:
        cur.execute(
            f"INSERT OR IGNORE INTO options_{option_type} (name) VALUES (?)",
            (name,)
        )

    # materials 옵션을 직접 만들면 materials 테이블에도 최소 등록
    if option_type == "materials":
        row = cur.execute(
            "SELECT id FROM materials WHERE name = ?",
            (name,)
        ).fetchone()
        if not row:
            cur.execute("""
                INSERT INTO materials (name, unit, stock_qty, unit_price, memo)
                VALUES (?, '', 0, 0, '')
            """, (name,))

    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/options/<option_type>/<int:option_id>", methods=["PUT"])
def update_option(option_type, option_id):
    if option_type not in ["weather", "crops", "tasks", "pests", "machines", "materials"]:
        return jsonify({"ok": False, "error": "invalid option type"}), 400

    data = request.get_json(force=True) or {}
    new_name = normalize_name(data.get("name"))
    recommended_materials = normalize_name(data.get("recommended_materials"))
    if not new_name:
        return jsonify({"ok": False, "error": "name required"}), 400

    conn = db()
    cur = conn.cursor()

    old_row = cur.execute(
        f"SELECT name FROM options_{option_type} WHERE id = ?",
        (option_id,)
    ).fetchone()

    if option_type == "pests":
        cur.execute(
            "UPDATE options_pests SET name = ?, recommended_materials = ? WHERE id = ?",
            (new_name, recommended_materials, option_id)
        )
    else:
        cur.execute(
            f"UPDATE options_{option_type} SET name = ? WHERE id = ?",
            (new_name, option_id)
        )

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
    if option_type not in ["weather", "crops", "tasks", "pests", "machines", "materials"]:
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

    if option_type == "materials" and row:
        cur.execute(
            "DELETE FROM materials WHERE name = ?",
            (row["name"],)
        )

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

    name = normalize_name(data.get("name"))
    unit = normalize_name(data.get("unit"))
    stock_qty = float(data.get("stock_qty") or 0)
    unit_price = float(data.get("unit_price") or 0)
    memo = normalize_name(data.get("memo"))

    if not name:
        return jsonify({"ok": False, "error": "name required"}), 400

    conn = db()
    cur = conn.cursor()

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

    sync_material_option(cur, name)

    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/materials/<int:material_id>", methods=["PUT"])
def update_material(material_id):
    data = request.get_json(force=True) or {}

    name = normalize_name(data.get("name"))
    unit = normalize_name(data.get("unit"))
    stock_qty = float(data.get("stock_qty") or 0)
    unit_price = float(data.get("unit_price") or 0)
    memo = normalize_name(data.get("memo"))

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

    if row:
        cur.execute(
            "DELETE FROM options_materials WHERE name = ?",
            (row["name"],)
        )

    conn.commit()
    conn.close()
    return jsonify({"ok": True})





# =========================
# SEASONS
# =========================
@app.route("/api/seasons", methods=["GET"])
def get_seasons():
    conn = db()
    rows = conn.execute("SELECT * FROM seasons ORDER BY start_date DESC, id DESC").fetchall()
    conn.close()
    return jsonify(rows_to_dicts(rows))


@app.route("/api/seasons", methods=["POST"])
def create_season():
    data = request.get_json(force=True) or {}
    season_name = normalize_name(data.get("season_name"))
    start_date = normalize_name(data.get("start_date"))
    end_date = normalize_name(data.get("end_date"))
    note = (data.get("note") or "").strip()
    is_current = 1 if data.get("is_current") else 0

    if not season_name or not start_date or not end_date:
        return jsonify({"ok": False, "error": "season_name, start_date, end_date required"}), 400

    conn = db()
    cur = conn.cursor()
    if is_current:
        cur.execute("UPDATE seasons SET is_current = 0")
    cur.execute("""
        INSERT INTO seasons (season_name, start_date, end_date, is_current, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (season_name, start_date, end_date, is_current, note, current_timestamp()))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/seasons/<int:season_id>", methods=["PUT"])
def update_season(season_id):
    data = request.get_json(force=True) or {}
    season_name = normalize_name(data.get("season_name"))
    start_date = normalize_name(data.get("start_date"))
    end_date = normalize_name(data.get("end_date"))
    note = (data.get("note") or "").strip()
    is_current = 1 if data.get("is_current") else 0

    if not season_name or not start_date or not end_date:
        return jsonify({"ok": False, "error": "season_name, start_date, end_date required"}), 400

    conn = db()
    cur = conn.cursor()
    if is_current:
        cur.execute("UPDATE seasons SET is_current = 0")
    cur.execute("""
        UPDATE seasons
        SET season_name = ?, start_date = ?, end_date = ?, is_current = ?, note = ?
        WHERE id = ?
    """, (season_name, start_date, end_date, is_current, note, season_id))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/seasons/<int:season_id>", methods=["DELETE"])
def delete_season(season_id):
    conn = db()
    conn.execute("DELETE FROM seasons WHERE id = ?", (season_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/seasons/<int:season_id>/set_current", methods=["PUT"])
def set_current_season(season_id):
    conn = db()
    cur = conn.cursor()
    cur.execute("UPDATE seasons SET is_current = 0")
    cur.execute("UPDATE seasons SET is_current = 1 WHERE id = ?", (season_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/seasons/current", methods=["GET"])
def get_current_season():
    conn = db()
    row = get_season_row(conn, 'current')
    conn.close()
    return jsonify(season_payload(row) or {})


@app.route("/api/seasons/<int:season_id>/backup", methods=["GET"])
def backup_season(season_id):
    conn = db()
    season = get_season_row(conn, str(season_id))
    if not season:
        conn.close()
        return jsonify({"ok": False, "error": "season not found"}), 404

    works_sql, works_params = apply_season_filter_sql("SELECT * FROM works", season, "start_date")
    work_rows = conn.execute(works_sql + " ORDER BY start_date ASC, id ASC", works_params).fetchall()

    money_rows = []
    for row in work_rows:
        item = dict(row)
        try:
            memo = json.loads(item.get("memo") or "{}")
        except Exception:
            memo = {}
        money = memo.get("money") or {}
        if money:
            money_rows.append({
                "date": item.get("start_date", ""),
                "task_name": item.get("task_name", ""),
                "type": money.get("type", ""),
                "total": float(money.get("total_amount") or money.get("amount") or 0),
                "method": money.get("method", ""),
                "note": money.get("note", "")
            })

    materials = rows_to_dicts(conn.execute("SELECT * FROM materials ORDER BY name").fetchall())
    options = {}
    for t in ["weather", "crops", "tasks", "machines"]:
        options[t] = rows_to_dicts(conn.execute(f"SELECT id, name FROM options_{t} ORDER BY name").fetchall())
    options["pests"] = rows_to_dicts(conn.execute("""
        SELECT id, name, COALESCE(recommended_materials, '') AS recommended_materials
        FROM options_pests
        ORDER BY name
    """).fetchall())
    plans = rows_to_dicts(conn.execute("SELECT * FROM plans ORDER BY plan_date DESC, id DESC").fetchall())
    conn.close()

    payload = {
        "ok": True,
        "season": season_payload(season),
        "exported_at": current_timestamp(),
        "works": rows_to_dicts(work_rows),
        "money": money_rows,
        "materials": materials,
        "options": options,
        "plans": plans,
        "summary": {
            "works_count": len(work_rows),
            "money_count": len(money_rows),
            "money_total": sum(item["total"] for item in money_rows)
        }
    }
    return jsonify(payload)


# =========================
# IMPORT OLD DB
# =========================
@app.route("/api/import_old_db", methods=["POST"])
def import_old_db():
    uploaded = request.files.get("file")
    if not uploaded or not uploaded.filename:
        return jsonify({"ok": False, "error": "파일이 없습니다."}), 400

    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"old_worklog_{uuid.uuid4().hex}.db")

    try:
        uploaded.save(temp_path)
        result = import_old_db_into_current(temp_path)
        status = 200 if result.get("ok") else 400
        return jsonify(result), status
    finally:
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception:
            pass


# =========================
# MONEY
# =========================
@app.route("/api/money", methods=["GET"])
def get_money():
    conn = db()
    season_id = (request.args.get("season_id") or "").strip()
    season = get_season_row(conn, season_id)
    sql, params = apply_season_filter_sql("SELECT * FROM works", season, "start_date")
    rows = conn.execute(sql + " ORDER BY start_date DESC, id DESC", params).fetchall()
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
