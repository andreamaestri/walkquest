from datetime import date

from django.test import TestCase

from .models import Adventure
from .models import Walk


class AdventureModelTest(TestCase):
    def setUp(self):
        self.adventure = Adventure.objects.create(
            title="The Great Forest Traverse",
            description="An epic journey through the mystical woods",
            start_date=date(2023, 6, 1),
            end_date=date(2023, 8, 31),
            difficulty_level="LEGENDARY"
        )

    def test_adventure_creation(self):
        self.assertEqual(self.adventure.title, "The Great Forest Traverse")
        self.assertEqual(self.adventure.difficulty_level, "LEGENDARY")
