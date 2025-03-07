from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import CharField
from django.db.models import DateTimeField
from django.db.models import PositiveIntegerField
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import JSONField


class User(AbstractUser):
    """
    Default custom user model for walkquest.
    If adding fields that need to be filled at user signup,
    check forms.SignupForm and forms.SocialSignupForms accordingly.
    """

    # First and last name do not cover name patterns around the globe
    name = CharField(_("Name of User"), blank=True, max_length=255, db_index=True)
    first_name = None  # type: ignore[assignment]
    last_name = None  # type: ignore[assignment]
    experience_points = PositiveIntegerField(
        _("Experience Points"), default=0, db_index=True,
    )
    quests_completed = PositiveIntegerField(_("Completed Quests"), default=0)
    last_active = DateTimeField(_("Last Active"), auto_now=True)
    preferences = JSONField(
        default=dict,
        encoder=DjangoJSONEncoder,
        blank=True,
        help_text="User preferences stored as JSON"
    )

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")
        ordering = ["-date_joined"]
        indexes = [
            models.Index(fields=["username"]),
            models.Index(fields=["experience_points"]),  # Changed from 'xp'
        ]

    def get_absolute_url(self) -> str:
        """Get URL for user's detail view.

        Returns:
            str: URL for user detail.

        """
        return reverse("users:detail", kwargs={"username": self.username})
