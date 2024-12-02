import uuid
from uuid import uuid4
from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.postgres.fields import ArrayField


class Adventure(models.Model):
    DIFFICULTY_CHOICES = [
        ('NOVICE WANDERER', 'Novice Wanderer'),
        ("GREY'S PATHFINDER", "Grey's Pathfinder"),
        ('TRAIL RANGER', 'Trail Ranger'), 
        ("WARDEN'S ASCENT", "Warden's Ascent"),
        ('MASTER WAYFARER', 'Master Wayfarer')
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True
    )
    title = models.CharField(
        _("Title"), max_length=255, help_text=_("Name of your epic quest")
    )
    description = models.TextField(
        _("Description"), 
        help_text=_("Chronicle your adventure's tale")
    )
    start_date = models.DateField(_("Start Date"), help_text=_("When the walk begins"))
    end_date = models.DateField(_("End Date"), help_text=_("When the walk concludes"))
    difficulty_level = models.CharField(
        _("Difficulty"),
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        help_text=_("Choose your challenge level"),
        db_index=True,
    )
    created_at = models.DateTimeField(_("Created"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated"), auto_now=True)

    class Meta:
        verbose_name = _("adventure")
        verbose_name_plural = _("adventures")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["difficulty_level"]),
            models.Index(fields=["start_date", "end_date"]),
        ]
        permissions = [
            ("can_create_featured_adventure", "Can create featured adventure"),
        ]

    def __str__(self):
        return self.title


class Walk(models.Model):
    FOOTWEAR_CHOICES = [
        ('Walking Boots', 'Walking Boots'),
        ('Walking Shoes / Wellies', 'Walking Shoes / Wellies'),
        ('Waterproof Boots', 'Waterproof Boots')
    ]

    DIFFICULTY_CHOICES = [
        ('NOVICE WANDERER', 'Novice Wanderer'),
        ("GREY'S PATHFINDER", "Grey's Pathfinder"),
        ('TRAIL RANGER', 'Trail Ranger'),
        ("WARDEN'S ASCENT", "Warden's Ascent"),
        ('MASTER WAYFARER', 'Master Wayfarer')
    ]

    WALK_CATEGORIES = [
        ('circular', 'Circular walks'),
        ('coastal', 'Coastal walks'),
        ('pub', 'Pub walks'),
        ('beach', 'Walks with a beach'),
        ('cafe', 'Walks with a café'),
        ('fishing', 'Walks with a fishing village'),
        ('lighthouse', 'Walks with a lighthouse or daymark'),
        ('shipwreck', 'Walks with a shipwreck'),
    ]

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_index=True
    )
    adventure = models.ForeignKey(
        Adventure,
        on_delete=models.CASCADE,
        related_name="walks",
        to_field='id',
        db_index=True,
        null=True,  # Allow null values for existing records
        blank=True
    )
    walk_id = models.SlugField(
        max_length=255,
        unique=True,
        help_text="URL-friendly name (e.g. 'caradon-hill-to-trethevy-quoit')"
    )
    walk_name = models.CharField(
        max_length=255,
        db_index=True,
        default="Unnamed Walk"
    )
    latitude = models.FloatField(
        _("Latitude"),
        help_text=_("Latitude coordinate of the walk location"),
        default=50.259291  # Truro's latitude
    )
    longitude = models.FloatField(
        _("Longitude"), 
        help_text=_("Longitude coordinate of the walk location"),
        default=-5.051355  # Truro's longitude
    )
    highlights = models.TextField(
        _("Highlights"),
        help_text=_("Key features and points of interest along the walk"),
        default=_("Details about this walk's highlights to be added."),
        blank=False,  
    )
    points_of_interest = models.TextField(blank=True)
    route_geometry = models.GeometryField(
        srid=4326,
        help_text=_("Geographic route of the walk")
    )
    os_explorer_reference = models.CharField(
        _("OS Explorer Map"),
        max_length=255,
        blank=True,
        null=True,
        help_text=_("Ordnance Survey Explorer map reference")
    )
    distance = models.FloatField(
        default=0.0,
        help_text="Distance of the walk in kilometers."
    )
    steepness_level = models.CharField(
        _("Steepness Level"),
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        default="NOVICE",
        help_text=_("Difficulty level based on steepness"),
        db_index=True
    )
    footwear_category = models.CharField(
        _("Footwear Category"),
        max_length=50,
        choices=FOOTWEAR_CHOICES,
        default="WALKING_BOOTS",
        help_text=_("Recommended footwear for this walk"),
        db_index=True
    )
    recommended_footwear = models.TextField(
        _("Recommended Footwear"),
        help_text=_("Detailed footwear recommendations for this walk"),
        default=_("Sturdy walking boots recommended for most conditions"),
        blank=True
    )
    has_pub = models.BooleanField(default=False)
    pubs_list = models.JSONField(default=list, blank=True)
    trail_considerations = models.TextField(
        default="No trail considerations provided.",
        help_text="Considerations for the trail."
    )
    rewritten_trail_considerations = models.TextField(
        _("Mystical Trail Notes"),
        help_text=_("Trail considerations rewritten in mystical style"),
        default=_(
            "Adventurer's Notes:\n"
            "- Path suitable for most wanderers\n"
            "- Consult local wisdom for seasonal conditions\n"
            "- Carry provisions as befits your journey"
        ),
        blank=True
    )
    related_categories = ArrayField(
        models.CharField(max_length=50, choices=WALK_CATEGORIES),
        blank=True,
        default=list,
        help_text=_("Select all categories that apply to this walk")
    )
    has_stiles = models.BooleanField(default=False)
    has_cafe = models.BooleanField(default=False)
    has_bus_access = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("walk")
        verbose_name_plural = _("walks")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=['walk_id']),
            models.Index(fields=['walk_name']),
            models.Index(fields=['distance']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.walk_name

    def get_distance(self, in_miles=False):
        return self.distance_miles if in_miles else self.distance_km

    def get_steepness(self):
        return self.adventure.difficulty_level
