import json
import os
import io
from datetime import date, datetime

from flask import Flask, request, jsonify, render_template, send_file
import psycopg
from psycopg.rows import dict_row
import pandas as pd

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "worklog-cloud-secret")

DATABASE_URL = os.environ.get("DATABASE_URL", "")


def db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def run_ddl(sql):
    c = db()
    cur = c.cursor()
    try:
        cur.execute(sql)
        c.commit()
    finally:
        cur.close()
        c.close()


def ensure_schema():
    run_ddl(
        '''
        CREATE TABLE IF NOT EXISTS "자재" (
            "자재명" TEXT PRIMARY KEY,
            "단위" TEXT DEFAULT '',
            "재고" DOUBLE PRECISION DEFAULT 0
        )
        '''
    )

    run_ddl(
        '''
        CREATE TABLE IF NOT EXISTS "작업일지" (
            "날짜" TEXT,
            "시작날짜" TEXT,
            "종료날짜" TEXT,
            "연속일수" INTEGER DEFAULT 1,
            "작업내용" TEXT,
            "날씨" TEXT,
            "작물" TEXT,
            "병충해" TEXT,
            "시작시간" TEXT,
            "종료시간" TEXT,
            "사용기계" TEXT,
            "사용기계상세" TEXT,
            "사용자재" TEXT,
            "사용자재상세" TEXT,
            "인건비상세" TEXT,
            "자재비" DOUBLE PRECISION DEFAULT 0,
            "인건비" DOUBLE PRECISION DEFAULT 0,
            "총금액" DOUBLE PRECISION DEFAULT 0,
            "비고" TEXT,
            "생성시각" TEXT,
            "수정시각" TEXT
        )
        '''
    )

    extra_columns = [
        ('"시작날짜"', 'TEXT'),
        ('"종료날짜"', 'TEXT'),
        ('"연속일수"', 'INTEGER DEFAULT 1'),
        ('"병충해"', 'TEXT'),
        ('"사용기계"', 'TEXT'),
        ('"사용기계상세"', 'TEXT'),
        ('"사용자재상세"', 'TEXT'),
        ('"인건비상세"', 'TEXT'),
        ('"수정시각"', 'TEXT'),
    ]
    c = db()
    cur = c.cursor()
    try:
        for col, dtype in extra_columns:
            cur.execute(f'ALTER TABLE "작업일지" ADD COLUMN IF NOT EXISTS {col} {dtype}')
        cur.execute('ALTER TABLE "자재" ADD COLUMN IF NOT EXISTS "단위" TEXT')
        c.commit()
    finally:
        cur.close()
        c.close()


ensure_schema()


def normalize_number(value, default=0):
    try:
        return float(value or default)
    except Exception:
        return float(default)


def normalize_payload(d):
    work_date = d.get("날짜") or d.get("시작날짜") or d.get("date") or date.today().isoformat()
    start_date = d.get("시작날짜") or work_date
    end_date = d.get("종료날짜") or start_date
    work_name = d.get("작업내용") or d.get("task") or ""
    weather = d.get("날씨") or ""
    crop = d.get("작물") or ""
    pest = d.get("병충해") or ""
    start_time = d.get("시작시간") or ""
    end_time = d.get("종료시간") or ""
    note = d.get("비고") or ""

    machine_names = d.get("사용기계") or ""
    machine_details = d.get("사용기계상세") or ""
    material_names = d.get("사용자재") or ""
    material_details = d.get("사용자재상세") or material_names
    labor_details = d.get("인건비상세") or ""

    days = int(d.get("연속일수") or 1)
    material_cost = normalize_number(d.get("자재비", d.get("material_cost", 0)), 0)
    labor_cost = normalize_number(d.get("인건비", d.get("wage_cost", 0)), 0)
    total_cost = normalize_number(d.get("총금액", material_cost + labor_cost), material_cost + labor_cost)

    materials_list = d.get("사용자재목록") or d.get("materials") or []
    if isinstance(materials_list, str):
        materials_list = []

    return {
        "날짜": work_date,
        "시작날짜": start_date,
        "종료날짜": end_date,
        "연속일수": days,
        "작업내용": work_name,
        "날씨": weather,
        "작물": crop,
        "병충해": pest,
        "시작시간": start_time,
        "종료시간": end_time,
        "사용기계": machine_names,
        "사용기계상세": machine_details,
        "사용자재": material_names,
        "사용자재상세": material_details,
        "인건비상세": labor_details,
        "자재비": material_cost,
        "인건비": labor_cost,
        "총금액": total_cost,
        "비고": note,
        "materials_list": materials_list,
    }


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/input")
def input_page():
    return render_template("index.html")


@app.route("/api/materials_all")
def materials():
    c = db()
    cur = c.cursor()
    try:
        cur.execute('SELECT "자재명", COALESCE("재고", 0) AS "재고" FROM "자재" ORDER BY "자재명"')
        rows = [dict(x) for x in cur.fetchall()]
        return jsonify(rows)
    finally:
        cur.close()
        c.close()


@app.route("/api/materials/<name>", methods=["PUT"])
def update_material(name):
    d = request.json or {}
    new_qty = normalize_number(d.get("재고", 0), 0)

    c = db()
    cur = c.cursor()
    try:
        cur.execute(
            'UPDATE "자재" SET "재고" = %s WHERE "자재명" = %s',
            (new_qty, name)
        )
        c.commit()
        return jsonify({"ok": 1})
    finally:
        cur.close()
        c.close()


@app.route("/api/materials/<name>", methods=["DELETE"])
def delete_material(name):
    c = db()
    cur = c.cursor()
    try:
        cur.execute('DELETE FROM "자재" WHERE "자재명" = %s', (name,))
        c.commit()
        return jsonify({"ok": 1})
    finally:
        cur.close()
        c.close()


@app.route("/api/works", methods=["POST"])
def add_work():
    d = normalize_payload(request.json or {})

    c = db()
    cur = c.cursor()
    try:
        for m in d["materials_list"]:
            mat_name = str(m.get("name", "")).strip()
            mat_unit = str(m.get("unit", "")).strip()
            mat_qty = normalize_number(m.get("qty", 0), 0)

            if not mat_name:
                continue

            cur.execute(
                '''
                INSERT INTO "자재" ("자재명", "단위", "재고")
                VALUES (%s, %s, %s)
                ON CONFLICT ("자재명")
                DO UPDATE SET "재고" = COALESCE("자재"."재고", 0) + EXCLUDED."재고",
                              "단위" = CASE
                                          WHEN EXCLUDED."단위" = '' THEN "자재"."단위"
                                          ELSE EXCLUDED."단위"
                                       END
                ''',
                (mat_name, mat_unit, mat_qty)
            )

        cur.execute(
            '''
            INSERT INTO "작업일지"
            ("날짜", "시작날짜", "종료날짜", "연속일수", "작업내용", "날씨", "작물", "병충해",
             "시작시간", "종료시간", "사용기계", "사용기계상세", "사용자재", "사용자재상세",
             "인건비상세", "자재비", "인건비", "총금액", "비고", "생성시각", "수정시각")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''',
            (
                d["날짜"], d["시작날짜"], d["종료날짜"], d["연속일수"], d["작업내용"], d["날씨"], d["작물"], d["병충해"],
                d["시작시간"], d["종료시간"], d["사용기계"], d["사용기계상세"], d["사용자재"], d["사용자재상세"],
                d["인건비상세"], d["자재비"], d["인건비"], d["총금액"], d["비고"], datetime.now().isoformat(), datetime.now().isoformat()
            )
        )

        c.commit()
        return jsonify({"ok": 1})
    finally:
        cur.close()
        c.close()


@app.route("/api/works/<row_id>", methods=["PUT"])
def update_work(row_id):
    d = normalize_payload(request.json or {})

    c = db()
    cur = c.cursor()
    try:
        cur.execute(
            '''
            UPDATE "작업일지"
            SET "날짜" = %s,
                "시작날짜" = %s,
                "종료날짜" = %s,
                "연속일수" = %s,
                "작업내용" = %s,
                "날씨" = %s,
                "작물" = %s,
                "병충해" = %s,
                "시작시간" = %s,
                "종료시간" = %s,
                "사용기계" = %s,
                "사용기계상세" = %s,
                "사용자재" = %s,
                "사용자재상세" = %s,
                "인건비상세" = %s,
                "자재비" = %s,
                "인건비" = %s,
                "총금액" = %s,
                "비고" = %s,
                "수정시각" = %s
            WHERE ctid::text = %s
            ''',
            (
                d["날짜"], d["시작날짜"], d["종료날짜"], d["연속일수"], d["작업내용"], d["날씨"], d["작물"], d["병충해"],
                d["시작시간"], d["종료시간"], d["사용기계"], d["사용기계상세"], d["사용자재"], d["사용자재상세"],
                d["인건비상세"], d["자재비"], d["인건비"], d["총금액"], d["비고"], datetime.now().isoformat(), row_id
            )
        )
        c.commit()
        return jsonify({"ok": 1})
    finally:
        cur.close()
        c.close()


@app.route("/api/works/<row_id>", methods=["DELETE"])
def delete_work(row_id):
    c = db()
    cur = c.cursor()
    try:
        cur.execute('DELETE FROM "작업일지" WHERE ctid::text = %s', (row_id,))
        c.commit()
        return jsonify({"ok": 1})
    finally:
        cur.close()
        c.close()


@app.route("/api/works_light")
def works_light():
    c = db()
    cur = c.cursor()
    try:
        cur.execute(
            '''
            SELECT
                ctid::text AS row_id,
                COALESCE("날짜", '') AS "날짜",
                COALESCE("시작날짜", COALESCE("날짜", '')) AS "시작날짜",
                COALESCE("종료날짜", COALESCE("날짜", '')) AS "종료날짜",
                COALESCE("연속일수", 1) AS "연속일수",
                COALESCE("작업내용", '') AS "작업내용",
                COALESCE("날씨", '') AS "날씨",
                COALESCE("작물", '') AS "작물",
                COALESCE("병충해", '') AS "병충해",
                COALESCE("시작시간", '') AS "시작시간",
                COALESCE("종료시간", '') AS "종료시간",
                COALESCE("사용기계", '') AS "사용기계",
                COALESCE("사용기계상세", '') AS "사용기계상세",
                COALESCE("사용자재", '') AS "사용자재",
                COALESCE("사용자재상세", '') AS "사용자재상세",
                COALESCE("인건비상세", '') AS "인건비상세",
                COALESCE("자재비", 0) AS "자재비",
                COALESCE("인건비", 0) AS "인건비",
                COALESCE("총금액", COALESCE("자재비", 0) + COALESCE("인건비", 0)) AS "총금액",
                COALESCE("비고", '') AS "비고"
            FROM "작업일지"
            ORDER BY COALESCE("시작날짜", "날짜") DESC, COALESCE("수정시각", "생성시각") DESC
            LIMIT 300
            '''
        )
        rows = [dict(x) for x in cur.fetchall()]
        return jsonify(rows)
    finally:
        cur.close()
        c.close()


@app.route("/api/monthly_json")
def monthly_json():
    c = db()
    cur = c.cursor()
    try:
        cur.execute(
            '''
            SELECT
                SUBSTRING(COALESCE("시작날짜", "날짜"), 1, 7) AS month,
                COALESCE(SUM("자재비"), 0) AS material_cost,
                COALESCE(SUM("인건비"), 0) AS labor_cost,
                COALESCE(SUM(COALESCE("총금액", COALESCE("자재비", 0) + COALESCE("인건비", 0))), 0) AS total
            FROM "작업일지"
            GROUP BY month
            ORDER BY month DESC
            '''
        )
        rows = [dict(x) for x in cur.fetchall()]
        return jsonify(rows)
    finally:
        cur.close()
        c.close()


@app.route("/api/export_excel")
def export_excel():
    c = db()
    cur = c.cursor()
    try:
        cur.execute(
            '''
            SELECT
                COALESCE("날짜", '') AS "날짜",
                COALESCE("시작날짜", '') AS "시작날짜",
                COALESCE("종료날짜", '') AS "종료날짜",
                COALESCE("연속일수", 1) AS "연속일수",
                COALESCE("작업내용", '') AS "작업내용",
                COALESCE("날씨", '') AS "날씨",
                COALESCE("작물", '') AS "작물",
                COALESCE("병충해", '') AS "병충해",
                COALESCE("시작시간", '') AS "시작시간",
                COALESCE("종료시간", '') AS "종료시간",
                COALESCE("사용기계", '') AS "사용기계",
                COALESCE("사용기계상세", '') AS "사용기계상세",
                COALESCE("사용자재", '') AS "사용자재",
                COALESCE("사용자재상세", '') AS "사용자재상세",
                COALESCE("인건비상세", '') AS "인건비상세",
                COALESCE("자재비", 0) AS "자재비",
                COALESCE("인건비", 0) AS "인건비",
                COALESCE("총금액", COALESCE("자재비", 0) + COALESCE("인건비", 0)) AS "총금액",
                COALESCE("비고", '') AS "비고",
                COALESCE("생성시각", '') AS "생성시각",
                COALESCE("수정시각", '') AS "수정시각"
            FROM "작업일지"
            ORDER BY COALESCE("시작날짜", "날짜") DESC, COALESCE("수정시각", "생성시각") DESC
            '''
        )
        rows = [dict(x) for x in cur.fetchall()]
        df = pd.DataFrame(rows)

        output = io.BytesIO()
        df.to_excel(output, index=False)
        output.seek(0)

        return send_file(
            output,
            download_name="작업일지.xlsx",
            as_attachment=True
        )
    finally:
        cur.close()
        c.close()


@app.route("/api/export_monthly")
def export_monthly():
    c = db()
    cur = c.cursor()
    try:
        cur.execute(
            '''
            SELECT
                SUBSTRING(COALESCE("시작날짜", "날짜"), 1, 7) AS "월",
                COALESCE(SUM("자재비"), 0) AS "자재비",
                COALESCE(SUM("인건비"), 0) AS "인건비",
                COALESCE(SUM(COALESCE("총금액", COALESCE("자재비", 0) + COALESCE("인건비", 0))), 0) AS "총금액"
            FROM "작업일지"
            GROUP BY SUBSTRING(COALESCE("시작날짜", "날짜"), 1, 7)
            ORDER BY SUBSTRING(COALESCE("시작날짜", "날짜"), 1, 7) DESC
            '''
        )
        rows = [dict(x) for x in cur.fetchall()]
        df = pd.DataFrame(rows)

        output = io.BytesIO()
        df.to_excel(output, index=False)
        output.seek(0)

        return send_file(
            output,
            download_name="월정산.xlsx",
            as_attachment=True
        )
    finally:
        cur.close()
        c.close()


@app.route("/api/backup")
def backup():
    c = db()
    cur = c.cursor()
    try:
        cur.execute('SELECT * FROM "작업일지" ORDER BY COALESCE("시작날짜", "날짜") DESC')
        rows = [dict(x) for x in cur.fetchall()]

        output = io.BytesIO()
        output.write(
            json.dumps(rows, ensure_ascii=False, indent=2).encode("utf-8")
        )
        output.seek(0)

        return send_file(
            output,
            download_name=f'backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json',
            as_attachment=True,
            mimetype="application/json"
        )
    finally:
        cur.close()
        c.close()


@app.route("/api/ping")
def ping():
    return jsonify({"ok": 1, "time": datetime.now().isoformat()})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
