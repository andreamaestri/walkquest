from django.contrib.gis import admin
from django.contrib.gis.forms import OSMWidget
from django.contrib.gis.db import models
from unfold.admin import ModelAdmin
from .models import Adventure, Walk

@admin.register(Adventure)
class AdventureAdmin(ModelAdmin):
    search_fields = ('title', 'description')
    list_display = ('title', 'difficulty_level', 'start_date', 'end_date', 'created_at')
    list_filter = ('difficulty_level', 'start_date', 'created_at')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'start_date'
    ordering = ('-created_at',)

    tabs = [
        ("Adventure Details", {'fields': (
            ('title', 'difficulty_level'),
            'description',
            ('start_date', 'end_date'),
        )}),
        ("Meta", {'fields': (
            ('created_at', 'updated_at'),
        )}),
    ]

@admin.register(Walk)
class WalkAdmin(admin.GISModelAdmin):
    class Media:
        css = {
            'all': ('admin/css/widgets.css',)
        }

    default_lon = -5.051355
    default_lat = 50.259291
    default_zoom = 12
    map_width = '100%'  # Changed to percentage
    map_height = 500
    modifiable = True
    mouse_position = True
    map_template = 'gis/admin/openlayers.html'
    
    # Specific widget configuration for LineString
    formfield_overrides = {
        models.LineStringField: {
            'widget': OSMWidget(
                attrs={
                    'map_width': '100%',
                    'map_height': 500,
                    'default_lat': 50.236764,
                    'default_lon': -5.362113,
                    'default_zoom': 15,
                    'display_raw': True,
                    'class': 'vLargeTextField geometry_map',  # Add CSS classes
                }
            )
        }
    }

    search_fields = ('walk_name', 'walk_id', 'highlights')
    list_display = ('walk_name', 'adventure', 'distance', 'steepness_level', 'amenities_summary')
    list_filter = ('steepness_level', 'footwear_category', 'has_pub', 'has_cafe', 'has_bus_access')
    readonly_fields = ('created_at', 'updated_at')
    raw_id_fields = ('adventure',)

    fieldsets = [
        ('Basic Info', {
            'fields': (
                ('adventure', 'walk_id'),
                'walk_name',
                'highlights',
            )
        }),
        ('Location', {
            'fields': (
                ('latitude', 'longitude'),
                'route_geometry',
                'os_explorer_reference',
            )
        }),
        ('Details', {
            'fields': (
                'distance',
                'steepness_level',
                'trail_considerations',
                'rewritten_trail_considerations',
            )
        }),
        ('Amenities', {
            'fields': (
                ('has_pub', 'has_cafe'),
                ('has_bus_access', 'has_stiles'),
                'pubs_list',
            )
        }),
        ('Equipment', {
            'fields': (
                'footwear_category',
                'recommended_footwear',
            )
        }),
        ('Additional', {
            'fields': (
                'points_of_interest',
                'related_categories',
            )
        }),
    ]

    @admin.display(description="Amenities")
    def amenities_summary(self, obj):
        amenities = []
        if obj.has_pub: amenities.append("🍺")
        if obj.has_cafe: amenities.append("☕")
        if obj.has_bus_access: amenities.append("🚌")
        if obj.has_stiles: amenities.append("🚧")
        return " ".join(amenities) if amenities else "None"
