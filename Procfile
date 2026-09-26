web: gunicorn config.wsgi:application --workers 2 --threads 4 --timeout 60 --access-logfile -
worker: ORACLE_POOL_MAX=1 celery -A config.celery_app worker --loglevel=INFO --concurrency=2
beat: ORACLE_POOL_MAX=1 celery -A config.celery_app beat --loglevel=INFO --scheduler django_celery_beat.schedulers:DatabaseScheduler
