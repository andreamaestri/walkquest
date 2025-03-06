import tagulous.admin
from django.contrib import admin
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.forms import OSMWidget
from django.db import models
from django.utils.html import format_html
from django.utils.translation import gettext_lazy as _
from tagulous.admin import TagModelAdmin
from unfold.admin import ModelAdmin
from unfold.contrib.filters.admin import ChoicesDropdownFilter
from unfold.contrib.forms.widgets import WysiwygWidget

from .models import Adventure
from .models import Companion
from .models import Walk
from .models import WalkCategoryTag
from .models import WalkFeatureTag


@admin.register(Companion)
class CompanionAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "created_at")
    list_filter = ("created_at",)
    search_fields = ("name", "user__username")
    ordering = ("name",)

class GISModelAdmin(ModelAdmin):
    default_lon = -5.051355
    default_lat = 50.259291
    default_zoom = 20

    formfield_overrides = {
        gis_models.GeometryField: {
            "widget": OSMWidget(
                attrs={
                    "default_lon": default_lon,
                    "default_lat": default_lat,
                    "default_zoom": default_zoom,
                    "map_width": 800,
                    "map_height": 500,
                    "display_raw": True,
                    "map_srid": 4326,
                },
            ),
        },
        models.TextField: {
            "widget": WysiwygWidget,
        },
    }

    class Media:
        css = {
            "all": [
                "https://cdn.jsdelivr.net/npm/ol@v10.3.0/ol.css",
                "walkquest_admin/css/widgets.css",
                "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
            ],
        }
        js = [
            "https://cdn.jsdelivr.net/npm/ol@v10.3.0/dist/ol.js",
            "walkquest_admin/js/map_styling.js",
        ]


class AdventureAdmin(ModelAdmin):
    formfield_overrides = {
        models.TextField: {
            "widget": WysiwygWidget,
        },
    }

    search_fields = ("title", "description")
    list_display = ("title", "difficulty_level", "start_date", "end_date", "created_at")
    list_filter = ("difficulty_level", "start_date", "created_at")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "start_date"
    ordering = ("-created_at",)

    fieldsets = (
        (None, {
            "fields": [
                "title",
                "difficulty_level",
            ],
        }),
        (_("Description"), {
            "classes": ["tab"],
            "fields": [
                "description",
            ],
        }),
        (_("Dates"), {
            "classes": ["tab"],
            "fields": [
                ("start_date", "end_date"),
                ("created_at", "updated_at"),
            ],
        }),
    )

    @admin.display(description=_("Categories"))
    def get_related_categories(self, obj):
        return str(obj.related_categories)


# Fix the WalkAdmin class by using the correct field names from your model
class WalkAdmin(GISModelAdmin, TagModelAdmin):
    # Break the long line
    list_display = (
        "walk_name",
        "distance", 
        "steepness_level",
        "amenities_summary",
    )
    
    # Using search_fields with the correct field names
    search_fields = ("walk_name", "walk_id", "highlights")
    
    # Make sure these list_filter fields actually exist in your model
    list_filter = (
        ("steepness_level", ChoicesDropdownFilter),
        ("footwear_category", ChoicesDropdownFilter),
    )
    
    # Make sure these fields exist in your model
    readonly_fields = ()
    
    # Make sure the adventure field exists in your model
    raw_id_fields = ("adventure",)
    
    # Make sure these fields exist in your model
    prepopulated_fields = {"walk_id": ("walk_name",)}
    
    # In the get_form method, simply return super()'s result directly
    def get_form(self, request, obj=None, **kwargs):
        return super().get_form(request, obj, **kwargs)
    
    # Update references in amenities_summary to use the correct field names
    @admin.display(description="Amenities")
    def amenities_summary(self, obj):
        amenities = []
        # Updated field names without walk_ prefix
        if hasattr(obj, "has_pub") and obj.has_pub:
            amenities.append(format_html('<span class="amenity-icon pub">🍺</span>'))
        if hasattr(obj, "has_cafe") and obj.has_cafe:
            amenities.append(format_html('<span class="amenity-icon cafe">☕</span>'))
        if hasattr(obj, "has_bus_access") and obj.has_bus_access:
            amenities.append(format_html('<span class="amenity-icon bus">🚌</span>'))
        if hasattr(obj, "has_stiles") and obj.has_stiles:
            amenities.append(format_html('<span class="amenity-icon stile">🚧</span>'))
        return format_html('<div class="amenities-container">{}</div>',
                        format_html("".join(amenities)) if amenities else "None")

class WalkCategoryTagAdmin(TagModelAdmin):
    list_display = ["name", "count", "protected"]
    list_filter = ["protected"]
    exclude = ["count"]
    actions = ["merge_tags"]


@admin.register(WalkFeatureTag)
class WalkFeatureTagAdmin(admin.ModelAdmin):
    # ... Keep existing WalkFeatureTagAdmin class unchanged ...
    pass


# Register models with Tagulous - only register each model once
tagulous.admin.register(WalkCategoryTag, WalkCategoryTagAdmin)
tagulous.admin.register(Adventure, AdventureAdmin)
tagulous.admin.register(Walk, WalkAdmin)
