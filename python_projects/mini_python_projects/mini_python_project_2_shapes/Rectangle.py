"""Define a rectangle as a concrete two-dimensional shape."""

from TwoDimensionalShape import TwoDimensionalShape


class Rectangle(TwoDimensionalShape):
    """Represent a rectangle with positive width and height dimensions.

    Inheriting from ``TwoDimensionalShape`` identifies the rectangle as a flat
    shape and requires it to implement the area and perimeter methods.
    """

    RECTANGLE_DESCRIPTION = (
        "Rectangle: a quadrilateral with four right angles"
    )
    PERIMETER_MULTIPLIER = 2

    def __init__(self, width, height):
        """Create a rectangle after validating both dimensions."""
        self._width = self._validate_dimension(width)
        self._height = self._validate_dimension(height)

    @property
    def width(self):
        """Return the rectangle's width through a readable property."""
        return self._width

    @width.setter
    def width(self, value):
        """Set the width only after confirming that it is positive."""
        self._width = self._validate_dimension(value)

    @property
    def height(self):
        """Return the rectangle's height through a readable property."""
        return self._height

    @height.setter
    def height(self, value):
        """Set the height only after confirming that it is positive."""
        self._height = self._validate_dimension(value)

    def area(self):
        """Return area using the rectangle formula: width times height."""
        return self.width * self.height

    def perimeter(self):
        """Return perimeter by adding all four sides: 2(width + height)."""
        return self.PERIMETER_MULTIPLIER * (self.width + self.height)

    def getDescription(self):
        """Append the rectangle description to inherited descriptions."""
        return f"{super().getDescription()}\n{self.RECTANGLE_DESCRIPTION}"

    def _size_values(self):
        """Return dimensions in an order-independent form for equality."""
        # Sorting makes Rectangle(3, 4) equal Rectangle(4, 3).
        return tuple(sorted((self.width, self.height)))

    def _dimension_text(self):
        """Return the dimension text used by Shape.__str__."""
        return f"width={self.width}, height={self.height}"
