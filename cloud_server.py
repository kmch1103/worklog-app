# ===== 작업일지 클라우드 서버 =====
# Railway 무료 배포 + Supabase 무료 DB
# PC 꺼도 24시간 핸드폰에서 접속 가능

import os, json
from datetime import datetime, date, timedelta
from flask import Flask, request, jsonify, render_template_string
import psycopg


app = Flask(__name__)

# ── 환경변수에서 DB URL 읽기 (Railway에서 자동 설정) ──
DATABASE_URL = os.environ.get("DATABASE_URL", "")
SEASON_START_MONTH = 3
_TFS = "☆"
_TRS = "§"

def db_conn():
    """PostgreSQL 연결"""
    return psycopg.connect(DATABASE_URL)

# ── DB 초기화 (테이블 없으면 생성) ──
def init_db():
    conn = db_conn(); cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS 작업일지 (
            번호   SERIAL PRIMARY KEY,
            날짜   TEXT, 종료날짜 TEXT, 날씨 TEXT, 작물 TEXT,
            작업내용 TEXT, 인건비 INTEGER DEFAULT 0,
            남자수 INTEGER DEFAULT 0, 남자단가 INTEGER DEFAULT 0,
            여자수 INTEGER DEFAULT 0, 여자단가 INTEGER DEFAULT 0,
            기타수 INTEGER DEFAULT 0, 기타단가 INTEGER DEFAULT 0,
            시작시간 TEXT, 종료시간 TEXT, 작업시간 REAL DEFAULT 0,
            사용기계 TEXT, 사용자재 TEXT, 적용병충해 TEXT,
            비고 TEXT, 생성시각 TEXT, 수정시각 TEXT,
            인력내역 TEXT, 작업목록 TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS 자재 (
            자재명 TEXT PRIMARY KEY, 단위 TEXT, 가격 INTEGER DEFAULT 0, 재고 REAL DEFAULT 0
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS 병충해 (
            이름 TEXT PRIMARY KEY, 권장약제 TEXT, 증상 TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS 구입 (
            번호 SERIAL PRIMARY KEY, 날짜 TEXT, 자재명 TEXT, 단위 TEXT,
            가격 INTEGER DEFAULT 0, 수량 REAL DEFAULT 0, 총금액 INTEGER DEFAULT 0,
            비고 TEXT, 생성시각 TEXT
        )
    """)
    for tbl in ("옵션_날씨","옵션_작물","옵션_작업내용","옵션_기계","옵션_단위"):
        cur.execute(f"CREATE TABLE IF NOT EXISTS {tbl} (항목 TEXT PRIMARY KEY)")
    conn.commit(); cur.close(); conn.close()

# ── 헬퍼 ──
def parse_float_safe(s, default=0.0):
    try: return float(str(s).replace(",","").strip())
    except: return default

def parse_int_safe(s, default=0):
    try: return int(float(str(s).replace(",","").strip()))
    except: return default

def each_material(mats_text):
    out = []
    if not mats_text: return out
    for part in str(mats_text).split(";"):
        if not part.strip(): continue
        try:
            n, q, u = part.split("|")
            out.append({"name": n, "qty": parse_float_safe(q), "unit": u})
        except: pass
    return out

def compute_wage_from_detail(detail_str):
    if not detail_str: return 0
    total = 0
    for part in str(detail_str).split(";"):
        if not part.strip(): continue
        try:
            gender, cnt, pay, gubun = part.split("|")
            total += int(float(pay)) * int(float(cnt))
        except: pass
    return total

def parse_task_list(text):
    if not text or not text.strip(): return []
    result = []
    for rec in str(text).split(_TRS):
        rec = rec.strip()
        if not rec: continue
        p = rec.split(_TFS)
        while len(p) < 12: p.append("")
        result.append({
            "날짜":p[0],"종료날짜":p[1],"작물":p[2],"작업내용":p[3],
            "시작시간":p[4],"종료시간":p[5],"작업시간":p[6],"사용기계":p[7],
            "사용자재":p[8],"병충해":p[9],"인력내역":p[10],"비고":p[11],
        })
    return result

def serialize_task_list(task_list):
    recs = []
    for t in task_list:
        recs.append(_TFS.join([
            str(t.get("날짜","")), str(t.get("종료날짜","")), str(t.get("작물","")),
            str(t.get("작업내용","")), str(t.get("시작시간","")), str(t.get("종료시간","")),
            str(t.get("작업시간","")), str(t.get("사용기계","")), str(t.get("사용자재","")),
            str(t.get("병충해","")), str(t.get("인력내역","")), str(t.get("비고","")),
        ]))
    return _TRS.join(recs)

def row_to_dict(row):
    return dict(row) if row else {}

# ── API ──

@app.route("/api/works", methods=["GET"])
def api_get_works():
    q = request.args.get("q","").strip()
    limit = int(request.args.get("limit", 60))
    conn = db_conn(); cur = conn.cursor()
    if q:
        cur.execute("""
            SELECT 번호,날짜,종료날짜,날씨,작물,작업내용,인건비,작업시간,
                   사용기계,사용자재,적용병충해,비고,인력내역,시작시간,종료시간,
                   COALESCE(작업목록,'') as 작업목록
            FROM 작업일지
            WHERE 날짜 LIKE %s OR 작물 LIKE %s OR 작업내용 LIKE %s
            ORDER BY 날짜 DESC, 번호 DESC LIMIT %s
        """, (f"%{q}%", f"%{q}%", f"%{q}%", limit))
    else:
        cur.execute("""
            SELECT 번호,날짜,종료날짜,날씨,작물,작업내용,인건비,작업시간,
                   사용기계,사용자재,적용병충해,비고,인력내역,시작시간,종료시간,
                   COALESCE(작업목록,'') as 작업목록
            FROM 작업일지 ORDER BY 날짜 DESC, 번호 DESC LIMIT %s
        """, (limit,))
    rows = [row_to_dict(r) for r in cur.fetchall()]
    for r in rows:
        r["task_items"] = parse_task_list(r.get("작업목록",""))
        r["인건비_표시"] = f"{compute_wage_from_detail(r.get('인력내역','') or ''):,}원"
    cur.close(); conn.close()
    return jsonify(rows)

@app.route("/api/works", methods=["POST"])
def api_add_work():
    data = request.json
    task_list = data.get("task_items", [])
    task_list_str = serialize_task_list(task_list) if task_list else ""
    all_crops, all_task_names, dates, end_dates, all_wages = [], [], [], [], []
    mat_agg, all_pests = {}, []
    for t in task_list:
        for c in str(t.get("작물","")).split(","):
            if c.strip() and c.strip() not in all_crops: all_crops.append(c.strip())
        if t.get("작업내용"): all_task_names.append(t["작업내용"])
        try: dates.append(date.fromisoformat(t.get("날짜","")))
        except: pass
        try: end_dates.append(date.fromisoformat(t.get("종료날짜","") or t.get("날짜","")))
        except: pass
        for part in str(t.get("사용자재","")).split(";"):
            if not part.strip(): continue
            pp = part.split("|")
            if len(pp)==3:
                n,q,u = pp[0],parse_float_safe(pp[1]),pp[2]
                if n: mat_agg[n] = (mat_agg[n][0]+q,u) if n in mat_agg else (q,u)
        for p in str(t.get("병충해","")).split(","):
            if p.strip() and p.strip() not in all_pests: all_pests.append(p.strip())
        for part in str(t.get("인력내역","")).split(";"):
            if part.strip(): all_wages.append(part.strip())
    rep_start = min(dates).isoformat() if dates else date.today().isoformat()
    rep_end   = max(end_dates).isoformat() if end_dates else rep_start
    rep_mats  = ";".join(f"{n}|{q}|{u}" for n,(q,u) in mat_agg.items())
    rep_wage  = ";".join(all_wages)
    now_str   = datetime.now().isoformat(timespec="seconds")
    conn = db_conn(); cur = conn.cursor()
    cur.execute("""
        INSERT INTO 작업일지 (날짜,종료날짜,날씨,작물,작업내용,인건비,
            남자수,남자단가,여자수,여자단가,기타수,기타단가,
            시작시간,종료시간,작업시간,사용기계,
            사용자재,적용병충해,비고,생성시각,수정시각,인력내역,작업목록)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING 번호
    """, (
        rep_start, rep_end, data.get("날씨",""), ",".join(all_crops),
        ", ".join(all_task_names), compute_wage_from_detail(rep_wage),
        0,0,0,0,0,0,
        task_list[0].get("시작시간","") if task_list else "",
        task_list[-1].get("종료시간","") if task_list else "",
        sum(parse_float_safe(t.get("작업시간","0")) for t in task_list),
        ", ".join(dict.fromkeys(t.get("사용기계","") for t in task_list if t.get("사용기계"))),
        rep_mats, ",".join(all_pests), "", now_str, now_str, rep_wage, task_list_str
    ))
    new_id = cur.fetchone()["번호"]
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True, "번호": new_id})

@app.route("/api/works/<int:no>", methods=["DELETE"])
def api_delete_work(no):
    conn = db_conn(); cur = conn.cursor()
    cur.execute("DELETE FROM 작업일지 WHERE 번호=%s", (no,))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True})

@app.route("/api/calendar/<int:year>/<int:month>", methods=["GET"])
def api_calendar(year, month):
    import calendar as _cal
    month_start = date(year, month, 1)
    last_day = _cal.monthrange(year, month)[1]
    month_end = date(year, month, last_day)
    ms, me = month_start.isoformat(), month_end.isoformat()
    conn = db_conn(); cur = conn.cursor()
    cur.execute("""
        SELECT 번호,날짜,종료날짜,작물,작업내용,날씨,인건비,
               COALESCE(작업목록,'') as 작업목록
        FROM 작업일지
        WHERE 날짜 <= %s AND (종료날짜 >= %s OR (종료날짜 IS NULL AND 날짜 >= %s))
        ORDER BY 날짜, 번호
    """, (me, ms, ms))
    rows = cur.fetchall()
    cur.execute("""
        SELECT COALESCE(SUM(인건비),0) FROM 작업일지
        WHERE 날짜 <= %s AND (종료날짜 >= %s OR (종료날짜 IS NULL AND 날짜 >= %s))
    """, (me, ms, ms))
    wage_sum = cur.fetchone()["coalesce"] or 0
    cur.close(); conn.close()
    day_map = {}
    for row in rows:
        row = dict(row)
        row["task_items"] = parse_task_list(row.get("작업목록",""))
        try:
            sd = date.fromisoformat(row["날짜"])
            ed = date.fromisoformat(row["종료날짜"]) if row.get("종료날짜") else sd
        except: continue
        cur_d = max(sd, month_start)
        end_d = min(ed, month_end)
        while cur_d <= end_d:
            day_map.setdefault(str(cur_d.day), []).append(row)
            cur_d += timedelta(days=1)
    return jsonify({"year":year,"month":month,"days":last_day,"day_map":day_map,"stats":{"인건비":wage_sum}})

@app.route("/api/options", methods=["GET"])
def api_options():
    conn = db_conn(); cur = conn.cursor()
    opts = {}
    for tbl in ("옵션_날씨","옵션_작물","옵션_작업내용","옵션_기계"):
        try:
            cur.execute(f'SELECT 항목 FROM {tbl} ORDER BY 항목')
            opts[tbl] = [r["항목"] for r in cur.fetchall()]
        except: opts[tbl] = []
    if not opts["옵션_날씨"]:     opts["옵션_날씨"]    = ["맑음","흐림","비","기타"]
    if not opts["옵션_작물"]:     opts["옵션_작물"]    = ["한라봉","천혜향","유라조생","극조생"]
    if not opts["옵션_작업내용"]: opts["옵션_작업내용"] = ["방제작업","전정","비료주기","수확"]
    if not opts["옵션_기계"]:     opts["옵션_기계"]    = ["수동방제기","양수기","기타","사용안함"]
    cur.execute("SELECT 자재명,단위,가격,재고 FROM 자재 ORDER BY 자재명")
    opts["자재"] = [{"name":r["자재명"],"unit":r["단위"],"price":r["가격"],"stock":r["재고"]} for r in cur.fetchall()]
    cur.execute("SELECT 이름 FROM 병충해 ORDER BY 이름")
    opts["병충해"] = [r["이름"] for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify(opts)

@app.route("/api/stats", methods=["GET"])
def api_stats():
    today = date.today(); y, m = today.year, today.month
    import calendar as _cal
    ms = date(y,m,1).isoformat()
    me = date(y,m,_cal.monthrange(y,m)[1]).isoformat()
    if m >= SEASON_START_MONTH:
        ss = date(y, SEASON_START_MONTH, 1).isoformat()
        se = (date(y+1, SEASON_START_MONTH, 1)-timedelta(days=1)).isoformat()
    else:
        ss = date(y-1, SEASON_START_MONTH, 1).isoformat()
        se = (date(y, SEASON_START_MONTH, 1)-timedelta(days=1)).isoformat()
    conn = db_conn(); cur = conn.cursor()
    def calc(s, e):
        cur.execute("SELECT COALESCE(SUM(인건비),0), COUNT(*) FROM 작업일지 WHERE 날짜 BETWEEN %s AND %s", (s,e))
        r = cur.fetchone(); return {"인건비": r[0] or 0, "건수": r[1] or 0}
    month_stat = calc(ms, me); season_stat = calc(ss, se)
    cur.close(); conn.close()
    return jsonify({"당월":month_stat,"시즌":season_stat,"시즌기간":f"{ss[:7]} ~ {se[:7]}"})

@app.route("/api/migrate", methods=["POST"])
def api_migrate():
    """기존 SQLite 데이터를 PostgreSQL로 이전하는 엔드포인트"""
    data = request.json  # {"works":[...], "materials":[...], "pests":[...], "options":{...}}
    conn = db_conn(); cur = conn.cursor()
    inserted = 0
    for w in data.get("works", []):
        try:
            cur.execute("""
                INSERT INTO 작업일지 (날짜,종료날짜,날씨,작물,작업내용,인건비,
                    시작시간,종료시간,작업시간,사용기계,사용자재,적용병충해,
                    비고,생성시각,수정시각,인력내역,작업목록)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                w.get("날짜"), w.get("종료날짜"), w.get("날씨"), w.get("작물"),
                w.get("작업내용"), w.get("인건비",0),
                w.get("시작시간"), w.get("종료시간"), w.get("작업시간",0),
                w.get("사용기계"), w.get("사용자재"), w.get("적용병충해"),
                w.get("비고"), w.get("생성시각"), w.get("수정시각"),
                w.get("인력내역"), w.get("작업목록","")
            ))
            inserted += 1
        except Exception as e:
            print(f"migrate error: {e}")
    for m in data.get("materials", []):
        try:
            cur.execute("INSERT INTO 자재 (자재명,단위,가격,재고) VALUES (%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                        (m["자재명"],m["단위"],m["가격"],m["재고"]))
        except: pass
    for p in data.get("pests", []):
        try:
            cur.execute("INSERT INTO 병충해 (이름,권장약제,증상) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
                        (p["이름"],p.get("권장약제",""),p.get("증상","")))
        except: pass
    for tbl, items in data.get("options", {}).items():
        for item in items:
            try:
                cur.execute(f"INSERT INTO {tbl} (항목) VALUES (%s) ON CONFLICT DO NOTHING", (item,))
            except: pass
    conn.commit(); cur.close(); conn.close()
    return jsonify({"ok": True, "inserted": inserted})

# ── HTML (웹앱 - web_server.py와 동일) ──
# ── 웹앱 HTML (내장) ──
HTML = r"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>🌿 작업일지</title>
<style>
:root {
  --green: #2d6a4f; --green2: #40916c; --green3: #74c69d;
  --bg: #f0f7f4; --card: #ffffff; --text: #1b2e25;
  --gray: #6c757d; --border: #d8ead3; --accent: #e9f5e1;
  --red: #c62828; --blue: #1565c0; --orange: #e65100;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Noto Sans KR', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

/* 탭 바 */
.tab-bar { position: fixed; bottom: 0; left: 0; right: 0; background: var(--card);
           border-top: 1px solid var(--border); display: flex; z-index: 100;
           box-shadow: 0 -2px 10px rgba(0,0,0,.08); }
.tab-btn { flex: 1; padding: 10px 4px 8px; border: none; background: none; cursor: pointer;
           font-size: 11px; color: var(--gray); display: flex; flex-direction: column;
           align-items: center; gap: 3px; transition: color .2s; }
.tab-btn .ico { font-size: 22px; }
.tab-btn.active { color: var(--green2); }

/* 페이지 */
.page { display: none; padding: 16px 12px 80px; max-width: 600px; margin: 0 auto; }
.page.active { display: block; }

/* 헤더 */
.page-header { font-size: 20px; font-weight: 700; color: var(--green);
               margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }

/* 카드 */
.card { background: var(--card); border-radius: 14px; padding: 14px;
        margin-bottom: 10px; box-shadow: 0 1px 6px rgba(0,0,0,.07);
        border-left: 4px solid var(--green3); }
.card-date { font-size: 13px; color: var(--gray); margin-bottom: 4px; }
.card-title { font-size: 16px; font-weight: 700; color: var(--green); margin-bottom: 6px; }
.card-row { font-size: 13px; color: #444; margin: 2px 0; display: flex; gap: 6px; }
.card-row span { color: var(--gray); min-width: 44px; font-size: 12px; }
.tag { display: inline-block; background: var(--accent); color: var(--green2);
       border-radius: 20px; padding: 2px 9px; font-size: 11px; margin: 2px 2px 0 0; }
.tag.red { background: #fde8e8; color: var(--red); }
.tag.blue { background: #e3eaf8; color: var(--blue); }
.card-actions { display: flex; gap: 8px; margin-top: 10px; }
.btn-del { background: #fde8e8; color: var(--red); border: none; border-radius: 8px;
           padding: 6px 14px; font-size: 13px; cursor: pointer; }
.btn-del:active { opacity: .7; }

/* 달력 */
.cal-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.cal-nav button { background: var(--accent); border: none; border-radius: 8px; padding: 7px 14px;
                  font-size: 18px; cursor: pointer; color: var(--green); }
.cal-title { font-size: 18px; font-weight: 700; color: var(--green); }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.cal-head { text-align: center; font-size: 11px; color: var(--gray); padding: 4px 0; font-weight: 600; }
.cal-head:first-child { color: var(--red); }
.cal-head:last-child  { color: var(--blue); }
.cal-day { min-height: 60px; background: var(--card); border-radius: 8px; padding: 4px;
           cursor: pointer; transition: background .15s; position: relative; }
.cal-day:active { background: var(--accent); }
.cal-day.today { background: #e8f5e9; border: 2px solid var(--green3); }
.cal-day.empty { background: none; }
.cal-day .dn { font-size: 12px; font-weight: 600; text-align: right; }
.cal-day .dn.sun { color: var(--red); }
.cal-day .dn.sat { color: var(--blue); }
.cal-dot { width: 6px; height: 6px; background: var(--green2); border-radius: 50%;
           display: inline-block; margin: 1px; }
.cal-event { font-size: 9px; background: var(--green3); color: #fff; border-radius: 3px;
             padding: 1px 3px; margin-top: 1px; white-space: nowrap; overflow: hidden; }
.stats-bar { display: flex; gap: 8px; margin-bottom: 12px; }
.stat-box { flex: 1; background: var(--card); border-radius: 12px; padding: 12px;
            text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.07); }
.stat-box .sv { font-size: 16px; font-weight: 700; color: var(--green); }
.stat-box .sl { font-size: 11px; color: var(--gray); margin-top: 2px; }

/* 입력 폼 */
.form-section { background: var(--card); border-radius: 14px; padding: 16px;
                margin-bottom: 12px; box-shadow: 0 1px 6px rgba(0,0,0,.07); }
.form-section h3 { font-size: 14px; font-weight: 700; color: var(--green2); margin-bottom: 12px;
                   padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.form-row { margin-bottom: 12px; }
.form-row label { display: block; font-size: 12px; color: var(--gray); margin-bottom: 4px; font-weight: 600; }
.form-row input, .form-row select, .form-row textarea {
  width: 100%; border: 1.5px solid var(--border); border-radius: 9px; padding: 10px 12px;
  font-size: 14px; background: var(--bg); color: var(--text); outline: none; }
.form-row input:focus, .form-row select:focus { border-color: var(--green3); background: #fff; }
.form-row textarea { resize: vertical; min-height: 60px; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.chip-group { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.chip { background: var(--accent); border: 1.5px solid var(--border); border-radius: 20px;
        padding: 5px 13px; font-size: 13px; cursor: pointer; transition: all .15s; color: var(--text); }
.chip.selected { background: var(--green2); color: #fff; border-color: var(--green2); }

/* 작업 항목 */
.task-item { background: var(--accent); border-radius: 10px; padding: 12px;
             margin-bottom: 8px; border-left: 3px solid var(--green2); }
.task-item-head { display: flex; justify-content: space-between; align-items: center; }
.task-item-title { font-size: 14px; font-weight: 700; color: var(--green); }
.task-item-del { background: none; border: none; color: var(--red); font-size: 18px; cursor: pointer; }
.task-item-info { font-size: 12px; color: #555; margin-top: 4px; }

/* 버튼 */
.btn { width: 100%; padding: 14px; border: none; border-radius: 12px; font-size: 16px;
       font-weight: 700; cursor: pointer; margin-top: 8px; transition: opacity .15s; }
.btn:active { opacity: .8; }
.btn-primary { background: var(--green2); color: #fff; }
.btn-secondary { background: var(--accent); color: var(--green); border: 1.5px solid var(--border); }
.btn-add-task { background: var(--accent); color: var(--green2); border: 2px dashed var(--green3);
                border-radius: 10px; padding: 10px; font-size: 14px; cursor: pointer;
                width: 100%; margin-bottom: 8px; }

/* 모달 */
.modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 200;
            display: none; align-items: flex-end; }
.modal-bg.open { display: flex; }
.modal { background: var(--card); border-radius: 20px 20px 0 0; width: 100%;
         max-height: 90vh; overflow-y: auto; padding: 20px 16px 40px; }
.modal-handle { width: 40px; height: 4px; background: var(--border); border-radius: 2px;
                margin: 0 auto 16px; }
.modal-title { font-size: 17px; font-weight: 700; color: var(--green); margin-bottom: 16px; }

/* 검색 */
.search-box { display: flex; gap: 8px; margin-bottom: 14px; }
.search-box input { flex: 1; border: 1.5px solid var(--border); border-radius: 10px;
                    padding: 10px 14px; font-size: 14px; background: var(--card); outline: none; }
.search-box button { background: var(--green2); color: #fff; border: none; border-radius: 10px;
                     padding: 10px 16px; font-size: 14px; cursor: pointer; }

/* 로딩/빈 상태 */
.loading { text-align: center; padding: 40px; color: var(--gray); font-size: 14px; }
.empty { text-align: center; padding: 50px 20px; color: var(--gray); }
.empty .ei { font-size: 48px; margin-bottom: 12px; }

/* FAB */
.fab { position: fixed; bottom: 80px; right: 20px; width: 56px; height: 56px;
       background: var(--green2); color: #fff; border: none; border-radius: 50%;
       font-size: 28px; cursor: pointer; box-shadow: 0 4px 14px rgba(45,106,79,.4);
       z-index: 99; display: flex; align-items: center; justify-content: center;
       transition: transform .15s; }
.fab:active { transform: scale(.93); }
</style>
</head>
<body>

<!-- ── 작업일지 탭 ── -->
<div class="page active" id="page-works">
  <div class="page-header">📋 작업일지</div>
  <div class="search-box">
    <input id="search-input" type="text" placeholder="날짜·작물·작업내용 검색...">
    <button onclick="loadWorks()">검색</button>
  </div>
  <div id="works-list"><div class="loading">불러오는 중...</div></div>
</div>

<!-- ── 달력 탭 ── -->
<div class="page" id="page-calendar">
  <div class="page-header">📅 작업달력</div>
  <div class="stats-bar" id="stats-bar">
    <div class="stat-box"><div class="sv" id="stat-month-wage">-</div><div class="sl">당월 인건비</div></div>
    <div class="stat-box"><div class="sv" id="stat-season-wage">-</div><div class="sl">시즌 인건비</div></div>
    <div class="stat-box"><div class="sv" id="stat-month-cnt">-</div><div class="sl">당월 건수</div></div>
  </div>
  <div class="cal-nav">
    <button onclick="calMove(-1)">‹</button>
    <div class="cal-title" id="cal-title"></div>
    <button onclick="calMove(1)">›</button>
  </div>
  <div class="cal-grid" id="cal-grid"></div>
</div>

<!-- ── 추가 탭 ── -->
<div class="page" id="page-add">
  <div class="page-header">✏️ 작업 입력</div>

  <div class="form-section">
    <h3>🌤 기본 정보</h3>
    <div class="form-row">
      <label>날씨</label>
      <select id="f-weather"></select>
    </div>
  </div>

  <!-- 작업 목록 -->
  <div class="form-section">
    <h3>🌿 작업 목록</h3>
    <div id="task-items-container"></div>
    <button class="btn-add-task" onclick="openTaskModal()">➕ 작업 추가</button>
  </div>

  <button class="btn btn-primary" onclick="submitWork()">💾 저장</button>
  <button class="btn btn-secondary" onclick="resetForm()" style="margin-top:6px">↺ 초기화</button>
</div>

<!-- ── 탭 바 ── -->
<div class="tab-bar">
  <button class="tab-btn active" onclick="showTab('works')" id="tab-works">
    <span class="ico">📋</span>작업일지
  </button>
  <button class="tab-btn" onclick="showTab('calendar')" id="tab-calendar">
    <span class="ico">📅</span>달력
  </button>
  <button class="tab-btn" onclick="showTab('add')" id="tab-add">
    <span class="ico">✏️</span>작업입력
  </button>
</div>

<!-- ── 작업 입력 모달 ── -->
<div class="modal-bg" id="task-modal">
<div class="modal">
  <div class="modal-handle"></div>
  <div class="modal-title">작업 추가</div>

  <div class="form-row">
    <label>작업시작일</label>
    <input type="date" id="tm-date">
  </div>
  <div class="form-row row2">
    <div>
      <label>연속 일수</label>
      <input type="number" id="tm-days" value="1" min="1" oninput="calcEndDate()">
    </div>
    <div>
      <label>작업종료일</label>
      <input type="date" id="tm-end" readonly style="background:#f5f5f5;">
    </div>
  </div>

  <div class="form-row">
    <label>작물 (복수선택)</label>
    <div class="chip-group" id="tm-crops"></div>
  </div>

  <div class="form-row">
    <label>작업내용</label>
    <select id="tm-task"></select>
  </div>

  <div class="form-row row2">
    <div><label>시작시간</label><input type="time" id="tm-start"></div>
    <div><label>종료시간</label><input type="time" id="tm-end-time" oninput="calcWtime()"></div>
  </div>
  <div class="form-row row2">
    <div><label>작업시간(h)</label><input type="number" id="tm-wtime" step="0.5" placeholder="자동계산"></div>
    <div><label>사용기계</label><select id="tm-machine"></select></div>
  </div>

  <div class="form-row">
    <label>사용자재</label>
    <div id="tm-mats-chips" class="chip-group"></div>
    <div id="tm-selected-mats" style="margin-top:6px;"></div>
  </div>

  <div class="form-row">
    <label>병충해</label>
    <div class="chip-group" id="tm-pests"></div>
  </div>

  <div class="form-row">
    <label>인력 (성별/인원/단가)</label>
    <div id="tm-wages"></div>
    <button class="btn btn-secondary" style="padding:8px;font-size:13px;margin-top:6px;" onclick="addWage()">+ 인력 추가</button>
  </div>

  <div class="form-row">
    <label>비고</label>
    <textarea id="tm-note" rows="2" placeholder="메모..."></textarea>
  </div>

  <button class="btn btn-primary" onclick="confirmTask()">작업 추가</button>
  <button class="btn btn-secondary" style="margin-top:6px;" onclick="closeTaskModal()">취소</button>
</div>
</div>

<!-- ── 달력 상세 모달 ── -->
<div class="modal-bg" id="cal-modal">
<div class="modal">
  <div class="modal-handle"></div>
  <div class="modal-title" id="cal-modal-title"></div>
  <div id="cal-modal-body"></div>
  <button class="btn btn-secondary" style="margin-top:12px;" onclick="document.getElementById('cal-modal').classList.remove('open')">닫기</button>
</div>
</div>

<script>
// ── 상태 ──
let OPTIONS = {};
let TASKS   = [];        // 추가 중인 작업 목록
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth() + 1;
let selectedMats = {}; // taskIdx -> [{name,qty,unit}]

// ── 탭 전환 ──
function showTab(t) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-'+t).classList.add('active');
  document.getElementById('tab-'+t).classList.add('active');
  if (t==='works') loadWorks();
  if (t==='calendar') { loadStats(); loadCalendar(); }
}

// ── 옵션 로드 ──
async function loadOptions() {
  const r = await fetch('/api/options');
  OPTIONS = await r.json();
  // 날씨
  const wSel = document.getElementById('f-weather');
  wSel.innerHTML = OPTIONS['옵션_날씨'].map(v=>`<option>${v}</option>`).join('');
  // 작업내용
  const tSel = document.getElementById('tm-task');
  tSel.innerHTML = OPTIONS['옵션_작업내용'].map(v=>`<option>${v}</option>`).join('');
  // 기계
  const mSel = document.getElementById('tm-machine');
  mSel.innerHTML = OPTIONS['옵션_기계'].map(v=>`<option>${v}</option>`).join('');
  // 작물 칩
  document.getElementById('tm-crops').innerHTML =
    OPTIONS['옵션_작물'].map(v=>`<span class="chip" onclick="toggleChip(this)">${v}</span>`).join('');
  // 자재 칩
  document.getElementById('tm-mats-chips').innerHTML =
    (OPTIONS['자재']||[]).map(m=>`<span class="chip" onclick="addMat('${m.name}','${m.unit}')">${m.name}(${m.unit})</span>`).join('');
  // 병충해 칩
  document.getElementById('tm-pests').innerHTML =
    (OPTIONS['병충해']||[]).map(p=>`<span class="chip" onclick="toggleChip(this)">${p}</span>`).join('');
}

// ── 작업일지 목록 ──
async function loadWorks() {
  const q = document.getElementById('search-input').value.trim();
  const r = await fetch(`/api/works?q=${encodeURIComponent(q)}&limit=80`);
  const data = await r.json();
  const el = document.getElementById('works-list');
  if (!data.length) {
    el.innerHTML = '<div class="empty"><div class="ei">📋</div>작업 내역이 없습니다.</div>'; return;
  }
  el.innerHTML = data.map(w => {
    const items = w.task_items || [];
    let body = '';
    if (items.length) {
      body = items.map(t => `
        <div class="task-item" style="margin:4px 0;padding:8px;border-radius:8px;background:#f0f7f4;font-size:12px;">
          <b style="color:var(--green)">${t.작업내용||''}</b>
          ${t.작물 ? `<span class="tag">${t.작물}</span>` : ''}
          ${t.날짜 ? `<div style="color:#888;margin-top:2px;">📅 ${t.날짜}${t.종료날짜&&t.종료날짜!==t.날짜?' ~ '+t.종료날짜:''}</div>` : ''}
          ${t.시작시간||t.종료시간 ? `<div style="color:#888;">⏰ ${t.시작시간} ~ ${t.종료시간} (${t.작업시간}h)</div>` : ''}
          ${t.사용기계 ? `<div style="color:#888;">🔧 ${t.사용기계}</div>` : ''}
          ${t.사용자재 ? `<div style="color:var(--green2);">🪣 ${t.사용자재.split(';').filter(Boolean).map(p=>p.split('|')[0]).join(', ')}</div>` : ''}
          ${t.병충해 ? `<div style="color:var(--red);">🦟 ${t.병충해}</div>` : ''}
          ${t.인력내역 ? `<div style="color:var(--blue);">👷 ${formatWage(t.인력내역)}</div>` : ''}
        </div>`).join('');
    } else {
      body = `
        <div class="card-row"><span>작물</span>${w.작물||'-'}</div>
        <div class="card-row"><span>시간</span>${w.시작시간||''} ~ ${w.종료시간||''}</div>
        <div class="card-row"><span>기계</span>${w.사용기계||'-'}</div>`;
    }
    const dateLabel = w.종료날짜&&w.종료날짜!==w.날짜 ? `${w.날짜} ~ ${w.종료날짜}` : (w.날짜||'');
    return `<div class="card">
      <div class="card-date">📅 ${dateLabel}  ☀️ ${w.날씨||''}</div>
      <div class="card-title">🧰 ${w.작업내용||items.map(t=>t.작업내용).join(' / ')}</div>
      ${body}
      ${w.인건비_표시&&w.인건비_표시!=='0원'?`<div class="card-row"><span>인건비</span><b style="color:var(--blue)">${w.인건비_표시}</b></div>`:''}
      <div class="card-actions">
        <button class="btn-del" onclick="deleteWork(${w.번호})">🗑 삭제</button>
      </div>
    </div>`;
  }).join('');
}

function formatWage(str) {
  return (str||'').split(';').filter(Boolean).map(p=>{
    const pp = p.split('|');
    if(pp.length>=3) return `${pp[0]} ${pp[1]}명×${parseInt(pp[2]).toLocaleString()}원`;
    return p;
  }).join(', ');
}

async function deleteWork(no) {
  if (!confirm('이 작업을 삭제할까요?')) return;
  await fetch(`/api/works/${no}`, {method:'DELETE'});
  loadWorks();
}

// ── 통계 ──
async function loadStats() {
  const r = await fetch('/api/stats');
  const d = await r.json();
  document.getElementById('stat-month-wage').textContent = (d.당월.인건비||0).toLocaleString()+'원';
  document.getElementById('stat-season-wage').textContent = (d.시즌.인건비||0).toLocaleString()+'원';
  document.getElementById('stat-month-cnt').textContent = (d.당월.건수||0)+'건';
}

// ── 달력 ──
function calMove(d) {
  calMonth += d;
  if (calMonth > 12) { calMonth=1; calYear++; }
  if (calMonth < 1)  { calMonth=12; calYear--; }
  loadCalendar();
}

async function loadCalendar() {
  document.getElementById('cal-title').textContent = `${calYear}년 ${calMonth}월`;
  const r = await fetch(`/api/calendar/${calYear}/${calMonth}`);
  const d = await r.json();
  const DAYS_KO = ['일','월','화','수','목','금','토'];
  const today = new Date(); const ty=today.getFullYear(),tm=today.getMonth()+1,td=today.getDate();
  // 첫날 요일
  const firstDow = new Date(calYear, calMonth-1, 1).getDay();
  let html = DAYS_KO.map((v,i)=>`<div class="cal-head${i===0?' style="color:var(--red)"':i===6?' style="color:var(--blue)"':''}">${v}</div>`).join('');
  for(let i=0;i<firstDow;i++) html += '<div class="cal-day empty"></div>';
  for(let day=1;day<=d.days;day++) {
    const dow = (firstDow+day-1)%7;
    const isToday = ty===calYear&&tm===calMonth&&td===day;
    const works = d.day_map[String(day)]||[];
    const evHTML = works.slice(0,2).map(w=>{
      const items = w.task_items||[];
      const label = items.length ? items[0].작업내용 : (w.작업내용||'작업');
      return `<div class="cal-event">${label}</div>`;
    }).join('') + (works.length>2?`<div class="cal-event" style="background:#aaa">+${works.length-2}</div>`:'');
    html += `<div class="cal-day${isToday?' today':''}" onclick="showCalDay(${day})">
      <div class="dn${dow===0?' sun':dow===6?' sat':''}">${day}</div>
      ${evHTML}
    </div>`;
  }
  document.getElementById('cal-grid').innerHTML = html;
  window._calDayMap = d.day_map;
}

function showCalDay(day) {
  const works = (window._calDayMap||{})[String(day)]||[];
  if(!works.length) return;
  document.getElementById('cal-modal-title').textContent = `${calYear}년 ${calMonth}월 ${day}일`;
  document.getElementById('cal-modal-body').innerHTML = works.map(w=>{
    const items = w.task_items||[];
    let body = items.length ? items.map(t=>`
      <div style="background:var(--accent);border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid var(--green2)">
        <b style="color:var(--green)">${t.작업내용||''}</b>
        ${t.작물?`<span class="tag">${t.작물}</span>`:''}
        ${t.날짜?`<div style="font-size:11px;color:#888">📅 ${t.날짜}${t.종료날짜&&t.종료날짜!==t.날짜?' ~ '+t.종료날짜:''}</div>`:''}
        ${t.시작시간?`<div style="font-size:11px;color:#888">⏰ ${t.시작시간} ~ ${t.종료시간} (${t.작업시간}h)</div>`:''}
        ${t.사용기계?`<div style="font-size:11px;color:#888">🔧 ${t.사용기계}</div>`:''}
        ${t.사용자재?`<div style="font-size:11px;color:var(--green2)">🪣 ${t.사용자재.split(';').filter(Boolean).map(p=>p.split('|')[0]).join(', ')}</div>`:''}
        ${t.병충해?`<div style="font-size:11px;color:var(--red)">🦟 ${t.병충해}</div>`:''}
        ${t.인력내역?`<div style="font-size:11px;color:var(--blue)">👷 ${formatWage(t.인력내역)}</div>`:''}
      </div>`).join('')
    : `<div style="font-size:13px;color:#444">${w.작업내용||''} / ${w.날씨||''}</div>`;
    return `<div class="card" style="margin-bottom:10px">${body}</div>`;
  }).join('');
  document.getElementById('cal-modal').classList.add('open');
}

// ── 작업 입력 ──
function openTaskModal() {
  // 오늘 날짜 기본값
  const today = new Date().toISOString().slice(0,10);
  document.getElementById('tm-date').value = today;
  document.getElementById('tm-days').value = 1;
  document.getElementById('tm-end').value = today;
  document.getElementById('tm-start').value = '';
  document.getElementById('tm-end-time').value = '';
  document.getElementById('tm-wtime').value = '';
  document.getElementById('tm-note').value = '';
  document.getElementById('tm-wages').innerHTML = '';
  // 칩 초기화
  document.querySelectorAll('#tm-crops .chip, #tm-pests .chip').forEach(c=>c.classList.remove('selected'));
  document.getElementById('tm-selected-mats').innerHTML = '';
  document.getElementById('task-modal').classList.add('open');
}
function closeTaskModal() {
  document.getElementById('task-modal').classList.remove('open');
}

function calcEndDate() {
  const d = document.getElementById('tm-date').value;
  const n = parseInt(document.getElementById('tm-days').value)||1;
  if(d) {
    const ed = new Date(d);
    ed.setDate(ed.getDate()+n-1);
    document.getElementById('tm-end').value = ed.toISOString().slice(0,10);
  }
}
document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('tm-date').addEventListener('change', calcEndDate);
});

function calcWtime() {
  const s = document.getElementById('tm-start').value;
  const e = document.getElementById('tm-end-time').value;
  if(s&&e) {
    const [sh,sm]=s.split(':').map(Number), [eh,em]=e.split(':').map(Number);
    const diff = (eh*60+em)-(sh*60+sm);
    if(diff>0) document.getElementById('tm-wtime').value = (diff/60).toFixed(1).replace(/\.0$/,'');
  }
}

function toggleChip(el) { el.classList.toggle('selected'); }

function addMat(name, unit) {
  const qty = prompt(`${name} 수량 (${unit}):`, '1');
  if(qty===null) return;
  const qf = parseFloat(qty);
  if(isNaN(qf)||qf<=0) { alert('올바른 수량을 입력하세요.'); return; }
  const cont = document.getElementById('tm-selected-mats');
  const id = `mat-${Date.now()}`;
  const div = document.createElement('div');
  div.id = id;
  div.style.cssText = 'display:flex;align-items:center;gap:6px;background:var(--accent);border-radius:8px;padding:5px 10px;margin-top:4px;font-size:13px;';
  div.innerHTML = `<span style="flex:1">${name} ${qf}${unit}</span><button onclick="document.getElementById('${id}').remove()" style="background:none;border:none;color:var(--red);font-size:16px;cursor:pointer">×</button>`;
  div.dataset.mat = `${name}|${qf}|${unit}`;
  cont.appendChild(div);
}

function addWage() {
  const cont = document.getElementById('tm-wages');
  const id = `wage-${Date.now()}`;
  const div = document.createElement('div');
  div.id = id;
  div.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:6px;';
  div.innerHTML = `
    <select style="flex:1;border:1.5px solid var(--border);border-radius:8px;padding:7px;font-size:13px;background:var(--bg)">
      <option>남자</option><option>여자</option><option>기타</option>
    </select>
    <input type="number" placeholder="인원" style="width:60px;border:1.5px solid var(--border);border-radius:8px;padding:7px;font-size:13px;" min="1" value="1">
    <input type="number" placeholder="단가" style="width:80px;border:1.5px solid var(--border);border-radius:8px;padding:7px;font-size:13px;">
    <input type="text" placeholder="구분" style="width:60px;border:1.5px solid var(--border);border-radius:8px;padding:7px;font-size:13px;">
    <button onclick="document.getElementById('${id}').remove()" style="background:none;border:none;color:var(--red);font-size:18px;cursor:pointer">×</button>`;
  cont.appendChild(div);
}

function confirmTask() {
  const startDate = document.getElementById('tm-date').value;
  const endDate   = document.getElementById('tm-end').value || startDate;
  const taskVal   = document.getElementById('tm-task').value;
  if(!startDate||!taskVal) { alert('날짜와 작업내용을 입력하세요.'); return; }

  // 작물
  const crops = [...document.querySelectorAll('#tm-crops .chip.selected')].map(c=>c.textContent).join(',');
  // 시간
  const sh = document.getElementById('tm-start').value || '00:00';
  const eh = document.getElementById('tm-end-time').value || '00:00';
  const wt = document.getElementById('tm-wtime').value || '0';
  const mac= document.getElementById('tm-machine').value;
  // 자재
  const mats = [...document.querySelectorAll('#tm-selected-mats [data-mat]')].map(el=>el.dataset.mat).join(';');
  // 병충해
  const pests = [...document.querySelectorAll('#tm-pests .chip.selected')].map(c=>c.textContent).join(',');
  // 인력
  const wages = [...document.querySelectorAll('#tm-wages > div')].map(d=>{
    const sel = d.querySelector('select');
    const inputs = d.querySelectorAll('input');
    if(sel&&inputs.length>=3) return `${sel.value}|${inputs[0].value}|${inputs[1].value}|${inputs[2].value||'일반'}`;
    return '';
  }).filter(Boolean).join(';');
  const note = document.getElementById('tm-note').value.trim();

  const task = { 날짜:startDate, 종료날짜:endDate, 작물:crops, 작업내용:taskVal,
    시작시간:sh, 종료시간:eh, 작업시간:wt, 사용기계:mac,
    사용자재:mats, 병충해:pests, 인력내역:wages, 비고:note };
  TASKS.push(task);
  renderTaskItems();
  closeTaskModal();
}

function renderTaskItems() {
  const cont = document.getElementById('task-items-container');
  cont.innerHTML = TASKS.map((t,i)=>`
    <div class="task-item">
      <div class="task-item-head">
        <div class="task-item-title">🌿 ${t.작업내용}</div>
        <button class="task-item-del" onclick="TASKS.splice(${i},1);renderTaskItems()">×</button>
      </div>
      <div class="task-item-info">
        📅 ${t.날짜}${t.종료날짜&&t.종료날짜!==t.날짜?' ~ '+t.종료날짜:''}
        ${t.작물?` | 🌱 ${t.작물}`:''}
        ${t.시작시간!=='00:00'?` | ⏰ ${t.시작시간}~${t.종료시간}(${t.작업시간}h)`:''}
        ${t.사용기계?` | 🔧 ${t.사용기계}`:''}
        ${t.사용자재?` | 🪣 ${t.사용자재.split(';').filter(Boolean).map(p=>p.split('|')[0]).join(',')}`:''}
        ${t.병충해?` | 🦟 ${t.병충해}`:''}
      </div>
    </div>`).join('');
}

async function submitWork() {
  if(!TASKS.length) { alert('작업을 추가하세요.'); return; }
  const weather = document.getElementById('f-weather').value;
  const payload = { 날씨: weather, task_items: TASKS };
  const r = await fetch('/api/works', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
  });
  const d = await r.json();
  if(d.ok) {
    alert('저장됐습니다! ✅');
    TASKS = []; renderTaskItems();
    showTab('works');
  } else { alert('저장 실패'); }
}

function resetForm() {
  TASKS = []; renderTaskItems();
  document.getElementById('f-weather').selectedIndex = 0;
}

// ── 초기화 ──
loadOptions();
loadWorks();
loadStats();
loadCalendar();

// 모달 배경 클릭 닫기
document.querySelectorAll('.modal-bg').forEach(bg=>{
  bg.addEventListener('click', e=>{ if(e.target===bg) bg.classList.remove('open'); });
});
</script>
</body>
</html>"""

@app.route("/")
def index():
    return render_template_string(HTML)

if __name__ == "__main__":
    try:
        init_db()
        print("✅ DB 초기화 완료")
    except Exception as e:
        print(f"⚠️  DB 초기화 오류: {e}")
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
