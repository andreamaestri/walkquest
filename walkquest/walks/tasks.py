from celery import shared_task
from django.core.management import call_command


@shared_task()
def refresh_bus_routes():
    """Daily TransportAPI top-up, kept inside the free plan's 30 hits/day."""
    call_command("refresh_bus_routes")
