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
    postList.innerHTML = '';
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

        // 현재의 정렬 기준에 따라 퀵정렬을 사용하여 정렬합니다.
        const selectedOption = document.getElementById('sortOptions').value;
        if (selectedOption === 'popular') {
            posts = quickSort(posts, (a, b) => b.likes - a.likes);
        } else if (selectedOption === 'rating') {
            posts = quickSort(posts, (a, b) => b.rating - a.rating);
        } else {
            posts = quickSort(posts, (a, b) => new Date(b.date) - new Date(a.date));
        }
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
    } catch (error) {
        console.error('게시글 로드 중 오류 발생:', error);
        alert('게시글을 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
    getAverageRating(); // 평균 별점 가져오기
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
    loadPosts();
    getAverageRating(); // 평균 별점 가져오기
}

document.getElementById('sortOptions').addEventListener('change', function() {
    sortBy = this.value; // 선택한 정렬 기준으로 설정
    loadPosts(); // 게시글 다시 로드
});

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
    loadPosts();
    getAverageRating(); // 평균 별점 가져오기
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
    loadPosts();
    getAverageRating(); // 평균 별점 가져오기
}

async function deletePost(postId) {
    // 사용자에게 삭제 확인 요청
    const confirmDelete = confirm('정말로 이 게시글을 삭제하시겠습니까?');
    if (!confirmDelete) {
        return; // 사용자가 취소를 선택하면 함수 종료
    }

    try {
        const response = await fetch(`/api/ratings/${postId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.status === 403) {
            // 권한 없음 에러 처리
            const errorData = await response.json();
            alert(errorData.message); // "삭제 권한이 없습니다." 메시지 표시
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            alert(errorData.message || '게시글 삭제 중 오류가 발생했습니다.');
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        alert('게시글이 성공적으로 삭제되었습니다.');
        loadPosts();
    } catch (error) {
        console.error('게시글 삭제 중 오류 발생:', error);
        alert('게시글 삭제 중 문제가 발생했습니다. 다시 시도해주세요.');
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

// 검색 기능
function filterPosts() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const posts = document.querySelectorAll('#postList li');

    posts.forEach(post => {
        const title = post.querySelector('h3').textContent.toLowerCase();
        const content = post.querySelector('.author') ? post.querySelector('.author').textContent.toLowerCase() : '';
        if (title.includes(searchInput) || content.includes(searchInput)) {
            post.style.display = 'block';
        } else {
            post.style.display = 'none';
        }
    });
}




function showContent(postId) {
    // 필요 시 구현
}

function closeContentModal() {
    contentModal.style.display = 'none';
}

//우선 백업
// // rating.js
// //다시 board.js처럼 연결되도록 수정한 버전
// let currentBoard = 1;
// const boards = {
//     1: '명진당',
//     2: '학생회관',
//     3: '교직원 식당',
//     4: '복지동 식당'
// };

// const postList = document.getElementById('postList');
// const postModal = document.getElementById('postModal');
// const contentModal = document.getElementById('contentModal');
// const postContentDiv = document.getElementById('postContent');
// const postForm = document.getElementById('postForm');
// let editingPost = null;
// let selectedPostId = null;
// let sortBy = 'latest';
// let currentUserId = null;


// // 사용자 정보 가져오기
// async function getUserProfile() {
//     try {
//         const response = await fetch('/api/user/profile', {
//             credentials: 'include',
//         });
//         if (response.ok) {
//             const data = await response.json();
//             currentUser = data.user;
//         } else {
//             // 로그인되지 않은 경우 로그인 페이지로 이동
//             window.location.href = '/login.html';
//         }
//     } catch (error) {
//         console.error('사용자 정보를 불러오는 중 오류 발생:', error);
//         window.location.href = '/login.html';
//     }
// }

// document.addEventListener("DOMContentLoaded", function () {
//     navigateToBoard(1); // 기본적으로 '명진당'으로 설정
//     document.getElementById('sortOptions').value = 'latest';
//     updateDateTime();
//     setInterval(updateDateTime, 1000);  // 1초마다 날짜/시간 업데이트

//     document.getElementById('newPostBtn').onclick = function () {
//         postModal.style.display = 'block';
//         postForm.reset();
//         editingPost = null;

//         const menuDescriptions = {
//             1: "명진당 메뉴: 기사식당돼지불백",
//             2: "학생회관 메뉴: 불맛나가사끼짬뽕",
//             3: "교직원 식당 메뉴: 제육볶음",
//             4: "복지동 식당 메뉴: 김치돈육조림"
//         };
//         const menuDescription = menuDescriptions[currentBoard] || "메뉴 정보 없음";
//         const menuElement = document.createElement('p');
//         menuElement.textContent = menuDescription;
//         menuElement.classList.add('menu-description');

//         const ratingDiv = postModal.querySelector('.rating');
//         const existingMenuDescription = postModal.querySelector('.menu-description');
//         if (existingMenuDescription) {
//             existingMenuDescription.remove();
//         }
//         ratingDiv.insertAdjacentElement('beforebegin', menuElement);
//     };

//     getUserProfile(); // 사용자 정보 가져오기
// });

// function navigateToBoard(boardNumber) {
//     const restaurantNames = {
//         1: '명진당',
//         2: '학생회관',
//         3: '교직원 식당',
//         4: '복지동 식당'
//     };
//     const restaurantName = restaurantNames[boardNumber] || `식당 ${boardNumber}`;
//     currentBoard = boardNumber;
//     document.querySelector('h2').textContent = `${restaurantName} 평가`;
//     loadPosts();
// }

// function updateDateTime() {
//     const now = new Date();
//     const options = { 
//         month: 'long', 
//         day: 'numeric', 
//         weekday: 'long', 
//         hour: '2-digit', 
//         minute: '2-digit',
//         hour12: false 
//     };
//     const datetimeString = now.toLocaleString('ko-KR', options);
//     document.getElementById('datetime').textContent = datetimeString;
// }

// function closeModal() {
//     postModal.style.display = 'none';
// }

// postForm.onsubmit = async function (event) {
//     event.preventDefault();
//     const content = document.getElementById('content').value;
//     const ratingValue = 6 - parseInt(document.querySelector('input[name="rating"]:checked').value);

//     const menuDescriptions = {
//         1: "명진당 메뉴: 기사식당돼지불백",
//         2: "학생회관 메뉴: 불맛나가사끼짬뽕",
//         3: "교직원 식당 메뉴: 제육볶음",
//         4: "복지동 식당 메뉴: 김치돈육조림"
//     };
//     const title = menuDescriptions[currentBoard] || "메뉴 정보 없음";



//     const post = { 
//         title, 
//         content, 
//         rating: ratingValue, // 숫자로 저장
//         board: currentBoard,
//     };

//     try {
//         await fetch('/api/ratings', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(post)
//         });
//         closeModal();
//         loadPosts();
//     } catch (error) {
//         console.error('게시글 작성 중 오류 발생:', error);
//     }
// };


// async function loadPosts() {
//     postList.innerHTML = '';
//     try {
//         const response = await fetch(`/api/ratings?board=${currentBoard}`, {
//             credentials: 'include'
//         });
//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }
//         let posts = await response.json();

//         // 현재의 정렬 기준에 따라 정렬합니다.
//         const selectedOption = document.getElementById('sortOptions').value;
//         if (selectedOption === 'popular') {
//             posts.sort((a, b) => b.likes - a.likes);
//         } else if (selectedOption === 'rating') {
//             posts.sort((a, b) => b.rating - a.rating);
//         } else {
//             posts.sort((a, b) => new Date(b.date) - new Date(a.date));
//         }

//         posts.forEach((post) => {
//             const postDate = new Date(post.date);
//             const formattedDate = `${postDate.getFullYear()}-${String(postDate.getMonth() + 1).padStart(2, '0')}-${String(postDate.getDate()).padStart(2, '0')}`;
        
//             li.innerHTML = `
//                 <h3>${post.title}</h3>
//                 <p class="author">작성자: ${post.authorName || '알 수 없음'} | 작성일: ${formattedDate}</p>
//                 <div id="postContentContainer">
//                     <p id="postContent">${post.content}</p>
//                 </div>
//                 <p id="postRating">별점: ${'★'.repeat(post.rating)}${'☆'.repeat(5 - post.rating)}</p>
//                 <button onclick="likePost('${post._id}')">추천 (${post.likes})</button>
//                 <button onclick="dislikePost('${post._id}')">비추천 (${post.dislikes})</button>
//                 ${post.authorId === currentUser._id ? `<button onclick="deletePost('${post._id}')">삭제</button>` : ''}
//             `;
//             postList.appendChild(li);
//         });
        
//     } catch (error) {
//         console.error('게시글 로드 중 오류 발생:', error);
//     }
// }

// function sortPosts() {
//     loadPosts(); // 정렬 옵션 변경 시 게시글 다시 로드
// }

// async function likePost(postId) {
//     try {
//         await fetch(`/api/ratings/${postId}/like`, {
//             method: 'POST',
//             credentials: 'include'
//         });
//         loadPosts();
//     } catch (error) {
//         console.error('추천 중 오류 발생:', error);
//     }
// }

// async function dislikePost(postId) {
//     try {
//         await fetch(`/api/ratings/${postId}/dislike`, {
//             method: 'POST',
//             credentials: 'include'
//         });
//         loadPosts();
//     } catch (error) {
//         console.error('비추천 중 오류 발생:', error);
//     }
// }

// async function deletePost(postId) {
//     try {
//         const response = await fetch(`/api/ratings/${postId}`, {
//             method: 'DELETE',
//             credentials: 'include'
//         });

//         if (response.status === 403) {
//             const errorData = await response.json();
//             alert(errorData.message); // "삭제 권한이 없습니다." 메시지 표시
//             return;
//         }

//         if (!response.ok) {
//             throw new Error(`HTTP error! status: ${response.status}`);
//         }

//         alert('게시글이 성공적으로 삭제되었습니다.');
//         loadPosts();
//     } catch (error) {
//         console.error('게시글 삭제 중 오류 발생:', error);
//         alert('게시글 삭제 중 문제가 발생했습니다. 다시 시도해주세요.');
//     }
// }


// function logout() {
//     // 로그아웃 요청 보내기
//     fetch('/api/user/logout', {
//         method: 'POST',
//         credentials: 'include'
//     })
//     .then(response => {
//         if (response.ok) {
//             alert('로그아웃되었습니다.');
//             window.location.href = '/login.html';
//         } else {
//             throw new Error('로그아웃 실패');
//         }
//     })
//     .catch(error => {
//         console.error('로그아웃 중 오류 발생:', error);
//     });
// }

// function goHome() {
//     window.location.href = "index.html"; 
// }

// function filterPosts() {
//     const searchInput = document.getElementById('searchInput').value.toLowerCase();
//     const posts = document.querySelectorAll('#postList li');

//     posts.forEach(post => {
//         const title = post.querySelector('h3').textContent.toLowerCase();
//         const content = post.querySelector('.author') ? post.querySelector('.author').textContent.toLowerCase() : '';
//         if (title.includes(searchInput) || content.includes(searchInput)) {
//             post.style.display = 'block';
//         } else {
//             post.style.display = 'none';
//         }
//     });
// }

// function showContent(postId) {
//     // 필요 시 구현
// }

// function closeContentModal() {
//     contentModal.style.display = 'none';
// }

// document.getElementById('sortOptions').addEventListener('change', sortPosts);