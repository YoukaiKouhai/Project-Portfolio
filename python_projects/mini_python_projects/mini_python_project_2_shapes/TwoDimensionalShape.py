"""Define behavior shared by all flat, two-dimensional shapes."""

from abc import abstractmethod

from Shape import Shape


class TwoDimensionalShape(Shape):
    """Require 2D shapes to provide both area and perimeter calculations.

    This intermediate abstract class moves 2D-specific behavior above
    Rectangle, Square, and Circle so those child classes do not duplicate it.
    """

    TWO_DIMENSIONAL_DESCRIPTION = (
        "Two-dimensional shape: a flat figure with area and perimeter"
    )

    def getDescription(self):
        """Add the two-dimensional description to the parent description.

        ``super()`` calls ``Shape.getDescription`` first, preserving the full
        inheritance path in the returned explanation.
        """
        return (
            f"{super().getDescription()}\n"
            f"{self.TWO_DIMENSIONAL_DESCRIPTION}"
        )

    @abstractmethod
    def perimeter(self):
        """Return the distance around the shape using its specific formula."""
        pass

    def perimeterCanFitInside(self, inner_shape):
        """Return ``True`` when this shape has a larger perimeter.

        This is the assignment's simplified perimeter-only fit test. It does
        not consider the actual geometry or orientation of either shape.
        """
        # The operation applies only to other two-dimensional shapes because
        # three-dimensional shapes do not provide a perimeter method.
        if not isinstance(inner_shape, TwoDimensionalShape):
            return False
        return self.perimeter() > inner_shape.perimeter()
