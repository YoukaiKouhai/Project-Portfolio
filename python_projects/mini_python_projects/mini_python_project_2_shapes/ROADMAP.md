# Student Roadmap: Shape Hierarchy

Study the project from the root abstraction toward the concrete classes and
driver. Each stage builds on the previous one.

## Stage 1: Understand the Problem Domain

### Concepts to Learn

- 2D versus 3D measurements
- Shape dimensions
- Mathematical formulas
- Shared versus specialized behavior

### Files to Read

- `TEACHING_GUIDE.md`: overview and formula reference
- `Driver.py`: object creation section

### Methods to Study

- Scan each class’s `area()`, `perimeter()`, or `volume()`

### Questions to Answer

1. Which shapes are 2D?
2. Which shapes are 3D?
3. What does `area()` mean for a 3D shape?
4. Which dimensions define each shape?
5. Which formulas use π?

## Stage 2: Understand the Abstract Base Class

### Concepts to Learn

- `ABC`
- `@abstractmethod`
- Shared validation
- Special methods
- Template methods

### Files to Read

- `Shape.py`

### Methods to Study

- `_validate_dimension()`
- `area()`
- `__str__()`
- `__eq__()`
- `_size_values()`
- `_dimension_text()`

### Questions to Answer

1. Why can Shape not be instantiated?
2. Why is validation static?
3. Why does `__str__()` call a child hook?
4. Why does equality compare description and size?
5. Why does equality return `NotImplemented` for a non-Shape?

## Stage 3: Understand the Two Abstract Branches

### Concepts to Learn

- Intermediate abstract classes
- Inherited contracts
- Category-specific behavior
- `super()`

### Files to Read

- `TwoDimensionalShape.py`
- `ThreeDimensionalShape.py`

### Methods to Study

- Both `getDescription()` methods
- `perimeter()`
- `volume()`
- `perimeterCanFitInside()`

### Questions to Answer

1. Why is perimeter required only for 2D shapes?
2. Why is volume required only for 3D shapes?
3. What behavior still remains abstract?
4. How does `super()` preserve description history?
5. Why does perimeter fit reject a 3D object?

## Stage 4: Understand Rectangle and Encapsulation

### Concepts to Learn

- Constructors
- Properties
- Setters
- Instance attributes
- Invariants

### Files to Read

- `Rectangle.py`

### Methods to Study

- `__init__()`
- `width` and `height` properties
- `area()`
- `perimeter()`
- `_size_values()`

### Questions to Answer

1. Why are values stored as `_width` and `_height`?
2. What prevents negative dimensions?
3. Why are dimensions sorted for equality?
4. What is inherited rather than reimplemented?
5. What happens when `rectangle.width = 0`?

## Stage 5: Understand Square as a Specialized Rectangle

### Concepts to Learn

- Multilevel inheritance
- Constructor delegation
- Method overriding
- Property overriding
- Maintaining invariants

### Files to Read

- `Square.py`
- Review `Rectangle.py`

### Methods to Study

- `__init__()`
- `side`
- Specialized `width` and `height` setters
- `getDescription()`

### Questions to Answer

1. Why is Square a Rectangle?
2. Why does the constructor call `super()`?
3. How can inherited setters threaten the square invariant?
4. Why does changing width update height?
5. Why does the description include both Rectangle and Square?

## Stage 6: Understand Circle

### Concepts to Learn

- `math.pi`
- Radius-based formulas
- Concrete implementation of abstract methods

### Files to Read

- `Circle.py`

### Methods to Study

- Radius property
- `area()`
- `perimeter()`

### Questions to Answer

1. Why is circumference implemented as perimeter?
2. Why is radius squared for area?
3. What behavior comes from Shape?
4. What behavior comes from TwoDimensionalShape?
5. How are two circles compared?

## Stage 7: Understand Three-Dimensional Shapes

### Concepts to Learn

- Surface area versus volume
- Formula decomposition
- Collaboration between object types
- `isinstance`

### Files to Read

- `Cylinder.py`
- `Cube.py`

### Methods to Study

- Both `area()` methods
- Both `volume()` methods
- `canFitCircle()`
- `canFitSquare()`

### Questions to Answer

1. Why does Cylinder area include two base areas?
2. Why is volume base area times height?
3. Why does Cube surface area multiply by six?
4. Why do fit methods check both type and size?
5. Why do Cylinder and Cube not inherit Circle and Square?

## Stage 8: Understand Polymorphism

### Concepts to Learn

- Runtime method selection
- Shared interfaces
- Heterogeneous collections
- Abstract-type checking

### Files to Read

- `Driver.py`

### Methods to Study

- `print_shape_information()`

### Questions to Answer

1. How can one list hold every concrete shape?
2. Which method implementation runs for `shape.area()`?
3. Why does the driver use `isinstance`?
4. How does `print(shape)` reach Shape’s `__str__()`?
5. How would adding Triangle affect this function?

## Stage 9: Understand Equality and String Representation

### Concepts to Learn

- Identity versus equality
- Special methods
- Parent algorithms with child hooks
- Semantic equality

### Files to Read

- `Shape.py`
- `_size_values()` and `_dimension_text()` in every concrete class
- Equality section of `Driver.py`

### Methods to Study

- `__eq__()`
- `__str__()`
- `_size_values()`
- `_dimension_text()`

### Questions to Answer

1. What makes two shapes equal?
2. Why is area alone insufficient?
3. Why is rectangle dimension order ignored?
4. Why does Rectangle(4, 4) differ from Square(4)?
5. How does one `__str__()` format every shape?

## Stage 10: Test the Hierarchy

### Concepts to Learn

- Unit tests
- Floating-point comparison
- Exception tests
- Abstract contract tests
- Property invariant tests

### Files to Read

- `TEACHING_GUIDE.md`: Testing Guide
- All concrete shape files

### Methods to Study

- Every constructor and setter
- Every formula
- Equality and fit methods

### Questions to Answer

1. Why use `math.isclose()`?
2. Which invalid values should raise TypeError?
3. Which invalid values should raise ValueError?
4. How can Square’s invariant be tested?
5. How can abstractness be tested?

## Stage 11: Extend the Project

### Concepts to Learn

- Open/closed design
- New subclasses
- Choosing the correct parent
- Avoiding inheritance misuse

### Suggested Extensions

1. Add Triangle.
2. Add Sphere.
3. Add RectangularPrism.
4. Add scaling.
5. Add type hints and unit tests.

### Questions to Answer

1. Which parent should Triangle inherit?
2. Which methods must Sphere implement?
3. Should RectangularPrism inherit Rectangle?
4. Which existing driver code should work unchanged?
5. What new equality size tuple would each class provide?

## Recommended Reading Order

1. `Shape.py`
2. `TwoDimensionalShape.py`
3. `Rectangle.py`
4. `Square.py`
5. `Circle.py`
6. `ThreeDimensionalShape.py`
7. `Cylinder.py`
8. `Cube.py`
9. `Driver.py`
