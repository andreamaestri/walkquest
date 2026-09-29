from datetime import timedelta

import pytest
from django.utils import timezone

from walkquest.adventures.models import Achievement
from walkquest.users.tests.factories import UserFactory
from walkquest.walks.models import Adventure
from walkquest.walks.models import Companion
from walkquest.walks.models import WalkCategoryTag
from walkquest.walks.tests.factories import make_walk

pytestmark = pytest.mark.django_db

LOG = "/api/adventures/log"
TODAY = timezone.localdate()


@pytest.fixture
def walk():
    return make_walk()


@pytest.fixture
def signed_in(client, user):
    client.force_login(user)
    return client


def post(client, body):
    return client.post(LOG, body, content_type="application/json")


def counts():
    return Adventure.objects.count(), Achievement.objects.count()


def test_anonymous_cannot_log(client, walk):
    response = post(client, {"walk_id": str(walk.id), "start_date": str(TODAY)})
    assert response.status_code == 401
    assert counts() == (0, 0)


def test_logging_needs_only_a_walk_and_a_day(signed_in, user, walk):
    tag = WalkCategoryTag.objects.create(name="Coastal walks", slug="coastal-walks")
    walk.categories.add(tag)

    response = post(signed_in, {"walk_id": str(walk.id), "start_date": str(TODAY)})

    assert response.status_code == 201
    body = response.json()
    assert body["title"] == walk.walk_name  # defaulted from the walk
    assert body["difficulty_level"] == "WARDEN'S ASCENT"  # from the walk's steepness
    assert body["categories"] == ["coastal-walks"]  # from the walk
    assert body["end_date"] == str(TODAY)
    assert body["is_public"] is False  # private unless the user says otherwise
    assert body["walk"] == {
        "id": str(walk.id),
        "slug": walk.walk_id,
        "name": walk.walk_name,
    }
    achievement = Achievement.objects.get(user=user)
    assert achievement.status == "COMPLETED"
    assert achievement.visibility == "PRIVATE"


def test_a_log_does_not_touch_the_catalogue_row_of_the_walk(signed_in, walk):
    catalogue = Adventure.objects.create(
        title="Catalogue",
        description="",
        start_date=TODAY,
        end_date=TODAY,
        difficulty_level="TRAIL RANGER",
    )
    walk.adventure = catalogue
    walk.save()

    assert (
        post(signed_in, {"walk_id": str(walk.id), "start_date": str(TODAY)}).status_code
        == 201
    )

    walk.refresh_from_db()
    assert walk.adventure_id == catalogue.id
    assert Adventure.objects.filter(walk=walk).count() == 1  # only the log


def test_deleting_an_adventure_never_deletes_its_walk(walk):
    catalogue = Adventure.objects.create(
        title="Catalogue",
        description="",
        start_date=TODAY,
        end_date=TODAY,
        difficulty_level="TRAIL RANGER",
    )
    walk.adventure = catalogue
    walk.save()

    catalogue.delete()

    walk.refresh_from_db()
    assert walk.adventure_id is None


def test_unknown_walk_creates_nothing(signed_in):
    response = post(
        signed_in,
        {"walk_id": "7c5c2b52-4a55-4b39-a4f9-7f53b8c1a111", "start_date": str(TODAY)},
    )
    assert response.status_code == 404
    assert counts() == (0, 0)


def test_the_same_walk_on_the_same_day_is_logged_once(signed_in, walk):
    body = {"walk_id": str(walk.id), "start_date": str(TODAY)}
    assert post(signed_in, body).status_code == 201
    assert post(signed_in, body).status_code == 409
    assert counts() == (1, 1)
    # A different day is a different walk.
    yesterday = str(TODAY - timedelta(days=1))
    assert post(signed_in, {**body, "start_date": yesterday}).status_code == 201


@pytest.mark.parametrize(
    "extra",
    [
        {"start_date": str(TODAY + timedelta(days=5))},  # hasn't happened yet
        {"end_date": str(TODAY - timedelta(days=2))},  # ends before it starts
        {"start_time": "10:00", "end_time": "09:00"},  # finishes before it starts
        {"difficulty_level": "EASY PEASY"},
    ],
)
def test_bad_input_is_rejected_and_creates_nothing(signed_in, walk, extra):
    body = {"walk_id": str(walk.id), "start_date": str(TODAY), **extra}
    response = post(signed_in, body)
    assert response.status_code == 422
    assert response.json()["message"]
    assert counts() == (0, 0)


def test_times_are_optional_and_can_be_given_separately(signed_in, walk):
    response = post(
        signed_in,
        {"walk_id": str(walk.id), "start_date": str(TODAY), "start_time": "09:30"},
    )
    assert response.status_code == 201
    assert response.json()["start_time"] == "09:30:00"
    assert response.json()["end_time"] is None


def test_only_your_own_companions_are_added(signed_in, user, walk):
    mine = Companion.objects.create(user=user, name="Sam")
    theirs = Companion.objects.create(user=UserFactory(), name="Not mine")

    response = post(
        signed_in,
        {
            "walk_id": str(walk.id),
            "start_date": str(TODAY),
            "companion_ids": [str(mine.id), str(theirs.id)],
        },
    )

    assert response.status_code == 201
    assert [c["name"] for c in response.json()["companions"]] == ["Sam"]


def test_list_shows_only_my_logs_newest_walk_first(client, user, walk):
    other_walk = make_walk("other_walk")
    client.force_login(user)
    old = str(TODAY - timedelta(days=9))
    post(client, {"walk_id": str(walk.id), "start_date": old})
    post(client, {"walk_id": str(other_walk.id), "start_date": str(TODAY)})
    client.force_login(UserFactory())
    post(client, {"walk_id": str(walk.id), "start_date": str(TODAY)})

    client.force_login(user)
    logs = client.get("/api/adventures/").json()

    assert [log["start_date"] for log in logs] == [str(TODAY), old]
    assert logs[0]["walk"]["slug"] == "other_walk"


def test_other_users_cannot_edit_or_delete_my_log(client, user, walk):
    client.force_login(user)
    log_id = post(client, {"walk_id": str(walk.id), "start_date": str(TODAY)}).json()[
        "id"
    ]

    client.force_login(UserFactory())
    assert client.delete(f"/api/adventures/{log_id}").status_code == 404
    assert (
        client.patch(
            f"/api/adventures/{log_id}",
            {"title": "Hijacked"},
            content_type="application/json",
        ).status_code
        == 404
    )
    assert Adventure.objects.get(id=log_id).title == walk.walk_name


def test_edit_changes_only_what_is_sent(signed_in, walk):
    log_id = post(
        signed_in,
        {"walk_id": str(walk.id), "start_date": str(TODAY)},
    ).json()["id"]
    earlier = str(TODAY - timedelta(days=3))

    response = signed_in.patch(
        f"/api/adventures/{log_id}",
        {"description": "  Windy.  ", "start_date": earlier},
        content_type="application/json",
    )

    assert response.status_code == 200
    body = response.json()
    assert body["description"] == "Windy."
    assert body["start_date"] == earlier
    assert body["end_date"] == earlier  # a single-day log moves as a whole
    assert body["title"] == walk.walk_name


def test_making_a_log_public_updates_its_visibility(signed_in, user, walk):
    log_id = post(
        signed_in,
        {"walk_id": str(walk.id), "start_date": str(TODAY)},
    ).json()["id"]
    signed_in.patch(
        f"/api/adventures/{log_id}",
        {"is_public": True},
        content_type="application/json",
    )
    assert Achievement.objects.get(user=user).visibility == "PUBLIC"


def test_deleting_a_log_keeps_the_walk(signed_in, walk):
    log_id = post(
        signed_in,
        {"walk_id": str(walk.id), "start_date": str(TODAY)},
    ).json()["id"]

    assert signed_in.delete(f"/api/adventures/{log_id}").status_code == 204

    assert counts() == (0, 0)
    walk.refresh_from_db()  # still there


def test_adding_a_companion_twice_selects_the_same_person(signed_in):
    first = signed_in.post(
        "/api/adventures/companions/",
        {"name": "Sam"},
        content_type="application/json",
    )
    again = signed_in.post(
        "/api/adventures/companions/",
        {"name": " sam "},
        content_type="application/json",
    )
    assert first.json()["id"] == again.json()["id"]
    assert Companion.objects.count() == 1


def test_a_companion_needs_a_name(signed_in):
    response = signed_in.post(
        "/api/adventures/companions/",
        {"name": "   "},
        content_type="application/json",
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    "extra",
    [
        {"title": "x" * 256},
        {"description": "x" * 501},
        {"companion_ids": ["7c5c2b52-4a55-4b39-a4f9-7f53b8c1a111"] * 51},
    ],
)
def test_oversized_input_is_rejected_before_it_reaches_the_database(
    signed_in,
    walk,
    extra,
):
    body = {"walk_id": str(walk.id), "start_date": str(TODAY), **extra}
    assert post(signed_in, body).status_code == 422
    assert counts() == (0, 0)


def test_an_overlong_companion_name_is_rejected(signed_in):
    response = signed_in.post(
        "/api/adventures/companions/",
        {"name": "x" * 101},
        content_type="application/json",
    )
    assert response.status_code == 422
    assert Companion.objects.count() == 0
