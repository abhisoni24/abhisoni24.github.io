// render.js
(function() {
  const boardModel = window.boardModel;
  const gameState = window.gameState;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const SQUARE_SIZE = 36;
  
  const svg = document.getElementById('board-svg');
  const layerPaths = document.getElementById('layer-paths');
  const layerYards = document.getElementById('layer-yards');
  const layerTokens = document.getElementById('layer-tokens');
  
  const menuOverlay = document.getElementById('menu-overlay');
  const gameContainer = document.getElementById('game-container');
  const gameTitle = document.getElementById('game-title');
  const turnIndicator = document.getElementById('current-player-name');
  const diceResult = document.getElementById('dice-result');
  const messageArea = document.getElementById('message-area');
  const histogram = document.getElementById('histogram');

  let game = null;
  let trackCoords = [];
  let homeStretchCoords = {};
  let homeCoords = {};
  let yardCoords = {};
  let rollCounts = [0, 0, 0, 0, 0, 0];

  const diceRollSound = new Audio('die-roll-sound.mp3');
  diceRollSound.preload = 'auto';
  let isRolling = false;
  let isTokenMoving = false;

  const orientations = {
      1: { x: 0, y: 0 },
      2: { x: 0, y: 90 },
      3: { x: 90, y: 0 },
      4: { x: -90, y: 0 },
      5: { x: 0, y: -90 },
      6: { x: 0, y: 180 }
  };

  function animateDice(result) {
      if (isRolling) return Promise.resolve();
      isRolling = true;

      diceRollSound.pause();
      diceRollSound.currentTime = 0;
      diceRollSound.play().catch(e => console.log('Audio play failed', e));

      const diceCube = document.getElementById('dice-cube');
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const target = orientations[result];

      if (prefersReducedMotion) {
          diceCube.style.transform = `rotateX(${target.x}deg) rotateY(${target.y}deg) rotateZ(0deg)`;
          isRolling = false;
          return Promise.resolve();
      }

      const extraX = Math.floor(Math.random() * 3 + 2) * 360; 
      const extraY = Math.floor(Math.random() * 3 + 2) * 360; 
      const zWobble = Math.random() * 10 - 5;

      if (typeof diceCube.dataset.rotX === 'undefined') {
          diceCube.dataset.rotX = 0;
          diceCube.dataset.rotY = 0;
      }

      let currentX = parseInt(diceCube.dataset.rotX);
      let currentY = parseInt(diceCube.dataset.rotY);

      let diffX = target.x - (currentX % 360);
      if (diffX < 0) diffX += 360;
      let diffY = target.y - (currentY % 360);
      if (diffY < 0) diffY += 360;

      let newX = currentX + diffX + extraX;
      let newY = currentY + diffY + extraY;

      diceCube.dataset.rotX = newX;
      diceCube.dataset.rotY = newY;

      diceCube.style.transform = `rotateX(${newX}deg) rotateY(${newY}deg) rotateZ(${zWobble}deg)`;

      return new Promise(resolve => {
          const onEnd = (e) => {
              if (e.propertyName === 'transform') {
                  diceCube.removeEventListener('transitionend', onEnd);
                  isRolling = false;
                  resolve();
              }
          };
          diceCube.addEventListener('transitionend', onEnd);
          setTimeout(() => {
              if (isRolling) {
                  diceCube.removeEventListener('transitionend', onEnd);
                  isRolling = false;
                  resolve();
              }
          }, 2000);
      });
  }

  async function animateTokenWalk(token, diceRoll, color) {
      if (isTokenMoving) return;
      
      const path = [];
      let currentState = token.state;
      let currentPos = token.position;
      
      if (currentState === 'YARD') {
          if (diceRoll === 6) {
              path.push({ state: 'TRACK', position: boardModel.getStartPositions(game.playerCount)[color] });
          }
      } else {
          for (let i = 1; i <= diceRoll; i++) {
              const dummyTokens = [ { id: 'dummy', color, state: currentState, position: currentPos } ];
              const moves = boardModel.getLegalMoves(dummyTokens, color, 1, game.playerCount);
              if (moves.length > 0) {
                  const res = boardModel.applyMove(dummyTokens, moves[0], game.playerCount);
                  const nextToken = res.nextTokens[0];
                  path.push({ state: nextToken.state, position: nextToken.position });
                  currentState = nextToken.state;
                  currentPos = nextToken.position;
              } else {
                  break;
              }
          }
      }
      
      if (path.length === 0) return;
      
      isTokenMoving = true;
      document.getElementById('board-svg').classList.add('is-moving');
      
      const circle = layerTokens.querySelector(`circle[data-id="${token.id}"]`);
      if (circle) {
          layerTokens.appendChild(circle); 
          for (const step of path) {
              let pt;
              if (step.state === 'TRACK') {
                  pt = trackCoords[step.position];
              } else if (step.state === 'HOME_STRETCH') {
                  pt = homeStretchCoords[color][step.position];
              } else if (step.state === 'HOME') {
                  const playerIdx = boardModel.PLAYERS.indexOf(color);
                  const totalArms = game.playerCount === 5 ? 5 : 4;
                  const angle = (playerIdx * 2 * Math.PI) / totalArms;
                  const radius = SQUARE_SIZE * 1.2;
                  pt = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
                  const idx = parseInt(token.id.split('-')[1]);
                  pt.x += (idx % 2 === 0 ? 1 : -1) * 5;
                  pt.y += (idx < 2 ? 1 : -1) * 5;
              }
              if (pt) {
                  circle.setAttribute('cx', pt.x);
                  circle.setAttribute('cy', pt.y);
                  await new Promise(r => setTimeout(r, 200));
              }
          }
      }
      
      isTokenMoving = false;
      document.getElementById('board-svg').classList.remove('is-moving');
  }

  function createSvgElement(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
    return el;
  }

  // --- 5-PLAYER STAR GEOMETRY ---
  function initStarGeometry() {
    const ARM_WIDTH = SQUARE_SIZE * 3;
    const R0 = ARM_WIDTH / (2 * Math.tan(Math.PI / 5));

    function getAngleForArm(armIndex) {
      return -Math.PI / 2 + (armIndex * 2 * Math.PI / 5);
    }
    
    function transformPoint(pt, armIndex) {
      const angle = getAngleForArm(armIndex);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x: pt.x * cos - pt.y * sin,
        y: pt.x * sin + pt.y * cos,
        rot: angle * 180 / Math.PI
      };
    }

    for (let i = 0; i < 65; i++) {
      const armIndex = Math.floor(i / 13);
      const localIndex = i % 13;
      let col, j, actualArmIndex = armIndex;

      if (localIndex <= 4) { col = -1; j = localIndex + 1; }
      else if (localIndex === 5) { col = 0; j = 5; }
      else if (localIndex <= 11) { col = 1; j = 11 - localIndex; }
      else if (localIndex === 12) { col = -1; j = 0; actualArmIndex = (armIndex + 1) % 5; }

      const x = R0 + j * SQUARE_SIZE + SQUARE_SIZE / 2;
      const y = col * SQUARE_SIZE;
      
      trackCoords.push(transformPoint({ x, y }, actualArmIndex));
    }

    boardModel.PLAYERS.slice(0, 5).forEach((color, armIndex) => {
      homeStretchCoords[color] = [];
      for (let j = 4; j >= 0; j--) {
        const x = R0 + j * SQUARE_SIZE + SQUARE_SIZE / 2;
        homeStretchCoords[color].push(transformPoint({ x, y: 0 }, armIndex));
      }
      
      homeCoords[color] = { x: 0, y: 0 };

      const angle = getAngleForArm(armIndex) + Math.PI / 5;
      const ycCenter = { x: (R0 + 3.5 * SQUARE_SIZE) * Math.cos(angle), y: (R0 + 3.5 * SQUARE_SIZE) * Math.sin(angle) };
      
      const YARD_OFFSET = SQUARE_SIZE * 0.7;
      yardCoords[color] = [
        { x: ycCenter.x - YARD_OFFSET, y: ycCenter.y - YARD_OFFSET },
        { x: ycCenter.x + YARD_OFFSET, y: ycCenter.y - YARD_OFFSET },
        { x: ycCenter.x - YARD_OFFSET, y: ycCenter.y + YARD_OFFSET },
        { x: ycCenter.x + YARD_OFFSET, y: ycCenter.y + YARD_OFFSET }
      ];
    });
  }

  // --- 4-PLAYER CROSS GEOMETRY ---
  function initCrossGeometry(playerCount) {
    const activeColors = boardModel.getActivePlayers(playerCount);
    
    function getAngleForArm(armIndex) {
      return (armIndex * Math.PI / 2); 
    }

    function transformPoint(pt, armIndex) {
      const angle = getAngleForArm(armIndex);
      const cos = Math.round(Math.cos(angle)); 
      const sin = Math.round(Math.sin(angle));
      return {
        x: pt.x * cos - pt.y * sin,
        y: pt.x * sin + pt.y * cos,
        rot: angle * 180 / Math.PI
      };
    }

    for (let i = 0; i < 52; i++) {
      const armIndex = Math.floor(i / 13);
      const localIndex = i % 13;
      let col, j, actualArmIndex = armIndex;

      if (localIndex <= 5) { col = -1; j = localIndex; } 
      else if (localIndex === 6) { col = 0; j = 5; }     
      else if (localIndex >= 7) { col = 1; j = 12 - localIndex; } 

      const x = (2 + j) * SQUARE_SIZE;
      const y = col * SQUARE_SIZE;
      
      trackCoords.push(transformPoint({ x, y }, actualArmIndex));
    }

    activeColors.forEach((color) => {
      const armIndex = boardModel.PLAYERS.indexOf(color);
      homeStretchCoords[color] = [];
      for (let j = 4; j >= 0; j--) {
        const x = 1.5 * SQUARE_SIZE + j * SQUARE_SIZE + SQUARE_SIZE / 2;
        homeStretchCoords[color].push(transformPoint({ x, y: 0 }, armIndex));
      }
      
      homeCoords[color] = { x: 0, y: 0 };

      const angle = getAngleForArm(armIndex) + Math.PI / 4;
      const ycCenter = { x: 4.5 * SQUARE_SIZE * Math.cos(angle), y: 4.5 * SQUARE_SIZE * Math.sin(angle) };
      
      const YARD_OFFSET = SQUARE_SIZE * 0.7;
      yardCoords[color] = [
        { x: ycCenter.x - YARD_OFFSET, y: ycCenter.y - YARD_OFFSET },
        { x: ycCenter.x + YARD_OFFSET, y: ycCenter.y - YARD_OFFSET },
        { x: ycCenter.x - YARD_OFFSET, y: ycCenter.y + YARD_OFFSET },
        { x: ycCenter.x + YARD_OFFSET, y: ycCenter.y + YARD_OFFSET }
      ];
    });
  }

  function drawBoard(playerCount) {
    layerPaths.innerHTML = '';
    layerYards.innerHTML = '';

    if (playerCount === 5) {
      const ARM_WIDTH = SQUARE_SIZE * 3;
      const R0 = ARM_WIDTH / (2 * Math.tan(Math.PI / 5));
      const pentagonPts = [];
      for (let i = 0; i < 5; i++) {
        const a = (-Math.PI / 2 + (i * 2 * Math.PI / 5)) - Math.PI / 5;
        const pt = { x: (R0 / Math.cos(Math.PI/5)) * Math.cos(a), y: (R0 / Math.cos(Math.PI/5)) * Math.sin(a) };
        pentagonPts.push(`${pt.x},${pt.y}`);
      }
      layerPaths.appendChild(createSvgElement('polygon', {
        points: pentagonPts.join(' '),
        fill: 'white',
        stroke: '#bdc3c7',
        'stroke-width': '2'
      }));
    } else {
      layerPaths.appendChild(createSvgElement('rect', {
        x: -1.5 * SQUARE_SIZE,
        y: -1.5 * SQUARE_SIZE,
        width: 3 * SQUARE_SIZE,
        height: 3 * SQUARE_SIZE,
        fill: 'white',
        stroke: '#bdc3c7',
        'stroke-width': '2'
      }));
    }

    // Removed "HOME" text to allow space for the dice
    
    const safeSquares = boardModel.getSafeSquares(playerCount);
    const starts = boardModel.getStartPositions(playerCount);
    
    trackCoords.forEach((pt, i) => {
      const isSafe = safeSquares.has(i);
      let fill = isSafe ? 'var(--safe-bg)' : 'var(--square-bg)';
      let startColor = Object.keys(starts).find(k => starts[k] === i);
      if (startColor) fill = `var(--${startColor})`;

      layerPaths.appendChild(createSvgElement('rect', {
        x: -SQUARE_SIZE/2,
        y: -SQUARE_SIZE/2,
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        fill,
        class: 'square',
        transform: `translate(${pt.x}, ${pt.y}) rotate(${pt.rot || 0})`
      }));

      if (isSafe && !startColor) {
        layerPaths.appendChild(createSvgElement('circle', {
          cx: pt.x, cy: pt.y, r: SQUARE_SIZE/4, fill: '#555'
        }));
      }

      if (startColor) {
        const txt = createSvgElement('text', {
          x: pt.x, y: pt.y,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          fill: '#fff',
          'font-size': '20px',
          'font-weight': 'bold'
        });
        txt.textContent = startColor.charAt(0).toUpperCase();
        layerPaths.appendChild(txt);
      }
    });

    const activeColors = boardModel.getActivePlayers(playerCount);
    activeColors.forEach((color) => {
      homeStretchCoords[color].forEach(pt => {
        layerPaths.appendChild(createSvgElement('rect', {
          x: -SQUARE_SIZE/2,
          y: -SQUARE_SIZE/2,
          width: SQUARE_SIZE,
          height: SQUARE_SIZE,
          fill: `var(--${color})`,
          opacity: '0.5',
          class: 'square',
          transform: `translate(${pt.x}, ${pt.y}) rotate(${pt.rot || 0})`
        }));
      });

      const yc = yardCoords[color];
      layerYards.appendChild(createSvgElement('circle', {
        cx: (yc[0].x + yc[3].x)/2,
        cy: (yc[0].y + yc[3].y)/2,
        r: SQUARE_SIZE * 1.6,
        fill: `var(--${color})`,
        opacity: '0.2'
      }));
    });
  }

  function updateTokens() {
    layerTokens.innerHTML = '';
    
    const trackCounts = {};
    
    game.tokens.forEach((token) => {
      let pt;
      if (token.state === 'YARD') {
        const idx = parseInt(token.id.split('-')[1]);
        pt = yardCoords[token.color][idx];
      } else if (token.state === 'TRACK') {
        pt = { ...trackCoords[token.position] };
        trackCounts[token.position] = (trackCounts[token.position] || 0) + 1;
        const count = trackCounts[token.position];
        if (count > 1) {
            pt.x += (count - 1) * 6;
            pt.y += (count - 1) * 6;
        }
      } else if (token.state === 'HOME_STRETCH') {
        pt = homeStretchCoords[token.color][token.position];
      } else if (token.state === 'HOME') {
        const playerIdx = boardModel.PLAYERS.indexOf(token.color);
        const totalArms = game.playerCount === 5 ? 5 : 4;
        const angle = (playerIdx * 2 * Math.PI) / totalArms;
        const radius = SQUARE_SIZE * 1.2;
        pt = { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
        
        const idx = parseInt(token.id.split('-')[1]);
        pt.x += (idx % 2 === 0 ? 1 : -1) * 5;
        pt.y += (idx < 2 ? 1 : -1) * 5;
      }

      const circle = createSvgElement('circle', {
        cx: pt.x,
        cy: pt.y,
        r: SQUARE_SIZE * 0.4,
        fill: `var(--${token.color})`,
        stroke: '#2c3e50',
        'stroke-width': '2',
        class: 'token',
        'data-id': token.id
      });
      
      if (game.phase === 'MOVE' && token.color === gameState.getCurrentPlayer(game)) {
          const allMoves = boardModel.getLegalMoves(game.tokens, token.color, game.currentRoll, game.playerCount);
          if (allMoves.some(m => m.tokenId === token.id)) {
              circle.setAttribute('stroke', '#fff');
              circle.setAttribute('stroke-width', '4');
              circle.style.cursor = 'pointer';
              circle.classList.add('playable-token');
              circle.addEventListener('click', async () => {
                  if (isTokenMoving) return;
                  await animateTokenWalk(token, game.currentRoll, token.color);
                  gameState.handleMove(game, token.id);
                  updateUI();
              });
          }
      }

      layerTokens.appendChild(circle);
    });
  }

  function updateUI() {
    const currentPlayer = gameState.getCurrentPlayer(game);
    turnIndicator.textContent = currentPlayer.toUpperCase();
    turnIndicator.style.color = `var(--${currentPlayer})`;
    
    const diceCube = document.getElementById('dice-cube');
    if (game.phase === 'ROLL') {
      diceCube.classList.add('playable-dice');
      messageArea.textContent = 'Waiting for roll...';
    } else if (game.phase === 'MOVE') {
      diceCube.classList.remove('playable-dice');
      messageArea.textContent = 'Select a token to move.';
    } else if (game.phase === 'GAME_OVER') {
      diceCube.classList.remove('playable-dice');
      messageArea.textContent = `${game.winner.toUpperCase()} WINS!`;
    }
    
    updateTokens();

    if (game) {
      localStorage.setItem('ludo_game', JSON.stringify({
        game: game,
        rollCounts: rollCounts
      }));
    }
  }

  function updateHistogram(roll) {
      if (roll >= 1 && roll <= 6) {
          rollCounts[roll - 1]++;
      }
      const max = Math.max(...rollCounts, 1);
      histogram.innerHTML = '';
      for (let i = 0; i < 6; i++) {
          const col = document.createElement('div');
          col.className = 'bar-col';
          
          const bar = document.createElement('div');
          bar.className = 'bar';
          bar.style.height = `${(rollCounts[i] / max) * 100}px`;
          
          const lbl = document.createElement('div');
          lbl.className = 'bar-label';
          lbl.textContent = `${i + 1} (${rollCounts[i]})`;
          
          col.appendChild(bar);
          col.appendChild(lbl);
          histogram.appendChild(col);
      }
  }

  document.getElementById('dice-cube').addEventListener('click', async () => {
    if (isRolling || game.phase !== 'ROLL') return;
    const roll = window.rollDie();
    diceResult.textContent = `Rolled: ${roll}`;
    updateHistogram(roll);
    
    await animateDice(roll);
    
    gameState.handleRoll(game, roll);
    
    if (game.phase === 'MOVE') {
        const moves = boardModel.getLegalMoves(game.tokens, gameState.getCurrentPlayer(game), roll, game.playerCount);
        if (moves.length === 1) {
            setTimeout(async () => {
                const token = game.tokens.find(t => t.id === moves[0].tokenId);
                await animateTokenWalk(token, roll, token.color);
                gameState.handleMove(game, moves[0].tokenId);
                updateUI();
            }, 300);
        }
    }
    
    updateUI();
  });

  const menuButtons = document.querySelectorAll('.btn-menu');
  menuButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const pCount = parseInt(btn.getAttribute('data-players'));
      
      trackCoords = [];
      homeStretchCoords = {};
      homeCoords = {};
      yardCoords = {};
      rollCounts = [0, 0, 0, 0, 0, 0];

      // Expand board size visually by setting viewBox
      svg.setAttribute('viewBox', '-300 -300 600 600');

      if (pCount === 5) {
        initStarGeometry();
      } else {
        initCrossGeometry(pCount);
      }

      game = gameState.createGame(pCount);
      gameTitle.textContent = `Ludo (${pCount}P)`;
      drawBoard(pCount);
      updateHistogram(0);
      updateUI();
      
      menuOverlay.style.display = 'none';
      gameContainer.style.display = 'flex';
    });
  });

  const btnHome = document.getElementById('btn-home');
  if (btnHome) {
    btnHome.addEventListener('click', () => {
      localStorage.removeItem('ludo_game');
      location.reload();
    });
  }

  // Load saved game on init
  const savedData = localStorage.getItem('ludo_game');
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      game = parsed.game;
      if (parsed.rollCounts) rollCounts = parsed.rollCounts;
      
      const pCount = game.playerCount;
      svg.setAttribute('viewBox', '-300 -300 600 600');
      
      if (pCount === 5) {
        initStarGeometry();
      } else {
        initCrossGeometry(pCount);
      }
      
      gameTitle.textContent = `Ludo (${pCount}P)`;
      drawBoard(pCount);
      
      // Initialize histogram visually
      const max = Math.max(...rollCounts, 1);
      histogram.innerHTML = '';
      for (let i = 0; i < 6; i++) {
          const col = document.createElement('div');
          col.className = 'bar-col';
          const bar = document.createElement('div');
          bar.className = 'bar';
          bar.style.height = `${(rollCounts[i] / max) * 80}px`;
          const lbl = document.createElement('div');
          lbl.className = 'bar-label';
          lbl.textContent = `${i + 1} (${rollCounts[i]})`;
          col.appendChild(bar);
          col.appendChild(lbl);
          histogram.appendChild(col);
      }
      
      updateUI();
      
      menuOverlay.style.display = 'none';
      gameContainer.style.display = 'flex';
    } catch (e) {
      console.error('Failed to load saved game', e);
    }
  }

})();
