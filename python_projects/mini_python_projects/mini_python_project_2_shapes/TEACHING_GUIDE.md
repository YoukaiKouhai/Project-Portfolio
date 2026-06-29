# Shape Hierarchy Teaching Guide

## Project Overview

This project models five geometric shapes with an object-oriented class
hierarchy:

- Rectangle
- Square
- Circle
- Cylinder
- Cube

Every concrete shape stores validated dimensions, provides a readable
description, supports equality comparison, and calculates the measurements
appropriate to its dimensional category.

Two-dimensional shapes calculate area and perimeter. Three-dimensional shapes
calculate surface area and volume. Abstract parent classes define these shared
contracts so concrete classes cannot omit required behavior.

### Real-World Applications

The same design ideas appear in:

- Computer-aided design and graphics software
- Engineering measurement tools
- Packaging and material estimation
- Geometry education software
- Simulation and game engines
- Systems that process several related object types through one interface

The formulas are useful, but the main purpose is learning how a well-designed
class hierarchy shares behavior while preserving meaningful differences.

### Main Learning Objectives

Students should learn how to:

- Design parent and child classes around genuine “is-a” relationships.
- Use abstract classes to define required behavior.
- Reuse initialization and descriptions with `super()`.
- Protect object invariants through properties and setters.
- Override methods when child classes require specialized behavior.
- Implement polymorphic code that works with several concrete types.
- Define value-based equality with `__eq__()`.
- Define readable object output with `__str__()`.
- Move common logic high in a hierarchy without overgeneralizing.
- Distinguish inheritance from composition.

## Learning Outcomes

### Classes and Objects

A class defines the structure and behavior of a type. An object is one concrete
instance of that class:

```python
circle = Circle(3)
rectangle = Rectangle(3, 4)
```

Each object stores its own dimensions while sharing method implementations with
other objects of the same class.

### Constructors

Each concrete class uses `__init__()` to establish valid initial state.
Constructors either validate dimensions directly or assign through validating
properties.

`Square.__init__()` delegates to `Rectangle.__init__()` with:

```python
super().__init__(side, side)
```

This reuses existing initialization and validation.

### Encapsulation

Dimensions are stored in conventionally non-public attributes such as
`_radius`, `_width`, and `_side`. Properties provide controlled access:

```python
circle.radius = 5
```

The setter validates the new value before changing the object. This preserves
the invariant that every dimension must remain positive.

### Inheritance

Inheritance models “is-a” relationships:

- A Rectangle is a TwoDimensionalShape.
- A Square is a Rectangle.
- A Circle is a TwoDimensionalShape.
- A Cylinder is a ThreeDimensionalShape.
- A Cube is a ThreeDimensionalShape.

Child classes receive shared behavior and complete or specialize it.

### Polymorphism

The driver places different shape objects in one list and calls:

```python
shape.area()
shape.getDescription()
print(shape)
```

Python selects the implementation appropriate to each object’s runtime class.
This is polymorphism.

### Method Overriding

A child overrides an inherited method when it supplies behavior more specific
to that shape. Examples:

- Each concrete class overrides `area()`.
- Square overrides Rectangle’s area and perimeter formulas.
- Every shape extends `getDescription()`.
- Square specializes inherited width and height setters to preserve equal sides.

### Equality Methods

`Shape.__eq__()` defines shared equality:

1. The other value must be a Shape.
2. The complete descriptions must match.
3. The size values supplied by each concrete class must match.

Description comparison prevents `Rectangle(4, 4)` from equaling `Square(4)`.
Rectangle sorts dimensions so `Rectangle(3, 4)` equals `Rectangle(4, 3)`.

### String Representations

`Shape.__str__()` controls readable output:

```text
Rectangle(width=3, height=4)
Circle(radius=3)
Cube(side=4)
```

The parent method uses the runtime class name and asks the child class for its
dimension text.

### Abstract Classes

`Shape`, `TwoDimensionalShape`, and `ThreeDimensionalShape` are abstract. They
describe incomplete categories and cannot be instantiated directly.

Abstract methods act as contracts:

- Every concrete Shape must implement `area()`.
- Every 2D concrete shape must implement `perimeter()`.
- Every 3D concrete shape must implement `volume()`.

### Interfaces

Python does not declare a separate interface construct in this project.
Abstract base classes provide interface-like contracts. For example, the
`Shape` API promises `area()`, `getDescription()`, `__str__()`, and equality
support.

### Composition Versus Inheritance

Inheritance answers “what kind of thing is this?” A Square is a Rectangle.

Composition answers “what does this object have?” Conceptually, a Cylinder has
two circular bases, but this implementation stores only radius and height
rather than containing Circle objects.

The fit methods demonstrate interaction between related-but-separate objects:

- A Cylinder can compare itself with a Circle.
- A Cube can compare itself with a Square.

## Project Architecture

```text
Shape (abstract)
├── TwoDimensionalShape (abstract)
│   ├── Rectangle
│   │   └── Square
│   └── Circle
│
└── ThreeDimensionalShape (abstract)
    ├── Cylinder
    └── Cube
```

### `Shape`

The root abstraction. It owns behavior common to every shape:

- Positive-dimension validation
- General description
- Abstract area contract
- Shared `__str__()`
- Shared `__eq__()`
- Abstract hooks for dimensions and equality values

### `TwoDimensionalShape`

An abstract specialization of Shape for flat figures. It adds:

- A 2D description
- The abstract perimeter contract
- The perimeter-only fit comparison

### `ThreeDimensionalShape`

An abstract specialization of Shape for solid figures. It adds:

- A 3D description
- The abstract volume contract

For these classes, inherited `area()` means total surface area.

### `Rectangle`

A concrete 2D shape with width and height. It provides area, perimeter,
properties, and order-independent equality dimensions.

### `Square`

A specialized Rectangle with one side length. Its inheritance is mathematically
valid because every square is a rectangle. Specialized setters ensure inherited
width and height assignments cannot violate equal sides.

### `Circle`

A concrete 2D shape with radius. It uses `math.pi` for area and circumference.

### `Cylinder`

A concrete 3D shape with radius and height. It calculates surface area and
volume and checks whether a Circle can serve as a base.

### `Cube`

A concrete 3D shape with one side length. It calculates surface area and volume
and checks whether a Square can serve as a face.

## File-by-File Breakdown

### `Shape.py`

- **Purpose:** Define the abstract root and most reusable behavior.
- **Main class:** `Shape`
- **Key methods:** `_validate_dimension()`, `getDescription()`, `area()`,
  `_size_values()`, `_dimension_text()`, `__str__()`, `__eq__()`
- **Concepts:** Abstract base classes, static methods, validation, template
  methods, special methods, `NotImplemented`

### `TwoDimensionalShape.py`

- **Purpose:** Define the shared contract for flat shapes.
- **Main class:** `TwoDimensionalShape`
- **Key methods:** `getDescription()`, `perimeter()`,
  `perimeterCanFitInside()`
- **Concepts:** Intermediate abstract classes, inherited contracts, `super()`,
  type checking, shared operations

### `ThreeDimensionalShape.py`

- **Purpose:** Define the shared contract for solid shapes.
- **Main class:** `ThreeDimensionalShape`
- **Key methods:** `getDescription()`, `volume()`
- **Concepts:** Abstract specialization, surface-area interpretation,
  inherited methods

### `Rectangle.py`

- **Purpose:** Implement a width-height quadrilateral.
- **Main class:** `Rectangle`
- **Key methods:** properties, `area()`, `perimeter()`, `getDescription()`,
  `_size_values()`, `_dimension_text()`
- **Concepts:** Encapsulation, formulas, order-independent equality,
  concrete implementation

### `Square.py`

- **Purpose:** Implement a Rectangle constrained to equal sides.
- **Main class:** `Square`
- **Key methods:** constructor, `side` property, specialized inherited setters,
  area, perimeter, description and formatting hooks
- **Concepts:** Multilevel inheritance, `super()`, overriding, invariants,
  Liskov substitution concerns

### `Circle.py`

- **Purpose:** Implement a radius-based 2D shape.
- **Main class:** `Circle`
- **Key methods:** radius property, area, perimeter, description and hooks
- **Concepts:** `math.pi`, exponentiation, validation, inherited API

### `Cylinder.py`

- **Purpose:** Implement a radius-height solid.
- **Main class:** `Cylinder`
- **Key methods:** radius/height properties, area, volume, `canFitCircle()`
- **Concepts:** Decomposing a formula, type-safe object collaboration,
  surface area versus volume

### `Cube.py`

- **Purpose:** Implement a six-faced equal-sided solid.
- **Main class:** `Cube`
- **Key methods:** side property, area, volume, `canFitSquare()`
- **Concepts:** Repeated-face formula, exponentiation, type checking

### `Driver.py`

- **Purpose:** Demonstrate all concrete classes and requirements.
- **Main functions:** `print_shape_information()`, `main()`
- **Concepts:** Object construction, polymorphism, `isinstance`, formatted
  output, equality tests, integration testing, entry-point guard

## Object-Oriented Design Analysis

### Why Inheritance Was Used

The classes share stable conceptual relationships and behavior. Without
inheritance, each concrete class would duplicate validation, equality, string
formatting, and general descriptions.

Inheritance is useful here because:

- Every shape has dimensions and area behavior.
- Every 2D shape has perimeter behavior.
- Every 3D shape has volume behavior.
- A square satisfies the definition of a rectangle.

### Why Methods Were Placed Where They Were

Methods are placed at the highest level where they are valid:

- `_validate_dimension()`, `__str__()`, and `__eq__()` apply to every shape, so
  they belong in `Shape`.
- `perimeterCanFitInside()` applies only to 2D shapes, so it belongs in
  `TwoDimensionalShape`.
- `volume()` applies only to 3D shapes, so its contract belongs in
  `ThreeDimensionalShape`.
- Formulas depend on concrete dimensions, so they belong in concrete classes.

### Why Abstract Classes Exist

“Shape,” “two-dimensional shape,” and “three-dimensional shape” are categories,
not sufficiently specified objects. Abstract classes prevent creation of
incomplete instances and make required operations explicit.

### How Code Reuse Is Achieved

- One validation method supports all dimensions.
- One equality method supports all shapes.
- One string method supports all shapes.
- Description methods build a chain with `super()`.
- Square reuses Rectangle initialization.
- Intermediate abstract classes share category-specific behavior.

### How `super()` Is Used

`super()` delegates to the next class in the method resolution order:

- Square calls Rectangle’s constructor.
- Every description method obtains inherited text before appending new text.

This avoids hardcoding parent class names and preserves cooperative inheritance.

### Template Method Pattern

`Shape.__str__()` and `Shape.__eq__()` define stable algorithms while calling
child-provided hooks:

- `_dimension_text()`
- `_size_values()`

The parent controls the overall process; children provide shape-specific data.

### Encapsulation and Invariants

Properties prevent dimensions from becoming zero, negative, non-numeric, or
Boolean. Square goes further: changing width, height, or side always updates
both inherited dimensions, preserving the invariant:

```text
width == height == side
```

## Formula Reference

| Shape | Area / Surface Area | Perimeter / Volume |
|---|---|---|
| Rectangle | `width * height` | `2 * (width + height)` |
| Square | `side²` | `4 * side` |
| Circle | `π * radius²` | `2 * π * radius` |
| Cylinder | `2πr² + 2πrh` | `πr²h` volume |
| Cube | `6 * side²` | `side³` volume |

## Method Walkthroughs

All shape calculations use a fixed number of arithmetic operations, so their
time and extra-space complexity are `O(1)`.

### `Shape._validate_dimension(value)`

- **Purpose:** Preserve positive numeric dimensions.
- **Input:** Candidate dimension.
- **Output:** Valid value.
- **Errors:** `TypeError` for non-numeric or Boolean; `ValueError` for zero or
  negative values.
- **Algorithm:** Check type, check positivity, return value.
- **Complexity:** `O(1)`.

### `Shape.__str__()`

- **Purpose:** Produce readable object text.
- **Input:** The current object.
- **Output:** Class name plus dimension text.
- **Algorithm:** Read runtime class name and call `_dimension_text()`.
- **Complexity:** `O(1)`.

### `Shape.__eq__(other)`

- **Purpose:** Define value equality.
- **Input:** Another object.
- **Output:** Boolean or `NotImplemented`.
- **Algorithm:** Verify shape type, compare complete descriptions, compare
  shape-specific size tuples.
- **Complexity:** `O(1)` for these fixed-size descriptions and tuples.

### `getDescription()`

- **Purpose:** Return all descriptions from general to specific.
- **Algorithm:** Each class calls `super().getDescription()` and appends one
  line.
- **Output:** Multi-line string.
- **Complexity:** `O(h)`, where `h` is hierarchy depth; depth is small and fixed.

### Rectangle Methods

- `area()`: multiply width by height.
- `perimeter()`: add width and height, then double.
- `_size_values()`: sort two dimensions so rotation does not affect equality.

### Square Methods

- Constructor passes equal dimensions to Rectangle.
- `side` setter validates once and updates both inherited fields.
- Specialized width/height setters delegate to `side`.
- Area squares the side; perimeter multiplies by four.

### Circle Methods

- Area multiplies π by radius squared.
- Perimeter computes circumference with `2πr`.

### Cylinder Methods

- `area()` separately calculates two circular bases and the curved surface.
- `volume()` multiplies circular base area by height.
- `canFitCircle()` requires both correct type and equal radius.

### Cube Methods

- `area()` multiplies one square face area by six.
- `volume()` cubes the side.
- `canFitSquare()` requires both correct type and equal side.

### `perimeterCanFitInside(inner_shape)`

- **Purpose:** Perform the assignment’s simplified perimeter comparison.
- **Input:** Proposed inner object.
- **Output:** `True` only for a 2D object with a smaller perimeter.
- **Important limitation:** Larger perimeter does not prove real geometric fit.
- **Complexity:** `O(1)`.

### `print_shape_information(shape)`

- **Purpose:** Print shared and category-specific measurements.
- **Input:** Any concrete shape.
- **Output:** Console text.
- **Algorithm:** Use polymorphic methods, then select perimeter or volume based
  on the abstract branch.

## Common Student Mistakes

### Incorrect Inheritance

- Making Cylinder inherit Circle because it has circular bases. A Cylinder is
  not a Circle; it is a 3D shape.
- Making Cube inherit Square. A Cube has square faces but is not a Square.
- Making Square unrelated to Rectangle, which discards a valid is-a relation.

### Duplicate Code

Repeating validation, equality, and string formatting in every class makes bugs
more likely. Shared logic belongs in the nearest valid parent.

### Forgetting `super()`

If a description override returns only its own line, inherited descriptions
disappear. If Square does not delegate initialization, it duplicates Rectangle
logic.

### Incorrect Equality

Common errors:

- Comparing only area.
- Comparing only dimensions.
- Treating a Rectangle and Square as equal.
- Forgetting rectangle rotation.
- Returning `False` instead of `NotImplemented` for unrelated types.

### Incorrect Constructor Design

- Assigning dimensions without validation.
- Calling property setters before their required fields/design are ready.
- Allowing Square’s width and height to diverge.

### Violating Encapsulation

Directly changing `_radius` or `_side` bypasses validation. Client code should
use public properties.

### Hardcoded Values

Repeated `2`, `4`, or `6` can obscure meaning. Constants such as `FACE_COUNT`
communicate why a number exists.

### Incorrect Formulas

- Omitting one cylinder base.
- Using circumference instead of circle area.
- Confusing surface area with volume.
- Forgetting exponentiation precedence.

### Misusing `isinstance`

Testing exact types with `type(x) is ...` can reject legitimate subclasses.
`isinstance` respects inheritance.

## Debugging Guide

### Runtime Errors

#### `TypeError: Dimensions must be positive numbers.`

The constructor or setter received text, `None`, a collection, or a Boolean.

#### `ValueError: Dimensions must be positive numbers.`

The value was numeric but zero or negative.

#### Abstract-Class Instantiation Error

Creating `Shape()`, `TwoDimensionalShape()`, or `ThreeDimensionalShape()` fails
because abstract methods remain unimplemented.

#### Import Errors

Run `Driver.py` from the project folder so sibling module imports resolve.

### Logical Errors

#### Rectangle Rotation Compares Unequal

Check that `_size_values()` sorts width and height.

#### Rectangle and Square Compare Equal

Check that equality compares full descriptions, not only measurements.

#### Square Stops Being Square

Check specialized width and height setters.

#### Missing Description Lines

Check every override for `super().getDescription()`.

#### Incorrect Cylinder Surface Area

Trace `base_area`, `curved_area`, and the multiplication by `BASE_COUNT`.

### Tracing Execution

For `print(Square(4))`, trace:

```text
Square.__init__
  -> Rectangle.__init__
     -> Shape._validate_dimension

print(square)
  -> Shape.__str__
     -> Square._dimension_text
```

For `square.getDescription()`, trace:

```text
Square.getDescription
  -> Rectangle.getDescription
     -> TwoDimensionalShape.getDescription
        -> Shape.getDescription
```

## Testing Guide

### Validation Tests

Test every dimension with:

- Positive integers
- Positive floats
- Zero
- Negative values
- Strings
- `None`
- `True` and `False`

### Formula Tests

Use known values and `math.isclose()` for π-based floating-point results.

### Equality Tests

- `Rectangle(3, 4) == Rectangle(4, 3)`
- Equal squares
- Unequal squares
- Equal circles
- Rectangle versus Square
- Shape versus unrelated object

### Property Tests

- Assign valid new dimensions.
- Reject invalid new dimensions.
- Confirm Square width and height remain equal after every setter.

### Abstract Contract Tests

- Parent abstract classes cannot be instantiated.
- Every concrete class can be instantiated.

### Fit Method Tests

- Matching and nonmatching Circle radii.
- Matching and nonmatching Square sides.
- Wrong argument types.

### Polymorphism Tests

Place all concrete shapes in one collection and call shared methods.

### Boundary Conditions

The key mathematical boundary is positivity:

- Values just above zero are valid.
- Zero and values below zero are invalid.

## Example Program Execution

```text
Rectangle(width=3, height=4)
Shape: a geometric figure with dimensions
Two-dimensional shape: a flat figure with area and perimeter
Rectangle: a quadrilateral with four right angles
Area: 12.00
Perimeter: 14.00

Square(side=4)
Shape: a geometric figure with dimensions
Two-dimensional shape: a flat figure with area and perimeter
Rectangle: a quadrilateral with four right angles
Square: a quadrilateral with four equal sides and four equal angles
Area: 16.00
Perimeter: 16.00
```

The Square description contains Rectangle because the inheritance relationship
is part of its identity.

```text
Rectangle(3, 4) equals Rectangle(4, 3): True
Rectangle(4, 4) equals Square(4): False
Circle(3) can be a base of Cylinder(3, 8): True
Square(4) can be a face of Cube(4): True
```

The first result demonstrates rotation-independent rectangle equality. The
second demonstrates that equal-looking dimensions are insufficient when shape
descriptions differ.

## Suggested Extensions

1. Add Triangle, Sphere, and RectangularPrism classes.
2. Add unit tests with `unittest`.
3. Add scaling methods.
4. Add read-only computed properties such as diameter.
5. Define a `contains()` contract with real geometric rules.
6. Introduce an immutable design.
7. Add serialization to dictionaries or JSON.
8. Use type hints throughout.
