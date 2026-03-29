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
        old_mat = aggregate_materials(parse_or_synthesize_task_items(old))

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
    if x.get("method") == "카드결제"
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
def api_add_work():
    data = request.json or {}
    if not data.get("task_items"):
        return jsonify({"ok": False}), 400
    conn = db_conn(); cur = conn.cursor()
    p = build_save_payload(data, cur)
    now_str = datetime.now().isoformat(timespec="seconds")
    for name, info in p["mat_agg"].items():
        cur.execute('UPDATE "자재" SET "재고" = COALESCE("재고",0) - %s WHERE "자재명"=%s', (info["qty"], name))
    cur.execute('INSERT INTO "작업일지" ("날짜","종료날짜","날씨","작물","작업내용","인건비","시작시간","종료시간","작업시간","사용기계","사용자재","적용병충해","비고","생성시각","수정시각","인력내역","작업목록","업체명","자재비","수리및보수비","총금액","현금결제액","계좌이체액","카드결제액","결제정보","시즌연도") VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)', (p["rep_start"], p["rep_end"], data.get("날씨", ""), p["all_crops"], p["all_task_names"], int(p["wage_cost"]), p["task_list"][0].get("시작시간", ""), p["task_list"][-1].get("종료시간", ""), p["total_hours_text"], p["machines"], p["rep_mats"], p["all_pests"], data.get("note", ""), now_str, now_str, p["rep_wage_detail"], serialize_task_list(p["task_list"]), data.get("vendor", ""), p["material_cost"], p["repair_cost"], p["total_amount"], p["cash_total"], p["transfer_total"], p["card_total"], json.dumps(p["payment_rows"], ensure_ascii=False), p["season_year"]))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})


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
    
# 📌 작업일지 Cloud 배포 진행 요약 (이어하기용)
 
## 1. 전체 구조
 
 
- 백엔드: Flask (cloud_server.py)
 
- DB: Supabase (PostgreSQL)
 
- 배포: Railway
 
- 로컬 DB: SQLite (worklog.db)
 
- 마이그레이션: migrate_to_cloud.py → /api/migrate POST
 

  
## 2. 현재 상태
 
### ✅ 완료된 것
 
 
- GitHub에 코드 업로드 완료
 
- Railway 배포 완료 (URL 있음)
 
- Supabase DB 생성 완료
 
- 기본 API 일부 동작 확인됨 
 
  - /options
 
  - /materials
 
  - /summary
 

 
 

  
### ❗ 현재 문제
 
 
1. 마이그레이션 오류
 

 
 
- /api/migrate 호출 시 
 
  - 500 Internal Server Error
 
  - 502 Bad Gateway (Railway)
 
  - gunicorn WORKER TIMEOUT 발생
 

 
 

 
 
1. 데이터 일부만 들어감
 

 
 
- 작업일지 1개만 성공적으로 전송됨
 

 
 
1. cloud_server.py 문제 가능성
 

 
 
- DB 연결 (psycopg2)
 
- JSON 처리
 
- 요청 데이터 크기 문제
 

  
## 3. 사용 파일 구성
 
 
- cloud_server.py → 서버 코드
 
- migrate_to_cloud.py → SQLite → Cloud 전송
 
- worklog.db → 원본 데이터
 
- requirements.txt 
 
  - flask
 
  - psycopg2-binary
 
  - gunicorn
 

 
 
- Procfile web: gunicorn cloud_server:app --bind 0.0.0.0:$PORT  
 

  
## 4. 마이그레이션 방식
 
로컬에서 실행:
 python migrate_to_cloud.py  
입력:
 
 
- Railway URL (예: https://xxxx.up.railway.app)
 

 
전송 데이터 구조:
 {   "works": [...],   "materials": [...],   "pests": [...],   "options": [...] }   
## 5. 주요 오류 원인 추정
 
### 1️⃣ gunicorn timeout
 
 
- 데이터 한번에 많이 전송 → 서버 처리 못함
 

 
### 2️⃣ PostgreSQL insert 구조 문제
 
 
- 컬럼 mismatch 가능성
 
- NULL 처리 문제
 

 
### 3️⃣ Flask request 처리 문제
 
 
- request.json 크기 과다
 
- 파싱 오류
 

  
## 6. 다음 작업 목표
 
### 🔧 1. 마이그레이션 분할 처리
 
 
- works / materials / options 나눠서 전송
 

  
### 🔧 2. cloud_server.py 수정 필요
 
 
- /api/migrate에서 
 
  - try/except 로그 강화
 
  - insert 쿼리 안정화
 

 
 

  
### 🔧 3. DB 연결 확인
 
 
- Supabase connection string 점검
 
- psycopg2 connect 정상 여부
 

  
### 🔧 4. timeout 대응
 
 
- gunicorn timeout 증가
 
- 또는 데이터 batch 처리
 

  
## 7. 추가 개선 요구사항 (구현 예정)
 
 
- 달력: 작년 데이터도 표시
 
- 자재 dropdown: 재고 있는 것만 표시
 
- 작업: 
 
  - 여러 날짜 선택
 
  - 작물/자재/병충해 다중 선택
 

 
 
- 작업시간 자동 계산
 
- 카드 UI (같은날 여러 작업 분리)
 
- 클릭 시 상세 팝업
 

  
## 8. 요청사항 (다음 질문)
 
👉 현재 상태에서 아래를 해결하고 싶음:
 
 
1. /api/migrate 오류 해결
 
2. 대량 데이터 안정적으로 업로드 방법
 
3. cloud_server.py 코드 수정
 

  
# 📌 여기까지가 현재 상태
 
이어서 해결 방법 단계별로 진행해줘


38s 동안 생각함
좋아. 지금 상태면 **원인은 거의 /api/migrate가 “한 번에 너무 많이 받고, 한 트랜잭션에서 오래 처리하다가, gunicorn worker timeout으로 죽는 구조”**로 보는 게 가장 유력해. Railway도 앱이 0.0.0.0과 PORT에 제대로 떠 있어야 하고, 부하가 크면 메트릭으로 확인하라고 안내하고 있어. 또 Flask는 JSON 요청을 request.json/request.get_json()으로 처리하고, 잘못된 JSON이나 헤더 문제면 400/415 계열이 날 수 있어. psycopg2는 대량 insert에 psycopg2.extras.execute_values 같은 배치 insert 방식을 제공한다. 

지금은 세 가지를 동시에 바꾸는 게 정답이야.

서버 /api/migrate를 배치 처리형으로 수정

클라이언트 migrate_to_cloud.py를 분할 업로드로 수정

gunicorn timeout을 늘리되, timeout 증가에만 의존하지 않기

우선 결론
가장 안전한 방향은 이거야.

works, materials, pests, options를 한 번에 보내지 말고 분리

각 항목도 100~300건 단위 batch로 쪼개서 전송

서버는 각 batch를 받아서

JSON 검증

누락 필드 기본값 처리

execute_values로 bulk insert

batch 단위 commit

실패하면 어떤 레코드에서 죽었는지 응답에 포함

이렇게 바꾸면 지금 겪는

500

502

worker timeout

일부만 들어가는 문제

를 한꺼번에 줄일 수 있어.

1) 먼저 Railway 시작 명령부터 수정
지금 Procfile:

web: gunicorn cloud_server:app --bind 0.0.0.0:$PORT
이건 방향은 맞아. Railway도 Python/gunicorn 앱은 0.0.0.0과 Railway가 주는 PORT로 리슨해야 한다고 안내한다. 

하지만 지금은 timeout을 늘려야 해.

권장 변경
web: gunicorn cloud_server:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 180
이유
--timeout 180: 마이그레이션 중 긴 insert 허용

--workers 2: 동시성 약간 확보

--threads 4: 가벼운 I/O 대응

다만 핵심은 timeout 증가가 아니라 batch 처리야. timeout만 늘리면 큰 payload에서 또 죽을 수 있어.

2) cloud_server.py를 배치 업로드용으로 바꾸기
현재 /api/migrate가 한 번에 전체를 받는 구조라면, 아래처럼 바꾸는 게 좋다.

핵심 설계
/api/migrate/<table_name> 형태로 분리

요청 body:

{
  "rows": [...],
  "replace": false
}
테이블별 insert 함수 분리

execute_values 사용

각 batch 단위로 commit

에러 시 rollback + 어느 batch에서 죽었는지 반환

예시 cloud_server.py 구조
import os
import math
import traceback
from flask import Flask, request, jsonify
import psycopg2
from psycopg2.extras import execute_values

app = Flask(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

def get_conn():
    return psycopg2.connect(DATABASE_URL, sslmode="require")

def chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i+size]

@app.route("/health", methods=["GET"])
def health():
    try:
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        cur.close()
        conn.close()
        return jsonify({"ok": True}), 200
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
JSON 파싱은 이렇게
Flask 문서상 JSON 요청은 request.json 또는 request.get_json()으로 처리할 수 있고, JSON이 아니거나 Content-Type이 맞지 않으면 에러가 날 수 있어. 그래서 서버에서 방어적으로 처리하는 게 좋다. 

def get_json_body():
    data = request.get_json(silent=True)
    if data is None:
        raise ValueError("JSON body가 없거나 파싱에 실패했습니다.")
    return data
works insert 예시
def insert_works(cur, rows):
    values = []
    for r in rows:
        values.append((
            r.get("date"),
            r.get("weather"),
            r.get("crop"),
            r.get("work_type"),
            r.get("materials_used"),
            r.get("amount"),
            r.get("memo"),
            r.get("start_time"),
            r.get("end_time"),
            r.get("work_hours"),
            r.get("workers"),
            r.get("machine"),
            r.get("pest")
        ))

    sql = """
    INSERT INTO works (
        date, weather, crop, work_type, materials_used, amount, memo,
        start_time, end_time, work_hours, workers, machine, pest
    ) VALUES %s
    """
    execute_values(cur, sql, values, page_size=200)
materials insert 예시
def insert_materials(cur, rows):
    values = []
    for r in rows:
        values.append((
            r.get("name"),
            r.get("quantity", 0),
            r.get("unit"),
            r.get("price", 0),
            r.get("vendor"),
            r.get("memo")
        ))

    sql = """
    INSERT INTO materials (
        name, quantity, unit, price, vendor, memo
    ) VALUES %s
    ON CONFLICT (name)
    DO UPDATE SET
        quantity = EXCLUDED.quantity,
        unit = EXCLUDED.unit,
        price = EXCLUDED.price,
        vendor = EXCLUDED.vendor,
        memo = EXCLUDED.memo
    """
    execute_values(cur, sql, values, page_size=200)
options insert 예시
def insert_options(cur, rows):
    values = []
    for r in rows:
        values.append((
            r.get("category"),
            r.get("name")
        ))

    sql = """
    INSERT INTO options (category, name)
    VALUES %s
    ON CONFLICT (category, name) DO NOTHING
    """
    execute_values(cur, sql, values, page_size=200)
pests insert 예시
def insert_pests(cur, rows):
    values = []
    for r in rows:
        values.append((
            r.get("name"),
            r.get("memo")
        ))

    sql = """
    INSERT INTO pests (name, memo)
    VALUES %s
    ON CONFLICT (name) DO NOTHING
    """
    execute_values(cur, sql, values, page_size=200)
공통 migrate endpoint
INSERT_MAP = {
    "works": insert_works,
    "materials": insert_materials,
    "options": insert_options,
    "pests": insert_pests,
}

@app.route("/api/migrate/<table_name>", methods=["POST"])
def migrate_table(table_name):
    if table_name not in INSERT_MAP:
        return jsonify({"ok": False, "error": f"지원하지 않는 테이블: {table_name}"}), 400

    try:
        body = get_json_body()
        rows = body.get("rows", [])

        if not isinstance(rows, list):
            return jsonify({"ok": False, "error": "rows는 list여야 합니다."}), 400

        if not rows:
            return jsonify({"ok": True, "inserted": 0, "message": "빈 데이터"}), 200

        conn = get_conn()
        cur = conn.cursor()

        INSERT_MAP[table_name](cur, rows)

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "ok": True,
            "table": table_name,
            "inserted": len(rows)
        }), 200

    except Exception as e:
        try:
            conn.rollback()
        except:
            pass

        app.logger.exception("migrate error")
        return jsonify({
            "ok": False,
            "table": table_name,
            "error": str(e),
            "trace": traceback.format_exc()
        }), 500
3) 더 안전한 방식: 서버에서도 내부 배치 처리
클라이언트가 200건씩 보내더라도, 서버도 한 번 더 쪼개면 더 안전해.

@app.route("/api/migrate/<table_name>", methods=["POST"])
def migrate_table(table_name):
    conn = None
    cur = None
    try:
        if table_name not in INSERT_MAP:
            return jsonify({"ok": False, "error": f"지원하지 않는 테이블: {table_name}"}), 400

        body = get_json_body()
        rows = body.get("rows", [])
        batch_size = int(body.get("batch_size", 200))

        if not isinstance(rows, list):
            return jsonify({"ok": False, "error": "rows는 list여야 합니다."}), 400

        conn = get_conn()
        cur = conn.cursor()

        total = 0
        for idx, batch in enumerate(chunked(rows, batch_size), start=1):
            INSERT_MAP[table_name](cur, batch)
            conn.commit()
            total += len(batch)

        return jsonify({
            "ok": True,
            "table": table_name,
            "inserted": total
        }), 200

    except Exception as e:
        if conn:
            conn.rollback()
        app.logger.exception("migrate error")
        return jsonify({
            "ok": False,
            "table": table_name,
            "error": str(e),
            "trace": traceback.format_exc()
        }), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
이렇게 하면 한 요청 안에서도 오래 잡아두지 않고 중간중간 commit 가능하다.

4) migrate_to_cloud.py도 반드시 수정
서버만 고쳐도 부족해. 클라이언트도 지금처럼 한 번에 전체 JSON 보내면 또 터질 가능성이 높아.

권장 흐름
로컬 SQLite에서 읽기

works, materials, options, pests 각각 분리

각 목록을 100~200건씩 나눠 POST

실패 batch는 번호 출력

예시 migrate_to_cloud.py
import sqlite3
import requests
import json

BATCH_SIZE = 200

def chunked(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i+size]

def read_sqlite():
    conn = sqlite3.connect("worklog.db")
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    data = {}

    cur.execute("SELECT * FROM works")
    data["works"] = [dict(row) for row in cur.fetchall()]

    cur.execute("SELECT * FROM materials")
    data["materials"] = [dict(row) for row in cur.fetchall()]

    cur.execute("SELECT * FROM options")
    data["options"] = [dict(row) for row in cur.fetchall()]

    cur.execute("SELECT * FROM pests")
    data["pests"] = [dict(row) for row in cur.fetchall()]

    cur.close()
    conn.close()
    return data

def upload_table(base_url, table_name, rows):
    url = f"{base_url}/api/migrate/{table_name}"
    total = len(rows)
    success = 0

    for idx, batch in enumerate(chunked(rows, BATCH_SIZE), start=1):
        payload = {
            "rows": batch,
            "batch_size": BATCH_SIZE
        }

        try:
            resp = requests.post(url, json=payload, timeout=180)
            print(f"[{table_name}] batch {idx} status={resp.status_code}")

            if resp.status_code != 200:
                print(resp.text)
                break

            result = resp.json()
            success += result.get("inserted", 0)

        except Exception as e:
            print(f"[{table_name}] batch {idx} error: {e}")
            break

    print(f"[{table_name}] uploaded {success}/{total}")

def main():
    base_url = input("Railway URL 입력: ").strip().rstrip("/")
    data = read_sqlite()

    for table_name in ["options", "materials", "pests", "works"]:
        rows = data.get(table_name, [])
        if rows:
            upload_table(base_url, table_name, rows)

if __name__ == "__main__":
    main()
5) 왜 일부만 들어갔는지
이건 보통 아래 셋 중 하나야.

A. 중간에 특정 row에서 컬럼 mismatch
예:

SQLite에는 있는데 PostgreSQL에는 없는 컬럼

타입이 다름

NOT NULL인데 값 없음

이 경우 앞 batch 일부만 들어가고 뒤에서 죽는다.

B. 한 트랜잭션이 너무 오래 걸림
gunicorn worker가 처리 중 timeout으로 죽으면,

응답은 502/500

일부 커밋된 데이터만 남을 수 있음

C. JSON 구조가 서버 기대와 다름
예:

{
  "works": [...]
}
를 기대하는데 실제로는

{
  "rows": [...]
}
형태거나 반대인 경우.

6) DB 컬럼 mismatch 확인 방법
이건 바로 해봐야 한다.

Supabase에서 각 테이블 스키마 확인
반드시 확인할 것:

컬럼명 정확히 일치?

snake_case / 한글 컬럼 섞였는지?

NOT NULL 있는지?

기본값 있는지?

unique 제약 있는지?

특히 SQLite에서 쓰던 컬럼명과 PostgreSQL 컬럼명이 다르면 거의 바로 터진다.

서버에 임시 로그 추가
app.logger.info(f"table={table_name}, row_count={len(rows)}")
app.logger.info(f"sample_row_keys={list(rows[0].keys()) if rows else []}")
그리고 batch 직전에:

app.logger.info(f"inserting table={table_name}, batch_size={len(batch)}")
이 로그가 있으면 Railway 로그에서 몇 번째 batch에서 죽는지 바로 잡힌다.

7) PostgreSQL insert 안정화 포인트
psycopg 문서는 execute()에 %s 플레이스홀더로 파라미터 바인딩하는 방식을 권장하고, psycopg2 extras는 대량 입력용 유틸을 제공한다. 그래서 문자열 직접 조립하지 말고 parameterized query + execute_values로 가는 게 맞다. 

반드시 지킬 것
SQL 문자열에 값 직접 붙이지 말기

None은 그대로 보내기

숫자/날짜 변환은 Python 쪽에서 정리

UPSERT 필요한 테이블은 ON CONFLICT 사용

8) 지금 바로 적용할 우선순위
1순위
/api/migrate를 table별 endpoint + batch insert로 변경

2순위
migrate_to_cloud.py에서 대량 분할 전송

3순위
Procfile timeout 증가

4순위
Railway 로그에 batch 번호 출력

9) 추천 테스트 순서
이 순서대로 해야 원인 분리가 된다.

테스트 1: health 체크
GET /health
DB 연결 정상인지 확인

테스트 2: options 5건만 전송
{"rows":[ ... 5개 ... ]}
가장 단순한 테이블 먼저

테스트 3: materials 10건
upsert 확인

테스트 4: works 10건
가장 복잡한 테이블

여기서 타입/컬럼 mismatch 잡힘

테스트 5: works 200건
batch 처리 성능 확인

테스트 6: 전체 마이그레이션
options → materials → pests → works 순서

이 순서가 좋은 이유는, 일반적으로 works가 제일 복잡해서 마지막에 보내는 게 디버깅이 쉽기 때문이야.

10) 지금 문제에 대한 가장 현실적인 진단
네 설명만 보면 가능성 순위는 이렇다.

1위. 한 번에 너무 큰 payload + 오래 걸리는 insert
증상:

502

gunicorn worker timeout

일부만 들어감

2위. works 테이블 컬럼 mismatch
증상:

한 개 또는 소수만 들어감

특정 row부터 실패

3위. request JSON 구조/필드명 불일치
증상:

request.json은 잡히지만 내부 parsing 오류

일부 category만 성공

11) 내가 권장하는 최종 구조
API 엔드포인트
GET /health

POST /api/migrate/options

POST /api/migrate/materials

POST /api/migrate/pests

POST /api/migrate/works

클라이언트 업로드 순서
options

materials

pests

works

batch 크기
처음엔 100

안정화 후 200

그래도 느리면 300까지

timeout 난다면 다시 100

12) 바로 복붙해서 바꿀 최소 변경안
가장 최소한으로만 바꾸려면 이것만 해도 된다.

Procfile
web: gunicorn cloud_server:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 180
서버
/api/migrate 한 개 대신 /api/migrate/<table_name> 추가

execute_values 사용

try/except + traceback 반환

클라이언트
전체 JSON 한 번 전송 제거

테이블별/200건씩 전송

13) 네가 다음으로 해야 할 것
cloud_server.py를 위 구조로 수정

migrate_to_cloud.py를 batch 업로드 방식으로 수정

Procfile timeout 수정 후 Railway 재배포

options 5건, materials 10건, works 10건 순으로 테스트

Railway 로그에서 실패 batch 확인

원하면 다음 답변에서 내가 네 구조에 맞춘 cloud_server.py 전체 수정본부터 바로 만들어줄게.


업로드한 이미지


12s 동안 생각함
이 오류창은 클라이언트 문제가 아니라 Railway 쪽에서 앱이 제때 응답하지 못해서 난 502로 보면 돼.

즉, 지금 상태는 거의 이렇게 해석하면 맞아.

요청은 Railway까지는 도달함

그런데 Railway Edge Proxy가 네 Flask/Gunicorn 앱으로부터 정상 응답을 못 받음

그래서 502 Application failed to respond를 반환함 

네가 앞에서 말한 상황이랑 합치면, /api/migrate에서 대량 데이터 처리 중 worker timeout 또는 과부하가 가장 유력해 보여. Railway 문서도 이런 502의 대표 원인으로

앱이 올바른 host/port에 안 떠 있는 경우

target port 설정 불일치

앱이 과부하라 응답을 못 하는 경우
를 들고 있어. 

지금은 첫 번째보다는 세 번째 가능성이 더 커 보여. 이유는:

/options, /materials, /summary는 일부 동작했다고 했고

마이그레이션처럼 오래 걸리는 요청에서 500/502와 timeout이 났다고 했기 때문이야

특히 Gunicorn의 worker timeout은 요청 처리 시간이 길거나 worker가 막혔을 때 흔히 생긴다. 

지금 바로 확인할 것
Railway 로그

/api/migrate 호출 직후

WORKER TIMEOUT

killed

out of memory

traceback 있는지 확인

Railway Metrics

CPU가 치솟는지

메모리가 부족한지
Railway는 과부하 여부를 Metrics 탭으로 확인하라고 안내한다. 

Gunicorn 실행 옵션
지금은 timeout을 늘려야 해.

web: gunicorn cloud_server:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 180
가장 중요한 해결 방향
한 번에 전체 데이터 전송을 멈추는 것이 핵심이야.

지금은 아마 이 구조일 가능성이 높아:

{
  "works": [...엄청 많음...],
  "materials": [...],
  "pests": [...],
  "options": [...]
}
이걸 한 번에 보내면

JSON 파싱 시간

DB insert 시간

한 트랜잭션 처리 시간
이 한꺼번에 길어져서 timeout 나기 쉬워.

그래서 이렇게 바꿔야 해:

/api/migrate/options

/api/migrate/materials

/api/migrate/pests

/api/migrate/works

그리고 각 테이블도 다시 100~200건씩 batch 업로드.

지금 오류창 기준으로 판단한 핵심 결론
이건 URL이 완전히 틀린 상태라기보다는

앱이 살아는 있지만 특정 요청에서 못 버티는 상태에 더 가깝다

다만 배포 설정도 한 번은 확인해야 해. Railway는 앱이 0.0.0.0과 PORT 환경변수로 리슨해야 하고, public domain의 target port도 실제 앱 포트와 맞아야 한다고 설명한다. 

네가 지금 당장 할 순서
Procfile timeout 수정 후 재배포

/health 엔드포인트 추가

/api/migrate를 테이블별 endpoint로 분리

migrate_to_cloud.py를 batch 전송으로 변경

options 5건 → materials 10건 → works 10건 순으로 테스트

원하면 다음 답변에서 바로 네 cloud_server.py를 502 안 나게 바꾼 전체 코드 형태로 작성해줄게.



붙여넣은 텍스트 (1).txt
문서

좋아. 이건 이제 원인이 100% 명확하다.
지금 502 원인은 “서버 과부하”가 아니라 코드 문법 오류로 서버 자체가 아예 실행 실패 상태다.

🔥 핵심 원인 (확정)
로그에서 결정적인 부분:

File "/app/cloud_server.py", line 356
from datetime import datetime
^^^^
SyntaxError: invalid syntax
그리고:

Worker failed to boot.
👉 이건 의미가 딱 하나야:

Flask 서버가 아예 시작도 못함 → 요청 오면 502 발생

📌 즉 지금 상황:

서버 ❌ 실행 안됨

gunicorn worker ❌ 부팅 실패

Railway는 살아있지만 앱이 죽어 있음

그래서 502 발생

❗ 왜 from datetime import datetime에서 터질까?
이 줄 자체는 정상 코드야.
문제는 이 줄 "위에" 반드시 문법 오류가 있다.

가장 흔한 원인 5가지
1️⃣ 닫히지 않은 문자열
query = "INSERT INTO works VALUES (
👉 닫히지 않으면 다음 줄에서 SyntaxError 발생

2️⃣ 괄호 안 닫힘
data = (
    1,
    2,
    3
# ← 여기 닫힘 없음
3️⃣ f-string 깨짐
너 예전에 많이 나왔던 에러

f"{value
4️⃣ 잘못된 들여쓰기 + 코드 끊김
5️⃣ 주석/문자열 중간에 코드 끼어듦
📌 핵심 포인트
👉 에러 위치는 "356줄"이지만
👉 진짜 문제는 355줄 이전 어딘가

✅ 해결 방법 (가장 빠른 방법)
방법 1: 해당 줄 위 20줄 확인
350 ~ 356줄 사이 코드 보여줘

→ 내가 바로 정확히 짚어준다

방법 2: 직접 찾는 법 (빠른 체크)
cloud_server.py에서 아래 확인:

체크 리스트
" 닫힘 여부

' 닫힘 여부

( ) 개수 맞는지

[ ] 맞는지

{ } 맞는지

f-string 깨짐 없는지

방법 3: 로컬에서 실행해보기 (가장 확실)
python cloud_server.py
👉 여기서 동일 에러 바로 뜸

🚨 중요한 상태 정리
지금은 단계가 이거야:

상태	상황
DB	정상
Railway	정상
API 일부	이전 버전 기준 동작
현재 배포	❌ 완전히 죽어 있음
502	서버 죽어서 발생
🔧 지금 해야 할 것 (순서)
1️⃣ cloud_server.py 문법 오류 수정 (최우선)
👉 이거 안 하면 아무것도 진행 불가

2️⃣ 수정 후 Git push
3️⃣ Railway 재배포 확인
로그에서:

Booting worker with pid
이후 에러 없어야 정상

4️⃣ /health 테스트
💬 결론
지금 문제는:
❌ 마이그레이션 구조 문제가 아님
❌ timeout 문제가 아님

👉 단순 문법 오류로 서버가 죽어있는 상태

👉 다음 단계
지금 가장 빠른 해결:

👉 cloud_server.py 340~360줄 코드 붙여줘

그러면 내가:

어디가 깨졌는지

정확히 어떤 문법 오류인지

바로 수정 코드

딱 짚어서 고쳐줄게 👍


@app.route("/api/payment_summary")
def api_payment_summary():
    conn = db_conn(); cur = conn.cursor()
    cur.execute('SELECT COALESCE(SUM("총금액"),0) AS total, COALESCE(SUM("현금결제액"),0) AS cash, COALESCE(SUM("계좌이체액"),0) AS transfer, COALESCE(SUM("카드결제액"),0) AS card, COALESCE(SUM("인건비"),0) AS wage, COALESCE(SUM("자재비"),0) AS material, COALESCE(SUM("수리및보수비"),0) AS repair FROM "작업일지"')
    row = dict(cur.fetchone())
    cur.close(); conn.close()
    return jsonify(row)


@app.route("/api/works")
from datetime import datetime

def safe_parse_task_items(row):
    try:
        raw = row.get("작업목록", "")

        # 정상 파싱 시도
        items = parse_task_list(raw) if raw else []
        if items:
            return items

원인 찾았다.

문법 오류는 여기야:

@app.route("/api/works")
from datetime import datetime
@app.route(...) 데코레이터 다음 줄에는 **반드시 함수 정의(def ...)**가 와야 하는데, 그 자리에 from datetime import datetime이 들어가 있어서 SyntaxError가 난 거야.

즉 지금 Python은 이렇게 읽고 있어:

@app.route("/api/works") → “다음 함수에 적용해야지”

그런데 다음 줄이 from datetime import datetime → 함수가 아니라서 문법 오류

수정 방법
잘못된 코드
@app.route("/api/works")
from datetime import datetime

def safe_parse_task_items(row):
    ...
올바른 코드
from datetime import datetime는 파일 상단 import 구역으로 올려야 해.

예를 들면:

from datetime import datetime
from flask import Flask, jsonify, request
그리고 라우트는 실제 API 함수 바로 위에 둬야 해.

예시:

from datetime import datetime

@app.route("/api/works")
def api_works():
    ...
지금 코드에서 더 정확히 보면
safe_parse_task_items()는 이름상 보조 함수인데,
이 함수 위에 @app.route("/api/works")를 붙인 것도 구조상 이상해.

즉 아마 원래 의도는 이런 형태였을 가능성이 커:

from datetime import datetime

def safe_parse_task_items(row):
    try:
        raw = row.get("작업목록", "")
        items = parse_task_list(raw) if raw else []
        if items:
            return items
        return []
    except Exception:
        return []

@app.route("/api/works")
def api_works():
    ...
정리
반드시 고칠 것 1
이 줄을 삭제:

@app.route("/api/works")
from datetime import datetime
반드시 고칠 것 2
from datetime import datetime를 파일 상단 import 부분으로 이동

반드시 고칠 것 3
@app.route("/api/works") 아래에는 실제 엔드포인트 함수가 오게 수정

예:

@app.route("/api/works")
def api_works():
    conn = db_conn()
    cur = conn.cursor()
    ...
아주 간단한 수정 예시
from datetime import datetime

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
        items = parse_task_list(raw) if raw else []
        if items:
            return items
        return []
    except Exception:
        return []

@app.route("/api/works")
def api_works():
    return jsonify([])
다음 순서
from datetime import datetime를 상단으로 이동

@app.route("/api/works") 바로 아래에 def api_works(): 배치

git push

Railway 재배포

로그에서 Worker failed to boot가 사라졌는지 확인

지금 이어서 api_works() 부분까지 붙여주면, 내가 전체 구조 맞게 바로 정리해줄게.


@app.route("/api/works") 은 없고 @app.route("/api/works", 은 너무 많은데? 

좋은 질문인데, 이건 핵심을 잘 짚었어 👍
지금 상황은 “문법 오류 + 라우트 위치 꼬임” 두 개가 동시에 섞여있는 상태야.

🔥 지금 상태 정확한 진단
네 코드에서 문제는 이거 하나로 정리된다:

@app.route("/api/works")
from datetime import datetime
👉 이 한 줄 때문에 서버 전체가 죽은 상태

❗ 그런데 추가 문제 하나 더 있음
네 말:

@app.route("/api/works", 은 너무 많은데?

👉 이건 또 다른 문제 가능성 있음

가능성 1️⃣
@app.route("/api/works", methods=["GET"])
@app.route("/api/works", methods=["POST"])
@app.route("/api/works", methods=["PUT"])
👉 이건 정상 (Flask에서는 가능)

가능성 2️⃣ (문제)
@app.route("/api/works", methods=["GET"])
@app.route("/api/works", methods=["POST"])
def func1(): ...

@app.route("/api/works", methods=["GET"])
def func2(): ...
👉 같은 URL + 같은 method → 충돌 가능

가능성 3️⃣ (지금 네 상황에서 가장 유력)
👉 중간에 잘못 끊긴 라우트 블록

예:

@app.route("/api/works")
# ← 여기서 함수 안 나오고 끊김

from datetime import datetime   ❌ (현재 상황)
✅ 해결 방법 (정확하게)
1️⃣ 무조건 이것부터 수정
👉 이 줄 제거 또는 이동

from datetime import datetime
👉 파일 맨 위로 이동

2️⃣ 잘못 끊긴 라우트 찾기
👉 반드시 이 패턴 확인

❌ 잘못된 구조
@app.route("/api/works")
# 함수 없음
✅ 올바른 구조
@app.route("/api/works")
def api_works():
    ...
🔍 빠르게 찾는 방법 (추천)
VSCode / 메모장 찾기
@app.route("/api/works")
👉 찾으면 바로 아래 줄 확인

💣 지금 에러의 100% 원인
이 로그 그대로 보면:

SyntaxError: invalid syntax
File "/app/cloud_server.py", line 356
from datetime import datetime
👉 Python이 해석 못하는 이유:

@app.route("/api/works")   ← 함수 기다리는 중
from datetime import datetime   ← 갑자기 import 등장 → 문법 오류
🚨 중요한 포인트
지금은 이 단계야:

상태	설명
서버 실행	❌ 완전 실패
502 에러	서버 죽어서 발생
마이그레이션 문제	❌ 아직 아님
DB 문제	❌ 아님
원인	✔ 문법 오류
✨ 정리 (딱 3개만 하면 됨)
✔ 1
from datetime import datetime
👉 맨 위로 이동

✔ 2
이 구조 확인

@app.route("/api/works")
def api_works():
👉 반드시 함수 붙이기

✔ 3
라우트 중복은 지금 신경 안 써도 됨
👉 문법 오류 먼저 해결이 최우선

👉 다음 단계
지금 거의 끝났어.

👉 딱 하나만 더 해줘:

@app.route("/api/works") 있는 부분 5~10줄 전체 보여줘

그러면

라우트 구조 정리

중복 여부 확인

실제 API 구조까지 깔끔하게 정리

한 번에 끝내줄게 👍


@app.route("/api/works", methods=["POST"])  @app.route("/api/works/<int:no>", methods=["PUT"])  @app.route("/api/works/<int:no>", methods=["DELETE"])  이렇게 3개가 있는데

그 3개는 정상일 수 있어.

@app.route("/api/works", methods=["POST"])
@app.route("/api/works/<int:no>", methods=["PUT"])
@app.route("/api/works/<int:no>", methods=["DELETE"])
이건 각각

POST /api/works : 작업 추가

PUT /api/works/번호 : 작업 수정

DELETE /api/works/번호 : 작업 삭제

용도라서 문제 아님이야.

지금 진짜 문제는 여전히 이거야:

@app.route("/api/works")
from datetime import datetime
또는 비슷하게, 어떤 @app.route(...) 바로 다음 줄에 def 함수이름():가 안 오고 다른 코드가 들어간 상태.

데코레이터는 반드시 바로 아래에 함수가 붙어야 해.

예를 들면 이건 정상:

@app.route("/api/works", methods=["POST"])
def api_create_work():
    ...
이건 비정상:

@app.route("/api/works", methods=["POST"])
from datetime import datetime
def api_create_work():
    ...
지금 확인할 것
cloud_server.py에서 아래 패턴을 찾아봐.

1. import 위치
from datetime import datetime 는 파일 맨 위 import 구역에 있어야 해.

예:

import os
import json
from datetime import datetime
from flask import Flask, request, jsonify
2. route 바로 아래 줄
모든 @app.route(...) 아래에는 바로 def ...():가 와야 해.

예:

@app.route("/api/works", methods=["POST"])
def api_create_work():
    ...
@app.route("/api/works/<int:no>", methods=["PUT"])
def api_update_work(no):
    ...
@app.route("/api/works/<int:no>", methods=["DELETE"])
def api_delete_work(no):
    ...
왜 에러가 났는지 다시 정리
로그상 에러는

File "/app/cloud_server.py", line 356
from datetime import datetime
SyntaxError: invalid syntax
이거였지.

이 말은 거의 확실하게 356줄 바로 위에 데코레이터가 있고, 그 다음에 함수 대신 import가 나왔다는 뜻이야.

즉 POST/PUT/DELETE 3개가 문제가 아니라,
어딘가에 잘못 남아 있는 @app.route("/api/works") 또는 다른 route 데코레이터가 끊겨 있는 것이 문제야.

바로 찾는 방법
파일에서 이것들 전부 검색해봐.

@app.route("/api/works")
@app.route("/api/works",
@app.route('/api/works')
@app.route('/api/works',
그리고 찾은 위치마다 바로 아래 줄을 확인해.

정상 예시:

@app.route("/api/works", methods=["POST"])
def api_create_work():
비정상 예시:

@app.route("/api/works")
from datetime import datetime
또는

@app.route("/api/works")
data = request.get_json()
네 경우 가장 가능성 높은 상태
아마 코드 중간이 이렇게 깨졌을 가능성이 커:

@app.route("/api/payment_summary")
def api_payment_summary():
    ...

@app.route("/api/works")
from datetime import datetime

def safe_parse_task_items(row):
    ...
이 구조면 무조건 문법 오류야.

safe_parse_task_items()는 라우트 함수가 아닌데, 그 위에 @app.route("/api/works")가 잘못 붙어 들어간 상태로 보이거든.

수정 방향
아마 이렇게 바꾸면 된다.

잘못된 형태
@app.route("/api/works")
from datetime import datetime

def safe_parse_task_items(row):
    ...
수정 형태
from datetime import datetime

def safe_parse_task_items(row):
    ...
즉,

@app.route("/api/works") 삭제

from datetime import datetime 상단 import로 이동

그리고 실제 POST/PUT/DELETE 라우트는 그대로 두면 된다.

결론
지금 네가 말한 3개 라우트는 문제 아니다.
문제는 따로 남아 있는 잘못된 라우트 데코레이터 1개 또는 데코레이터 아래 함수가 아닌 코드가 들어간 구조다.

다음으로 api_payment_summary() 끝나는 부분부터 safe_parse_task_items() 시작 전까지 15~20줄만 붙여주면, 내가 정확히 어느 줄을 지워야 하는지 바로 표시해줄게.



@app.route("/api/works", methods=["POST"])
def api_add_work():
    data = request.json or {}
    if not data.get("task_items"):
        return jsonify({"ok": False}), 400
    conn = db_conn(); cur = conn.cursor()
    p = build_save_payload(data, cur)
    now_str = datetime.now().isoformat(timespec="seconds")
    for name, info in p["mat_agg"].items():
        cur.execute('UPDATE "자재" SET "재고" = COALESCE("재고",0) - %s WHERE "자재명"=%s', (info["qty"], name))
    cur.execute('INSERT INTO "작업일지" ("날짜","종료날짜","날씨","작물","작업내용","인건비","시작시간","종료시간","작업시간","사용기계","사용자재","적용병충해","비고","생성시각","수정시각","인력내역","작업목록","업체명","자재비","수리및보수비","총금액","현금결제액","계좌이체액","카드결제액","결제정보","시즌연도") VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)', (p["rep_start"], p["rep_end"], data.get("날씨", ""), p["all_crops"], p["all_task_names"], int(p["wage_cost"]), p["task_list"][0].get("시작시간", ""), p["task_list"][-1].get("종료시간", ""), p["total_hours_text"], p["machines"], p["rep_mats"], p["all_pests"], data.get("note", ""), now_str, now_str, p["rep_wage_detail"], serialize_task_list(p["task_list"]), data.get("vendor", ""), p["material_cost"], p["repair_cost"], p["total_amount"], p["cash_total"], p["transfer_total"], p["card_total"], json.dumps(p["payment_rows"], ensure_ascii=False), p["season_year"]))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})


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
    old_mat = aggregate_materials(parse_or_synthesize_task_items(old))
    p = build_save_payload(data, cur)
    for name in set(old_mat.keys()) | set(p["mat_agg"].keys()):
        delta = p["mat_agg"].get(name, {}).get("qty", 0) - old_mat.get(name, {}).get("qty", 0)
        if abs(delta) > 0:
            cur.execute('UPDATE "자재" SET "재고" = COALESCE("재고",0) - %s WHERE "자재명"=%s', (delta, name))
    cur.execute('UPDATE "작업일지" SET "날짜"=%s,"종료날짜"=%s,"날씨"=%s,"작물"=%s,"작업내용"=%s,"인건비"=%s,"시작시간"=%s,"종료시간"=%s,"작업시간"=%s,"사용기계"=%s,"사용자재"=%s,"적용병충해"=%s,"비고"=%s,"수정시각"=%s,"인력내역"=%s,"작업목록"=%s,"업체명"=%s,"자재비"=%s,"수리및보수비"=%s,"총금액"=%s,"현금결제액"=%s,"계좌이체액"=%s,"카드결제액"=%s,"결제정보"=%s,"시즌연도"=%s WHERE "번호"=%s', (p["rep_start"], p["rep_end"], data.get("날씨", ""), p["all_crops"], p["all_task_names"], int(p["wage_cost"]), p["task_list"][0].get("시작시간", ""), p["task_list"][-1].get("종료시간", ""), p["total_hours_text"], p["machines"], p["rep_mats"], p["all_pests"], data.get("note", ""), datetime.now().isoformat(timespec="seconds"), p["rep_wage_detail"], serialize_task_list(p["task_list"]), data.get("vendor", ""), p["material_cost"], p["repair_cost"], p["total_amount"], p["cash_total"], p["transfer_total"], p["card_total"], json.dumps(p["payment_rows"], ensure_ascii=False), p["season_year"], no))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})


@app.route("/api/works/<int:no>", methods=["DELETE"])
def api_delete_work(no):
    conn = db_conn(); cur = conn.cursor()
    cur.execute('DELETE FROM "작업일지" WHERE "번호"=%s', (no,))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})

이 3개 라우트 자체는 정상이다.

@app.route("/api/works", methods=["POST"])
def api_add_work():
    ...

@app.route("/api/works/<int:no>", methods=["PUT"])
def api_update_work(no):
    ...

@app.route("/api/works/<int:no>", methods=["DELETE"])
def api_delete_work(no):
    ...
지금 로그의 핵심은 여전히 문법 오류로 worker가 부팅 실패했다는 점이고, 에러 위치는 cloud_server.py 356줄의 from datetime import datetime였다. 즉 문제는 이 3개 라우트가 아니라, 다른 곳에 잘못 끼어든 from datetime import datetime 또는 그 바로 위의 끊긴 데코레이터다. 로그상 Worker failed to boot와 SyntaxError: invalid syntax가 명확히 찍혀 있다. 


지금 네가 보여준 코드 기준으로 보면, 이 블록은 문법적으로 괜찮다. 다만 한 가지는 꼭 확인해야 한다. 이 코드에서 datetime.now()를 쓰고 있으니, from datetime import datetime는 파일 맨 위 import 구역에 있어야 한다. 이 import가 함수들 사이, 특히 @app.route(...) 바로 아래에 들어가 있으면 지금 같은 SyntaxError가 난다.

정리하면 이렇게 하면 된다.

잘못된 형태:

@app.route("/api/payment_summary")
def api_payment_summary():
    ...

@app.route("/api/works")
from datetime import datetime

def safe_parse_task_items(row):
    ...
올바른 형태:

from datetime import datetime
import json
from flask import Flask, request, jsonify
그리고 아래쪽은 그냥:

@app.route("/api/works", methods=["POST"])
def api_add_work():
    ...
추가로, 지금 네가 보여준 3개 라우트에서는 datetime.now()와 json.dumps(...)를 쓰고 있으니 파일 상단에 최소한 이것들은 있어야 한다.

from datetime import datetime
import json
from flask import request, jsonify
가장 가능성 높은 원인은 둘 중 하나다.

파일 중간 어딘가에 from datetime import datetime가 남아 있다.

@app.route(...) 한 줄이 따로 남아 있고, 그 아래에 함수 대신 import가 와 있다.

다음으로 할 일은 간단하다.

cloud_server.py에서 from datetime import datetime를 전부 검색

파일 맨 위 import 구역 1곳만 남기고 나머지는 삭제

@app.route(를 검색해서 모든 데코레이터 바로 아래 줄이 def ...인지 확인

커밋 후 재배포

이제 거의 마지막 단계다. api_payment_summary() 끝나는 줄부터 그 아래 20줄, 그리고 파일 맨 위 import 구역만 보여주면 문제 줄을 정확히 집어줄 수 있다.


업로드한 이미지

이번엔 서버가 죽은 게 아니라, 요청 방식이 틀려서 405가 나온 것이야.

오류창 내용 그대로 해석하면:

405 Method Not Allowed

해당 URL은 존재함

그런데 그 URL이 허용하는 HTTP 메서드가 아님

즉 GET으로 보냈는데 POST만 받는다거나, POST로 보냈는데 GET만 받는다는 뜻이야

지금 네가 보여준 라우트는 이거였지:

@app.route("/api/works", methods=["POST"])
def api_add_work():
이 라우트는 POST만 허용해.
그래서 브라우저 주소창으로 직접 열거나, 테스트를 GET으로 보내면 405가 난다.

같은 식으로:

@app.route("/api/works/<int:no>", methods=["PUT"])
@app.route("/api/works/<int:no>", methods=["DELETE"])
이 둘도 각각 PUT, DELETE만 허용이야.
브라우저에서 그냥 열면 기본이 GET이라 역시 405가 난다.

지금 의미하는 것
오히려 좋은 신호야.

이전에는:

문법 오류 때문에 서버 자체가 안 떠서 502

지금은:

서버는 정상 실행됨

해당 경로도 살아 있음

다만 요청 방식만 안 맞음

즉 문법 오류는 거의 해결된 상태로 봐도 된다.

왜 이런 오류가 났을까
가장 가능성 큰 경우는 둘 중 하나야.

1. 브라우저에서 직접 주소 열었음
예:

https://네주소/api/works
브라우저는 기본 GET 요청을 보내니까
methods=["POST"] 라우트에서는 405가 뜬다.

2. migrate_to_cloud.py나 클라이언트에서 메서드를 잘못 보냄
예를 들어 /api/migrate는 POST여야 하는데 GET으로 호출하면 405가 난다.

바로 확인할 것
/api/works
이건 조회용이 아니라 등록용 POST API야.

정상 호출 예:

requests.post(url, json=data)
비정상 호출 예:

requests.get(url)
/api/works/<int:no>
수정은 PUT

삭제는 DELETE

정상:

requests.put(url, json=data)
requests.delete(url)
비정상:

requests.get(url)
requests.post(url)
만약 조회도 필요하면
현재 네 라우트에는 GET /api/works가 없어 보인다.
그래서 목록 조회를 하려면 별도 GET 라우트를 추가해야 해.

예:

@app.route("/api/works", methods=["GET"])
def api_get_works():
    conn = db_conn()
    cur = conn.cursor()
    cur.execute('SELECT * FROM "작업일지" ORDER BY "번호" DESC')
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(rows)
그러면:

GET /api/works → 목록 조회

POST /api/works → 새 작업 등록

이렇게 같이 쓸 수 있어.

네가 지금 해야 할 것
먼저 네가 405를 본 상황이 뭔지 구분하면 된다.

브라우저에서 주소 직접 열어본 거면
정상 반응이야. 이상 아님.

프로그램에서 호출한 거면
그 코드에서 GET으로 보내는지 확인해야 해.

예를 들어 마이그레이션이면 이런 식이어야 해:

resp = requests.post(
    f"{base_url}/api/migrate",
    json=payload,
    timeout=180
)
핵심 정리
지금 상태는:

502 → 서버 죽음

405 → 서버 살아 있음, 메서드만 틀림

즉 한 단계 진전된 상태야.

다음으로
405가 뜬 정확한 URL과
그걸 호출한 코드 한 줄
붙여주면, GET/POST/PUT/DELETE 중 뭐가 잘못됐는지 바로 짚어줄게.



붙여넣은 텍스트 (1).txt
문서
확인하고 오류난곳을 수정해줄수 있어?


생각함
응. 확인해보니 405 오류가 날 만한 지점이 분명히 있어.

핵심은 현재 cloud_server.py에 /api/works가 POST만 있고 GET이 없다는 점이야. 그래서 브라우저나 클라이언트가 GET /api/works로 호출하면 405 Method Not Allowed가 난다. 네 파일에 실제로 /api/works는 methods=["POST"]만 정의되어 있고, PUT/DELETE도 개별 번호 경로에만 있다. 


또 한 가지, 네가 처음 겪었던 부팅 오류 원인이었던 from datetime import datetime 문제는 현재 파일에서는 위쪽에 from datetime import date, datetime, timedelta가 이미 있는데 바로 다음 줄에 from datetime import datetime가 중복으로 한 번 더 들어가 있다. 이건 지금 당장 405의 원인은 아니지만 정리하는 게 맞다. 


아래처럼 고치면 된다.

1) 중복 import 정리
맨 위 import를 이렇게 바꿔.

import json
import os
from datetime import date, datetime, timedelta

from flask import Flask, jsonify, render_template_string, request
import psycopg
from psycopg.rows import dict_row
즉 이 줄은 삭제:

from datetime import datetime
2) /api/works GET 추가
지금 네 파일에는 작업 조회용 GET이 없어서 405가 난다.
아래 코드를 build_save_payload() 위나 아래 아무 데나, POST /api/works 전에 넣어.

@app.route("/api/works", methods=["GET"])
def api_get_works():
    conn = db_conn()
    cur = conn.cursor()

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
이걸 넣으면:

GET /api/works → 작업 목록 조회

POST /api/works → 작업 등록

둘 다 정상 동작하게 된다.

3) 삭제 시 재고 복구도 같이 하는 게 좋음
지금 DELETE /api/works/<int:no>는 작업일지만 지우고 자재 재고는 복구하지 않는다. 파일상 현재 코드는 단순 삭제만 하고 있다. 


이건 데이터 맞춤성 문제라서 같이 고치는 걸 권장해.

@app.route("/api/works/<int:no>", methods=["DELETE"])
def api_delete_work(no):
    conn = db_conn()
    cur = conn.cursor()

    cur.execute('SELECT * FROM "작업일지" WHERE "번호"=%s', (no,))
    old = cur.fetchone()
    if not old:
        cur.close()
        conn.close()
        return jsonify({"ok": False}), 404

    old = dict(old)
    old_mat = aggregate_materials(parse_or_synthesize_task_items(old))

    for name, info in old_mat.items():
        cur.execute(
            'UPDATE "자재" SET "재고" = COALESCE("재고",0) + %s WHERE "자재명"=%s',
            (info["qty"], name)
        )

    cur.execute('DELETE FROM "작업일지" WHERE "번호"=%s', (no,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"ok": True})
4) 카드결제 오타도 수정 권장
build_save_payload() 안에 이 부분:

card_total = sum(parse_float_safe(x.get("amount", 0), 0) for x in payment_rows if x.get("method") == "카드결재")
여기 "카드결재"는 오타 가능성이 크다. 다른 곳은 "카드결제액"으로 되어 있어서, 실제 프론트 값이 "카드결제"면 카드 금액이 합산 안 될 수 있다. 파일상 이 불일치가 보인다. 


수정:

card_total = sum(
    parse_float_safe(x.get("amount", 0), 0)
    for x in payment_rows
    if x.get("method") == "카드결제"
)
프론트가 "카드결재"를 쓰고 있으면 프론트도 같이 맞춰야 한다.

5) 405가 계속 나면 확인할 것
만약 네 프로그램이 /api/works를 목록 조회용으로 부르고 있었다면, 지금까지는 무조건 405가 났을 거야. 이유는 서버에 GET 라우트가 없었기 때문이야. 네 파일 구조상 그 점은 명확하다. 


바로 적용할 수정본 요약
추가
@app.route("/api/works", methods=["GET"])
def api_get_works():
    conn = db_conn()
    cur = conn.cursor()
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
삭제
from datetime import datetime
수정
if x.get("method") == "카드결제"
원하면 내가 지금 네 파일 기준으로 붙여넣기용 전체 수정 블록만 깔끔하게 다시 정리해줄게.


업로드한 이미지


30s 동안 생각함
확인해봤고, 지금 코드에서 실제로 수정해야 할 곳은 3군데야.

첫째, 프런트는 loadWorks()에서 GET /api/works?q=...로 조회하고 있는데, 서버에는 POST /api/works만 있고 GET /api/works가 없다. 그래서 아까 405가 났던 원인이 이거다. 프런트 코드에서 fetch('/api/works?q='+encodeURIComponent(q))를 호출하는 게 보이고, 서버 쪽에는 @app.route("/api/works", methods=["POST"])만 있다. 

 


둘째, 현재 업로드된 cloud_server.py에는 from datetime import date, datetime, timedelta 다음 줄에 from datetime import datetime가 한 번 더 중복돼 있다. 이건 당장 502의 직접 원인은 아닐 수 있지만 지워야 한다. 


셋째, 네가 처음 올린 Railway 로그에서는 cloud_server.py 356줄의 from datetime import datetime 때문에 SyntaxError로 worker 부팅이 실패했다고 찍혀 있다. 즉 현재 뜨는 502가 최신 배포 기준인지, 예전 깨진 파일이 아직 배포된 건지도 함께 확인해야 한다. 로그에는 Worker failed to boot와 SyntaxError: invalid syntax가 명확히 남아 있다.

수정은 아래처럼 하면 된다.

1) 맨 위 import 정리
이 부분을:

import json
import os
from datetime import date, datetime, timedelta
from datetime import datetime
이렇게 바꿔:

import json
import os
from datetime import date, datetime, timedelta
2) GET /api/works 추가
build_save_payload() 위나 아래 아무 곳에 아래 코드를 넣어. POST /api/works보다 앞에 두는 편이 보기 좋다.

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
이걸 넣으면 프런트의 loadWorks()가 호출하는 GET /api/works?q=...와 서버가 맞물린다. 지금 프런트가 실제로 그 요청을 보내고 있는 건 코드에서 확인된다. 


3) 삭제 시 재고 복구
이건 502와 직접 관련은 없지만, 지금 DELETE /api/works/<int:no>는 작업일지만 지우고 자재 재고를 되돌리지 않는다. 현재 코드가 단순 DELETE FROM "작업일지"만 수행하는 것도 확인된다. 


이렇게 바꾸는 게 맞다.

@app.route("/api/works/<int:no>", methods=["DELETE"])
def api_delete_work(no):
    conn = db_conn()
    cur = conn.cursor()

    cur.execute('SELECT * FROM "작업일지" WHERE "번호"=%s', (no,))
    old = cur.fetchone()
    if not old:
        cur.close()
        conn.close()
        return jsonify({"ok": False}), 404

    old = dict(old)
    old_mat = aggregate_materials(parse_or_synthesize_task_items(old))

    for name, info in old_mat.items():
        cur.execute(
            'UPDATE "자재" SET "재고" = COALESCE("재고",0) + %s WHERE "자재명"=%s',
            (info["qty"], name)
        )

    cur.execute('DELETE FROM "작업일지" WHERE "번호"=%s', (no,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"ok": True})
4) 카드결제 문자열 통일
build_save_payload() 안에서 카드 합계 계산 조건이 "카드결재"로 되어 있다. 화면 쪽도 카드결재라고 보이긴 하지만, DB 컬럼은 "카드결제액"이고 일반적으로도 "카드결제"가 맞다. 현재 화면 HTML에도 카드결재가 보인다. 


서버와 프런트 둘 다 한쪽으로 통일하는 게 좋다.

지금 502에 대해 결론만 말하면 이거야.

현재 업로드된 최신 코드 기준으로는 가장 먼저 405 원인을 해결해야 했고, 그건 GET /api/works 추가로 해결된다.

502는 예전 깨진 버전이 아직 Railway에 배포돼 있거나, 새 배포 후 다른 런타임 예외가 난 경우다. 예전 로그에는 분명히 SyntaxError 때문에 worker가 부팅 실패했다.

지금 순서는 이렇게 하면 된다.

중복 from datetime import datetime 삭제

GET /api/works 추가

git push

Railway 재배포

Railway 로그에서 더 이상 SyntaxError가 없는지 확인

/api/works 열었을 때 405 대신 JSON 목록이 오는지 확인

원하면 내가 네 파일 기준으로 교체용 전체 블록만 딱 복붙 가능하게 정리해줄게.



붙여넣은 텍스트 (1).txt
문서
변경하라고 한건 다 변경한거 같은데


16s 동안 생각함
응. 지금 올린 최신 코드 다시 확인해보니 아직 치명적인 오류가 1개 남아 있어.
이게 502의 가장 유력한 원인이야.

가장 큰 문제
api_delete_work가 두 번 정의되어 있어.
한 번은 재고 복구까지 하는 버전이고, 아래에 다시 예전 단순 삭제 버전이 또 있다. 같은 이름의 Flask view 함수를 다시 등록하면 앱 시작 시 충돌해서 서버가 죽을 수 있다. 최신 파일에 이 중복이 그대로 보인다. 

 


즉 지금 파일에는 둘 다 있음:

@app.route("/api/works/<int:no>", methods=["DELETE"])
def api_delete_work(no):
    # 재고 복구 포함 버전
그리고 아래쪽에 또:

@app.route("/api/works/<int:no>", methods=["DELETE"])
def api_delete_work(no):
    # 단순 삭제 버전
이건 하나를 반드시 삭제해야 해.

남겨야 하는 버전
아래 단순 삭제 버전을 지우고,
재고 복구하는 첫 번째 버전만 남겨야 해. 최신 파일상 재고 복구 버전이 이미 들어가 있으니 그걸 살리면 된다. 


삭제할 블록
@app.route("/api/works/<int:no>", methods=["DELETE"])
def api_delete_work(no):
    conn = db_conn(); cur = conn.cursor()
    cur.execute('DELETE FROM "작업일지" WHERE "번호"=%s', (no,))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})
또 하나 남은 불일치
프런트는 아직 "카드결재"를 쓰고 있는데, 서버는 "카드결제"로 바꿔놨어.
그래서 카드 결제 합계가 안 맞을 수 있다. 프런트 코드에 카드결재가 그대로 남아 있는 게 확인된다.

즉 지금 상태는:

서버: "카드결제" 비교

화면/JS: "카드결재" 사용

이건 502의 직접 원인은 아니지만, 카드 금액 계산 오류는 생긴다.

프런트에서 같이 바꿔야 할 부분
아래 문자열들을 전부 "카드결제"로 통일:

method==='카드결재'
rows.filter(x=>x.method==='카드결재')
<div>카드결재</div>
정리
지금 네 최신 코드에서 바로 고칠 건 2개야.

1. 중복 api_delete_work 삭제
재고 복구 없는 아래쪽 DELETE 함수 삭제.

2. 카드결재 / 카드결제 문자열 통일
프런트도 "카드결제"로 맞추기.

지금 해야 할 순서
아래쪽 중복 api_delete_work 삭제

프런트의 카드결재를 카드결제로 일괄 변경

저장

git add / commit / push

Railway 재배포

Railway 로그에서 새 에러 확인

원하면 내가 지금 네 파일 기준으로 삭제해야 할 부분 / 바꿔야 할 문자열만 딱 복붙용으로 정리해줄게.


업로드한 이미지
삭제버튼을 누르니 이런 메세지가 나오네


38s 동안 생각함
삭제 버튼에서 500이 뜨는 걸 보면, 지금은 DELETE 요청은 맞게 들어가는데 서버 내부에서 예외가 난 상태야.

그리고 최신으로 올린 파일을 다시 보면, 아직도 api_delete_work가 두 번 들어가 있어. 위에는 재고 복구 버전이 있고, 아래에는 예전 단순 삭제 버전이 또 있다. 이 중복은 그대로 두면 매우 위험하고, 배포된 코드와 업로드한 파일이 어긋나 있으면 문제 추적도 더 어려워진다. 


가장 먼저 이 두 가지를 해야 해.

1. 아래쪽 중복 DELETE 함수는 반드시 지워
이 블록을 통째로 삭제해.

@app.route("/api/works/<int:no>", methods=["DELETE"])
def api_delete_work(no):
    conn = db_conn(); cur = conn.cursor()
    cur.execute('DELETE FROM "작업일지" WHERE "번호"=%s', (no,))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})
이 중복은 최신 파일에 아직 남아 있다. 


2. 남길 DELETE 함수는 예외 로그가 나오게 바꿔
지금은 500이 나도 왜 죽는지 사용자 화면에서는 안 보여.
아래 코드로 교체해.

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
        old_mat = aggregate_materials(parse_or_synthesize_task_items(old))

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
        app.logger.exception("api_delete_work failed")
        return jsonify({"ok": False, "error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
이렇게 바꾸면:

Railway 로그에 실제 에러가 남고

클라이언트에도 "error": "...내용..."이 내려와서 원인 파악이 훨씬 쉬워진다.

왜 이걸 먼저 해야 하냐
현재 코드만 보면 삭제 로직 자체는 크게 복잡하지 않지만, 실제로는

특정 레코드의 "작업목록" 값이 예상 형식이 아니거나

재고 복구 중 DB 예외가 나거나

배포된 코드와 현재 편집한 코드가 달라서 다른 DELETE가 실행될 수 있어

이런 경우를 화면만 보고는 구분할 수 없어.
그래서 중복 제거 + try/except 로그화가 우선이다.

추가로 확인된 점
최신 파일에는 프런트 쪽에 아직 "카드결재" 문자열이 남아 있다. 서버 쪽은 "카드결제"로 바뀐 부분이 있어서 결제 합계가 어긋날 수 있다. 이건 삭제 500의 직접 원인은 아니지만 같이 정리하는 게 좋다.

바로 할 순서
아래쪽 중복 api_delete_work 삭제

남은 DELETE 함수를 위 코드로 교체

저장 후 push

Railway 재배포

다시 삭제 버튼 클릭

이번엔 오류창이나 Railway 로그에 실제 에러 문구 확인

삭제 후에도 500이 나오면, 그때는 이제 진짜 원인 문구가 보일 거야. 그 문구만 붙여주면 바로 다음 수정 지점을 짚을 수 있어.



붙여넣은 텍스트 (1).txt
문서
중복된게 없는데?


생각함
맞아. 최신 파일 기준으로는 api_delete_work 중복은 없어.
내가 이전 파일 기준으로 본 내용을 최신본에 그대로 적용해서 잘못 짚었어. 지금 올린 코드에는 DELETE /api/works/<int:no>가 한 번만 있다. 


지금 상태에서 삭제 버튼 500은 중복 문제가 아니라 삭제 함수 내부 런타임 예외로 보는 게 맞아. 최신 코드의 삭제 함수는 아래 흐름이야. 


"작업일지"에서 해당 번호 조회

parse_or_synthesize_task_items(old)로 작업목록 해석

aggregate_materials(...)로 자재 집계

"자재" 재고 복구 UPDATE

"작업일지" DELETE

즉 지금 필요한 건 정확한 예외 메시지 확인이야.
현재 함수는 예외를 잡지 않아서 화면에는 그냥 500만 보이고, 왜 죽는지 안 드러나고 있어. 


아래처럼 삭제 함수만 교체해봐.

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
        old_mat = aggregate_materials(parse_or_synthesize_task_items(old))

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
        app.logger.exception("api_delete_work failed")
        return jsonify({"ok": False, "error": str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
이렇게 바꾸면 다음 삭제 시:

Railway 로그에 실제 에러가 찍히고

클라이언트에도 error 메시지가 내려와서

정확히 어디서 죽는지 바로 알 수 있어

지금 최신 파일에서 바로 보이는 구조상 문제는 이것도 하나 있어.
safe_parse_task_items()는 만들어놨는데 삭제 함수에서는 안 쓰고, parse_or_synthesize_task_items()를 쓰고 있어. 만약 어떤 기존 레코드의 "작업목록" 형식이 깨져 있으면 여기서 예외가 날 가능성이 있다. 최신 파일상 safe_parse_task_items()는 존재하지만 실제 DELETE에는 연결돼 있지 않다. 


그래서 더 안전하게 하려면 이 줄:

old_mat = aggregate_materials(parse_or_synthesize_task_items(old))
을 이렇게 바꿔도 돼.

old_mat = aggregate_materials(safe_parse_task_items(old))
    p = build_save_payload(data, cur)
    for name in set(old_mat.keys()) | set(p["mat_agg"].keys()):
        delta = p["mat_agg"].get(name, {}).get("qty", 0) - old_mat.get(name, {}).get("qty", 0)
        if abs(delta) > 0:
            cur.execute('UPDATE "자재" SET "재고" = COALESCE("재고",0) - %s WHERE "자재명"=%s', (delta, name))
    cur.execute('UPDATE "작업일지" SET "날짜"=%s,"종료날짜"=%s,"날씨"=%s,"작물"=%s,"작업내용"=%s,"인건비"=%s,"시작시간"=%s,"종료시간"=%s,"작업시간"=%s,"사용기계"=%s,"사용자재"=%s,"적용병충해"=%s,"비고"=%s,"수정시각"=%s,"인력내역"=%s,"작업목록"=%s,"업체명"=%s,"자재비"=%s,"수리및보수비"=%s,"총금액"=%s,"현금결제액"=%s,"계좌이체액"=%s,"카드결제액"=%s,"결제정보"=%s,"시즌연도"=%s WHERE "번호"=%s', (p["rep_start"], p["rep_end"], data.get("날씨", ""), p["all_crops"], p["all_task_names"], int(p["wage_cost"]), p["task_list"][0].get("시작시간", ""), p["task_list"][-1].get("종료시간", ""), p["total_hours_text"], p["machines"], p["rep_mats"], p["all_pests"], data.get("note", ""), datetime.now().isoformat(timespec="seconds"), p["rep_wage_detail"], serialize_task_list(p["task_list"]), data.get("vendor", ""), p["material_cost"], p["repair_cost"], p["total_amount"], p["cash_total"], p["transfer_total"], p["card_total"], json.dumps(p["payment_rows"], ensure_ascii=False), p["season_year"], no))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})





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
</script>
</body>
</html>"""


@app.route("/")
def index():
    return render_template_string(HTML)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
