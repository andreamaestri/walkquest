import os
import subprocess
import sys
import tempfile
from datetime import UTC
from datetime import datetime
from pathlib import Path

import boto3
from botocore.config import Config
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
BACKUP_PREFIX = "db-backups/"
BUCKET_RETENTION = 14
LOCAL_DIR = Path("/srv/django/db-backups")
LOCAL_RETENTION = 7

load_dotenv("/srv/django/jobless/.env")
load_dotenv("/etc/walkquest.env")

ENDPOINT = os.environ.get("AWS_S3_ENDPOINT_URL") or (
    f"https://{os.environ['OCI_NAMESPACE']}.compat.objectstorage."
    f"{os.environ['OCI_REGION']}.oraclecloud.com"
)
ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY_ID") or os.environ["OCI_ACCESS_KEY"]
SECRET_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY") or os.environ["OCI_SECRET_KEY"]
BUCKET = os.environ.get("AWS_STORAGE_BUCKET_NAME") or os.environ["OCI_BUCKET_NAME"]


def pg_dump(db, dump_path):
    env = os.environ.copy()
    env["PGPASSWORD"] = db["PASSWORD"]
    subprocess.run(
        [
            "pg_dump",
            "-Fc",
            "-h",
            db["HOST"] or "127.0.0.1",
            "-p",
            str(db["PORT"] or 5432),
            "-U",
            db["USER"],
            "-d",
            db["NAME"],
            "-f",
            dump_path,
        ],
        env=env,
        check=True,
    )


def main():
    db = {
        "USER": os.environ["POSTGRES_USER"],
        "PASSWORD": os.environ["POSTGRES_PASSWORD"],
        "HOST": os.environ["POSTGRES_HOST"],
        "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        "NAME": os.environ["POSTGRES_DB"],
    }
    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    filename = f"walkquest-{stamp}.dump"

    with tempfile.TemporaryDirectory() as tmp:
        dump_path = str(Path(tmp) / filename)
        pg_dump(db, dump_path)

        # PostGIS spatial data: extra dump for safety, same retention
        pg_dump(db, dump_path + ".spatial.dump")

        local_path = LOCAL_DIR / filename
        local_path.write_bytes(Path(dump_path).read_bytes())

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
        for name in (filename, filename + ".spatial.dump"):
            s3.upload_file(str(Path(tmp) / name), BUCKET, BACKUP_PREFIX + name)
        size = Path(dump_path).stat().st_size

    paginator = s3.get_paginator("list_objects_v2")
    objects = []
    for page in paginator.paginate(Bucket=BUCKET, Prefix=BACKUP_PREFIX + "walkquest-"):
        objects.extend(page.get("Contents", []))
    objects = [
        o for o in objects if o["Key"].endswith(".dump") and ".spatial" not in o["Key"]
    ]
    objects.sort(key=lambda o: o["LastModified"])
    for obj in objects[:-BUCKET_RETENTION]:
        s3.delete_object(Bucket=BUCKET, Key=obj["Key"])

    local_backups = sorted(LOCAL_DIR.glob("walkquest-*.dump"))
    local_only = [
        p for p in local_backups if p.suffix == ".dump" and ".spatial" not in p.name
    ]
    for old in local_only[:-LOCAL_RETENTION]:
        old.unlink()
        for sibling in (LOCAL_DIR / (old.name + ".spatial.dump"),):
            if sibling.exists():
                sibling.unlink()

    print(f"{datetime.now(UTC).isoformat()} backup OK: {filename} ({size} bytes)")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"{datetime.now(UTC).isoformat()} backup FAILED: {e}", file=sys.stderr)
        sys.exit(1)
