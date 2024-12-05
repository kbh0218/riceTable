// board.js

let currentBoard = 1;
const boards = {
    1: '명진당',
    2: '학생회관',
    3: '복지동식당',
    4: '교직원식당'
};

const postList = document.getElementById('postList');
const postModal = document.getElementById('postModal');
const contentModal = document.getElementById('contentModal'); // 글의 내용 모달
const postContentDiv = document.getElementById('postContent'); // 글의 내용 표시 영역
const postForm = document.getElementById('postForm');
let selectedPostId = null; // 선택한 게시글 ID 저장
let sortBy = 'latest'; // 'latest', 'likes', 'title' 중 하나
let currentUser = null; // 현재 로그인한 사용자 정보 저장
let cachedPosts = []; // 캐시된 게시글 목록
let postIndex = {}; // 해시 테이블 (검색을 위한 인덱스)

//퀵 정렬 함수 구현
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
    document.querySelector('h2').textContent = `${boards[boardId]} 게시판`;
    loadPosts();
}

// 페이지 로드 시 게시글 로딩 및 이벤트 리스너 설정
window.onload = function() {
    getUserProfile();
    navigateToBoard(currentBoard);
    
    // 정렬 버튼 클릭 이벤트 리스너 추가
    document.getElementById('sortBtn').addEventListener('click', function() {
        const sortSelect = document.getElementById('sortOptions');
        sortBy = sortSelect.value;

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
};

document.getElementById('newPostBtn').onclick = function () {
    postModal.style.display = 'block';
    postForm.reset();
};

function closeModal() {
    postModal.style.display = 'none';
}

postForm.onsubmit = async function (event) {
    event.preventDefault();
    const title = document.getElementById('title').value;
    const content = document.getElementById('content').value;

    const post = { 
        title, 
        content, 
        board: currentBoard
        // 작성자 정보는 서버에서 처리
    };

    try {
        await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(post),
            credentials: 'include' // 인증 정보를 포함하여 요청
        });
        closeModal();
        loadPosts();
    } catch (error) {
        console.error('게시글 작성 중 오류 발생:', error);
    }
};

async function loadPosts() {
    try {
        const response = await fetch(`/api/posts?board=${currentBoard}`, {
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        let posts = await response.json();

        if (!Array.isArray(posts)) {
            throw new Error('Posts 데이터가 배열이 아닙니다.');
        }

        // 날짜 필드명을 MongoDB 스키마에 따라 변경
        const dateField = 'createdAt';

        // 현재의 정렬 기준에 따라 퀵정렬을 사용하여 정렬합니다.
        if (sortBy === 'title') {
            posts = quickSort(posts, (a, b) => a.title.localeCompare(b.title));
        } else if (sortBy === 'likes') {
            posts = quickSort(posts, (a, b) => b.likes - a.likes);
        } else if (sortBy === 'latest') {
            posts = quickSort(posts, (a, b) => new Date(b[dateField]) - new Date(a[dateField]));
        }

        // 해시 테이블 생성 (검색을 위한 인덱스 구축)
        titleIndex = {}; // 기존 인덱스 초기화
        contentIndex = {};

        posts.forEach(post => {
            // 제목을 단어로 분리하여 titleIndex에 추가
            let titleWords = post.title.split(/\s+/);
            titleWords.forEach(word => {
                word = word.toLowerCase();
                if (!titleIndex[word]) {
                    titleIndex[word] = [];
                }
                // 동일한 게시글이 중복 추가되지 않도록 확인
                if (!titleIndex[word].includes(post)) {
                    titleIndex[word].push(post);
                }
            });

            // 내용을 단어로 분리하여 contentIndex에 추가
            let contentWords = post.content.split(/\s+/);
            contentWords.forEach(word => {
                word = word.toLowerCase();
                if (!contentIndex[word]) {
                    contentIndex[word] = [];
                }
                if (!contentIndex[word].includes(post)) {
                    contentIndex[word].push(post);
                }
            });
        });

        // 게시글 캐시에 저장
        cachedPosts = posts;

        sortAndDisplayPosts(posts);
        // 게시글을 화면에 표시합니다.
        displayPosts(posts);
    } catch (error) {
        console.error('게시글 로드 중 오류 발생:', error);
    }
}


function displayPosts(posts) {
    postList.innerHTML = '';
    posts.forEach((post) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <h3 class="post-title">${post.title}</h3>
            <p>${post.content}</p>
            <p>작성자: ${post.authorName || '알 수 없음'}</p>
            <p>좋아요 수: ${post.likes}</p>
            <button onclick="openCommentModal('${post._id}'); event.stopPropagation();">댓글 보기</button>
        `;
        li.onclick = function() {
            showPostContent(post._id);
        };
        postList.appendChild(li);
    });
}

// 정렬 및 게시글 표시 함수
function sortAndDisplayPosts(posts) {
    const dateField = 'createdAt';
    let sortedPosts = posts.slice();

    if (sortBy === 'title') {
        sortedPosts = quickSort(sortedPosts, (a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'likes') {
        sortedPosts = quickSort(sortedPosts, (a, b) => b.likes - a.likes);
    } else if (sortBy === 'latest') {
        sortedPosts = quickSort(sortedPosts, (a, b) => new Date(b[dateField]) - new Date(a[dateField]));
    }

    displayPosts(sortedPosts);
}

// 정렬 옵션 변경 시 이벤트 핸들러 주석처리
// document.getElementById('sortOptions').addEventListener('change', function() {
//     sortBy = this.value;
//     if (document.getElementById('searchInput').value.trim()) {
//         filterPosts();
//     } else {
//         sortAndDisplayPosts(cachedPosts);
//     }
// });

async function showPostContent(id) {
    try {
        const response = await fetch(`/api/posts/${id}`, {
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const post = await response.json();

        // 사용자별로 좋아요를 누른 게시글 목록을 가져옵니다.
        let likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || [];
        const isLiked = likedPosts.includes(post._id);

        selectedPostId = id; // 선택한 게시글 ID 저장

        // 모달 내용 설정
        postContentDiv.innerHTML = `
            <h2>${post.title}</h2>
            <p>${post.content}</p>
            <p>작성자: ${post.authorName || '알 수 없음'}</p>
            <p>좋아요 수: ${post.likes}</p>
        `;

        // 좋아요 버튼 설정
        const likeButton = document.getElementById('likeButton');
        likeButton.textContent = isLiked ? '좋아요 취소' : '좋아요';
        likeButton.onclick = function() {
            likePost(post._id);
        };

        contentModal.style.display = 'block'; // 모달 표시
    } catch (error) {
        console.error('게시글 불러오기 중 오류 발생:', error);
    }
}

function closeContentModal() {
    contentModal.style.display = 'none';
}

async function likePost(id) {
    let likedPosts = JSON.parse(localStorage.getItem('likedPosts')) || [];
    const isLiked = likedPosts.includes(id);

    try {
        await fetch(`/api/posts/${id}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ like: !isLiked }),
            credentials: 'include'
        });

        // 좋아요 상태 업데이트
        if (isLiked) {
            likedPosts = likedPosts.filter(postId => postId !== id);
        } else {
            likedPosts.push(id);
        }
        localStorage.setItem('likedPosts', JSON.stringify(likedPosts));

        showPostContent(id); // 게시글 다시 로드
    } catch (error) {
        console.error('좋아요 토글 중 오류 발생:', error);
    }
}

async function deletePost(id) {
    if (!id) {
        id = selectedPostId;
    }

    // 삭제 확인 메시지 표시
    const confirmDelete = confirm('정말로 이 게시글을 삭제하시겠습니까?');
    if (!confirmDelete) {
        return; // 사용자가 취소를 선택하면 함수 종료
    }

    try {
        const response = await fetch(`/api/posts/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.status === 403) {
            // 권한 없음 에러 처리
            const errorData = await response.json();
            alert(errorData.message); // "게시글을 지울 권한이 없습니다." 표시
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        alert('게시글이 성공적으로 삭제되었습니다.');
        closeContentModal();
        loadPosts(); // 게시글 목록 새로고침
    } catch (error) {
        console.error('게시글 삭제 중 오류 발생:', error);
        alert('게시글 삭제 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}


function goHome() {
    window.location.href = '/'; // 홈으로 이동
}

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

// 댓글 보기 모달 열기
function openCommentModal(postId) {
    console.log('열린 게시글 ID:', postId); // 디버깅을 위해 추가
    if (!postId || postId.length !== 24) {
        console.error('유효하지 않은 게시글 ID:', postId);
        alert('잘못된 게시글입니다. 다시 시도해주세요.');
        return;
    }

    selectedPostId = postId; // 선택된 게시글 ID 저장
    loadComments(postId); // 해당 게시글의 댓글 로드
    const commentModal = document.getElementById('commentModal'); // 댓글 모달 엘리먼트 가져오기
    commentModal.style.display = 'block'; // 댓글 모달 열기 block에서 flex로 수정
}

// 댓글 모달 닫기
function closeCommentModal() {
    const commentModal = document.getElementById('commentModal'); // 댓글 모달 엘리먼트 가져오기
    commentModal.style.display = 'none'; // 댓글 모달 닫기
}

async function loadComments(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}`, {
            credentials: 'include'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const post = await response.json();
        console.log('로드된 게시글:', post); // 디버깅용

        const commentsDiv = document.getElementById('comments');
        commentsDiv.innerHTML = ''; // 기존 댓글 초기화

        post.comments.forEach((comment) => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment'; // 댓글 스타일 클래스 추가

            commentElement.innerHTML = `
                <div class="comment-header">
                    <button class="delete-button" onclick="deleteComment('${comment._id}')">삭제</button>
                </div>
                <div class="comment-content">
                    <p><strong>${comment.authorName}:</strong> ${comment.content}</p>
                </div>
            `;
            commentsDiv.appendChild(commentElement);
        });
    } catch (error) {
        console.error('댓글 로드 중 오류 발생:', error);
    }
}

// 댓글 추가 이벤트 핸들러 추가
const commentForm = document.getElementById('commentForm');
commentForm.onsubmit = async function(event) {
    event.preventDefault(); // 폼 제출 시 페이지 새로고침 방지
    const content = document.getElementById('commentInput').value;

    if (!content) {
        alert('댓글 내용을 입력해주세요.');
        return;
    }

    try {
        await fetch(`/api/posts/${selectedPostId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content }),
            credentials: 'include'
        });
        document.getElementById('commentInput').value = ''; // 입력 필드 초기화
        loadComments(selectedPostId); // 댓글 목록 다시 로드
    } catch (error) {
        console.error('댓글 추가 중 오류 발생:', error);
    }
};


// 댓글 삭제 함수 수정
async function deleteComment(commentId) {
    if (!confirm('정말로 댓글을 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/api/posts/${selectedPostId}/comments/${commentId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.status === 403) {
            const errorData = await response.json();
            alert(errorData.message); // "삭제 권한이 없습니다." 메시지 표시
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        alert('댓글이 성공적으로 삭제되었습니다.');
        loadComments(selectedPostId); // 댓글 목록 다시 로드
    } catch (error) {
        console.error('댓글 삭제 중 오류 발생:', error);
        alert('댓글 삭제 중 문제가 발생했습니다. 다시 시도해주세요.');
    }
}

// 검색 기능 구현 (해시 테이블을 이용한 검색)
function filterPosts() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const searchOption = document.getElementById('searchOptions').value;

    if (!searchTerm) {
        // 검색어가 없으면 모든 게시글을 표시
        sortAndDisplayPosts(cachedPosts);
        return;
    }

    // 검색어를 공백 기준으로 분리하여 배열로 만듦
    const searchWords = searchTerm.split(/\s+/);

    // 중복 게시글을 방지하기 위해 Set 사용
    let matchedPostsSet = new Set();

    // 선택한 검색 옵션에 따라 적절한 인덱스를 사용
    let indexToUse = searchOption === 'title' ? titleIndex : contentIndex;

    searchWords.forEach(word => {
        if (indexToUse[word]) {
            indexToUse[word].forEach(post => {
                matchedPostsSet.add(post);
            });
        }
    });

    // Set을 배열로 변환
    let matchedPosts = Array.from(matchedPostsSet);

    // 현재의 정렬 기준에 따라 정렬
    sortAndDisplayPosts(matchedPosts);
}