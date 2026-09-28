"""Database configuration: PostgreSQL/PostGIS (default) or Oracle.

Select the backend with DJANGO_DB_BACKEND=postgis|oracle.

PostgreSQL: DATABASE_URL, or POSTGRES_HOST/_PORT/_DB/_USER/_PASSWORD.
Oracle (Autonomous Database / Oracle Database Free, with Oracle Spatial):
    ORACLE_DSN       Easy Connect or full descriptor, e.g. the TLS connection
                     string from the OCI console, or localhost:1521/FREEPDB1
    ORACLE_USER, ORACLE_PASSWORD
    ORACLE_POOL_MAX  connections per process (default 4; Always Free allows
                     20 sessions in total)
    ORACLE_WALLET_DIR, ORACLE_WALLET_PASSWORD   only for mTLS wallets

When the default database is PostgreSQL and ORACLE_DSN is set, an extra
"oracle" alias is configured so `manage.py copy_to_oracle` can copy data.
"""

POSTGIS_ENGINE = "django.contrib.gis.db.backends.postgis"
ORACLE_ENGINE = "walkquest.db.oracle"  # GeoDjango Oracle + migration portability fix


def postgres_database(env):
    if env("POSTGRES_HOST", default=None):
        db = {
            "NAME": env("POSTGRES_DB"),
            "USER": env("POSTGRES_USER"),
            "PASSWORD": env("POSTGRES_PASSWORD"),
            "HOST": env("POSTGRES_HOST"),
            "PORT": env("POSTGRES_PORT", default="5432"),
        }
    else:
        db = env.db("DATABASE_URL", default="postgis:///walkquest")
    db["ENGINE"] = POSTGIS_ENGINE
    db["ATOMIC_REQUESTS"] = env.bool("ATOMIC_REQUESTS", default=False)
    db["CONN_MAX_AGE"] = env.int("CONN_MAX_AGE", default=60)
    db["OPTIONS"] = {"connect_timeout": 10}
    return db


def oracle_database(env):
    options = {
        # Django 5.2 native pooling (python-oracledb). Replaces persistent
        # connections, so CONN_MAX_AGE must stay 0.
        "pool": {
            "min": 1,
            "max": env.int("ORACLE_POOL_MAX", default=4),
            "increment": 1,
        },
    }
    wallet_dir = env("ORACLE_WALLET_DIR", default=None)
    if wallet_dir:
        options.update(
            config_dir=wallet_dir,
            wallet_location=wallet_dir,
            wallet_password=env("ORACLE_WALLET_PASSWORD", default=None),
        )
    return {
        "ENGINE": ORACLE_ENGINE,
        "NAME": env("ORACLE_DSN"),
        "USER": env("ORACLE_USER"),
        "PASSWORD": env("ORACLE_PASSWORD"),
        "HOST": "",
        "PORT": "",
        "ATOMIC_REQUESTS": env.bool("ATOMIC_REQUESTS", default=False),
        "CONN_MAX_AGE": 0,
        "OPTIONS": options,
    }


def database_settings(env):
    backend = env("DJANGO_DB_BACKEND", default="postgis").lower()
    if backend == "oracle":
        return {"default": oracle_database(env)}
    if backend not in ("postgis", "postgres", "postgresql"):
        msg = f"Unknown DJANGO_DB_BACKEND {backend!r} (use 'postgis' or 'oracle')"
        raise ValueError(msg)
    databases = {"default": postgres_database(env)}
    if env("ORACLE_DSN", default=None):
        databases["oracle"] = oracle_database(env)
    return databases
