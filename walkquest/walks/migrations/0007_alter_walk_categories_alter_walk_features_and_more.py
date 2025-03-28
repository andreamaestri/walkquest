# Generated by Django 5.1.3 on 2024-12-16 16:44

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('walks', '0006_alter_walk_categories'),
    ]

    operations = [
        migrations.AlterField(
            model_name='walk',
            name='categories',
            field=models.ManyToManyField(blank=True, help_text='Primary categories for this walk', related_name='categorized_walks', to='walks.walkcategorytag'),
        ),
        migrations.AlterField(
            model_name='walk',
            name='features',
            field=models.ManyToManyField(blank=True, help_text='Features present on this walk', related_name='walks', to='walks.walkfeaturetag'),
        ),
        migrations.AlterField(
            model_name='walk',
            name='related_categories',
            field=models.ManyToManyField(blank=True, help_text='Categories associated with this walk', related_name='related_walks', to='walks.walkcategorytag'),
        ),
    ]
