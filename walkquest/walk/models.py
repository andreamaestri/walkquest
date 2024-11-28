from uuid import uuid4

from django.contrib.gis.db import models


# Create your models here.
class Walk(models.Model):
    # Auto-increment primary key
    id = models.AutoField(primary_key=True)

    # UUID for public-facing lookups
    public_id = models.UUIDField(
        default=uuid4, editable=False, unique=True, db_index=True
    )

    # Adventure Foreign Key, points to the adventure this walk is part of
    adventure = models.ForeignKey(
        "Adventure",  # Replace 'Adventure' with your actual adventure model
        on_delete=models.CASCADE,
        related_name="walks",
    )

    # Path of the walk stored as a string (to store the route, could be GeoJSON string or similar format)
    path = models.TextField()  # TextField to store the path as a string 
                               # (GeoJSON format or simple serialized data)

    # Distance of the walk in kilometers (float for decimals)
    distance = models.FloatField()

    # Elevation gain of the walk in meters
    elevation_gain = models.FloatField()

    # Waypoints as JSON (stores a list of GPS coordinates or detailed information about key points)
    map_data = models.JSONField(blank=True, null=True)

    # Timestamp for when the walk was created
    created_at = models.DateTimeField(auto_now_add=True)

    # Timestamp for when the walk was last updated
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Walk: {self.public_id} - {self.adventure.name} - {self.distance} km"
