from typing import List, Optional, Dict
from datetime import datetime
from ninja import Schema, Field
from uuid import UUID

class TagSchema(Schema):
    name: str
    slug: str
    usage_count: Optional[int] = None
    type: Optional[str] = None

class TagBaseSchema(Schema):
    name: str
    slug: str

    class Config:
        from_attributes = True

class WalkFeatureTagSchema(TagBaseSchema):
    class Config:
        from_attributes = True

class WalkCategoryTagSchema(TagBaseSchema):
    class Config:
        from_attributes = True

class PubSchema(Schema):
    name: str
    description: str | None = None

class CompanionInSchema(Schema):
    name: str

class CompanionOutSchema(Schema):
    id: UUID | None = None
    name: str
    created_at: datetime | None = None

    class Config:
        from_attributes = True

class WalkSchema(Schema):
    id: UUID
    walk_id: str
    walk_name: str
    highlights: str | None = None
    distance: float | None = None
    steepness_level: str | None = None
    latitude: float
    longitude: float
    has_pub: bool
    has_cafe: bool
    has_bus_access: bool
    has_stiles: bool
    created_at: datetime | None = None

    class Config:
        from_attributes = True

class AdventureSchema(Schema):
    id: UUID | None = None
    title: str
    description: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    start_time: str | None = None
    end_time: str | None = None
    difficulty_level: str | None = None
    related_categories: list[WalkCategoryTagSchema] | None = None
    companions: list[CompanionSchema] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

class WalkOutSchema(Schema):
    id: UUID
    walk_id: str
    walk_name: str
    distance: float | None = None
    latitude: float
    longitude: float
    has_pub: bool
    has_cafe: bool
    is_favorite: bool
    features: list[dict]
    categories: list[dict]
    related_categories: list[dict]
    highlights: str | None = None
    points_of_interest: list[str] | None = None
    os_explorer_reference: str | None = None
    steepness_level: str | None = None
    footwear_category: str | None = None
    recommended_footwear: str | None = None
    pubs_list: list[dict] | None = None
    trail_considerations: str | None = None
    has_stiles: bool
    has_bus_access: bool
    created_at: str
    updated_at: str

class TagResponseSchema(Schema):
    name: str
    slug: str
    usage_count: int
    type: str

class WalkFilterSchema(Schema):
    search: str | None = None
    categories: list[str] | None = None
    has_pub: bool | None = None
    has_cafe: bool | None = None
    min_distance: float | None = None
    max_distance: float | None = None

class WalkGeometrySchema(Schema):
    type: str = "Feature"
    geometry: dict
    properties: dict

class ConfigSchema(Schema):
    mapboxToken: str
    map: dict
    filters: dict

class FavoriteResponseSchema(Schema):
    status: str
    walk_id: str
    is_favorite: bool

class GeometrySchema(Schema):
    type: str = "Feature"
    geometry: dict
    properties: dict

class MarkerSchema(Schema):
    id: int
    latitude: float
    longitude: float

class FiltersResponseSchema(Schema):
    difficulties: list[str]
    footwear: list[str]
    categories: list[dict]
    features: list[dict]
