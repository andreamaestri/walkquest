from rest_framework import serializers
from tagulous.serializers import TagSerializer

from .models import Adventure
from .models import Walk
from .models import WalkCategoryTag


class WalkCategoryTagSerializer(TagSerializer):
    class Meta:
        model = WalkCategoryTag

class AdventureSerializer(serializers.ModelSerializer):
    related_categories = TagSerializer()

    class Meta:
        model = Adventure
        fields = "__all__"

class WalkSerializer(serializers.ModelSerializer):
    related_categories = TagSerializer()

    class Meta:
        model = Walk
        fields = "__all__"
