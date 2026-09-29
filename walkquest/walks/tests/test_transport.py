import zipfile
from datetime import date
from unittest import mock

import pytest
from django.contrib.gis.geos import LineString
from django.core.management import call_command

from walkquest.walks import transport
from walkquest.walks.models import Walk

from .factories import make_walk

NAPTAN_CSV = (
    "﻿ATCOCode,CommonName,Indicator,LocalityName,Longitude,Latitude,StopType,Status\n"
    "0800NEAR,Church,opp,Blisland,-4.7001,50.5002,BCT,active\n"
    "0800SERVED,Village Green,adj,Blisland,-4.7030,50.5010,BCT,active\n"
    "0800ACROSS,Village Green,opp,Blisland,-4.7031,50.5011,BCT,active\n"
    "0800GONE,Old Stop,,Blisland,-4.7000,50.5000,BCT,inactive\n"
    "0800BODMIN,Mount Folly,,Bodmin,-4.7200,50.4700,BCT,active\n"
)
RAIL_CSV = (
    "ATCOCode,CommonName,Indicator,LocalityName,Longitude,Latitude,StopType,Status\n"
    "9100BODMNPW,Bodmin Parkway Rail Station,,Bodmin,-4.6900,50.4800,RLY,active\n"
)
TODAY = date(2026, 9, 28)  # a Monday


def make_gtfs(path):
    files = {
        "agency.txt": "agency_id,agency_name\nGO,Go Cornwall Bus\n",
        "routes.txt": (
            "route_id,agency_id,route_short_name,route_long_name\nR11,GO,11,\n"
        ),
        "calendar.txt": (
            "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,"
            "start_date,end_date\n"
            "WEEK,1,1,1,1,1,1,0,20260901,20270101\n"
            "OLD,1,1,1,1,1,1,1,20200101,20200601\n"
        ),
        "calendar_dates.txt": "service_id,date,exception_type\nSCHOOL,20261001,1\n",
        "trips.txt": (
            "route_id,service_id,trip_id,trip_headsign\n"
            "R11,WEEK,T1,Bodmin - Mount Folly\n"
            "R11,WEEK,T2,Blisland\n"
            "R11,OLD,T3,x\n"
            "R11,SCHOOL,T4,x\n"
        ),
        "stop_times.txt": (
            "trip_id,stop_id,stop_sequence\n"
            "T1,0800SERVED,1\nT1,0800BODMIN,2\n"
            "T2,0800BODMIN,1\nT2,0800ACROSS,2\n"
            "T3,0800SERVED,1\nT3,0800BODMIN,2\n"
            "T4,0800SERVED,1\nT4,0800BODMIN,2\n"
        ),
        "stops.txt": "stop_id,stop_name\n0800BODMIN,Mount Folly\n",
    }
    with zipfile.ZipFile(path, "w") as zf:
        for name, text in files.items():
            zf.writestr(name, text)
    return path


@pytest.fixture
def stops():
    return transport.parse_naptan_csv(NAPTAN_CSV)


@pytest.fixture
def services(tmp_path, stops):
    places = {s["atco"]: s["locality"] for s in stops}
    with zipfile.ZipFile(make_gtfs(tmp_path / "gtfs.zip")) as zf:
        return transport.gtfs_stop_services(
            zf,
            {s["atco"] for s in stops},
            places,
            TODAY,
        )


def test_parse_naptan_keeps_active_stops_of_type(stops):
    assert [s["atco"] for s in stops] == [
        "0800NEAR", "0800SERVED", "0800ACROSS", "0800BODMIN",
    ]  # fmt: skip
    [station] = transport.parse_naptan_csv(RAIL_CSV, transport.RAIL_STATION_TYPES)
    assert station["name"] == "Bodmin Parkway"


def test_gtfs_services_count_current_trips_and_termini(services):
    assert set(services) == {"0800SERVED", "0800ACROSS", "0800BODMIN"}
    line = services["0800SERVED"][("11", "Go Cornwall Bus")]
    # T1 Mon-Sat plus the school-day-only T4 (Thu 1 Oct); expired T3 ignored.
    assert line["per_day"] == [1, 1, 1, 2, 1, 1, 0]
    assert line["towards"] == {"Bodmin": 2}


def test_pick_bus_stop_skips_unserved_and_merges_across_the_road(stops, services):
    stop = transport.pick_bus_stop((50.5, -4.7), stops, services)
    assert stop["atco"] == "0800SERVED"  # 0800NEAR is closer but has no buses
    [line] = stop["lines"]
    # Merged with 0800ACROSS; trips ending in Blisland itself aren't a direction.
    assert line == {
        "line": "11",
        "operator": "Go Cornwall Bus",
        "directions": ["Bodmin"],
        "days": f"Mon{transport.EN_DASH}Sat",
        "per_day": 3,
    }


def test_pick_bus_stop_without_services_returns_nearest(stops):
    stop = transport.pick_bus_stop((50.5, -4.7), stops, {})
    assert stop["atco"] == "0800NEAR"
    assert stop["lines"] == []


def test_build_info_linear_walk_station_and_carried_services(stops, services):
    stations = transport.parse_naptan_csv(RAIL_CSV, transport.RAIL_STATION_TYPES)
    previous = {"station": {"atco": "9100BODMNPW", "services": {"operators": ["GWR"]}}}
    info = transport.build_transport_info(
        (50.5, -4.7), (50.47, -4.72), stops, services, stations, previous,
    )  # fmt: skip
    assert info["start_stop"]["atco"] == "0800SERVED"
    assert info["end_stop"]["atco"] == "0800BODMIN"
    assert info["station"]["services"] == {"operators": ["GWR"]}
    assert transport.has_bus_access(info)

    circular = transport.build_transport_info(
        (50.5, -4.7),
        (50.5001, -4.7),
        stops,
        services,
    )
    assert circular["end_stop"] is None
    assert circular["station"] is None


@pytest.mark.parametrize(
    ("stop", "expected"),
    [
        ({"distance_m": 100, "lines": [{"line": "1"}]}, True),
        ({"distance_m": 100, "lines": []}, False),
        ({"distance_m": 2000, "lines": [{"line": "1"}]}, False),
    ],
)
def test_has_bus_access(stop, expected):
    assert transport.has_bus_access({"start_stop": stop}) is expected


@pytest.mark.parametrize(
    ("days", "label"),
    [
        ({0, 1, 2, 3, 4, 5, 6}, "Daily"),
        ({0, 1, 2, 3, 4, 5}, f"Mon{transport.EN_DASH}Sat"),
        ({5, 6}, "Sat, Sun"),
    ],
)
def test_format_days(days, label):
    assert transport.format_days(days) == label


def test_parse_station_services():
    payload = {"departures": {"all": [
        {"operator_name": "Great Western Railway", "destination_name": "Plymouth"},
        {"operator_name": "Great Western Railway", "destination_name": "Gunnislake"},
        {"operator_name": "Great Western Railway", "destination_name": "Plymouth"},
    ]}}  # fmt: skip
    assert transport.parse_station_services(payload) == {
        "operators": ["Great Western Railway"],
        "destinations": ["Plymouth", "Gunnislake"],
    }


@pytest.mark.django_db
def test_refresh_transport_uses_route_start_and_preserves_amenities(tmp_path):
    (tmp_path / "stops.csv").write_text(NAPTAN_CSV, encoding="utf-8")
    (tmp_path / "rail.csv").write_text(RAIL_CSV, encoding="utf-8")
    walk = make_walk(
        # Stored centre point is far from any stop; the route starts in Blisland.
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

    with mock.patch.object(transport, "date", wraps=date) as fake_date:
        fake_date.today.return_value = TODAY
        call_command(
            "refresh_transport",
            naptan_csv=str(tmp_path / "stops.csv"),
            rail_csv=str(tmp_path / "rail.csv"),
            gtfs=str(make_gtfs(tmp_path / "gtfs.zip")),
        )

    walk.refresh_from_db()
    assert walk.has_bus_access
    assert walk.has_pub
    assert walk.transport_info["start_stop"]["lines"][0]["line"] == "11"
    assert walk.transport_info["station"]["name"] == "Bodmin Parkway"


@pytest.mark.django_db
def test_refresh_train_services_needs_credentials(settings, monkeypatch):
    settings.TRANSPORTAPI_APP_ID = ""
    settings.TRANSPORTAPI_APP_KEY = ""
    monkeypatch.delenv("TRANSPORTAPI_APP_ID", raising=False)
    monkeypatch.delenv("TRANSPORTAPI_APP_KEY", raising=False)
    with mock.patch.object(transport, "fetch_station_services") as fetch:
        call_command("refresh_train_services")
    fetch.assert_not_called()


@pytest.mark.django_db
def test_refresh_train_services_shares_hits_and_respects_limit(settings):
    settings.TRANSPORTAPI_APP_ID = "id"
    settings.TRANSPORTAPI_APP_KEY = "key"

    def info(atco):
        return {"start_stop": None, "end_stop": None, "station": {"atco": atco}}

    make_walk("a", transport_info=info("9100A"))
    make_walk("b", transport_info=info("9100A"))
    make_walk("c", transport_info=info("9100C"))
    services = {"operators": ["GWR"], "destinations": ["Plymouth"]}

    with mock.patch.object(
        transport,
        "fetch_station_services",
        return_value=services,
    ) as fetch:
        call_command("refresh_train_services", limit=1)

    fetch.assert_called_once_with("9100A", "id", "key")
    a, b, c = (Walk.objects.get(walk_id=w).transport_info["station"] for w in "abc")
    assert a["services"] == services
    assert b["services"] == services
    assert "services" not in c


@pytest.mark.django_db
def test_detail_exposes_transport(client):
    info = {
        "start_stop": {"atco": "S1", "name": "Church", "distance_m": 100, "lines": []},
    }
    make_walk(transport_info=info)
    assert client.get("/api/walks/test_walk").json()["transport"] == info
