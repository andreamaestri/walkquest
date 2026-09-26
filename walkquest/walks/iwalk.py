"""Extract walk photos (and their captions) from iWalk Cornwall walk pages.

Pages live at ``https://www.iwalkcornwall.co.uk/walk/<walk_id>`` and serve
photos from ``/images/photos/…``; the main photo is under
``/images/photos/main-photo/`` (e.g. ``w926_lavethan_wood1.webp``) and the
slideshow photos appear in page order with caption text beside them.

The parser deliberately relies on those URL conventions rather than exact
CSS classes, so small markup changes don't break it. Only the standard
library is used.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from dataclasses import field
from html.parser import HTMLParser
from urllib.parse import urljoin
from urllib.parse import urlparse

BASE_URL = "https://www.iwalkcornwall.co.uk"
PHOTO_PATH = "/images/photos/"
MAIN_PHOTO_PATH = "/images/photos/main-photo/"
IMAGE_EXTENSIONS = (".webp", ".jpg", ".jpeg", ".png", ".avif")
_WIDTH_PREFIX = re.compile(r"^w(\d+)_")
_CAPTION_ATTRS = (
    "data-caption",
    "data-title",
    "data-sub-html",
    "title",
    "alt",
    "aria-label",
)
_CONTAINER_TAGS = {"figure", "li", "div", "article", "section", "a", "p"}
_BLOCK_HINTS = (
    "slide",
    "photo",
    "gallery",
    "carousel",
    "swiper",
    "item",
    "figure",
    "caption",
    "image",
)
_MAX_CAPTION = 600


def walk_page_url(walk_id: str) -> str:
    return f"{BASE_URL}/walk/{walk_id}"


@dataclass
class ParsedPhoto:
    url: str
    caption: str = ""
    width_hint: int = 0
    order: int = 0

    @property
    def key(self) -> str:
        """Identity of the underlying photo across size variants (w300_/w926_)."""
        name = urlparse(self.url).path.rsplit("/", 1)[-1]
        name = _WIDTH_PREFIX.sub("", name)
        return name.rsplit(".", 1)[0].lower()


@dataclass
class ParsedWalkPage:
    main: ParsedPhoto | None = None
    slides: list[ParsedPhoto] = field(default_factory=list)


def _clean(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text[:_MAX_CAPTION].rstrip()


def _is_photo_url(url: str) -> bool:
    path = urlparse(url).path.lower()
    return PHOTO_PATH in path and path.endswith(IMAGE_EXTENSIONS)


def _width_hint(url: str, descriptor: str = "") -> int:
    match = re.match(r"(\d+)w$", descriptor.strip())
    if match:
        return int(match.group(1))
    name = urlparse(url).path.rsplit("/", 1)[-1]
    match = _WIDTH_PREFIX.match(name)
    return int(match.group(1)) if match else 0


def _srcset(value: str) -> list[tuple[str, str]]:
    items = []
    for part in (value or "").split(","):
        bits = part.strip().split()
        if bits:
            items.append((bits[0], bits[1] if len(bits) > 1 else ""))
    return items


class _Container:
    __slots__ = ("is_caption", "photos", "tag", "text")

    def __init__(self, tag: str, is_caption: bool):
        self.tag = tag
        self.text: list[str] = []
        self.photos: list[ParsedPhoto] = []
        self.is_caption = is_caption


class _WalkPageParser(HTMLParser):
    def __init__(self, base_url: str):
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.photos: list[ParsedPhoto] = []
        self.og_image: str | None = None
        self.stack: list[_Container] = []
        self._skip_depth = 0  # inside <script>/<style>

    # -- helpers -------------------------------------------------------------
    def _add(self, raw_url: str, attrs: dict, descriptor: str = "") -> None:
        url = urljoin(self.base_url, raw_url.strip())
        if not _is_photo_url(url):
            return
        caption = ""
        for name in _CAPTION_ATTRS:
            value = _clean(attrs.get(name, ""))
            # Ignore auto-generated alt text that is just the file name.
            if value and not value.lower().endswith(IMAGE_EXTENSIONS):
                caption = value
                break
        photo = ParsedPhoto(
            url=url,
            caption=caption,
            width_hint=_width_hint(url, descriptor),
            order=len(self.photos),
        )
        self.photos.append(photo)
        for container in self.stack:
            container.photos.append(photo)

    # -- HTMLParser hooks ----------------------------------------------------
    def handle_starttag(self, tag, attrs_list):
        attrs = {k: (v or "") for k, v in attrs_list}
        if tag in ("script", "style", "noscript"):
            self._skip_depth += 1
            return
        if (
            tag == "meta"
            and attrs.get("property") == "og:image"
            and attrs.get("content")
        ):
            self.og_image = urljoin(self.base_url, attrs["content"])
        if tag in _CONTAINER_TAGS:
            classes = (attrs.get("class", "") + " " + attrs.get("id", "")).lower()
            is_caption = (
                tag == "figcaption" or "caption" in classes or "desc" in classes
            )
            if tag in ("figure", "li") or any(h in classes for h in _BLOCK_HINTS):
                self.stack.append(_Container(tag, is_caption))
        if tag == "figcaption":
            self.stack.append(_Container(tag, True))

        if tag in ("img", "source"):
            for key in ("data-src", "data-lazy", "data-original", "src"):
                if attrs.get(key):
                    self._add(attrs[key], attrs)
            for key in ("srcset", "data-srcset"):
                for url, descriptor in _srcset(attrs.get(key, "")):
                    self._add(url, attrs, descriptor)
        elif tag == "a" and attrs.get("href"):
            self._add(attrs["href"], attrs)
        style = attrs.get("style", "")
        for url in re.findall(r"url\(['\"]?([^'\")]+)['\"]?\)", style):
            self._add(url, attrs)

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript"):
            self._skip_depth = max(0, self._skip_depth - 1)
            return
        # Close the innermost matching container, assigning its text as the
        # caption for photos inside it that don't have one yet.
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i].tag == tag:
                container = self.stack.pop(i)
                text = _clean(" ".join(container.text))
                # Only treat text as a caption when the block is about a single
                # photo (all size variants of one image), not a whole section.
                if text and len({p.key for p in container.photos}) == 1:
                    for photo in container.photos:
                        if (
                            not photo.caption
                            or container.is_caption
                            or len(text) > len(photo.caption)
                        ):
                            photo.caption = text
                # Text inside a nested container also belongs to its parents.
                if self.stack and container.text:
                    self.stack[-1].text.extend(container.text)
                break

    def handle_data(self, data):
        if self._skip_depth or not data.strip():
            return
        if self.stack:
            self.stack[-1].text.append(data)


def parse_walk_page(html: str, base_url: str = BASE_URL) -> ParsedWalkPage:
    """Parse a walk page into its main photo and ordered slideshow photos."""
    parser = _WalkPageParser(base_url)
    parser.feed(html)
    parser.close()

    # Collapse size variants of the same photo, keeping the largest rendition,
    # the first position it appeared at, and the best caption seen.
    best: dict[str, ParsedPhoto] = {}
    for photo in parser.photos:
        current = best.get(photo.key)
        if current is None:
            best[photo.key] = ParsedPhoto(
                photo.url, photo.caption, photo.width_hint, photo.order,
            )
            continue
        if photo.width_hint > current.width_hint:
            current.url, current.width_hint = photo.url, photo.width_hint
        if photo.caption and len(photo.caption) > len(current.caption):
            current.caption = photo.caption

    photos = sorted(best.values(), key=lambda p: p.order)
    main = next((p for p in photos if MAIN_PHOTO_PATH in urlparse(p.url).path), None)
    if main is None and parser.og_image and _is_photo_url(parser.og_image):
        main = ParsedPhoto(url=parser.og_image, width_hint=_width_hint(parser.og_image))
    slides = [p for p in photos if main is None or p.key != main.key]
    return ParsedWalkPage(main=main, slides=slides)
