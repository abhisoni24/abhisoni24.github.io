# Unbiased Browser-Based Ludo: Project Plan

## 1. Objective

Build a minimal, browser-playable Ludo game (4 players, local/pass-and-play, no backend required)
where the dice roll is provably uniform random. No visual gimmicks, no animal mascots, no
frameworks beyond what's strictly necessary. The win condition for this project is: correct rules
+ correct randomness, in the smallest codebase that achieves both.

## 2. The Core Constraint: Fair Randomness

Most "biased Ludo" complaints trace back to one of these, in order of how often they actually occur:

1. **Modulo bias**: doing `Math.floor(Math.random() * 6) + 1` is *technically* uniform in JS
   because `Math.random()` has enough resolution for a 6-sided die, so this specific case is fine.
   The bias usually isn't here for dice specifically, but the pattern generalizes badly (e.g. if you
   ever map a wider random range onto a range that doesn't evenly divide it), so we standardize on
   a bias-safe method everywhere on principle.
2. **Weak/shared PRNG state**: reusing a `Math.random()` stream across many rapid calls in some
   engines/environments can show subtle sequential correlation. Not usually visible to a player,
   but avoidable for free.
3. **Deliberate rubber-banding**: some commercial Ludo apps intentionally weight rolls (e.g. bias
   toward 6s early, or toward numbers that let a trailing player catch up) to increase engagement.
   This is a design decision, not a bug. We are explicitly *not* doing this.
4. **Rule-level illusions of bias**: sometimes the dice are fine, but rules like "you can only enter
   the board on a 6" combined with small sample sizes make it *feel* biased over a single game. This
   isn't fixable with better RNG, it's fixable with correct rules and, optionally, a stats readout
   so the player can self-verify over many rolls.

**Design decision for the agent**: use `crypto.getRandomValues()` (Web Crypto API), not
`Math.random()`, for the die roll. It's cryptographically secure, uniformly distributed, and
removes any argument about PRNG quality. Combine with **rejection sampling** so the 1–6 mapping has
zero modulo bias even in principle:

```js
function rollDie() {
  const buf = new Uint8Array(1);
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= 252); // 252 = 6 * 42, largest multiple of 6 <= 256; reject the remainder
  return (x % 6) + 1;
}
```

This is the equivalent of your AST-diffing approach in the NL2SQL work: instead of trusting that a
black-box process "looks" correct, you constrain it structurally so incorrectness is impossible by
construction, not just unlikely by testing.

## 3. Tech Stack (deliberately minimal)

- **Single-page vanilla HTML/CSS/JS.** No React, no build step, no bundler. One `index.html`,
  one `game.js`, one `style.css`. Total target: under ~800 lines including comments.
- Board rendered as **SVG** (crisp at any size, easy to hit-test tokens, no image assets needed).
- No backend, no persistence beyond optional `localStorage` for resuming a game.
- No animal art. Tokens = plain colored circles/discs with a player-color fill and a subtle border.

## 4. Game Rules Specification (must be implemented exactly)

Give the agent this as the canonical rule set, since "Ludo rules" have regional variants and this
removes ambiguity:

- 4 players: Red, Green, Yellow, Blue. Support 2–4 players (allow skipping colors).
- Each player has 4 tokens starting in their home yard.
- A token enters the main track only on rolling a **6**.
- Rolling a 6 grants an **extra roll**. Rolling **three 6s in a row** forfeits the turn (token
  reset penalty is optional — plain "lose the turn" is fine for v1).
- Standard 52-square shared outer track, plus each color's private 6-square home stretch (no
  captures possible in the home stretch).
- **Capturing**: landing exactly on a square occupied by a single opposing token sends that token
  back to its yard. Landing on a square with 2+ opposing tokens of the same color ("a block") is not
  allowed to capture and the moving token cannot land there.
- **Safe squares**: each color's entry square, plus the 4 star-marked squares, are safe. No captures
  on safe squares.
- A token needs an **exact roll** to enter the final home cell (no overshooting).
- Capturing an opponent or getting a token home grants an extra roll.
- A player wins when all 4 tokens reach home. Optionally support "last player standing" ranking for
  a 4-player game.

## 5. Architecture (keep it boring and testable)

```
index.html      # markup + SVG board mount point
style.css       # minimal styling, 4 player colors, board grid
game.js
  ├── rng.js        # rollDie() — isolated so it can be unit tested alone
  ├── boardModel.js # pure functions: token positions, legal moves, capture logic
  ├── gameState.js  # turn order, whose turn, roll history, win detection
  └── render.js     # DOM/SVG updates only — no game logic here
```

Keep **game logic and rendering strictly separated**. This is the single highest-leverage
architectural decision for a small project like this: it means the rules engine can be unit tested
headlessly (no browser, no DOM) exactly the way you'd unit test a SQL-generation pipeline against
fixtures, independent of any UI concerns.

## 6. Minimal UI Spec

- One SVG board (cross-shaped, standard 15x15 grid layout).
- 4 colored token sets, plain circles, no images.
- A single "Roll" button, disabled when it's not the current action.
- A small turn indicator (colored dot + player label).
- A move prompt only when a roll produces more than one legal move (click a token to choose).
- Optional: a small live histogram of roll counts (1–6) so far this game, purely as a
  self-verification tool for the fairness claim. This doubles as a debugging aid.

No animations beyond a simple CSS transition on token movement (transform, ~150ms). No sound
required unless you want it later.

## 7. Fairness Testing & Validation Plan

This is the part that actually earns the "not biased" claim, so treat it as a first-class
deliverable, not an afterthought:

1. **Unit test `rollDie()` in isolation**: run it 100,000+ times headlessly (Node, no browser),
   bucket the outcomes, and run a **chi-squared goodness-of-fit test** against the uniform
   distribution (expected ~16.67% each). Assert p > 0.01 (or whatever threshold you're comfortable
   with) rather than eyeballing percentages.
2. **Test rejection sampling boundary**: explicitly test that values 252–255 are rejected and
   re-rolled, not silently mapped.
3. **Rules engine unit tests** (no RNG involved): fixed board states in, expected legal moves out.
   Cover capture rules, safe-square rules, block rules, exact-roll-to-home, and the three-6s
   forfeiture, as separate deterministic test cases — the same "give me a fixed input, assert a
   fixed correct output" style you already use for SQL AST diffing.
4. **Manual playtest** for UI/UX only, after the logic is already proven correct headlessly.

## 8. Build Phases (hand these to the agent in order)

| Phase | Deliverable |
|---|---|
| 1 | `rng.js` with `rollDie()` + standalone chi-squared test script, run and show output |
| 2 | `boardModel.js`: board geometry, token position model, legal-move calculation (pure functions, unit tested) |
| 3 | `gameState.js`: turn order, extra-roll logic, win detection (unit tested against fixed scenarios) |
| 4 | `render.js` + `index.html`/`style.css`: minimal SVG board and token rendering, wired to the tested logic |
| 5 | Wire up the Roll button, move selection, turn indicator, optional roll histogram |
| 6 | Playtest pass, fix any UX rough edges only (logic should already be locked from phases 1–3) |

## 9. Prompt to Hand the Agent

> Build a browser-based, 4-player, pass-and-play Ludo game in vanilla HTML/CSS/JS (no frameworks,
> no build step). Follow the rule set, architecture, and phase order in this document exactly.
> Critically: implement dice rolling using `crypto.getRandomValues()` with rejection sampling (not
> `Math.random()`), and write it as an isolated, headlessly-testable function. Before writing any
> UI code, write and run a chi-squared uniformity test against 100,000+ rolls and show me the
> result. Keep game logic (board state, legal moves, captures, win detection) completely separate
> from rendering, and write unit tests for the logic layer using fixed board-state fixtures. Keep
> the UI minimal: plain colored circular tokens, an SVG board, no images, no animal assets, one Roll
> button, a turn indicator, and optionally a live roll-count histogram. Work through the phases in
> order and show me output after each phase before moving to the next.

---

This document is meant to be pasted directly into an agent session (Claude Code, etc.) along with
the final prompt in Section 9.