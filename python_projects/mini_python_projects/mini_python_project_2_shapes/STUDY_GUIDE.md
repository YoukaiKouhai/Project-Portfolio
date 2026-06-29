# Study Guide: Object-Oriented Shapes

## Key Vocabulary

### Abstract Base Class

A class that defines shared behavior and may require child classes to implement
abstract methods. It cannot be instantiated while abstract methods remain.

### Abstract Method

A method declaration that establishes a required operation without providing a
complete concrete implementation.

### Class

A blueprint defining data and behavior.

### Concrete Class

A fully implemented class that can be instantiated.

### Constructor

`__init__()`, which establishes an object’s initial state.

### Encapsulation

Controlling access to state so objects remain valid.

### Equality

A domain-defined decision about whether two objects represent the same value.

### Getter and Setter

Property methods that read and validate assignments to an attribute.

### Inheritance

A mechanism by which a child class receives and specializes parent behavior.

### Instance

One object created from a class.

### Invariant

A rule that must remain true for every valid object. Shape dimensions are
positive; Square dimensions remain equal.

### Method Overriding

Providing a child implementation for an inherited method.

### Polymorphism

Using a shared interface while runtime object types provide different behavior.

### Property

A method-based attribute interface created with `@property`.

### `super()`

A tool for continuing method lookup through the inheritance hierarchy.

### Special Method

A Python method such as `__str__()` or `__eq__()` invoked by language syntax.

### Template Method

A parent algorithm that delegates selected details to child methods.

## Important Formulas

Let `w` be width, `h` height, `s` side, `r` radius, and `π` pi.

| Shape | Measurement | Formula |
|---|---|---|
| Rectangle | Area | `w * h` |
| Rectangle | Perimeter | `2(w + h)` |
| Square | Area | `s²` |
| Square | Perimeter | `4s` |
| Circle | Area | `πr²` |
| Circle | Circumference | `2πr` |
| Cylinder | Surface area | `2πr² + 2πrh` |
| Cylinder | Volume | `πr²h` |
| Cube | Surface area | `6s²` |
| Cube | Volume | `s³` |

## Important Classes

### `Shape`

Abstract root containing validation, general description, equality, formatting,
and abstract hooks.

### `TwoDimensionalShape`

Abstract 2D branch requiring perimeter and providing perimeter comparison.

### `ThreeDimensionalShape`

Abstract 3D branch requiring volume.

### `Rectangle`

Concrete width-height 2D shape.

### `Square`

Concrete Rectangle constrained to equal sides.

### `Circle`

Concrete radius-based 2D shape.

### `Cylinder`

Concrete radius-height 3D shape.

### `Cube`

Concrete equal-edge 3D shape.

## Important Methods

### `_validate_dimension()`

Rejects invalid types, Boolean values, zero, and negatives.

### `getDescription()`

Builds a multi-line description through the inheritance chain.

### `area()`

Returns enclosed area for 2D shapes and surface area for 3D shapes.

### `perimeter()`

Returns boundary length for 2D shapes.

### `volume()`

Returns occupied space for 3D shapes.

### `__str__()`

Controls readable printed representation.

### `__eq__()`

Compares complete description and size values.

### `_size_values()`

Supplies shape-specific dimensions to equality.

### `_dimension_text()`

Supplies shape-specific text to `__str__()`.

### `canFitCircle()` and `canFitSquare()`

Perform type and matching-dimension checks.

## Concept Summaries

### Abstract Versus Concrete

Abstract classes describe categories and contracts. Concrete classes provide
all required formulas and can create objects.

### Inheritance Versus Composition

- Square is a Rectangle: inheritance.
- Cylinder has circular bases: composition concept.

Do not inherit solely because one shape contains another shape.

### Validation and Properties

Constructors create valid objects; setters keep them valid later.

### Method Resolution

Python searches the runtime class and then its ancestors. `super()` continues
this search cooperatively.

### Polymorphic Calls

The expression `shape.area()` may invoke Rectangle, Square, Circle, Cylinder,
or Cube behavior depending on the object.

### Semantic Equality

Equal area does not imply equal shapes. This project requires matching shape
description and dimensions.

### Parent Algorithms and Child Hooks

One `__str__()` and one `__eq__()` serve every shape because child classes
provide only the variable details.

## Review Questions

1. Why is Shape abstract?
2. What methods must every concrete Shape implement?
3. What extra method must every 2D shape implement?
4. What extra method must every 3D shape implement?
5. Why is validation shared?
6. Why are internal attributes prefixed with `_`?
7. How does Square reuse Rectangle?
8. How does Square preserve equal sides?
9. Why does Rectangle sort equality dimensions?
10. Why does equality compare descriptions?
11. What does `NotImplemented` mean?
12. How does `__str__()` know the concrete class name?
13. Why does each description method call `super()`?
14. Why is Cylinder not a Circle?
15. Why is Cube not a Square?
16. What does area mean for a 3D shape?
17. Why should π-based tests use `math.isclose()`?
18. What limitation does perimeter fit have?
19. What is polymorphic about the driver?
20. How would Triangle fit into the hierarchy?

## Practice Exercises

### Exercise 1: Draw the Hierarchy

Draw every class and label abstract versus concrete.

### Exercise 2: Trace Descriptions

Write the exact method chain for:

- `Circle(2).getDescription()`
- `Square(3).getDescription()`

### Exercise 3: Predict Equality

Predict each result:

```python
Rectangle(3, 4) == Rectangle(4, 3)
Rectangle(4, 4) == Square(4)
Circle(3) == Circle(3)
Cube(4) == Cube(5)
```

### Exercise 4: Validation

Classify the expected result as valid, TypeError, or ValueError:

```python
Circle(2.5)
Circle(0)
Circle(-1)
Circle("3")
Circle(True)
```

### Exercise 5: Property Mutation

Trace:

```python
square = Square(4)
square.width = 7
```

What are `side`, `width`, and `height` afterward?

### Exercise 6: Formula Calculation

Calculate by hand:

- Rectangle(5, 2) area and perimeter
- Circle(2) area and circumference
- Cylinder(2, 5) surface area and volume
- Cube(3) surface area and volume

### Exercise 7: Polymorphism

Explain why this loop works:

```python
for shape in shapes:
    print(shape.area())
```

### Exercise 8: Add Triangle on Paper

List:

- Parent class
- Required dimensions
- Required methods
- Equality tuple
- Dimension text

## Challenge Exercises

### Challenge 1: Implement Triangle

Create a validated triangle using base, height, and three side lengths. Discuss
which values belong in equality.

### Challenge 2: Implement Sphere

Add surface area and volume formulas under ThreeDimensionalShape.

### Challenge 3: Make Shapes Immutable

Design read-only properties and explain how immutability affects equality and
hashing.

### Challenge 4: Improve Floating-Point Equality

Use `math.isclose()` for dimensions and discuss tolerance choices.

### Challenge 5: True Geometric Fit

Replace perimeter comparison with actual fit rules for selected shape pairs.

### Challenge 6: Shape Factory

Create a function that receives a shape name and dimensions and returns the
correct object.

### Challenge 7: Serialization

Design `to_dict()` and reconstruction logic for all concrete classes.

## Exam-Style Questions

### Question 1: Abstract Classes

Why does this fail?

```python
shape = Shape()
```

**Expected answer:** Shape has abstract methods and represents an incomplete
category.

### Question 2: Formula

Explain the two terms in:

```text
2πr² + 2πrh
```

**Expected answer:** The first is the area of two circular bases; the second is
the curved lateral surface.

### Question 3: Equality

Why is this false?

```python
Rectangle(4, 4) == Square(4)
```

**Expected answer:** Their complete descriptions differ even though their
measurements and areas are related.

### Question 4: `super()`

What is gained by calling `super().__init__(side, side)` in Square?

**Expected answer:** Rectangle initialization and shared validation are reused.

### Question 5: Invariant

What invariant must Square preserve?

**Expected answer:** Width, height, and side must remain equal and positive.

### Question 6: Design

Why should Cylinder inherit ThreeDimensionalShape rather than Circle?

**Expected answer:** Cylinder is a solid shape, not a kind of circle. Circular
bases are a has-a relationship.

### Question 7: Polymorphism

When `shape` refers to a Cube, which method runs for `shape.area()`?

**Expected answer:** `Cube.area()` because Python dispatches by runtime type.

### Question 8: Error Type

Why does `Circle("3")` raise TypeError while `Circle(0)` raises ValueError?

**Expected answer:** `"3"` has the wrong type; zero has a permitted numeric
type but an invalid value.

### Question 9: String Representation

How can Shape’s one `__str__()` method display different dimensions?

**Expected answer:** It calls the polymorphic `_dimension_text()` hook.

### Question 10: Extension

Name the minimum methods a new concrete 2D subclass must supply.

**Expected answer:** `area()`, `perimeter()`, `_size_values()`, and
`_dimension_text()`; it should normally also extend `getDescription()`.

## Final Self-Assessment

You are ready to extend the project when you can:

- Explain every inheritance relationship.
- Trace `super()` calls.
- Distinguish abstract and concrete classes.
- Justify method placement.
- Derive every formula.
- Explain equality and string formatting.
- Preserve invariants with properties.
- Add a new class without duplicating shared behavior.
