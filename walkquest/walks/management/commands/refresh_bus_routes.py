"""Confirm which bus lines call at walks' stops, via TransportAPI.

    python manage.py refresh_bus_routes              # up to 25 stops
    python manage.py refresh_bus_routes --limit 5

The free TransportAPI plan allows 30 hits/day, so each run checks a small batch
of stops — never-checked first, then the stalest — and walks sharing a stop
share the hit. Run ``refresh_bus_stops`` first. Needs TRANSPORTAPI_APP_ID and
TRANSPORTAPI_APP_KEY; does nothing without them.
"""

import os
from datetime import UTC
from datetime import datetime

import requests
from django.conf import settings
from django.core.management.base import BaseCommand

from walkquest.walks import transport
from walkquest.walks.models import Walk

DEFAULT_LIMIT = 25  # leaves headroom under the 30/day free quota
QUOTA_OR_AUTH_ERRORS = {401, 403, 429}


class Command(BaseCommand):
    help = "Fetch bus lines for walks' nearest stops from TransportAPI (rate-limited)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=DEFAULT_LIMIT,
            help="Max API calls",
        )

    def handle(self, *args, limit=DEFAULT_LIMIT, **options):
        app_id = _credential("TRANSPORTAPI_APP_ID")
        app_key = _credential("TRANSPORTAPI_APP_KEY")
        if not (app_id and app_key):
            self.stdout.write("TRANSPORTAPI_APP_ID/APP_KEY not set; skipping")
            return

        walks = [
            w
            for w in Walk.objects.only("id", "transport_info", "has_bus_access")
            if w.transport_info
        ]
        queue = _stops_to_check(walks)[:limit]
        checked = self._fetch(queue, app_id, app_key)
        if not checked:
            return
        now = datetime.now(UTC).isoformat(timespec="seconds")
        changed = []
        for walk in walks:
            touched = False
            for key in ("start_stop", "end_stop"):
                stop = walk.transport_info.get(key)
                if stop and stop["atco"] in checked:
                    stop["lines"] = checked[stop["atco"]]
                    stop["lines_checked_at"] = now
                    touched = True
            if touched:
                walk.has_bus_access = transport.has_bus_access(walk.transport_info)
                changed.append(walk)
        Walk.objects.bulk_update(
            changed,
            ["transport_info", "has_bus_access"],
            batch_size=100,
        )
        remaining = len(_stops_to_check(walks, unchecked_only=True))
        self.stdout.write(
            self.style.SUCCESS(
                f"Checked {len(checked)} stops, updated {len(changed)} walks; "
                f"{remaining} stops never checked",
            ),
        )

    def _fetch(self, queue, app_id, app_key):
        """{atco: lines} for each stop fetched; stops early on auth/quota errors."""
        checked = {}
        for atco in queue:
            try:
                lines = transport.fetch_stop_lines(atco, app_id, app_key)
            except requests.HTTPError as exc:
                status = exc.response.status_code if exc.response is not None else None
                self.stderr.write(f"{atco}: HTTP {status}")
                if status in QUOTA_OR_AUTH_ERRORS:
                    break
                continue
            except requests.RequestException as exc:
                self.stderr.write(f"{atco}: {exc}")
                continue
            checked[atco] = lines
            names = ", ".join(line["line"] for line in lines)
            self.stdout.write(f"{atco}: {names or 'no departures'}")
        return checked


def _stops_to_check(walks, *, unchecked_only=False):
    """ATCO codes of stops within walking distance, never-checked first then oldest."""
    stops = {}
    for walk in walks:
        for key in ("start_stop", "end_stop"):
            stop = walk.transport_info.get(key)
            if stop and stop["distance_m"] <= transport.BUS_ACCESS_RADIUS_M:
                stops[stop["atco"]] = stop.get("lines_checked_at") or ""
    if unchecked_only:
        return [atco for atco, checked in stops.items() if not checked]
    return sorted(stops, key=lambda atco: (stops[atco], atco))


def _credential(name):
    """A Django setting if defined (tests), else the environment (walkquest.env)."""
    return getattr(settings, name, None) or os.environ.get(name, "")
