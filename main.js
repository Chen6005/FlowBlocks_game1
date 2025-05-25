window.onload = function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const startBtn = document.getElementById('startBtn');
  const scoreDiv = document.getElementById('score');
  const themeSelect = document.getElementById('themeSelect');
  const audioEat = document.getElementById('audio-eat');
  const audioClear = document.getElementById('audio-clear');
  const audioFail = document.getElementById('audio-fail');

  const gridSize = 12;
  const cellSize = 32;
  canvas.width = gridSize * cellSize;
  canvas.height = gridSize * cellSize;

  const themes = {
    classic: {
      bg: '#fff', block: '#b0bec5', player: '#2979ff', energy: '#ffd600', goal: '#388e3c', border: '#222', img: 'player_classic.png' },
    forest: {
      bg: '#f2ffe6', block: '#7f9c6c', player: '#63b33b', energy: '#ffe066', goal: '#5a7844', border: '#5c3d1b', img: 'player_forest.png' },
    cyber: {
      bg: '#11002b', block: '#39f0ff', player: '#f0037f', energy: '#ffe600', goal: '#39ff92', border: '#01fffb', img: 'player_cyber.png' },
    pixel: {
      bg: '#fbf6e9', block: '#a87552', player: '#f87272', energy: '#fae388', goal: '#329e6b', border: '#92692c', img: 'player_pixel.png' },
    candy: {
      bg: '#fffcf9', block: '#ff90e8', player: '#40c9ff', energy: '#ffe177', goal: '#ffb86b', border: '#7a5af8', img: 'player_candy.png' }
  };
  let currentTheme = 'classic';

  // 載入主角圖像
  const playerImgs = {};
  for (const key in themes) {
    playerImgs[key] = new Image();
    playerImgs[key].src = themes[key].img;
  }

  let gameInterval, score, level, highScore, player, maze, energy;

  themeSelect.onchange = function() {
    currentTheme = themeSelect.value;
    document.getElementById('gameCanvas').style.borderColor = themes[currentTheme].border;
    draw();
  };
  themeSelect.addEventListener('keydown', function(e) {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }
  });

  function resetLevel() {
    maze = generateMaze(gridSize, gridSize, 0.13 + 0.03 * (level-1));
    player = { x: 0, y: 0 };
    energy = randomEmptyCell();
    draw();
    updateScore();
  }

  function resetGame() {
    score = 0;
    level = 1;
    highScore = parseInt(localStorage.getItem('fb_highScore')) || 0;
    resetLevel();
  }

  function startGame() {
    resetGame();
    startBtn.style.display = 'none';
    themeSelect.blur();
    startBtn.blur();
    canvas.focus();
    gameRunning = true;
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    gameInterval = setInterval(update, 900 - level*30);
  }

  function endGame(win = false) {
    clearInterval(gameInterval);
    clearInterval(moveInterval);
    gameRunning = false;
    document.removeEventListener('keydown', keyDownHandler);
    document.removeEventListener('keyup', keyUpHandler);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchend', handleTouchEnd);
    startBtn.style.display = 'block';
    if (win) {
      audioClear.play();
      setTimeout(() => {
        alert('過關！進入下一關');
        level++;
        resetLevel();
        gameInterval = setInterval(update, 900 - level*30);
        gameRunning = true;
      }, 50);
    } else {
      audioFail.play();
      setTimeout(() => {
        alert('遊戲結束！分數：' + score);
        if (score > highScore) {
          highScore = score;
          localStorage.setItem('fb_highScore', highScore);
        }
        updateScore();
      }, 80);
    }
  }

  function updateScore() {
    scoreDiv.textContent = `分數：${score} | 最高分：${highScore} | 關卡：${level}`;
  }

  function generateMaze(w, h, blockRate) {
    let m = [];
    for (let y = 0; y < h; y++) {
      let row = [];
      for (let x = 0; x < w; x++) {
        row.push(Math.random() < blockRate ? 1 : 0);
      }
      m.push(row);
    }
    m[0][0] = 0;
    m[h-1][w-1] = 0;
    return m;
  }

  function randomEmptyCell() {
    let empty = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (maze[y][x] === 0 && !(x === player.x && y === player.y)) {
          empty.push({x, y});
        }
      }
    }
    return empty[Math.floor(Math.random() * empty.length)] || {x: 1, y: 1};
  }

  // 長按方向鍵與箭頭可連續移動
  let moveInterval = null;
  let currentMoveDir = null;
  let gameRunning = false;

  // 鍵盤
  function keyDownHandler(e) {
    let keyMap = {ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0]};
    if (keyMap[e.key]) {
      if (!moveInterval || currentMoveDir !== e.key) {
        clearInterval(moveInterval);
        movePlayer(keyMap[e.key]);
        currentMoveDir = e.key;
        moveInterval = setInterval(() => movePlayer(keyMap[e.key]), 120);
      }
      e.preventDefault();
    }
  }
  function keyUpHandler(e) {
    let keyMap = {ArrowUp:true, ArrowDown:true, ArrowLeft:true, ArrowRight:true};
    if (keyMap[e.key]) {
      clearInterval(moveInterval);
      moveInterval = null;
      currentMoveDir = null;
    }
  }

  // 虛擬方向鍵/手機
  const arrowOrder = ['arrow-up','arrow-down','arrow-left','arrow-right'];
  const dirs = [[0,-1],[0,1],[-1,0],[1,0]];
  arrowOrder.forEach((id, idx) => {
    let btn = document.getElementById(id);
    btn.addEventListener('mousedown', () => {
      clearInterval(moveInterval);
      movePlayer(dirs[idx]);
      moveInterval = setInterval(() => movePlayer(dirs[idx]), 120);
      currentMoveDir = id;
    });
    btn.addEventListener('mouseup', () => {
      clearInterval(moveInterval);
      moveInterval = null;
      currentMoveDir = null;
    });
    btn.addEventListener('mouseleave', () => {
      clearInterval(moveInterval);
      moveInterval = null;
      currentMoveDir = null;
    });
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      clearInterval(moveInterval);
      movePlayer(dirs[idx]);
      moveInterval = setInterval(() => movePlayer(dirs[idx]), 120);
      currentMoveDir = id;
    });
    btn.addEventListener('touchend', e => {
      e.preventDefault();
      clearInterval(moveInterval);
      moveInterval = null;
      currentMoveDir = null;
    });
  });

  let touchStartX, touchStartY;
  function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
  function handleTouchEnd(e) {
    if (e.changedTouches.length !== 1) return;
    let dx = e.changedTouches[0].clientX - touchStartX;
    let dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return; // 避免誤觸
    if (Math.abs(dx) > Math.abs(dy)) {
      movePlayer([dx > 0 ? 1 : -1, 0]);
    } else {
      movePlayer([0, dy > 0 ? 1 : -1]);
    }
  }

  function movePlayer([dx,dy]) {
    if (!gameRunning) return;
    let nx = player.x + dx, ny = player.y + dy;
    if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && maze[ny][nx] === 0) {
      player.x = nx; player.y = ny;
      if (player.x === energy.x && player.y === energy.y) {
        audioEat.play();
        score++;
        updateScore();
        energy = randomEmptyCell();
      }
      if (player.x === gridSize-1 && player.y === gridSize-1) {
        endGame(true);
        return;
      }
      draw();
    }
  }

  function update() {
    let x = Math.floor(Math.random() * gridSize);
    let y = Math.floor(Math.random() * gridSize);
    if (!(x === 0 && y === 0) && !(x === gridSize-1 && y === gridSize-1) && !(x === player.x && y === player.y) && !(x === energy.x && y === energy.y)) {
      maze[y][x] = (maze[y][x] === 0 ? 1 : 0);
    }
    draw();
  }

  function draw() {
    ctx.fillStyle = themes[currentTheme].bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (maze[y][x] === 1) {
          ctx.fillStyle = themes[currentTheme].block;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
    ctx.fillStyle = themes[currentTheme].energy;
    ctx.beginPath();
    ctx.arc(energy.x * cellSize + cellSize/2, energy.y * cellSize + cellSize/2, cellSize/4, 0, 2 * Math.PI);
    ctx.fill();
    // 主角圖片顯示
    const img = playerImgs[currentTheme];
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img,
        player.x * cellSize + cellSize/2 - cellSize*0.44,
        player.y * cellSize + cellSize/2 - cellSize*0.44,
        cellSize*0.88, cellSize*0.88
      );
    } else {
      ctx.fillStyle = themes[currentTheme].player;
      ctx.beginPath();
      ctx.arc(player.x * cellSize + cellSize/2, player.y * cellSize + cellSize/2, cellSize/3, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.strokeStyle = themes[currentTheme].goal;
    ctx.lineWidth = 3;
    ctx.strokeRect((gridSize-1)*cellSize+4, (gridSize-1)*cellSize+4, cellSize-8, cellSize-8);
    canvas.style.borderColor = themes[currentTheme].border;
  }

  startBtn.onclick = startGame;
};
