"""Copy every row from the current PostgreSQL database into Oracle.

    # .env / environment: keep DJANGO_DB_BACKEND=postgis and set ORACLE_DSN,
    # ORACLE_USER and ORACLE_PASSWORD so an "oracle" database alias exists.
    python manage.py copy_to_oracle --dry-run   # counts only
    python manage.py copy_to_oracle             # migrate target, copy, verify
    python manage.py copy_to_oracle --force     # wipe a non-empty target first

Then switch the site over with DJANGO_DB_BACKEND=oracle (see README).

The copy uses Django's own JSON serializer (natural foreign keys, original
primary keys), so it works for every app including allauth, Celery beat and
GeoDjango geometries. Content types and permissions are recreated by
``migrate`` on the target and referenced by natural key; sessions are skipped.
"""

import tempfile
from pathlib import Path

from django.apps import apps
from django.conf import settings
from django.core import serializers
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.core.management.color import no_style
from django.db import connections
from django.test.utils import override_settings

# Recreated by `migrate` on the target, or not worth copying.
EXCLUDE = ["contenttypes", "auth.permission", "sessions"]
# Rows that `migrate` itself creates on an empty database.
SEEDED = {"sites.site"}


def copyable_models():
    excluded_apps = {label for label in EXCLUDE if "." not in label}
    excluded_models = {label for label in EXCLUDE if "." in label}
    for model in apps.get_models(include_auto_created=True):
        label = model._meta.label_lower
        if model._meta.app_label in excluded_apps or label in excluded_models:
            continue
        if model._meta.proxy or not model._meta.managed:
            continue
        yield model


def counts(alias):
    return {
        model._meta.label_lower: model._default_manager.using(alias).count()
        for model in copyable_models()
    }


class plain_serializers:  # noqa: N801 - used as a context manager
    """Use Django's built-in serializers (tagulous' overrides break on Django 5.2)."""

    def __enter__(self):
        serializers._serializers = {}
        self._override = override_settings(SERIALIZATION_MODULES={})
        self._override.enable()

    def __exit__(self, *exc):
        self._override.disable()
        serializers._serializers = {}


class Command(BaseCommand):
    help = "Copy all data from the default (PostgreSQL) database to the Oracle database alias."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            default="default",
            help="Source database alias (default: default)",
        )
        parser.add_argument(
            "--target", default="oracle", help="Target database alias (default: oracle)"
        )
        parser.add_argument(
            "--dry-run", action="store_true", help="Only report row counts"
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Flush a non-empty target before copying",
        )
        parser.add_argument(
            "--skip-migrate",
            action="store_true",
            help="Target schema is already migrated",
        )

    def handle(self, *args, **options):
        source, target = options["source"], options["target"]
        for alias in (source, target):
            if alias not in settings.DATABASES:
                msg = (
                    f"Database alias {alias!r} is not configured. With DJANGO_DB_BACKEND=postgis, "
                    "set ORACLE_DSN, ORACLE_USER and ORACLE_PASSWORD to add the 'oracle' alias."
                )
                raise CommandError(msg)
        if source == target:
            raise CommandError("Source and target must be different databases.")

        self.stdout.write(
            f"Source: {connections[source].vendor} ({source}) → target: {connections[target].vendor} ({target})"
        )

        if not options["skip_migrate"] and not options["dry_run"]:
            self.stdout.write("Migrating target schema…")
            call_command("migrate", database=target, interactive=False, verbosity=0)

        source_counts = counts(source)
        total = sum(source_counts.values())
        self.stdout.write(
            f"{total} rows in {sum(1 for c in source_counts.values() if c)} tables to copy."
        )
        if options["dry_run"]:
            for label, count in sorted(source_counts.items()):
                if count:
                    self.stdout.write(f"  {label:<45} {count}")
            return

        target_counts = counts(target)
        occupied = {
            label: n for label, n in target_counts.items() if n and label not in SEEDED
        }
        if occupied:
            if not options["force"]:
                sample = ", ".join(f"{k}={v}" for k, v in list(occupied.items())[:5])
                msg = f"Target is not empty ({sample}…). Re-run with --force to flush it first."
                raise CommandError(msg)
            self.stdout.write(self.style.WARNING("Flushing target database…"))
            call_command("flush", database=target, interactive=False, verbosity=0)

        with tempfile.TemporaryDirectory() as tmp, plain_serializers():
            dump = Path(tmp) / "walkquest.json"
            self.stdout.write("Exporting…")
            with dump.open("w", encoding="utf-8") as fh:
                call_command(
                    "dumpdata",
                    database=source,
                    exclude=EXCLUDE,
                    natural_foreign=True,
                    format="json",
                    stdout=fh,
                    verbosity=0,
                )
            self.stdout.write(f"Importing {dump.stat().st_size / 1_000_000:.1f} MB…")
            call_command("loaddata", str(dump), database=target, verbosity=0)

        self._reset_sequences(target)
        self._verify(source, target, source_counts)

    def _reset_sequences(self, alias):
        connection = connections[alias]
        statements = connection.ops.sequence_reset_sql(
            no_style(), list(copyable_models())
        )
        with connection.cursor() as cursor:
            for sql in statements:
                cursor.execute(sql)
        self.stdout.write(f"Reset {len(statements)} identity sequences.")

    def _verify(self, source, target, source_counts):
        target_counts = counts(target)
        mismatched = {
            label: (n, target_counts.get(label))
            for label, n in source_counts.items()
            if label not in SEEDED and target_counts.get(label) != n
        }
        if mismatched:
            for label, (expected, actual) in mismatched.items():
                self.stdout.write(
                    self.style.ERROR(f"  {label}: source {expected} ≠ target {actual}")
                )
            raise CommandError("Row counts differ; see above.")

        from walkquest.walks.models import Walk

        target_geoms = dict(
            Walk.objects.using(target).values_list("id", "route_geometry")
        )
        bad = [
            walk_id
            for walk_id, geom in Walk.objects.using(source).values_list(
                "id", "route_geometry"
            )
            if geom is not None
            and (
                target_geoms.get(walk_id) is None
                or not geom.equals_exact(target_geoms[walk_id], 1e-9)
            )
        ]
        if bad:
            msg = f"{len(bad)} route geometries differ after the copy (e.g. {bad[0]})."
            raise CommandError(msg)

        self.stdout.write(
            self.style.SUCCESS(
                f"Copied {sum(source_counts.values())} rows; counts and {len(target_geoms)} route geometries verified."
            )
        )
