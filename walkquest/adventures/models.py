from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator
from django.utils import timezone
import uuid


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

    STATUS_CHOICES = [
        ("IN_PROGRESS", _("In Progress")),
        ("COMPLETED", _("Completed")),
        ("ABANDONED", _("Abandoned")),
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
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=STATUS_CHOICES,
        default="IN_PROGRESS"
    )

    def is_personal_best(self):
        return self.best_time == self.user.achievements.filter(
            adventure=self.adventure
        ).aggregate(min_time=models.Min('best_time'))['min_time']
    
    @property
    def duration(self):
        return self.completion_time - self.best_time if self.completion_time and self.best_time else None

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


start_date = models.DateField(
    _("Start Date"),
    help_text=_("When the walk begins"),
    validators=[MinValueValidator(timezone.now().date())]
)
