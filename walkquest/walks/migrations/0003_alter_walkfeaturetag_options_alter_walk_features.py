# Generated by Django 5.1.3 on 2024-12-11 18:53

import tagulous.models.fields
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('walks', '0002_remove_walk_features_walkfeaturetag_walk_features'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='walkfeaturetag',
            options={'verbose_name': 'Walk Feature', 'verbose_name_plural': 'Walk Features'},
        ),
        migrations.AlterField(
            model_name='walk',
            name='features',
            field=tagulous.models.fields.TagField(_set_tag_meta=True, autocomplete_view='walks:feature-autocomplete', blank=True, case_sensitive=False, force_lowercase=True, help_text='Features of this walk', initial='cafe, coastal, historic, pub, wildlife, woodland', protect_initial=True, related_name='walks', space_delimiter=False, to='walks.walkfeaturetag'),
        ),
    ]