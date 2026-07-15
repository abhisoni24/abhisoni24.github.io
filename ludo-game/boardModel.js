(function(exports) {
  const PLAYERS = ['red', 'green', 'yellow', 'blue', 'purple'];
  const HOME_STRETCH_LENGTH = 6;
  const MAX_PLAYERS = 5;

  // The start square for each color on the main track
  const START_POSITIONS_4P = {
    'red': 8,
    'green': 21,
    'yellow': 34,
    'blue': 47
  };

  const START_POSITIONS_5P = {
    'red': 7,
    'green': 20,
    'yellow': 33,
    'blue': 46,
    'purple': 59
  };

  function getStartPositions(playerCount) {
    return playerCount === 5 ? START_POSITIONS_5P : START_POSITIONS_4P;
  }

  function getTrackLength(playerCount) {
    return playerCount <= 4 ? 52 : 65;
  }

  function getSafeSquares(playerCount) {
    const starts = getStartPositions(playerCount);
    const safe = new Set();
    const trackLen = getTrackLength(playerCount);
    Object.values(starts).forEach(pos => {
      safe.add(pos); // Start square is safe
      // The secondary safe star is on the outward path, 5 squares behind the start
      safe.add((pos - 5 + trackLen) % trackLen); 
    });
    return safe;
  }

  /**
   * A token state is represented as:
   * {
   *   id: string (e.g., 'red-0'),
   *   color: string,
   *   state: 'YARD' | 'TRACK' | 'HOME_STRETCH' | 'HOME',
   *   position: number (track index 0-64/51, or home stretch index 0-5. null if YARD or HOME)
   * }
   */

  function getActivePlayers(playerCount) {
    if (playerCount === 2) {
      return ['red', 'yellow'];
    }
    return PLAYERS.slice(0, playerCount);
  }

  // Pure function to generate initial tokens
  function createInitialTokens(playerCount) {
    const tokens = [];
    const active = getActivePlayers(playerCount);
    for (let i = 0; i < playerCount; i++) {
      const color = active[i];
      for (let j = 0; j < 4; j++) {
        tokens.push({
          id: `${color}-${j}`,
          color: color,
          state: 'YARD',
          position: null
        });
      }
    }
    return tokens;
  }

  // Calculate relative position for a color on the track
  function getRelativeTrackPos(color, trackPos, playerCount) {
    const startPos = getStartPositions(playerCount)[color];
    const trackLength = getTrackLength(playerCount);
    return (trackPos - startPos + trackLength) % trackLength;
  }

  // Helper to check if a track square is occupied by 2+ tokens of the SAME color
  function getTokensAt(tokens, state, position) {
    return tokens.filter(t => t.state === state && t.position === position);
  }

  function hasBlockAtTrack(tokens, trackPos) {
    const tokensAtPos = getTokensAt(tokens, 'TRACK', trackPos);
    if (tokensAtPos.length >= 2) {
      const firstColor = tokensAtPos[0].color;
      return tokensAtPos.every(t => t.color === firstColor);
    }
    return false;
  }

  // Pure function to determine legal moves
  function getLegalMoves(tokens, color, diceRoll, playerCount) {
    const legalMoves = [];
    const myTokens = tokens.filter(t => t.color === color);
    const trackLength = getTrackLength(playerCount);
    const turnInPos = trackLength - 2;

    for (const token of myTokens) {
      if (token.state === 'HOME') continue;

      if (token.state === 'YARD') {
        if (diceRoll === 6) {
          const startPos = getStartPositions(playerCount)[color];
          if (!hasBlockAtTrack(tokens, startPos)) {
            legalMoves.push({ tokenId: token.id, action: 'ENTER_TRACK', targetPos: startPos });
          }
        }
        continue;
      }

      if (token.state === 'TRACK') {
        const relativePos = getRelativeTrackPos(color, token.position, playerCount);
        if (relativePos + diceRoll > turnInPos) {
          // Turning into home stretch
          const homeStretchPos = relativePos + diceRoll - (turnInPos + 1);
          if (homeStretchPos <= 5) {
            legalMoves.push({ tokenId: token.id, action: 'ENTER_HOME_STRETCH', targetPos: homeStretchPos });
          }
        } else {
          // Staying on track
          const nextTrackPos = (token.position + diceRoll) % trackLength;
          if (!hasBlockAtTrack(tokens, nextTrackPos)) {
            legalMoves.push({ tokenId: token.id, action: 'MOVE_TRACK', targetPos: nextTrackPos });
          }
        }
        continue;
      }

      if (token.state === 'HOME_STRETCH') {
        const nextPos = token.position + diceRoll;
        if (nextPos < 5) {
          legalMoves.push({ tokenId: token.id, action: 'MOVE_HOME_STRETCH', targetPos: nextPos });
        } else if (nextPos === 5) {
          legalMoves.push({ tokenId: token.id, action: 'ENTER_HOME', targetPos: null });
        }
        continue;
      }
    }

    return legalMoves;
  }

  // Pure function to apply a move
  function applyMove(tokens, move, playerCount) {
    const nextTokens = tokens.map(t => ({ ...t }));
    const token = nextTokens.find(t => t.id === move.tokenId);
    let captureMade = false;
    let reachedHome = false;
    const safeSquares = getSafeSquares(playerCount);

    if (move.action === 'ENTER_TRACK' || move.action === 'MOVE_TRACK') {
      const targetPos = move.targetPos;
      
      if (!safeSquares.has(targetPos)) {
        const tokensAtTarget = getTokensAt(nextTokens, 'TRACK', targetPos);
        const enemyTokens = tokensAtTarget.filter(t => t.color !== token.color);
        if (enemyTokens.length === 1) { 
          const enemy = enemyTokens[0];
          enemy.state = 'YARD';
          enemy.position = null;
          captureMade = true;
        }
      }

      token.state = 'TRACK';
      token.position = targetPos;
    } else if (move.action === 'ENTER_HOME_STRETCH' || move.action === 'MOVE_HOME_STRETCH') {
      token.state = 'HOME_STRETCH';
      token.position = move.targetPos;
    } else if (move.action === 'ENTER_HOME') {
      token.state = 'HOME';
      token.position = null;
      reachedHome = true;
    }

    return { nextTokens, captureMade, reachedHome };
  }

  const api = {
    PLAYERS,
    getActivePlayers,
    getStartPositions,
    getSafeSquares,
    getTrackLength,
    createInitialTokens,
    getLegalMoves,
    applyMove
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.boardModel = api;
  }
})();
