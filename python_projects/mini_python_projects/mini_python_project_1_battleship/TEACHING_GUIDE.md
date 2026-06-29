# One-Dimensional Battleship Teaching Guide

## Project Overview

This project implements a simplified, one-player version of Battleship. Instead
of a two-dimensional ocean grid, the game uses a list of 20 positions numbered
from `0` through `19`. The computer places ships at random positions, and the
player guesses positions until every ship segment is found or the allowed
number of misses is exceeded.

The simplified board makes the project appropriate for an introductory Python
course. Students can concentrate on program structure, lists, loops,
conditionals, methods, constants, and state changes without first solving the
more difficult problem of row-and-column coordinates.

### Real-World Connections

Although this is a game, it practices techniques used in many applications:

- A hidden board and a visible board model private and public information.
- Constants centralize configuration and business rules.
- Validation protects a program from invalid values.
- Small methods separate input, processing, storage, and output.
- State markers represent changes over time.
- Random placement resembles randomized simulations and test-data generation.

### Main Learning Objectives

Students should learn how to:

- Organize a complete program inside a class.
- Use static methods when no individual object state is required.
- Store board state in one-dimensional lists.
- Use class constants instead of scattered literal values.
- Divide a large problem into methods with focused responsibilities.
- Use return values to communicate between methods.
- Validate numeric ranges without terminating the program.
- Build loops with clear winning and losing conditions.
- Hide information from the player while preserving it internally.
- Test random and interactive code in a controlled way.

## Learning Outcomes

After studying this project, students should be able to explain and apply the
following concepts.

### Classes

`Battleship` groups related constants and methods under one meaningful name. The
class acts as a namespace and organizational unit for the game.

### Objects and Constructors

This version does **not** create `Battleship` objects and therefore does not
define an `__init__` constructor. All methods are static, and game state is
stored in local variables and lists.

This is an important design observation: using a class does not automatically
mean that object instances are required. A later version could create a game
object and move `hidden_board`, `display_board`, `hits`, and `misses` into
instance attributes.

### Encapsulation

The project demonstrates organizational encapsulation by keeping game rules and
operations together in one class. It does not use private instance attributes
because it does not create instances.

The two-board design also demonstrates information hiding:

- `hidden_board` contains ship locations.
- `display_board` contains only information the player is allowed to see.

### Inheritance

Inheritance is not used in this project. There is only one class, and the game
does not require multiple related types. Adding inheritance solely to satisfy a
checklist would make the beginner solution more complicated without improving
its design.

### Polymorphism and Method Overriding

Polymorphism and method overriding are not used. These concepts become useful
when several child classes provide different implementations of a shared
method. This game has no such class family.

### Equality Methods and String Representations

The class does not define `__eq__` or `__str__` because no `Battleship` objects
are compared or printed. Board contents are ordinary lists and strings.

An object-oriented extension could define these methods for `Ship`, `Board`, or
`GameResult` objects.

### Abstract Classes and Interfaces

No abstract classes or formal interfaces are used. There is only one concrete
game controller, so an abstract contract would add structure without a current
need.

### Composition Versus Inheritance

The program uses simple data composition: a game is assembled from boards,
counters, markers, and rules. It does not model these components as separate
objects, but the conceptual relationship is still “a game has boards and
scores,” not “a game is a kind of board.”

That distinction is central to object-oriented design:

- Use inheritance for an **is-a** relationship.
- Use composition for a **has-a** relationship.

## Project Architecture

### Class and Method Structure

```text
Battleship
├── Constants
│   ├── BOARD_SIZE
│   ├── MAX_MISSES
│   ├── SHIP_SIZES
│   ├── EMPTY
│   ├── SHIP
│   ├── HIT
│   └── MISS
│
├── Program control
│   ├── main()
│   ├── play_game()
│   └── ask_play_again()
│
├── Board creation and ship placement
│   ├── create_empty_board()
│   ├── place_ships()
│   └── can_place_ship()
│
├── Player turn processing
│   ├── get_user_guess()
│   └── process_guess()
│
└── Status and completion
    ├── display_status()
    └── all_ships_sunk()
```

### Runtime Flow

```text
main()
  |
  v
play_game()
  |
  +--> create two empty boards
  +--> place ships on hidden board
  |
  +--> repeat turns
  |      +--> display_status()
  |      +--> get_user_guess()
  |      +--> validate range
  |      +--> process_guess()
  |      +--> update hit/miss counters
  |
  +--> announce win or loss
  |
  v
ask_play_again()
```

### State Representation

The game uses short string markers:

| Marker | Meaning |
|---|---|
| `-` | Position has not been guessed |
| `S` | Hidden ship segment |
| `H` | Guessed ship segment |
| `M` | Guessed water |

The hidden and display boards begin as separate lists. This matters because
assigning both names to the same list would allow visible changes to affect
secret data.

## File-by-File Breakdown

### `Battleship.py`

#### Purpose

Contains the entire playable game. It defines configuration constants, creates
the boards, places ships, processes user guesses, tracks scores, displays
status, decides the outcome, and controls replay.

#### Main Class

`Battleship` is a class-based game controller. It is not instantiated; its
static methods are called with `Battleship.method_name(...)`.

#### Key Methods

- `main()` controls multiple complete games.
- `play_game()` coordinates one game from setup through outcome.
- `create_empty_board()` creates a fresh one-dimensional board.
- `place_ships()` randomly places ships without overlap.
- `can_place_ship()` checks whether proposed positions are empty.
- `get_user_guess()` reads and converts the player's input.
- `process_guess()` identifies repeated guesses, hits, and misses.
- `display_status()` prints the visible board and score.
- `all_ships_sunk()` checks the winning condition.
- `ask_play_again()` normalizes the player's replay response.

#### Important Concepts

- Static methods
- Class constants
- List creation and mutation
- Random numbers
- Sentinel markers
- Nested loops
- Boolean conditions
- Input conversion
- Range validation
- Return values
- Separation of concerns
- The `if __name__ == "__main__":` entry-point guard

## Object-Oriented Design Analysis

### Why a Class Is Used

The class places all Battleship rules and operations in a single named unit.
This makes calls such as `Battleship.place_ships(...)` self-documenting and
prevents unrelated global names from spreading throughout the module.

### Why Static Methods Are Used

Every method either:

- Uses class constants, or
- Receives the data it needs as parameters.

No method needs a `self` reference. Static methods make that design explicit.

### Why State Is Passed as Arguments

Passing boards into methods makes data flow visible. For example,
`process_guess(guess, hidden_board, display_board)` clearly states which values
the method reads or changes.

This style is useful for beginners because it avoids hidden dependencies.

### Why Two Boards Are Used

A single board would create a presentation problem: ship markers must remain
secret, while hit and miss markers must be visible. Two lists separate those
responsibilities.

### Why Constants Are Class Attributes

Values such as board size, maximum misses, and markers are rules of the game.
Class constants:

- Give meaningful names to repeated values.
- Make rule changes easier.
- Prevent inconsistent hardcoded values.
- Communicate that the values are configuration, not temporary data.

### Why Methods Are Small

Each method has one main responsibility. This improves:

- Readability
- Testing
- Debugging
- Reuse
- Future modification

For example, placement checking is separate from placement itself. That allows
`can_place_ship()` to be tested independently.

### Why Inheritance and Abstract Classes Are Absent

There is no natural family of related classes in the current requirements.
Inheritance would be appropriate only after introducing types such as several
different game modes that share a common interface.

### How Code Reuse Is Achieved

Reuse occurs through helper methods and constants rather than inheritance:

- Both boards come from `create_empty_board()`.
- Every ship placement uses `can_place_ship()`.
- All outcome checks use `all_ships_sunk()`.
- The replay loop calls `play_game()` rather than duplicating setup.

### How `super()` Is Used

`super()` is not used because the class does not inherit customized behavior
from a project-specific parent class.

## Method Walkthroughs

Let:

- `B` be the board size.
- `K` be the number of ships.
- `L` be a ship's length.
- `G` be the number of guesses made.

### `main()`

- **Purpose:** Start the program and manage replay.
- **Inputs:** None directly; replay input is delegated.
- **Output:** None.
- **Algorithm:** Print a welcome message, run a game, ask whether to replay, and
  repeat while the answer is `y`.
- **Complexity:** `O(number of games)` calls to `play_game()`.

### `play_game()`

- **Purpose:** Coordinate one complete game.
- **Inputs:** None.
- **Output:** None.
- **Algorithm:**
  1. Create hidden and display boards.
  2. Place ships.
  3. Initialize hit and miss counters.
  4. Repeat while ships remain and misses are allowed.
  5. Validate each guess.
  6. Process the result and update a counter.
  7. Display the final status and outcome.
- **Complexity:** Approximately `O(B + placement work + G * B)`. The `G * B`
  portion comes from checking for remaining ship markers each turn.

### `create_empty_board()`

- **Purpose:** Create a fresh board.
- **Inputs:** None.
- **Output:** A list of `BOARD_SIZE` empty markers.
- **Algorithm:** Repeat the immutable empty marker `BOARD_SIZE` times.
- **Complexity:** `O(B)` time and `O(B)` space.

### `place_ships(hidden_board)`

- **Purpose:** Randomly place every ship without overlap.
- **Inputs:** The hidden board list.
- **Output:** None; the list is modified in place.
- **Algorithm:**
  1. Visit each ship size.
  2. Select a legal starting index.
  3. Check the proposed range.
  4. If clear, mark all positions as ship segments.
  5. Otherwise, choose another random start.
- **Complexity:** Expected work depends on random retries. Each attempted
  placement checks `O(L)` positions. With this small board and ship set, the
  method finishes quickly.

### `can_place_ship(hidden_board, start_position, ship_size)`

- **Purpose:** Prevent ships from overlapping.
- **Inputs:** Board, proposed start, and ship length.
- **Output:** `True` if every needed position is empty; otherwise `False`.
- **Algorithm:** Scan the proposed consecutive positions and stop immediately
  if one is occupied.
- **Complexity:** `O(L)` time and `O(1)` extra space.

### `get_user_guess()`

- **Purpose:** Read one guess.
- **Inputs:** Keyboard text.
- **Output:** An integer.
- **Algorithm:** Call `input()` and convert the returned string with `int()`.
- **Complexity:** `O(1)` for the project’s small numeric input.
- **Important behavior:** Non-numeric input raises `ValueError`, which the
  assignment permits.

### `process_guess(guess, hidden_board, display_board)`

- **Purpose:** Apply one valid in-range guess.
- **Inputs:** Guess index and both boards.
- **Output:** `H`, `M`, or `None` for a repeated guess.
- **Algorithm:**
  1. Check the display board for an earlier hit.
  2. Check the display board for an earlier miss.
  3. Check the hidden board for a ship.
  4. Mark and return the appropriate result.
- **Complexity:** `O(1)` time and `O(1)` extra space.

### `display_status(display_board, hits, misses)`

- **Purpose:** Present readable game state without revealing ships.
- **Inputs:** Display board and score totals.
- **Output:** None; text is printed.
- **Algorithm:** Build aligned position and marker strings, then print totals.
- **Complexity:** `O(B)` time and `O(B)` temporary string space.

### `all_ships_sunk(hidden_board)`

- **Purpose:** Determine whether the player has won.
- **Inputs:** Hidden board.
- **Output:** Boolean.
- **Algorithm:** Search for any remaining `S` marker.
- **Complexity:** `O(B)` time and `O(1)` extra space.

### `ask_play_again()`

- **Purpose:** Normalize the replay response.
- **Inputs:** Keyboard text.
- **Output:** `True` only when the normalized answer is `y`.
- **Algorithm:** Remove surrounding whitespace and convert to lowercase.
- **Complexity:** `O(n)`, where `n` is the short response length.

## Algorithm Analysis

### Random Placement

For a ship of length `L`, the largest legal start is:

```text
BOARD_SIZE - L
```

Because `random.randint(a, b)` includes both endpoints, this permits a ship to
end exactly at the final board position without exceeding the list boundary.

### Non-Overlap Rule

Before placement, every target index must contain `EMPTY`. If even one position
contains a ship marker, the entire candidate placement is rejected.

### Winning Rule

Every hit changes a hidden `S` marker to `H`. Therefore:

```python
Battleship.SHIP not in hidden_board
```

is true exactly when all ship segments have been hit.

### Losing Rule

The loop continues while:

```python
misses <= Battleship.MAX_MISSES
```

The assignment states that the player loses when misses are **greater than**
the maximum. With a maximum of six, the seventh miss ends the game.

## Common Student Mistakes

### Using the Same List for Both Boards

Incorrect:

```python
hidden_board = display_board = Battleship.create_empty_board()
```

Both names would refer to one list, so visible updates could alter hidden data.

### Revealing the Hidden Board

Printing `hidden_board` during normal play exposes all ship positions. Only the
display board should be shown.

### Choosing an Invalid Random Start

Using the entire board range for every ship can create an index past the end of
the list. The starting range must account for ship length.

### Forgetting to Check for Overlap

Writing ship markers immediately can overwrite earlier ships and reduce the
total number of occupied positions.

### Counting Repeated Guesses

A repeated hit should not add another hit, and a repeated miss should not add
another miss. Returning `None` prevents either counter from changing.

### Using `>=` for the Loss Rule

If the requirement says “misses are greater than the maximum,” using `>=`
would make the player lose one turn too early.

### Hardcoding Board Rules

Repeating `20`, `6`, or marker strings throughout methods makes rule changes
error-prone. Constants should be the single source of truth.

### Putting Everything in `main()`

A long `main()` method is harder to test and understand. Setup, placement,
input, processing, display, and outcome checks should remain separate.

### Misunderstanding Static Methods

Static methods receive no automatic `self` or `cls` argument. They must access
constants through `Battleship.CONSTANT` and receive changing state explicitly.

### Incorrect Constructor Design

This version intentionally has no constructor. Adding `__init__` without moving
state into instance attributes would provide no benefit.

### Forcing Inheritance

Inheritance should model a meaningful “is-a” relationship. Creating arbitrary
parent classes for a single game controller would add complexity without useful
reuse.

## Debugging Guide

### Common Runtime Errors

#### `ValueError` from `int()`

Cause: The player entered non-numeric text.

Tracing approach:

1. Locate `get_user_guess()`.
2. Inspect the value returned by `input()`.
3. Decide whether the assignment requires a `try`/`except` extension.

#### `IndexError`

Possible cause: A guess or ship position was used before range checking.

Tracing approach:

1. Print or inspect the index.
2. Confirm `0 <= index < BOARD_SIZE`.
3. Verify the largest ship start is `BOARD_SIZE - ship_size`.

#### Infinite Placement Loop

Possible cause: Ship sizes cannot fit on the board or too much board space is
occupied.

Tracing approach:

1. Check that `sum(SHIP_SIZES) <= BOARD_SIZE`.
2. Inspect proposed start positions.
3. Test `can_place_ship()` separately.

### Common Logical Errors

#### Ships Appear on the Visible Board

Check which board is passed to `display_status()`.

#### Win Never Occurs

Confirm a hit changes the hidden marker from `S` to `H`.

#### Repeated Guess Changes the Score

Confirm repeated-guess branches return before new hit/miss processing.

#### Player Loses at Six Misses

Compare the loop condition with the exact wording “greater than the maximum.”

### How to Trace Execution

For one turn, follow this call path:

```text
play_game
  -> display_status
  -> get_user_guess
  -> range check
  -> process_guess
  -> update one counter or neither counter
  -> all_ships_sunk
```

When debugging, write down:

- The guess
- The hidden marker at that index
- The display marker before processing
- The returned result
- Hits and misses before and after

## Testing Guide

### Board Creation Tests

- The board has exactly `BOARD_SIZE` elements.
- Every initial element is `EMPTY`.
- Two calls return different list objects.

### Placement Tests

- The number of `S` markers equals `sum(SHIP_SIZES)`.
- No ship extends beyond the board.
- Ships do not overlap.
- Repeating the test many times still satisfies the rules.

### Guess Processing Tests

- A ship position returns `H`.
- A water position returns `M`.
- A repeated hit returns `None`.
- A repeated miss returns `None`.
- A hit updates both boards appropriately.
- A miss updates only the display board.

### Boundary Tests

- `0` is accepted.
- `BOARD_SIZE - 1` is accepted.
- `-1` is rejected without crashing.
- `BOARD_SIZE` is rejected without crashing.

### Completion Tests

- `all_ships_sunk()` is false while any `S` remains.
- It becomes true after the final `S` changes to `H`.
- The seventh miss causes a loss when `MAX_MISSES` is six.

### Replay Tests

- `y`, `Y`, and surrounding spaces request replay.
- Other answers end the program.

### Randomness and Interactive Testing

Random and interactive programs are easier to test when dependencies are
controlled:

- Replace random placement temporarily with known positions.
- Replace `input()` temporarily with a sequence of prepared answers.
- Test helper methods directly with small boards.

## Example Program Execution

Ship locations vary because placement is random. A shortened session might look
like this:

```text
Welcome to One-Dimensional Battleship!

A new game is starting!
The board has positions 0 through 19.
There are 3 hidden ships.
You lose after more than 6 misses.
H = hit, M = miss, - = not guessed

Enter your guess: 5
Miss! That position is water.

Enter your guess: 8
Hit! You found part of a ship.

Enter your guess: 8
You already guessed that position and found a hit.
```

### Explanation

1. The first guess finds water, so position `5` becomes `M` on the display
   board and the miss total increases.
2. The second guess finds a hidden `S`. Both boards change that position to
   `H`, and the hit total increases.
3. The repeated guess is detected using the display board. It changes neither
   counter.

### Invalid Range Example

```text
Enter your guess: 25
Error: please enter a position from 0 through 19.
```

The method continues the loop rather than indexing the list, so no `IndexError`
occurs and the invalid guess does not count as a turn.

## Suggested Extensions

1. Catch non-numeric input with `try` and `except`.
2. Display the number of unhit ship segments.
3. Track all prior guesses in a set.
4. Add named ships and report when each one is sunk.
5. Convert the static design into instantiated `BattleshipGame`, `Board`, and
   `Ship` classes.
6. Build a two-dimensional board.
7. Add difficulty levels that change board size and allowed misses.
8. Add deterministic random seeds for reproducible testing.
