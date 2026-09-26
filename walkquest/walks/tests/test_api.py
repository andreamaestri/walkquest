import pytest
from django.core.cache import cache

from walkquest.walks.difficulty import normalize_difficulty
from walkquest.walks.models import WalkPhoto

from .factories import make_walk

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()


@pytest.mark.parametrize(
    ("raw", "level"),
    [
        (" Warden’s Ascent", 4),
        ("Grey's Pathfinder", 2),
        ("MASTER WAYFARER", 5),
        ("novice", 1),
        (None, 1),
    ],
)
def test_normalize_difficulty(raw, level):
    assert normalize_difficulty(raw)["level"] == level


def test_list_returns_compact_summaries(client):
    walk = make_walk()
    WalkPhoto.objects.create(
        walk=walk, source_url="https://example.com/main.webp", is_main=True, width=960, height=640
    )
    response = client.get("/api/walks")
    assert response.status_code == 200
    [item] = response.json()
    assert item["walk_id"] == walk.walk_id
    assert item["difficulty"] == {
        "key": "WARDEN'S ASCENT",
        "level": 4,
        "label": "Warden's Ascent",
        "short": "Challenging",
    }
    assert item["points_of_interest"] == ["Blisland Church", "Lavethan Wood"]
    assert item["thumb"]["url"] == "https://example.com/main.webp"
    # Heavy/per-user fields are not part of the list payload.
    for field in ("route_geometry", "trail_considerations", "is_favorite", "pubs_list"):
        assert field not in item


def test_list_supports_etag_revalidation(client):
    make_walk()
    first = client.get("/api/walks")
    etag = first["ETag"]
    assert "public" in first["Cache-Control"]
    second = client.get("/api/walks", HTTP_IF_NONE_MATCH=etag)
    assert second.status_code == 304
    weak = client.get("/api/walks", HTTP_IF_NONE_MATCH=f"W/{etag}")
    assert weak.status_code == 304


def test_list_etag_changes_when_data_changes(client):
    walk = make_walk()
    etag = client.get("/api/walks")["ETag"]
    WalkPhoto.objects.create(walk=walk, source_url="https://example.com/new.webp", is_main=True)
    response = client.get("/api/walks", HTTP_IF_NONE_MATCH=etag)
    assert response.status_code == 200
    assert response.json()[0]["thumb"]["url"] == "https://example.com/new.webp"


def test_list_filters_still_work(client):
    make_walk(walk_id="coast_path")
    make_walk(walk_id="moor_loop")
    data = client.get("/api/walks", {"search": "coast"}).json()
    assert [w["walk_id"] for w in data] == ["coast_path"]


def test_favorites_endpoint(client, user):
    walk = make_walk()
    assert client.get("/api/walks/favorites").json() == {"ids": []}
    walk.favorites.add(user)
    client.force_login(user)
    assert client.get("/api/walks/favorites").json() == {"ids": [str(walk.id)]}


def test_detail_includes_photos_in_order(client):
    walk = make_walk(photo_source_url="https://www.iwalkcornwall.co.uk/walk/test_walk")
    WalkPhoto.objects.create(walk=walk, source_url="https://e.com/2.webp", position=2, caption="Second")
    WalkPhoto.objects.create(walk=walk, source_url="https://e.com/1.webp", position=1, caption="First")
    WalkPhoto.objects.create(walk=walk, source_url="https://e.com/main.webp", is_main=True)
    data = client.get(f"/api/walks/{walk.walk_id}").json()
    assert [p["url"] for p in data["photos"]] == [
        "https://e.com/main.webp",
        "https://e.com/1.webp",
        "https://e.com/2.webp",
    ]
    assert data["photos"][1]["caption"] == "First"
    assert data["photo_credit"] == "iWalk Cornwall"
    assert data["photo_source_url"].endswith("/walk/test_walk")
    assert data["difficulty"]["level"] == 4


def test_detail_404(client):
    assert client.get("/api/walks/does_not_exist").status_code == 404


def test_geometry_is_cached_geojson(client):
    walk = make_walk()
    response = client.get(f"/api/walks/{walk.id}/geometry")
    assert response.status_code == 200
    assert response.json()["geometry"]["type"] == "LineString"
    assert "max-age" in response["Cache-Control"]
