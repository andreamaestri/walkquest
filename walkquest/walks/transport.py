"""Public transport data for walks.

Two sources, both keyed on NaPTAN ATCO codes:

* NaPTAN (DfT's register of every UK stop, free and keyless) gives the nearest
  active bus stop to each walk's start and end.
* TransportAPI (optional, free plan = 30 hits/day) confirms which bus lines
  actually call at those stops. Calls are budgeted and results cached on the
  walk, so a full refresh trickles in over several days.
"""

import csv
import io
import math
from datetime import UTC
from datetime import datetime

import requests

NAPTAN_URL = "https://naptan.api.dft.gov.uk/v1/access-nodes"
# Cornwall, Devon, Plymouth — the Tamar-valley walks sit close to the border.
NAPTAN_AREA_CODES = ("080", "110", "118")
BUS_STOP_TYPES = {"BCT", "BCS", "BCQ", "BST"}

TRANSPORTAPI_URL = "https://transportapi.com/v3/uk/bus/stop_timetables/{atco}.json"

# ~10 minutes on foot.
BUS_ACCESS_RADIUS_M = 800
# Start and end closer than this means a circular walk: one stop is enough.
CIRCULAR_THRESHOLD_M = 300
# Bounding box (degrees) searched around a point: ~11 km north-south, ~10 km east-west.
SEARCH_BOX_LAT, SEARCH_BOX_LON = 0.1, 0.15


def haversine_m(lat1, lon1, lat2, lon2):
    r = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    a = (
        math.sin(math.radians(lat2 - lat1) / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    )
    return 2 * r * math.asin(math.sqrt(a))


def parse_naptan_csv(text):
    """Active bus stops from a NaPTAN CSV export."""
    stops = []
    for row in csv.DictReader(io.StringIO(text.lstrip("﻿"))):
        if row.get("Status") != "active" or row.get("StopType") not in BUS_STOP_TYPES:
            continue
        try:
            lat, lon = float(row["Latitude"]), float(row["Longitude"])
        except (KeyError, ValueError):
            continue
        stops.append(
            {
                "atco": row["ATCOCode"],
                "name": row.get("CommonName", "").strip(),
                "indicator": row.get("Indicator", "").strip(),
                "locality": row.get("LocalityName", "").strip(),
                "lat": lat,
                "lon": lon,
            },
        )
    return stops


def fetch_naptan_stops(area_codes=NAPTAN_AREA_CODES, session=requests):
    response = session.get(
        NAPTAN_URL,
        params={"dataFormat": "csv", "atcoAreaCodes": ",".join(area_codes)},
        timeout=120,
    )
    response.raise_for_status()
    response.encoding = "utf-8"
    return parse_naptan_csv(response.text)


def nearest_stop(lat, lon, stops):
    best, best_d = None, math.inf
    # Cheap bounding-box prefilter before the trig.
    for stop in stops:
        if (
            abs(stop["lat"] - lat) > SEARCH_BOX_LAT
            or abs(stop["lon"] - lon) > SEARCH_BOX_LON
        ):
            continue
        d = haversine_m(lat, lon, stop["lat"], stop["lon"])
        if d < best_d:
            best, best_d = stop, d
    if best is None:
        return None
    return {**best, "distance_m": round(best_d)}


def build_transport_info(start, end, stops, previous=None):
    """Transport info for a walk whose route runs from ``start`` to ``end``.

    ``start``/``end`` are (lat, lon). Lines already confirmed for an unchanged
    stop are carried over from ``previous`` so re-running NaPTAN is free.
    """
    previous = previous or {}
    info = {
        "source": "naptan",
        "updated_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "start_stop": _with_lines(
            nearest_stop(*start, stops),
            previous.get("start_stop"),
        ),
        "end_stop": None,
    }
    if haversine_m(*start, *end) > CIRCULAR_THRESHOLD_M:
        info["end_stop"] = _with_lines(
            nearest_stop(*end, stops),
            previous.get("end_stop"),
        )
    return info


def _with_lines(stop, previous_stop):
    if stop is None:
        return None
    if (
        previous_stop
        and previous_stop.get("atco") == stop["atco"]
        and "lines" in previous_stop
    ):
        stop["lines"] = previous_stop["lines"]
        stop["lines_checked_at"] = previous_stop.get("lines_checked_at")
    return stop


def has_bus_access(info):
    """A bus stop within walking distance of the start that has (or may have) service.

    Stops confirmed by TransportAPI to have no departures don't count; stops not
    yet checked are trusted, since NaPTAN only lists them while active.
    """
    stop = (info or {}).get("start_stop")
    if not stop or stop["distance_m"] > BUS_ACCESS_RADIUS_M:
        return False
    return stop.get("lines") is None or bool(stop["lines"])


def parse_stop_lines(payload):
    """Distinct bus lines from a TransportAPI stop_timetables response."""
    departures = (payload or {}).get("departures") or {}
    groups = departures.values() if isinstance(departures, dict) else [departures]
    lines = {}
    for group in groups:
        for dep in group or []:
            name = str(dep.get("line_name") or dep.get("line") or "").strip()
            if not name:
                continue
            entry = lines.setdefault(
                name.upper(),
                {
                    "line": name,
                    "operator": dep.get("operator_name") or "",
                    "directions": [],
                },
            )
            direction = (dep.get("direction") or "").strip()
            if direction and direction not in entry["directions"]:
                entry["directions"].append(direction)
    return sorted(lines.values(), key=lambda line: (len(line["line"]), line["line"]))


def fetch_stop_lines(atco, app_id, app_key, session=requests):
    response = session.get(
        TRANSPORTAPI_URL.format(atco=atco),
        params={"app_id": app_id, "app_key": app_key, "group": "route"},
        timeout=30,
    )
    response.raise_for_status()
    return parse_stop_lines(response.json())
