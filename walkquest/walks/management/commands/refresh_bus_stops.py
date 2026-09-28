"""Find the nearest active bus stop to each walk's start/end from NaPTAN.

    python manage.py refresh_bus_stops
    python manage.py refresh_bus_stops --from-csv naptan.csv   # offline
    python manage.py refresh_bus_stops --dry-run

Sets ``Walk.has_bus_access`` and ``Walk.transport_info``. Keyless and cheap:
safe to re-run whenever NaPTAN changes. Lines already confirmed by
``refresh_bus_routes`` are kept for unchanged stops.
"""

from pathlib import Path

from django.core.management.base import BaseCommand

from walkquest.walks import transport
from walkquest.walks.models import Walk


class Command(BaseCommand):
    help = "Update walks' nearest bus stops from NaPTAN"

    def add_arguments(self, parser):
        parser.add_argument(
            "--from-csv", help="Use a saved NaPTAN CSV instead of downloading",
        )
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, from_csv=None, dry_run=False, **options):
        if from_csv:
            stops = transport.parse_naptan_csv(
                Path(from_csv).read_text(encoding="utf-8-sig"),
            )
        else:
            stops = transport.fetch_naptan_stops()
        if not stops:
            self.stderr.write("No active bus stops found; leaving walks untouched.")
            return
        self.stdout.write(f"{len(stops)} active bus stops loaded")

        walks = list(
            Walk.objects.only(
                "id",
                "walk_name",
                "route_geometry",
                "latitude",
                "longitude",
                "transport_info",
                "has_bus_access",
            ),
        )
        for walk in walks:
            start, end = _route_ends(walk)
            walk.transport_info = transport.build_transport_info(
                start, end, stops, walk.transport_info,
            )
            walk.has_bus_access = transport.has_bus_access(walk.transport_info)

        accessible = sum(w.has_bus_access for w in walks)
        self.stdout.write(
            f"{accessible}/{len(walks)} walks within "
            f"{transport.BUS_ACCESS_RADIUS_M} m of a bus stop",
        )
        if dry_run:
            self.stdout.write("Dry run: nothing saved")
            return
        Walk.objects.bulk_update(
            walks, ["transport_info", "has_bus_access"], batch_size=100,
        )
        self.stdout.write(self.style.SUCCESS("Saved"))


def _route_ends(walk):
    """(lat, lon) of the route's first and last points; the stored lat/lon
    is only an approximate centre, often a kilometre or more from the start."""
    if walk.route_geometry and len(walk.route_geometry.coords) > 1:
        (lon1, lat1), (lon2, lat2) = (
            walk.route_geometry.coords[0][:2],
            walk.route_geometry.coords[-1][:2],
        )
        return (lat1, lon1), (lat2, lon2)
    point = (float(walk.latitude), float(walk.longitude))
    return point, point
