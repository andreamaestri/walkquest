"""Import walk photos (main photo + captioned slideshow) from iWalk Cornwall.

    python manage.py import_iwalk_photos                     # every walk
    python manage.py import_iwalk_photos --walk blisland_to_lavethan_wood
    python manage.py import_iwalk_photos --limit 20 --delay 3
    python manage.py import_iwalk_photos --walk x --from-html saved_page.html
    python manage.py import_iwalk_photos --hotlink           # store remote URLs only

Photos are © iWalk Cornwall. Make sure you have permission before publishing
them; every walk links back to its source page in the UI. The importer is
polite: it honours robots.txt, waits between requests and identifies itself.
"""

from __future__ import annotations

import io
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib import robotparser
from urllib.parse import urlparse

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.core.management.base import CommandError
from django.db import transaction
from PIL import Image

from walkquest.walks.iwalk import BASE_URL
from walkquest.walks.iwalk import ParsedPhoto
from walkquest.walks.iwalk import parse_walk_page
from walkquest.walks.iwalk import walk_page_url
from walkquest.walks.models import Walk
from walkquest.walks.models import WalkPhoto

USER_AGENT = "WalkQuestPhotoImporter/1.0 (+https://walkquest.andreadev.uk)"
LARGE_WIDTH = 960
THUMB_WIDTH = 320
TIMEOUT = 30


def fetch(url: str) -> bytes:
    request = urllib.request.Request(
        url, headers={"User-Agent": USER_AGENT, "Accept": "*/*"},
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:  # noqa: S310 - fixed https host
        return response.read()


def render_webp(data: bytes, max_width: int) -> tuple[bytes, int, int]:
    """Resize (never upscale) and encode as WebP. Returns (bytes, width, height)."""
    with Image.open(io.BytesIO(data)) as img:
        img = img.convert("RGB")
        if img.width > max_width:
            height = round(img.height * max_width / img.width)
            img = img.resize((max_width, height), Image.Resampling.LANCZOS)
        out = io.BytesIO()
        img.save(out, "WEBP", quality=80, method=6)
        return out.getvalue(), img.width, img.height


class Command(BaseCommand):
    help = "Import main photos and captioned slideshows for walks from iWalk Cornwall."

    def add_arguments(self, parser):
        parser.add_argument(
            "--walk", action="append", help="walk_id to import (repeatable)",
        )
        parser.add_argument("--limit", type=int, help="Stop after this many walks")
        parser.add_argument(
            "--delay", type=float, default=2.0, help="Seconds between requests (min 1)",
        )
        parser.add_argument(
            "--refresh",
            action="store_true",
            help="Re-import walks that already have photos",
        )
        parser.add_argument(
            "--dry-run", action="store_true", help="Parse and report without saving",
        )
        parser.add_argument(
            "--from-html",
            help="Parse this saved HTML file instead of fetching (needs one --walk)",
        )
        parser.add_argument(
            "--hotlink",
            action="store_true",
            help="Store remote image URLs instead of downloading",
        )

    def handle(self, *args, **options):
        delay = max(1.0, options["delay"])
        walks = Walk.objects.order_by("walk_name")
        if options["walk"]:
            walks = walks.filter(walk_id__in=options["walk"])
        elif not options["refresh"]:
            walks = walks.filter(photos__isnull=True)
        # photos__isnull=True is a LEFT JOIN that yields one row per walk, so no
        # DISTINCT is needed (Oracle can't DISTINCT over TextField/LOB columns).
        walks = list(walks[: options["limit"]] if options["limit"] else walks)
        if not walks:
            self.stdout.write("No walks to import.")
            return

        if options["from_html"] and len(walks) != 1:
            raise CommandError("--from-html needs exactly one --walk")

        robots = None
        if not options["from_html"]:
            robots = robotparser.RobotFileParser(f"{BASE_URL}/robots.txt")
            try:
                robots.read()
            except (urllib.error.URLError, OSError) as exc:
                raise CommandError(f"Could not read robots.txt: {exc}") from exc

        imported, missing, failed = 0, [], []
        for index, walk in enumerate(walks, start=1):
            page_url = walk_page_url(walk.walk_id)
            prefix = f"[{index}/{len(walks)}] {walk.walk_id}"
            if robots and not robots.can_fetch(USER_AGENT, page_url):
                self.stdout.write(
                    self.style.WARNING(f"{prefix}: disallowed by robots.txt, skipping"),
                )
                failed.append(walk.walk_id)
                continue
            try:
                if options["from_html"]:
                    html = Path(options["from_html"]).read_text(encoding="utf-8")
                else:
                    html = fetch(page_url).decode("utf-8", errors="replace")
                    time.sleep(delay)
                page = parse_walk_page(html, BASE_URL)
            except urllib.error.HTTPError as exc:
                self.stdout.write(
                    self.style.WARNING(f"{prefix}: page returned HTTP {exc.code}"),
                )
                missing.append(walk.walk_id)
                continue
            except (urllib.error.URLError, OSError) as exc:
                self.stdout.write(self.style.ERROR(f"{prefix}: {exc}"))
                failed.append(walk.walk_id)
                continue

            photos = ([page.main] if page.main else []) + page.slides
            if not photos:
                self.stdout.write(self.style.WARNING(f"{prefix}: no photos found"))
                missing.append(walk.walk_id)
                continue

            captioned = sum(1 for p in page.slides if p.caption)
            self.stdout.write(
                f"{prefix}: main={'yes' if page.main else 'no'}, "
                f"slides={len(page.slides)} ({captioned} captioned)",
            )
            if options["dry_run"]:
                for photo in photos:
                    self.stdout.write(f"    {photo.url}  {photo.caption[:70]}")
                continue

            try:
                self._save(
                    walk, page_url, page.main, page.slides, options["hotlink"], delay,
                )
                imported += 1
            except Exception as exc:  # noqa: BLE001 - keep going with the next walk
                self.stdout.write(
                    self.style.ERROR(f"{prefix}: failed to save photos: {exc}"),
                )
                failed.append(walk.walk_id)

        self.stdout.write(
            self.style.SUCCESS(f"Imported photos for {imported} walk(s)."),
        )
        if missing:
            self.stdout.write(
                self.style.WARNING(
                    f"No page/photos for {len(missing)}: {', '.join(missing)}",
                ),
            )
        if failed:
            self.stdout.write(
                self.style.ERROR(f"Failed for {len(failed)}: {', '.join(failed)}"),
            )

    def _save(
        self,
        walk,
        page_url,
        main: ParsedPhoto | None,
        slides: list[ParsedPhoto],
        hotlink: bool,
        delay: float,
    ):
        rows = []
        if main:
            rows.append((main, True, 0))
        rows.extend(
            (photo, False, position) for position, photo in enumerate(slides, start=1)
        )

        prepared = []
        for photo, is_main, position in rows:
            files = {}
            width = height = None
            if not hotlink:
                data = fetch(photo.url)
                time.sleep(delay)
                stem = Path(urlparse(photo.url).path).stem
                large, width, height = render_webp(data, LARGE_WIDTH)
                small, _, _ = render_webp(data, THUMB_WIDTH)
                files = {
                    "image": (f"{stem}-{LARGE_WIDTH}.webp", large),
                    "thumb": (f"{stem}-{THUMB_WIDTH}.webp", small),
                }
            prepared.append((photo, is_main, position, files, width, height))

        with transaction.atomic():
            keep = []
            for photo, is_main, position, files, width, height in prepared:
                obj, _ = WalkPhoto.objects.update_or_create(
                    walk=walk,
                    source_url=photo.url,
                    defaults={
                        "is_main": is_main,
                        "position": position,
                        "caption": photo.caption,
                        "width": width,
                        "height": height,
                    },
                )
                for field_name, (name, content) in files.items():
                    field = getattr(obj, field_name)
                    if field:
                        field.delete(save=False)
                    field.save(name, ContentFile(content), save=False)
                obj.save()
                keep.append(obj.pk)
            # Drop photos that disappeared from the page.
            for stale in walk.photos.exclude(pk__in=keep):
                stale.image.delete(save=False)
                stale.thumb.delete(save=False)
                stale.delete()
            walk.photo_source_url = page_url
            walk.save(update_fields=["photo_source_url", "updated_at"])
