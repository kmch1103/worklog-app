# 작업일지 v2 기본구조

## 구성
- cloud_server.py : Flask 서버 + SQLite DB + API
- templates/index.html : 메인 화면
- static/style.css : 스타일
- static/app.js : 프론트 로직
- data/worklog.db : 실행 시 자동 생성

## 로컬 실행
```bash
pip install -r requirements.txt
python cloud_server.py
```

브라우저:
- http://127.0.0.1:5000
- health 확인: http://127.0.0.1:5000/health

## Railway 실행
Start Command:
```bash
gunicorn cloud_server:app --bind 0.0.0.0:$PORT
```

## 현재 포함된 기능
- 작업일지 목록 조회
- 작업 입력 / 수정 / 삭제
- 옵션관리(날씨, 작물, 작업내용, 병충해, 사용자재, 사용기계)
- 자재관리 기본 등록

## 다음 확장 추천
- 날짜별 카드 그룹화
- 자재 입고/사용 로그
- 재고 자동 차감/복구
- 월별 통계
- 엑셀 다운로드
- 백업/복원
