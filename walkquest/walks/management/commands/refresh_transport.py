"""Refresh walks' bus stops, bus lines and nearest stations (keyless).

    python manage.py refresh_transport
    python manage.py refresh_transport --dry-run
    python manage.py refresh_transport --naptan-csv stops.csv --rail-csv rail.csv \\
        --gtfs south_west.zip                                     # offline

Downloads NaPTAN (bus stops, rail stations) and the BODS South West GTFS
timetable (~170 MB, deleted afterwards), picks the nearest stop with buses to
each walk's start and end, and sets ``Walk.transport_info``/``has_bus_access``.
Train services from ``refresh_train_services`` are kept for unchanged stations.
"""

import tempfile
import zipfile
from pathlib import Path

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from walkquest.walks import transport
from walkquest.walks.models import Walk


class Command(BaseCommand):
    help = "Update walks' bus stops, lines and stations from NaPTAN and BODS"

    def add_arguments(self, parser):
        parser.add_argument("--naptan-csv", help="Saved NaPTAN bus stop CSV")
        parser.add_argument("--rail-csv", help="Saved NaPTAN rail (area 910) CSV")
        parser.add_argument("--gtfs", help="Saved BODS GTFS zip")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        stops = _load(options["naptan_csv"], transport.BUS_STOP_TYPES) or (
            transport.fetch_naptan(
                transport.NAPTAN_AREA_CODES,
                transport.BUS_STOP_TYPES,
            )
        )
        stations = _load(options["rail_csv"], transport.RAIL_STATION_TYPES) or (
            transport.fetch_naptan(
                (transport.NAPTAN_RAIL_AREA_CODE,),
                transport.RAIL_STATION_TYPES,
            )
        )
        if not stops:
            msg = "No active bus stops found; leaving walks untouched"
            raise CommandError(msg)
        self.stdout.write(f"{len(stops)} bus stops, {len(stations)} rail stations")

        walks = list(
            Walk.objects.only(
                "id", "route_geometry", "latitude", "longitude",
                "transport_info", "has_bus_access",
            ),
        )  # fmt: skip
        ends = {walk.pk: _route_ends(walk) for walk in walks}
        atcos = set().union(
            *(
                transport.candidate_atcos(transport.route_points(*e), stops)
                for e in ends.values()
            ),
        )
        services = self._services(options["gtfs"], atcos, stops)
        self.stdout.write(f"{len(services)}/{len(atcos)} nearby stops have buses")

        for walk in walks:
            walk.transport_info = transport.build_transport_info(
                *ends[walk.pk],
                stops,
                services,
                stations,
                walk.transport_info,
            )
            walk.has_bus_access = transport.has_bus_access(walk.transport_info)

        accessible = sum(w.has_bus_access for w in walks)
        with_station = sum(bool(w.transport_info["station"]) for w in walks)
        self.stdout.write(
            f"{accessible}/{len(walks)} walks have buses within "
            f"{transport.BUS_ACCESS_RADIUS_M} m; {with_station} have a station within "
            f"{transport.STATION_MAX_M // 1000} km",
        )
        if options["dry_run"]:
            self.stdout.write("Dry run: nothing saved")
            return
        Walk.objects.bulk_update(
            walks,
            ["transport_info", "has_bus_access"],
            batch_size=100,
        )
        self.stdout.write(self.style.SUCCESS("Saved"))

    def _services(self, gtfs_path, atcos, stops):
        places = {stop["atco"]: stop["locality"] for stop in stops}
        if gtfs_path:
            with zipfile.ZipFile(gtfs_path) as zf:
                return transport.gtfs_stop_services(zf, atcos, places)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "gtfs.zip"
            self.stdout.write("Downloading BODS GTFS…")
            transport.download_gtfs(path)
            with zipfile.ZipFile(path) as zf:
                return transport.gtfs_stop_services(zf, atcos, places)


def _load(path, stop_types):
    if not path:
        return None
    return transport.parse_naptan_csv(
        Path(path).read_text(encoding="utf-8-sig"),
        stop_types,
    )


def _route_ends(walk):
    """(lat, lon) of the route's first and last points; the stored lat/lon
    is only an approximate centre, often a kilometre or more from the start."""
    if walk.route_geometry and len(walk.route_geometry.coords) > 1:
        coords = walk.route_geometry.coords
        (lon1, lat1), (lon2, lat2) = coords[0][:2], coords[-1][:2]
        return (lat1, lon1), (lat2, lon2)
    point = (float(walk.latitude), float(walk.longitude))
    return point, point
