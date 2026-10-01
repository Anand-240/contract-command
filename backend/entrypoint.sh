#!/bin/sh
set -eu

python - <<'PY'
import os
import time
import psycopg
from urllib.parse import urlparse

url = os.environ.get('DATABASE_URL', '')
if urlparse(url).scheme not in ('postgres', 'postgresql'):
    raise SystemExit('DATABASE_URL must be a PostgreSQL connection string')
for attempt in range(60):
    try:
        with psycopg.connect(url, connect_timeout=3, sslmode=os.environ.get('DB_SSLMODE', 'require')) as connection:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
        break
    except psycopg.OperationalError:
        time.sleep(2)
else:
    raise SystemExit('PostgreSQL did not become available')
PY

python manage.py migrate --noinput
python manage.py collectstatic --noinput
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 3 --timeout 60
