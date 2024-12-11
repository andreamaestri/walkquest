import tagulous.admin
from django.contrib.gis import admin
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
from .models import Walk
from .models import WalkCategoryTag


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

class WalkAdmin(GISModelAdmin, TagModelAdmin):
    search_fields = ("walk_name", "walk_id", "highlights")
    list_display = ("walk_name", "adventure", "distance", "steepness_level", "amenities_summary", "get_related_categories")
    list_filter = (
        ("steepness_level", ChoicesDropdownFilter),
        ("footwear_category", ChoicesDropdownFilter),
        "has_pub",
        "has_cafe",
        "has_bus_access",
    )
    readonly_fields = ("created_at", "updated_at")
    raw_id_fields = ("adventure",)
    prepopulated_fields = {"walk_id": ("walk_name",)}  # Corrected fields

    formfield_overrides = {
        gis_models.GeometryField: {
            "widget": OSMWidget(
                attrs={
                    "default_lon": GISModelAdmin.default_lon,
                    "default_lat": GISModelAdmin.default_lat,
                    "default_zoom": GISModelAdmin.default_zoom,
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

    fieldsets = (
        (None, {
            "fields": [
                "walk_name",
                "walk_id",
                "adventure",
            ],
        }),
        (_("Location & Route"), {
            "classes": ["tab"],
            "fields": [
                ("latitude", "longitude"),
                "route_geometry",
                "os_explorer_reference",
                "distance",
            ],
        }),
        (_("Description & Highlights"), {
            "classes": ["tab"],
            "fields": [
                "highlights",
                "points_of_interest",
            ],
        }),
        (_("Trail Details"), {
            "classes": ["tab"],
            "fields": [
                "steepness_level",
                "trail_considerations",
                "rewritten_trail_considerations",
            ],
        }),
        (_("Categories & Features"), {
            "classes": ["tab"],
            "fields": [
                "related_categories",
                ("has_pub", "has_cafe"),
                ("has_bus_access", "has_stiles"),
                "pubs_list",
            ],
            "description": _("Choose categories and features that apply to this walk"),
        }),
        (_("Equipment"), {
            "classes": ["tab"],
            "fields": [
                "footwear_category",
                "recommended_footwear",
            ],
        }),
        (_("Meta"), {
            "classes": ["tab"],
            "fields": [
                ("created_at", "updated_at"),
            ],
        }),
    )

    @admin.display(description=_("Categories"))
    def get_related_categories(self, obj):
        return str(obj.related_categories)

    class Media:
        css = {
            "all": [
                "https://cdn.jsdelivr.net/npm/ol@v10.3.0/ol.css",
                "walkquest_admin/css/widgets.css",
                "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
                "css/admin-custom.css",
            ],
        }
        js = [
            "https://cdn.jsdelivr.net/npm/ol@v10.3.0/dist/ol.js",
            "walkquest_admin/js/map_styling.js",
        ]

    def get_form(self, request, obj=None, **kwargs):
        return super().get_form(request, obj, **kwargs)

    @admin.display(description="Amenities")
    def amenities_summary(self, obj):
        amenities = []
        if obj.has_pub:
            amenities.append(format_html('<span class="amenity-icon pub">🍺</span>'))
        if obj.has_cafe:
            amenities.append(format_html('<span class="amenity-icon cafe">☕</span>'))
        if obj.has_bus_access:
            amenities.append(format_html('<span class="amenity-icon bus">🚌</span>'))
        if obj.has_stiles:
            amenities.append(format_html('<span class="amenity-icon stile">🚧</span>'))
        return format_html('<div class="amenities-container">{}</div>',
                         format_html("".join(amenities)) if amenities else "None")

class WalkCategoryTagAdmin(TagModelAdmin):
    list_display = ["name", "count", "protected"]
    list_filter = ["protected"]
    exclude = ["count"]
    actions = ["merge_tags"]

# Register models with Tagulous - only register each model once
tagulous.admin.register(WalkCategoryTag, WalkCategoryTagAdmin)
tagulous.admin.register(Adventure, AdventureAdmin)
tagulous.admin.register(Walk, WalkAdmin)
