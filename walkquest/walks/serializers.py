from ninja import ModelSchema
from ninja.orm.fields import TYPES
from rest_framework import serializers

from .models import Adventure
from .models import Companion
from .models import Walk
from .models import WalkCategoryTag
from .models import WalkFeatureTag

TYPES["GeometryField"] = str

class CompanionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Companion
        fields = ["id", "name", "created_at"]

class WalkCategoryTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalkCategoryTag

# Add the missing serializer
class WalkFeatureTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalkFeatureTag

class AdventureSerializer(serializers.ModelSerializer):
    related_categories = serializers.SerializerMethodField()

    class Meta:
        model = Adventure
        fields = "__all__"

class WalkSerializer(ModelSchema):
    class Meta:
        model = Walk
        fields = "__all__"
