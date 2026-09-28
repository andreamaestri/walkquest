"""GeoDjango Oracle backend with one portability fix for WalkQuest's migrations.

Several historical migrations declare an explicit ``models.Index`` on a column
that is already indexed (``unique=True`` / ``db_index=True``). PostgreSQL
accepts duplicate indexes; Oracle rejects them with ORA-01408. Rather than
rewriting migration history (which would diverge from existing PostgreSQL
databases), the schema editor skips an index Oracle already covers, and
ignores dropping an index that was therefore never created (ORA-01418).
"""

import logging

from django.contrib.gis.db.backends.oracle.base import (
    DatabaseWrapper as GISDatabaseWrapper,
)
from django.contrib.gis.db.backends.oracle.schema import OracleGISSchemaEditor
from django.db import DatabaseError

logger = logging.getLogger(__name__)

IGNORABLE = {
    "CREATE INDEX": "ORA-01408",  # such column list already indexed
    "DROP INDEX": "ORA-01418",  # specified index does not exist
}


class DatabaseSchemaEditor(OracleGISSchemaEditor):
    def execute(self, sql, params=()):
        try:
            return super().execute(sql, params)
        except DatabaseError as error:
            statement = str(sql).lstrip().upper()
            for prefix, code in IGNORABLE.items():
                if statement.startswith(prefix) and code in str(error):
                    logger.info(
                        "Skipping redundant index statement (%s): %s", code, sql
                    )
                    return None
            raise


class DatabaseWrapper(GISDatabaseWrapper):
    SchemaEditorClass = DatabaseSchemaEditor
