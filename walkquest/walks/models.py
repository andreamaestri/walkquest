import uuid
from django.contrib.auth import get_user_model
from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _
from tagulous.models import TagField, TagModel

class WalkCategoryTag(TagModel):
    class TagMeta:
        # TagModel specific configuration
        force_lowercase = True
        space_delimiter = False

    class Meta:
        app_label = "walks"
        constraints = [
            models.UniqueConstraint(fields=["slug"], name="unique_category_slug"),
        ]

    def __str__(self):
        return self.name

    def to_dict(self):
        return {
            'name': self.name,
            'slug': self.slug
        }

class WalkFeatureTag(TagModel):
    class TagMeta:
        force_lowercase = True
        space_delimiter = False
        initial = [
            "cafe",
            "coastal",
            "historic",
            "pub",
            "wildlife",
            "woodland",
        ]
        autocomplete_view = "walks:feature-autocomplete"
        protect_initial = True
        case_sensitive = False

    class Meta:
        app_label = "walks"
        verbose_name = _("Walk Feature")
        verbose_name_plural = _("Walk Features")
        constraints = [
            models.UniqueConstraint(fields=["slug"], name="unique_feature_slug"),
        ]

    def __str__(self):
        return self.name

    def to_dict(self):
        return {
            'name': self.name,
            'slug': self.slug
        }

class Companion(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True,
    )
    user = models.ForeignKey(
        get_user_model(),
        on_delete=models.CASCADE,
        related_name='companions',
    )
    name = models.CharField(
        _("Name"),
        max_length=100,
        help_text=_("Name of your walking companion")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = _('companion')
        verbose_name_plural = _('companions')
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.name

class Adventure(models.Model):
    DIFFICULTY_CHOICES = [
        ("NOVICE WANDERER", _("Novice Wanderer - Beginner")),
        ("GREY'S PATHFINDER", _("Grey's Pathfinder - Beginner to Moderate")),
        ("TRAIL RANGER", _("Trail Ranger - Moderate")),
        ("WARDEN'S ASCENT", _("Warden's Ascent - Moderate to Challenging")),
        ("MASTER WAYFARER", _("Master Wayfarer - Challenging")),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True,
    )
    title = models.CharField(
        _("Title"), 
        max_length=255, 
        help_text=_("Name of your epic quest"),
    )
    description = models.TextField(
        _("Description"),
        help_text=_("Chronicle your adventure's tale"),
    )
    start_date = models.DateField(
        _("Start Date"), 
        help_text=_("When the walk begins")
    )
    end_date = models.DateField(
        _("End Date"), 
        help_text=_("When the walk concludes")
    )
    start_time = models.TimeField(
        _("Start Time"),
        help_text=_("When the walk begins"),
        null=True,
        blank=True,
    )
    end_time = models.TimeField(
        _("End Time"),
        help_text=_("When the walk concludes"),
        null=True,
        blank=True,
    )
    difficulty_level = models.CharField(
        _("Difficulty"),
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        help_text=_("Choose your challenge level"),
        db_index=True,
    )
    companions = models.ManyToManyField(
        'Companion',
        related_name='adventures',
        blank=True,
        help_text=_("Companions that joined this adventure")
    )
    related_categories = TagField(
        to=WalkCategoryTag,
        blank=True,
        help_text=_("Categories related to this adventure"),
    )
    created_at = models.DateTimeField(_("Created"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated"), auto_now=True)

    class Meta:
        app_label = "walks"
        verbose_name = _("adventure")
        verbose_name_plural = _("adventures")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["difficulty_level"], name="walks_adv_diff_lvl_idx"),
            models.Index(fields=["start_date", "end_date"], name="walks_adv_start_end_idx"),
        ]
        permissions = [
            ("can_create_featured_adventure", "Can create featured adventure"),
        ]

    def __str__(self):
        return self.title

    @property
    def duration(self):
        if self.start_time and self.end_time:
            from datetime import datetime, timedelta
            today = datetime.today()
            start = datetime.combine(today, self.start_time)
            end = datetime.combine(today, self.end_time)
            return end - start
        return None

class Walk(models.Model):
    FOOTWEAR_CHOICES = [
        ("Walking Boots", "Walking Boots"),
        ("Walking Shoes / Wellies", "Walking Shoes / Wellies"),
        ("Waterproof Boots", "Waterproof Boots"),
    ]

    DIFFICULTY_CHOICES = [
        ("NOVICE WANDERER", _("Novice Wanderer - Beginner")),
        ("GREY'S PATHFINDER", _("Grey's Pathfinder - Beginner to Moderate")),
        ("TRAIL RANGER", _("Trail Ranger - Moderate")),
        ("WARDEN'S ASCENT", _("Warden's Ascent - Moderate to Challenging")),
        ("MASTER WAYFARER", _("Master Wayfarer - Challenging")),
    ]

    WALK_CATEGORIES = [
        ("circular", "Circular walks"),
        ("coastal", "Coastal walks"),
        ("pub", "Pub walks"),
        ("beach", "Walks with a beach"),
        ("cafe", "Walks with a café"),
        ("fishing", "Walks with a fishing village"),
        ("lighthouse", "Walks with a lighthouse or daymark"),
        ("shipwreck", "Walks with a shipwreck"),
    ]

    FEATURE_CHOICES = [
        ("cafe", "Café"),
        ("coastal", "Coastal Path"),
        ("historic", "Historic Site"),
        ("pub", "Pub"),
        ("wildlife", "Wildlife"),
        ("woodland", "Woodland"),
    ]

    id = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False, db_index=True,
    )
    adventure = models.ForeignKey(
        Adventure,
        on_delete=models.CASCADE,
        related_name="walks",
        to_field="id",
        db_index=True,
        null=True,  # Allow null values for existing records
        blank=True,
    )
    walk_id = models.SlugField(
        max_length=255,
        unique=True,
        help_text="URL-friendly name (e.g. 'caradon-hill-to-trethevy-quoit')",
    )
    walk_name = models.CharField(
        max_length=255,
        db_index=True,
        default="Unnamed Walk",
    )
    latitude = models.FloatField(
        _("Latitude"),
        help_text=_("Latitude coordinate of the walk location"),
        default=50.259291,  # Truro's latitude
    )
    longitude = models.FloatField(
        _("Longitude"),
        help_text=_("Longitude coordinate of the walk location"),
        default=-5.051355,  # Truro's longitude
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
        help_text=_("Geographic route of the walk"),
    )
    os_explorer_reference = models.CharField(
        _("OS Explorer Map"),
        max_length=255,
        blank=True,
        null=True,
        help_text=_("Ordnance Survey Explorer map reference"),
    )
    distance = models.FloatField(
        default=0.0,
        help_text="Distance of the walk in kilometers.",
    )
    steepness_level = models.CharField(
        _("Steepness Level"),
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        default="NOVICE",
        help_text=_("Difficulty level based on steepness"),
        db_index=True,
    )
    footwear_category = models.CharField(
        _("Footwear Category"),
        max_length=50,
        choices=FOOTWEAR_CHOICES,
        default="WALKING_BOOTS",
        help_text=_("Recommended footwear for this walk"),
        db_index=True,
    )
    recommended_footwear = models.TextField(
        _("Recommended Footwear"),
        help_text=_("Detailed footwear recommendations for this walk"),
        default=_("Sturdy walking boots recommended for most conditions"),
        blank=True,
    )
    has_pub = models.BooleanField(default=False)
    pubs_list = models.JSONField(default=list, blank=True)
    trail_considerations = models.TextField(
        default="No trail considerations provided.",
        help_text="Considerations for the trail.",
    )
    rewritten_trail_considerations = models.TextField(
        _("Mystical Trail Notes"),
        help_text=_("Trail considerations rewritten in mystical style"),
        default=_(
            "Adventurer's Notes:\n"
            "- Path suitable for most wanderers\n"
            "- Consult local wisdom for seasonal conditions\n"
            "- Carry provisions as befits your journey",
        ),
        blank=True,
    )
    related_categories = models.ManyToManyField(
        'WalkCategoryTag',
        related_name='related_walks',
        blank=True,
        help_text=_("Categories associated with this walk")
    )
    features = models.ManyToManyField(
        'WalkFeatureTag',
        related_name='walks',
        blank=True,
        help_text=_("Features present on this walk")
    )
    categories = models.ManyToManyField(
        'WalkCategoryTag',
        related_name='categorized_walks',
        blank=True,
        help_text=_("Primary categories for this walk")
    )
    favorites = models.ManyToManyField(
        get_user_model(),
        related_name='favorite_walks',
        blank=True,
        help_text=_("Users who have favorited this walk")
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
            models.Index(fields=["walk_id"], name="walks_walk_walk_id_idx"),
            models.Index(fields=["walk_name"], name="walks_walk_walk_name_idx"),
            models.Index(fields=["distance"], name="walks_walk_distance_idx"),
            models.Index(fields=["created_at"], name="walks_walk_created_at_idx"),
        ]

    def __str__(self):
        return self.walk_name

    def get_distance(self, in_miles=False):
        return self.distance_miles if in_miles else self.distance_km

    def get_steepness(self):
        return self.adventure.difficulty_level

    def save(self, *args, **kwargs):
        # Update boolean fields based on categories instead of features
        if self.related_categories:
            self.has_pub = "pub" in self.related_categories.get_tag_list()
            self.has_cafe = "cafe" in self.related_categories.get_tag_list()
        if not self.title:
            self.title = self.walk_name
        if not self.description:
            self.description = "This historic walking route is waiting for its story to be told."
        super().save(*args, **kwargs)

    def is_favorite_of(self, user) -> bool:
        """Check if walk is favorited by given user"""
        if not user or not user.is_authenticated:
            return False
        return self.favorites.filter(id=user.id).exists()

    @property
    def title(self):
        return self.walk_name

    @property
    def description(self):
        return self.highlights

    def get_features(self):
        return [feature.to_dict() for feature in self.features.all()]

    def get_categories(self):
        return [category.to_dict() for category in self.categories.all()]

class WalkFavorite(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    walk = models.ForeignKey(Walk, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'walk')
        indexes = [
            models.Index(fields=['user', 'walk']),
            models.Index(fields=['created_at']),
        ]
