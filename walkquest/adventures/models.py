from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class TrackingModel(models.Model):
    """Abstract base model with tracking fields"""
    created_at = models.DateTimeField(_("Created"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Updated"), auto_now=True)

    class Meta:
        abstract = True

class Achievement(TrackingModel):
    VISIBILITY_CHOICES = [
        ("PUBLIC", _("Public")),
        ("PRIVATE", _("Private")),
        ("FRIENDS", _("Friends Only")),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="achievements",
        verbose_name=_("User")
    )
    adventure = models.ForeignKey(
        "walks.Adventure",
        on_delete=models.CASCADE,
        related_name="achievements",
        verbose_name=_("Adventure")
    )
    conquered_date = models.DateTimeField(_("Conquered Date"))
    attempts = models.PositiveIntegerField(_("Attempts"), default=0)
    best_time = models.FloatField(_("Best Time"), null=True, blank=True)
    completion_time = models.FloatField(_("Completion Time"), null=True, blank=True)
    visibility = models.CharField(
        _("Visibility"),
        max_length=10,
        choices=VISIBILITY_CHOICES,
        default="PUBLIC"
    )

    class Meta:
        verbose_name = _("achievement")
        verbose_name_plural = _("achievements")
        ordering = ["-conquered_date"]
        indexes = [
            models.Index(fields=["user", "adventure"]),
            models.Index(fields=["conquered_date"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "adventure"],
                name="unique_user_adventure"
            )
        ]
