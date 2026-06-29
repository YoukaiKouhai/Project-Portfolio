# Instructor Notes: One-Dimensional Battleship

## Why This Project Was Assigned

This project gives students a complete but manageable program that combines
several first-semester topics:

- Class-based organization
- Static methods
- Lists and indexes
- Loops and conditionals
- Random numbers
- Input and output
- Validation
- State mutation
- Constants
- Method decomposition

The one-dimensional board deliberately reduces spatial complexity. Students
can focus on designing a reliable program before progressing to nested lists
and row-column coordinates.

The assignment is also useful for discussing a subtle object-oriented design
point: not every class must be instantiated. This version uses a class as a
cohesive namespace. Instructors can later contrast it with a stateful,
instance-based design.

## Expected Learning Outcomes

Students should be able to:

1. Explain why the game uses separate hidden and display boards.
2. Trace how a guess changes board state.
3. Explain the responsibilities of each static method.
4. Use constants to represent fixed rules and markers.
5. Calculate a legal random starting position for a ship.
6. Prevent overlapping placements.
7. Build and explain a compound loop condition.
8. Use a helper method's return value to update program state.
9. Distinguish a repeated guess from a new hit or miss.
10. Explain why this design does not require inheritance or a constructor.
11. Identify opportunities for future object-oriented refactoring.
12. Design meaningful boundary and state-transition tests.

## Prerequisite Knowledge

Students should already know:

- Variables and basic data types
- `if`, `elif`, and `else`
- `while` and `for` loops
- Functions and parameters
- Lists and indexes
- Basic console input and output
- Integer conversion

Helpful but not strictly required:

- Classes
- Static methods
- Modules and imports
- Basic test assertions

## Suggested Lecture Sequence

### Lecture 1: Requirements and State Modeling

Topics:

- Translate written rules into data and conditions.
- Model a board as a list.
- Choose marker values.
- Separate hidden and visible state.
- Identify fixed rules as constants.

Live questions:

- What information does the player know?
- What information does only the program know?
- What state changes after a hit?

### Lecture 2: Method Decomposition

Topics:

- One responsibility per method.
- Coordinator methods versus helper methods.
- Parameters and return values.
- Mutation versus returned data.
- Why `main()` should remain short.

Suggested activity:

Give students all method names without implementations and ask them to assign
one responsibility to each method.

### Lecture 3: Placement Algorithm

Topics:

- Inclusive and exclusive range endpoints.
- Legal ship start calculation.
- Candidate placement.
- Overlap detection.
- Retry loops.
- Expected versus worst-case behavior in randomized algorithms.

Board exercise:

For board size 20 and ship size 4, ask students to list every legal starting
index and explain why 17 is invalid.

### Lecture 4: Turn Processing

Topics:

- Range validation.
- Repeated guesses.
- Hit and miss state transitions.
- Return markers.
- Counter updates.
- Early return.

Tracing exercise:

Provide a small hidden and display board and ask students to trace three
guesses, including one repeat.

### Lecture 5: Complete Control Flow

Topics:

- The turn loop.
- The replay loop.
- Winning and losing predicates.
- `continue`.
- Entry-point guard.
- Normalizing input with `strip()` and `lower()`.

### Lecture 6: Testing and Refactoring

Topics:

- Testing helper methods independently.
- Controlling randomness.
- Simulating input.
- Boundary tests.
- Moving from static methods to objects.
- Composition versus inheritance.

## Teaching Emphasis

### Emphasize the Difference Between Rules and State

Rules:

- Board size
- Ship sizes
- Maximum misses
- Marker meanings

State:

- Current boards
- Current hit count
- Current miss count
- Current guess

Rules belong in constants. State changes while the program runs.

### Emphasize Aliasing

Students should understand that these must be two separate lists:

```python
hidden_board = Battleship.create_empty_board()
display_board = Battleship.create_empty_board()
```

This is an accessible example of object references and aliasing.

### Emphasize Exact Requirement Language

“Misses are greater than the maximum” differs from “misses are equal to the
maximum.” Ask students to connect the English requirement directly to the
Boolean condition.

### Emphasize Appropriate OOP

This project uses a class but not object instances. Discuss both the advantages
and limitations:

Advantages:

- Clear namespace
- Grouped constants and operations
- Straightforward beginner data flow

Limitations:

- Game state is passed repeatedly.
- Multiple games cannot coexist as independent objects.
- It is harder to attach behavior to ships or boards.

## Discussion Questions

1. Why should the hidden board never be passed to `display_status()`?
2. Why does `process_guess()` check the display board first?
3. What would happen if a miss were recorded on the hidden board instead?
4. Why does a hit replace `S` with `H`?
5. Could the game count total hits without a separate `hits` variable?
6. What are the advantages of returning `H`, `M`, or `None`?
7. Why is random placement separated from overlap checking?
8. Is `SHIP_SIZES` truly immutable? How does Python treat a list constant?
9. When would a constructor improve this program?
10. Why would `BattleshipGame` contain a `Board` rather than inherit from one?
11. What responsibilities would belong in a future `Ship` class?
12. How would a two-dimensional version change the data structure?

## Quiz Questions

### Multiple Choice

1. What does `@staticmethod` indicate?

   A. The method automatically receives `self`
   B. The method belongs to the class namespace but receives no automatic
   instance argument
   C. The method cannot use parameters
   D. The method can run only once

   **Answer:** B

2. Why is `BOARD_SIZE - ship_size` the largest legal starting position?

   A. Lists begin at one
   B. It reserves one empty position
   C. It lets the final ship segment end at index `BOARD_SIZE - 1`
   D. Random numbers exclude their upper bound

   **Answer:** C

3. Which board should contain unguessed `S` markers?

   A. Display board only
   B. Hidden board only
   C. Both boards
   D. Neither board

   **Answer:** B

4. What does `process_guess()` return for a repeated guess?

   A. `H`
   B. `M`
   C. `False`
   D. `None`

   **Answer:** D

5. Which expression means all ship positions have been hit?

   A. `HIT in hidden_board`
   B. `SHIP not in hidden_board`
   C. `MISS not in display_board`
   D. `EMPTY in hidden_board`

   **Answer:** B

### Short Answer

1. Explain why invalid out-of-range guesses do not count as turns.
2. Describe the state changes caused by a hit.
3. Explain why two calls to `create_empty_board()` are necessary.
4. State one reason to use a named constant instead of a numeric literal.
5. Explain why this project does not need inheritance.

## Interview-Style Questions

1. Walk through the complete lifecycle of one guess.
2. How would you make random ship placement reproducible?
3. How would you prevent non-numeric input from crashing the program?
4. What tests would you write for `can_place_ship()`?
5. What is the time complexity of `all_ships_sunk()`?
6. How could you replace its list scan with constant-time tracking?
7. How would you redesign this using `Game`, `Board`, and `Ship` objects?
8. Which design would be easier to support for two simultaneous players?
9. How would you ensure ships remain contiguous on a two-dimensional board?
10. What tradeoffs exist between returning marker strings and returning an
    enumeration or custom result object?

## Possible Project Extensions

### Introductory Extensions

- Catch `ValueError` for non-numeric input.
- Add a rules/help method.
- Show the number of guesses made.
- Add a difficulty setting.
- Add a cheat/debug mode that prints the hidden board.
- Accept `yes` as well as `y`.

### Intermediate Extensions

- Add named ships.
- Track when each complete ship is sunk.
- Store prior guesses in a set.
- Add a scoreboard across multiple games.
- Save results to a text file.
- Introduce unit tests with `unittest`.
- Inject a random-number generator for easier testing.

### Object-Oriented Extensions

- Create a `Board` class.
- Create a `Ship` class.
- Create an instantiated `BattleshipGame` controller.
- Move hits and misses into instance attributes.
- Define `__str__()` for board display.
- Define `__eq__()` for comparing ship configurations.
- Use composition so a game has a board and ships.

### Advanced Extensions

- Build a two-dimensional board.
- Add horizontal and vertical placement.
- Add a computer opponent.
- Implement probability-based targeting.
- Use an enumeration for cell state.
- Serialize and restore games.
- Build a graphical interface.
- Use property-based tests for placement invariants.

## Advanced Topics for Stronger Students

### Dependency Injection

Pass input and random functions into the game rather than calling them
directly. This makes deterministic automated tests easier.

### Enumerations

Replace marker strings with an `Enum` to reduce accidental invalid states.

### Data Classes

Use a data class for a guess result or game result.

### State Machines

Model each board position as a state transition:

```text
EMPTY -> MISS
SHIP  -> HIT
HIT   -> HIT (repeated)
MISS  -> MISS (repeated)
```

### Invariants

Useful invariants include:

- Board length always equals `BOARD_SIZE`.
- Hidden board contains only valid hidden markers.
- Display board never contains `S`.
- New hit count never exceeds total ship segments.
- Miss count increases only for a new water guess.

### Complexity Improvement

`all_ships_sunk()` scans the board each turn. A stronger student could track a
remaining-segment counter and reduce the completion check from `O(B)` to `O(1)`.

## Assessment Suggestions

### Basic Proficiency

- Program runs.
- Ships are randomly placed without overlap.
- Input range is checked.
- Hits and misses are tracked.
- Win, loss, and replay work.

### Developing Design Skill

- Constants are used consistently.
- Methods have focused responsibilities.
- Duplicate logic is avoided.
- Hidden information is not revealed.
- Names communicate intent.

### Strong Understanding

- Student can explain each state transition.
- Student can justify static methods and their limitations.
- Student can design deterministic tests.
- Student can propose a composition-based object model.
- Student can reason about complexity and invariants.
