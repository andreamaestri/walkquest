from typing import List, Optional
from ninja import Schema
from datetime import datetime

class TagOut(Schema):
    id: int
    name: str
    slug: str

class ConfigOut(Schema):
    map_style: str = "streets"
    start_location: Optional[List[float]] = None
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
    tags: List[TagOut] = []
    is_favorite: bool = False
    created_at: datetime
    updated_at: datetime | None = None
    coordinates: List[List[float]] = []
    start_point: List[float] | None = None
    end_point: List[float] | None = None