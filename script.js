// --- 1. БИБЛИОТЕКА СУДОКУ ---
const allBoards = {
    "2026-07-13": {
        puzzle: [[5,3,0,0,7,0,0,0,0], [6,0,0,1,9,5,0,0,0], [0,9,8,0,0,0,0,6,0], [8,0,0,0,6,0,0,0,3], [4,0,0,8,0,3,0,0,1], [7,0,0,0,2,0,0,0,6], [0,6,0,0,0,0,2,8,0], [0,0,0,4,1,9,0,0,5], [0,0,0,0,8,0,0,7,9]],
        solution: [[5,3,4,6,7,8,9,1,2], [6,7,2,1,9,5,3,4,8], [1,9,8,3,4,2,5,6,7], [8,5,9,7,6,1,4,2,3], [4,2,6,8,5,3,7,9,1], [7,1,3,9,2,4,8,5,6], [9,6,1,5,3,7,2,8,4], [2,8,7,4,1,9,6,3,5], [3,4,5,2,8,6,1,7,9]]
    }
};

const today = new Date().toISOString().split('T')[0];
const boardData = allBoards[today] || allBoards["2026-07-13"];
const board = boardData.puzzle;

// Инициализация локального прогресса
const savedDate = localStorage.getItem('sudokuDate');
if (savedDate !== today) {
    localStorage.removeItem('sudokuProgress');
    localStorage.setItem('sudokuDate', today);
}

let currentBoard = JSON.parse(localStorage.getItem('sudokuProgress')) || JSON.parse(JSON.stringify(board));

// --- 2. РАБОТА С СУДОКУ ---
function createBoard() {
    const boardElement = document.getElementById('sudoku-board');
    if (!boardElement) return;
    
    boardElement.innerHTML = '';
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const input = document.createElement('input');
            input.type = 'number';
            
            if (currentBoard[row][col] !== 0) input.value = currentBoard[row][col];
            
            if (board[row][col] !== 0) {
                input.disabled = true;
                input.style.backgroundColor = '#f0f0f0';
            } else {
                input.addEventListener('input', function() {
                    if (this.value.length > 1) this.value = this.value.slice(0, 1);
                    const val = this.value ? parseInt(this.value) : 0;
                    currentBoard[row][col] = val;
                    localStorage.setItem('sudokuProgress', JSON.stringify(currentBoard));
                    
                    const newScore = calculateScore();
                    updateScoreUI(newScore);
                    
                    // Если вошли в аккаунт — сохраняем прогресс на сервере
                    saveProgressToServer(currentBoard, newScore);
                });
            }
            boardElement.appendChild(input);
        }
    }
    updateScoreUI(calculateScore());
}

function calculateScore() {
    let score = 0;
    const sol = boardData.solution;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0 && currentBoard[r][c] === sol[r][c]) {
                score += 10;
            }
        }
    }
    return score;
}

function updateScoreUI(score) {
    const scoreEl = document.getElementById('sudoku-score');
    if (scoreEl) scoreEl.innerText = score;
}

// --- 3. НАВИГАЦИЯ ПО САЙТУ ---
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
        document.querySelector(this.getAttribute('href') + '-view').classList.add('active');
    });
});

// --- 4. ЭЛЕМЕНТЫ МОДАЛКИ И АВТОРИЗАЦИИ ---
const authModal = document.getElementById('authModal');
const openAuthBtn = document.getElementById('openAuthBtn');
const closeAuthBtn = document.getElementById('closeAuthBtn');
const logoutBtn = document.getElementById('logoutBtn');

const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Открытие/Закрытие модалки
if (openAuthBtn) openAuthBtn.addEventListener('click', () => authModal.classList.add('active'));
if (closeAuthBtn) closeAuthBtn.addEventListener('click', () => authModal.classList.remove('active'));

authModal.addEventListener('click', (e) => {
    if (e.target === authModal) authModal.classList.remove('active');
});

// Табы Вход / Регистрация
tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
});

tabRegisterBtn.addEventListener('click', () => {
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
});

// --- 5. ЛОГИКА АВТОРИЗАЦИИ С СЕРВЕРОМ ---

// Проверка: вошел ли пользователь?
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    const guestProfile = document.getElementById('guest-profile');
    const userProfile = document.getElementById('user-profile');
    const userNickname = document.getElementById('user-nickname');

    if (token && username) {
        // Если авторизован
        if (guestProfile) guestProfile.style.display = 'none';
        if (userProfile) userProfile.style.display = 'block';
        if (userNickname) userNickname.innerText = username;
        
        // Загружаем сохраненные с сервера очки/прогресс
        loadProgressFromServer();
    } else {
        // Если гость
        if (guestProfile) guestProfile.style.display = 'block';
        if (userProfile) userProfile.style.display = 'none';
    }
}

// Отправка РЕГИСТРАЦИИ на сервер
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok && data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', username);
            authModal.classList.remove('active');
            checkAuthStatus();
            alert('Регистрация прошла успешно!');
        } else {
            alert(data.message || 'Ошибка регистрации');
        }
    } catch (err) {
        alert('Не удалось связаться с сервером');
    }
});

// Отправка ВХОДА на сервер
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok && data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('username', username);
            authModal.classList.remove('active');
            checkAuthStatus();
            alert(`Добро пожаловать, ${username}!`);
        } else {
            alert(data.message || 'Неверный логин или пароль');
        }
    } catch (err) {
        alert('Не удалось связаться с сервером');
    }
});

// ВЫХОД из аккаунта
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        checkAuthStatus();
    });
}

// --- 6. СИНХРОНИЗАЦИЯ ПРОГРЕССА С СЕРВЕРОМ ---

async function saveProgressToServer(boardState, score) {
    const token = localStorage.getItem('token');
    if (!token) return; // Гостям на сервер не сохраняем

    try {
        await fetch('/api/sudoku/progress', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ progress: { board: boardState, score: score } })
        });
    } catch (err) {
        console.error('Ошибка сохранения на сервер:', err);
    }
}

async function loadProgressFromServer() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('/api/sudoku/progress', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401 || response.status === 403) {
            // Если токен просрочен — разлогиниваем
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            checkAuthStatus();
            return;
        }

        const data = await response.json();
        if (data.progress && data.progress.board) {
            currentBoard = data.progress.board;
            localStorage.setItem('sudokuProgress', JSON.stringify(currentBoard));
            createBoard(); // Перерисовываем доску с данными сервера
        }
    } catch (err) {
        console.error('Ошибка загрузки с сервера:', err);
    }
}

// Запуск при старте
createBoard();
checkAuthStatus();