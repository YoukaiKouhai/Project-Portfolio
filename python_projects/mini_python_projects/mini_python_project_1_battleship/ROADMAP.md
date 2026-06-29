# Student Roadmap: One-Dimensional Battleship

Use this roadmap to study the project in manageable stages. Do not begin by
memorizing the entire file. First understand the data, then the helper methods,
and finally the complete control flow.

## Stage 1: Understand the Problem

### Concepts to Learn

- Rules of the simplified game
- One-dimensional board positions
- Hidden versus visible information
- Winning and losing conditions

### Files to Read

- `Battleship.py`: module docstring, class constants, and `play_game()`

### Methods to Study

- `play_game()`
- `all_ships_sunk()`

### Questions to Answer

1. Why are positions numbered `0` through `19` rather than `1` through `20`?
2. What information must remain hidden from the player?
3. Exactly when does the player win?
4. If `MAX_MISSES` is six, which miss causes a loss?
5. How many ship segments must be hit in total?

## Stage 2: Understand the Class Organization

### Concepts to Learn

- Classes as organizational units
- Static methods
- Class constants
- Naming conventions

### Files to Read

- `Battleship.py`: class declaration, constants, and `main()`

### Methods to Study

- `main()`

### Questions to Answer

1. Why does this project use a class?
2. Why do the methods not receive `self`?
3. Why are rule values stored in uppercase constants?
4. What is the difference between a class and an object?
5. Why does this class not need an `__init__` constructor?

## Stage 3: Understand Board Representation

### Concepts to Learn

- Lists
- Indexes
- Marker values
- Mutable state
- Separate references

### Files to Read

- `Battleship.py`: constants and board-related docstrings

### Methods to Study

- `create_empty_board()`
- `display_status()`

### Questions to Answer

1. What does each board marker mean?
2. Why are hidden and display boards separate lists?
3. What would happen if both variables referred to the same list?
4. Why does `display_status()` receive only the display board?
5. How does `:2` in an f-string improve output?

## Stage 4: Understand Ship Placement

### Concepts to Learn

- Random integers
- Consecutive list positions
- Nested loops
- Range endpoints
- Early return
- In-place mutation

### Files to Read

- `Battleship.py`: ship placement section

### Methods to Study

- `place_ships()`
- `can_place_ship()`

### Questions to Answer

1. Why is the largest start `BOARD_SIZE - ship_size`?
2. Why must all proposed positions be checked before writing any marker?
3. What causes the inner `while` loop to repeat?
4. How does the code prevent overlap?
5. Why does `range(start, start + ship_size)` mark exactly the right length?

## Stage 5: Understand One Player Turn

### Concepts to Learn

- Input conversion
- Range validation
- Branching
- Return values
- State transitions

### Files to Read

- `Battleship.py`: input and guess processing section

### Methods to Study

- `get_user_guess()`
- `process_guess()`

### Questions to Answer

1. Why is range validation outside `get_user_guess()`?
2. Why is the display board checked before the hidden board?
3. What changes after a hit?
4. What changes after a miss?
5. Why does a repeated guess return `None`?

## Stage 6: Understand the Game Loop

### Concepts to Learn

- Compound Boolean expressions
- Loop invariants
- Counters
- `continue`
- Termination conditions

### Files to Read

- `Battleship.py`: complete `play_game()` method

### Methods to Study

- `play_game()`
- `all_ships_sunk()`

### Questions to Answer

1. What must be true for another turn to begin?
2. Why does an out-of-range guess use `continue`?
3. Which method decides whether hits or misses increase?
4. Why is status displayed again after the loop?
5. How does replacing `S` with `H` support the win check?

## Stage 7: Understand Program Control and Replay

### Concepts to Learn

- Entry points
- Nested repetition
- Input normalization
- Function call flow

### Files to Read

- `Battleship.py`: `main()`, `ask_play_again()`, and the module guard

### Methods to Study

- `main()`
- `ask_play_again()`

### Questions to Answer

1. Which loop controls turns?
2. Which loop controls complete games?
3. Why are `strip()` and `lower()` used?
4. What does the `if __name__ == "__main__":` guard prevent?
5. What happens when the player enters anything other than `y`?

## Stage 8: Understand the Design Choices

### Concepts to Learn

- Separation of concerns
- Cohesion
- Coupling
- Composition
- Appropriate use of inheritance

### Files to Read

- `TEACHING_GUIDE.md`: Object-Oriented Design Analysis
- `Battleship.py`: all method boundaries

### Methods to Study

- Compare all methods by responsibility

### Questions to Answer

1. Why is `play_game()` a coordinator rather than the location of every detail?
2. How do helper methods reduce duplicate code?
3. Why is inheritance unnecessary in the current project?
4. What data could become instance attributes in a future version?
5. Which responsibilities could become separate classes?

## Stage 9: Test the Project

### Concepts to Learn

- Unit testing ideas
- Boundary tests
- Deterministic testing
- Testing side effects
- Testing randomness

### Files to Read

- `TEACHING_GUIDE.md`: Testing Guide
- `Battleship.py`: individual helper methods

### Methods to Study

- `create_empty_board()`
- `can_place_ship()`
- `process_guess()`
- `all_ships_sunk()`
- `ask_play_again()`

### Questions to Answer

1. How can a random placement function be tested reliably?
2. What are the two valid boundary indexes?
3. What should be asserted after a hit?
4. What should be asserted after a repeated miss?
5. Why is testing helper methods easier than testing only the full game?

## Stage 10: Extend the Project

### Concepts to Learn

- Refactoring
- Instance attributes
- Composition of objects
- Exception handling
- Two-dimensional lists

### Suggested Progression

1. Catch non-number input.
2. Add a method that reports remaining ship segments.
3. Introduce a `Ship` class with size and hit positions.
4. Introduce a `Board` class responsible for markers and bounds.
5. Convert `Battleship` into an instantiated game controller.
6. Replace the one-dimensional list with a two-dimensional grid.

### Questions to Answer

1. What should a `Ship` object know?
2. What should a `Board` object be responsible for?
3. Which current local variables should become game attributes?
4. Would `BattleshipGame` inherit from `Board`, or contain a `Board`?
5. Where would polymorphism become genuinely useful?

## Recommended Reading Order

1. Module and class docstrings
2. Constants
3. `create_empty_board()`
4. `can_place_ship()`
5. `place_ships()`
6. `process_guess()`
7. `all_ships_sunk()`
8. `display_status()`
9. `play_game()`
10. `main()` and replay

This order moves from small, concrete operations toward the methods that
coordinate the entire program.
