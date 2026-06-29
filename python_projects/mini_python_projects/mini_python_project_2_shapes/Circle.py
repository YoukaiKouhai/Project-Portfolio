"""Define a circle as a concrete two-dimensional shape."""

import math

from TwoDimensionalShape import TwoDimensionalShape


class Circle(TwoDimensionalShape):
    """Represent a circle with one positive radius dimension."""

    CIRCLE_DESCRIPTION = (
        "Circle: a round figure whose edge is equally distant from its center"
    )
    PI = math.pi
    DIAMETER_MULTIPLIER = 2

    def __init__(self, radius):
        """Create a circle using the validating radius property setter."""
        self.radius = radius

    @property
    def radius(self):
        """Return the circle's radius."""
        return self._radius

    @radius.setter
    def radius(self, value):
        """Set the radius only after shared positive-dimension validation."""
        self._radius = self._validate_dimension(value)

    def area(self):
        """Return the enclosed area using pi times radius squared."""
        return self.PI * self.radius ** 2

    def perimeter(self):
        """Return the circumference using 2 times pi times the radius."""
        return self.DIAMETER_MULTIPLIER * self.PI * self.radius

    def getDescription(self):
        """Append the circle description to inherited descriptions."""
        return f"{super().getDescription()}\n{self.CIRCLE_DESCRIPTION}"

    def _size_values(self):
        """Return the radius used by Shape.__eq__ to compare circle sizes."""
        return (self.radius,)

    def _dimension_text(self):
        """Return the dimension text used by Shape.__str__."""
        return f"radius={self.radius}"
