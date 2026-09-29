"""Fetch operators/destinations for walks' nearest rail stations (TransportAPI).

    python manage.py refresh_train_services              # up to 25 stations
    python manage.py refresh_train_services --limit 5

The free TransportAPI plan allows 30 hits/day, so each run checks a small batch
of stations (never-checked first, then any older than 30 days); walks sharing
a station share the hit. Run ``refresh_transport`` first. Needs
TRANSPORTAPI_APP_ID and TRANSPORTAPI_APP_KEY; does nothing without them.
"""

import os
from datetime import UTC
from datetime import datetime
from datetime import timedelta

import requests
from django.conf import settings
from django.core.management.base import BaseCommand

from walkquest.walks import transport
from walkquest.walks.models import Walk

DEFAULT_LIMIT = 25  # leaves headroom under the 30/day free quota
STALE_AFTER = timedelta(days=30)
QUOTA_OR_AUTH_ERRORS = {401, 403, 429}


class Command(BaseCommand):
    help = "Fetch train operators/destinations for walks' stations (rate-limited)"

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
            for w in Walk.objects.only("id", "transport_info")
            if (w.transport_info or {}).get("station")
        ]
        queue = _stations_to_check(walks)[:limit]
        checked = self._fetch(queue, app_id, app_key)
        if not checked:
            return

        now = datetime.now(UTC).isoformat(timespec="seconds")
        changed = []
        for walk in walks:
            station = walk.transport_info["station"]
            if station["atco"] in checked:
                station["services"] = checked[station["atco"]]
                station["services_checked_at"] = now
                changed.append(walk)
        Walk.objects.bulk_update(changed, ["transport_info"], batch_size=100)
        self.stdout.write(
            self.style.SUCCESS(
                f"Checked {len(checked)} stations, updated {len(changed)} walks; "
                f"{len(_stations_to_check(walks))} stations still due",
            ),
        )

    def _fetch(self, queue, app_id, app_key):
        """{atco: services} per station fetched; stops early on auth/quota errors."""
        checked = {}
        for atco in queue:
            try:
                services = transport.fetch_station_services(atco, app_id, app_key)
            except requests.HTTPError as exc:
                status = exc.response.status_code if exc.response is not None else None
                self.stderr.write(f"{atco}: HTTP {status}")
                if status in QUOTA_OR_AUTH_ERRORS:
                    break
                continue
            except requests.RequestException as exc:
                self.stderr.write(f"{atco}: {exc}")
                continue
            checked[atco] = services
            self.stdout.write(
                f"{atco}: {', '.join(services['destinations']) or 'no trains'}",
            )
        return checked


def _stations_to_check(walks):
    """ATCO codes due a check: never checked first, then the stalest."""
    cutoff = (datetime.now(UTC) - STALE_AFTER).isoformat()
    due = {}
    for walk in walks:
        station = walk.transport_info["station"]
        checked_at = station.get("services_checked_at") or ""
        if checked_at < cutoff:
            due[station["atco"]] = checked_at
    return sorted(due, key=lambda atco: (due[atco], atco))


def _credential(name):
    """A Django setting if defined (tests), else the environment (walkquest.env)."""
    return getattr(settings, name, None) or os.environ.get(name, "")
