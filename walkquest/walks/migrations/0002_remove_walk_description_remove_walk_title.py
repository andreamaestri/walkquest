# Generated by Django 5.1.3 on 2024-12-03 09:22

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('walks', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='walk',
            name='description',
        ),
        migrations.RemoveField(
            model_name='walk',
            name='title',
        ),
    ]