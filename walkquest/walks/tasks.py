from celery import shared_task
from django.core.management import call_command


@shared_task()
def refresh_transport():
    """Weekly: bus stops, lines and stations from NaPTAN + BODS (keyless)."""
    call_command("refresh_transport")


@shared_task()
def refresh_train_services():
    """Daily TransportAPI top-up, kept inside the free plan's 30 hits/day."""
    call_command("refresh_train_services")
