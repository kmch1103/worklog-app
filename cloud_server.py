# 기존 import 유지
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


# ✅ 작업 추가 + 수정 (통합)
@app.route("/api/works", methods=["POST", "PUT"])
def save_work():
    d = request.json or {}

    c = db()
    cur = c.cursor()

    try:
        cur.execute("""
        INSERT INTO "작업일지"
        ("날짜","작업내용","날씨","작물","병충해","사용자재","사용기계","인건비상세","비고","생성시각")
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """, (
            d.get("날짜", date.today().isoformat()),
            d.get("작업내용",""),

            json.dumps(d.get("날씨",[]), ensure_ascii=False),
            json.dumps(d.get("작물",[]), ensure_ascii=False),
            json.dumps(d.get("병충해",[]), ensure_ascii=False),

            json.dumps(d.get("사용자재",[]), ensure_ascii=False),
            json.dumps(d.get("사용기계",[]), ensure_ascii=False),

            json.dumps(d.get("인건비상세",[]), ensure_ascii=False),

            d.get("비고",""),
            datetime.now().isoformat()
        ))

        c.commit()
        return jsonify({"ok":1})

    finally:
        cur.close()
        c.close()


# 삭제
@app.route("/api/works", methods=["DELETE"])
def delete_work():
    d = request.json or {}

    c = db()
    cur = c.cursor()

    try:
        cur.execute("""
        DELETE FROM "작업일지"
        WHERE ctid IN (
            SELECT ctid FROM "작업일지"
            WHERE "날짜"=%s AND "작업내용"=%s
            LIMIT 1
        )
        """,(d.get("날짜"), d.get("작업내용")))

        c.commit()
        return jsonify({"ok":1})

    finally:
        cur.close()
        c.close()


# 조회
@app.route("/api/works_light")
def works():
    c = db()
    cur = c.cursor()

    try:
        cur.execute('SELECT * FROM "작업일지" ORDER BY "날짜" DESC LIMIT 300')
        return jsonify([dict(x) for x in cur.fetchall()])
    finally:
        cur.close()
        c.close()
