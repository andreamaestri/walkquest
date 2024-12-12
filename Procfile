release: python manage.py collectstatic --noinput
web: gunicorn config.wsgi:application