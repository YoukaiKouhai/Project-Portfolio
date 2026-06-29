# Study Guide: One-Dimensional Battleship

## Key Vocabulary

### Algorithm

A finite sequence of steps used to solve a problem. Ship placement and guess
processing are algorithms.

### Argument

A value supplied in a method call. In
`process_guess(guess, hidden_board, display_board)`, the three supplied values
are arguments.

### Attribute

A name stored on a class or object. `BOARD_SIZE` is a class attribute.

### Boolean Expression

An expression that evaluates to `True` or `False`, such as
`guess < 0 or guess >= BOARD_SIZE`.

### Class

A program structure that groups related data and behavior. `Battleship` groups
the game's rules and methods.

### Class Constant

A class attribute intended not to change during execution. Python communicates
this intent through uppercase names.

### Composition

A design relationship in which one concept has other components. A game has
boards, ships, counters, and rules.

### Constructor

The `__init__` method used to initialize a new object. This project does not
create game objects, so it does not require a constructor.

### Encapsulation

Grouping related data and methods and controlling how state is accessed. The
class groups game operations, while separate boards hide ship information from
the player.

### Entry-Point Guard

The condition:

```python
if __name__ == "__main__":
```

It starts the program only when the file is run directly.

### Index

The numeric position of an element in a list. Python list indexes begin at
zero.

### Inheritance

A relationship in which one class receives behavior from a parent class.
Inheritance is not used in this project because there is no necessary class
family.

### Invariant

A condition that should remain true while the program runs, such as the board
always having `BOARD_SIZE` elements.

### Method

A function defined inside a class.

### Mutation

Changing an existing mutable object. Placing an `S` into a board list mutates
that list.

### Parameter

A name in a method definition that receives an argument.

### Polymorphism

Using one interface with several object types that provide different behavior.
This project does not require polymorphism.

### Randomization

Using random choices so repeated program runs may behave differently.

### Return Value

Data sent back to the caller. `process_guess()` returns a hit marker, miss
marker, or `None`.

### Sentinel or Marker

A special value that represents state. `S`, `H`, `M`, and `-` are board
markers.

### Static Method

A method stored in a class namespace that receives no automatic `self` or
`cls` argument.

### State

The current data values that describe the program at a moment in time.

## Important Rules and Calculations

### Board Index Range

For a board of size `B`, legal indexes are:

```text
0 through B - 1
```

With `BOARD_SIZE = 20`, legal guesses are `0` through `19`.

### Largest Legal Ship Start

For ship length `L`:

```text
largest_start = BOARD_SIZE - L
```

Example for a ship of size four:

```text
20 - 4 = 16
```

A ship starting at 16 occupies indexes 16, 17, 18, and 19.

### Total Ship Segments

```text
2 + 3 + 4 = 9
```

The player must make nine unique hits to win.

### Loss Boundary

The player loses when:

```text
misses > MAX_MISSES
```

If the maximum is six, misses zero through six allow play to continue. Miss
seven ends the game.

### Complexity Summary

| Method | Time Complexity |
|---|---|
| `create_empty_board()` | `O(B)` |
| `can_place_ship()` | `O(L)` |
| `process_guess()` | `O(1)` |
| `display_status()` | `O(B)` |
| `all_ships_sunk()` | `O(B)` |

Random ship placement depends on how many candidate positions must be retried.

## Important Class

### `Battleship`

Responsibilities:

- Store fixed game rules.
- Create boards.
- Place ships.
- Read and process guesses.
- Display visible state.
- Determine win or loss.
- Control replay.

Design note:

The class is not instantiated. It organizes static behavior rather than
representing one game object.

## Important Methods

### `main()`

Controls complete games and replay.

### `play_game()`

Coordinates setup, turns, scoring, and outcome.

### `create_empty_board()`

Creates a fresh list of empty markers.

### `place_ships()`

Randomly places each ship and retries invalid overlapping positions.

### `can_place_ship()`

Checks a proposed consecutive range for emptiness.

### `get_user_guess()`

Reads text and converts it to an integer.

### `process_guess()`

Handles repeated guesses, hits, misses, and board updates.

### `display_status()`

Prints the visible board without revealing ships.

### `all_ships_sunk()`

Returns true when no hidden `S` marker remains.

### `ask_play_again()`

Normalizes the player's response and returns a Boolean.

## Concept Summaries

### Separate Hidden and Display State

The hidden board is the source of truth for ship locations. The display board
is the player's knowledge. Separating them prevents accidental information
leaks.

### Mutation and Shared References

Lists are mutable. A method can change a board passed as an argument without
returning the list. This works because the parameter refers to the same list
object as the caller's variable.

### Separation of Concerns

Each method answers one main question:

- How is a board created?
- Can a ship fit?
- What happened at this guess?
- Has the player won?

Small methods make the program easier to reason about.

### Return Values as Communication

`process_guess()` changes the boards and also returns a result. The caller uses
that result to update exactly one counter, or neither counter for a repeat.

### Input Validation

The program validates the numeric range before indexing the board. This avoids
out-of-range access while allowing the game to continue.

### Random Retry Algorithm

Placement uses repeated random candidates. A candidate is accepted only if all
required positions are empty.

### Class-Based Versus Instance-Based Design

Current design:

- Static methods
- Local game state
- No constructor

Possible future design:

- A `BattleshipGame` object
- Instance attributes for boards and scores
- Instance methods using `self`

Neither style is universally correct. The appropriate design depends on the
program's size and requirements.

## Review Questions

1. Why are there two board lists?
2. What does each marker represent?
3. Why does Python use index 19 as the final position of a 20-element list?
4. Why is `BOARD_SIZE - ship_size` a legal maximum start?
5. How does the program prevent ship overlap?
6. Why does `process_guess()` check the display board first?
7. What is returned for a repeated guess?
8. Why does the hidden board change from `S` to `H` after a hit?
9. What exact condition indicates victory?
10. Why does the seventh miss cause a loss?
11. What is the purpose of `continue` after invalid input?
12. Why are constants uppercase?
13. Why are static methods appropriate here?
14. What would change if this became an instance-based class?
15. Why is inheritance absent?
16. What does the entry-point guard accomplish?
17. Which methods mutate lists?
18. Which methods return Boolean values?
19. Which method has expected runtime affected by randomness?
20. How could the program be tested without manually typing guesses?

## Practice Exercises

### Exercise 1: Trace Board Creation

Write the exact list returned when `BOARD_SIZE` is temporarily set to five.

### Exercise 2: Legal Placement

For a board of size ten and a ship of size three:

1. List every legal starting index.
2. Show which indexes are occupied by a ship starting at seven.

### Exercise 3: Overlap Check

Given:

```python
board = ["-", "-", "S", "S", "-", "-", "-"]
```

Determine the result of these proposed placements:

- Start 0, size 2
- Start 1, size 3
- Start 4, size 3

### Exercise 4: Trace Guess Processing

Given:

```python
hidden = ["-", "S", "-", "S"]
display = ["-", "-", "-", "-"]
```

Trace guesses `1`, `2`, `1`, and `3`. Record both boards and the return value
after each guess.

### Exercise 5: Boundary Analysis

Explain what should happen for guesses:

- `-1`
- `0`
- `19`
- `20`

### Exercise 6: Improve Input Handling

Write pseudocode that catches non-numeric input and asks again without ending
the game.

### Exercise 7: Count Remaining Segments

Design a method that returns the number of unhit `S` markers.

### Exercise 8: Test Replay Responses

Predict the Boolean result for:

- `"y"`
- `"Y"`
- `" y "`
- `"yes"`
- `"n"`
- `""`

## Challenge Exercises

### Challenge 1: Deterministic Placement

Modify the design on paper so a test can supply a known random-number generator
or a list of starting positions.

### Challenge 2: Instance-Based Refactor

Design an `__init__` method with these instance attributes:

- `hidden_board`
- `display_board`
- `hits`
- `misses`

Identify which static methods should become instance methods.

### Challenge 3: `Board` and `Ship` Composition

Sketch three classes:

- `BattleshipGame`
- `Board`
- `Ship`

Assign each current method to the most appropriate class.

### Challenge 4: Two-Dimensional Board

Represent a 5-by-5 board with a nested list. Explain how a guess changes from
one integer to a row-column pair.

### Challenge 5: Constant-Time Win Check

Track the number of remaining ship segments so victory can be checked without
scanning the board every turn.

### Challenge 6: Formal Cell States

Replace marker strings with an enumeration. Explain how this prevents invalid
marker values.

## Exam-Style Questions

### Question 1: Code Reading

What list indexes are visited?

```python
start_position = 6
ship_size = 4

for position in range(start_position, start_position + ship_size):
    print(position)
```

**Expected answer:** `6`, `7`, `8`, and `9`.

### Question 2: Logical Condition

Explain in words:

```python
not Battleship.all_ships_sunk(hidden_board) and misses <= 6
```

**Expected answer:** Continue only while at least one unhit ship segment remains
and the number of misses has not become greater than six.

### Question 3: State Mutation

After a successful hit, which boards change and why?

**Expected answer:** The hidden board changes `S` to `H` so the ship segment is
no longer considered unhit. The display board changes `-` to `H` so the player
can see the result.

### Question 4: Design

Why is `can_place_ship()` separate from `place_ships()`?

**Expected answer:** It isolates one rule, reduces complexity in the placement
method, improves readability, and makes overlap checking independently
testable.

### Question 5: Bug Analysis

Identify the error:

```python
start_position = random.randint(0, Battleship.BOARD_SIZE - 1)
```

**Expected answer:** The chosen start does not account for ship length, so a
multi-position ship may extend beyond the board.

### Question 6: OOP Reasoning

Why does the project not define `__eq__()`?

**Expected answer:** The program does not create or compare Battleship objects.
Equality behavior would be useful only after introducing objects such as ships,
boards, or configurations that need value-based comparison.

### Question 7: Complexity

What is the time complexity of searching a board of size `B` for a remaining
ship marker?

**Expected answer:** `O(B)` in the worst case.

### Question 8: Testing

Describe a test for a repeated hit.

**Expected answer:** Prepare boards where the display and hidden boards already
contain `H` at the guessed index, call `process_guess()`, assert that it returns
`None`, and assert that neither board changes.

## Final Self-Assessment

You are ready to extend the project when you can:

- Trace every method call during one turn.
- Explain every board marker.
- Justify the maximum ship start calculation.
- Explain why repeated guesses do not change scores.
- Distinguish constants from changing state.
- Explain why static methods were chosen.
- Identify what would become object attributes in a refactor.
- Write tests for boundaries, placement, hits, misses, and victory.
