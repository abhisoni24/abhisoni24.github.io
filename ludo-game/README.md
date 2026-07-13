# Ludo Game

A modern, browser-based implementation of the classic board game Ludo, featuring custom SVG geometry, a fully integrated game engine, and state persistence!

## How to Play Locally

1. Open your terminal and navigate to the project directory:
   ```bash
   cd /path/to/ludo
   ```
2. Start a local HTTP server. For example, using Python 3:
   ```bash
   python3 -m http.server 8080
   ```
3. Open your web browser and navigate to:
   [http://localhost:8080](http://localhost:8080)
4. Choose either the 4-Player or 5-Player board from the main menu to begin your game.
5. The game state saves automatically. You can refresh or close the browser, and the game will pick up right where you left off. Click the "Home" button during gameplay to clear the saved state and return to the main menu.

## Rules of the Game

### Setup
- The game can be played by 4 or 5 players.
- Each player starts with 4 tokens in their respective colored yard (bank).
- Players take turns rolling the dice in a clockwise order.

### Entering the Track
- To move a token out of the yard and onto the start square, a player must roll a **6**.
- If a player does not roll a 6 and has no other tokens on the track, their turn ends.

### Movement
- Tokens move clockwise along the main track according to the number rolled on the dice.
- A player must move a token if a valid move is available.
- **Bonus Rolls**: Rolling a 6 grants the player an extra roll. However, rolling three 6s in a row forfeits the turn!

### Capturing
- If a player's token lands on exactly the same square as an opponent's token, the opponent's token is captured and sent back to their yard.
- Capturing an opponent grants the capturing player an extra roll.
- **Safe Squares**: Certain squares on the board (marked by colored start bases and grey circles) are safe squares. Tokens cannot be captured when resting on these squares.

### Blocking
- If two or more tokens of the **same color** land on the same square, they form a **block**.
- Opposing tokens cannot capture, land on, or pass a block! The block acts as an impassable barrier for all opponents.

### Reaching Home
- After traveling a full lap around the board, a token turns into its own colored "Home Stretch".
- To reach the final **HOME** square, a player must roll the **exact number** required. Over-rolling prevents the token from moving.
- Landing a token in the HOME square grants the player an extra roll.
- The first player to safely navigate all 4 of their tokens into the HOME square wins the game!
