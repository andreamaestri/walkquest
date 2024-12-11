from django.core.management.base import BaseCommand
from rapidfuzz import fuzz

from walkquest.walks.models import Walk


class Command(BaseCommand):
    help = "Contextually assign the most prominent feature to each walk"

    # Feature definitions with refined keywords
    FEATURE_DEFINITIONS = {
        "coastal": {
            "priority": 1,
            "keywords": ["coast", "beach", "harbour", "cliff", "cove", "seaside", "shoreline", "bay"],
            "gis_check": lambda route: False,  # Disable or adjust as needed
        },
        "woodland": {
            "priority": 2,
            "keywords": ["wood", "forest", "tree", "copse", "broadleaf", "ancient woodland"],
        },
        "historic": {
            "priority": 3,
            "keywords": ["castle", "ancient", "medieval", "historic", "heritage", "ruin", "monument"],
        },
        "pub": {
            "priority": 4,
            "keywords": ["pub", "inn", "tavern", "ale house"],
            "property_check": lambda walk: walk.has_pub,
        },
        "cafe": {
            "priority": 5,
            "keywords": ["cafe", "coffee", "tea room", "tearoom"],
            "property_check": lambda walk: walk.has_cafe,
        },
        "wildlife": {
            "priority": 6,
            "keywords": ["bird", "seal", "wildlife", "nature", "animal", "fauna"],
        },
        "circular": {
            "priority": 7,
            "keywords": ["circular", "loop", "round trip"],
            "route_check": lambda route: route and route.start_point.equals(route.end_point),
        },
        "scenic": {
            "priority": 8,
            "keywords": ["view", "panorama", "vista", "scenic", "landscape"],
        },
    }

    MATCH_THRESHOLD = 85  # Increased threshold to reduce false positives

    def detect_features(self, walk):
        detected = {}

        # Combine relevant text fields
        text_content = f"{walk.highlights or ''} {walk.points_of_interest or ''} {walk.description or ''}".lower()

        # Check each feature
        for feature_name, definition in self.FEATURE_DEFINITIONS.items():
            score = 0

            # Use full-word matching
            for keyword in definition["keywords"]:
                if f" {keyword} " in f" {text_content} ":
                    score = 100
                    break
                fuzzy_score = fuzz.token_set_ratio(keyword, text_content)
                score = max(score, fuzzy_score)

            # Check property flags if defined
            if "property_check" in definition and definition["property_check"](walk):
                score = max(score, 100)

            # Check GIS conditions if defined
            if "gis_check" in definition and definition["gis_check"](walk.route_geometry):
                score = max(score, 90)

            # Store feature if it meets threshold
            if score >= self.MATCH_THRESHOLD:
                detected[feature_name] = {
                    "priority": definition["priority"],
                    "score": score,
                }

        return detected

    def handle(self, *args, **kwargs):
        walks = Walk.objects.all()
        processed = 0

        for walk in walks:
            detected_features = self.detect_features(walk)

            if detected_features:
                # Select feature with highest priority (lowest number) and highest score
                best_feature = min(
                    detected_features.items(),
                    key=lambda x: (x[1]["priority"], -x[1]["score"]),
                )[0]

                walk.features = [best_feature]
                walk.save()

                self.stdout.write(
                    f"Walk '{walk.walk_name}': Assigned feature '{best_feature}' "
                    f"(Priority: {detected_features[best_feature]['priority']}, "
                    f"Score: {detected_features[best_feature]['score']})",
                )
                processed += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Feature assignment complete! Processed {processed} walks.",
            ),
        )
