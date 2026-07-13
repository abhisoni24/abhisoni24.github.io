// test-rolls.js
// Run a large number of rolls and run a chi-squared goodness-of-fit check against uniform (1..6).
// Also verifies rejection-sampling boundary (252..255 are rejected).

const { rollDie, rollDieFromByte } = require('./rng');

// Boundary test for rejection-sampling
for (let b = 252; b < 256; b++) {
  const r = rollDieFromByte(b);
  if (r !== null) {
    console.error('Boundary test FAILED: byte', b, 'should be rejected but produced', r);
    process.exit(2);
  }
}
console.log('Boundary test passed: bytes 252..255 are rejected.');

const N = 200000; // >=100k as requested
const counts = [0, 0, 0, 0, 0, 0];
for (let i = 0; i < N; i++) {
  const v = rollDie();
  counts[v - 1]++;
}

const expected = N / 6;
let chi2 = 0;
for (let i = 0; i < 6; i++) {
  const d = counts[i] - expected;
  chi2 += (d * d) / expected;
}

console.log('Rolls:', N);
console.log('Counts:', counts.map(c => String(c)).join(', '));
console.log('Chi-squared statistic:', chi2.toFixed(4));

// For k=6 categories, df = k-1 = 5. Chi2 critical at p=0.01 ~= 15.086
const CHI2_CRITICAL_0_01_DF5 = 15.086;
if (chi2 < CHI2_CRITICAL_0_01_DF5) {
  console.log('PASS: chi2 <', CHI2_CRITICAL_0_01_DF5, '(p > 0.01)');
  process.exit(0);
} else {
  console.log('WARN/FAIL: chi2 >=', CHI2_CRITICAL_0_01_DF5, '(p <= 0.01)');
  process.exit(1);
}
