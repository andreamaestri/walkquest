web: gunicorn config.wsgi:application --workers 2 --threads 4 --timeout 60 --access-logfile -
worker: celery -A config.celery_app worker --loglevel=INFO
beat: celery -A config.celery_app beat --loglevel=INFO --scheduler django_celery_beat.schedulers:DatabaseScheduler
