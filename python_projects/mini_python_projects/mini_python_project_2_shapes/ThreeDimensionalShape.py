"""Define behavior shared by all solid, three-dimensional shapes."""

from abc import abstractmethod

from Shape import Shape


class ThreeDimensionalShape(Shape):
    """Require 3D shapes to provide surface area and volume calculations.

    ``Shape`` already requires ``area``. For a solid shape, that method means
    total surface area. This class adds the separate volume requirement.
    """

    THREE_DIMENSIONAL_DESCRIPTION = (
        "Three-dimensional shape: a solid figure with surface area and volume"
    )

    def getDescription(self):
        """Add the three-dimensional description to the parent description.

        Calling ``super()`` retains the general Shape description before this
        class contributes information specific to solid figures.
        """
        return (
            f"{super().getDescription()}\n"
            f"{self.THREE_DIMENSIONAL_DESCRIPTION}"
        )

    @abstractmethod
    def volume(self):
        """Return the amount of three-dimensional space inside the shape."""
        pass
