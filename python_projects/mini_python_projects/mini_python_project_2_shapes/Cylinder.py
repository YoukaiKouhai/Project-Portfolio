"""Define a cylinder as a concrete three-dimensional shape."""

import math

from Circle import Circle
from ThreeDimensionalShape import ThreeDimensionalShape


class Cylinder(ThreeDimensionalShape):
    """Represent a cylinder with a circular radius and vertical height."""

    CYLINDER_DESCRIPTION = (
        "Cylinder: a solid with two equal circular bases and a curved surface"
    )
    PI = math.pi
    BASE_COUNT = 2

    def __init__(self, radius, height):
        """Create a cylinder through its validating property setters."""
        self.radius = radius
        self.height = height

    @property
    def radius(self):
        """Return the radius of each circular base."""
        return self._radius

    @radius.setter
    def radius(self, value):
        """Set the radius only after positive-dimension validation."""
        self._radius = self._validate_dimension(value)

    @property
    def height(self):
        """Return the distance between the two circular bases."""
        return self._height

    @height.setter
    def height(self, value):
        """Set the height only after positive-dimension validation."""
        self._height = self._validate_dimension(value)

    def area(self):
        """Return total surface area of both bases and the curved side.

        Each circular base has area ``pi * radius^2``. The curved surface has
        area ``2 * pi * radius * height``. Adding those parts gives the total
        exterior area of the cylinder.
        """
        base_area = self.PI * self.radius ** 2
        curved_area = (
            self.BASE_COUNT * self.PI * self.radius * self.height
        )
        return self.BASE_COUNT * base_area + curved_area

    def volume(self):
        """Return volume: circular base area times cylinder height."""
        return self.PI * self.radius ** 2 * self.height

    def canFitCircle(self, circle):
        """Return whether a Circle has the same radius as either base.

        ``isinstance`` prevents unrelated objects from being treated as
        circles merely because they happen to have a radius attribute.
        """
        return isinstance(circle, Circle) and self.radius == circle.radius

    def getDescription(self):
        """Append the cylinder description to inherited descriptions."""
        return f"{super().getDescription()}\n{self.CYLINDER_DESCRIPTION}"

    def _size_values(self):
        """Return radius and height for the inherited equality comparison."""
        return (self.radius, self.height)

    def _dimension_text(self):
        """Return the dimension text used by Shape.__str__."""
        return f"radius={self.radius}, height={self.height}"
