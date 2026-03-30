# cloud_server_final.py
from flask import Flask, jsonify, request
from datetime import datetime
import psycopg
from psycopg.rows import dict_row
import os

app = Flask(__name__)
DATABASE_URL = os.environ.get("DATABASE_URL", "")

def db_conn():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)

@app.route("/api/materials_all")
def materials_all():
    conn = db_conn()
    cur = conn.cursor()
    cur.execute('SELECT "자재명","단위","재고" FROM "자재" ORDER BY "자재명"')
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(rows)

@app.route("/api/materials/<name>", methods=["PUT"])
def update_material(name):
    qty = float(request.json.get("재고", 0))
    conn = db_conn()
    cur = conn.cursor()
    cur.execute('UPDATE "자재" SET "재고"=%s WHERE "자재명"=%s', (qty, name))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/materials/<name>", methods=["DELETE"])
def delete_material(name):
    conn = db_conn()
    cur = conn.cursor()
    cur.execute('DELETE FROM "자재" WHERE "자재명"=%s', (name,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"ok": True})

@app.route("/api/works", methods=["POST"])
def add_work():
    data = request.json or {}
    conn = db_conn()
    cur = conn.cursor()

    materials = data.get("materials", [])

    for m in materials:
        name = m.get("name")
        qty = float(m.get("qty", 0))
        unit = m.get("unit", "")

        cur.execute(
            '''
            INSERT INTO "자재" ("자재명","단위","재고")
            VALUES (%s,%s,%s)
            ON CONFLICT ("자재명")
            DO UPDATE SET "재고" = COALESCE("자재"."재고",0) + EXCLUDED."재고"
            ''',
            (name, unit, qty)
        )

    now = datetime.now().isoformat()

    cur.execute(
        '''
        INSERT INTO "작업일지" ("날짜","작업내용","생성시각")
        VALUES (%s,%s,%s)
        ''',
        (data.get("date"), data.get("task"), now)
    )

    conn.commit()
    cur.close()
    conn.close()

    return jsonify({"ok": True})

@app.route("/api/works_light")
def works_light():
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        '''
        SELECT "번호","날짜","작업내용"
        FROM "작업일지"
        ORDER BY "날짜" DESC
        LIMIT 100
        '''
    )
    rows = [dict(r) for r in cur.fetchall()]
    cur.close()
    conn.close()
    return jsonify(rows)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
