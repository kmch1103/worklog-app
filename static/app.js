
// === 백업/복구 기능 추가 ===

// 백업 다운로드
function downloadBackup(){
    try{
        const data = {
            works: state.works,
            plans: state.plans,
            materials: state.materials,
            favorites: JSON.parse(localStorage.getItem('worklog_favorite_works_v1')||'[]'),
            backup_date: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "worklog_backup_" + new Date().toISOString().slice(0,10) + ".json";
        a.click();

        URL.revokeObjectURL(url);

        alert("백업 파일 다운로드 완료");
    }catch(e){
        alert("백업 실패: " + e.message);
    }
}

// 복구 업로드
function uploadBackup(file){
    const reader = new FileReader();

    reader.onload = async function(e){
        try{
            const data = JSON.parse(e.target.result);

            if(!confirm("기존 데이터가 덮어씌워집니다. 계속할까요?")) return;

            // 서버 저장
            if(data.works){
                for(const w of data.works){
                    await apiPost("/api/works", w);
                }
            }

            if(data.materials){
                for(const m of data.materials){
                    await apiPost("/api/materials", m);
                }
            }

            if(data.plans){
                for(const p of data.plans){
                    await apiPost("/api/plans", p);
                }
            }

            // 즐겨찾기 복구
            if(data.favorites){
                localStorage.setItem("worklog_favorite_works_v1", JSON.stringify(data.favorites));
            }

            alert("복구 완료. 새로고침 합니다.");
            location.reload();

        }catch(err){
            alert("복구 실패: " + err.message);
        }
    };

    reader.readAsText(file);
}

// 파일 선택 연결
function bindBackupButtons(){
    const downloadBtn = document.getElementById("btn-backup-download");
    const uploadInput = document.getElementById("backup-file-input");

    if(downloadBtn){
        downloadBtn.addEventListener("click", downloadBackup);
    }

    if(uploadInput){
        uploadInput.addEventListener("change", (e)=>{
            const file = e.target.files[0];
            if(file) uploadBackup(file);
        });
    }
}

// init에 추가
document.addEventListener("DOMContentLoaded", ()=>{
    setTimeout(bindBackupButtons, 500);
});
