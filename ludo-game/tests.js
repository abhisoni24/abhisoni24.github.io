// tests.js
const assert = require('assert');
const { PLAYERS, getStartPositions, getSafeSquares, getTrackLength, getLegalMoves, applyMove } = require('./boardModel.js');
const { createGame, handleRoll, handleMove, getCurrentPlayer } = require('./gameState.js');

function testSafeSquares() {
  const safe = getSafeSquares(5);
  assert(safe.has(7), 'Red start is safe');
  assert(safe.has(2), 'Red star is safe');
  assert(safe.has(20), 'Green start is safe');
}

function testCapture() {
  const game = createGame(5);
  // Give red token 0 a position
  game.tokens[0].state = 'TRACK';
  game.tokens[0].position = 10;
  
  // Give green token 0 a position ahead of red
  game.tokens[4].state = 'TRACK';
  game.tokens[4].position = 12;

  // Red rolls a 2 (10 -> 12)
  handleRoll(game, 2);
  const legalMoves = getLegalMoves(game.tokens, 'red', 2, 5);
  assert.strictEqual(legalMoves.length, 1);
  assert.strictEqual(legalMoves[0].targetPos, 12);

  handleMove(game, game.tokens[0].id);

  // Check state
  const greenToken = game.tokens.find(t => t.id === 'green-0');
  assert.strictEqual(greenToken.state, 'YARD');
  assert.strictEqual(greenToken.position, null);

  // Since red captured, red should get another roll
  assert.strictEqual(game.phase, 'ROLL');
  assert.strictEqual(getCurrentPlayer(game), 'red');
}

function testBlock() {
  const game = createGame(5);
  game.tokens[0].state = 'TRACK';
  game.tokens[0].position = 10;
  
  // Green creates a block
  game.tokens[4].state = 'TRACK';
  game.tokens[4].position = 12;
  game.tokens[5].state = 'TRACK';
  game.tokens[5].position = 12;

  // Red rolls a 2
  handleRoll(game, 2);
  const legalMoves = getLegalMoves(game.tokens, 'red', 2, 5);
  // Red cannot move to 12 because of the block
  assert.strictEqual(legalMoves.length, 0);

  // Red's turn ends since no legal moves and roll != 6
  assert.strictEqual(getCurrentPlayer(game), 'green');
}

function testExactRollToHome() {
  const game = createGame(5);
  game.tokens[0].state = 'HOME_STRETCH';
  game.tokens[0].position = 3;

  handleRoll(game, 2);
  const legalMoves2 = getLegalMoves(game.tokens, 'red', 2, 5);
  assert.strictEqual(legalMoves2.length, 1);
  assert.strictEqual(legalMoves2[0].action, 'ENTER_HOME');
  handleMove(game, 'red-0');
  
  // Gets another roll for getting home
  assert.strictEqual(game.phase, 'ROLL');
  assert.strictEqual(getCurrentPlayer(game), 'red');
  assert.strictEqual(game.tokens[0].state, 'HOME');
  
  // Let's test overshoot
  game.tokens[1].state = 'HOME_STRETCH';
  game.tokens[1].position = 4;
  handleRoll(game, 2); // needs 1, rolls 2
  const legalMovesOvershoot = getLegalMoves(game.tokens, 'red', 2, 5);
  assert.strictEqual(legalMovesOvershoot.length, 0);
  assert.strictEqual(getCurrentPlayer(game), 'green');
}

function testThreeSixes() {
  const game = createGame(5);
  handleRoll(game, 6);
  handleMove(game, 'red-0');
  
  handleRoll(game, 6);
  handleMove(game, 'red-0');

  // Third 6 -> forfeit turn!
  handleRoll(game, 6);
  assert.strictEqual(getCurrentPlayer(game), 'green');
}

function testTurnIn() {
  const game = createGame(5);
  game.tokens[0].state = 'TRACK';
  game.tokens[0].position = 4; // relative pos 62 for Red (start 7)

  handleRoll(game, 2);
  const moves = getLegalMoves(game.tokens, 'red', 2, 5);
  assert.strictEqual(moves[0].action, 'ENTER_HOME_STRETCH');
  assert.strictEqual(moves[0].targetPos, 0); 
}

function runTests() {
  testSafeSquares();
  testCapture();
  testBlock();
  testExactRollToHome();
  testThreeSixes();
  testTurnIn();
  console.log('All logic tests passed!');
}

runTests();
