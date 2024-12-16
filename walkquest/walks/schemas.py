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
        from_attributes = True

class WalkFeatureTagSchema(TagBaseSchema):
    class Config:
        from_attributes = True
        model = WalkFeatureTag
        model_fields = ['name', 'slug']

class WalkCategoryTagSchema(TagBaseSchema):
    class Config:
        from_attributes = True
        model = WalkCategoryTag
        model_fields = ['name', 'slug']

class WalkOutSchema(BaseModel):
    id: str
    walk_id: str
    walk_name: str
    distance: Optional[float]
    latitude: float
    longitude: float
    has_pub: bool
    has_cafe: bool
    is_favorite: bool = False  # Default to False
    features: List[WalkFeatureTagSchema]
    categories: List[WalkCategoryTagSchema]
    related_categories: List[WalkCategoryTagSchema]

    class Config:
        from_attributes = True
        
    @classmethod
    def from_orm(cls, obj):
        # Handle both model fields and annotated fields
        return cls(
            id=str(obj.id),
            walk_id=obj.walk_id,
            walk_name=obj.walk_name,
            distance=float(obj.distance) if obj.distance else None,
            latitude=float(obj.latitude),
            longitude=float(obj.longitude),
            has_pub=bool(obj.has_pub),
            has_cafe=bool(obj.has_cafe),
            is_favorite=bool(getattr(obj, 'is_favorite', False)),
            features=[
                WalkFeatureTagSchema(name=feature.name, slug=feature.slug)
                for feature in obj.features.all()
            ],
            categories=[
                WalkCategoryTagSchema(name=category.name, slug=category.slug)
                for category in obj.categories.all()
            ],
            related_categories=[
                WalkCategoryTagSchema(name=category.name, slug=category.slug)
                for category in obj.related_categories.all()
            ]
        )

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
        from_attributes = True

class WalkFilterSchema(BaseModel):
    search: Optional[str] = None
    categories: Optional[List[str]] = None
    has_pub: Optional[bool] = None
    has_cafe: Optional[bool] = None
    min_distance: Optional[float] = None
    max_distance: Optional[float] = None

    class Config:
        from_attributes = True

class WalkGeometrySchema(BaseModel):
    type: str = "Feature"
    geometry: dict
    properties: dict

    class Config:
        from_attributes = True

class ConfigSchema(Schema):
    mapboxToken: str
    map: dict
    filters: dict
