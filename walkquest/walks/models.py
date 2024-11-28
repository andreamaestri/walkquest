from uuid import uuid4

from django.contrib.gis.db import models
from django.utils.translation import gettext_lazy as _


class Adventure(models.Model):
    DIFFICULTY_CHOICES = [
        ("NOVICE", _("Novice Quest")),
        ("APPRENTICE", _("Apprentice Journey")),
        ("EXPERT", _("Expert Expedition")),
        ("LEGENDARY", _("Legendary Odyssey")),
    ]

    title = models.CharField(
        _("Title"), max_length=200, help_text=_("Name of your epic quest")
    )
    description = models.TextField(
        _("Description"), help_text=_("Chronicle your adventure's tale")
    )
    start_date = models.DateField(_("Start Date"), help_text=_("When your saga begins"))
    end_date = models.DateField(_("End Date"), help_text=_("When your tale concludes"))
    difficulty_level = models.CharField(
        _("Difficulty"),
        max_length=50,
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

    def __str__(self):
        return f"The Quest of {self.title}"


class Walk(models.Model):
    id = models.AutoField(primary_key=True)
    external_id = models.UUIDField(
        default=uuid4,
        editable=False,
        unique=True,
        db_index=True,
        verbose_name=_("External ID"),
    )
    adventure = models.ForeignKey(
        Adventure,
        on_delete=models.CASCADE,
        related_name="walks",
        verbose_name=_("Adventure"),
    )
    path = models.TextField(
        help_text=_("The sacred path of your journey"), verbose_name=_("Path")
    )
    distance = models.FloatField(
        help_text=_("Length of your expedition in leagues (km)"),
        verbose_name=_("Distance"),
        db_index=True,
    )
    elevation_gain = models.FloatField(
        blank=True,
        null=True,
        help_text=_("Height gained during your quest (meters)"),
        verbose_name=_("Elevation Gain"),
    )
    waypoints = models.JSONField(
        blank=True,
        null=True,
        help_text=_("Ancient scroll containing waypoint coordinates"),
        verbose_name=_("Waypoints"),
    )
    created_at = models.DateTimeField(_("Created"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated"), auto_now=True)

    class Meta:
        verbose_name = _("walk")
        verbose_name_plural = _("walks")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["distance"]),
        ]

    def __str__(self):
        return (
            f"Quest Route {self.external_id} - "
            f"{self.adventure.title} - "
            f"{self.distance} leagues"
        )
