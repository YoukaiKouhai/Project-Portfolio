# Instructor Notes: Object-Oriented Shape Hierarchy

## Why This Project Was Assigned

This project moves students beyond isolated classes into deliberate hierarchy
design. Geometry provides familiar subject matter, allowing attention to remain
on object-oriented reasoning:

- Which behavior is truly shared?
- Where should a method be defined?
- When should a class be abstract?
- Which relationships are inheritance and which are composition?
- How can one algorithm support several child types?
- How should object equality be defined?

The project also integrates mathematics, properties, validation, exceptions,
special methods, and polymorphic driver code.

## Expected Learning Outcomes

Students should be able to:

1. Draw and explain the complete inheritance hierarchy.
2. Distinguish abstract and concrete classes.
3. Explain every abstract method contract.
4. Use `super()` for constructor and method cooperation.
5. Protect dimensions with validating properties.
6. Preserve the Square invariant under inherited property assignments.
7. Implement and justify each geometric formula.
8. Explain polymorphic method dispatch in the driver.
9. Distinguish identity from value equality.
10. Explain why descriptions participate in equality.
11. Explain the purpose of `_size_values()` and `_dimension_text()`.
12. Choose inheritance or composition for a new shape relationship.

## Prerequisites

Students should know:

- Defining classes and creating objects
- Instance attributes and `self`
- Methods, parameters, and return values
- Basic inheritance
- Conditionals and exceptions
- Arithmetic and exponentiation

Useful prior exposure:

- Properties
- Special methods
- Abstract base classes
- Floating-point limitations

## Suggested Lecture Sequence

### Lecture 1: Domain Analysis and Hierarchy

Topics:

- Identify common shape behavior.
- Separate 2D and 3D contracts.
- Apply “is-a” and “has-a” tests.
- Draw the hierarchy before coding.

Discussion:

- Is a Cylinder a Circle?
- Is a Cube a Square?
- Is every Square a Rectangle?

### Lecture 2: Abstract Root and Contracts

Topics:

- `ABC` and `@abstractmethod`
- Incomplete categories
- Shared validation
- Concrete-class obligations
- Interface-like behavior in Python

Live demonstration:

Attempt to instantiate `Shape`, then interpret Python’s error.

### Lecture 3: Encapsulation and Properties

Topics:

- Public property versus internal attribute
- Getter and setter syntax
- Centralized validation
- Object invariants
- Why Boolean values require explicit rejection

Activity:

Ask students to predict results for valid, zero, negative, string, and Boolean
dimensions.

### Lecture 4: Rectangle and Square

Topics:

- Multilevel inheritance
- Constructor delegation
- Overriding formulas
- Specialized setters
- Substitution and invariants

Emphasis:

Square is the most pedagogically rich class. Demonstrate how inherited writable
width and height could violate equal sides without overrides.

### Lecture 5: Special Methods and Template Hooks

Topics:

- `__str__()`
- `__eq__()`
- `NotImplemented`
- Parent algorithm plus child-provided data
- Semantic equality

Activity:

Compare identity and equality for two separately constructed rectangles.

### Lecture 6: Polymorphism and Driver Design

Topics:

- Heterogeneous collections
- Runtime dispatch
- Abstract branch checks
- Open/closed principle
- Integration tests

### Lecture 7: Formula Classes and Object Collaboration

Topics:

- Circle and Cylinder formulas
- Surface area versus volume
- `canFitCircle()` and `canFitSquare()`
- Type safety with `isinstance`
- Composition discussion

### Lecture 8: Testing and Extension

Topics:

- Exception testing
- `math.isclose()`
- Invariant testing
- Abstractness testing
- Adding new subclasses

## Key Teaching Points

### Method Placement

Ask of every method: “What is the highest class for which this method is always
valid?”

- Validation: Shape
- Perimeter contract: TwoDimensionalShape
- Volume contract: ThreeDimensionalShape
- Circle formula: Circle

### Equality Is a Domain Decision

Python cannot know whether rotated rectangles should compare equal or whether a
square should equal a rectangle with equal sides. The programmer must define
the domain rule explicitly.

### `super()` Is Cooperative

Present `super()` as “continue the method-resolution chain,” not merely “call
my parent.” This becomes especially visible in the description chain.

### Abstract Classes Are Both Reuse and Contract

Abstract parents do two jobs:

- Provide implemented shared behavior.
- Require missing behavior from children.

### Properties Preserve Valid State

Validation only in constructors is insufficient because attributes can change
after construction. Setters preserve invariants throughout object lifetime.

## Discussion Questions

1. Why is `area()` abstract in Shape rather than in both dimensional parents?
2. Why does 3D `area()` mean surface area?
3. Should descriptions be part of equality? What alternatives exist?
4. Why is `_size_values()` a tuple?
5. Why does Rectangle sort dimensions?
6. Why does Square return one size value rather than two?
7. What bug would occur without Square’s width and height overrides?
8. Why is Cylinder not a subclass of Circle?
9. Would a Cylinder containing two Circle objects improve this design?
10. Why is `perimeterCanFitInside()` not a physically accurate fit test?
11. When is `isinstance` preferable to exact type comparison?
12. How would multiple inheritance affect `super()`?

## Quiz Questions

### Multiple Choice

1. Which class should define behavior shared by all shapes?

   A. Driver
   B. Shape
   C. Rectangle
   D. TwoDimensionalShape only

   **Answer:** B

2. Why can `Shape()` not be created?

   A. It has no imports
   B. Its name is reserved
   C. It contains unimplemented abstract methods
   D. It has no dimensions

   **Answer:** C

3. What does `super()` do in `Square.__init__()`?

   A. Creates a second Square
   B. Calls the next constructor in the method resolution order
   C. Skips validation
   D. Converts the side to a tuple

   **Answer:** B

4. Why does `Rectangle._size_values()` sort dimensions?

   A. To calculate perimeter
   B. To display dimensions alphabetically
   C. To make rotated rectangles equal
   D. To validate positivity

   **Answer:** C

5. What should `__eq__()` return for an unrelated object type?

   A. `None`
   B. `NotImplemented`
   C. An exception in every case
   D. The object itself

   **Answer:** B

### Short Answer

1. Explain why Cube does not inherit Square.
2. Explain how Square preserves equal dimensions.
3. Describe the difference between surface area and volume.
4. Explain how `Shape.__str__()` uses polymorphism.
5. State the equality contract in this project.

## Interview-Style Questions

1. Walk through the method-resolution path for `Square.getDescription()`.
2. How would you add Triangle while minimizing changes to existing code?
3. Why is validation placed in Shape?
4. What problem does `NotImplemented` solve?
5. How would you make shape objects immutable?
6. Is Square inheriting Rectangle always safe? Discuss behavioral subtyping.
7. How would you redesign fit checking to use true geometry?
8. What are the tradeoffs of comparing floating-point dimensions exactly?
9. How could type hints improve this project?
10. How would you serialize and reconstruct arbitrary shapes?

## Possible Project Extensions

### Introductory

- Add Triangle.
- Add Sphere.
- Add diameter and diagonal properties.
- Add a menu-driven driver.
- Add input-based object creation.

### Intermediate

- Add `scale(factor)`.
- Add `unittest` tests.
- Add type hints.
- Add `to_dict()` methods.
- Add a RectangularPrism.
- Add real containment checks for selected shape pairs.

### Advanced

- Use immutable objects.
- Use generic protocols for measurable objects.
- Explore multiple dispatch for fit operations.
- Implement a shape factory.
- Serialize to JSON.
- Build a graphical visualization.
- Analyze floating-point equality policies.

## Advanced Topics for Stronger Students

### Liskov Substitution Principle

Square is mathematically a Rectangle, but writable independent width and height
can make this inheritance controversial. This project resolves the immediate
invariant by changing both dimensions together. Discuss whether client
expectations of a mutable Rectangle are still fully preserved.

### Open/Closed Principle

New concrete shapes can be added without modifying `Shape.__str__()` or
`Shape.__eq__()` if they implement the required hooks.

### Template Method Pattern

The root class fixes the algorithm for equality and formatting while subclasses
provide variable pieces.

### Structural Subtyping

Compare abstract inheritance with Python protocols or duck typing.

### Floating-Point Equality

Exact equality is simple for the assignment but can be fragile after
calculations. Discuss tolerances and `math.isclose()`.

### Hashing

Because equality is defined and dimensions are mutable, objects are not
appropriate stable dictionary keys. Discuss `__hash__`, immutability, and
equality consistency.

## Assessment Suggestions

### Basic

- Correct hierarchy
- Correct formulas
- Positive-dimension validation
- Driver runs

### Proficient

- Correct abstract contracts
- Reuse through `super()`
- Correct equality and formatting
- Square invariant preserved

### Advanced

- Student can justify placement of every method.
- Student can discuss substitution tradeoffs.
- Student can add a new class with minimal changes.
- Student can design robust automated tests.
