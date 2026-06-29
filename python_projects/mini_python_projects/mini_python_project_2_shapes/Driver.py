"""Create and exercise objects from every class in the shape hierarchy.

This driver acts as a readable demonstration rather than a separate automated
test suite. Running it shows calculations, inherited descriptions, equality,
and the required shape-fitting methods.
"""

from Circle import Circle
from Cube import Cube
from Cylinder import Cylinder
from Rectangle import Rectangle
from Square import Square
from ThreeDimensionalShape import ThreeDimensionalShape
from TwoDimensionalShape import TwoDimensionalShape


def print_shape_information(shape):
    """Print calculations appropriate to the shape object's hierarchy.

    This function demonstrates polymorphism: the same calls to ``area``,
    ``getDescription``, and ``str`` work for every concrete shape because the
    parent classes define a shared interface. Python selects the correct child
    implementation at runtime.
    """
    # print(shape) automatically calls the object's inherited __str__ method.
    print(shape)
    print(shape.getDescription())
    print(f"Area: {shape.area():.2f}")

    # isinstance distinguishes the two branches of the hierarchy so the
    # driver requests perimeter from flat shapes and volume from solid shapes.
    if isinstance(shape, TwoDimensionalShape):
        print(f"Perimeter: {shape.perimeter():.2f}")
    elif isinstance(shape, ThreeDimensionalShape):
        print(f"Volume: {shape.volume():.2f}")

    print("-" * 60)


def main():
    """Create sample objects and demonstrate all assignment requirements."""
    # Multiple objects of each type provide meaningful equality and fit tests.
    rectangle_one = Rectangle(3, 4)
    rectangle_two = Rectangle(4, 3)
    rectangle_three = Rectangle(5, 7)

    square_one = Square(4)
    square_two = Square(4)
    square_three = Square(2)

    circle_one = Circle(3)
    circle_two = Circle(4)

    cylinder_one = Cylinder(3, 8)
    cylinder_two = Cylinder(4, 5)

    cube_one = Cube(4)
    cube_two = Cube(6)

    # A single collection can hold different child types because every item
    # ultimately inherits from Shape and follows the same basic interface.
    shapes = [
        rectangle_one,
        rectangle_two,
        rectangle_three,
        square_one,
        square_two,
        square_three,
        circle_one,
        circle_two,
        cylinder_one,
        cylinder_two,
        cube_one,
        cube_two,
    ]

    print("\nSHAPE INFORMATION")
    print("=" * 60)
    for shape in shapes:
        print_shape_information(shape)

    # Shape.__eq__ checks both description and child-provided size values.
    # Rectangle dimensions are order-independent, while a Square remains a
    # different described shape even when its measurements resemble a rectangle.
    print("\nEQUALITY TESTS")
    print("=" * 60)
    print(
        "Rectangle(3, 4) equals Rectangle(4, 3):",
        rectangle_one == rectangle_two,
    )
    print("Square(4) equals Square(4):", square_one == square_two)
    print("Square(4) equals Square(2):", square_one == square_three)
    print(
        "Rectangle(4, 4) equals Square(4):",
        Rectangle(4, 4) == square_one,
    )

    # These methods combine a type check with the matching required dimension.
    print("\nFIT TESTS")
    print("=" * 60)
    print(
        "Circle(3) can be a base of Cylinder(3, 8):",
        cylinder_one.canFitCircle(circle_one),
    )
    print(
        "Circle(4) can be a base of Cylinder(3, 8):",
        cylinder_one.canFitCircle(circle_two),
    )
    print(
        "Square(4) can be a face of Cube(4):",
        cube_one.canFitSquare(square_one),
    )
    print(
        "Square(2) can be a face of Cube(4):",
        cube_one.canFitSquare(square_three),
    )

    # The extra-credit method compares perimeter values only; it does not
    # attempt a complete geometric containment calculation.
    print("\nEXTRA-CREDIT PERIMETER TESTS")
    print("=" * 60)
    print(
        "Rectangle(5, 7) perimeter can contain Square(2) perimeter:",
        rectangle_three.perimeterCanFitInside(square_three),
    )
    print(
        "Circle(4) perimeter can contain Circle(3) perimeter:",
        circle_two.perimeterCanFitInside(circle_one),
    )
    print(
        "Square(2) perimeter can contain Rectangle(3, 4) perimeter:",
        square_three.perimeterCanFitInside(rectangle_one),
    )


# This guard runs the demonstration only when Driver.py is executed directly.
# It prevents automatic output if another module imports a driver function.
if __name__ == "__main__":
    main()
