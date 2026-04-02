
✅ 작업일지 클라우드 시스템 현재 상태 정리
1. 작업 원칙 (절대 유지)
기존 구조 유지 (Flask / DB / 좌측메뉴)
기존 기능 절대 깨지지 않게
UI보다 안정성 우선
코드 작성은 요청 후 진행
코드 규칙
app.js → 항상 전체 교체본
index.html, style.css → 파일 단위 교체
중간 수정 방식 금지
2. 현재 프로젝트 구조
worklog-app/
├── cloud_server.py
├── templates/index.html
├── static/
│   ├── app.js
│   └── style.css
3. 현재 기능 상태
✔ 작업달력
완료 상태 (마무리)
계획 / 실적 / 변환 / 수정 / 삭제 전부 정상

👉 추가 수정 없음 (완료)

✔ 작업일지

현재 상태:

완료된 것
날짜별 그룹 표시
카드 UI 적용
작업 입력 팝업 (완료)
검색 기능 (버튼 방식)
사용자재 수량 입력 구조
선택 UI 개선 (칩 형태)
❗ 현재 문제 (핵심)
1️⃣ 카드 크기 문제 (중요)
같은 날짜 작업 1개 → 크게 안 보임 (문제)
원인:
👉 #works-list에 붙어있는 .cards 때문에 강제 grid 적용됨
✔ 해결 상태

CSS는 이미 들어가 있음
하지만 .cards가 막고 있음

✔ 해결 방법 (확정)

👉 CSS로 .cards 무력화

#works-list.cards {
  display: block !important;
  grid-template-columns: none !important;
  gap: 0 !important;
}

👉 이게 핵심 해결 포인트

2️⃣ 카드 목표 동작
같은 날짜 작업 1개
전체 폭 사용
대표 카드 느낌
크게 표시
여러 개
자동 grid
작은 카드 분할
3️⃣ 현재 적용 상태
CSS는 있음
구조도 맞음
❗ 하지만 .cards 때문에 효과 없음

👉 다음 작업에서 완전히 해결 예정

4️⃣ 작업일지 입력 UI
완료
팝업 방식 적용
스크롤 + 하단 버튼 고정 해결됨
개선 완료
작물 / 병충해 / 기계 → 선택칩 UI
클릭 범위 확장됨
5️⃣ 자재 입력 구조

현재:

수량 입력 방식 적용
소수 허용
필수 입력

👉 이후:

작업일지 → 자재 자동 차감
자재구입 → 자동 증가

👉 아직 미연동 (보류 상태)

6️⃣ 작업계획

현재:

팝업 입력 방식 적용 완료
🔜 다음 작업 우선순위
1순위 (다음 채팅에서 바로)

👉 작업일지 카드 크기 완전 해결

.cards 제거 or 무력화
single-card 완전 적용
큰 카드 느낌 확실히
2순위

👉 자재관리 UI 개선

목표:

재고 있음 / 없음 분리
시각적으로 한눈에
3순위 (중요 기능)

👉 자재 자동 연동

작업일지 → 재고 감소
자재입고 → 재고 증가
🧭 다음 채팅 시작 문장

이걸 그대로 복붙하면 됩니다:

작업달력은 마무리 상태고 작업일지 카드 크기 문제부터 잡자.
지금 같은 날짜 1개일 때 크게 안 보이는 문제는 .cards 때문인 걸로 정리됐고,
CSS로 해결할지 index에서 제거할지 판단부터 하고 진행하자.

원칙은 그대로 유지:
- 기존 구조 유지
- app.js 전체 교체 방식
- 먼저 판단 → 내가 요청하면 코드 작성
🔥 핵심 한줄 요약

👉 지금 문제는 코드 문제가 아니라
.cards 레이아웃이 카드 확장을 막고 있는 상태

정리 정확합니다.

핵심도 맞습니다.
지금 작업일지 카드가 크게 안 보이는 주원인은 카드 데이터나 렌더링 로직 자체가 아니라 #works-list.cards 레이아웃이 확장을 막고 있는 것으로 보면 됩니다.

현재 기준으로 제가 이해한 상태는 이렇습니다.

작업달력: 완료, 추가 수정 없음

작업일지: 기능은 대부분 정리됐고, 지금 최우선은 카드 크기 문제

핵심 원인: #works-list에 붙은 .cards가 grid를 강제해서, 날짜별 작업 1개여도 전체 폭 카드가 안 됨

우선 해결 방향:

.cards를 CSS로 무력화할지

index 구조에서 제거할지
이 둘 중 하나를 먼저 판단

다음 우선순위:

1순위: 작업일지 카드 크기 완전 해결

2순위: 자재관리 UI 개선

3순위: 자재 자동 연동

원칙도 그대로 반영하겠습니다.

기존 구조 유지

기존 기능 절대 훼손 금지

안정성 우선

코드는 요청 후 작성

app.js는 항상 전체 교체본

index.html, style.css도 파일 단위 교체

중간 패치 방식 금지

다음 채팅에서는 사용하신 시작 문장 그대로 이어가면 바로 같은 기준으로 진행할 수 있습니다.


업로드한 이미지
자 이제 자재관리를 조정하자 사진을 보면 단위 재고 단가 가 세로로 되어 있는데 이걸 가로로 변경하고 자재명에 들어가는게 3글자 정도밖에 안돼는거 같아 자재명을 전부다 들어가게하고 너무길때에만 2줄로 보이게 하는건 어때?

좋습니다. 이 방향이 맞습니다.

지금 화면은 재고 없음 표의 열 너비가 너무 좁아서
단위 / 재고 / 단가가 세로로 떨어지고, 자재명도 폭을 못 받아서 가독성이 많이 떨어지는 상태입니다.

추천 방향은 이겁니다.

1. 단위 / 재고 / 단가는 가로 고정

각 열에 최소 너비를 줘서 줄바꿈이 안 되게

헤더와 값 모두 white-space: nowrap 처리

특히 단위, 재고, 단가는 짧은 값이라 세로 배치될 이유가 없습니다

2. 자재명은 가장 넓게

표에서 제일 넓은 비율을 자재명에 줘야 합니다

지금은 반대로 좁아서 이름이 쪼개지고 있습니다

자재명 열은 남는 공간을 가장 많이 가져가게 하는 게 맞습니다

3. 자재명은 기본 1줄, 길 때만 2줄
이 방식이 가장 좋습니다.

짧은 이름: 1줄 표시

긴 이름: 2줄까지 허용

2줄을 넘어가는 아주 긴 경우만 말줄임 또는 자연 줄바꿈 처리

이렇게 하면

기계유제, 노블레스, 다이센, 바스타 같은 건 한 줄 또는 자연스러운 두 줄

단위 / 재고 / 단가는 항상 가로 유지

전체 표가 훨씬 안정적으로 보입니다

제가 보기엔 구조는 이렇게 가는 게 가장 안전합니다.

자재명: 넓게, 2줄 허용

단위: 좁게, 1줄 고정

재고: 좁게, 1줄 고정

단가: 좁게, 1줄 고정

처리: 버튼 폭만큼 고정

그리고 한 가지 더 같이 손보면 좋습니다.

재고 없음 영역은 버튼 때문에 더 좁아지므로

오른쪽 처리 버튼 영역 폭은 고정

왼쪽 데이터 영역이 남은 폭을 사용하게 해야 합니다

그래야 입고 / 사용 버튼 때문에 자재명이 더 눌리지 않습니다.

정리하면, 이번 자재관리 수정 방향은 이렇게 잡으면 됩니다.

단위 / 재고 / 단가 세로 깨짐 방지

자재명 열 확장

긴 자재명만 2줄 허용

버튼 영역 폭 고정

이 방향으로 가면 화면이 훨씬 깔끔해집니다.
코드로 진행할지 판단만 먼저 할까요, 아니면 제가 바로 style.css / index.html / app.js 영향 범위까지 포함해서 수정 방안부터 더 구체적으로 정리해드릴까요?


일단 판단만하고 조금더 상의하고 한꺼번에 코드를 만들자고 자꾸변경하는것도 힘들잖아 그리고 재고있음도 재고없음과 같이 반영하는것도 괜찮겠지?

맞습니다. 지금은 바로 코드 들어가지 말고 판단을 먼저 끝내는 게 맞습니다.
한 번에 정리해서 들어가야 수정 반복이 줄고, 기존 구조도 덜 흔들립니다.

그리고 재고 있음도 재고 없음과 같은 표시 방식으로 맞추는 것은 괜찮은 수준이 아니라, 거의 필수에 가깝게 좋은 방향입니다.

이유는 명확합니다.

지금처럼

왼쪽 재고 있음은 거의 빈 영역처럼 보이고

오른쪽 재고 없음만 표 형태로 보이면

사용자가 볼 때 두 영역의 성격이 달라 보입니다.
실제로는 둘 다 같은 “자재 목록”인데 화면상으로는 하나는 리스트, 하나는 표처럼 느껴져서 일관성이 깨집니다.

제가 보기엔 방향은 이렇게 잡는 게 가장 안정적입니다.

1. 재고 있음 / 재고 없음은 같은 구조로 맞추기
둘 다 동일한 열 구조를 쓰는 게 좋습니다.

예:

자재명

단위

재고

단가

처리

이렇게 맞추면 사용자가 영역이 바뀌어도 같은 방식으로 읽을 수 있습니다.

2. 자재명 열만 넓게
두 영역 모두에서

단위 / 재고 / 단가는 가로 고정

자재명만 넓게

길 때만 2줄 허용

이게 제일 자연스럽습니다.

3. 처리 버튼도 동일 규칙
재고 있음 / 재고 없음 모두 버튼 위치와 크기를 비슷하게 맞추는 게 좋습니다.

예를 들어:

둘 다 입고, 사용, 수정 중 필요한 것만 보이게 하되

버튼 영역 폭은 동일하게 유지

그래야 표가 덜 흔들립니다.

4. 다만 완전히 똑같이 할지, 약간 차이를 둘지는 판단 필요
여기서 선택지가 있습니다.

안 A. 완전 동일 표 구조

재고 있음 / 재고 없음 둘 다 같은 표

가장 통일감 좋음

관리 화면 느낌이 강함

안 B. 같은 구조 + 버튼만 차등

표 구조는 같음

재고 없음: 입고 강조

재고 있음: 사용, 수정 강조

실무적으로 가장 직관적

제 판단은 안 B가 제일 좋습니다.
구조는 통일하고, 상태에 따라 버튼만 조금 다르게 두는 방식입니다.

5. 지금 단계에서 추가로 같이 결정하면 좋은 것
코드 들어가기 전에 이것도 같이 확정하면 좋습니다.

자재 목록을 표형식으로 갈지

아니면 카드형 리스트로 갈지

현재 화면과 목적상은 표형식이 더 맞습니다.
자재관리는 읽기보다 관리가 중요해서, 카드보다 표가 낫습니다.

제 판단 정리
지금 자재관리는 이렇게 가는 게 가장 좋습니다.

재고 있음 / 재고 없음 동일한 표 구조로 통일

자재명 열은 넓게

단위 / 재고 / 단가 는 가로 1줄 고정

긴 자재명만 2줄 허용

버튼 영역 폭 고정

상태에 따라 버튼만 다르게 표시

지금은 이 방향을 먼저 확정하고,
다음으로는 “행 높이 / 버튼 종류 / 자재명 최대 2줄 처리 방식 / 모바일에서도 유지할지” 정도만 더 상의한 뒤 한꺼번에 코드 가는 게 좋습니다.


업로드한 이미지
자재관리에서 이창이 필요할까?

제 판단은 지금 형태 그대로는 비중이 너무 큽니다.
완전히 없앨지보다, 축소하거나 접는 방식이 더 적절합니다.

이유는 명확합니다.

현재 자재관리의 핵심은 보통

재고 확인

입고 / 사용 처리

수정

이 3개입니다.

그런데 화면 상단에 있는 이 입력창은

자재명

단위

재고수량

단가

메모

저장

으로 구성돼 있어서 “신규 자재 등록” 성격이 강합니다.
즉, 자재관리의 주업무라기보다 가끔 쓰는 기능에 가깝습니다.

그래서 지금처럼 상단에서 크게 자리 잡고 있으면,
사용자 입장에서는 오히려 가장 자주 보는 재고목록 영역이 아래로 밀려서 불편해질 가능성이 큽니다.

제가 보기엔 선택지는 3가지입니다.

1. 완전 제거
신규 자재 등록 기능을 없앰

대신 옵션관리나 별도 화면에서만 등록

이건 조금 위험합니다.
자재 추가는 가끔이라도 꼭 필요한 기능이라 아예 없애는 건 불편할 수 있습니다.

2. 접기/펼치기 방식
기본은 닫힘

+ 자재 추가 버튼 누르면 펼쳐짐

필요할 때만 입력창 사용

이 방식이 가장 좋습니다.
평소에는 재고목록을 넓게 쓰고, 필요할 때만 등록창을 열면 됩니다.

3. 팝업 방식
자재 추가 버튼 클릭

별도 팝업에서 자재 등록

이것도 좋습니다.
다만 지금 작업일지 쪽도 팝업을 많이 쓰고 있으니, 자재관리까지 다 팝업화하면 약간 번거롭게 느껴질 수도 있습니다.

제 판단
현재 구조에서는 “상단 고정 입력창”은 우선순위가 낮습니다.

가장 적절한 방향은:

기본 화면에서는 숨김

자재 추가 버튼으로 펼치기 또는 팝업

메인 화면은 재고 있음 / 재고 없음 목록 중심

이게 가장 실용적입니다.

더 구체적으로 말하면
자재관리 화면의 우선순위는 이렇게 가는 게 맞습니다.

재고 현황 한눈에 보기

입고 / 사용 빠르게 처리

수정

신규 자재 등록

즉, 신규 자재 등록창이 맨 위에서 큰 공간을 차지할 이유는 약합니다.

추천 결론
저는 이렇게 권합니다.

이 창을 없애지는 말고

기본은 접어두기

상단에는 작은 버튼만 두기
예: + 자재 추가

누르면 등록폼 열림

이 방향이면

기능은 유지

화면은 훨씬 깔끔

재고목록 공간 확보

기존 구조도 크게 안 깨짐

지금 단계에서는 “완전 삭제”보다는 “기본 숨김” 쪽이 가장 안전한 판단입니다.


그럼 이것도 팝업형식으로하는건 어때? 번거롭게 느껴져도 이렇게 하는게 가장 깔끔하게 보일거 같은데

그 판단, 맞습니다. 그리고 지금 프로젝트 방향에도 가장 잘 맞습니다.

단순히 “깔끔해 보인다” 수준이 아니라, 현재 구조 기준으로 보면
팝업 방식이 가장 안정적이고 유지보수도 쉬운 구조입니다.

✅ 결론 먼저
👉 자재 등록 = 팝업 전환 → 최적 선택

🔍 왜 팝업이 가장 좋은지 (구조 기준 판단)
1. 현재 UI 흐름과 완전히 일치
이미 작업일지에서

작업 입력 → 팝업

작업계획 → 팝업

이렇게 쓰고 있습니다.

👉 자재까지 팝업으로 맞추면
UI 패턴이 통일됩니다 (중요)

2. 메인 화면 목적이 명확해짐
자재관리 화면의 본질은:

재고 확인

입고 / 사용 처리

👉 등록은 “보조 기능”

지금처럼 상단에 크게 있으면

시선 분산

공간 낭비

리스트 압축됨

팝업으로 빼면:

✔ 메인 = 재고관리
✔ 팝업 = 등록

구조가 명확해집니다.

3. 화면 밀림 문제 완전 해결
지금 문제 중 하나가:

입력폼 때문에 리스트가 아래로 밀림

특히 모바일이나 작은 화면에서 더 심각

👉 팝업이면 이 문제 완전히 제거

4. 확장성 (중요)
앞으로 확실히 생길 기능:

자재 수정

자재 상세 보기

자재 거래 이력

👉 이건 전부 팝업으로 가는 게 맞습니다

지금부터 팝업 구조 잡아두면
나중에 확장할 때 코드 안 뒤집습니다.

⚖️ 단점 (현실적으로)
말씀하신 것처럼:

한 번 더 클릭해야 함

👉 하지만 이건 사용 빈도 낮은 기능이라 문제 없음

🔧 추천 구조 (코드 들어가기 전 확정안)
메인 화면
재고 있음 / 없음 리스트

상단 버튼 하나만

👉 + 자재 추가

팝업 내부
자재명

단위

재고수량

단가

메모

저장 / 취소

👉 현재 입력폼 그대로 이동

UX 디테일 (중요)
이건 같이 확정하면 좋습니다.

팝업 높이: 스크롤 가능

저장 버튼: 하단 고정

ESC 닫기 가능

저장 후:

팝업 닫힘

리스트 자동 갱신

📌 최종 판단
👉 지금 상태에서
상단 입력폼 유지 = 비효율

👉 팝업 전환 = 구조적으로 가장 정답

다음 단계 제안
이제 코드 들어가기 전에 이것만 결정하면 됩니다:

팝업 크기 (작게 vs 크게)

단위 입력 방식 (자유입력 vs 선택)

저장 후 초기화 vs 닫기

이 3개만 정하면
👉 한 번에 완성형 코드 만들 수 있습니다.


팝업크기는 현재차지하고있는크기가 적당할거 같아 단위입력방식은 선택으로 해주고 저장후 팝업창  초기화로 하자 한꺼번에 여러자재를 등록할때도 있으니 그럴때마다 추가버튼을 누르면 너무 번거로울거 같아

좋습니다. 그 방향이 실사용에 더 맞습니다.

정리하면 자재등록 팝업은 이렇게 가면 됩니다.

팝업 크기: 지금 상단 입력창이 차지하던 정도의 크기 유지

단위 입력: 자유입력 말고 선택형

저장 후 동작: 팝업 닫기 아님, 입력값 초기화 후 팝업 유지

이유: 여러 자재를 연속 등록할 때 다시 열 필요 없게

이건 꽤 좋은 판단입니다.
특히 마지막 부분이 중요합니다. 자재는 한 번에 몰아서 등록하는 경우가 있어서, 저장할 때마다 팝업이 닫히면 작업 흐름이 끊깁니다.

다만 여기서 한 가지는 더 같이 판단해두는 게 좋습니다.

저장 후 “완전 초기화” vs “일부 유지”
연속 등록을 생각하면 두 방식이 있습니다.

안 A. 전부 초기화

자재명

단위

재고수량

단가

메모
전부 비움

장점:

새 자재 입력 실수 적음

단점:

같은 단위를 반복 등록할 때 다시 선택해야 함

안 B. 일부 유지

자재명: 초기화

재고수량: 초기화

단가: 초기화

메모: 초기화

단위만 유지

이 방식은 연속 등록에 더 편합니다.
예를 들어 여러 자재를 전부 개 단위로 넣을 때 계속 다시 고를 필요가 없습니다.

제 판단은 단위만 유지하는 방식이 더 좋습니다.

그리고 단위 선택 방식도 같이 조금 다듬는 게 좋습니다.

단위 선택 구조 추천
드롭다운에서 자주 쓰는 것만 보이게:

개

병

통

봉

포

kg

L

ml

말

기타

이 정도면 대부분 커버됩니다.

기타를 넣을지 여부는 판단이 필요합니다.

기타 없음: 데이터 정리가 깔끔함

기타 있음: 예외 상황 대응 쉬움

현재는 안정성 우선이니까,
처음에는 자주 쓰는 단위만 고정 선택으로 가는 게 더 낫습니다.

또 하나 같이 정하면 좋은 부분은 버튼 구성입니다.

팝업 하단 버튼
연속 등록용이면 이렇게 가는 게 좋습니다.

저장

취소 / 닫기

그리고 저장 후에는

성공 메시지 표시

입력값 초기화

팝업은 그대로 유지

목록은 뒤에서 즉시 갱신

이 흐름이면 자연스럽습니다.

지금까지 기준으로 보면 자재등록 팝업 방향은 거의 정리됐습니다.

현재 확정된 방향
자재등록은 팝업

팝업 크기는 현재 입력창 수준

단위는 선택형

저장 후 팝업 닫지 않음

저장 후 초기화해서 연속 입력 가능

제가 추천하는 추가 확정안
초기화 시 단위만 유지

저장 성공 후 목록 자동 갱신

버튼은 저장 / 닫기

메인 화면에는 + 자재 추가 버튼만 노출

이제 거의 코드 들어갈 준비가 됐습니다.
다음으로는 단위 목록을 정확히 어떤 항목으로 둘지만 정하면 한 번에 묶어서 가기 좋습니다.


그러면 너가 추천한대로 하고 코드를 만들자

좋습니다.
이번에는 중간 수정 없이 한 번에 맞는 교체본으로 가려면, 현재 실제 파일 3개가 필요합니다.

올려주세요:

templates/index.html

static/app.js

static/style.css

이유는 간단합니다.
지금은 기존 구조 유지가 최우선이라서, 실제 현재 코드 기준으로 만들어야

자재등록 상단폼 제거

+ 자재 추가 버튼 배치

자재등록 팝업 추가

단위 선택형 적용

저장 후 팝업 유지 + 입력 초기화

단위만 유지

재고 있음 / 재고 없음 표 구조 통일

자재명 넓게, 길면 2줄

단위 / 재고 / 단가 가로 고정

이걸 기존 기능 안 깨고 정확히 넣을 수 있습니다.

파일 주시면 제가 다음 답변에서 바로
index.html 전체 교체본 / style.css 전체 교체본 / app.js 전체 교체본 형태로 정리해서 드리겠습니다.



붙여넣은 텍스트 (1).txt
문서

붙여넣은 텍스트 (2).txt
문서

붙여넣은 텍스트 (3).txt
문서

좋습니다. 파일 확인했고, 지금 상태 기준으로 완성 설계 확정 → 코드 제작 가능 상태입니다.
(구조 유지 잘 되어 있어서 안전하게 수정 가능합니다)

✅ 현재 상태 핵심 분석
자재 입력폼 → index.html에 상단 panel로 존재 


저장 버튼 → btn-save-material 그대로 사용 중 


리스트 → materials-list 아래 렌더링 구조 유지 


👉 즉, 구조는 건드리지 않고 입력 위치만 이동 + UI 변경 하면 됩니다.

✅ 최종 설계 (확정본)
지금부터 코드 그대로 반영할 설계입니다.

1️⃣ 상단 입력창 → 제거
이 부분:

<div class="panel">
  ... 자재 입력폼 ...
</div>
👉 완전히 삭제

2️⃣ 상단에 버튼만 남김
+ 자재 추가
👉 위치:

<h2>자재관리</h2> 옆
3️⃣ 자재등록 → 팝업 생성
(작업일지 팝업 구조 그대로 사용)

구성:

자재명 (input)

단위 (select)

재고수량 (number)

단가 (number)

메모 (input)

버튼: 저장 / 닫기

4️⃣ 단위 선택형 (확정 리스트)
개 / 병 / 통 / 봉 / 포 / kg / L / ml / 말
👉 입력 X
👉 select 고정

5️⃣ 저장 동작 (중요)
현재 로직 유지하면서 동작만 변경

저장 후
API 호출 (기존 그대로)

목록 다시 로드

팝업 유지

입력값 초기화

초기화 규칙
자재명: 초기화

재고수량: 0

단가: 0

메모: 초기화

✅ 단위: 유지

6️⃣ UX 흐름
자재 추가 클릭 → 팝업 열림

입력 → 저장

바로 다음 자재 입력 가능

👉 반복 입력 최적화

7️⃣ 자재 목록 구조 (같이 적용)
이미 얘기한 부분 같이 반영합니다.

재고 있음 / 없음 → 동일 구조

자재명 넓게

단위/재고/단가 → 1줄 고정

자재명 → 최대 2줄

⚠️ 중요한 안정성 체크
이번 작업은:

DB 구조 안 건드림

API 안 건드림

기존 함수 재사용

이벤트 바인딩 유지

👉 즉, 기능 깨질 가능성 거의 없음

🔥 최종 상태 요약
👉 자재관리 화면

상단: + 자재 추가 버튼만

본문: 재고 리스트 (핵심)

입력: 팝업으로 분리

👉 UX

훨씬 깔끔

공간 확보

연속 입력 가능

👉 다음 단계
지금 상태에서 바로 코드 들어갈 수 있습니다.

진행 방식 그대로 갑니다:

index.html → 전체 교체

style.css → 전체 교체

app.js → 전체 교체

👉 진행해도 되면
“코드 만들어줘” 라고만 말해주세요.

(한 번에 완성형으로 드립니다)


단위에 M 도 포함시켜주고 코드 만들어줘


2m 20s 동안 생각함
교체본 만들었습니다.

원래 index.html에는 자재관리 상단에 직접 입력하는 패널이 있었고, app.js는 btn-save-material로 저장한 뒤 값을 비우는 구조였으며, 자재 목록은 재고 있음/없음 두 칸에 같은 표를 그리는 형태였습니다. 이번 교체본은 그 구조를 유지한 채 상단 입력패널을 + 자재 추가 팝업으로 옮기고, 단위를 선택형으로 바꾸고, 저장 후 팝업은 유지하면서 입력값만 초기화되도록 바꿨습니다. 단위 목록에는 요청하신 M도 포함했습니다. 

 

 


파일 3개를 그대로 교체하면 됩니다.

index.html 교체본
app.js 교체본
style.css 교체본

적용 내용은 이렇습니다.

자재관리 상단 입력창 제거

+ 자재 추가 버튼 추가

자재등록 팝업 추가

단위 선택형 변경: 개, 병, 통, 봉, 포, kg, L, ml, 말, M

저장 후 팝업 닫지 않음

저장 후 자재명 / 재고 / 단가 / 메모 초기화

저장 후 단위는 유지

재고 있음 / 재고 없음 표 구조 통일

자재명 넓게 표시, 길면 최대 2줄

단위 / 재고 / 단가 가로 고정

적용 후 이상 있으면 다음엔 그 상태 기준으로 한 번에 이어서 조정하겠습니다.


app.js 교체본 코드로 만들어서 보여줘


생각함
Tmp

(function () { 'use strict';

const state = { currentPage: 'calendar', currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1), selectedDate: null, editingWorkId: null, editingPlanId: null, works: [], plans: [], materials: [], options: { weather: [], crops: [], tasks: [], pests: [], materials: [], machines: [] }, workSearchKeyword: '', selectedMaterialsDetailed: [] };

const el = {};

document.addEventListener('DOMContentLoaded', init);

async function init() { cacheElements(); bindMenu(); bindCalendarButtons(); bindWorkButtons(); bindMaterialButtons(); await loadAll(); renderAll(); }

function cacheElements() { const ids = [ 'page-calendar', 'page-works', 'page-materials', 'page-money', 'page-options', 'page-excel', 'page-backup', 'btn-prev-month', 'btn-next-month', 'calendar-title', 'calendar-grid', 'selected-date-title', 'selected-date-plan-list', 'selected-date-list', 'btn-open-work-from-calendar', 'btn-open-plan-form', 'plan-modal', 'plan-modal-title', 'btn-close-plan-modal', 'plan_date', 'plan_title', 'plan_details', 'plan_status', 'btn-save-plan', 'btn-cancel-plan', 'work-modal', 'work-modal-title', 'btn-close-work-modal', 'btn-new-work', 'start_date', 'end_date', 'weather', 'task_name', 'crops-box', 'pests-box', 'machines-box', 'labor_cost', 'work_hours', 'memo', 'btn-save-work', 'btn-cancel-work', 'works-list', 'btn-open-material-modal', 'material-modal', 'material-modal-title', 'btn-close-material-modal', 'material_name', 'material_unit', 'material_stock', 'material_price', 'material_memo', 'btn-save-material', 'btn-cancel-material', 'materials-list', 'new-weather', 'new-crops', 'new-tasks', 'new-pests', 'new-materials', 'new-machines', 'options-weather', 'options-crops', 'options-tasks', 'options-pests', 'options-materials', 'options-machines', 'material-search-input', 'material-search-results', 'selected-materials-detailed', 'labor-rows-wrap', 'btn-add-labor-row' ];

ids.forEach(id => {
  el[id] = document.getElementById(id);
});

el.menuButtons = Array.from(document.querySelectorAll('.menu-btn[data-page]'));
}

function bindMenu() { el.menuButtons.forEach(btn => { btn.addEventListener('click', () => switchPage(btn.dataset.page)); }); }

function bindCalendarButtons() { on(el['btn-prev-month'], 'click', () => { state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1); renderCalendar(); });

on(el['btn-next-month'], 'click', () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
  renderCalendar();
});

on(el['btn-open-plan-form'], 'click', () => openPlanModal());
on(el['btn-close-plan-modal'], 'click', closePlanModal);
on(el['btn-cancel-plan'], 'click', closePlanModal);
on(el['btn-save-plan'], 'click', savePlan);

on(el['plan-modal'], 'click', (e) => {
  if (e.target === el['plan-modal']) closePlanModal();
});

on(el['btn-open-work-from-calendar'], 'click', () => {
  openWorkModal();
  if (state.selectedDate) {
    el.start_date.value = state.selectedDate;
    el.end_date.value = state.selectedDate;
  }
});
}

function bindWorkButtons() { on(el['btn-new-work'], 'click', () => openWorkModal()); on(el['btn-close-work-modal'], 'click', closeWorkModal); on(el['btn-cancel-work'], 'click', closeWorkModal); on(el['btn-save-work'], 'click', saveWork);

on(el['work-modal'], 'click', (e) => {
  if (e.target === el['work-modal']) closeWorkModal();
});

on(el['material-search-input'], 'input', (e) => {
  renderMaterialSearchResults(e.target.value || '');
});

on(el['btn-add-labor-row'], 'click', () => addLaborRow());
}

function bindMaterialButtons() { on(el['btn-open-material-modal'], 'click', () => openMaterialModal()); on(el['btn-close-material-modal'], 'click', closeMaterialModal); on(el['btn-cancel-material'], 'click', closeMaterialModal); on(el['btn-save-material'], 'click', saveMaterial);

on(el['material-modal'], 'click', (e) => {
  if (e.target === el['material-modal']) closeMaterialModal();
});
}

async function loadAll() { await Promise.all([ loadWorks(), loadPlans(), loadMaterials(), loadOptions() ]); }

async function loadWorks() { try { state.works = await apiGet('/api/works'); } catch (e) { console.error(e); state.works = []; } }

async function loadPlans() { try { state.plans = await apiGet('/api/plans'); } catch (e) { console.error(e); state.plans = []; } }

async function loadMaterials() { try { state.materials = await apiGet('/api/materials'); } catch (e) { console.error(e); state.materials = []; } }

async function loadOptions() { try { const data = await apiGet('/api/options'); state.options.weather = normalizeOptions(data.weather || data.options_weather || []); state.options.crops = normalizeOptions(data.crops || data.options_crops || []); state.options.tasks = normalizeOptions(data.tasks || data.options_tasks || []); state.options.pests = normalizeOptions(data.pests || data.options_pests || []); state.options.materials = normalizeOptions(data.materials || data.options_materials || []); state.options.machines = normalizeOptions(data.machines || data.options_machines || []); } catch (e) { console.error(e); state.options = { weather: [], crops: [], tasks: [], pests: [], materials: [], machines: [] }; } }

function renderAll() { renderMenuState(); renderCalendar(); renderCalendarSidePanel(); renderWorkFormOptions(); renderWorks(); renderMaterials(); renderOptions(); ensureWorksSearchBar(); }

function switchPage(page) { state.currentPage = page; renderMenuState();

const pageMap = {
  calendar: el['page-calendar'],
  works: el['page-works'],
  materials: el['page-materials'],
  money: el['page-money'],
  options: el['page-options'],
  excel: el['page-excel'],
  backup: el['page-backup']
};

Object.entries(pageMap).forEach(([key, node]) => {
  if (!node) return;
  node.classList.toggle('active', key === page);
  node.style.display = key === page ? '' : 'none';
});

if (page === 'calendar') {
  renderCalendar();
  renderCalendarSidePanel();
} else if (page === 'works') {
  renderWorks();
  ensureWorksSearchBar();
} else if (page === 'materials') {
  renderMaterials();
} else if (page === 'options') {
  renderOptions();
}
}

function renderMenuState() { el.menuButtons.forEach(btn => { btn.classList.toggle('active', btn.dataset.page === state.currentPage); }); }

function renderCalendar() { if (!el['calendar-grid']) return;

const year = state.currentMonth.getFullYear();
const month = state.currentMonth.getMonth();
const firstDay = new Date(year, month, 1);
const lastDate = new Date(year, month + 1, 0).getDate();
const startWeekday = firstDay.getDay();

if (el['calendar-title']) {
  el['calendar-title'].textContent = `${year}년 ${month + 1}월`;
}

const html = [];
for (let i = 0; i < startWeekday; i++) {
  html.push(`<div class="calendar-day empty"></div>`);
}

for (let day = 1; day <= lastDate; day++) {
  const dateStr = fmtDate(new Date(year, month, day));
  const planCount = state.plans.filter(p => normalizePlanDate(p.plan_date) === dateStr).length;
  const workCount = state.works.filter(w => isDateInRange(dateStr, w.start_date, w.end_date)).length;
  const selectedClass = state.selectedDate === dateStr ? 'selected' : '';

  html.push(`
    <div class="calendar-day ${selectedClass}" data-date="${escapeHtml(dateStr)}">
      <div class="day-num">${day}</div>
      <div class="day-count">계획 ${planCount}</div>
      <div class="day-count">실적 ${workCount}</div>
    </div>
  `);
}

el['calendar-grid'].innerHTML = html.join('');

el['calendar-grid'].querySelectorAll('[data-date]').forEach(node => {
  node.addEventListener('click', () => {
    state.selectedDate = node.dataset.date;
    renderCalendar();
    renderCalendarSidePanel();
  });
});
}

function renderCalendarSidePanel() { if (!el['selected-date-title'] || !el['selected-date-plan-list'] || !el['selected-date-list']) return;

if (!state.selectedDate) {
  el['selected-date-title'].textContent = '날짜를 선택하세요';
  el['selected-date-plan-list'].innerHTML = '';
  el['selected-date-list'].innerHTML = '';
  addHidden(el['btn-open-plan-form']);
  addHidden(el['btn-open-work-from-calendar']);
  return;
}

el['selected-date-title'].textContent = state.selectedDate;
removeHidden(el['btn-open-plan-form']);
removeHidden(el['btn-open-work-from-calendar']);

const plans = state.plans.filter(p => normalizePlanDate(p.plan_date) === state.selectedDate);
const works = state.works.filter(w => isDateInRange(state.selectedDate, w.start_date, w.end_date));

el['selected-date-plan-list'].innerHTML = plans.length
  ? plans.map(renderPlanCard).join('')
  : `<div class="empty-msg">등록된 계획 없음</div>`;

el['selected-date-list'].innerHTML = works.length
  ? works.map(renderWorkMiniCard).join('')
  : `<div class="empty-msg">등록된 작업실적 없음</div>`;

bindPlanCardActions();
bindWorkMiniActions();
}

function renderPlanCard(plan) { const statusText = ({ planned: '계획', done: '완료', cancelled: '취소' })[plan.status] || plan.status || '계획'; return <div class="day-item plan-item"> <div><strong>${escapeHtml(plan.title || '')}</strong></div> <div>상태: ${escapeHtml(statusText)}</div> <div>${escapeHtml(plan.details || '')}</div> <div class="item-actions"> <button class="btn" data-plan-edit="${escapeHtml(String(plan.id))}">수정</button> <button class="btn" data-plan-done="${escapeHtml(String(plan.id))}">완료</button> <button class="btn" data-plan-work="${escapeHtml(String(plan.id))}">실적전환</button> <button class="btn" data-plan-delete="${escapeHtml(String(plan.id))}">삭제</button> </div> </div> ; }

function renderWorkMiniCard(work) { const meta = parseMemo(work.memo); return <div class="day-item work-item"> <div><strong>${escapeHtml(work.task_name || '')}</strong></div> <div>작물: ${escapeHtml(work.crops || '')}</div> <div>자재: ${escapeHtml(formatMaterials(meta.materials))}</div> <div class="item-actions"> <button class="btn" data-work-edit="${escapeHtml(String(work.id))}">수정</button> <button class="btn" data-work-delete="${escapeHtml(String(work.id))}">삭제</button> </div> </div> ; }

function bindPlanCardActions() { document.querySelectorAll('[data-plan-edit]').forEach(btn => { btn.addEventListener('click', () => editPlan(btn.dataset.planEdit)); }); document.querySelectorAll('[data-plan-done]').forEach(btn => { btn.addEventListener('click', () => markPlanDone(btn.dataset.planDone)); }); document.querySelectorAll('[data-plan-work]').forEach(btn => { btn.addEventListener('click', () => convertPlanToWork(btn.dataset.planWork)); }); document.querySelectorAll('[data-plan-delete]').forEach(btn => { btn.addEventListener('click', () => deletePlan(btn.dataset.planDelete)); }); }

function bindWorkMiniActions() { document.querySelectorAll('[data-work-edit]').forEach(btn => { btn.addEventListener('click', () => openWorkModalById(btn.dataset.workEdit)); }); document.querySelectorAll('[data-work-delete]').forEach(btn => { btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete)); }); }

function openPlanModal(plan = null) { if (!state.selectedDate && !plan) return;

state.editingPlanId = plan ? plan.id : null;
if (el['plan-modal-title']) {
  el['plan-modal-title'].textContent = plan ? '작업계획 수정' : '작업계획 입력';
}

el.plan_date.value = plan ? normalizePlanDate(plan.plan_date) : state.selectedDate;
el.plan_details.value = plan?.details || '';
el.plan_status.value = plan?.status || 'planned';
renderPlanTitleOptions(plan?.title || '');

removeHidden(el['plan-modal']);
}

function closePlanModal() { addHidden(el['plan-modal']); state.editingPlanId = null; if (el.plan_date) el.plan_date.value = ''; if (el.plan_title) el.plan_title.value = ''; if (el.plan_details) el.plan_details.value = ''; if (el.plan_status) el.plan_status.value = 'planned'; }

function renderPlanTitleOptions(selectedValue = '') { if (!el.plan_title) return; const current = selectedValue || el.plan_title.value || ''; el.plan_title.innerHTML = <option value="">선택</option> + state.options.tasks.map(item => { const name = optionName(item); return <option value="${escapeHtml(name)}">${escapeHtml(name)}</option>; }).join(''); setSelectValue(el.plan_title, current); }

async function savePlan() { const payload = { plan_date: el.plan_date.value, title: (el.plan_title.value || '').trim(), details: (el.plan_details.value || '').trim(), status: el.plan_status.value || 'planned' };

if (!payload.plan_date) return alert('계획일을 입력하세요.');
if (!payload.title) return alert('계획 제목을 선택하세요.');

try {
  if (state.editingPlanId) {
    await apiPut(`/api/plans/${state.editingPlanId}`, payload);
  } else {
    await apiPost('/api/plans', payload);
  }
  await loadPlans();
  closePlanModal();
  renderCalendar();
  renderCalendarSidePanel();
} catch (e) {
  console.error(e);
  alert('작업계획 저장 중 오류가 발생했습니다.');
}
}

function editPlan(planId) { const plan = state.plans.find(p => String(p.id) === String(planId)); if (!plan) return; openPlanModal(plan); }

async function markPlanDone(planId) { const plan = state.plans.find(p => String(p.id) === String(planId)); if (!plan) return; try { await apiPut(/api/plans/${plan.id}, { plan_date: normalizePlanDate(plan.plan_date), title: plan.title, details: plan.details || '', status: 'done' }); await loadPlans(); renderCalendar(); renderCalendarSidePanel(); } catch (e) { console.error(e); alert('계획 완료 처리 중 오류가 발생했습니다.'); } }

function convertPlanToWork(planId) { const plan = state.plans.find(p => String(p.id) === String(planId)); if (!plan) return; openWorkModal(); el.start_date.value = normalizePlanDate(plan.plan_date); el.end_date.value = normalizePlanDate(plan.plan_date); setSelectValue(el.task_name, plan.title || ''); el.memo.value = plan.details || ''; }

async function deletePlan(planId) { if (!confirm('이 계획을 삭제하시겠습니까?')) return; try { await apiDelete(/api/plans/${planId}); await loadPlans(); renderCalendar(); renderCalendarSidePanel(); } catch (e) { console.error(e); alert('계획 삭제 중 오류가 발생했습니다.'); } }

function ensureWorksSearchBar() { const page = el['page-works']; if (!page || document.getElementById('works-search-wrap')) return;

const wrap = document.createElement('div');
wrap.id = 'works-search-wrap';
wrap.className = 'panel';
wrap.style.padding = '12px';
wrap.innerHTML = `
  <div class="inline-form" style="margin-bottom:0;">
    <input type="text" id="works-search-input" placeholder="작업내용, 작물, 자재, 메모 검색">
    <button class="btn primary" id="btn-works-search">검색</button>
    <button class="btn" id="btn-works-search-reset">초기화</button>
  </div>
`;

const header = page.querySelector('.page-header');
if (header) header.insertAdjacentElement('afterend', wrap);

const input = document.getElementById('works-search-input');
const btn = document.getElementById('btn-works-search');
const reset = document.getElementById('btn-works-search-reset');

if (input) input.value = state.workSearchKeyword;
on(btn, 'click', () => {
  state.workSearchKeyword = (input?.value || '').trim();
  renderWorks();
});
on(reset, 'click', () => {
  state.workSearchKeyword = '';
  if (input) input.value = '';
  renderWorks();
});
}

function renderWorkFormOptions() { renderSelect(el.weather, state.options.weather, '날씨 선택'); renderSelect(el.task_name, state.options.tasks, '작업내용 선택'); renderChecks(el['crops-box'], state.options.crops); renderChecks(el['pests-box'], state.options.pests); renderChecks(el['machines-box'], state.options.machines); renderPlanTitleOptions(); renderMaterialUnitOptions(); }

function openWorkModal(work = null) { state.editingWorkId = work ? work.id : null; if (el['work-modal-title']) { el['work-modal-title'].textContent = work ? '작업일지 수정' : '새 작업 입력'; }

const meta = parseMemo(work?.memo);

el.start_date.value = work?.start_date ? String(work.start_date).slice(0, 10) : today();
el.end_date.value = work?.end_date ? String(work.end_date).slice(0, 10) : el.start_date.value;
setSelectValue(el.weather, work?.weather || '');
setSelectValue(el.task_name, work?.task_name || '');
checkValues(el['crops-box'], csvToArray(work?.crops || ''));
checkValues(el['pests-box'], csvToArray(work?.pests || ''));
checkValues(el['machines-box'], csvToArray(work?.machine || ''));
el.labor_cost.value = work?.labor_cost || 0;
el.work_hours.value = work?.work_hours || 0;
el.memo.value = meta.memo_text || '';

state.selectedMaterialsDetailed = Array.isArray(meta.materials) ? meta.materials.map(x => ({
  name: x.name || '',
  qty: x.qty ?? '',
  unit: x.unit || getMaterialUnit(x.name || '') || ''
})) : [];

if (el['material-search-input']) el['material-search-input'].value = '';
if (el['material-search-results']) el['material-search-results'].innerHTML = '';
renderSelectedMaterialsDetailed();

renderLaborRows(meta.labor_rows || []);

removeHidden(el['work-modal']);
}

async function openWorkModalById(workId) { const work = state.works.find(item => String(item.id) === String(workId)); if (!work) return; openWorkModal(work); }

function closeWorkModal() { addHidden(el['work-modal']); state.editingWorkId = null; el.start_date.value = today(); el.end_date.value = today(); setSelectValue(el.weather, ''); setSelectValue(el.task_name, ''); uncheckAll(el['crops-box']); uncheckAll(el['pests-box']); uncheckAll(el['machines-box']); el.labor_cost.value = 0; el.work_hours.value = 0; el.memo.value = ''; state.selectedMaterialsDetailed = []; renderSelectedMaterialsDetailed(); if (el['material-search-input']) el['material-search-input'].value = ''; if (el['material-search-results']) el['material-search-results'].innerHTML = ''; renderLaborRows([]); }

function renderLaborRows(rows = []) { const wrap = el['labor-rows-wrap']; if (!wrap) return;

if (!rows.length) {
  rows = [{ name: '', hours: '', cost: '' }];
}

wrap.innerHTML = rows.map((row, index) => `
  <div class="labor-row" data-labor-index="${index}">
    <input type="text" class="labor-name" placeholder="이름" value="${escapeHtml(row.name || '')}">
    <input type="number" class="labor-hours" min="0" step="0.5" placeholder="시간" value="${escapeHtml(row.hours || '')}">
    <input type="number" class="labor-cost" min="0" step="1000" placeholder="금액" value="${escapeHtml(row.cost || '')}">
    <button type="button" class="btn danger btn-remove-labor">삭제</button>
  </div>
`).join('');

wrap.querySelectorAll('.btn-remove-labor').forEach(btn => {
  btn.addEventListener('click', () => {
    const row = btn.closest('.labor-row');
    if (row) row.remove();
    if (!wrap.querySelector('.labor-row')) addLaborRow();
  });
});
}

function addLaborRow() { const wrap = el['labor-rows-wrap']; if (!wrap) return; const index = wrap.querySelectorAll('.labor-row').length; const div = document.createElement('div'); div.className = 'labor-row'; div.dataset.laborIndex = String(index); div.innerHTML = <input type="text" class="labor-name" placeholder="이름"> <input type="number" class="labor-hours" min="0" step="0.5" placeholder="시간"> <input type="number" class="labor-cost" min="0" step="1000" placeholder="금액"> <button type="button" class="btn danger btn-remove-labor">삭제</button> ; wrap.appendChild(div); div.querySelector('.btn-remove-labor')?.addEventListener('click', () => { div.remove(); if (!wrap.querySelector('.labor-row')) addLaborRow(); }); }

function collectLaborRows() { const wrap = el['labor-rows-wrap']; if (!wrap) return []; return Array.from(wrap.querySelectorAll('.labor-row')).map(row => ({ name: (row.querySelector('.labor-name')?.value || '').trim(), hours: (row.querySelector('.labor-hours')?.value || '').trim(), cost: (row.querySelector('.labor-cost')?.value || '').trim() })).filter(item => item.name || item.hours || item.cost); }

function renderMaterialSearchResults(keyword) { const box = el['material-search-results']; if (!box) return; const q = String(keyword || '').trim().toLowerCase(); if (!q) { box.innerHTML = ''; return; }

const filtered = state.materials.filter(item => materialName(item).toLowerCase().includes(q));
if (!filtered.length) {
  box.innerHTML = `<div class="empty-msg">검색 결과 없음</div>`;
  return;
}

box.innerHTML = filtered.map(item => {
  const name = materialName(item);
  const unit = materialUnit(item);
  return `
    <button type="button" class="material-search-item" data-material-name="${escapeHtml(name)}" data-material-unit="${escapeHtml(unit)}">
      <span>${escapeHtml(name)}</span>
      <small>${escapeHtml(unit)}</small>
    </button>
  `;
}).join('');

box.querySelectorAll('.material-search-item').forEach(btn => {
  btn.addEventListener('click', () => addSelectedMaterial(btn.dataset.materialName, btn.dataset.materialUnit));
});
}

function addSelectedMaterial(name, unit) { if (!name) return; const exists = state.selectedMaterialsDetailed.find(item => item.name === name); if (exists) return; state.selectedMaterialsDetailed.push({ name, qty: '', unit: unit || getMaterialUnit(name) || '' }); renderSelectedMaterialsDetailed(); if (el['material-search-input']) el['material-search-input'].value = ''; if (el['material-search-results']) el['material-search-results'].innerHTML = ''; }

function renderSelectedMaterialsDetailed() { const box = el['selected-materials-detailed']; if (!box) return;

if (!state.selectedMaterialsDetailed.length) {
  box.innerHTML = `<div class="empty-msg">선택된 자재 없음</div>`;
  return;
}

box.innerHTML = state.selectedMaterialsDetailed.map((item, idx) => `
  <div class="selected-material-row" data-selected-index="${idx}">
    <div class="selected-material-name">${escapeHtml(item.name)}</div>
    <input type="number" class="selected-material-qty" min="0" step="0.1" placeholder="수량" value="${escapeHtml(item.qty)}">
    <div class="selected-material-unit">${escapeHtml(item.unit)}</div>
    <button type="button" class="btn danger btn-remove-selected-material">삭제</button>
  </div>
`).join('');

box.querySelectorAll('.selected-material-row').forEach(row => {
  const index = Number(row.dataset.selectedIndex);
  const qtyInput = row.querySelector('.selected-material-qty');
  qtyInput?.addEventListener('input', () => {
    state.selectedMaterialsDetailed[index].qty = qtyInput.value;
  });
  row.querySelector('.btn-remove-selected-material')?.addEventListener('click', () => {
    state.selectedMaterialsDetailed.splice(index, 1);
    renderSelectedMaterialsDetailed();
  });
});
}

async function saveWork() { const payload = { start_date: el.start_date.value, end_date: el.end_date.value, weather: el.weather.value, task_name: el.task_name.value, crops: collectChecked(el['crops-box']).join(', '), pests: collectChecked(el['pests-box']).join(', '), machine: collectChecked(el['machines-box']).join(', '), labor_cost: toNumber(el.labor_cost.value), work_hours: toNumber(el.work_hours.value), memo: JSON.stringify({ memo_text: (el.memo.value || '').trim(), materials: state.selectedMaterialsDetailed.filter(item => item.name), labor_rows: collectLaborRows() }) };

if (!payload.start_date) return alert('시작일을 입력하세요.');
if (!payload.end_date) payload.end_date = payload.start_date;
if (!payload.task_name) return alert('작업내용을 선택하세요.');

try {
  if (state.editingWorkId) {
    await apiPut(`/api/works/${state.editingWorkId}`, payload);
  } else {
    await apiPost('/api/works', payload);
  }
  await loadWorks();
  closeWorkModal();
  renderCalendar();
  renderCalendarSidePanel();
  renderWorks();
} catch (e) {
  console.error(e);
  alert('작업 저장 중 오류가 발생했습니다.');
}
}

async function deleteWork(workId) { if (!confirm('이 작업을 삭제하시겠습니까?')) return; try { await apiDelete(/api/works/${workId}); await loadWorks(); renderCalendar(); renderCalendarSidePanel(); renderWorks(); } catch (e) { console.error(e); alert('작업 삭제 중 오류가 발생했습니다.'); } }

function renderWorks() { const list = el['works-list']; if (!list) return;

const keyword = state.workSearchKeyword.trim().toLowerCase();
let works = [...state.works];

if (keyword) {
  works = works.filter(work => {
    const memo = parseMemo(work.memo);
    const haystack = [
      work.start_date,
      work.end_date,
      work.weather,
      work.task_name,
      work.crops,
      work.pests,
      work.machine,
      memo.memo_text,
      formatMaterials(memo.materials)
    ].join(' ').toLowerCase();
    return haystack.includes(keyword);
  });
}

works.sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));

const grouped = new Map();
works.forEach(work => {
  const key = String(work.start_date).slice(0, 10);
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(work);
});

if (!grouped.size) {
  list.classList.remove('cards');
  list.innerHTML = `<div class="panel empty">등록된 작업이 없습니다.</div>`;
  return;
}

list.classList.remove('cards');

list.innerHTML = Array.from(grouped.entries()).map(([date, items]) => {
  const singleClass = items.length === 1 ? 'single-card' : 'multi-card';
  return `
    <div class="work-date-group ${singleClass}">
      <div class="group-date-title">${escapeHtml(date)}</div>
      <div class="work-date-cards ${items.length === 1 ? 'one' : 'many'}">
        ${items.map(work => renderWorkCard(work)).join('')}
      </div>
    </div>
  `;
}).join('');

list.querySelectorAll('[data-work-edit]').forEach(btn => {
  btn.addEventListener('click', () => openWorkModalById(btn.dataset.workEdit));
});
list.querySelectorAll('[data-work-delete]').forEach(btn => {
  btn.addEventListener('click', () => deleteWork(btn.dataset.workDelete));
});
}

function renderWorkCard(work) { const meta = parseMemo(work.memo); const materials = formatMaterials(meta.materials); return <article class="card work-card"> <h3>${escapeHtml(work.task_name || '')}</h3> <div class="meta"> <div><strong>기간:</strong> ${escapeHtml(String(work.start_date).slice(0, 10))} ~ ${escapeHtml(String(work.end_date || work.start_date).slice(0, 10))}</div> <div><strong>날씨:</strong> ${escapeHtml(work.weather || '')}</div> <div><strong>작물:</strong> ${escapeHtml(work.crops || '')}</div> <div><strong>병충해:</strong> ${escapeHtml(work.pests || '')}</div> <div><strong>사용기계:</strong> ${escapeHtml(work.machine || '')}</div> <div><strong>사용자재:</strong> ${escapeHtml(materials || '')}</div> <div><strong>인건비:</strong> ${numberWithComma(work.labor_cost || 0)}원</div> <div><strong>작업시간:</strong> ${escapeHtml(String(work.work_hours || 0))}시간</div> <div><strong>메모:</strong> ${escapeHtml(meta.memo_text || '')}</div> </div> <div class="card-actions"> <button class="btn" data-work-edit="${escapeHtml(String(work.id))}">수정</button> <button class="btn danger" data-work-delete="${escapeHtml(String(work.id))}">삭제</button> </div> </article> ; }

function openMaterialModal() { if (el['material-modal-title']) { el['material-modal-title'].textContent = '자재 추가'; } renderMaterialUnitOptions(); if (!el.material_unit.value) { el.material_unit.value = '개'; } removeHidden(el['material-modal']); el.material_name?.focus(); }

function closeMaterialModal() { addHidden(el['material-modal']); resetMaterialForm(true); }

function renderMaterialUnitOptions() { if (!el.material_unit) return; const units = ['개', '병', '통', '봉', '포', 'kg', 'L', 'ml', '말', 'M']; const current = el.material_unit.value || '개'; el.material_unit.innerHTML = units.map(unit => <option value="${escapeHtml(unit)}">${escapeHtml(unit)}</option>).join(''); setSelectValue(el.material_unit, current); if (!el.material_unit.value) { el.material_unit.value = '개'; } }

function resetMaterialForm(keepUnit = true) { const prevUnit = keepUnit ? (el.material_unit?.value || '개') : '개'; if (el.material_name) el.material_name.value = ''; if (el.material_stock) el.material_stock.value = 0; if (el.material_price) el.material_price.value = 0; if (el.material_memo) el.material_memo.value = ''; renderMaterialUnitOptions(); if (el.material_unit) { el.material_unit.value = prevUnit; } el.material_name?.focus(); }

async function saveMaterial() { const payload = { name: (el.material_name.value || '').trim(), unit: (el.material_unit.value || '').trim(), stock_qty: toNumber(el.material_stock.value), unit_price: toNumber(el.material_price.value), memo: (el.material_memo.value || '').trim() };

if (!payload.name) return alert('자재명을 입력하세요.');
if (!payload.unit) return alert('단위를 선택하세요.');

try {
  await apiPost('/api/materials', payload);
  await loadMaterials();
  renderMaterials();
  resetMaterialForm(true);
  alert('자재가 저장되었습니다.');
} catch (e) {
  console.error(e);
  alert('자재 저장 중 오류가 발생했습니다.');
}
}

function renderMaterials() { const list = el['materials-list']; if (!list) return;

if (!state.materials.length) {
  list.innerHTML = `<div class="empty">등록된 자재가 없습니다.</div>`;
  return;
}

const withStock = state.materials.filter(item => toNumber(item.stock_qty ?? item.재고 ?? 0) > 0);
const emptyStock = state.materials.filter(item => toNumber(item.stock_qty ?? item.재고 ?? 0) <= 0);

list.innerHTML = `
  <div class="material-section-wrap">
    <section class="panel material-stock-panel">
      <div class="material-section-title">재고 있음</div>
      ${renderMaterialTable(withStock, true)}
    </section>
    <section class="panel material-stock-panel">
      <div class="material-section-title">재고 없음</div>
      ${renderMaterialTable(emptyStock, false)}
    </section>
  </div>
`;

list.querySelectorAll('[data-material-stock]').forEach(btn => {
  btn.addEventListener('click', () => adjustMaterialStock(btn.dataset.materialStock, btn.dataset.mode));
});
}

function renderMaterialTable(items, hasStock) { if (!items.length) { return <div class="empty-msg">해당 자재 없음</div>; }

return `
  <div class="material-table-wrap">
    <table class="material-table">
      <thead>
        <tr>
          <th class="col-name">자재명</th>
          <th class="col-unit">단위</th>
          <th class="col-stock">재고</th>
          <th class="col-price">단가</th>
          <th class="col-actions">처리</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => {
          const name = materialName(item);
          const unit = materialUnit(item);
          const stock = toNumber(item.stock_qty ?? item.재고 ?? 0);
          const price = toNumber(item.unit_price ?? item.가격 ?? 0);
          return `
            <tr>
              <td class="material-name-cell">
                <div class="material-name-text">${escapeHtml(name)}</div>
              </td>
              <td class="nowrap-cell">${escapeHtml(unit)}</td>
              <td class="nowrap-cell">${escapeHtml(String(stock))}</td>
              <td class="nowrap-cell">${numberWithComma(price)}원</td>
              <td class="material-action-cell">
                <div class="material-action-buttons">
                  <button class="btn" data-material-stock="${escapeHtml(name)}" data-mode="in">입고</button>
                  ${hasStock ? `<button class="btn danger" data-material-stock="${escapeHtml(name)}" data-mode="out">사용</button>` : ''}
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
`;
}

async function adjustMaterialStock(name, mode) { const item = state.materials.find(m => materialName(m) === name); if (!item) return; const input = prompt(mode === 'in' ? '입고 수량' : '사용 수량', '0'); if (input === null) return; const qty = Number(input); if (!Number.isFinite(qty) || qty < 0) return alert('올바른 수량을 입력하세요.');

const current = toNumber(item.stock_qty ?? item.재고 ?? 0);
const next = mode === 'in' ? current + qty : current - qty;
if (next < 0) return alert('재고가 부족합니다.');

const id = item.id ?? item.material_id ?? materialName(item);
try {
  await apiPut(`/api/materials/${encodeURIComponent(id)}`, {
    name: materialName(item),
    unit: materialUnit(item),
    stock_qty: next,
    unit_price: toNumber(item.unit_price ?? item.가격 ?? 0)
  });
  await loadMaterials();
  renderMaterials();
} catch (e) {
  console.error(e);
  alert('재고 수정 중 오류가 발생했습니다.');
}
}

function renderOptions() { renderOptionList('weather', el['options-weather']); renderOptionList('crops', el['options-crops']); renderOptionList('tasks', el['options-tasks']); renderOptionList('pests', el['options-pests']); renderOptionList('materials', el['options-materials']); renderOptionList('machines', el['options-machines']); }

function renderOptionList(type, container) { if (!container) return; const items = state.options[type] || []; container.innerHTML = items.map(item => { const id = optionId(item); const name = optionName(item); return <div class="panel" style="padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; gap:8px; align-items:center;"> <span>${escapeHtml(name)}</span> <div style="display:flex; gap:6px;"> <button class="btn" data-option-edit="${escapeHtml(type)}|${escapeHtml(String(id))}">수정</button> <button class="btn" data-option-delete="${escapeHtml(type)}|${escapeHtml(String(id))}">삭제</button> </div> </div> ; }).join('');

container.querySelectorAll('[data-option-edit]').forEach(btn => {
  btn.addEventListener('click', () => {
    const [optType, id] = btn.dataset.optionEdit.split('|');
    editOption(optType, id);
  });
});
container.querySelectorAll('[data-option-delete]').forEach(btn => {
  btn.addEventListener('click', () => {
    const [optType, id] = btn.dataset.optionDelete.split('|');
    deleteOption(optType, id);
  });
});
}

window.saveOption = async function (type, inputId) { const input = document.getElementById(inputId); const name = (input?.value || '').trim(); if (!name) return;

try {
  await apiPost(`/api/options/${type}`, { name });
  input.value = '';
  await loadOptions();
  renderOptions();
  renderWorkFormOptions();
} catch (e) {
  console.error(e);
  alert('옵션 저장 중 오류가 발생했습니다.');
}
};

async function editOption(type, id) { const item = (state.options[type] || []).find(opt => String(optionId(opt)) === String(id)); if (!item) return; const name = prompt('옵션명 수정', optionName(item)); if (name === null || !name.trim()) return;

try {
  await apiPut(`/api/options/${type}/${id}`, { name: name.trim() });
  await loadOptions();
  renderOptions();
  renderWorkFormOptions();
} catch (e) {
  console.error(e);
  alert('옵션 수정 중 오류가 발생했습니다.');
}
}

async function deleteOption(type, id) { if (!confirm('이 옵션을 삭제하시겠습니까?')) return; try { await apiDelete(/api/options/${type}/${id}); await loadOptions(); renderOptions(); renderWorkFormOptions(); } catch (e) { console.error(e); alert('옵션 삭제 중 오류가 발생했습니다.'); } }

function renderSelect(select, items, placeholder) { if (!select) return; const current = select.value; select.innerHTML = <option value="">${escapeHtml(placeholder || '선택')}</option> + items.map(item => <option value="${escapeHtml(optionName(item))}">${escapeHtml(optionName(item))}</option>).join(''); setSelectValue(select, current); }

function renderChecks(container, items) { if (!container) return; const selected = collectChecked(container); container.innerHTML = items.map(item => { const name = optionName(item); const id = ${container.id}-${slug(name)}; return <label> <input type="checkbox" id="${escapeHtml(id)}" value="${escapeHtml(name)}" ${selected.includes(name) ? 'checked' : ''}> <span>${escapeHtml(name)}</span> </label> ; }).join(''); }

function collectChecked(container) { if (!container) return []; return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(x => x.value); }

function checkValues(container, values) { renderChecks(container, state.options[mapContainerToOptionKey(container.id)] || []); const set = new Set(values || []); container.querySelectorAll('input[type="checkbox"]').forEach(chk => { chk.checked = set.has(chk.value); }); }

function uncheckAll(container) { if (!container) return; container.querySelectorAll('input[type="checkbox"]').forEach(chk => chk.checked = false); }

function mapContainerToOptionKey(id) { return { 'crops-box': 'crops', 'pests-box': 'pests', 'machines-box': 'machines' }[id] || ''; }

function parseMemo(memo) { if (!memo) return { memo_text: '', materials: [], labor_rows: [] }; try { const obj = typeof memo === 'string' ? JSON.parse(memo) : memo; return { memo_text: obj.memo_text || obj.note || '', materials: Array.isArray(obj.materials) ? obj.materials : [], labor_rows: Array.isArray(obj.labor_rows) ? obj.labor_rows : [] }; } catch { return { memo_text: String(memo), materials: [], labor_rows: [] }; } }

function formatMaterials(materials) { if (!Array.isArray(materials) || !materials.length) return ''; return materials.map(item => ${item.name || ''}${item.qty !== undefined && item.qty !== '' ? ' ' + item.qty : ''}${item.unit || ''}).join(', '); }

function materialName(item) { return item.name ?? item.자재명 ?? ''; }

function materialUnit(item) { return item.unit ?? item.단위 ?? getMaterialUnit(materialName(item)) ?? ''; }

function getMaterialUnit(name) { const material = state.materials.find(item => materialName(item) === name); if (material) return material.unit ?? material.단위 ?? ''; const opt = (state.options.materials || []).find(item => optionName(item) === name); return opt?.unit ?? opt?.단위 ?? ''; }

function optionName(item) { if (typeof item === 'string') return item; return item.name ?? item.value ?? item.label ?? ''; }

function optionId(item) { if (typeof item === 'string') return item; return item.id ?? item.value ?? item.name; }

function normalizeOptions(arr) { return Array.isArray(arr) ? arr : []; }

function normalizePlanDate(v) { if (!v) return ''; return String(v).slice(0, 10); }

function isDateInRange(target, start, end) { const t = String(target).slice(0, 10); const s = String(start || '').slice(0, 10); const e = String(end || start || '').slice(0, 10); return !!s && t >= s && t <= e; }

function csvToArray(value) { return String(value || '').split(',').map(x => x.trim()).filter(Boolean); }

function setSelectValue(select, value) { if (!select) return; const exists = Array.from(select.options).some(opt => opt.value === value); select.value = exists ? value : ''; }

function addHidden(node) { if (node) node.classList.add('hidden'); }

function removeHidden(node) { if (node) node.classList.remove('hidden'); }

function today() { return fmtDate(new Date()); }

function fmtDate(d) { const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return ${y}-${m}-${day}; }

function numberWithComma(value)
