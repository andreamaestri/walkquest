import io
from pathlib import Path
from unittest import mock

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from PIL import Image

from walkquest.walks.iwalk import parse_walk_page
from walkquest.walks.models import WalkPhoto

from .factories import make_walk

SAMPLE = Path(__file__).with_name("iwalk_sample.html")


def test_parser_finds_main_photo_and_captioned_slides():
    page = parse_walk_page(SAMPLE.read_text())

    assert page.main.url.endswith("/main-photo/w926_lavethan_wood1.webp")
    assert [s.url.rsplit("/", 1)[-1] for s in page.slides] == [
        "w600_blisland_church.webp",
        "w1200_lavethan_bluebells.jpg",  # largest variant wins over w300_
        "w600_clapper_bridge.webp",
    ]
    assert page.slides[0].caption.startswith("The church of St Protus")
    assert page.slides[1].caption == "Bluebells carpet Lavethan Wood in late April."
    assert page.slides[2].caption == "Clapper bridge over the stream"


def test_parser_ignores_non_photo_images_and_scripts():
    page = parse_walk_page(SAMPLE.read_text())
    urls = [page.main.url] + [s.url for s in page.slides]
    assert not any("logo" in u or "ignored" in u for u in urls)


def test_parser_falls_back_to_og_image():
    html = (
        '<meta property="og:image" content="/images/photos/main-photo/w926_x.webp">'
        '<div class="slide"><img src="/images/photos/y.webp" alt="A stile"></div>'
    )
    page = parse_walk_page(html)
    assert page.main.url.endswith("w926_x.webp")
    assert page.slides[0].caption == "A stile"


def _jpeg_bytes(width=1200, height=800):
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), (20, 120, 128)).save(buffer, "JPEG")
    return buffer.getvalue()


@pytest.mark.django_db
def test_import_command_downloads_renditions(settings):
    walk = make_walk(walk_id="blisland_to_lavethan_wood")
    with (
        mock.patch(
            "walkquest.walks.management.commands.import_iwalk_photos.fetch",
            return_value=_jpeg_bytes(),
        ),
        mock.patch("walkquest.walks.management.commands.import_iwalk_photos.time.sleep"),
    ):
        call_command(
            "import_iwalk_photos",
            walk=[walk.walk_id],
            from_html=str(SAMPLE),
            stdout=io.StringIO(),
        )

    photos = list(walk.photos.all())
    assert len(photos) == 4
    main = photos[0]
    assert main.is_main
    assert main.width == 960
    assert main.height == 640
    assert main.image.name.endswith("-960.webp")
    assert main.thumb.name.endswith("-320.webp")
    assert photos[1].caption.startswith("The church")
    walk.refresh_from_db()
    assert walk.photo_source_url == "https://www.iwalkcornwall.co.uk/walk/blisland_to_lavethan_wood"


@pytest.mark.django_db
def test_import_is_idempotent_and_removes_stale_photos():
    walk = make_walk(walk_id="blisland_to_lavethan_wood")
    WalkPhoto.objects.create(walk=walk, source_url="https://example.com/old.webp", position=9)
    kwargs = {"walk": [walk.walk_id], "from_html": str(SAMPLE), "hotlink": True, "stdout": io.StringIO()}
    call_command("import_iwalk_photos", **kwargs)
    call_command("import_iwalk_photos", **kwargs)
    assert walk.photos.count() == 4
    assert not walk.photos.filter(source_url__contains="old.webp").exists()


@pytest.mark.django_db
def test_from_html_requires_single_walk():
    make_walk(walk_id="a")
    make_walk(walk_id="b")
    with pytest.raises(CommandError):
        call_command("import_iwalk_photos", from_html=str(SAMPLE), refresh=True, stdout=io.StringIO())
