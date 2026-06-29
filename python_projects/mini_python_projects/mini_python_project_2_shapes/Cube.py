"""Define a cube as a concrete three-dimensional shape."""

from Square import Square
from ThreeDimensionalShape import ThreeDimensionalShape


class Cube(ThreeDimensionalShape):
    """Represent a solid made from six equal square faces."""

    CUBE_DESCRIPTION = "Cube: a solid with six equal square faces"
    FACE_COUNT = 6

    def __init__(self, side):
        """Create a cube using the validating side property setter."""
        self.side = side

    @property
    def side(self):
        """Return the common length of every cube edge."""
        return self._side

    @side.setter
    def side(self, value):
        """Set the side only after positive-dimension validation."""
        self._side = self._validate_dimension(value)

    def area(self):
        """Return surface area: six faces times the area of one square."""
        return self.FACE_COUNT * self.side ** 2

    def volume(self):
        """Return volume using side cubed: side times side times side."""
        return self.side ** 3

    def canFitSquare(self, square):
        """Return whether a Square has the same side length as a cube face.

        The type check ensures that the argument is actually a Square before
        comparing its size with the cube.
        """
        return isinstance(square, Square) and self.side == square.side

    def getDescription(self):
        """Append the cube description to inherited descriptions."""
        return f"{super().getDescription()}\n{self.CUBE_DESCRIPTION}"

    def _size_values(self):
        """Return the side used by Shape.__eq__ to compare cube sizes."""
        return (self.side,)

    def _dimension_text(self):
        """Return the dimension text used by Shape.__str__."""
        return f"side={self.side}"
