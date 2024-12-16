from rest_framework import serializers

from .models import Adventure
from .models import Walk
from .models import WalkCategoryTag

class WalkCategoryTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalkCategoryTag

class AdventureSerializer(serializers.ModelSerializer):
    related_categories = serializers.SerializerMethodField()

    class Meta:
        model = Adventure
        fields = "__all__"

from ninja import ModelSchema
from .models import Walk

class WalkSerializer(ModelSchema):
    class Config:
        model = Walk
        model_fields = '__all__'
