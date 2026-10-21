// Инициализация VK Bridge для работы в экосистеме VK
if (window.vkBridge) {
  vkBridge.send('VKWebAppInit');
}

// Вспомогательная вибрация при взаимодействии
function triggerHaptic() {
  if (window.vkBridge) {
    vkBridge.send('VKWebAppTapticImpactOccurred', { style: 'light' }).catch(() => {});
  }
}

const SVG_X = `
  <svg viewBox="0 0 100 100" stroke-width="12" stroke-linecap="round">
    <line x1="20" y1="20" x2="80" y2="80" />
    <line x1="80" y1="20" x2="20" y2="80" />
  </svg>
`;

const SVG_O = `
  <svg viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="32" stroke-width="12" fill="none" />
  </svg>
`;

// Состояние приложения
const state = {
  theme: localStorage.getItem('theme') || 'light',
  firstMove: localStorage.getItem('firstMove') || 'player', // 'player' | 'opponent' | 'random'
  board: Array(9).fill(null),
  isGameActive: false,
  currentPlayer: 'X', // 'X' - игрок, 'O' - бот
  isAiTurn: false
};

// Победные комбинации
const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

// DOM-элементы
const screens = {
  menu: document.getElementById('screen-menu'),
  game: document.getElementById('screen-game'),
  settings: document.getElementById('screen-settings'),
  about: document.getElementById('screen-about')
};

const statusText = document.getElementById('status-text');
const cells = document.querySelectorAll('.cell');
const modal = document.getElementById('game-modal');
const modalIcon = document.getElementById('modal-icon');
const modalTitle = document.getElementById('modal-title');

// Навигация по экранам
function showScreen(screenName) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[screenName].classList.add('active');
  modal.classList.remove('active');
}

// Применение темы
function applyTheme(theme) {
  state.theme = theme;
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  document.querySelectorAll('#control-theme .segmented-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === theme);
  });
}

// Применение настроек первого хода
function applyFirstMove(choice) {
  state.firstMove = choice;
  localStorage.setItem('firstMove', choice);
  
  document.querySelectorAll('#control-first-move .segmented-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === choice);
  });
}

// Старт новой игры
function startNewGame() {
  state.board = Array(9).fill(null);
  state.isGameActive = true;
  modal.classList.remove('active');

  cells.forEach(cell => {
    cell.innerHTML = ''; // Очищаем SVG внутри ячеек
    cell.className = 'cell';
  });

  let startingPlayer = state.firstMove;
  if (startingPlayer === 'random') {
    startingPlayer = Math.random() < 0.5 ? 'player' : 'opponent';
  }

  showScreen('game');

  if (startingPlayer === 'player') {
    state.currentPlayer = 'X';
    state.isAiTurn = false;
    statusText.textContent = 'Ваш ход (X)';
  } else {
    state.currentPlayer = 'O';
    state.isAiTurn = true;
    statusText.textContent = 'Ход соперника (O)...';
    setTimeout(makeAiMove, 600);
  }
}

// Завершение и сброс текущей игры
function resetGame() {
  state.isGameActive = false;
  state.board = Array(9).fill(null);
  showScreen('menu');
}

// Проверка исхода
function checkGameStatus(board) {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo };
    }
  }
  if (board.every(cell => cell !== null)) {
    return { winner: 'draw' };
  }
  return null;
}

// Обработка клика по ячейке
function handleCellClick(e) {
  const index = Number(e.currentTarget.dataset.index);

  if (!state.isGameActive || state.isAiTurn || state.board[index] !== null) {
    return;
  }

  triggerHaptic();
  executeMove(index, 'X');

  const status = checkGameStatus(state.board);
  if (status) {
    handleGameOver(status);
    return;
  }

  state.isAiTurn = true;
  state.currentPlayer = 'O';
  statusText.textContent = 'Ход соперника (O)...';
  setTimeout(makeAiMove, 500);
}

// Установка символа на поле
function executeMove(index, player) {
  state.board[index] = player;
  cells[index].innerHTML = player === 'X' ? SVG_X : SVG_O;
  cells[index].classList.add(player.toLowerCase());
}

// Логика бота (блокировка игрока или победный ход + случайный выбор)
function makeAiMove() {
  if (!state.isGameActive) return;

  const emptyIndices = state.board
    .map((val, idx) => (val === null ? idx : null))
    .filter(val => val !== null);

  if (emptyIndices.length === 0) return;

  let chosenMove = null;

  // 1. Проверяем, может ли бот выиграть текущим ходом
  for (const idx of emptyIndices) {
    const tempBoard = [...state.board];
    tempBoard[idx] = 'O';
    if (checkGameStatus(tempBoard)?.winner === 'O') {
      chosenMove = idx;
      break;
    }
  }

  // 2. Блокируем победу игрока
  if (chosenMove === null) {
    for (const idx of emptyIndices) {
      const tempBoard = [...state.board];
      tempBoard[idx] = 'X';
      if (checkGameStatus(tempBoard)?.winner === 'X') {
        chosenMove = idx;
        break;
      }
    }
  }

  // 3. Занимаем центр, если свободен
  if (chosenMove === null && emptyIndices.includes(4)) {
    chosenMove = 4;
  }

  // 4. Случайный ход из оставшихся
  if (chosenMove === null) {
    chosenMove = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  }

  executeMove(chosenMove, 'O');
  triggerHaptic();

  const status = checkGameStatus(state.board);
  if (status) {
    handleGameOver(status);
    return;
  }

  state.isAiTurn = false;
  state.currentPlayer = 'X';
  statusText.textContent = 'Ваш ход (X)';
}

// Окно окончания партии
function handleGameOver(result) {
  state.isGameActive = false;

  if (result.winner === 'X') {
    modalIcon.textContent = '🎉';
    modalTitle.textContent = 'Поздравляем с победой!';
    statusText.textContent = 'Победа!';
  } else if (result.winner === 'O') {
    modalIcon.textContent = '😔';
    modalTitle.textContent = 'Вы проиграли...';
    statusText.textContent = 'Поражение';
  } else {
    modalIcon.textContent = '🤝';
    modalTitle.textContent = 'Ничья!';
    statusText.textContent = 'Ничья';
  }

  modal.classList.add('active');
}

// Слушатели событий
document.getElementById('btn-start').addEventListener('click', startNewGame);
document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings'));
document.getElementById('btn-about').addEventListener('click', () => showScreen('about'));

document.getElementById('btn-game-back').addEventListener('click', resetGame);
document.getElementById('btn-settings-back').addEventListener('click', () => showScreen('menu'));
document.getElementById('btn-about-back').addEventListener('click', () => showScreen('menu'));
document.getElementById('btn-about-ok').addEventListener('click', () => showScreen('menu'));

document.getElementById('btn-modal-restart').addEventListener('click', startNewGame);
document.getElementById('btn-modal-menu').addEventListener('click', resetGame);

cells.forEach(cell => cell.addEventListener('click', handleCellClick));

// Переключатели в настройках
document.querySelectorAll('#control-first-move .segmented-btn').forEach(btn => {
  btn.addEventListener('click', () => applyFirstMove(btn.dataset.val));
});

document.querySelectorAll('#control-theme .segmented-btn').forEach(btn => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.val));
});

// Первоначальная загрузка сохраненных настроек
applyTheme(state.theme);
applyFirstMove(state.firstMove);
