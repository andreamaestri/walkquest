from datetime import datetime

from ninja import Schema


class TagOut(Schema):
    id: int
    name: str
    slug: str

class ConfigOut(Schema):
    map_style: str = "streets"
    start_location: list[float] | None = None
    zoom_level: float = 12.0

class WalkOut(Schema):
    id: int
    name: str
    slug: str
    description: str | None = None
    distance: float | None = None
    duration: int | None = None
    difficulty: str | None = None
    steepness: str | None = None
    tags: list[TagOut] = []
    is_favorite: bool = False
    created_at: datetime
    updated_at: datetime | None = None
    coordinates: list[list[float]] = []
    start_point: list[float] | None = None
    end_point: list[float] | None = None
