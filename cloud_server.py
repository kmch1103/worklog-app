# cloud_server_full_final.py
import os
import json
from datetime import datetime, date
from flask import Flask, jsonify, request, render_template_string
import psycopg
from psycopg.rows import dict_row

app = Flask(__name__)
DATABASE_URL = os.environ.get("DATABASE_URL", "")

def db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

@app.route("/")
def home():
    return render_template_string("<h2>작업일지 정상 실행</h2>")

@app.route("/api/materials_all")
def materials_all():
    conn = db(); cur = conn.cursor()
    cur.execute('SELECT "자재명","단위","재고" FROM "자재" ORDER BY "자재명"')
    rows = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify(rows)

@app.route("/api/materials/<name>", methods=["PUT"])
def update_material(name):
    qty = float(request.json.get("재고", 0))
    conn = db(); cur = conn.cursor()
    cur.execute('UPDATE "자재" SET "재고"=%s WHERE "자재명"=%s', (qty, name))
    conn.commit()
    cur.close(); conn.close()
    return jsonify({"ok": True})

@app.route("/api/materials/<name>", methods=["DELETE"])
def delete_material(name):
    conn = db(); cur = conn.cursor()
    cur.execute('DELETE FROM "자재" WHERE "자재명"=%s', (name,))
    conn.commit()
    cur.close(); conn.close()
    return jsonify({"ok": True})

@app.route("/api/works", methods=["POST"])
def add_work():
    data = request.json or {}
    conn = db(); cur = conn.cursor()

    materials = data.get("materials", [])

    for m in materials:
        name = m.get("name")
        qty = float(m.get("qty", 0))
        unit = m.get("unit", "")

        cur.execute(
            'INSERT INTO "자재" ("자재명","단위","재고") VALUES (%s,%s,%s) '
            'ON CONFLICT ("자재명") DO UPDATE SET "재고" = COALESCE("자재"."재고",0) + EXCLUDED."재고"',
            (name, unit, qty)
        )

    today = data.get("date") or date.today().isoformat()

    cur.execute(
        'INSERT INTO "작업일지" ("날짜","작업내용","사용자재","생성시각") VALUES (%s,%s,%s,%s)',
        (today, data.get("task", ""), json.dumps(materials, ensure_ascii=False), datetime.now().isoformat())
    )

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"ok": True})

@app.route("/api/works_light")
def works_light():
    conn = db(); cur = conn.cursor()
    cur.execute('SELECT "번호","날짜","작업내용" FROM "작업일지" ORDER BY "날짜" DESC LIMIT 100')
    rows = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify(rows)

@app.route("/api/calendar_compare/<int:y>/<int:m>")
def calendar_compare(y, m):
    conn = db(); cur = conn.cursor()
    cur.execute('SELECT "날짜","작업내용" FROM "작업일지" WHERE "날짜" LIKE %s', (f"{y}-{m:02d}%",))
    now = [dict(r) for r in cur.fetchall()]
    cur.execute('SELECT "날짜","작업내용" FROM "작업일지" WHERE "날짜" LIKE %s', (f"{y-1}-{m:02d}%",))
    prev = [dict(r) for r in cur.fetchall()]
    cur.close(); conn.close()
    return jsonify({"this": now, "last": prev})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
