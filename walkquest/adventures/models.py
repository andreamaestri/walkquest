from django.conf import settings
from django.db import models, transaction
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

class Achievement(models.Model):
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
    )
    adventure = models.ForeignKey("walks.Adventure", on_delete=models.CASCADE)
    conquered_date = models.DateTimeField(_("Conquered Date"), default=timezone.now)
    attempts = models.PositiveIntegerField(_("Attempts"), default=0)
    best_time = models.FloatField(_("Best Time"), null=True, blank=True)
    completion_time = models.FloatField(_("Completion Time"), null=True, blank=True)
    visibility = models.CharField(
        _("Visibility"),
        max_length=10,
        choices=VISIBILITY_CHOICES,
        default="PUBLIC",
    )
    status = models.CharField(
        _("Status"),
        max_length=20,
        choices=STATUS_CHOICES,
        default="IN_PROGRESS",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_personal_best(self):
        if not self.best_time:
            return False
        min_time = self.user.achievements.filter(
            adventure=self.adventure,
        ).exclude(
            id=self.id
        ).aggregate(
            min_time=models.Min("best_time")
        )["min_time"]
        return not min_time or self.best_time <= min_time

    @property
    def duration(self):
        if self.completion_time and self.best_time:
            return self.completion_time - self.best_time
        return None

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
                name="unique_user_adventure",
            ),
        ]
