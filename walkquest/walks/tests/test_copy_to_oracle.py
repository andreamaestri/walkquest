import io

import pytest
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError

from walkquest.walks.models import Walk
from walkquest.walks.models import WalkCategoryTag
from walkquest.walks.models import WalkPhoto

from .factories import make_walk

pytestmark = [
    pytest.mark.skipif(
        "oracle" not in settings.DATABASES,
        reason="set ORACLE_DSN to test the Oracle copy",
    ),
    pytest.mark.django_db(databases=["default", "oracle"], transaction=True),
]


def test_copies_rows_relations_and_geometry(user):
    tag = WalkCategoryTag.objects.create(name="Coastal walks", slug="coastal-walks")
    walk = make_walk(
        photo_source_url="https://www.iwalkcornwall.co.uk/walk/test_walk",
        os_explorer_reference=None,
    )
    walk.categories.add(tag)
    walk.favorites.add(user)
    WalkPhoto.objects.create(
        walk=walk, source_url="https://e.com/1.webp", caption="", is_main=True
    )

    out = io.StringIO()
    call_command("copy_to_oracle", skip_migrate=True, force=True, stdout=out)

    copied = Walk.objects.using("oracle").get(walk_id=walk.walk_id)
    assert "route geometries verified" in out.getvalue()
    assert copied.route_geometry.equals_exact(walk.route_geometry, 1e-9)
    assert list(copied.categories.values_list("slug", flat=True)) == ["coastal-walks"]
    assert copied.favorites.filter(pk=user.pk).exists()
    assert copied.photos.get().caption == ""  # Oracle NULL comes back as ''
    # Oracle stores '' and NULL alike; nullable CharFields read back as ''.
    assert not copied.os_explorer_reference
    assert copied.steepness_level == walk.steepness_level


def test_refuses_non_empty_target_without_force():
    make_walk(walk_id="already_there")
    call_command("copy_to_oracle", skip_migrate=True, force=True, stdout=io.StringIO())
    with pytest.raises(CommandError, match="not empty"):
        call_command("copy_to_oracle", skip_migrate=True, stdout=io.StringIO())
