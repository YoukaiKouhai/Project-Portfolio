"""Define a square as a specialized type of rectangle."""

from Rectangle import Rectangle


class Square(Rectangle):
    """Represent a rectangle whose width and height must remain equal.

    Square inherits Rectangle's general quadrilateral behavior. It adds the
    stricter rule that all sides have one shared length.
    """

    SQUARE_DESCRIPTION = (
        "Square: a quadrilateral with four equal sides and four equal angles"
    )
    SIDE_COUNT = 4

    def __init__(self, side):
        """Create a square by passing the same side to Rectangle twice.

        ``super()`` reuses Rectangle's constructor and its dimension
        validation rather than duplicating that work in this child class.
        """
        super().__init__(side, side)

    @property
    def side(self):
        """Return the shared side length stored in the inherited width field."""
        return self._width

    @side.setter
    def side(self, value):
        """Validate and assign one value to both rectangle dimensions."""
        valid_side = self._validate_dimension(value)
        self._width = valid_side
        self._height = valid_side

    # These inherited setters are specialized so changing either rectangle
    # dimension cannot break the defining rule that a square's sides are equal.
    @Rectangle.width.setter
    def width(self, value):
        """Change both dimensions when the inherited width is assigned."""
        self.side = value

    @Rectangle.height.setter
    def height(self, value):
        """Change both dimensions when the inherited height is assigned."""
        self.side = value

    def area(self):
        """Return area using the square formula: side times side."""
        return self.side * self.side

    def perimeter(self):
        """Return perimeter by multiplying one side by the four sides."""
        return self.SIDE_COUNT * self.side

    def getDescription(self):
        """Include the Shape, 2D, Rectangle, and Square descriptions.

        ``super()`` is especially useful here because Rectangle has already
        assembled the descriptions above it in the hierarchy.
        """
        return f"{super().getDescription()}\n{self.SQUARE_DESCRIPTION}"

    def _size_values(self):
        """Return the single side value used to compare square sizes."""
        return (self.side,)

    def _dimension_text(self):
        """Return the dimension text used by Shape.__str__."""
        return f"side={self.side}"
