from tinymce.widgets import TinyMCE
from unfold.contrib.forms import UnfoldFormMixin
from unfold.forms import ModelForm

from walkquest.utils.widgets import CustomOSMWidget

from .models import Adventure
from .models import Walk


class AdventureForm(UnfoldFormMixin, ModelForm):
    class Meta:
        model = Adventure
        fields = "__all__"
        widgets = {
            "description": TinyMCE(attrs={
                "class": "unfold-block w-full",  # Add Unfold classes
                "cols": 80,
                "rows": 30,
            }),
        }

class WalkForm(UnfoldFormMixin, ModelForm):
    class Meta:
        model = Walk
        fields = "__all__"
        widgets = {
            "geom": CustomOSMWidget(),
            "highlights": TinyMCE(attrs={"class": "unfold-block w-full", "cols": 80, "rows": 20}),
            "points_of_interest": TinyMCE(attrs={"class": "unfold-block w-full", "cols": 80, "rows": 20}),
            "trail_considerations": TinyMCE(attrs={"class": "unfold-block w-full", "cols": 80, "rows": 20}),
            "rewritten_trail_considerations": TinyMCE(attrs={"class": "unfold-block w-full", "cols": 80, "rows": 20}),
        }
