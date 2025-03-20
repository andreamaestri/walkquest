#!/usr/bin/env python
"""
Script to reset the database for walkquest project.
This will drop all tables and recreate them, solving the migration issue.
"""
import os
import sys

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
import django
django.setup()

# Get the connection
from django.db import connection

# Confirm with the user
confirmation = input("This will erase all data in your database. Are you sure? (y/N): ")
if confirmation.lower() != 'y':
    print("Operation cancelled.")
    sys.exit(0)

print("Resetting database...")

# Get the cursor
cursor = connection.cursor()

# Turn off foreign key checks temporarily
cursor.execute("SET FOREIGN_KEY_CHECKS=0;") if connection.vendor == 'mysql' else None

# Get all table names
if connection.vendor == 'postgresql':
    # For PostgreSQL
    cursor.execute("""
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename != 'spatial_ref_sys';
    """)
elif connection.vendor == 'mysql':
    # For MySQL
    cursor.execute("SHOW TABLES;")
elif connection.vendor == 'sqlite':
    # For SQLite
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name!='sqlite_sequence';")
else:
    print(f"Unsupported database: {connection.vendor}")
    sys.exit(1)

tables = [row[0] for row in cursor.fetchall()]

# Drop all tables
for table in tables:
    if table != 'django_migrations':  # Keep the migrations table
        print(f"Dropping table {table}")
        if connection.vendor == 'postgresql':
            cursor.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE;')
        else:
            cursor.execute(f'DROP TABLE IF EXISTS `{table}`;')

# Turn foreign key checks back on
cursor.execute("SET FOREIGN_KEY_CHECKS=1;") if connection.vendor == 'mysql' else None

# Also clear the django_migrations table
print("Clearing django_migrations table")
cursor.execute("DELETE FROM django_migrations;")

print("\nDatabase has been reset. Now you can run migrations:")
print("python manage.py migrate")