from django.db import migrations

# (name, task, crontab kwargs). Times avoid the 03:15-05:15 backup crons.
TASKS = [
    (
        "Refresh walk transport (NaPTAN + BODS)",
        "walkquest.walks.tasks.refresh_transport",
        {"minute": "30", "hour": "2", "day_of_week": "0"},
    ),
    (
        "Refresh walk train services (TransportAPI)",
        "walkquest.walks.tasks.refresh_train_services",
        {"minute": "45", "hour": "5", "day_of_week": "*"},
    ),
]


def schedule(apps, schema_editor):
    CrontabSchedule = apps.get_model("django_celery_beat", "CrontabSchedule")
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    for name, task, cron in TASKS:
        crontab, _ = CrontabSchedule.objects.get_or_create(
            day_of_month="*",
            month_of_year="*",
            timezone="UTC",
            **cron,
        )
        PeriodicTask.objects.get_or_create(
            name=name,
            defaults={"task": task, "crontab": crontab},
        )


def unschedule(apps, schema_editor):
    PeriodicTask = apps.get_model("django_celery_beat", "PeriodicTask")
    PeriodicTask.objects.filter(name__in=[name for name, _, _ in TASKS]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("walks", "0014_walk_transport_info"),
        ("django_celery_beat", "0018_improve_crontab_helptext"),
    ]

    operations = [migrations.RunPython(schedule, unschedule)]
