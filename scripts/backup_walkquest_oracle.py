"""Daily backup of WalkQuest's Oracle (Autonomous Database) data.

Exports every app's rows with Django's ``dumpdata`` (natural foreign keys,
original primary keys), gzips it and uploads it to OCI Object Storage next to
the PostgreSQL dumps (``db-backups/`` prefix, 14-day bucket retention, 7 local).

Run with the jobless venv (it has boto3/dotenv), like the other backup scripts:

    /srv/django/jobless/.venv/bin/python /srv/django/walkquest/scripts/backup_walkquest_oracle.py

Restore into an empty, migrated database:

    gunzip -k walkquest-oracle-<stamp>.json.gz
    python manage.py loaddata walkquest-oracle-<stamp>.json
"""

import gzip
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import UTC
from datetime import datetime
from pathlib import Path

import boto3
from botocore.config import Config
from dotenv import dotenv_values
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
PYTHON = BASE_DIR / ".venv" / "bin" / "python"
BACKUP_PREFIX = "db-backups/"
NAME_PREFIX = "walkquest-oracle-"
BUCKET_RETENTION = 14
LOCAL_DIR = Path("/srv/django/db-backups")
LOCAL_RETENTION = 7
EXCLUDE = ["contenttypes", "auth.permission", "sessions"]

load_dotenv("/srv/django/jobless/.env")

ENDPOINT = os.environ.get("AWS_S3_ENDPOINT_URL") or (
    f"https://{os.environ['OCI_NAMESPACE']}.compat.objectstorage."
    f"{os.environ['OCI_REGION']}.oraclecloud.com"
)
ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY_ID") or os.environ["OCI_ACCESS_KEY"]
SECRET_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY") or os.environ["OCI_SECRET_KEY"]
BUCKET = os.environ.get("AWS_STORAGE_BUCKET_NAME") or os.environ["OCI_BUCKET_NAME"]


def dumpdata(json_path):
    # The app's own environment (Oracle credentials/wallet) comes from
    # /etc/walkquest.env, parsed rather than sourced.
    env = {**os.environ, **dotenv_values("/etc/walkquest.env")}
    env["DJANGO_SETTINGS_MODULE"] = "config.settings.production"
    args = [str(PYTHON), "manage.py", "dumpdata", "--natural-foreign", "--output", str(json_path)]
    for label in EXCLUDE:
        args += ["--exclude", label]
    subprocess.run(args, cwd=BASE_DIR, env=env, check=True, stdout=subprocess.DEVNULL)


def main():
    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    filename = f"{NAME_PREFIX}{stamp}.json.gz"

    with tempfile.TemporaryDirectory() as tmp:
        json_path = Path(tmp) / "walkquest.json"
        dumpdata(json_path)
        gz_path = Path(tmp) / filename
        with json_path.open("rb") as src, gzip.open(gz_path, "wb", compresslevel=9) as dst:
            shutil.copyfileobj(src, dst)

        local_path = LOCAL_DIR / filename
        shutil.copyfile(gz_path, local_path)
        local_path.chmod(0o640)

        s3 = boto3.client(
            "s3",
            endpoint_url=ENDPOINT,
            aws_access_key_id=ACCESS_KEY,
            aws_secret_access_key=SECRET_KEY,
            region_name=os.environ.get("OCI_REGION", "uk-london-1"),
            config=Config(
                s3={"addressing_style": "path"},
                request_checksum_calculation="when_required",
                response_checksum_validation="when_required",
            ),
        )
        s3.upload_file(str(gz_path), BUCKET, BACKUP_PREFIX + filename)
        size = gz_path.stat().st_size

    paginator = s3.get_paginator("list_objects_v2")
    objects = []
    for page in paginator.paginate(Bucket=BUCKET, Prefix=BACKUP_PREFIX + NAME_PREFIX):
        objects.extend(page.get("Contents", []))
    objects.sort(key=lambda o: o["LastModified"])
    for obj in objects[:-BUCKET_RETENTION]:
        s3.delete_object(Bucket=BUCKET, Key=obj["Key"])

    for old in sorted(LOCAL_DIR.glob(f"{NAME_PREFIX}*.json.gz"))[:-LOCAL_RETENTION]:
        old.unlink()

    print(f"{datetime.now(UTC).isoformat()} backup OK: {filename} ({size} bytes)")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001 - report every failure in the log
        print(f"{datetime.now(UTC).isoformat()} backup FAILED: {e}", file=sys.stderr)
        sys.exit(1)
