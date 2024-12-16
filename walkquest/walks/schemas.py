from typing import List
from typing import Optional

from ninja import ModelSchema
from ninja import Schema
from pydantic import BaseModel

from .models import Walk
from .models import WalkCategoryTag
from .models import WalkFeatureTag


class TagBaseSchema(BaseModel):
    name: str
    slug: str

    class Config:
        orm_mode = True

class WalkFeatureTagSchema(TagBaseSchema):
    class Config:
        orm_mode = True
        model = WalkFeatureTag
        model_fields = ['name', 'slug']

class WalkCategoryTagSchema(TagBaseSchema):
    class Config:
        orm_mode = True
        model = WalkCategoryTag
        model_fields = ['name', 'slug']

class WalkOutSchema(ModelSchema):
    id: str
    walk_id: str
    walk_name: str
    distance: Optional[float]
    latitude: float
    longitude: float
    has_pub: bool
    has_cafe: bool
    features: List[WalkFeatureTagSchema]
    categories: List[WalkCategoryTagSchema]
    related_categories: List[WalkCategoryTagSchema]

    class Config:
        model = Walk
        model_fields = [
            'id', 'walk_id', 'walk_name', 'distance',
            'latitude', 'longitude', 'has_pub', 'has_cafe'
        ]
        orm_mode = True

    @staticmethod
    def resolve_features(obj):
        return [
            {"name": feature.name, "slug": feature.slug}
            for feature in obj.features.all()
        ]

    @staticmethod
    def resolve_categories(obj):
        return [
            {"name": category.name, "slug": category.slug}
            for category in obj.categories.all()
        ]

    @staticmethod
    def resolve_related_categories(obj):
        return [
            {"name": category.name, "slug": category.slug}
            for category in obj.related_categories.all()
        ]

    @staticmethod
    def resolve_id(obj):
        return str(obj.id)

class TagSchema(Schema):
    name: str
    usage_count: Optional[int] = None
    type: Optional[str] = None

class TagResponseSchema(BaseModel):
    name: str
    slug: str
    usage_count: int
    type: str

    class Config:
        orm_mode = True

class WalkFilterSchema(BaseModel):
    search: Optional[str] = None
    categories: Optional[List[str]] = None
    has_pub: Optional[bool] = None
    has_cafe: Optional[bool] = None
    min_distance: Optional[float] = None
    max_distance: Optional[float] = None

    class Config:
        orm_mode = True

class WalkGeometrySchema(BaseModel):
    type: str = "Feature"
    geometry: dict
    properties: dict

    class Config:
        orm_mode = True

class ConfigSchema(Schema):
    mapboxToken: str
    map: dict
    filters: dict
