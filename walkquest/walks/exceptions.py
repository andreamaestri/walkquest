"""Custom exceptions for walks app."""
from typing import Any


class WalkError(Exception):
    """Base exception for walk-related errors."""


class InvalidCoordinatesError(WalkError):
    """Raised when coordinates are outside valid range."""

    def __init__(self, lat: float, lon: float) -> None:
        self.lat = lat
        self.lon = lon
        super().__init__(f"Invalid coordinates: ({lat}, {lon})")


class GeometryError(WalkError):
    """Raised when there's an error processing walk geometry."""

    def __init__(self, walk_id: str, details: Any = None) -> None:
        self.walk_id = walk_id
        self.details = details
        message = f"Error processing geometry for walk {walk_id}"
        if details:
            message += f": {details}"
        super().__init__(message)


class WalkNotFoundError(WalkError):
    """Raised when a walk cannot be found."""

    def __init__(self, identifier: str) -> None:
        self.identifier = identifier
        super().__init__(f"Walk not found: {identifier}")


class WalkFilterError(WalkError):
    """Raised when there's an error filtering walks."""

    def __init__(self, filter_type: str, value: str) -> None:
        self.filter_type = filter_type
        self.value = value
        super().__init__(f"Invalid {filter_type} filter value: {value}")


class AuthenticationRequiredError(WalkError):
    """Raised when an authenticated user is required."""

    def __init__(self, operation: str = "this operation") -> None:
        super().__init__(f"Authentication is required for {operation}")
