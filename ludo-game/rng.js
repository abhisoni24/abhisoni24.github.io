/* rng.js
 * rollDie() using Web Crypto API with rejection sampling to avoid modulo bias.
 * Exports rollDie (uses crypto.getRandomValues in browsers; Node fallback to crypto.randomFillSync)
 * and rollDieFromByte for deterministic boundary testing.
 */

function _getRandomByte(buf) {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(buf);
  } else {
    // Node fallback
    const nodeCrypto = require('crypto');
    nodeCrypto.randomFillSync(buf);
  }
}

function rollDie() {
  const buf = new Uint8Array(1);
  let x;
  do {
    _getRandomByte(buf);
    x = buf[0];
  } while (x >= 252); // reject 252..255 to avoid modulo bias (252 = 6 * 42)
  return (x % 6) + 1;
}

// Deterministic mapping used for boundary tests: returns null if byte should be rejected.
function rollDieFromByte(x) {
  if (x >= 252) return null;
  return (x % 6) + 1;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { rollDie, rollDieFromByte };
} else {
  window.rollDie = rollDie;
  window.rollDieFromByte = rollDieFromByte;
}
