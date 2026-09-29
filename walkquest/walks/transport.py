"""Public transport data for walks, keyed on NaPTAN ATCO codes.

* NaPTAN (DfT's register of every UK stop, keyless): bus stops and rail
  stations near each walk's start and end.
* BODS GTFS (DfT's Bus Open Data Service, keyless): the bus lines calling at
  those stops, with operator, destinations and how often they run. Used to pick
  the nearest stop that actually has buses.
* TransportAPI (free plan = 30 hits/day, optional): operator and destinations
  for the rail stations. Calls are budgeted and cached on the walk.
"""

import csv
import io
import math
from collections import Counter
from collections import defaultdict
from datetime import UTC
from datetime import date
from datetime import datetime
from datetime import timedelta

import requests

NAPTAN_URL = "https://naptan.api.dft.gov.uk/v1/access-nodes"
# Cornwall, Devon, Plymouth — the Tamar-valley walks sit close to the border.
NAPTAN_AREA_CODES = ("080", "110", "118")
NAPTAN_RAIL_AREA_CODE = "910"
BUS_STOP_TYPES = frozenset({"BCT", "BCS", "BCQ", "BST"})
RAIL_STATION_TYPES = frozenset({"RLY"})

BODS_GTFS_URL = (
    "https://data.bus-data.dft.gov.uk/timetable/download/gtfs-file/south_west/"
)
TRANSPORTAPI_TRAIN_URL = (
    "https://transportapi.com/v3/uk/train/station_timetables/tiploc:{tiploc}.json"
)

# ~10 minutes on foot.
BUS_ACCESS_RADIUS_M = 800
# How far to look for a stop with buses before giving up (remote moorland walks).
BUS_SEARCH_RADIUS_M = 8000
# Served stops this close together are one place (usually either side of a road).
STOP_CLUSTER_M = 150
# Stations further than this from the start aren't worth mentioning.
STATION_MAX_M = 5000
# Start and end closer than this means a circular walk: one stop is enough.
CIRCULAR_THRESHOLD_M = 300
# Bounding box (degrees) searched around a point: ~11 km north-south, ~10 km east-west.
SEARCH_BOX_LAT, SEARCH_BOX_LON = 0.1, 0.15
# Timetabled services starting within this window count as running now.
SERVICE_LOOKAHEAD_DAYS = 30
MAX_DIRECTIONS = 2
MAX_DESTINATIONS = 4
EN_DASH = "\u2013"
DAY_NAMES = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
DAY_NAMES_GTFS = (
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
)  # fmt: skip


def haversine_m(lat1, lon1, lat2, lon2):
    r = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    a = (
        math.sin(math.radians(lat2 - lat1) / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(a))


# --- NaPTAN ---------------------------------------------------------------


def parse_naptan_csv(text, stop_types=BUS_STOP_TYPES):
    """Active stops of the given NaPTAN StopTypes from a CSV export."""
    stops = []
    for row in csv.DictReader(io.StringIO(text.lstrip("﻿"))):
        if row.get("Status") != "active" or row.get("StopType") not in stop_types:
            continue
        try:
            lat, lon = float(row["Latitude"]), float(row["Longitude"])
        except (KeyError, ValueError):
            continue
        stops.append(
            {
                "atco": row["ATCOCode"],
                "name": row.get("CommonName", "").strip().removesuffix(" Rail Station"),
                "indicator": row.get("Indicator", "").strip(),
                "locality": row.get("LocalityName", "").strip(),
                "lat": lat,
                "lon": lon,
            },
        )
    return stops


def fetch_naptan(area_codes, stop_types, session=requests):
    response = session.get(
        NAPTAN_URL,
        params={"dataFormat": "csv", "atcoAreaCodes": ",".join(area_codes)},
        timeout=120,
    )
    response.raise_for_status()
    response.encoding = "utf-8"
    return parse_naptan_csv(response.text, stop_types)


def nearby(lat, lon, stops, max_m=math.inf):
    """Stops within ``max_m`` of a point, nearest first, with ``distance_m``."""
    found = []
    for stop in stops:
        # Cheap bounding-box prefilter before the trig.
        if (
            abs(stop["lat"] - lat) > SEARCH_BOX_LAT
            or abs(stop["lon"] - lon) > SEARCH_BOX_LON
        ):
            continue
        d = haversine_m(lat, lon, stop["lat"], stop["lon"])
        if d <= max_m:
            found.append({**stop, "distance_m": round(d)})
    return sorted(found, key=lambda stop: stop["distance_m"])


def route_points(start, end):
    """Points needing a bus stop: the start, plus the end of a linear walk."""
    if haversine_m(*start, *end) > CIRCULAR_THRESHOLD_M:
        return [start, end]
    return [start]


def candidate_atcos(points, stops):
    return {s["atco"] for p in points for s in nearby(*p, stops, BUS_SEARCH_RADIUS_M)}


def pick_bus_stop(point, stops, services):
    """The nearest stop with buses, its lines merged with its neighbours'.

    ``services`` maps ATCO -> raw GTFS lines (see ``gtfs_stop_services``). With
    no served stop in range, returns the nearest stop with ``lines: []``.
    """
    candidates = nearby(*point, stops)
    if not candidates:
        return None
    served = [
        s
        for s in candidates
        if s["distance_m"] <= BUS_SEARCH_RADIUS_M and services.get(s["atco"])
    ]
    if not served:
        return {**candidates[0], "lines": []}
    chosen = served[0]
    cluster = [
        services[s["atco"]]
        for s in served
        if haversine_m(chosen["lat"], chosen["lon"], s["lat"], s["lon"])
        <= STOP_CLUSTER_M
    ]
    return {**chosen, "lines": summarise_lines(cluster, here=chosen["locality"])}


def build_transport_info(start, end, stops, services, stations=(), previous=None):  # noqa: PLR0913
    """Transport info for a walk whose route runs from ``start`` to ``end``.

    ``start``/``end`` are (lat, lon). Train services already fetched for an
    unchanged station are carried over from ``previous``.
    """
    points = route_points(start, end)
    info = {
        "updated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "start_stop": pick_bus_stop(start, stops, services),
        "end_stop": pick_bus_stop(end, stops, services) if len(points) > 1 else None,
        "station": None,
    }
    near = nearby(*start, stations, STATION_MAX_M)
    if near:
        station = near[0]
        old = (previous or {}).get("station") or {}
        if old.get("atco") == station["atco"] and "services" in old:
            station["services"] = old["services"]
            station["services_checked_at"] = old.get("services_checked_at")
        info["station"] = station
    return info


def has_bus_access(info):
    """Buses stop within walking distance of the start."""
    stop = (info or {}).get("start_stop")
    return bool(stop and stop["distance_m"] <= BUS_ACCESS_RADIUS_M and stop["lines"])


# --- BODS GTFS: bus lines per stop -------------------------------------------


def _gtfs_rows(zf, name):
    with zf.open(name) as fh:
        yield from csv.DictReader(io.TextIOWrapper(fh, encoding="utf-8-sig"))


def _parse_date(value):
    return datetime.strptime(value, "%Y%m%d").date()  # noqa: DTZ007 - plain dates


def _service_days(zf, today):
    """service_id -> weekdays (0=Mon) it runs on in the coming weeks."""
    horizon = today + timedelta(days=SERVICE_LOOKAHEAD_DAYS)
    days = {}
    for row in _gtfs_rows(zf, "calendar.txt"):
        if (
            _parse_date(row["start_date"]) <= horizon
            and _parse_date(row["end_date"]) >= today
        ):
            days[row["service_id"]] = {
                i for i, name in enumerate(DAY_NAMES_GTFS) if row[name] == "1"
            }
    # Services defined only by extra dates (school days, specials).
    extra = defaultdict(set)
    for row in _gtfs_rows(zf, "calendar_dates.txt"):
        if row["exception_type"] == "1" and row["service_id"] not in days:
            day = _parse_date(row["date"])
            if today <= day <= horizon:
                extra[row["service_id"]].add(day.weekday())
    return days | extra


def gtfs_stop_services(zf, atcos, place_names=None, today=None):
    """{atco: {(line, operator): {"per_day": [7 ints], "towards": Counter}}}.

    ``towards`` counts where trips end, as a town name: ``place_names`` maps
    ATCO -> locality (from NaPTAN), falling back to the GTFS stop name. Only
    stops with current services appear. Streams stop_times.txt (hundreds of MB
    for a region) keeping only what the requested stops need.
    """
    today = today or date.today()  # noqa: DTZ011 - timetables use local dates
    atcos = set(atcos)
    place_names = place_names or {}
    stop_trips = defaultdict(set)
    last_stop = {}  # trip_id -> (stop_sequence, stop_id)
    for row in _gtfs_rows(zf, "stop_times.txt"):
        trip_id, stop_id = row["trip_id"], row["stop_id"]
        if stop_id in atcos:
            stop_trips[stop_id].add(trip_id)
        seq = int(row["stop_sequence"])
        if seq >= last_stop.get(trip_id, (-1,))[0]:
            last_stop[trip_id] = (seq, stop_id)
    wanted = set().union(*stop_trips.values())
    termini = {last_stop[t][1] for t in wanted if t in last_stop}
    gtfs_names = {
        r["stop_id"]: r["stop_name"]
        for r in _gtfs_rows(zf, "stops.txt")
        if r["stop_id"] in termini and r["stop_id"] not in place_names
    }

    trips = {
        row["trip_id"]: (row["route_id"], row["service_id"])
        for row in _gtfs_rows(zf, "trips.txt")
        if row["trip_id"] in wanted
    }
    agencies = {r["agency_id"]: r["agency_name"] for r in _gtfs_rows(zf, "agency.txt")}
    routes = {
        r["route_id"]: (
            r["route_short_name"] or r["route_long_name"],
            agencies.get(r["agency_id"], ""),
        )
        for r in _gtfs_rows(zf, "routes.txt")
    }
    service_days = _service_days(zf, today)

    result = {}
    for atco, trip_ids in stop_trips.items():
        lines = {}
        for trip_id in trip_ids:
            route_id, service_id = trips.get(trip_id, (None, None))
            days = service_days.get(service_id)
            if route_id not in routes or not days:
                continue
            entry = lines.setdefault(
                routes[route_id],
                {"per_day": [0] * 7, "towards": Counter()},
            )
            for day in days:
                entry["per_day"][day] += 1
            end = last_stop.get(trip_id, (0, None))[1]
            town = place_names.get(end) or gtfs_names.get(end)
            if town:
                entry["towards"][town] += 1
        if lines:
            result[atco] = lines
    return result


def summarise_lines(stop_services, here=""):
    """Merge raw GTFS lines for a cluster of stops into display summaries.

    Trips ending ``here`` are arrivals, not somewhere you can go, so they
    don't count as a direction.
    """
    merged = {}
    for services in stop_services:
        for key, entry in services.items():
            into = merged.setdefault(key, {"per_day": [0] * 7, "towards": Counter()})
            into["per_day"] = [
                a + b for a, b in zip(into["per_day"], entry["per_day"], strict=True)
            ]
            into["towards"].update(entry["towards"])
    lines = [
        {
            "line": name,
            "operator": operator,
            "directions": [
                town for town, _ in entry["towards"].most_common() if town != here
            ][:MAX_DIRECTIONS],
            "days": format_days({i for i, n in enumerate(entry["per_day"]) if n}),
            # Departures on the busiest day, both directions.
            "per_day": max(entry["per_day"]),
        }
        for (name, operator), entry in merged.items()
    ]
    return sorted(
        lines,
        key=lambda line: (-line["per_day"], len(line["line"]), line["line"]),
    )


def format_days(days):
    """{0..6} -> "Daily", "Mon-Sat" (en dash), "Sat, Sun", ..."""
    days = sorted(days)
    if len(days) == len(DAY_NAMES):
        return "Daily"
    if len(days) > 2 and days == list(range(days[0], days[-1] + 1)):  # noqa: PLR2004
        return f"{DAY_NAMES[days[0]]}{EN_DASH}{DAY_NAMES[days[-1]]}"
    return ", ".join(DAY_NAMES[d] for d in days)


def download_gtfs(path, session=requests):
    with session.get(BODS_GTFS_URL, stream=True, timeout=600) as response:
        response.raise_for_status()
        with path.open("wb") as fh:
            for chunk in response.iter_content(1 << 20):
                fh.write(chunk)


# --- TransportAPI: rail station services -------------------------------------


def parse_station_services(payload):
    """Operators and destinations from a TransportAPI station_timetables response."""
    departures = (payload or {}).get("departures") or {}
    groups = departures.values() if isinstance(departures, dict) else [departures]
    operators, destinations = Counter(), Counter()
    for group in groups:
        for dep in group or []:
            if dep.get("operator_name"):
                operators[dep["operator_name"]] += 1
            if dep.get("destination_name"):
                destinations[dep["destination_name"]] += 1
    return {
        "operators": [name for name, _ in operators.most_common()],
        "destinations": [
            name for name, _ in destinations.most_common(MAX_DESTINATIONS)
        ],
    }


def fetch_station_services(atco, app_id, app_key, session=requests):
    # NaPTAN rail ATCO codes are "9100" + the station's TIPLOC.
    response = session.get(
        TRANSPORTAPI_TRAIN_URL.format(tiploc=atco.removeprefix("9100")),
        params={
            "app_id": app_id,
            "app_key": app_key,
            "live": "false",
            "train_status": "passenger",
        },
        timeout=30,
    )
    response.raise_for_status()
    return parse_station_services(response.json())
