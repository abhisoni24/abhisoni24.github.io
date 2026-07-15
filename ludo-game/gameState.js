(function(exports) {
  const bm = (typeof require !== 'undefined') ? require('./boardModel.js') : window.boardModel;

  function createGame(playerCount) {
    const activePlayers = bm.getActivePlayers(playerCount);
    return {
      playerCount,
      activePlayers,
      tokens: bm.createInitialTokens(playerCount),
      turnIndex: 0,
      currentRoll: null,
      consecutiveSixes: 0,
      phase: 'ROLL', // 'ROLL' | 'MOVE' | 'GAME_OVER'
      winner: null,
      history: []
    };
  }

  function getCurrentPlayer(state) {
    return state.activePlayers[state.turnIndex];
  }

  function nextTurn(state) {
    state.turnIndex = (state.turnIndex + 1) % state.playerCount;
    state.consecutiveSixes = 0;
    state.currentRoll = null;
    state.phase = 'ROLL';
  }

  function handleRoll(state, diceRoll) {
    if (state.phase !== 'ROLL') {
      throw new Error('Not in ROLL phase');
    }
    
    state.currentRoll = diceRoll;
    state.history.push({ player: getCurrentPlayer(state), roll: diceRoll });

    if (diceRoll === 6) {
      state.consecutiveSixes++;
      if (state.consecutiveSixes === 3) {
        nextTurn(state);
        return;
      }
    }

    const legalMoves = bm.getLegalMoves(state.tokens, getCurrentPlayer(state), diceRoll, state.playerCount);

    if (legalMoves.length === 0) {
      if (diceRoll !== 6) {
        nextTurn(state);
      } else {
        state.phase = 'ROLL';
        state.currentRoll = null;
      }
    } else {
      state.phase = 'MOVE';
    }
  }

  function handleMove(state, tokenId) {
    if (state.phase !== 'MOVE') {
      throw new Error('Not in MOVE phase');
    }

    const legalMoves = bm.getLegalMoves(state.tokens, getCurrentPlayer(state), state.currentRoll, state.playerCount);
    const move = legalMoves.find(m => m.tokenId === tokenId);
    
    if (!move) {
      throw new Error('Illegal move');
    }

    const { nextTokens, captureMade, reachedHome } = bm.applyMove(state.tokens, move, state.playerCount);
    state.tokens = nextTokens;

    const currentPlayer = getCurrentPlayer(state);
    const myTokens = state.tokens.filter(t => t.color === currentPlayer);
    if (myTokens.every(t => t.state === 'HOME')) {
      state.winner = currentPlayer;
      state.phase = 'GAME_OVER';
      return;
    }

    if (state.currentRoll === 6 || captureMade || reachedHome) {
      state.phase = 'ROLL';
      state.currentRoll = null;
    } else {
      nextTurn(state);
    }
  }

  const api = {
    createGame,
    getCurrentPlayer,
    handleRoll,
    handleMove
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.gameState = api;
  }
})();
