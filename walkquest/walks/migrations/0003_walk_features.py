# Generated by Django 5.1.3 on 2024-12-05 13:06

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("walks", "0002_remove_walk_description_remove_walk_title"),
    ]

    operations = [
        migrations.AddField(
            model_name="walk",
            name="features",
            field=models.JSONField(
                blank=True,
                help_text="List of features for this walk, e.g., ['coastal', 'historic']",
                null=True,
                verbose_name="Features",
            ),
        ),
    ]