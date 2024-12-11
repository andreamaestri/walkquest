from datetime import date

from django.test import TestCase

from .models import Adventure


class AdventureModelTest(TestCase):
    def setUp(self):
        self.adventure = Adventure.objects.create(
            title="The Great Forest Traverse",
            description="An epic journey through the mystical woods",
            start_date=date(2023, 6, 1),
            end_date=date(2023, 8, 31),
            difficulty_level="LEGENDARY",
        )

    def test_adventure_creation(self):
        assert self.adventure.title == "The Great Forest Traverse"
        assert self.adventure.difficulty_level == "LEGENDARY"
