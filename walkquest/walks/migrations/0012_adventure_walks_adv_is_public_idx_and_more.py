# Generated by Django 5.1.3 on 2025-04-02 10:28

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('walks', '0011_adventure_is_public'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddIndex(
            model_name='adventure',
            index=models.Index(fields=['is_public'], name='walks_adv_is_public_idx'),
        ),
        migrations.AddIndex(
            model_name='adventure',
            index=models.Index(fields=['created_at'], name='walks_adv_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='adventure',
            index=models.Index(fields=['title'], name='walks_adv_title_idx'),
        ),
        migrations.AddIndex(
            model_name='walk',
            index=models.Index(fields=['steepness_level'], name='walks_walk_steepness_idx'),
        ),
        migrations.AddIndex(
            model_name='walk',
            index=models.Index(fields=['footwear_category'], name='walks_walk_footwear_idx'),
        ),
        migrations.AddIndex(
            model_name='walk',
            index=models.Index(fields=['has_pub'], name='walks_walk_has_pub_idx'),
        ),
        migrations.AddIndex(
            model_name='walk',
            index=models.Index(fields=['has_cafe'], name='walks_walk_has_cafe_idx'),
        ),
        migrations.AddIndex(
            model_name='walk',
            index=models.Index(fields=['adventure'], name='walks_walk_adventure_idx'),
        ),
        migrations.AddIndex(
            model_name='walk',
            index=models.Index(fields=['latitude', 'longitude'], name='walks_walk_location_idx'),
        ),
        migrations.AddIndex(
            model_name='walkcategorytag',
            index=models.Index(fields=['name'], name='walks_cat_name_idx'),
        ),
        migrations.AddIndex(
            model_name='walkcategorytag',
            index=models.Index(fields=['slug'], name='walks_cat_slug_idx'),
        ),
        migrations.AddIndex(
            model_name='walkcategorytag',
            index=models.Index(fields=['count'], name='walks_cat_count_idx'),
        ),
        migrations.AddIndex(
            model_name='walkfeaturetag',
            index=models.Index(fields=['name'], name='walks_feat_name_idx'),
        ),
        migrations.AddIndex(
            model_name='walkfeaturetag',
            index=models.Index(fields=['slug'], name='walks_feat_slug_idx'),
        ),
        migrations.AddIndex(
            model_name='walkfeaturetag',
            index=models.Index(fields=['count'], name='walks_feat_count_idx'),
        ),
    ]
