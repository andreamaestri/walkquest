from django.db import migrations

TASK_NAME = "Refresh walk bus routes (TransportAPI)"


def schedule(apps, schema_editor):
    CrontabSchedule = apps.get_model("django_celery_beat", "CrontabSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    crontab, _ = CrontabSchedule.objects.get_or_create(
        minute="45",
        hour="4",
        day_of_week="*",
        day_of_month="*",
        month_of_year="*",
        timezone="UTC",
    )
    PeriodicTask.objects.get_or_create(
        name=TASK_NAME,
        defaults={
            "task": "walkquest.walks.tasks.refresh_bus_routes",
            "crontab": crontab,
        },
    )


def unschedule(apps, schema_editor):
    apps.get_model("django_celery_beat", "PeriodicTask").objects.filter(
        name=TASK_NAME,
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("walks", "0014_walk_transport_info"),
        ("django_celery_beat", "0018_improve_crontab_helptext"),
    ]

    operations = [migrations.RunPython(schedule, unschedule)]
