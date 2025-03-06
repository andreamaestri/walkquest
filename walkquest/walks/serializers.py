from rest_framework import serializers

from .models import Adventure, Companion, Walk, WalkCategoryTag, WalkFeatureTag


class WalkFeatureTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalkFeatureTag
        fields = ["name", "slug"]


class WalkCategoryTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalkCategoryTag
        fields = ["name", "slug"]


class CompanionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Companion
        fields = ["id", "name", "created_at"]
        read_only_fields = ["id", "created_at"]


class WalkSerializer(serializers.ModelSerializer):
    features = WalkFeatureTagSerializer(many=True, read_only=True)
    categories = WalkCategoryTagSerializer(many=True, read_only=True)
    related_categories = WalkCategoryTagSerializer(many=True, read_only=True)
    
    class Meta:
        model = Walk
        fields = [
            "id", "walk_id", "walk_name", "highlights", "distance",
            "steepness_level", "latitude", "longitude", "features",
            "categories", "related_categories", "has_pub", "has_cafe",
            "has_bus_access", "has_stiles", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AdventureSerializer(serializers.ModelSerializer):
    companions = CompanionSerializer(many=True, read_only=True)
    companion_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Adventure
        fields = [
            "id", "title", "description", "start_date", "end_date",
            "start_time", "end_time", "difficulty_level", "related_categories",
            "companions", "companion_ids", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        companion_ids = validated_data.pop("companion_ids", [])
        adventure = super().create(validated_data)
        if companion_ids:
            companions = Companion.objects.filter(
                id__in=companion_ids,
                user=self.context["request"].user,
            )
            adventure.companions.set(companions)
        return adventure

    def update(self, instance, validated_data):
        companion_ids = validated_data.pop("companion_ids", None)
        adventure = super().update(instance, validated_data)
        if companion_ids is not None:
            companions = Companion.objects.filter(
                id__in=companion_ids,
                user=self.context["request"].user,
            )
            adventure.companions.set(companions)
        return adventure
