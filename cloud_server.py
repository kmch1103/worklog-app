# cloud_server.py
import json
import os
from datetime import date, datetime, timedelta

from flask import Flask, jsonify, render_template_string, request
import psycopg
from psycopg.rows import dict_row

app = Flask(__name__)
DATABASE_URL = os.environ.get("DATABASE_URL", "")
TFS = "☆"
TRS = "§"


def db_conn():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def parse_float_safe(v, default=0.0):
    try:
        return float(str(v).replace(",", "").replace("시간", "").replace("원", "").strip())
    except Exception:
        return default


def compute_wage_from_detail(detail_str: str) -> int:
    if not detail_str:
        return 0
    total = 0
    for part in str(detail_str).split(";"):
        if not part.strip():
            continue
        try:
            _, cnt, pay, _ = part.split("|")
            total += int(float(pay)) * int(float(cnt))
        except Exception:
            pass
    return total


def parse_task_list(text: str):
    if not text or not str(text).strip():
        return []
    result = []
    for rec in str(text).split(TRS):
        rec = rec.strip()
        if not rec:
            continue
        p = rec.split(TFS)
        while len(p) < 12:
            p.append("")
        result.append(
            {
                "날짜": p[0],
                "종료날짜": p[1],
                "작물": p[2],
                "작업내용": p[3],
                "시작시간": p[4],
                "종료시간": p[5],
                "작업시간": p[6],
                "사용기계": p[7],
                "사용자재": p[8],
                "병충해": p[9],
                "인력내역": p[10],
                "비고": p[11],
            }
        )
    return result


def serialize_task_list(task_list):
    rows = []
    for t in task_list:
        rows.append(
            TFS.join(
                [
                    str(t.get("날짜", "")),
                    str(t.get("종료날짜", "")),
                    str(t.get("작물", "")),
                    str(t.get("작업내용", "")),
                    str(t.get("시작시간", "")),
                    str(t.get("종료시간", "")),
                    str(t.get("작업시간", "")),
                    str(t.get("사용기계", "")),
                    str(t.get("사용자재", "")),
                    str(t.get("병충해", "")),
                    str(t.get("인력내역", "")),
                    str(t.get("비고", "")),
                ]
            )
        )
    return TRS.join(rows)


def aggregate_materials(task_items):
    agg = {}
    for t in task_items:
        for part in str(t.get("사용자재", "")).split(";"):
            if not part.strip():
                continue
            pp = part.split("|")
            if len(pp) == 3:
                name, qty, unit = pp[0], parse_float_safe(pp[1]), pp[2]
                if not name:
                    continue
                if name in agg:
                    agg[name]["qty"] += qty
                else:
                    agg[name] = {"qty": qty, "unit": unit}
    return agg


def synthesized_task_item_from_row(row):
    return {
        "날짜": row.get("날짜", "") or "",
        "종료날짜": row.get("종료날짜", "") or row.get("날짜", "") or "",
        "작물": row.get("작물", "") or "작물 미선택",
        "작업내용": row.get("작업내용", "") or "",
        "시작시간": row.get("시작시간", "") or "",
        "종료시간": row.get("종료시간", "") or "",
        "작업시간": row.get("작업시간", "") or "시간미입력",
        "사용기계": row.get("사용기계", "") or "",
        "사용자재": row.get("사용자재", "") or "",
        "병충해": row.get("적용병충해", "") or "병충해 미선택",
        "인력내역": row.get("인력내역", "") or "",
        "비고": row.get("비고", "") or "",
    }


def parse_or_synthesize_task_items(row):
    items = parse_task_list(row.get("작업목록", "") or "")
    return items if items else [synthesized_task_item_from_row(row)]


def get_switch_date(cur, season_year: int) -> date:
    cur.execute('SELECT "전환일" FROM "시즌설정" WHERE "시즌연도"=%s', (season_year,))
    row = cur.fetchone()
    if row and row.get("전환일"):
        return date.fromisoformat(row["전환일"])
    return date(season_year + 1, 3, 1)


def compute_season_year(work_date_text: str, cur) -> int:
    d = date.fromisoformat(work_date_text)
    for season_year in (d.year, d.year - 1):
        season_start = date(season_year, 3, 1)
        switch_date = get_switch_date(cur, season_year)
        if season_start <= d < switch_date:
            return season_year
    return d.year if d.month >= 3 else d.year - 1


def ensure_default_options(cur):
    defaults = {
        "옵션_날씨": ["맑음", "흐림", "비", "눈", "바람", "기타"],
        "옵션_작물": ["한라봉", "천혜향", "유라조생", "극조생"],
        "옵션_작업내용": ["물관리", "방제작업", "전정", "비료주기", "수확", "수리/보수", "기타"],
        "옵션_기계": ["수동방제기", "양수기", "SS기", "예초기", "기타", "사용안함"],
        "옵션_단위": ["개", "병", "통", "포", "kg", "g", "L", "ml", "말"],
    }
    for tbl, items in defaults.items():
        for item in items:
            cur.execute(f'INSERT INTO "{tbl}" ("항목") VALUES (%s) ON CONFLICT ("항목") DO NOTHING', (item,))


def init_db():
    conn = db_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS "작업일지" (
            "번호" INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
            "날짜" TEXT,
            "종료날짜" TEXT,
            "날씨" TEXT,
            "작물" TEXT,
            "작업내용" TEXT,
            "인건비" INTEGER DEFAULT 0,
            "시작시간" TEXT,
            "종료시간" TEXT,
            "작업시간" TEXT,
            "사용기계" TEXT,
            "사용자재" TEXT,
            "적용병충해" TEXT,
            "비고" TEXT,
            "생성시각" TEXT,
            "수정시각" TEXT,
            "인력내역" TEXT,
            "작업목록" TEXT,
            "업체명" TEXT DEFAULT '',
            "자재비" NUMERIC DEFAULT 0,
            "수리및보수비" NUMERIC DEFAULT 0,
            "총금액" NUMERIC DEFAULT 0,
            "현금결제액" NUMERIC DEFAULT 0,
            "계좌이체액" NUMERIC DEFAULT 0,
            "카드결제액" NUMERIC DEFAULT 0,
            "결제정보" TEXT DEFAULT '',
            "시즌연도" INTEGER DEFAULT 0
        )
    """)
    cur.execute("""CREATE TABLE IF NOT EXISTS "자재" ("자재명" TEXT PRIMARY KEY,"단위" TEXT,"가격" NUMERIC DEFAULT 0,"재고" NUMERIC DEFAULT 0)""")
    cur.execute("""CREATE TABLE IF NOT EXISTS "병충해" ("이름" TEXT PRIMARY KEY,"권장약제" TEXT,"증상" TEXT)""")
    cur.execute("""CREATE TABLE IF NOT EXISTS "시즌설정" ("시즌연도" INTEGER PRIMARY KEY,"전환일" TEXT NOT NULL)""")
    for tbl in ("옵션_날씨", "옵션_작물", "옵션_작업내용", "옵션_기계", "옵션_단위"):
        cur.execute(f'CREATE TABLE IF NOT EXISTS "{tbl}" ("항목" TEXT PRIMARY KEY)')
    for col, ctype, default in [
        ("업체명", "TEXT", "''"), ("자재비", "NUMERIC", "0"), ("수리및보수비", "NUMERIC", "0"),
        ("총금액", "NUMERIC", "0"), ("현금결제액", "NUMERIC", "0"), ("계좌이체액", "NUMERIC", "0"),
        ("카드결제액", "NUMERIC", "0"), ("결제정보", "TEXT", "''"), ("시즌연도", "INTEGER", "0")
    ]:
        cur.execute(f'ALTER TABLE "작업일지" ADD COLUMN IF NOT EXISTS "{col}" {ctype} DEFAULT {default}')
    ensure_default_options(cur)
    conn.commit()
    cur.close()
    conn.close()


if DATABASE_URL:
    init_db()


def hydrate_work_rows(rows):
    out = []
    for r in rows:
        row = dict(r)
        row["task_items"] = parse_or_synthesize_task_items(row)
        row["인건비_표시"] = f'{compute_wage_from_detail(row.get("인력내역", "") or ""):,}원'
        try:
            row["결제정보_json"] = json.loads(row.get("결제정보") or "[]")
        except Exception:
            row["결제정보_json"] = []
        out.append(row)
    return out


@app.route("/api/options")
def api_options():
    conn = db_conn(); cur = conn.cursor(); opts = {}
    for tbl in ("옵션_날씨", "옵션_작물", "옵션_작업내용", "옵션_기계", "옵션_단위"):
        cur.execute(f'SELECT "항목" FROM "{tbl}" ORDER BY "항목"')
        opts[tbl] = [r["항목"] for r in cur.fetchall() if str(r["항목"]).strip()]
    cur.execute('SELECT "자재명","단위","가격","재고" FROM "자재" WHERE COALESCE("재고",0) > 0 ORDER BY "자재명"')
    opts["자재"] = [dict(r) for r in cur.fetchall() if str(r["자재명"]).strip()]
    cur.execute('SELECT "이름","권장약제","증상" FROM "병충해" ORDER BY "이름"')
    opts["병충해"] = [dict(r) for r in cur.fetchall() if str(r["이름"]).strip()]
    cur.close(); conn.close()
    return jsonify(opts)


@app.route("/api/options/<tbl>", methods=["POST"])
def add_option(tbl):
    data = request.json or {}
    name = (data.get("name") or "").strip()

    conn = db_conn()
    cur = conn.cursor()

    cur.execute(f'INSERT INTO "{tbl}" ("항목") VALUES (%s) ON CONFLICT DO NOTHING', (name,))
    conn.commit()

    cur.close(); conn.close()
    return jsonify({"ok": True})

@app.route("/api/options/<tbl>/<name>", methods=["DELETE"])
def delete_option(tbl, name):
    conn = db_conn()
    cur = conn.cursor()

    cur.execute(f'DELETE FROM "{tbl}" WHERE "항목"=%s', (name,))
    conn.commit()

    cur.close(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/options/<path:tbl>", methods=["POST"])
def api_add_option(tbl):
    allowed = {"옵션_날씨", "옵션_작물", "옵션_작업내용", "옵션_기계", "옵션_단위"}
    if tbl not in allowed:
        return jsonify({"ok": False}), 400
    value = (request.json or {}).get("항목", "").strip()
    if not value:
        return jsonify({"ok": False}), 400
    conn = db_conn(); cur = conn.cursor()
    cur.execute(f'INSERT INTO "{tbl}" ("항목") VALUES (%s) ON CONFLICT ("항목") DO NOTHING', (value,))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/options/<path:tbl>/<path:value>", methods=["DELETE"])
def api_delete_option(tbl, value):
    allowed = {"옵션_날씨", "옵션_작물", "옵션_작업내용", "옵션_기계", "옵션_단위"}
    if tbl not in allowed:
        return jsonify({"ok": False}), 400
    conn = db_conn(); cur = conn.cursor()
    cur.execute(f'DELETE FROM "{tbl}" WHERE "항목"=%s', (value,))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/pests", methods=["POST"])
def api_add_pest():
    data = request.json or {}
    name = (data.get("이름") or "").strip()
    if not name:
        return jsonify({"ok": False}), 400
    conn = db_conn(); cur = conn.cursor()
    cur.execute('INSERT INTO "병충해" ("이름","권장약제","증상") VALUES (%s,%s,%s) ON CONFLICT ("이름") DO UPDATE SET "권장약제"=EXCLUDED."권장약제","증상"=EXCLUDED."증상"', (name, data.get("권장약제", ""), data.get("증상", "")))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/pests/<path:name>", methods=["DELETE"])
def api_delete_pest(name):
    conn = db_conn(); cur = conn.cursor()
    cur.execute('DELETE FROM "병충해" WHERE "이름"=%s', (name,))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/materials")
def api_get_materials():
    conn = db_conn(); cur = conn.cursor()
    cur.execute('SELECT "자재명","단위","가격","재고" FROM "자재" WHERE COALESCE("재고",0) > 0 ORDER BY "자재명"')
    rows = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify(rows)


@app.route("/api/materials", methods=["POST"])
def api_add_material():
    data = request.json or {}
    name = (data.get("자재명") or "").strip()
    if not name:
        return jsonify({"ok": False}), 400
    conn = db_conn(); cur = conn.cursor()
    cur.execute('INSERT INTO "자재" ("자재명","단위","가격","재고") VALUES (%s,%s,%s,%s) ON CONFLICT ("자재명") DO UPDATE SET "단위"=EXCLUDED."단위","가격"=EXCLUDED."가격","재고"=EXCLUDED."재고"', (name, data.get("단위", ""), parse_float_safe(data.get("가격", 0)), parse_float_safe(data.get("재고", 0))))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/materials/<name>", methods=["PUT"])
def api_update_material(name):
    data = request.json or {}
    qty = float(data.get("재고", 0))

    conn = db_conn()
    cur = conn.cursor()

    cur.execute(
        'UPDATE "자재" SET "재고"=%s WHERE "자재명"=%s',
        (qty, name)
    )

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"ok": True})


@app.route("/api/season_settings")
def api_get_season_settings():
    conn = db_conn(); cur = conn.cursor()
    cur.execute('SELECT "시즌연도","전환일" FROM "시즌설정" ORDER BY "시즌연도" DESC')
    rows = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify(rows)


@app.route("/api/season_settings", methods=["POST"])
def api_save_season_setting():
    data = request.json or {}
    season_year = int(data.get("시즌연도"))
    switch_date = str(data.get("전환일", "")).strip()
    if not switch_date:
        return jsonify({"ok": False}), 400
    conn = db_conn(); cur = conn.cursor()
    cur.execute('INSERT INTO "시즌설정" ("시즌연도","전환일") VALUES (%s,%s) ON CONFLICT ("시즌연도") DO UPDATE SET "전환일"=EXCLUDED."전환일"', (season_year, switch_date))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/season_settings/<int:season_year>", methods=["DELETE"])
def api_delete_season_setting(season_year):
    conn = db_conn(); cur = conn.cursor()
    cur.execute('DELETE FROM "시즌설정" WHERE "시즌연도"=%s', (season_year,))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/payment_summary")
def api_payment_summary():
    conn = db_conn(); cur = conn.cursor()
    cur.execute('SELECT COALESCE(SUM("총금액"),0) AS total, COALESCE(SUM("현금결제액"),0) AS cash, COALESCE(SUM("계좌이체액"),0) AS transfer, COALESCE(SUM("카드결제액"),0) AS card, COALESCE(SUM("인건비"),0) AS wage, COALESCE(SUM("자재비"),0) AS material, COALESCE(SUM("수리및보수비"),0) AS repair FROM "작업일지"')
    row = dict(cur.fetchone())
    cur.close(); conn.close()
    return jsonify(row)



def safe_parse_task_items(row):
    try:
        raw = row.get("작업목록", "")

        # 정상 파싱 시도
        items = parse_task_list(raw) if raw else []
        if items:
            return items

        # fallback (작업목록 없는 경우)
        return [{
            "날짜": row.get("날짜", "") or "",
            "종료날짜": row.get("종료날짜", "") or row.get("날짜", "") or "",
            "작물": row.get("작물", "") or "작물 미선택",
            "작업내용": row.get("작업내용", "") or "",
            "시작시간": row.get("시작시간", "") or "",
            "종료시간": row.get("종료시간", "") or "",
            "작업시간": str(row.get("작업시간", "") or "시간미입력"),
            "사용기계": row.get("사용기계", "") or "",
            "사용자재": row.get("사용자재", "") or "",
            "병충해": row.get("적용병충해", "") or "병충해 미선택",
            "인력내역": row.get("인력내역", "") or "",
            "비고": row.get("비고", "") or "",
        }]
    except:
        return []

@app.route("/api/works", methods=["GET"])
def api_get_works():
    q = (request.args.get("q") or "").strip()

    conn = db_conn()
    cur = conn.cursor()

    if q:
        like = f"%{q}%"
        cur.execute("""
            SELECT
                "번호","날짜","종료날짜","날씨","작물","작업내용","인건비",
                "시작시간","종료시간","작업시간","사용기계","사용자재",
                "적용병충해","비고","생성시각","수정시각","인력내역",
                "작업목록","업체명","자재비","수리및보수비","총금액",
                "현금결제액","계좌이체액","카드결제액","결제정보","시즌연도"
            FROM "작업일지"
            WHERE
                COALESCE("날짜",'') ILIKE %s OR
                COALESCE("종료날짜",'') ILIKE %s OR
                COALESCE("날씨",'') ILIKE %s OR
                COALESCE("작물",'') ILIKE %s OR
                COALESCE("작업내용",'') ILIKE %s OR
                COALESCE("사용기계",'') ILIKE %s OR
                COALESCE("사용자재",'') ILIKE %s OR
                COALESCE("적용병충해",'') ILIKE %s OR
                COALESCE("비고",'') ILIKE %s OR
                COALESCE("업체명",'') ILIKE %s OR
                COALESCE("작업목록",'') ILIKE %s
            ORDER BY "날짜" DESC, "번호" DESC
        """, (like, like, like, like, like, like, like, like, like, like, like))
    else:
        cur.execute("""
            SELECT
                "번호","날짜","종료날짜","날씨","작물","작업내용","인건비",
                "시작시간","종료시간","작업시간","사용기계","사용자재",
                "적용병충해","비고","생성시각","수정시각","인력내역",
                "작업목록","업체명","자재비","수리및보수비","총금액",
                "현금결제액","계좌이체액","카드결제액","결제정보","시즌연도"
            FROM "작업일지"
            ORDER BY "날짜" DESC, "번호" DESC
        """)

    rows = hydrate_work_rows(cur.fetchall())
    cur.close()
    conn.close()
    return jsonify(rows)

@app.route("/api/works/<int:no>", methods=["DELETE"])
def api_delete_work(no):
    conn = None
    cur = None
    try:
        conn = db_conn()
        cur = conn.cursor()

        cur.execute('SELECT * FROM "작업일지" WHERE "번호"=%s', (no,))
        old = cur.fetchone()
        if not old:
            return jsonify({"ok": False, "error": "작업을 찾을 수 없습니다."}), 404

        old = dict(old)
        old_mat = aggregate_materials(safe_parse_task_items(old))
        for name, info in old_mat.items():
            cur.execute(
                'UPDATE "자재" SET "재고" = COALESCE("재고",0) + %s WHERE "자재명"=%s',
                (info["qty"], name)
            )

        cur.execute('DELETE FROM "작업일지" WHERE "번호"=%s', (no,))
        conn.commit()
        return jsonify({"ok": True})

    except Exception as e:
        if conn:
            conn.rollback()
        print("DELETE ERROR:", e)
        app.logger.exception("api_delete_work failed")
        return jsonify({"ok": False, "error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

def build_save_payload(data, cur):
    task_list = data.get("task_items", [])
    payment_rows = data.get("payment_rows", [])
    wage_cost = parse_float_safe(data.get("wage_cost", 0), 0)
    material_cost = parse_float_safe(data.get("material_cost", 0), 0)
    repair_cost = parse_float_safe(data.get("repair_cost", 0), 0)
    total_amount = wage_cost + material_cost + repair_cost
    cash_total = sum(parse_float_safe(x.get("amount", 0), 0) for x in payment_rows if x.get("method") == "현금결제")
    transfer_total = sum(parse_float_safe(x.get("amount", 0), 0) for x in payment_rows if x.get("method") == "계좌이체")
    card_total = sum(
    parse_float_safe(x.get("amount", 0), 0)
    for x in payment_rows
    if x.get("method") in ("카드결제", "카드결재")
)
    all_crops, all_task_names, dates, end_dates, all_wages, all_pests = [], [], [], [], [], []
    for t in task_list:
        for c in str(t.get("작물", "")).split(","):
            c = c.strip()
            if c and c not in all_crops:
                all_crops.append(c)
        if t.get("작업내용"):
            all_task_names.append(t["작업내용"])
        try:
            dates.append(date.fromisoformat(t.get("날짜", "")))
        except Exception:
            pass
        try:
            end_dates.append(date.fromisoformat(t.get("종료날짜", "") or t.get("날짜", "")))
        except Exception:
            pass
        for p in str(t.get("병충해", "")).split(","):
            p = p.strip()
            if p and p not in all_pests:
                all_pests.append(p)
        for part in str(t.get("인력내역", "")).split(";"):
            if part.strip():
                all_wages.append(part.strip())
    mat_agg = aggregate_materials(task_list)
    rep_start = min(dates).isoformat() if dates else date.today().isoformat()
    rep_end = max(end_dates).isoformat() if end_dates else rep_start
    rep_mats = ";".join(f"{n}|{v['qty']}|{v['unit']}" for n, v in mat_agg.items())
    rep_wage_detail = ";".join(all_wages)
    total_hours = sum(parse_float_safe(t.get("작업시간", "0"), 0) for t in task_list)
    total_hours_text = ((str(int(total_hours)) if float(total_hours).is_integer() else str(total_hours)) + "시간") if total_hours > 0 else "시간미입력"
    season_year = compute_season_year(rep_start, cur)
    return {"task_list": task_list, "payment_rows": payment_rows, "wage_cost": wage_cost, "material_cost": material_cost, "repair_cost": repair_cost, "total_amount": total_amount, "cash_total": cash_total, "transfer_total": transfer_total, "card_total": card_total, "all_crops": ",".join(all_crops), "all_task_names": ", ".join(all_task_names), "rep_start": rep_start, "rep_end": rep_end, "rep_mats": rep_mats, "rep_wage_detail": rep_wage_detail, "total_hours_text": total_hours_text, "machines": ", ".join(dict.fromkeys(t.get("사용기계", "") for t in task_list if t.get("사용기계"))), "all_pests": ",".join(all_pests), "season_year": season_year, "mat_agg": mat_agg}


@app.route("/api/works", methods=["POST"])
@app.route("/api/works", methods=["POST"])
def api_add_work():
    conn = None
    cur = None
    try:
        data = request.json or {}

        task_items = data.get("task_items")
        if not isinstance(task_items, list) or not task_items:
            return jsonify({"ok": False, "error": "task_items가 비어있거나 형식이 올바르지 않습니다."}), 400

        conn = db_conn()
        cur = conn.cursor()

        p = build_save_payload(data, cur)

        if not p["task_list"]:
            return jsonify({"ok": False, "error": "저장할 작업목록이 없습니다."}), 400

        first_item = p["task_list"][0] or {}
        last_item = p["task_list"][-1] or {}

        now_str = datetime.now().isoformat(timespec="seconds")

        for name, info in p["mat_agg"].items():
            if not name:
                continue
            cur.execute(
                'UPDATE "자재" SET "재고" = COALESCE("재고",0) - %s WHERE "자재명"=%s',
                (info["qty"], name)
            )



        start_time = p["task_list"][0].get("시작시간") or ""
        end_time = p["task_list"][-1].get("종료시간") or ""
        work_time = p.get("total_hours_text") or "0"

        print("DEBUG work_time:", p.get("total_hours_text"))
        print("DEBUG task_list:", p.get("task_list"))


        cur.execute(
            '''



            
            INSERT INTO "작업일지"
            (
                "날짜","종료날짜","날씨","작물","작업내용","인건비",
                "시작시간","종료시간","작업시간","사용기계","사용자재",
                "적용병충해","비고","생성시각","수정시각","인력내역",
                "작업목록","업체명","자재비","수리및보수비","총금액",
                "현금결제액","계좌이체액","카드결제액","결제정보","시즌연도"
            )
            VALUES
            (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ''',
            (
                p["rep_start"],
                p["rep_end"],
                data.get("날씨", ""),
                p["all_crops"],
                p["all_task_names"],
                int(p["wage_cost"]),
                start_time,
                end_time,
                work_time,
                p["machines"],
                p["rep_mats"],
                p["all_pests"],
                data.get("note", ""),
                now_str,
                now_str,
                p["rep_wage_detail"],
                serialize_task_list(p["task_list"]),
                data.get("vendor", ""),
                p["material_cost"],
                p["repair_cost"],
                p["total_amount"],
                p["cash_total"],
                p["transfer_total"],
                p["card_total"],
                json.dumps(p["payment_rows"], ensure_ascii=False),
                p["season_year"],
            )
        )

        conn.commit()
        return jsonify({"ok": True})

    except Exception as e:
        if conn:
            conn.rollback()
        app.logger.exception("api_add_work failed")
        return jsonify({"ok": False, "error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


@app.route("/api/works/<int:no>", methods=["PUT"])
def api_update_work(no):
    data = request.json or {}
    if not data.get("task_items"):
        return jsonify({"ok": False}), 400
    conn = db_conn(); cur = conn.cursor()
    cur.execute('SELECT * FROM "작업일지" WHERE "번호"=%s', (no,))
    old = cur.fetchone()
    if not old:
        cur.close(); conn.close()
        return jsonify({"ok": False}), 404
    old = dict(old)
    



@app.route("/api/calendar/<int:year>/<int:month>")
def api_calendar(year, month):
    import calendar as _cal
    month_start = date(year, month, 1); month_end = date(year, month, _cal.monthrange(year, month)[1])
    conn = db_conn(); cur = conn.cursor()
    cur.execute('SELECT "번호","날짜","종료날짜","날씨","작물","작업내용","작업시간","사용기계","사용자재","적용병충해","비고","인력내역","업체명","자재비","수리및보수비","총금액","현금결제액","계좌이체액","카드결제액","결제정보","시즌연도",COALESCE("작업목록",\'\') AS "작업목록" FROM "작업일지" WHERE "날짜" <= %s AND COALESCE("종료날짜","날짜") >= %s ORDER BY "날짜","번호"', (month_end.isoformat(), month_start.isoformat()))
    rows = hydrate_work_rows(cur.fetchall())
    day_map = {}
    for row in rows:
        try:
            sd = date.fromisoformat(row["날짜"]); ed = date.fromisoformat(row["종료날짜"]) if row.get("종료날짜") else sd
        except Exception:
            continue
        cur_d = max(sd, month_start); end_d = min(ed, month_end)
        while cur_d <= end_d:
            day_map.setdefault(str(cur_d.day), []).append(row); cur_d += timedelta(days=1)
    cur.close(); conn.close()
    return jsonify({"year": year, "month": month, "days": month_end.day, "day_map": day_map})


@app.route("/api/stats")
def api_stats():
    y = int(request.args.get("year", date.today().year))
    m = int(request.args.get("month", date.today().month))
    season_year = y if m >= 3 else y - 1
    conn = db_conn(); cur = conn.cursor()
    import calendar as _cal
    ms = date(y, m, 1).isoformat(); me = date(y, m, _cal.monthrange(y, m)[1]).isoformat()
    cur.execute('SELECT COUNT(*) AS cnt, COALESCE(SUM("인건비"),0) AS wage FROM "작업일지" WHERE "날짜" BETWEEN %s AND %s', (ms, me))
    month_row = dict(cur.fetchone())
    cur.execute('SELECT COUNT(*) AS cnt, COALESCE(SUM("인건비"),0) AS wage FROM "작업일지" WHERE "시즌연도"=%s', (season_year,))
    season_row = dict(cur.fetchone())
    cur.execute('SELECT "전환일" FROM "시즌설정" WHERE "시즌연도"=%s', (season_year,))
    switch_row = cur.fetchone()
    cur.close(); conn.close()
    return jsonify({"당월": {"건수": month_row["cnt"], "인건비": month_row["wage"]}, "시즌": {"건수": season_row["cnt"], "인건비": season_row["wage"]}, "season_year": season_year, "switch_date": switch_row["전환일"] if switch_row else f"{season_year+1}-03-01"})


HTML = """<!DOCTYPE html>
<html lang='ko'>
<head>
<meta charset='UTF-8'>
<meta name='viewport' content='width=device-width, initial-scale=1'>
<title>작업일지</title>
<style>
:root{--green:#2d6a4f;--green2:#40916c;--green3:#74c69d;--bg:#f0f7f4;--card:#fff;--text:#1b2e25;--gray:#6c757d;--border:#d8ead3;--accent:#e9f5e1;--red:#c62828}
*{box-sizing:border-box} body{margin:0;font-family:sans-serif;background:var(--bg);color:var(--text)}
.page{display:none;max-width:980px;margin:0 auto;padding:14px 12px 84px}.page.active{display:block}
.title{font-size:24px;font-weight:700;margin:8px 0 14px;color:var(--green)}
.card,.panel,.stat,.summary{background:#fff;border-radius:14px;padding:14px;margin-bottom:10px;box-shadow:0 1px 6px rgba(0,0,0,.07)}
.search{display:flex;gap:8px;margin-bottom:12px}.search input{flex:1}
input,select,textarea,button{font:inherit} input,select,textarea{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px}
textarea{min-height:70px;resize:vertical} button{padding:10px 14px;border:none;border-radius:10px;background:var(--green2);color:#fff;cursor:pointer}
button.sub{background:var(--accent);color:var(--green)} button.red{background:#fde8e8;color:var(--red)}
.row{display:flex;gap:8px}.row>*{flex:1}.list-card{background:#fff;border-left:4px solid var(--green3);border-radius:12px;padding:12px;margin-bottom:10px}
.muted{color:var(--gray);font-size:13px}.small{font-size:12px}.empty{text-align:center;color:var(--gray);padding:30px 0}
.tabbar{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid var(--border);display:flex}.tabbar button{flex:1;background:none;color:var(--gray);padding:8px 4px;border-radius:0}.tabbar button.active{color:var(--green2);font-weight:700}
.stats{display:flex;gap:8px}.stat{text-align:center;flex:1}.cal-head,.cal-day{padding:6px}.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.cal-head{text-align:center;color:var(--gray);font-size:12px}
.cal-day{min-height:70px;background:#fff;border-radius:10px;font-size:12px;cursor:pointer}.cal-day.today{border:2px solid var(--green3)} .cal-day.empty{background:transparent}.ev{display:block;margin-top:4px;background:var(--green3);color:#fff;border-radius:4px;padding:1px 3px;font-size:10px;overflow:hidden;white-space:nowrap}
.tag{display:inline-block;padding:3px 8px;border-radius:999px;background:var(--accent);font-size:11px;margin:2px 2px 0 0}.line{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eef3ef;padding:10px 0;gap:8px}.line:last-child{border-bottom:none}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{border:1px solid var(--border);background:#fff;border-radius:999px;padding:7px 12px;cursor:pointer;font-size:13px;color:var(--text)}.chip.on{background:var(--green2);color:#fff;border-color:var(--green2)}
.sec-title{font-weight:700;margin:6px 0 8px;color:var(--green)}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.summary-item{background:#f7fbf8;border:1px solid var(--border);border-radius:12px;padding:10px}
.side-bg{position:fixed;inset:0;background:rgba(0,0,0,.25);display:none;justify-content:flex-end}.side-bg.open{display:flex}.side{width:min(560px,100%);height:100%;background:#fff;overflow:auto;box-shadow:-8px 0 24px rgba(0,0,0,.15);padding:16px}
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);display:none;align-items:center;justify-content:center;padding:16px}.modal-bg.open{display:flex}.modal{background:#fff;width:min(760px,100%);max-height:88vh;overflow:auto;border-radius:18px;padding:18px;box-shadow:0 12px 32px rgba(0,0,0,.18)}.modal-top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.modal-close-top{background:#fde8e8;color:var(--red);padding:8px 12px;border-radius:10px;flex:0 0 auto}
@media (max-width:720px){.row,.stats,.summary-grid{grid-template-columns:1fr;display:grid}.page{padding:14px 10px 84px}}
</style>
</head>
<body>
<div class='page active' id='page-works'><div class='title'>📋 작업일지</div><div class='summary'><div class='sec-title'>결재 요약</div><div id='paymentSummary' class='summary-grid'></div></div><div class='search'><input id='searchQ' placeholder='날짜·작물·작업내용·자재 검색'><button onclick='loadWorks()'>검색</button></div><div id='worksList' class='empty'>불러오는 중...</div></div>
<div class='page' id='page-calendar'><div class='title'>📅 작업달력</div><div class='row' style='margin-bottom:10px'><select id='yearSel' onchange='loadCalendarAndStats()'></select><select id='monthSel' onchange='loadCalendarAndStats()'></select></div><div class='stats'><div class='stat'><div id='monthCnt'>-</div><div class='muted small'>당월 건수</div></div><div class='stat'><div id='monthWage'>-</div><div class='muted small'>당월 인건비</div></div><div class='stat'><div id='seasonWage'>-</div><div class='muted small'>시즌 인건비</div></div></div><div id='seasonLabel' class='muted' style='margin-bottom:10px'></div><div id='calendarBox'></div></div>
<div class='page' id='page-add'><div class='title'>✏️ 작업 입력 / 수정</div><div class='panel'><div class='row'><div><div class='muted small'>날씨</div><select id='weatherSel'></select></div><div><div class='muted small'>시작일</div><input type='date' id='taskDate'></div></div><div class='row'><div><div class='muted small'>연속 일수</div><input type='number' id='dayCount' min='1' value='1'></div><div><div class='muted small'>종료일</div><input type='date' id='taskEndDate' readonly></div></div><div><div class='sec-title'>작물 다중선택</div><div id='cropChips' class='chips'></div></div><div class='row' style='margin-top:10px'><div><div class='muted small'>작업내용</div><select id='taskKind'></select></div><div><div class='muted small'>사용기계</div><select id='machineSel'></select></div></div><div class='row'><div><div class='muted small'>시작시간</div><input type='time' id='startTime'></div><div><div class='muted small'>종료시간</div><input type='time' id='endTime'></div></div><div class='sec-title'>사용자재 다중선택</div><div class='row'><div><select id='matSelect'></select></div><div><input id='matQty' type='number' step='0.1' value='1'></div><div><input id='matUnitView' readonly></div></div><div><button class='sub' type='button' onclick='addSelectedMaterial()'>자재 추가</button></div><div id='selectedMaterials'></div><div class='sec-title'>병충해 다중선택</div><div id='pestChips' class='chips'></div><div class='sec-title'>인력 선택</div><div id='workersBox'></div><div><button class='sub' type='button' onclick='addWorkerRow()'>인력 추가</button></div><div class='sec-title'>결재창</div><div class='row'><div><div class='muted small'>업체</div><input id='vendorName'></div><div><div class='muted small'>인건비</div><input id='wageCost' type='number' value='0'></div></div><div class='row'><div><div class='muted small'>자재비</div><input id='materialCost' type='number' value='0'></div><div><div class='muted small'>수리 및 보수비</div><input id='repairCost' type='number' value='0'></div></div><div id='paymentRows'></div><div><button class='sub' type='button' onclick='addPaymentRow()'>결재방법 추가</button></div><div class='summary-grid' style='margin-top:10px'><div class='summary-item'><div class='small muted'>총 금액</div><div id='sumTotal'>0원</div></div><div class='summary-item'><div class='small muted'>현금</div><div id='sumCash'>0원</div></div><div class='summary-item'><div class='small muted'>계좌이체</div><div id='sumTransfer'>0원</div></div><div class='summary-item'><div class='small muted'>카드결제</div><div id='sumCard'>0원</div></div></div><div style='margin-top:10px'><div class='muted small'>비고</div><textarea id='noteText'></textarea></div><div class='row'><button id='saveBtn' onclick='saveWork()'>저장</button><button class='sub' type='button' onclick='resetForm()'>입력 초기화</button></div></div></div>
<div class='page' id='page-materials'><div class='title'>📦 자재관리</div><div class='panel'><div class='row'><input id='matName' placeholder='자재명'><input id='matUnit' placeholder='단위'></div><div class='row'><input id='matPrice' type='number' placeholder='가격'><input id='matStock' type='number' step='0.1' placeholder='재고'></div><button onclick='saveMaterial()'>자재 저장</button></div><div class='card'><div id='materialsList' class='empty'>불러오는 중...</div></div></div>
<div class='page' id='page-options'><div class='title'>⚙️ 옵션 / 시즌설정</div><div class='panel'><div class='row'><select id='optTable'><option value='옵션_날씨'>날씨</option><option value='옵션_작물'>작물</option><option value='옵션_작업내용'>작업내용</option><option value='옵션_기계'>기계</option><option value='옵션_단위'>단위</option></select><input id='optValue' placeholder='추가할 항목'></div><button onclick='addOption()'>옵션 추가</button></div><div class='panel'><div class='row'><input id='pestName' placeholder='병충해 이름'><input id='pestDrug' placeholder='권장약제'></div><input id='pestSymptom' placeholder='증상' style='margin-bottom:8px'><button onclick='savePest()'>병충해 저장</button></div><div class='panel'><div class='sec-title'>시즌 전환일 설정</div><div class='row'><input id='seasonYearInput' type='number' placeholder='시즌연도 예: 2025'><input id='seasonSwitchInput' type='date'></div><button onclick='saveSeasonSetting()'>시즌 전환일 저장</button><div id='seasonSettingsList' style='margin-top:10px'></div></div><div class='card'><div id='optionsView' class='empty'>불러오는 중...</div></div></div>
<div class='modal-bg' id='dayModalBg'><div class='modal'><div class='modal-top'><h3 id='dayTitle'>날짜</h3><button class='modal-close-top' onclick='closeDayModal()'>닫기 ✕</button></div><div id='dayBody'></div></div></div>
<div class='side-bg' id='workSideBg'><div class='side'><div class='modal-top'><h3 id='workSideTitle'>작업 상세</h3><button class='modal-close-top' onclick='closeWorkSide()'>닫기 ✕</button></div><div id='workSideBody'></div></div></div>
<div class='tabbar'><button class='active' id='tab-works' onclick="showTab('works')">작업일지</button><button id='tab-calendar' onclick="showTab('calendar')">달력</button><button id='tab-add' onclick="showTab('add')">입력</button><button id='tab-materials' onclick="showTab('materials')">자재</button><button id='tab-options' onclick="showTab('options')">옵션</button></div>
<script>
let OPTS={}, CAL_DATA={}, CURRENT_WORKS=[], selectedMaterials=[], EDIT_WORK_NO=null;
const qs=id=>document.getElementById(id);
const won=v=>Number(v||0).toLocaleString()+'원';
function showTab(name){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));document.querySelectorAll('.tabbar button').forEach(b=>b.classList.remove('active'));qs('page-'+name).classList.add('active');qs('tab-'+name).classList.add('active');if(name==='works'){loadWorks();loadPaymentSummary();}if(name==='calendar')loadCalendarAndStats();if(name==='materials')loadMaterials();if(name==='options'){loadOptionsView();loadSeasonSettings();}}
function buildYearMonthSelects(){const y=qs('yearSel'),m=qs('monthSel'),now=new Date(),cy=now.getFullYear();y.innerHTML='';for(let i=cy-5;i<=cy+1;i++)y.innerHTML+=`<option value="${i}">${i}년</option>`;m.innerHTML='';for(let i=1;i<=12;i++)m.innerHTML+=`<option value="${i}">${i}월</option>`;y.value=cy;m.value=now.getMonth()+1;}
function selectedChipValues(elId){return [...qs(elId).querySelectorAll('.chip.on:not(.default-chip)')].map(x=>x.dataset.value).filter(Boolean);}
function chipSummary(elId, emptyLabel){const vals=selectedChipValues(elId);return vals.length?vals.join(','):emptyLabel;}
function renderChips(elId, items, keyField=null){const box=qs(elId);const clean=(items||[]).map(v=>keyField?v[keyField]:v).map(v=>String(v||'').trim()).filter(v=>v);if(!clean.length){box.innerHTML='';return;}let html=`<button type="button" class="chip on default-chip" data-value="" onclick="selectDefaultChip(this,'${elId}')">미선택</button>`;html+=clean.map(val=>`<button type="button" class="chip" data-value="${val}" onclick="toggleChipWithDefault(this,'${elId}')">${val}</button>`).join('');box.innerHTML=html;}
function toggleChipWithDefault(el, elId){const box=qs(elId),def=box.querySelector('.default-chip');if(def)def.classList.remove('on');el.classList.toggle('on');if(!selectedChipValues(elId).length&&def)def.classList.add('on');}
function selectDefaultChip(el, elId){const box=qs(elId);box.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');}
function updateEndDate(){const start=qs('taskDate').value,count=Math.max(1,parseInt(qs('dayCount').value||'1',10));if(!start)return;const d=new Date(start);d.setDate(d.getDate()+count-1);qs('taskEndDate').value=d.toISOString().slice(0,10);}
function updateMatUnit(){const mats=(OPTS['자재']||[]).filter(m=>String((m['자재명']||'')).trim());const name=qs('matSelect').value;const found=mats.find(m=>m['자재명']===name);qs('matUnitView').value=found?(found['단위']||''):'';}
function renderSelectedMaterials(){const box=qs('selectedMaterials');if(!selectedMaterials.length){box.innerHTML='<div class="muted small">선택된 자재 없음</div>';return;}box.innerHTML=selectedMaterials.map((m,i)=>`<div class="line"><div><b>${m.name}</b><div class="muted">${m.qty}${m.unit}</div></div><button type="button" class="red" onclick="removeMaterial(${i})">삭제</button></div>`).join('');}
function addSelectedMaterial(){const name=qs('matSelect').value,qty=parseFloat(qs('matQty').value||'0'),unit=qs('matUnitView').value||'';if(!name||!(qty>0)){alert('자재와 수량을 확인하세요');return;}selectedMaterials.push({name,qty,unit});renderSelectedMaterials();qs('matQty').value='1';}
function removeMaterial(idx){selectedMaterials.splice(idx,1);renderSelectedMaterials();}
function addWorkerRow(data=null){const box=qs('workersBox'),id='w'+Date.now()+Math.floor(Math.random()*1000);const gender=(data&&data.gender)||'남자',count=(data&&data.count)||1,pay=(data&&data.pay)||0,role=(data&&data.role)||'일반';const div=document.createElement('div');div.className='row';div.id=id;div.style.marginBottom='8px';div.innerHTML=`<select class="worker-gender"><option ${gender==='남자'?'selected':''}>남자</option><option ${gender==='여자'?'selected':''}>여자</option><option ${gender==='기타'?'selected':''}>기타</option></select><input class="worker-count" type="number" min="1" value="${count}" placeholder="인원"><input class="worker-pay" type="number" value="${pay}" placeholder="단가"><input class="worker-role" value="${role}" placeholder="구분"><button type="button" class="red" onclick="document.getElementById('${id}').remove()">삭제</button>`;box.appendChild(div);}
function workerString(){return [...qs('workersBox').children].map(row=>{const g=row.querySelector('.worker-gender').value,c=row.querySelector('.worker-count').value||0,p=row.querySelector('.worker-pay').value||0,r=row.querySelector('.worker-role').value||'일반';if(Number(c)<=0)return '';return `${g}|${c}|${p}|${r}`;}).filter(Boolean).join(';');}
function addPaymentRow(data=null){const box=qs('paymentRows'),id='p'+Date.now()+Math.floor(Math.random()*1000);const method=(data&&data.method)||'현금결제',amount=(data&&data.amount)||0,fromBank=(data&&data.from_bank)||'',toBank=(data&&data.to_bank)||'',holder=(data&&data.account_holder)||'',cardName=(data&&data.card_name)||'',installment=(data&&data.installment)||'일시불',months=(data&&data.months)||'';const div=document.createElement('div');div.className='panel';div.id=id;div.innerHTML=`<div class="row"><div><div class="muted small">결재방법</div><select class="pay-method" onchange="togglePaymentFields('${id}')"><option ${method==='외상'?'selected':''}>외상</option><option ${method==='현금결제'?'selected':''}>현금결제</option><option ${method==='계좌이체'?'selected':''}>계좌이체</option><option ${method==='카드결제'?'selected':''}>카드결제</option></select></div><div><div class="muted small">금액</div><input class="pay-amount" type="number" value="${amount}" oninput="recalcPaymentSummary()"></div><div style="display:flex;align-items:end"><button type="button" class="red" onclick="document.getElementById('${id}').remove();recalcPaymentSummary();">삭제</button></div></div><div class="transfer-fields"><div class="row"><div><div class="muted small">이체은행</div><input class="pay-from-bank" value="${fromBank}"></div><div><div class="muted small">이체한은행</div><input class="pay-to-bank" value="${toBank}"></div><div><div class="muted small">예금주</div><input class="pay-holder" value="${holder}"></div></div></div><div class="card-fields"><div class="row"><div><div class="muted small">카드명</div><input class="pay-card-name" value="${cardName}"></div><div><div class="muted small">할부유무</div><select class="pay-installment" onchange="togglePaymentFields('${id}')"><option ${installment==='일시불'?'selected':''}>일시불</option><option ${installment==='할부'?'selected':''}>할부</option></select></div><div><div class="muted small">개월수</div><input class="pay-months" type="number" value="${months}"></div></div></div>`;box.appendChild(div);togglePaymentFields(id);recalcPaymentSummary();}
function togglePaymentFields(id){const box=qs(id),method=box.querySelector('.pay-method').value,installment=box.querySelector('.pay-installment').value;box.querySelector('.transfer-fields').style.display=(method==='계좌이체')?'block':'none';box.querySelector('.card-fields').style.display=(method==='카드결제')?'block':'none';box.querySelector('.pay-months').disabled=!(method==='카드결제'&&installment==='할부');}
function collectPaymentRows(){return [...qs('paymentRows').children].map(row=>({method:row.querySelector('.pay-method').value,amount:Number(row.querySelector('.pay-amount').value||0),from_bank:row.querySelector('.pay-from-bank').value,to_bank:row.querySelector('.pay-to-bank').value,account_holder:row.querySelector('.pay-holder').value,card_name:row.querySelector('.pay-card-name').value,installment:row.querySelector('.pay-installment').value,months:row.querySelector('.pay-months').value})).filter(x=>x.amount>0||x.method==='외상');}
function recalcPaymentSummary(){const wage=Number(qs('wageCost').value||0),material=Number(qs('materialCost').value||0),repair=Number(qs('repairCost').value||0);const rows=collectPaymentRows();const cash=rows.filter(x=>x.method==='현금결제').reduce((a,b)=>a+Number(b.amount||0),0);const transfer=rows.filter(x=>x.method==='계좌이체').reduce((a,b)=>a+Number(b.amount||0),0);const card=rows.filter(x=>x.method==='카드결제').reduce((a,b)=>a+Number(b.amount||0),0);const total=wage+material+repair;qs('sumTotal').textContent=won(total);qs('sumCash').textContent=won(cash);qs('sumTransfer').textContent=won(transfer);qs('sumCard').textContent=won(card);}
async function loadOptions(){const r=await fetch('/api/options');OPTS=await r.json();qs('weatherSel').innerHTML=(OPTS['옵션_날씨']||[]).map(v=>`<option>${v}</option>`).join('');qs('taskKind').innerHTML=(OPTS['옵션_작업내용']||[]).map(v=>`<option>${v}</option>`).join('');qs('machineSel').innerHTML=(OPTS['옵션_기계']||[]).map(v=>`<option>${v}</option>`).join('');renderChips('cropChips',OPTS['옵션_작물']||[]);const mats=(OPTS['자재']||[]);qs('matSelect').innerHTML=mats.length?mats.map(m=>`<option value="${m['자재명']}">${m['자재명']}</option>`).join(''):'<option value="">재고 자재 없음</option>';renderChips('pestChips',OPTS['병충해']||[],'이름');updateMatUnit();renderSelectedMaterials();}
async function loadSeasonSettings(){const r=await fetch('/api/season_settings');const data=await r.json();qs('seasonSettingsList').innerHTML=data.map(x=>`<div class="line"><div><b>${x['시즌연도']} 시즌</b><div class="muted">전환일 ${x['전환일']}</div></div><button class="sub" onclick="deleteSeasonSetting(${x['시즌연도']})">삭제</button></div>`).join('')||'<div class="muted">등록된 시즌 전환일 없음</div>';}
async function saveSeasonSetting(){const payload={시즌연도:Number(qs('seasonYearInput').value||0),전환일:qs('seasonSwitchInput').value};if(!payload.시즌연도||!payload.전환일){alert('시즌연도와 전환일을 입력하세요');return;}await fetch('/api/season_settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});qs('seasonYearInput').value='';qs('seasonSwitchInput').value='';await loadSeasonSettings();await loadCalendarAndStats();}
async function deleteSeasonSetting(y){if(!confirm('삭제할까요?'))return;await fetch('/api/season_settings/'+y,{method:'DELETE'});await loadSeasonSettings();await loadCalendarAndStats();}
async function loadPaymentSummary(){const r=await fetch('/api/payment_summary');const d=await r.json();qs('paymentSummary').innerHTML=`<div class="summary-item"><div class="small muted">총 금액</div><div>${won(d.total)}</div></div><div class="summary-item"><div class="small muted">현금</div><div>${won(d.cash)}</div></div><div class="summary-item"><div class="small muted">계좌이체</div><div>${won(d.transfer)}</div></div><div class="summary-item"><div class="small muted">카드결제</div><div>${won(d.card)}</div></div><div class="summary-item"><div class="small muted">인건비</div><div>${won(d.wage)}</div></div><div class="summary-item"><div class="small muted">자재비</div><div>${won(d.material)}</div></div><div class="summary-item"><div class="small muted">수리/보수비</div><div>${won(d.repair)}</div></div>`;}
function workDetailHtml(work,task){const payments=(work['결제정보_json']||[]).map(p=>`<div class="muted">- ${p.method} ${won(p.amount)}</div>`).join('');return `<div class="list-card"><div><b>${task['작업내용']||''}</b></div><div class="muted">📅 ${task['날짜']||''}${task['종료날짜']&&task['종료날짜']!==task['날짜']?' ~ '+task['종료날짜']:''}</div><div class="muted">🌱 ${task['작물']||'작물 미선택'}</div><div class="muted">☀️ ${work['날씨']||'-'}</div><div class="muted">🔧 ${task['사용기계']||'-'}</div><div class="muted">🪣 ${task['사용자재']||'-'}</div><div class="muted">🦟 ${task['병충해']||'병충해 미선택'}</div><div class="muted">⏱ ${task['작업시간']||'시간미입력'}</div><div class="muted">👷 ${task['인력내역']||'-'}</div><div class="muted">🏢 ${work['업체명']||'-'}</div><div class="muted">시즌 ${work['시즌연도']||'-'}</div><div class="muted">💰 총 ${won(work['총금액']||0)} / 인건비 ${work['인건비_표시']||'0원'} / 자재비 ${won(work['자재비']||0)} / 수리·보수비 ${won(work['수리및보수비']||0)}</div>${payments||'<div class="muted">결재내역 없음</div>'}<div class="muted">📝 ${task['비고']||'-'}</div></div>`;}
async function loadWorks(){const q=qs('searchQ').value.trim();const r=await fetch('/api/works?q='+encodeURIComponent(q));CURRENT_WORKS=await r.json();const box=qs('worksList');if(!Array.isArray(CURRENT_WORKS)||!CURRENT_WORKS.length){box.className='empty';box.innerHTML='작업 내역이 없습니다.';return;}box.className='';let html='';CURRENT_WORKS.forEach((w,wi)=>{(w.task_items||[]).forEach((t,ti)=>{const dateText=`${t['날짜']||''}${t['종료날짜']&&t['종료날짜']!==t['날짜']?' ~ '+t['종료날짜']:''}`;html+=`<div class="list-card"><div><b>${t['작업내용']||''}</b></div><div class="muted">📅 ${dateText}</div><div class="muted">🌱 ${t['작물']||'작물 미선택'}</div><div class="muted">☀️ ${w['날씨']||'-'}</div><div class="muted">🔧 ${t['사용기계']||'-'}</div><div class="muted">🪣 ${t['사용자재']||'-'}</div><div class="muted">🦟 ${t['병충해']||'병충해 미선택'}</div><div class="muted">⏱ ${t['작업시간']||'시간미입력'}</div><div class="row" style="margin-top:8px"><button class="sub" onclick="openWorkSide(${wi},${ti})">상세보기</button><button class="sub" onclick="beginEdit(${wi},${ti})">수정</button><button class="sub" onclick="deleteWork(${w['번호']})">삭제</button></div></div>`;});});box.innerHTML=html;}
function openWorkSide(workIdx,taskIdx){const w=CURRENT_WORKS[workIdx],t=(w.task_items||[])[taskIdx];const bg=qs('workSideBg'),title=qs('workSideTitle'),body=qs('workSideBody');if(!w||!t||!bg||!title||!body)return;title.textContent=t['작업내용']||'작업 상세';body.innerHTML=workDetailHtml(w,t);bg.classList.add('open');}
function closeWorkSide(){const bg=qs('workSideBg');if(bg)bg.classList.remove('open');}
function resetForm(){EDIT_WORK_NO=null;qs('saveBtn').textContent='저장';selectedMaterials=[];renderSelectedMaterials();qs('vendorName').value='';qs('wageCost').value='0';qs('materialCost').value='0';qs('repairCost').value='0';qs('noteText').value='';qs('taskDate').value='';qs('taskEndDate').value='';qs('dayCount').value='1';qs('startTime').value='';qs('endTime').value='';qs('paymentRows').innerHTML='';addPaymentRow();qs('workersBox').innerHTML='';addWorkerRow();[...document.querySelectorAll('#cropChips .chip,#pestChips .chip')].forEach(c=>c.classList.remove('on'));document.querySelectorAll('#cropChips .default-chip,#pestChips .default-chip').forEach(c=>c.classList.add('on'));recalcPaymentSummary();}
function beginEdit(workIdx,taskIdx){const w=CURRENT_WORKS[workIdx],t=(w.task_items||[])[taskIdx];if(!w||!t)return;EDIT_WORK_NO=w['번호'];qs('saveBtn').textContent='수정 저장';selectedMaterials=[];for(const part of String(t['사용자재']||'').split(';')){if(!part.trim())continue;const pp=part.split('|');if(pp.length===3)selectedMaterials.push({name:pp[0],qty:Number(pp[1]||0),unit:pp[2]||''});}renderSelectedMaterials();qs('vendorName').value=w['업체명']||'';qs('wageCost').value=Number(w['인건비']||0);qs('materialCost').value=Number(w['자재비']||0);qs('repairCost').value=Number(w['수리및보수비']||0);qs('noteText').value=t['비고']||'';qs('taskDate').value=t['날짜']||'';qs('taskEndDate').value=t['종료날짜']||t['날짜']||'';qs('weatherSel').value=w['날씨']||qs('weatherSel').value;qs('taskKind').value=t['작업내용']||qs('taskKind').value;qs('machineSel').value=t['사용기계']||qs('machineSel').value;qs('startTime').value=t['시작시간']||'';qs('endTime').value=t['종료시간']||'';qs('workersBox').innerHTML='';for(const part of String(t['인력내역']||'').split(';')){if(!part.trim())continue;const pp=part.split('|');addWorkerRow({gender:pp[0]||'남자',count:Number(pp[1]||1),pay:Number(pp[2]||0),role:pp[3]||'일반'});}if(!qs('workersBox').children.length)addWorkerRow();qs('paymentRows').innerHTML='';(w['결제정보_json']||[]).forEach(r=>addPaymentRow(r));if(!(w['결제정보_json']||[]).length)addPaymentRow();[...document.querySelectorAll('#cropChips .chip,#pestChips .chip')].forEach(c=>c.classList.remove('on'));document.querySelectorAll('#cropChips .default-chip,#pestChips .default-chip').forEach(c=>c.classList.add('on'));for(const crop of String(t['작물']||'').split(',')){const v=crop.trim();if(!v||v==='작물 미선택')continue;const btn=[...document.querySelectorAll('#cropChips .chip')].find(b=>b.dataset.value===v);if(btn)toggleChipWithDefault(btn,'cropChips');}for(const pest of String(t['병충해']||'').split(',')){const v=pest.trim();if(!v||v==='병충해 미선택')continue;const btn=[...document.querySelectorAll('#pestChips .chip')].find(b=>b.dataset.value===v);if(btn)toggleChipWithDefault(btn,'pestChips');}recalcPaymentSummary();showTab('add');}
function buildTaskPayload(){const start=qs('taskDate').value;if(!start){alert('시작일을 입력하세요');return null;}const end=qs('taskEndDate').value||start,st=qs('startTime').value,et=qs('endTime').value;let hours='시간미입력';if(st&&et){const a=st.split(':').map(Number),b=et.split(':').map(Number);const diff=(b[0]*60+b[1])-(a[0]*60+a[1]);if(diff>0)hours=(diff/60).toFixed(1).replace(/\.0$/,'')+'시간';}return {날씨:qs('weatherSel').value,vendor:qs('vendorName').value.trim(),wage_cost:Number(qs('wageCost').value||0),material_cost:Number(qs('materialCost').value||0),repair_cost:Number(qs('repairCost').value||0),payment_rows:collectPaymentRows(),note:qs('noteText').value.trim(),task_items:[{날짜:start,종료날짜:end,작물:chipSummary('cropChips','작물 미선택'),작업내용:qs('taskKind').value,시작시간:st,종료시간:et,작업시간:hours,사용기계:qs('machineSel').value,사용자재:selectedMaterials.map(m=>`${m.name}|${m.qty}|${m.unit}`).join(';'),병충해:chipSummary('pestChips','병충해 미선택'),인력내역:workerString(),비고:qs('noteText').value.trim()}]};}
async function saveWork(){const payload=buildTaskPayload();if(!payload)return;const url=EDIT_WORK_NO?'/api/works/'+EDIT_WORK_NO:'/api/works';const method=EDIT_WORK_NO?'PUT':'POST';const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const d=await r.json();if(!d.ok&&d.ok!==true){alert((EDIT_WORK_NO?'수정':'저장')+' 실패');return;}alert(EDIT_WORK_NO?'수정되었습니다':'저장되었습니다');resetForm();await loadWorks();await loadPaymentSummary();await loadCalendarAndStats();await loadMaterials();showTab('works');}
async function deleteWork(no){if(!confirm('삭제할까요?'))return;await fetch('/api/works/'+no,{method:'DELETE'});await loadWorks();await loadPaymentSummary();await loadCalendarAndStats();}
async function loadMaterials(){const r=await fetch('/api/materials');const data=await r.json();const box=qs('materialsList');if(!Array.isArray(data)||!data.length){box.className='empty';box.innerHTML='등록된 자재가 없습니다.';return;}box.className='';box.innerHTML=data.map(m=>`<div class="line"><div><b>${m['자재명']}</b><div class="muted">${m['단위']||''} / 가격 ${m['가격']||0} / 재고 ${m['재고']||0}</div></div></div>`).join('');}
async function saveMaterial(){const payload={자재명:qs('matName').value.trim(),단위:qs('matUnit').value.trim(),가격:qs('matPrice').value||0,재고:qs('matStock').value||0};if(!payload.자재명){alert('자재명을 입력하세요');return;}await fetch('/api/materials',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});qs('matName').value='';qs('matUnit').value='';qs('matPrice').value='';qs('matStock').value='';await loadMaterials();await loadOptions();}
async function addOption(){const tbl=qs('optTable').value,value=qs('optValue').value.trim();if(!value)return;await fetch('/api/options/'+encodeURIComponent(tbl),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({항목:value})});qs('optValue').value='';await loadOptions();await loadOptionsView();}
async function savePest(){const payload={이름:qs('pestName').value.trim(),권장약제:qs('pestDrug').value.trim(),증상:qs('pestSymptom').value.trim()};if(!payload.이름){alert('병충해 이름을 입력하세요');return;}await fetch('/api/pests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});qs('pestName').value='';qs('pestDrug').value='';qs('pestSymptom').value='';await loadOptions();await loadOptionsView();}
async function loadOptionsView(){const r=await fetch('/api/options');const data=await r.json();const box=qs('optionsView');let html='';['옵션_날씨','옵션_작물','옵션_작업내용','옵션_기계','옵션_단위'].forEach(k=>{html+=`<div style="margin-bottom:12px"><b>${k}</b><div>`+(data[k]||[]).map(v=>`<span class="tag">${v}</span>`).join('')+`</div></div>`;});html+=`<div style="margin-bottom:12px"><b>병충해</b><div>`+(data['병충해']||[]).map(p=>`<div class="line"><div>${p['이름']}<div class="muted">${p['권장약제']||'-'} / ${p['증상']||'-'}</div></div></div>`).join('')+`</div></div>`;box.className='';box.innerHTML=html||'<div class="empty">옵션이 없습니다.</div>';}
async function loadCalendarAndStats(){const year=qs('yearSel').value,month=qs('monthSel').value;const statRes=await fetch(`/api/stats?year=${year}&month=${month}`);const stat=await statRes.json();qs('monthCnt').textContent=(stat['당월']?.['건수']??0)+'건';qs('monthWage').textContent=won(stat['당월']?.['인건비']??0);qs('seasonWage').textContent=won(stat['시즌']?.['인건비']??0);qs('seasonLabel').textContent=`현재 시즌 기준: ${stat.season_year}년 3월 ~ ${stat.season_year+1}년 2월 / 전환일 ${stat.switch_date}`;const calRes=await fetch(`/api/calendar/${year}/${month}`);CAL_DATA=await calRes.json();const days=['일','월','화','수','목','금','토'];const firstDow=new Date(Number(year),Number(month)-1,1).getDay();const today=new Date();let html='<div class="cal">'+days.map(d=>`<div class="cal-head">${d}</div>`).join('');for(let i=0;i<firstDow;i++)html+='<div class="cal-day empty"></div>';for(let d=1;d<=CAL_DATA.days;d++){const arr=CAL_DATA.day_map[String(d)]||[];const isToday=today.getFullYear()==Number(year)&&(today.getMonth()+1)==Number(month)&&today.getDate()==d;const labels=arr.flatMap(x=>(x.task_items||[]).map(t=>t['작업내용']||'작업')).slice(0,2);html+=`<div class="cal-day ${isToday?'today':''}" onclick="openDayModal(${d})"><div>${d}</div>${labels.map(x=>`<span class="ev">${x}</span>`).join('')}${arr.length>2?`<span class="ev">+${arr.length-2}</span>`:''}</div>`;}html+='</div>';qs('calendarBox').innerHTML=html;}
function workDetailHtml(work,task){const payments=(work['결제정보_json']||[]).map(p=>`<div class="muted">- ${p.method} ${won(p.amount)}</div>`).join('');return `<div class="list-card"><div><b>${task['작업내용']||''}</b></div><div class="muted">📅 ${task['날짜']||''}${task['종료날짜']&&task['종료날짜']!==task['날짜']?' ~ '+task['종료날짜']:''}</div><div class="muted">🌱 ${task['작물']||'작물 미선택'}</div><div class="muted">☀️ ${work['날씨']||'-'}</div><div class="muted">🔧 ${task['사용기계']||'-'}</div><div class="muted">🪣 ${task['사용자재']||'-'}</div><div class="muted">🦟 ${task['병충해']||'병충해 미선택'}</div><div class="muted">⏱ ${task['작업시간']||'시간미입력'}</div><div class="muted">👷 ${task['인력내역']||'-'}</div><div class="muted">🏢 ${work['업체명']||'-'}</div><div class="muted">시즌 ${work['시즌연도']||'-'}</div><div class="muted">💰 총 ${won(work['총금액']||0)} / 인건비 ${work['인건비_표시']||'0원'} / 자재비 ${won(work['자재비']||0)} / 수리·보수비 ${won(work['수리및보수비']||0)}</div>${payments||'<div class="muted">결재내역 없음</div>'}<div class="muted">📝 ${task['비고']||'-'}</div></div>`;}
function openDayModal(day){const arr=(CAL_DATA.day_map||{})[String(day)]||[];qs('dayTitle').textContent=`${CAL_DATA.year}년 ${CAL_DATA.month}월 ${day}일`;if(!arr.length){qs('dayBody').innerHTML='<div class="empty">작업 없음</div>';qs('dayModalBg').classList.add('open');return;}let html='';arr.forEach(w=>{(w.task_items||[]).forEach(t=>{html+=workDetailHtml(w,t);});});qs('dayBody').innerHTML=html;qs('dayModalBg').classList.add('open');}
function closeDayModal(){const bg=qs('dayModalBg');if(bg)bg.classList.remove('open');}
document.addEventListener('click',e=>{if(e.target===qs('dayModalBg'))closeDayModal();if(e.target===qs('workSideBg'))closeWorkSide();});
window.addEventListener('error',e=>alert('화면 오류: '+e.message));
async function initApp(){buildYearMonthSelects();await loadOptions();qs('matSelect').addEventListener('change',updateMatUnit);qs('taskDate').addEventListener('change',updateEndDate);qs('dayCount').addEventListener('input',updateEndDate);qs('wageCost').addEventListener('input',recalcPaymentSummary);qs('materialCost').addEventListener('input',recalcPaymentSummary);qs('repairCost').addEventListener('input',recalcPaymentSummary);addWorkerRow();addPaymentRow();renderSelectedMaterials();await loadWorks();await loadPaymentSummary();await loadMaterials();await loadOptionsView();await loadSeasonSettings();await loadCalendarAndStats();}
initApp();
function addOption(tbl){
    let name = prompt("추가할 값");
    fetch(`/api/options/${tbl}`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({name})
    }).then(()=>loadOptions());
}

function deleteOption(tbl, name){
    fetch(`/api/options/${tbl}/${name}`, {method:"DELETE"})
    .then(()=>loadOptions());
}

function updateOption(tbl, name){
    let newName = prompt("수정", name);
    fetch(`/api/options/${tbl}/${name}`, {
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({name:newName})
    }).then(()=>loadOptions());
}
</script>
</body>
</html>"""


@app.route("/")
def index():
    return render_template_string(HTML)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
