from django.contrib.gis.geos import LineString

from walkquest.walks.models import Walk


def make_walk(walk_id="test_walk", **kwargs):
    defaults = {
        "walk_name": walk_id.replace("_", " ").title(),
        "latitude": 50.5,
        "longitude": -4.7,
        "distance": 3.2,
        "steepness_level": " Warden’s Ascent",
        "highlights": "Bluebells; granite tors; a holy well hidden in the woods.",
        "points_of_interest": "Blisland Church; Lavethan Wood",
        "route_geometry": LineString((-4.70, 50.50), (-4.69, 50.51), (-4.68, 50.50), srid=4326),
    }
    defaults.update(kwargs)
    return Walk.objects.create(walk_id=walk_id, **defaults)
