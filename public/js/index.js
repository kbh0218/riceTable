import { CampusRestaurants } from "./linkedList.js";

window.showBoard = showBoard;
window.showRating = showRating;
window.showLogin = showLogin;
window.showSignup = showSignup;
window.goToMyPage = goToMyPage;
window.logout = logout;
window.goHome = goHome;
window.openPopup = openPopup;
window.closePopup = closePopup;
window.submitResponse = submitResponse;
window.closePopupOnOutsideClick = closePopupOnOutsideClick;
let currentRestaurantId; // 현재 선택된 식당 ID

const restaurantOperatingHours = {
   1: { // 명진당
       start: "11:30",
       end: "14:30"
   },
   2: { // 학생회관
       start: "10:00",
       end: "15:00"
   },
   3: { // 교직원 식당
       start: "11:30",
       end: "13:30"
   },
   4: { // 복지동 식당
       start: "11:30",
       end: "13:30"
   }
};

// 페이지 로드 시 초기화
document.addEventListener("DOMContentLoaded", function() {
   // 메뉴 초기화
   const campus = new CampusRestaurants();
   
   // 메뉴 데이터 설정
   campus.addMenu('myungJinDang', '기사식당돼지불백', 5500, [
       '김치우동장국',
       '동그랑땡*케찹',
       '고추장아찌',
       '배추김치*쌀밥',
       '요구르트'
   ]);

   campus.addMenu('studentHall', '불맛나가사끼짬뽕', 4500, []);

   campus.addMenu('facultyHall', '제육볶음', 6000, [
       '잡곡밥/쌀밥',
       '미역국',
       '고구마맛탕',
       '콩나물무침',
       '깍두기',
       '샐러드&드레싱',
       '요구르트'
   ]);

   campus.addMenu('welfare', '김치돈육조림', 5000, [
       '백미밥',
       '미역국',
       '메추리알곤조림',
       '고사리나물',
       '깍두기'
   ]);

   // 메뉴 정보 표시
   updateMenuDisplay(campus.getAllTodayMenus());
   
   // 시간 업데이트 시작
   updateDateTime();
   setInterval(updateDateTime, 1000);

   // 팝업 외부 클릭 시 닫기 이벤트 추가
   document.getElementById('popup').addEventListener('click', closePopupOnOutsideClick);

   // 로그인 상태 확인
   const isLoggedIn = getCookie('isLoggedIn');
   const authButtons = document.getElementById('auth-buttons');
   const userButtons = document.getElementById('user-buttons');

   if (!authButtons || !userButtons) {
       console.error('auth-buttons 또는 user-buttons 요소를 찾을 수 없습니다.');
       return;
   }

   if (isLoggedIn === 'true') {
       document.getElementById('auth-buttons').style.display = 'none';
       document.getElementById('user-buttons').style.display = 'block';
   } else {
       document.getElementById('auth-buttons').style.display = 'block';
       document.getElementById('user-buttons').style.display = 'none';
   }
});

function updateMenuDisplay(menus) {
    const restaurantBoxes = document.querySelectorAll('.restaurant-box');

    restaurantBoxes.forEach((box, index) => {
        const menuInfo = box.querySelector('.menu-info');
        if (!menuInfo) return;

        const restaurantKey = ['myungJinDang', 'studentHall', 'facultyHall', 'welfare'][index];
        const menu = menus[restaurantKey];

        if (menu) {
            menuInfo.innerHTML = `
                <table class="menu-table">
                    <tr>
                        <td class="menu-label">메인메뉴</td>
                        <td class="menu-value">${menu.name}</td>
                    </tr>
                    <tr>
                        <td class="menu-label">가격</td>
                        <td class="menu-value">${menu.price}원</td>
                    </tr>
                    <tr>
                        <td class="menu-label">반찬</td>
                        <td class="menu-value">${menu.sideDishes.join(', ')}</td>
                    </tr>
                </table>
            `;
        } else {
            menuInfo.textContent = "오늘의 메뉴가 없습니다";
        }
    });
}

// 실시간 날짜/시간 업데이트
function updateDateTime() {
   const now = new Date();
   const options = { 
       month: 'long', 
       day: 'numeric', 
       weekday: 'long', 
       hour: '2-digit', 
       minute: '2-digit',
       hour12: false 
   };
   const datetimeString = now.toLocaleString('ko-KR', options);
   document.getElementById('datetime').textContent = datetimeString;
}

function openPopup(restaurantId) {
   currentRestaurantId = restaurantId;
   const popup = document.getElementById('popup');
   popup.style.display = 'flex';
   document.getElementById('popup-title').innerText = getRestaurantName(restaurantId);

   const timeSlotForm = document.getElementById('timeSlotForm');
   timeSlotForm.innerHTML = '';
   const timeSlots = getTimeSlots(restaurantId);

   fetch(`/api/surveys/${currentRestaurantId}`)
       .then(response => response.json())
       .then(data => {
           const dateStr = getTodayDateString();

           let row;
           timeSlots.forEach((slot, index) => {
               let count = 0;
               if (data[dateStr] && data[dateStr][slot]) {
                   count = data[dateStr][slot];
               }

               if (index % 4 === 0) {
                   row = document.createElement('div');
                   row.classList.add('button-row');
                   timeSlotForm.appendChild(row);
               }

               const button = document.createElement('button');
               button.classList.add('time-slot-button');
               button.innerText = `${slot} (${count}명)`;
               button.dataset.value = slot;

               button.addEventListener('click', function() {
                   const previouslySelected = timeSlotForm.querySelector('.time-slot-button.selected');
                   if (previouslySelected && previouslySelected !== button) {
                       previouslySelected.classList.remove('selected');
                   }
                   button.classList.toggle('selected');
               });

               row.appendChild(button);
           });

           updateVoteCount(data);
       })
       .catch(error => {
           console.error('데이터를 불러오는 중 오류 발생:', error);
       });
}

function submitResponse() {
   const selectedButton = document.querySelector('.time-slot-button.selected');
   if (!selectedButton) {
       alert('시간대를 선택해주세요.');
       return;
   }
   const timeSlot = selectedButton.dataset.value;

   const confirmVote = confirm('하루에 한번만 투표할 수 있습니다. 투표하시겠습니까?');
   if (!confirmVote) {
       return;
   }

   const dateStr = getTodayDateString();

   fetch('/api/surveys/vote', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       credentials: 'include',
       body: JSON.stringify({
           restaurantId: currentRestaurantId,
           date: dateStr,
           timeSlot: timeSlot
       })
   })
   .then(response => {
       if (!response.ok) {
           if (response.status === 400) {
               return response.json().then(data => {
                   alert(data.message);
               });
           }
           throw new Error(`HTTP error! status: ${response.status}`);
       }
       return response.json();
   })
   .then(data => {
       updateVoteCount(data);
       closePopup();
       alert('투표가 완료되었습니다.')
   })
   .catch(error => {
       console.error('투표 저장 중 오류 발생:', error);
       alert('투표 저장 중 오류가 발생했습니다. 다시 시도해주세요.');
   });
}

function updateVoteCount(data) {
   const dateStr = getTodayDateString();
   let totalCount = 0;
   if (data[dateStr]) {
       const timeSlots = data[dateStr];
       for (let slot in timeSlots) {
           totalCount += timeSlots[slot];
       }
   }
   document.getElementById('voteCount').innerText = 
       `${getRestaurantName(currentRestaurantId)} 체크 인원: ${totalCount}명`;
}

function getTodayDateString() {
   const now = new Date();
   return now.toISOString().split('T')[0];
}

function getTimeSlots(restaurantId) {
   const operatingHours = restaurantOperatingHours[restaurantId];
   const [startHour, startMinute] = operatingHours.start.split(':').map(Number);
   const [endHour, endMinute] = operatingHours.end.split(':').map(Number);

   const start = new Date();
   start.setHours(startHour, startMinute, 0, 0);

   const end = new Date();
   end.setHours(endHour, endMinute, 0, 0);

   let slots = [];
   let current = new Date(start);
   while (current < end) {
       let next = new Date(current);
       next.setMinutes(current.getMinutes() + 15);
       let slotLabel = current.toTimeString().substr(0,5);
       slots.push(slotLabel);
       current = next;
   }
   return slots;
}

function getRestaurantName(restaurantId) {
   const restaurantNames = {
       1: '명진당',
       2: '학생회관',
       3: '교직원 식당',
       4: '복지동 식당'
   };
   return restaurantNames[restaurantId] || `식당 ${restaurantId}`;
}

function getOperatingHours(restaurantId) {
   const operatingHours = {
       1: "운영시간 : 11:30 ~ 14:30",
       2: "운영시간 : 10:00 ~ 15:00",
       3: "운영시간 : 11:30 ~ 13:30",
       4: "운영시간 : 11:30 ~ 13:30"
   };
   return operatingHours[restaurantId] || "운영 시간 정보 없음";
}

function closePopup() {
   document.getElementById('popup').style.display = 'none';
}

function closePopupOnOutsideClick(event) {
   const popupContent = document.querySelector('.popup-content');
   if (!popupContent.contains(event.target)) {
       closePopup();
   }
}

function goHome() {
   window.location.href = '/index.html';
}

function showBoard() {
   const isLoggedIn = getCookie('isLoggedIn');
   if (isLoggedIn !== 'true') {
       alert('로그인 후 이용할 수 있습니다.');
       window.location.href = '/login.html';
   } else {
       window.location.href = '/board.html';
   }
}

function showRating() {
   const isLoggedIn = getCookie('isLoggedIn');
   if (isLoggedIn !== 'true') {
       alert('로그인 후 이용할 수 있습니다.');
       window.location.href = '/login.html';
   } else {
       window.location.href = '/rating.html';
   }
}

function showLogin() {
   window.location.href = '/login';
}

function showSignup() {
   window.location.href = '/register';
}

function goToMyPage() {
   window.location.href = '/mypage.html';
}

function getCookie(name) {
   const value = `; ${document.cookie}`;
   const parts = value.split(`; ${name}=`);
   if (parts.length === 2) return parts.pop().split(';').shift();
}

function logout() {
   document.cookie = 'token=; Max-Age=0; path=/';
   document.cookie = 'isLoggedIn=; Max-Age=0; path=/';
   alert("로그아웃 되었습니다!");
   location.reload();
}