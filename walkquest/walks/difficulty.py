"""Normalise the free-form steepness/difficulty strings stored on walks.

Fixture data uses title case, stray whitespace and curly apostrophes
(e.g. " Warden’s Ascent"), so compare on a canonical key instead.
"""

import re

LEVELS = [
    # (key, level 1-5, display label, short label)
    ("NOVICE WANDERER", 1, "Novice Wanderer", "Easy"),
    ("GREY'S PATHFINDER", 2, "Grey's Pathfinder", "Easy–moderate"),
    ("TRAIL RANGER", 3, "Trail Ranger", "Moderate"),
    ("WARDEN'S ASCENT", 4, "Warden's Ascent", "Challenging"),
    ("MASTER WAYFARER", 5, "Master Wayfarer", "Strenuous"),
]
_BY_KEY = {key: (key, level, label, short) for key, level, label, short in LEVELS}


def canonical(value: str | None) -> str:
    if not value:
        return ""
    value = value.replace("’", "'").replace("‘", "'")
    return re.sub(r"\s+", " ", value).strip().upper()


def normalize_difficulty(value: str | None) -> dict:
    """Return ``{"key", "level", "label", "short"}`` for a raw steepness string."""
    key = canonical(value)
    if key not in _BY_KEY:
        # Loose matching for partial/legacy values ("NOVICE", "Warden's", …)
        for candidate in _BY_KEY:
            first_word = candidate.split(" ")[0]
            if key and (key.startswith(first_word) or first_word.startswith(key)):
                key = candidate
                break
        else:
            key = "NOVICE WANDERER"
    key, level, label, short = _BY_KEY[key]
    return {"key": key, "level": level, "label": label, "short": short}
