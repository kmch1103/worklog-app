
function debugFavoriteSave(){
    try {
        alert("1단계: localStorage 접근 테스트 시작");
        localStorage.setItem("test_key", "ok");
        alert("2단계: localStorage 저장 성공");

        let test = localStorage.getItem("test_key");
        if(test !== "ok"){
            alert("❌ localStorage 읽기 실패");
            return;
        }

        alert("3단계: 즐겨찾기 배열 생성");
        let arr = JSON.parse(localStorage.getItem("favorite_works") || "[]");

        alert("4단계: 템플릿 생성 시도");
        let template = { test: "ok" }; // 최소 구조

        arr.push(template);
        localStorage.setItem("favorite_works", JSON.stringify(arr));

        alert("5단계: 저장 완료");
    } catch(e){
        alert("❌ 오류 발생: " + e.message);
    }
}
