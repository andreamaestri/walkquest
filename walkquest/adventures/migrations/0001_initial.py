# Generated by Django 5.1.3 on 2024-12-11 14:24

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('walks', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Achievement',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated')),
                ('conquered_date', models.DateTimeField(verbose_name='Conquered Date')),
                ('attempts', models.PositiveIntegerField(default=0, verbose_name='Attempts')),
                ('best_time', models.FloatField(blank=True, null=True, verbose_name='Best Time')),
                ('completion_time', models.FloatField(blank=True, null=True, verbose_name='Completion Time')),
                ('visibility', models.CharField(choices=[('PUBLIC', 'Public'), ('PRIVATE', 'Private'), ('FRIENDS', 'Friends Only')], default='PUBLIC', max_length=10, verbose_name='Visibility')),
                ('status', models.CharField(choices=[('IN_PROGRESS', 'In Progress'), ('COMPLETED', 'Completed'), ('ABANDONED', 'Abandoned')], default='IN_PROGRESS', max_length=20, verbose_name='Status')),
                ('adventure', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='achievements', to='walks.adventure', verbose_name='Adventure')),
            ],
            options={
                'verbose_name': 'achievement',
                'verbose_name_plural': 'achievements',
                'ordering': ['-conquered_date'],
            },
        ),
    ]
