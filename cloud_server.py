from flask import Flask, render_template, request, jsonify
import sqlite3
from pathlib import Path
from datetime import datetime
import os

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent

if os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("PORT"):
    DB_PATH = Path(os.environ.get("DB_PATH", "/tmp/worklog.db"))
else:
    DB_PATH = BASE_DIR / "data" / "worklog.db"


def ensure_db_dir():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def get_conn():
    ensure_db_dir()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_all_dicts(query, params=()):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(query, params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def parse_json():
    return request.get_json(silent=True) or {}


def normalize_multi_value(value):
    if isinstance(value, list):
        cleaned = [str(v).strip() for v in value if str(v).strip()]
        return ",".join(cleaned)
    if value is None:
        return ""
    return str(value).strip()


def init_db():
    ensure_db_dir()
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS works (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_date TEXT NOT NULL,
            end_date TEXT,
            weather TEXT DEFAULT '',
            crops TEXT DEFAULT '',
            task_name TEXT DEFAULT '',
            pests TEXT DEFAULT '',
            materials TEXT DEFAULT '',
            machines TEXT DEFAULT '',
            labor_cost REAL DEFAULT 0,
            work_hours REAL DEFAULT 0,
            memo TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_date TEXT NOT NULL,
            title TEXT NOT NULL,
            details TEXT DEFAULT '',
            status TEXT DEFAULT 'planned',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    option_tables = {
        "options_weather": ["맑음", "흐림", "비", "눈", "강풍"],
        "options_crops": ["한라봉", "천혜향", "유라조생", "극조생"],
        "options_tasks": ["물관리", "방제", "전정", "수확", "기타"],
        "options_pests": ["진딧물", "응애", "깍지벌레"],
        "options_materials": ["다이센", "기계유제", "바스타", "노블레스"],
        "options_machines": ["미세분무기", "SS기", "예초기", "없음"],
    }

    for table_name in option_tables:
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS {table_name} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                sort_order INTEGER DEFAULT 0,
                is_active INTEGER DEFAULT 1
            )
        """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS materials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            unit TEXT DEFAULT '',
            stock_qty REAL DEFAULT 0,
            unit_price REAL DEFAULT 0,
            memo TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    now = datetime.now().isoformat(timespec="seconds")

    for table_name, defaults in option_tables.items():
        for idx, name in enumerate(defaults, start=1):
            cur.execute(
                f"INSERT OR IGNORE INTO {table_name} (name, sort_order, is_active) VALUES (?, ?, 1)",
                (name, idx),
            )

    for name in ["다이센", "기계유제", "바스타", "노블레스"]:
        cur.execute(
            """
            INSERT OR IGNORE INTO materials
            (name, unit, stock_qty, unit_price, memo, created_at, updated_at)
            VALUES (?, '개', 0, 0, '', ?, ?)
            """,
            (name, now, now),
        )

    conn.commit()
    conn.close()


init_db()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/health")
def health():
    return jsonify({"ok": True, "db_path": str(DB_PATH)})


@app.route("/api/works", methods=["GET"])
def get_works():
    rows = fetch_all_dicts("SELECT * FROM works ORDER BY start_date DESC, id DESC")
    return jsonify(rows)


@app.route("/api/works", methods=["POST"])
def create_work():
    data = parse_json()
    start_date = str(data.get("start_date", "")).strip()
    if not start_date:
        return jsonify({"ok": False, "error": "시작일은 필수입니다."}), 400

    end_date = str(data.get("end_date") or start_date).strip() or start_date
    now = datetime.now().isoformat(timespec="seconds")
    payload = (
        start_date,
        end_date,
        str(data.get("weather", "")).strip(),
        normalize_multi_value(data.get("crops")),
        str(data.get("task_name", "")).strip(),
        normalize_multi_value(data.get("pests")),
        normalize_multi_value(data.get("materials")),
        normalize_multi_value(data.get("machines")),
        float(data.get("labor_cost") or 0),
        float(data.get("work_hours") or 0),
        str(data.get("memo", "")).strip(),
        now,
        now,
    )

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO works (
            start_date, end_date, weather, crops, task_name,
            pests, materials, machines, labor_cost, work_hours,
            memo, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        payload,
    )
    work_id = cur.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "id": work_id})


@app.route("/api/works/<int:work_id>", methods=["PUT"])
def update_work(work_id):
    data = parse_json()
    start_date = str(data.get("start_date", "")).strip()
    if not start_date:
        return jsonify({"ok": False, "error": "시작일은 필수입니다."}), 400

    end_date = str(data.get("end_date") or start_date).strip() or start_date
    now = datetime.now().isoformat(timespec="seconds")

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE works
        SET start_date = ?, end_date = ?, weather = ?, crops = ?, task_name = ?,
            pests = ?, materials = ?, machines = ?, labor_cost = ?, work_hours = ?,
            memo = ?, updated_at = ?
        WHERE id = ?
        """,
        (
            start_date,
            end_date,
            str(data.get("weather", "")).strip(),
            normalize_multi_value(data.get("crops")),
            str(data.get("task_name", "")).strip(),
            normalize_multi_value(data.get("pests")),
            normalize_multi_value(data.get("materials")),
            normalize_multi_value(data.get("machines")),
            float(data.get("labor_cost") or 0),
            float(data.get("work_hours") or 0),
            str(data.get("memo", "")).strip(),
            now,
            work_id,
        ),
    )
    conn.commit()
    changed = cur.rowcount
    conn.close()

    if changed == 0:
        return jsonify({"ok": False, "error": "수정할 작업일지를 찾을 수 없습니다."}), 404
    return jsonify({"ok": True})


@app.route("/api/works/<int:work_id>", methods=["DELETE"])
def delete_work(work_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM works WHERE id = ?", (work_id,))
    conn.commit()
    changed = cur.rowcount
    conn.close()

    if changed == 0:
        return jsonify({"ok": False, "error": "삭제할 작업일지를 찾을 수 없습니다."}), 404
    return jsonify({"ok": True})


@app.route("/api/plans", methods=["GET"])
def get_plans():
    rows = fetch_all_dicts("SELECT * FROM plans ORDER BY plan_date DESC, id DESC")
    return jsonify(rows)


@app.route("/api/plans", methods=["POST"])
def create_plan():
    data = parse_json()
    plan_date = str(data.get("plan_date", "")).strip()
    title = str(data.get("title", "")).strip()
    details = str(data.get("details", "")).strip()
    status = str(data.get("status", "planned")).strip() or "planned"

    if not plan_date:
        return jsonify({"ok": False, "error": "계획일은 필수입니다."}), 400
    if not title:
        return jsonify({"ok": False, "error": "계획 제목은 필수입니다."}), 400

    now = datetime.now().isoformat(timespec="seconds")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO plans (plan_date, title, details, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (plan_date, title, details, status, now, now),
    )
    plan_id = cur.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "id": plan_id})


@app.route("/api/plans/<int:plan_id>", methods=["PUT"])
def update_plan(plan_id):
    data = parse_json()
    plan_date = str(data.get("plan_date", "")).strip()
    title = str(data.get("title", "")).strip()
    details = str(data.get("details", "")).strip()
    status = str(data.get("status", "planned")).strip() or "planned"

    if not plan_date:
        return jsonify({"ok": False, "error": "계획일은 필수입니다."}), 400
    if not title:
        return jsonify({"ok": False, "error": "계획 제목은 필수입니다."}), 400

    now = datetime.now().isoformat(timespec="seconds")
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE plans
        SET plan_date = ?, title = ?, details = ?, status = ?, updated_at = ?
        WHERE id = ?
        """,
        (plan_date, title, details, status, now, plan_id),
    )
    conn.commit()
    changed = cur.rowcount
    conn.close()

    if changed == 0:
        return jsonify({"ok": False, "error": "수정할 계획을 찾을 수 없습니다."}), 404
    return jsonify({"ok": True})


@app.route("/api/plans/<int:plan_id>", methods=["DELETE"])
def delete_plan(plan_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM plans WHERE id = ?", (plan_id,))
    conn.commit()
    changed = cur.rowcount
    conn.close()

    if changed == 0:
        return jsonify({"ok": False, "error": "삭제할 계획을 찾을 수 없습니다."}), 404
    return jsonify({"ok": True})


OPTION_TABLES = {
    "weather": "options_weather",
    "crops": "options_crops",
    "tasks": "options_tasks",
    "pests": "options_pests",
    "materials": "options_materials",
    "machines": "options_machines",
}


@app.route("/api/options", methods=["GET"])
def get_all_options():
    result = {}
    for key, table_name in OPTION_TABLES.items():
        result[key] = fetch_all_dicts(
            f"SELECT id, name, sort_order, is_active FROM {table_name} WHERE is_active = 1 ORDER BY sort_order, id"
        )
    return jsonify(result)


@app.route("/api/options/<option_type>", methods=["POST"])
def add_option_item(option_type):
    table_name = OPTION_TABLES.get(option_type)
    if not table_name:
        return jsonify({"ok": False, "error": "잘못된 옵션 타입입니다."}), 400

    data = parse_json()
    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify({"ok": False, "error": "옵션 이름은 필수입니다."}), 400

    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            f"INSERT INTO {table_name} (name, sort_order, is_active) VALUES (?, 999, 1)",
            (name,),
        )
        conn.commit()
        item_id = cur.lastrowid
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"ok": False, "error": "이미 존재하는 항목입니다."}), 400

    conn.close()
    return jsonify({"ok": True, "id": item_id})


@app.route("/api/options/<option_type>/<int:item_id>", methods=["PUT"])
def update_option_item(option_type, item_id):
    table_name = OPTION_TABLES.get(option_type)
    if not table_name:
        return jsonify({"ok": False, "error": "잘못된 옵션 타입입니다."}), 400

    data = parse_json()
    name = str(data.get("name", "")).strip()
    is_active = 1 if int(data.get("is_active", 1)) else 0
    if not name:
        return jsonify({"ok": False, "error": "옵션 이름은 필수입니다."}), 400

    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            f"UPDATE {table_name} SET name = ?, is_active = ? WHERE id = ?",
            (name, is_active, item_id),
        )
        conn.commit()
        changed = cur.rowcount
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"ok": False, "error": "이미 존재하는 항목입니다."}), 400
    conn.close()

    if changed == 0:
        return jsonify({"ok": False, "error": "대상을 찾을 수 없습니다."}), 404
    return jsonify({"ok": True})


@app.route("/api/options/<option_type>/<int:item_id>", methods=["DELETE"])
def delete_option_item(option_type, item_id):
    table_name = OPTION_TABLES.get(option_type)
    if not table_name:
        return jsonify({"ok": False, "error": "잘못된 옵션 타입입니다."}), 400

    conn = get_conn()
    cur = conn.cursor()
    cur.execute(f"DELETE FROM {table_name} WHERE id = ?", (item_id,))
    conn.commit()
    changed = cur.rowcount
    conn.close()

    if changed == 0:
        return jsonify({"ok": False, "error": "삭제할 대상을 찾을 수 없습니다."}), 404
    return jsonify({"ok": True})


@app.route("/api/materials", methods=["GET"])
def get_materials():
    rows = fetch_all_dicts("SELECT * FROM materials ORDER BY name COLLATE NOCASE")
    return jsonify(rows)


@app.route("/api/materials", methods=["POST"])
def add_material():
    data = parse_json()
    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify({"ok": False, "error": "자재명은 필수입니다."}), 400

    now = datetime.now().isoformat(timespec="seconds")
    conn = get_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO materials (name, unit, stock_qty, unit_price, memo, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                str(data.get("unit", "")).strip(),
                float(data.get("stock_qty") or 0),
                float(data.get("unit_price") or 0),
                str(data.get("memo", "")).strip(),
                now,
                now,
            ),
        )
        material_id = cur.lastrowid
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"ok": False, "error": "이미 존재하는 자재입니다."}), 400

    conn.close()
    return jsonify({"ok": True, "id": material_id})

@app.route("/api/materials/<int:material_id>", methods=["PUT"])
def update_material(material_id):
    data = parse_json()
    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify({"ok": False, "error": "자재명은 필수입니다."}), 400

    now = datetime.now().isoformat(timespec="seconds")
    conn = get_conn()
    cur = conn.cursor()

    try:
        cur.execute(
            """
            UPDATE materials
            SET name = ?, unit = ?, stock_qty = ?, unit_price = ?, memo = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                name,
                str(data.get("unit", "")).strip(),
                float(data.get("stock_qty") or 0),
                float(data.get("unit_price") or 0),
                str(data.get("memo", "")).strip(),
                now,
                material_id,
            ),
        )
        conn.commit()
        changed = cur.rowcount
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"ok": False, "error": "이미 존재하는 자재명입니다."}), 400

    conn.close()

    if changed == 0:
        return jsonify({"ok": False, "error": "수정할 자재를 찾을 수 없습니다."}), 404

    return jsonify({"ok": True})
    
@app.route("/api/materials/<int:material_id>", methods=["DELETE"])
def delete_material(material_id):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM materials WHERE id = ?", (material_id,))
    conn.commit()
    changed = cur.rowcount
    conn.close()

    if changed == 0:
        return jsonify({"ok": False, "error": "삭제할 자재를 찾을 수 없습니다."}), 404
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
