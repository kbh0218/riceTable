// rating.js
let currentBoard = 1;
const boards = {
    1: '명진당',
    2: '학생회관',
    3: '교직원 식당',
    4: '복지동 식당'
};

const postList = document.getElementById('postList');
const postModal = document.getElementById('postModal');
const contentModal = document.getElementById('contentModal');
const postContentDiv = document.getElementById('postContent');
const postForm = document.getElementById('postForm');
let selectedPostId = null;
let sortBy = 'latest';
let currentUser = null; // 현재 로그인한 사용자 정보 저장
let cachedPosts = []; // 게시글 캐시에 저장
let titleIndex = {}; // 제목 인덱스
let contentIndex = {}; // 내용 인덱스

// 퀵정렬 함수 구현
function quickSort(arr, compareFunc) {
    if (arr.length <= 1) {
        return arr;
    }
    const pivotIndex = Math.floor(arr.length / 2);
    const pivot = arr[pivotIndex];
    const less = [];
    const more = [];
    for (let i = 0; i < arr.length; i++) {
        if (i === pivotIndex) continue;
        if (compareFunc(arr[i], pivot) < 0) {
            less.push(arr[i]);
        } else {
            more.push(arr[i]);
        }
    }
    return [...quickSort(less, compareFunc), pivot, ...quickSort(more, compareFunc)];
}

// 평균 별점 가져오기
async function getAverageRating() {
    try {
        const response = await fetch(`/api/ratings/average?board=${currentBoard}`, {
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const avgRating = data.averageRating;
        displayAverageRating(avgRating);
    } catch (error) {
        console.error('평균 별점 로드 중 오류 발생:', error);
    }
}

// 평균 별점 표시
function displayAverageRating(avgRating) {
    const avgRatingElement = document.getElementById('averageRating');
    if (avgRatingElement) {
        avgRatingElement.textContent = `평균 별점: ${avgRating.toFixed(1)} / 5`;
    } else {
        console.error('Average rating element not found in HTML.');
    }
}

// 사용자 정보 가져오기
async function getUserProfile() {
    try {
        const response = await fetch('/api/user/profile', {
            method: 'GET',
            credentials: 'include', // 쿠키를 포함하여 요청
        });
        const data = await response.json();
        if (data.success) {
            currentUser = data.user;
        } else {
            alert('로그인이 필요합니다.');
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('사용자 정보를 불러오는 중 오류 발생:', error);
        alert('오류가 발생했습니다. 다시 시도해 주세요.');
    }
}

function navigateToBoard(boardId) {
    currentBoard = boardId;
    document.querySelector('h2').textContent = `${boards[boardId]} 평가`;
    loadPosts();
    getAverageRating(); // 평균 별점 가져오기
}

// 페이지 로드 시 게시글 로딩 및 사용자 정보 가져오기
window.onload = function() {
    (async () => {
        await getUserProfile();
        navigateToBoard(currentBoard);

        // 정렬 버튼 클릭 이벤트 리스너 추가
        document.getElementById('sortBtn').addEventListener('click', function() {
            sortBy = document.getElementById('sortOptions').value;
            if (document.getElementById('searchInput').value.trim()) {
                filterPosts(); // 검색어가 있으면 검색 결과를 정렬
            } else {
                sortAndDisplayPosts(cachedPosts); // 검색어가 없으면 전체 게시글을 정렬
            }
        });

        // 검색 버튼 클릭 이벤트 리스너 추가
        document.getElementById('searchBtn').addEventListener('click', function() {
            filterPosts();
        });
    })();
};

// 평가 작성 버튼 클릭 시: 제한 없이 모달만 띄움
document.getElementById('newPostBtn').onclick = function () {
    postModal.style.display = 'block';
    postForm.reset();

    // 메뉴 설명 표시
    const menuDescriptions = {
        1: "명진당 메뉴: 기사식당돼지불백",
        2: "학생회관 메뉴: 불맛나가사끼짬뽕",
        3: "교직원 식당 메뉴: 제육볶음",
        4: "복지동 식당 메뉴: 김치돈육조림"
    };
    const menuDescription = menuDescriptions[currentBoard] || "메뉴 정보 없음";
    const menuElement = document.createElement('p');
    menuElement.textContent = menuDescription;
    menuElement.classList.add('menu-description');

    const ratingDiv = postModal.querySelector('.rating');
    const existingMenuDescription = postModal.querySelector('.menu-description');
    if (existingMenuDescription) {
        existingMenuDescription.remove();
    }
    ratingDiv.insertAdjacentElement('beforebegin', menuElement);
};

// 시간 출력 함수
document.addEventListener("DOMContentLoaded", function() {
    updateDateTime();
    setInterval(updateDateTime, 1000);  // 실시간 날짜/시간 업데이트
});

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

function closeModal() {
    postModal.style.display = 'none';
}

// 업로드 버튼 클릭 시 평가 가능 여부 확인 및 데이터 전송
postForm.onsubmit = async function (event) {
    event.preventDefault(); // 폼 기본 동작 방지

    // 확인 창 띄우기
    const confirmSubmit = confirm('하루에 한번만 평가할 수 있습니다. 제출하시겠습니까?');
    if (!confirmSubmit) {
        return; // 사용자가 취소를 선택하면 진행 중단
    }

    // 평가 가능 여부 확인
    try {
        const response = await fetch(`/api/ratings/checkUserRatingToday?board=${currentBoard}`, {
            method: 'GET',
            credentials: 'include'
        });

        const data = await response.json();
        if (data.hasSubmittedToday) {
            alert('하루에 한번씩만 평가할 수 있습니다.');
            return; // 작성 중단
        }
    } catch (error) {
        console.error('사용자 평가 확인 중 오류 발생:', error);
        alert('오류가 발생했습니다. 다시 시도해 주세요.');
        return;
    }

    // 평가 데이터 전송
    const content = document.getElementById('content').value;
    const ratingValue = 6 - parseInt(document.querySelector('input[name="rating"]:checked').value);

    const menuDescriptions = {
        1: "명진당 메뉴: 기사식당돼지불백",
        2: "학생회관 메뉴: 불맛나가사끼짬뽕",
        3: "교직원 식당 메뉴: 제육볶음",
        4: "복지동 식당 메뉴: 김치돈육조림"
    };
    const title = menuDescriptions[currentBoard] || "메뉴 정보 없음";

    const post = { 
        title, 
        content, 
        rating: ratingValue, // 숫자로 저장
        board: currentBoard
    };

    try {
        const uploadResponse = await fetch('/api/ratings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(post),
            credentials: 'include' // 인증 정보를 포함하여 요청
        });

        if (uploadResponse.ok) {
            alert('평가가 성공적으로 업로드되었습니다.');
            closeModal();
            loadPosts();
        } else {
            const errorData = await uploadResponse.json();
            alert(errorData.message || '게시글 작성 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('게시글 작성 중 오류 발생:', error);
        alert('게시글 작성 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
    getAverageRating(); // 평균 별점 가져오기
};

async function loadPosts() {
    try {
        const response = await fetch(`/api/ratings?board=${currentBoard}`, {
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let data = await response.json();
        
        // 데이터 구조에 따라 ratings 필드 사용 여부 확인
        let posts = data.ratings || data; // 백엔드에 따라 조정 필요

        // 인덱스 초기화
        titleIndex = {};
        contentIndex = {};

        // 인덱스 생성 및 게시글 캐시에 저장
        posts.forEach(post => {
            // 제목 인덱스 생성
            let titleWords = post.title.split(/\s+/);
            titleWords.forEach(word => {
                word = word.toLowerCase();
                if (!titleIndex[word]) {
                    titleIndex[word] = [];
                }
                titleIndex[word].push(post);
            });

            // 내용 인덱스 생성
            let contentWords = post.content.split(/\s+/);
            contentWords.forEach(word => {
                word = word.toLowerCase();
                if (!contentIndex[word]) {
                    contentIndex[word] = [];
                }
                contentIndex[word].push(post);
            });
        });

        cachedPosts = posts;

        sortAndDisplayPosts(cachedPosts);
        getAverageRating(); // 평균 별점 가져오기
    } catch (error) {
        console.error('게시글 로드 중 오류 발생:', error);
        alert('게시글을 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

// 게시글 정렬 및 표시
function sortAndDisplayPosts(posts) {
    const selectedOption = document.getElementById('sortOptions').value;
    let sortedPosts = posts.slice(); // 복사본 생성

    if (selectedOption === 'popular') {
        sortedPosts = quickSort(sortedPosts, (a, b) => b.likes - a.likes);
    } else if (selectedOption === 'rating') {
        sortedPosts = quickSort(sortedPosts, (a, b) => b.rating - a.rating);
    } else {
        sortedPosts = quickSort(sortedPosts, (a, b) => new Date(b.date) - new Date(a.date));
    }

    displayPosts(sortedPosts);
}

// 게시글 표시 함수
function displayPosts(posts) {
    postList.innerHTML = '';
    posts.forEach((post) => {
        const postDate = new Date(post.date);
        const formattedDate = `${postDate.getFullYear()}-${String(postDate.getMonth() + 1).padStart(2, '0')}-${String(postDate.getDate()).padStart(2, '0')}`;

        const li = document.createElement('li');
        li.innerHTML = `
            <h3>${post.title}</h3>
            <p class="author">작성자: ${post.authorName || '알 수 없음'} | 작성일: ${formattedDate}</p>
            <div id="postContentContainer">
                <p id="postContent">${post.content}</p>
            </div>
            <p id="postRating">별점: ${'★'.repeat(post.rating)}${'☆'.repeat(5 - post.rating)}</p>
            <button onclick="likePost('${post._id}')">추천 (${post.likes})</button>
            <button onclick="dislikePost('${post._id}')">비추천 (${post.dislikes})</button>
            <button onclick="deleteRating('${post._id}')" style="margin-left: 10px;">삭제</button>
        `;
        postList.appendChild(li);
    });
}

// 삭제 함수 추가
async function deleteRating(id) {
    if (!id) {
        alert('삭제할 평가의 ID가 없습니다.');
        return;
    }

    const confirmDelete = confirm('정말로 이 평가를 삭제하시겠습니까?');
    if (!confirmDelete) {
        return;
    }

    try {
        const response = await fetch(`/api/ratings/${id}`, {
            method: 'DELETE',
            credentials: 'include' // 로그인된 사용자 정보를 포함
        });

        if (response.status === 403) {
            const errorData = await response.json();
            alert(errorData.message); // "삭제 권한이 없습니다." 메시지 표시
            return;
        }

        if (response.status === 404) {
            const errorData = await response.json();
            alert(errorData.message); // "평가를 찾을 수 없습니다." 메시지 표시
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        alert('평가가 성공적으로 삭제되었습니다.');
        loadPosts(); // 삭제 후 목록을 다시 로드
    } catch (error) {
        console.error('평가 삭제 중 오류 발생:', error);
        alert('평가 삭제 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
    getAverageRating(); // 평균 별점 가져오기
}

async function likePost(postId) {
    try {
        const response = await fetch(`/api/ratings/${postId}/like`, {
            method: 'POST',
            credentials: 'include'
        });
        if (response.ok) {
            loadPosts();
        } else {
            const errorData = await response.json();
            alert(errorData.message || '추천 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('추천 중 오류 발생:', error);
        alert('추천 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

async function dislikePost(postId) {
    try {
        const response = await fetch(`/api/ratings/${postId}/dislike`, {
            method: 'POST',
            credentials: 'include'
        });
        if (response.ok) {
            loadPosts();
        } else {
            const errorData = await response.json();
            alert(errorData.message || '비추천 중 오류가 발생했습니다.');
        }
    } catch (error) {
        console.error('비추천 중 오류 발생:', error);
        alert('비추천 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
}

function logout() {
    // 로그아웃 요청 보내기
    fetch('/api/user/logout', {
        method: 'POST',
        credentials: 'include'
    })
    .then(response => {
        if (response.ok) {
            alert('로그아웃되었습니다.');
            window.location.href = '/login.html';
        } else {
            throw new Error('로그아웃 실패');
        }
    })
    .catch(error => {
        console.error('로그아웃 중 오류 발생:', error);
        alert('로그아웃 중 오류가 발생했습니다. 다시 시도해주세요.');
    });
}

function goHome() {
    window.location.href = "index.html"; 
}

function filterPosts() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const searchOption = document.getElementById('searchOptions').value;

    if (!searchTerm) {
        // 검색어가 없으면 모든 게시글을 표시
        sortAndDisplayPosts(cachedPosts);
        return;
    }

    // 검색어가 있으면, cachedPosts에서 제목이나 내용에 검색어가 포함된 게시글 필터링
    let matchedPosts = cachedPosts.filter(post => {
        let fieldToSearch = '';
        if (searchOption === 'title') {
            fieldToSearch = post.title.toLowerCase();
        } else {
            fieldToSearch = post.content.toLowerCase();
        }
        return fieldToSearch.includes(searchTerm);
    });

    // 현재의 정렬 기준에 따라 정렬
    sortAndDisplayPosts(matchedPosts);
}
function closeContentModal() {
    contentModal.style.display = 'none';
}