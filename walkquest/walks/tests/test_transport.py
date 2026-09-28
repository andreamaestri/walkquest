from unittest import mock

import pytest
from django.contrib.gis.geos import LineString
from django.core.management import call_command

from walkquest.walks import transport
from walkquest.walks.models import Walk

from .factories import make_walk

NAPTAN_CSV = (
    "﻿ATCOCode,CommonName,Indicator,LocalityName,Longitude,Latitude,StopType,Status\n"
    "0800START,Church,opp,Blisland,-4.7001,50.5002,BCT,active\n"
    "0800GONE,Old Stop,,Blisland,-4.7000,50.5000,BCT,inactive\n"
    "0800RAIL,Station,,Blisland,-4.7000,50.5000,RSE,active\n"
    "0800END,Car Park,,Lanhydrock,-4.6000,50.5500,BCT,active\n"
)


def test_parse_naptan_keeps_active_bus_stops_only():
    stops = transport.parse_naptan_csv(NAPTAN_CSV)
    assert [s["atco"] for s in stops] == ["0800START", "0800END"]
    assert stops[0] == {
        "atco": "0800START",
        "name": "Church",
        "indicator": "opp",
        "locality": "Blisland",
        "lat": 50.5002,
        "lon": -4.7001,
    }


def test_circular_walk_gets_one_stop():
    stops = transport.parse_naptan_csv(NAPTAN_CSV)
    info = transport.build_transport_info((50.5, -4.7), (50.5001, -4.7), stops)
    assert info["start_stop"]["atco"] == "0800START"
    assert info["start_stop"]["distance_m"] < 30
    assert info["end_stop"] is None
    assert transport.has_bus_access(info)


def test_linear_walk_gets_end_stop_and_keeps_checked_lines():
    stops = transport.parse_naptan_csv(NAPTAN_CSV)
    previous = {
        "start_stop": {
            "atco": "0800START",
            "lines": [{"line": "11"}],
            "lines_checked_at": "x",
        },
    }
    info = transport.build_transport_info((50.5, -4.7), (50.55, -4.6), stops, previous)
    assert info["end_stop"]["atco"] == "0800END"
    assert info["start_stop"]["lines"] == [{"line": "11"}]
    assert "lines" not in info["end_stop"]


@pytest.mark.parametrize(
    ("stop", "expected"),
    [
        ({"distance_m": 100}, True),  # unchecked: trust NaPTAN
        ({"distance_m": 100, "lines": [{"line": "1"}]}, True),
        ({"distance_m": 100, "lines": []}, False),  # confirmed no service
        ({"distance_m": 2000}, False),  # too far to walk
    ],
)
def test_has_bus_access(stop, expected):
    assert transport.has_bus_access({"start_stop": stop}) is expected


def test_parse_stop_lines_groups_by_line():
    payload = {
        "departures": {
            "11": [
                {
                    "line_name": "11",
                    "operator_name": "Go Cornwall Bus",
                    "direction": "Bodmin",
                },
                {
                    "line_name": "11",
                    "operator_name": "Go Cornwall Bus",
                    "direction": "Padstow",
                },
            ],
            "A5": [{"line": "A5", "operator_name": "Kernow", "direction": "St Ives"}],
        },
    }
    assert transport.parse_stop_lines(payload) == [
        {
            "line": "11",
            "operator": "Go Cornwall Bus",
            "directions": ["Bodmin", "Padstow"],
        },
        {"line": "A5", "operator": "Kernow", "directions": ["St Ives"]},
    ]
    assert transport.parse_stop_lines({"departures": {}}) == []


@pytest.mark.django_db
def test_refresh_bus_stops_uses_route_start_and_preserves_amenities(tmp_path):
    csv_path = tmp_path / "naptan.csv"
    csv_path.write_text(NAPTAN_CSV, encoding="utf-8")
    walk = make_walk(
        # Stored centre point is far from any stop; the route starts at the church.
        latitude=50.6,
        longitude=-4.9,
        route_geometry=LineString(
            (-4.70, 50.50),
            (-4.69, 50.51),
            (-4.70, 50.5001),
            srid=4326,
        ),
    )
    Walk.objects.filter(pk=walk.pk).update(has_pub=True)

    call_command("refresh_bus_stops", from_csv=str(csv_path))

    walk.refresh_from_db()
    assert walk.has_bus_access
    assert walk.has_pub
    assert walk.transport_info["start_stop"]["name"] == "Church"


@pytest.mark.django_db
def test_refresh_bus_routes_needs_credentials(settings):
    settings.TRANSPORTAPI_APP_ID = ""
    with mock.patch.object(transport, "fetch_stop_lines") as fetch:
        call_command("refresh_bus_routes")
    fetch.assert_not_called()


@pytest.mark.django_db
def test_refresh_bus_routes_shares_hits_and_respects_limit(settings):
    settings.TRANSPORTAPI_APP_ID = "id"
    settings.TRANSPORTAPI_APP_KEY = "key"
    stop = {"atco": "S1", "distance_m": 100}
    make_walk(
        "a",
        has_bus_access=True,
        transport_info={"start_stop": dict(stop), "end_stop": None},
    )
    make_walk(
        "b",
        has_bus_access=True,
        transport_info={"start_stop": dict(stop), "end_stop": None},
    )
    make_walk(
        "c",
        has_bus_access=True,
        transport_info={
            "start_stop": {"atco": "S2", "distance_m": 50},
            "end_stop": None,
        },
    )
    make_walk(
        "far",
        transport_info={
            "start_stop": {"atco": "S3", "distance_m": 5000},
            "end_stop": None,
        },
    )

    with mock.patch.object(transport, "fetch_stop_lines", return_value=[]) as fetch:
        call_command("refresh_bus_routes", limit=1)

    fetch.assert_called_once_with("S1", "id", "key")
    a, b, c = (Walk.objects.get(walk_id=w) for w in "abc")
    assert a.transport_info["start_stop"]["lines"] == []
    assert not a.has_bus_access
    assert not b.has_bus_access
    assert c.has_bus_access
    assert "lines" not in c.transport_info["start_stop"]


@pytest.mark.django_db
def test_detail_exposes_transport(client):
    info = {
        "start_stop": {"atco": "S1", "name": "Church", "distance_m": 100},
        "end_stop": None,
    }
    make_walk(transport_info=info)
    assert client.get("/api/walks/test_walk").json()["transport"] == info
