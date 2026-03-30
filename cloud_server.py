import json
import os
import io
from datetime import date, datetime

from flask import Flask, request, jsonify, render_template, send_file
import psycopg
from psycopg.rows import dict_row
import pandas as pd

app = Flask(__name__)

DATABASE_URL = os.environ.get("DATABASE_URL", "")


def db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


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
        cur.execute('SELECT "자재명", "재고" FROM "자재" ORDER BY "자재명"')
        rows = [dict(x) for x in cur.fetchall()]
        return jsonify(rows)
    finally:
        cur.close()
        c.close()


@app.route("/api/materials/<name>", methods=["PUT"])
def update_material(name):
    d = request.json or {}
    new_qty = float(d.get("재고", 0))

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
    d = request.json or {}

    work_date = d.get("날짜") or d.get("date") or date.today().isoformat()
    work_name = d.get("작업내용") or d.get("task") or ""
    weather = d.get("날씨") or ""
    crop = d.get("작물") or ""
    start_time = d.get("시작시간") or ""
    end_time = d.get("종료시간") or ""
    note = d.get("비고") or ""

    material_cost = float(d.get("자재비", d.get("material_cost", 0)) or 0)
    labor_cost = float(d.get("인건비", d.get("wage_cost", 0)) or 0)
    total_cost = float(d.get("총금액", material_cost + labor_cost) or 0)

    materials_raw = d.get("사용자재")
    materials_list = d.get("materials", [])

    if materials_raw:
        user_materials = materials_raw
    else:
        user_materials = json.dumps(materials_list, ensure_ascii=False)

    c = db()
    cur = c.cursor()
    try:
        for m in materials_list:
            mat_name = m.get("name", "").strip()
            mat_unit = m.get("unit", "").strip()
            mat_qty = float(m.get("qty", 0) or 0)

            if not mat_name:
                continue

            cur.execute(
                """
                INSERT INTO "자재" ("자재명", "단위", "재고")
                VALUES (%s, %s, %s)
                ON CONFLICT ("자재명")
                DO UPDATE SET "재고" = "자재"."재고" + EXCLUDED."재고"
                """,
                (mat_name, mat_unit, mat_qty)
            )

        cur.execute(
            """
            INSERT INTO "작업일지"
            ("날짜", "작업내용", "날씨", "작물", "시작시간", "종료시간",
             "자재비", "인건비", "총금액", "사용자재", "비고", "생성시각")
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                work_date,
                work_name,
                weather,
                crop,
                start_time,
                end_time,
                material_cost,
                labor_cost,
                total_cost,
                user_materials,
                note,
                datetime.now().isoformat()
            )
        )

        c.commit()
        return jsonify({"ok": 1})
    finally:
        cur.close()
        c.close()


@app.route("/api/works", methods=["DELETE"])
def delete_work():
    d = request.json or {}

    work_date = d.get("날짜") or d.get("date") or ""
    work_name = d.get("작업내용") or d.get("task") or ""

    if not work_date or not work_name:
        return jsonify({"error": "삭제할 날짜와 작업내용이 필요합니다."}), 400

    c = db()
    cur = c.cursor()
    try:
        cur.execute(
            """
            DELETE FROM "작업일지"
            WHERE ctid IN (
                SELECT ctid
                FROM "작업일지"
                WHERE "날짜" = %s AND "작업내용" = %s
                LIMIT 1
            )
            """,
            (work_date, work_name)
        )
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
            """
            SELECT
                "날짜",
                "작업내용",
                COALESCE("날씨", '') AS "날씨",
                COALESCE("작물", '') AS "작물",
                COALESCE("시작시간", '') AS "시작시간",
                COALESCE("종료시간", '') AS "종료시간",
                COALESCE("사용자재", '') AS "사용자재",
                COALESCE("자재비", 0) AS "자재비",
                COALESCE("인건비", 0) AS "인건비",
                COALESCE("총금액", COALESCE("자재비", 0) + COALESCE("인건비", 0)) AS "총금액",
                COALESCE("비고", '') AS "비고"
            FROM "작업일지"
            ORDER BY "날짜" DESC, "생성시각" DESC
            LIMIT 300
            """
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
            """
            SELECT
                SUBSTRING("날짜", 1, 7) AS month,
                COALESCE(SUM("자재비"), 0) AS material_cost,
                COALESCE(SUM("인건비"), 0) AS labor_cost,
                COALESCE(SUM(COALESCE("총금액", COALESCE("자재비", 0) + COALESCE("인건비", 0))), 0) AS total
            FROM "작업일지"
            GROUP BY month
            ORDER BY month DESC
            """
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
            """
            SELECT
                "날짜",
                "작업내용",
                "날씨",
                "작물",
                "시작시간",
                "종료시간",
                "사용자재",
                "자재비",
                "인건비",
                COALESCE("총금액", COALESCE("자재비", 0) + COALESCE("인건비", 0)) AS "총금액",
                "비고",
                "생성시각"
            FROM "작업일지"
            ORDER BY "날짜" DESC, "생성시각" DESC
            """
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
            """
            SELECT
                SUBSTRING("날짜", 1, 7) AS "월",
                COALESCE(SUM("자재비"), 0) AS "자재비",
                COALESCE(SUM("인건비"), 0) AS "인건비",
                COALESCE(SUM(COALESCE("총금액", COALESCE("자재비", 0) + COALESCE("인건비", 0))), 0) AS "총금액"
            FROM "작업일지"
            GROUP BY SUBSTRING("날짜", 1, 7)
            ORDER BY SUBSTRING("날짜", 1, 7) DESC
            """
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
        cur.execute('SELECT * FROM "작업일지" ORDER BY "날짜" DESC')
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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
