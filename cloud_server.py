import json
import os
import io
import sqlite3
from datetime import date, datetime

from flask import Flask, request, jsonify, render_template, send_file
import pandas as pd

app = Flask(__name__)

DB_PATH = "worklog.db"


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# 초기 테이블 생성
def init_db():
    conn = db()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS 작업일지 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        날짜 TEXT,
        작업내용 TEXT,
        날씨 TEXT,
        작물 TEXT,
        시작시간 TEXT,
        종료시간 TEXT,
        자재비 REAL,
        인건비 REAL,
        총금액 REAL,
        사용자재 TEXT,
        비고 TEXT,
        생성시각 TEXT
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS 자재 (
        자재명 TEXT PRIMARY KEY,
        단위 TEXT,
        재고 REAL
    )
    """)

    conn.commit()
    conn.close()


init_db()


@app.route("/")
def home():
    return render_template("index.html")


# 자재 조회
@app.route("/api/materials_all")
def materials():
    conn = db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM 자재 ORDER BY 자재명")
    rows = [dict(x) for x in cur.fetchall()]

    conn.close()
    return jsonify(rows)


# 자재 수정
@app.route("/api/materials/<name>", methods=["PUT"])
def update_material(name):
    d = request.json or {}
    new_qty = float(d.get("재고", 0))

    conn = db()
    cur = conn.cursor()

    cur.execute(
        "UPDATE 자재 SET 재고=? WHERE 자재명=?",
        (new_qty, name)
    )

    conn.commit()
    conn.close()

    return jsonify({"ok": 1})


# 작업 추가
@app.route("/api/works", methods=["POST"])
def add_work():
    d = request.json or {}

    conn = db()
    cur = conn.cursor()

    materials = d.get("materials", [])

    # 자재 재고 증가
    for m in materials:
        name = m.get("name")
        unit = m.get("unit")
        qty = float(m.get("qty", 0))

        if not name:
            continue

        cur.execute("""
        INSERT INTO 자재 (자재명, 단위, 재고)
        VALUES (?, ?, ?)
        ON CONFLICT(자재명)
        DO UPDATE SET 재고 = 재고 + excluded.재고
        """, (name, unit, qty))

    cur.execute("""
    INSERT INTO 작업일지
    (날짜, 작업내용, 날씨, 작물, 시작시간, 종료시간,
     자재비, 인건비, 총금액, 사용자재, 비고, 생성시각)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        d.get("날짜", date.today().isoformat()),
        d.get("작업내용", ""),
        d.get("날씨", ""),
        d.get("작물", ""),
        d.get("시작시간", ""),
        d.get("종료시간", ""),
        float(d.get("자재비", 0)),
        float(d.get("인건비", 0)),
        float(d.get("총금액", 0)),
        json.dumps(materials, ensure_ascii=False),
        d.get("비고", ""),
        datetime.now().isoformat()
    ))

    conn.commit()
    conn.close()

    return jsonify({"ok": 1})


# 작업 삭제
@app.route("/api/works", methods=["DELETE"])
def delete_work():
    d = request.json or {}

    conn = db()
    cur = conn.cursor()

    cur.execute("""
    DELETE FROM 작업일지
    WHERE 날짜=? AND 작업내용=?
    LIMIT 1
    """, (d.get("날짜"), d.get("작업내용")))

    conn.commit()
    conn.close()

    return jsonify({"ok": 1})


# 작업 조회
@app.route("/api/works_light")
def works():
    conn = db()
    cur = conn.cursor()

    cur.execute("""
    SELECT * FROM 작업일지
    ORDER BY 날짜 DESC, 생성시각 DESC
    LIMIT 300
    """)

    rows = [dict(x) for x in cur.fetchall()]
    conn.close()

    return jsonify(rows)


# 엑셀 다운로드
@app.route("/api/export_excel")
def export_excel():
    conn = db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM 작업일지")
    rows = [dict(x) for x in cur.fetchall()]

    df = pd.DataFrame(rows)

    output = io.BytesIO()
    df.to_excel(output, index=False)
    output.seek(0)

    return send_file(output, download_name="작업일지.xlsx", as_attachment=True)


if __name__ == "__main__":
    app.run(debug=True)
