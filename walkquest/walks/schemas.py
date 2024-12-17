from typing import List, Optional, Dict
from datetime import datetime
from ninja import Schema
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
    description: Optional[str] = None

class WalkOutSchema(Schema):
    id: UUID
    walk_id: str
    walk_name: str
    distance: float
    latitude: float
    longitude: float
    has_pub: bool
    has_cafe: bool
    is_favorite: bool
    features: List[TagBaseSchema]
    categories: List[TagBaseSchema]
    related_categories: List[TagBaseSchema]
    highlights: str
    points_of_interest: str
    os_explorer_reference: Optional[str]
    steepness_level: str
    footwear_category: str
    recommended_footwear: str
    pubs_list: List[PubSchema]  # Changed to use PubSchema
    trail_considerations: str
    rewritten_trail_considerations: str
    has_stiles: bool
    has_bus_access: bool
    created_at: datetime  # Changed to datetime
    updated_at: datetime  # Changed to datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()  # Convert datetime to ISO format string
        }

class TagResponseSchema(Schema):
    name: str
    slug: str
    usage_count: int
    type: str

class WalkFilterSchema(Schema):
    search: Optional[str] = None
    categories: Optional[List[str]] = None
    has_pub: Optional[bool] = None
    has_cafe: Optional[bool] = None
    min_distance: Optional[float] = None
    max_distance: Optional[float] = None

class WalkGeometrySchema(Schema):
    type: str = "Feature"
    geometry: dict
    properties: dict

class ConfigSchema(Schema):
    mapboxToken: str
    map: dict
    filters: dict
