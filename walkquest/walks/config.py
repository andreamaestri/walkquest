import json

from django.core.serializers.json import DjangoJSONEncoder


class WalkQuestConfig:
    MAP = {
        "style": "mapbox://styles/mapbox/outdoors-v12?optimize=true",
        "defaultCenter": [-4.85, 50.4],
        "defaultZoom": 9,
        "markerColors": {
            "default": "#4F46E5",
            "selected": "#DC2626",
        },
    }

    VIRTUALIZER = {
        "itemHeight": 92,
        "overscan": 5,
        "debounceMs": 300,
    }

    @classmethod
    def get_config(cls, statistics=None):
        """Get full config with optional statistics"""
        config = {
            "map": cls.MAP,
            "virtualizer": cls.VIRTUALIZER,
            "filters": {
                "difficulties": [
                    "GREY'S PATHFINDER",
                    "MASTER WAYFARER",
                    "NOVICE WANDERER",
                    "TRAIL RANGER",
                    "WARDEN'S ASCENT",
                ],
                "features": [
                    "cafe",
                    "coastal",
                    "historic",
                    "pub",
                    "wildlife",
                    "woodland",
                ],
            },
        }
        if statistics:
            config["filters"]["statistics"] = statistics
        return config

    @classmethod
    def to_json(cls, statistics=None):
        """Convert config to JSON string"""
        return json.dumps(
            cls.get_config(statistics),
            cls=DjangoJSONEncoder,
        )
