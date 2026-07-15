Here's a prompt you can give to a coding LLM (Claude Code, Codex, Gemini CLI, Cursor Agent, etc.) that is specific enough to produce a polished implementation.

---

You are working on an existing HTML/CSS/JavaScript Ludo game (no frameworks). Implement a realistic 3D dice roll animation using only vanilla HTML, CSS, and JavaScript.

### Goal

Replace the current dice visualization with a CSS 3D cube that spins realistically and always lands on the correct face corresponding to the already-generated roll value.

The dice animation should feel similar to physical dice used in modern board game apps.

### Requirements

#### General

- Use only vanilla HTML, CSS and JavaScript.
- Do not introduce any external libraries.
- The implementation should integrate into the existing project instead of replacing unrelated code.
- Keep the code modular and easy to maintain.

#### Dice

Create a 3D cube using CSS transforms.

The cube should contain six correctly oriented faces.

Each face should display proper dice pips (not text numbers).

The cube should use:

- `transform-style: preserve-3d`
- `perspective`
- CSS transitions or keyframe animations
- subtle lighting and shadows
- rounded edges
- realistic proportions

#### Animation

When the player rolls:

1. The game logic immediately generates the roll result (1–6).
2. Store that value.
3. Start the animation.
4. The cube should rapidly spin in multiple random directions.
5. The animation should decelerate naturally.
6. The cube must finish with the correct face pointing toward the player.

Do **not** randomly determine the result during the animation.

Instead:

```
const result = rollDice(); // already decided

animateDice(result);

await animation;

continueGame(result);
```

#### Rotation

Use extra rotations so the cube doesn't simply rotate directly to the destination.

For example:

- 720–1440° extra X rotation
- 720–1440° extra Y rotation
- slight Z wobble

Each roll should look different even if the result is identical.

#### Easing

Use a natural easing curve such as

```
cubic-bezier(.17,.67,.32,1.2)
```

or another easing that resembles a die losing momentum.

The animation duration should be approximately 1.2–1.8 seconds.

#### Sound

The project root already contains:

```
die-roll-sound.mp3
```

Integrate this sound with the animation.

Requirements:

- preload the audio
- start playback exactly when the roll animation begins
- stop naturally (do not abruptly cut it off)
- if another roll begins before playback finishes, restart the sound cleanly:

```javascript
audio.pause();
audio.currentTime = 0;
audio.play();
```

The sound and animation should feel synchronized.

#### Prevent Double Rolls

While the animation is running:

- disable the roll button
- ignore additional roll requests
- re-enable interaction only after the animation completes.

#### API

Expose a clean API like:

```javascript
await dice.roll(result);
```

or

```javascript
await animateDice(result);
```

The function should return a Promise that resolves only after the animation finishes.

#### Mapping

Create a clean mapping from result → cube orientation.

Example:

```javascript
const orientations = {
    1: "...",
    2: "...",
    ...
};
```

Avoid hardcoding transforms throughout the code.

#### Visual Polish

Add subtle improvements:

- soft drop shadow beneath the die
- slight scale-up when rolling
- tiny bounce when landing
- optional motion blur using CSS
- anti-aliased edges
- white die with black pips

The result should feel polished but lightweight.

#### Accessibility

Respect

```css
prefers-reduced-motion
```

If reduced motion is enabled:

- skip the spinning animation
- immediately transition to the final face
- still play the roll sound unless muted elsewhere.

### Deliverables

1. All modified HTML.
2. All CSS additions.
3. All JavaScript additions.
4. A short explanation of how the orientation mapping works.
5. Clearly indicate where the code should be inserted into the existing project rather than rewriting unrelated files.

The implementation should be production-quality, performant, and suitable for a polished browser-based Ludo game.
