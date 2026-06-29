"""Define the common abstract parent for every shape in the project.

An abstract parent class describes behavior that all child classes must share,
while leaving shape-specific calculations to those child classes.
"""

from abc import ABC, abstractmethod


class Shape(ABC):
    """Provide validation, descriptions, printing, and equality for all shapes.

    ``Shape`` inherits from ``ABC`` (Abstract Base Class), so it acts as a
    template rather than a complete shape. Concrete classes must implement the
    abstract methods before objects of those classes can be created.
    """

    # Constants avoid repeating shared text throughout the class hierarchy.
    SHAPE_DESCRIPTION = "Shape: a geometric figure with dimensions"
    POSITIVE_DIMENSION_MESSAGE = "Dimensions must be positive numbers."

    @staticmethod
    def _validate_dimension(value):
        """Return a positive numeric dimension or raise an appropriate error.

        This shared helper keeps every shape's constructor and property setter
        consistent. It is static because validation does not depend on a
        particular shape object.
        """
        # bool is excluded explicitly because Python treats True and False as
        # numeric values even though they are not meaningful shape dimensions.
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            raise TypeError(Shape.POSITIVE_DIMENSION_MESSAGE)
        if value <= 0:
            raise ValueError(Shape.POSITIVE_DIMENSION_MESSAGE)
        return value

    def getDescription(self):
        """Return the general description shared by all shapes.

        Child classes use ``super()`` to include this text before adding their
        own more specific descriptions.
        """
        return self.SHAPE_DESCRIPTION

    @abstractmethod
    def area(self):
        """Return area for a 2D shape or total surface area for a 3D shape.

        The decorator requires each concrete shape to supply its own formula.
        """
        pass

    @abstractmethod
    def _size_values(self):
        """Return the dimension values used by the shared equality method."""
        pass

    @abstractmethod
    def _dimension_text(self):
        """Return dimension text used by the shared string representation."""
        pass

    def __str__(self):
        """Return the readable text produced when a shape is printed.

        ``__str__`` controls the user-friendly representation of an object.
        The runtime class name and child-provided dimension text let one shared
        method format every concrete shape.
        """
        return f"{self.__class__.__name__}({self._dimension_text()})"

    def __eq__(self, other):
        """Return whether another object represents the same kind and size.

        Two shapes are equal only when their complete descriptions match and
        their comparison dimensions match. Description matching is important:
        it prevents different shapes, such as a square and rectangle, from
        comparing equal merely because they use similar measurements.
        """
        # NotImplemented allows Python to try the other object's comparison
        # behavior when the value being compared is not a Shape.
        if not isinstance(other, Shape):
            return NotImplemented

        # Shapes are equal only when both description and size match.
        return (
            self.getDescription() == other.getDescription()
            and self._size_values() == other._size_values()
        )
